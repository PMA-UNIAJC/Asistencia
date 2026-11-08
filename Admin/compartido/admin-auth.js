// ============================================================================
// Admin/compartido/admin-auth.js
// Módulo centralizado de:
//   1. Autenticación, verificación de rol (`public.admin_usuarios`) y
//      sincronización de sesión/revocación multi-pestaña (`window.AdminAuth`).
//   2. Capa oficial y exclusiva de consultas administrativas (`window.ConsultasAdmin`
//      y `AdminAuth.consultas`), construida sobre `window.SupabaseMotor` con
//      aislamiento total respecto al contexto público.
//
// Depende de:
//   - @supabase/supabase-js@2 (window.supabase)
//   - ../../Global/consultas.js (SUPABASE_URL, SUPABASE_KEY, window.SupabaseMotor)
// ============================================================================

(function (window, document) {
  'use strict';

  if (!window.SupabaseMotor) {
    throw new Error('Global/consultas.js debe cargarse antes que Admin/compartido/admin-auth.js.');
  }

  const Motor = window.SupabaseMotor;

  const CLAVE_STORAGE_ADMIN = 'pma-admin-auth';
  const CLAVE_EVENTO_LOGOUT = 'pma-admin-logout-signal';
  const CANAL_BROADCAST_ADMIN = 'pma_admin_auth_channel';
  const MENSAJE_SESION_REQUERIDA = 'Debe iniciar sesión como administrador para acceder a esta página.';
  const PARAM_MOTIVO = 'motivo';
  const VALOR_MOTIVO_SESION = 'sesion_requerida';
  const TTL_VERIFICACION_SERVIDOR_MS = 30 * 1000;

  // Vigencias de caché administrativo (EXCLUSIVAMENTE en memoria RAM, jamás persistido)
  const TTL_ADMIN_CATALOGOS_ACADEMICOS = 30 * 60 * 1000; // 30 min
  const TTL_ADMIN_CATALOGOS_PERSONAL = 20 * 60 * 1000;   // 20 min
  const TTL_ADMIN_CATALOGO_VISITAS = 20 * 60 * 1000;     // 20 min
  const TTL_ADMIN_OPERATIVO = 5 * 60 * 1000;             // 5 min: formularios, pvu, conteos diagnósticos
  const TTL_ADMIN_DINAMICO = 2 * 60 * 1000;              // 2 min: acompanamiento, registro_visitas

  let clienteAuthSingleton = null;
  let canalBroadcast = null;
  let esSubpaginaProtegida = false;
  let urlLoginSubpagina = '../Panel/index.html';
  let cerrandoSesion = false;
  let redirigiendoPorAcceso = false;
  let clienteAdminRef = null;

  const estadoVerificacion = {
    userId: null,
    timestamp: 0
  };

  // ==========================================================================
  // 1. LIMPIEZA DE ALMACENAMIENTO Y CACHÉS SENSIBLES
  // ==========================================================================

  function limpiarResiduosSessionStorageLegacy() {
    try {
      window.sessionStorage.removeItem('adminAuth');
      const clavesLegacy = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const clave = window.sessionStorage.key(i);
        if (clave && (/^sb-.*-auth-token$/.test(clave) || clave === CLAVE_STORAGE_ADMIN)) {
          clavesLegacy.push(clave);
        }
      }
      clavesLegacy.forEach(function (c) {
        window.sessionStorage.removeItem(c);
      });
    } catch (e) {
      // Ignorar restricciones de acceso a storage
    }
  }

  function limpiarAlmacenamientoAdmin() {
    limpiarResiduosSessionStorageLegacy();
    try {
      window.localStorage.removeItem(CLAVE_STORAGE_ADMIN);
      window.localStorage.removeItem(CLAVE_STORAGE_ADMIN + '-code-verifier');
      window.localStorage.removeItem(CLAVE_STORAGE_ADMIN + '-user');
      const clavesEliminar = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const clave = window.localStorage.key(i);
        if (clave && /^sb-.*-auth-token$/.test(clave)) {
          clavesEliminar.push(clave);
        }
      }
      clavesEliminar.forEach(function (c) {
        window.localStorage.removeItem(c);
      });
    } catch (e) {
      console.error('Error limpiando almacenamiento de sesión admin:', e);
    }
    estadoVerificacion.userId = null;
    estadoVerificacion.timestamp = 0;
  }

  function limpiarCachesSensiblesEnMemoria() {
    if (clienteAdminRef) {
      clienteAdminRef.limpiarCache();
    }
    window.datosFormulariosGlobal = null;
    window.datosPVUGlobal = null;
    window.datosDiagnosticosGlobal = null;
    if (typeof window.invalidarCacheEstadisticas === 'function') {
      try { window.invalidarCacheEstadisticas(); } catch (e) {}
    }
  }

  // ==========================================================================
  // 2. CLIENTE SUPABASE AUTH COMPARTIDO (PERSISTENTE EN MISMO ORIGEN)
  // ==========================================================================

  function obtenerClienteAuth() {
    if (clienteAuthSingleton) return clienteAuthSingleton;
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
      console.error('Supabase JS SDK (@supabase/supabase-js) no está cargado en esta página.');
      return null;
    }

    limpiarResiduosSessionStorageLegacy();

    clienteAuthSingleton = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storageKey: CLAVE_STORAGE_ADMIN,
        storage: window.localStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });

    clienteAuthSingleton.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_OUT') {
        estadoVerificacion.userId = null;
        estadoVerificacion.timestamp = 0;
        if (!cerrandoSesion && !redirigiendoPorAcceso) {
          procesarRevocacionRemota();
        }
      } else if (session && session.user) {
        redirigiendoPorAcceso = false;
      }
    });

    return clienteAuthSingleton;
  }

  // ==========================================================================
  // 3. SINCRONIZACIÓN ENTRE PESTAÑAS Y PROTECCIÓN CONTRA BFCACHE
  // ==========================================================================

  function construirUrlConMotivo(urlBase) {
    try {
      const url = new URL(urlBase, window.location.href);
      url.searchParams.set(PARAM_MOTIVO, VALOR_MOTIVO_SESION);
      return url.toString();
    } catch (e) {
      const separador = String(urlBase).indexOf('?') === -1 ? '?' : '&';
      return urlBase + separador + PARAM_MOTIVO + '=' + VALOR_MOTIVO_SESION;
    }
  }

  function emitirEventoCrossTab(tipo) {
    const payload = { tipo: tipo, ts: Date.now() };
    if (canalBroadcast) {
      try {
        canalBroadcast.postMessage(payload);
      } catch (e) {}
    }
    if (tipo === 'LOGOUT_ADMIN') {
      try {
        window.localStorage.setItem(CLAVE_EVENTO_LOGOUT, String(payload.ts));
        window.localStorage.removeItem(CLAVE_EVENTO_LOGOUT);
      } catch (e) {}
    }
  }

  function ocultarInterfazProtegidaInmediatamente() {
    document.documentElement.removeAttribute('data-admin-autorizado');
    const pantallaAdmin = document.getElementById('pantallaAdmin');
    if (pantallaAdmin && !pantallaAdmin.classList.contains('hidden')) {
      pantallaAdmin.classList.add('hidden');
    }
  }

  function procesarRevocacionRemota() {
    if (cerrandoSesion || redirigiendoPorAcceso) return;
    cerrandoSesion = true;
    ocultarInterfazProtegidaInmediatamente();
    limpiarCachesSensiblesEnMemoria();

    if (esSubpaginaProtegida) {
      window.location.replace(urlLoginSubpagina);
      return;
    }

    const pantallaAdminLogin = document.getElementById('pantallaAdminLogin');
    if (pantallaAdminLogin) {
      window.location.replace(window.location.pathname);
    }
  }

  function inicializarSincronizacionMultiPestana() {
    if (typeof window.BroadcastChannel === 'function') {
      try {
        canalBroadcast = new window.BroadcastChannel(CANAL_BROADCAST_ADMIN);
        canalBroadcast.onmessage = function (event) {
          const tipo = event && event.data && event.data.tipo;
          if (tipo === 'LOGOUT_ADMIN') {
            procesarRevocacionRemota();
          }
        };
      } catch (e) {
        canalBroadcast = null;
      }
    }

    window.addEventListener('storage', function (event) {
      if (!event) return;
      if (event.key === CLAVE_EVENTO_LOGOUT && event.newValue) {
        procesarRevocacionRemota();
        return;
      }
      if (event.key === CLAVE_STORAGE_ADMIN && !event.newValue) {
        procesarRevocacionRemota();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      const cliente = obtenerClienteAuth();
      if (cliente && cliente.auth && typeof cliente.auth.startAutoRefresh === 'function') {
        cliente.auth.startAutoRefresh();
      }
      try {
        const raw = window.localStorage.getItem(CLAVE_STORAGE_ADMIN);
        const panelAbierto = (function () {
          const el = document.getElementById('pantallaAdmin');
          return !!(el && !el.classList.contains('hidden'));
        })();
        if (!raw && (esSubpaginaProtegida || panelAbierto)) {
          procesarRevocacionRemota();
        }
      } catch (e) {}
    });

    // Protección contra Back/Forward Cache (bfcache) del navegador
    window.addEventListener('pageshow', async function (event) {
      if (!event.persisted) return;

      if (esSubpaginaProtegida) {
        document.documentElement.removeAttribute('data-admin-autorizado');
        await protegerPagina({ urlLogin: urlLoginSubpagina });
        return;
      }

      const pantallaAdmin = document.getElementById('pantallaAdmin');
      if (pantallaAdmin && !pantallaAdmin.classList.contains('hidden')) {
        pantallaAdmin.classList.add('hidden');
        const verificacion = await verificarSesionActiva({ forzarServidor: true });
        if (verificacion.autorizado) {
          pantallaAdmin.classList.remove('hidden');
        } else {
          window.location.replace(window.location.pathname);
        }
      }
    });
  }

  // ==========================================================================
  // 4. VERIFICACIÓN REAL DE SESIÓN Y ROL ADMINISTRADOR
  // ==========================================================================

  function esErrorDeRed(error) {
    const msg = String((error && error.message) || error || '');
    return /Failed to fetch|NetworkError|Load failed|fetch/i.test(msg);
  }

  async function verificarSesionActiva(opciones) {
    const op = opciones || {};
    const forzarServidor = op.forzarServidor !== undefined ? !!op.forzarServidor : true;
    const cliente = obtenerClienteAuth();

    if (!cliente) {
      return { autorizado: false, motivo: 'cliente_no_disponible' };
    }

    try {
      const { data: sessionData, error: sessionError } = await cliente.auth.getSession();
      const session = sessionData && sessionData.session;

      if (sessionError || !session || !session.access_token || !session.user) {
        return { autorizado: false, motivo: 'sin_sesion' };
      }

      const ahora = Date.now();
      const cacheVigente =
        !forzarServidor &&
        estadoVerificacion.userId === session.user.id &&
        (ahora - estadoVerificacion.timestamp) < TTL_VERIFICACION_SERVIDOR_MS;

      if (cacheVigente) {
        return { autorizado: true, session: session, user: session.user };
      }

      // 1) Validar criptográficamente el JWT y su vigencia real en Supabase Auth
      const { data: userData, error: userError } = await cliente.auth.getUser();
      if (userError || !userData || !userData.user) {
        if (!esErrorDeRed(userError)) {
          try { await cliente.auth.signOut({ scope: 'local' }); } catch (e) {}
          limpiarAlmacenamientoAdmin();
        }
        return { autorizado: false, motivo: 'token_invalido' };
      }

      // 2) Validar pertenencia explícita a la tabla de administradores
      const { data: adminData, error: adminError } = await cliente
        .from('admin_usuarios')
        .select('user_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (adminError) {
        return { autorizado: false, motivo: 'error_verificacion_rol' };
      }

      if (!adminData || !adminData.user_id) {
        try { await cliente.auth.signOut({ scope: 'local' }); } catch (e) {}
        limpiarAlmacenamientoAdmin();
        return { autorizado: false, motivo: 'sin_permisos_admin' };
      }

      // Refrescar referencia de sesión por si getUser/getSession renovó el token
      const { data: sesionActualizada } = await cliente.auth.getSession();
      const sesionFinal = (sesionActualizada && sesionActualizada.session) || session;

      estadoVerificacion.userId = userData.user.id;
      estadoVerificacion.timestamp = Date.now();

      return {
        autorizado: true,
        session: sesionFinal,
        user: userData.user
      };
    } catch (err) {
      console.error('Error verificando sesión administrativa:', err);
      return { autorizado: false, motivo: 'excepcion_verificacion' };
    }
  }

  function denegarAccesoSubpagina(urlLogin, mensaje) {
    if (redirigiendoPorAcceso || cerrandoSesion) return;
    redirigiendoPorAcceso = true;

    ocultarInterfazProtegidaInmediatamente();
    limpiarCachesSensiblesEnMemoria();
    if (document.body) {
      document.body.innerHTML = '';
    }

    alert(mensaje || MENSAJE_SESION_REQUERIDA);
    window.location.replace(construirUrlConMotivo(urlLogin || urlLoginSubpagina));
  }

  async function protegerPagina(opciones) {
    const op = opciones || {};
    esSubpaginaProtegida = true;
    if (op.urlLogin) {
      urlLoginSubpagina = op.urlLogin;
    }

    document.documentElement.removeAttribute('data-admin-autorizado');

    const resultado = await verificarSesionActiva({ forzarServidor: true });
    if (!resultado.autorizado) {
      denegarAccesoSubpagina(urlLoginSubpagina, MENSAJE_SESION_REQUERIDA);
      return { autorizado: false };
    }

    document.documentElement.setAttribute('data-admin-autorizado', 'true');
    return resultado;
  }

  function consumirMotivoRedireccionLogin() {
    try {
      const url = new URL(window.location.href);
      const motivo = url.searchParams.get(PARAM_MOTIVO);
      if (motivo) {
        url.searchParams.delete(PARAM_MOTIVO);
        const nuevaRuta = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
        window.history.replaceState(null, '', nuevaRuta);
      }
      if (motivo === VALOR_MOTIVO_SESION) {
        return MENSAJE_SESION_REQUERIDA;
      }
    } catch (e) {}
    return '';
  }

  // ==========================================================================
  // 5. INICIO Y CIERRE CENTRALIZADO DE SESIÓN
  // ==========================================================================

  async function iniciarSesion(email, password) {
    const cliente = obtenerClienteAuth();
    if (!cliente) {
      return { ok: false, mensaje: 'No se pudo inicializar el servicio de autenticación.' };
    }

    cerrandoSesion = false;
    redirigiendoPorAcceso = false;

    const correoLimpio = String(email || '').trim();
    const { data, error } = await cliente.auth.signInWithPassword({
      email: correoLimpio,
      password: password
    });

    if (error || !data || !data.user || !data.session) {
      return {
        ok: false,
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'Acceso denegado.',
        detalle: error ? error.message : 'Sin sesión'
      };
    }

    const { data: adminData, error: adminError } = await cliente
      .from('admin_usuarios')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (adminError || !adminData || !adminData.user_id) {
      try { await cliente.auth.signOut({ scope: 'local' }); } catch (e) {}
      limpiarAlmacenamientoAdmin();
      return {
        ok: false,
        codigo: 'SIN_PERMISOS_ADMIN',
        mensaje: 'Usuario sin permisos de administrador.'
      };
    }

    estadoVerificacion.userId = data.user.id;
    estadoVerificacion.timestamp = Date.now();
    emitirEventoCrossTab('LOGIN_ADMIN');

    return {
      ok: true,
      session: data.session,
      user: data.user
    };
  }

  async function cerrarSesion(opciones) {
    const op = opciones || {};
    if (cerrandoSesion) return;
    cerrandoSesion = true;

    ocultarInterfazProtegidaInmediatamente();
    limpiarCachesSensiblesEnMemoria();

    const cliente = obtenerClienteAuth();
    if (cliente && cliente.auth) {
      try {
        await cliente.auth.signOut();
      } catch (err) {
        console.error('Error revocando sesión en servidor:', err);
      }
    }

    limpiarAlmacenamientoAdmin();
    emitirEventoCrossTab('LOGOUT_ADMIN');

    const destino = op.urlDestino || (esSubpaginaProtegida ? urlLoginSubpagina : window.location.pathname);
    window.location.replace(destino);
  }

  function manejarExpiracionSesion() {
    if (cerrandoSesion || redirigiendoPorAcceso) return;
    redirigiendoPorAcceso = true;

    const cliente = obtenerClienteAuth();
    if (cliente && cliente.auth) {
      cliente.auth.signOut({ scope: 'local' }).catch(function () {});
    }
    limpiarAlmacenamientoAdmin();
    limpiarCachesSensiblesEnMemoria();
    ocultarInterfazProtegidaInmediatamente();
    emitirEventoCrossTab('LOGOUT_ADMIN');

    alert(MENSAJE_SESION_REQUERIDA);

    if (esSubpaginaProtegida) {
      window.location.replace(construirUrlConMotivo(urlLoginSubpagina));
    } else {
      window.location.replace(construirUrlConMotivo(window.location.pathname));
    }
  }

  async function obtenerToken() {
    const cliente = obtenerClienteAuth();
    if (!cliente) {
      throw new Motor.ErrorConsultaSupabase('Cliente de autenticación no disponible.', {
        status: 401,
        codigo: 'SESION_EXPIRADA',
        sesionExpirada: true
      });
    }

    const { data, error } = await cliente.auth.getSession();
    const token = data && data.session && data.session.access_token;

    if (error || !token) {
      manejarExpiracionSesion();
      throw new Motor.ErrorConsultaSupabase(MENSAJE_SESION_REQUERIDA, {
        status: 401,
        codigo: 'SESION_EXPIRADA',
        sesionExpirada: true
      });
    }

    return token;
  }

  // ==========================================================================
  // 6. CAPA CENTRALIZADA Y EXCLUSIVA DE CONSULTAS ADMINISTRATIVAS
  // ==========================================================================

  const clienteAdmin = Motor.crearClienteContexto({
    nombre: 'admin',
    baseUrl: SUPABASE_URL,
    permitirSessionStorage: false, // Jamás persistir información administrativa en sessionStorage
    obtenerHeaders: async function () {
      const token = await obtenerToken();
      return {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + token
      };
    },
    alRecibirErrorHttp: async function (status) {
      if (status === 401) {
        manejarExpiracionSesion();
      } else if (status === 403) {
        verificarSesionActiva({ forzarServidor: true }).then(function (verif) {
          if (!verif.autorizado) {
            manejarExpiracionSesion();
          }
        });
      }
    }
  });

  clienteAdminRef = clienteAdmin;

  // --------------------------------------------------------------------------
  // UTILIDADES DE FILTRADO EN MEMORIA (CUANDO LA TABLA COMPLETA YA ESTÁ EN CACHÉ)
  // --------------------------------------------------------------------------

  function compararMarcaTemporal(valorFila, valorFiltro) {
    const msFila = Date.parse(valorFila);
    const msFiltro = Date.parse(valorFiltro);
    if (!Number.isNaN(msFila) && !Number.isNaN(msFiltro)) {
      return msFila - msFiltro;
    }
    return String(valorFila ?? '').localeCompare(String(valorFiltro ?? ''));
  }

  function esConsultaFormulariosFiltrableEnMemoria(opciones) {
    const op = opciones || {};
    // Si pide columnas especiales con joins embebidos o sintaxis OR personalizada, ir al servidor
    if (op.or || op.like || op.ilike || op.neq || op.gt || op.lt || op.is) return false;
    if (op.select && op.select !== '*') return false;
    return true;
  }

  function filtrarFormulariosEnMemoria(filasCompletas, opciones) {
    const op = opciones || {};
    let resultado = filasCompletas;

    if (op.eq) {
      const listaEq = Array.isArray(op.eq) ? op.eq : [op.eq];
      listaEq.forEach(function (f) {
        if (!f || f.field === undefined || f.value === undefined) return;
        const esperado = String(f.value);
        resultado = resultado.filter(function (fila) {
          return String(fila[f.field] ?? '') === esperado;
        });
      });
    }

    if (op.in && op.in.field && Array.isArray(op.in.values)) {
      const campoIn = op.in.field;
      const conjunto = new Set(op.in.values.map(function (v) { return String(v); }));
      resultado = resultado.filter(function (fila) {
        return conjunto.has(String(fila[campoIn] ?? ''));
      });
    }

    if (op.gte && op.gte.field !== undefined && op.gte.value !== undefined) {
      const campoGte = op.gte.field;
      const valorGte = op.gte.value;
      resultado = resultado.filter(function (fila) {
        if (!fila[campoGte]) return false;
        return compararMarcaTemporal(fila[campoGte], valorGte) >= 0;
      });
    }

    if (op.lte && op.lte.field !== undefined && op.lte.value !== undefined) {
      const campoLte = op.lte.field;
      const valorLte = op.lte.value;
      resultado = resultado.filter(function (fila) {
        if (!fila[campoLte]) return false;
        return compararMarcaTemporal(fila[campoLte], valorLte) <= 0;
      });
    }

    if (op.order === 'fecha.desc') {
      resultado = resultado.slice().reverse();
    }

    return resultado;
  }

  function tieneFiltrosEspecificos(opciones) {
    const op = opciones || {};
    return !!(op.eq || op.neq || op.gt || op.gte || op.lt || op.lte || op.in || op.like || op.ilike || op.is || op.or);
  }

  // --------------------------------------------------------------------------
  // PROVEEDORES DE DATOS ADMINISTRATIVOS INTELIGENTES Y COMPARTIDOS
  // --------------------------------------------------------------------------

  async function obtenerCatalogosEstadisticas(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    const resultados = await Promise.all([
      clienteAdmin.consultarTodo('tutores_norte', {
        order: 'nombre.asc',
        cache: {
          clave: 'admin:tutores_norte',
          ttl: TTL_ADMIN_CATALOGOS_PERSONAL,
          forzar: forzar,
          etiquetas: ['tabla:tutores_norte', 'grupo:catalogos']
        }
      }, 'public'),
      clienteAdmin.consultarTodo('tutores_sur', {
        order: 'nombre.asc',
        cache: {
          clave: 'admin:tutores_sur',
          ttl: TTL_ADMIN_CATALOGOS_PERSONAL,
          forzar: forzar,
          etiquetas: ['tabla:tutores_sur', 'grupo:catalogos']
        }
      }, 'public'),
      clienteAdmin.consultarTodo('profesores', {
        order: 'nombre.asc',
        cache: {
          clave: 'admin:profesores',
          ttl: TTL_ADMIN_CATALOGOS_PERSONAL,
          forzar: forzar,
          etiquetas: ['tabla:profesores', 'grupo:catalogos']
        }
      }, 'public')
    ]);

    return {
      tutoresNorte: resultados[0] || [],
      tutoresSur: resultados[1] || [],
      profesores: resultados[2] || []
    };
  }

  async function obtenerFacultadesProgramas(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    return await clienteAdmin.consultarTodo('facultades', {
      select: 'id,nombre,programas(id,nombre,facultad_id)',
      order: 'nombre.asc',
      cache: {
        clave: 'admin:facultades_programas',
        ttl: TTL_ADMIN_CATALOGOS_ACADEMICOS,
        forzar: forzar,
        etiquetas: ['tabla:facultades', 'tabla:programas', 'grupo:catalogos']
      }
    }, 'public');
  }

  function aplanarRegistroFormulario(fila) {
    if (!fila || typeof fila !== 'object') return fila;
    const est = fila.estudiantes;
    if (!est || typeof est !== 'object') return fila;

    return {
      ...fila,
      nombre: fila.nombre || est.nombre || '',
      facultad: fila.facultad || est.facultad || '',
      programa: fila.programa || est.programa || '',
      semestre: (fila.semestre !== undefined && fila.semestre !== null && fila.semestre !== '')
        ? fila.semestre
        : (est.semestre !== undefined && est.semestre !== null ? est.semestre : ''),
      sede_estudiante: fila.sede_estudiante || est.sede || ''
    };
  }

  async function obtenerFormularios(opciones) {
    const op = opciones || {};
    const forzar = !!op.forzar;

    // 1. Obtener o consultar la lista completa unificada con datos del estudiante
    let filasCompletas;
    const cacheCompleto = forzar ? { encontrado: false } : clienteAdmin.obtenerCacheDirecto('admin:formularios:completo');

    if (cacheCompleto.encontrado && Array.isArray(cacheCompleto.valor)) {
      filasCompletas = cacheCompleto.valor;
    } else {
      let datosBrutos;
      try {
        datosBrutos = await clienteAdmin.consultarTodo('formularios', {
          select: '*,estudiantes(documento,nombre,facultad,programa,sede,semestre)',
          order: 'fecha.asc',
          cache: {
            clave: 'admin:formularios:bruto',
            ttl: TTL_ADMIN_OPERATIVO,
            forzar: forzar,
            etiquetas: ['tabla:formularios', 'tabla:public.formularios', 'tabla:estudiantes', 'tabla:public.estudiantes']
          }
        }, 'public');
      } catch (errRelacion) {
        // Fallback defensivo si la relación FK o columnas no se han actualizado en Supabase
        console.warn('[AdminAuth] Relación con estudiantes no disponible en Supabase, usando select plano:', errRelacion.message);
        datosBrutos = await clienteAdmin.consultarTodo('formularios', {
          order: 'fecha.asc',
          cache: {
            clave: 'admin:formularios:bruto',
            ttl: TTL_ADMIN_OPERATIVO,
            forzar: forzar,
            etiquetas: ['tabla:formularios', 'tabla:public.formularios']
          }
        }, 'public');
      }

      filasCompletas = (datosBrutos || []).map(aplanarRegistroFormulario);

      clienteAdmin.guardarCacheDirecto('admin:formularios:completo', filasCompletas, {
        ttl: TTL_ADMIN_OPERATIVO,
        etiquetas: ['tabla:formularios', 'tabla:public.formularios', 'tabla:estudiantes', 'tabla:public.estudiantes']
      });
    }

    // 2. Si la llamada solicita filtros específicos (fechas, facultades, etc.) o reversa
    if (tieneFiltrosEspecificos(op) || op.order === 'fecha.desc') {
      return filtrarFormulariosEnMemoria(filasCompletas, op);
    }

    return filasCompletas;
  }

  async function obtenerConteoPVU(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    if (!forzar) {
      const tablaEnCache = clienteAdmin.obtenerCacheDirecto('admin:pvu:completo');
      if (tablaEnCache.encontrado && Array.isArray(tablaEnCache.valor)) {
        return tablaEnCache.valor.length;
      }
    }

    return await clienteAdmin.contar('pvu', {
      cache: {
        clave: 'admin:pvu:conteo',
        ttl: TTL_ADMIN_OPERATIVO,
        forzar: forzar,
        etiquetas: ['tabla:pvu', 'tabla:public.pvu']
      }
    }, 'public');
  }

  async function obtenerPVU(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    const datos = await clienteAdmin.consultarTodo('pvu', {
      order: 'fecha.asc',
      cache: {
        clave: 'admin:pvu:completo',
        ttl: TTL_ADMIN_OPERATIVO,
        forzar: forzar,
        etiquetas: ['tabla:pvu', 'tabla:public.pvu']
      }
    }, 'public');

    clienteAdmin.guardarCacheDirecto('admin:pvu:conteo', datos.length, {
      ttl: TTL_ADMIN_OPERATIVO,
      etiquetas: ['tabla:pvu', 'tabla:public.pvu']
    });

    return datos;
  }

  async function obtenerAcompanamiento(opciones) {
    const op = opciones || {};
    const forzar = !!op.forzar;
    const ordenSolicitado = op.orden === 'asc' ? 'asc' : 'desc';

    const filasAsc = await clienteAdmin.consultarTodo('acompanamiento', {
      order: 'fecha_hora.asc',
      cache: {
        clave: 'admin:acompanamiento:completo',
        ttl: TTL_ADMIN_DINAMICO,
        forzar: forzar,
        etiquetas: ['tabla:acompanamiento', 'tabla:public.acompanamiento']
      }
    }, 'public');

    return ordenSolicitado === 'desc' ? filasAsc.slice().reverse() : filasAsc;
  }

  async function obtenerConteosDiagnosticos(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    const cacheKey = 'admin:diagnosticos:conteos_presentaciones';

    if (!forzar) {
      const hit = clienteAdmin.obtenerCacheDirecto(cacheKey);
      if (hit.encontrado && hit.valor) {
        return hit.valor;
      }
    }

    const resultados = await Promise.all([
      clienteAdmin.contar('presentaciones', { eq: { field: 'prueba', value: 'MATEMATICAS' } }, 'diagnosticos'),
      clienteAdmin.contar('presentaciones', { eq: { field: 'prueba', value: 'COMUNICACION' } }, 'diagnosticos'),
      clienteAdmin.contar('presentaciones', { eq: { field: 'prueba', value: 'LECTURA' } }, 'diagnosticos')
    ]);

    const resumen = {
      matematicas: resultados[0] || 0,
      comunicacion: resultados[1] || 0,
      lectura: resultados[2] || 0
    };

    clienteAdmin.guardarCacheDirecto(cacheKey, resumen, {
      ttl: TTL_ADMIN_OPERATIVO,
      etiquetas: ['esquema:diagnosticos', 'tabla:presentaciones', 'tabla:diagnosticos.presentaciones']
    });

    return resumen;
  }

  async function obtenerResultadosDiagnosticos(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    return await clienteAdmin.consultarTodo('presentaciones', {
      select: 'id,documento,prueba,incorrectas,correctas,resultado,fecha_presentacion,estudiantes(nombre,programa,sede,grupo)',
      order: 'fecha_presentacion.asc,id.asc',
      cache: {
        clave: 'admin:diagnosticos:resultados_presentaciones',
        ttl: TTL_ADMIN_OPERATIVO,
        forzar: forzar,
        etiquetas: [
          'esquema:diagnosticos',
          'tabla:presentaciones',
          'tabla:diagnosticos.presentaciones',
          'tabla:estudiantes',
          'tabla:diagnosticos.estudiantes'
        ]
      }
    }, 'diagnosticos');
  }

  async function obtenerGruposDiagnosticos(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    return await clienteAdmin.consultarTodo('grupos', {
      select: 'id,sede,grupo',
      order: 'sede.asc,grupo.asc',
      cache: {
        clave: 'admin:diagnosticos:grupos',
        ttl: TTL_ADMIN_CATALOGOS_ACADEMICOS,
        forzar: forzar,
        etiquetas: [
          'esquema:diagnosticos',
          'tabla:grupos',
          'tabla:diagnosticos.grupos'
        ]
      }
    }, 'diagnosticos');
  }

  async function reemplazarGruposDiagnosticos(grupos) {
    const etiquetasInv = [
      'esquema:diagnosticos',
      'tabla:grupos',
      'tabla:diagnosticos.grupos'
    ];

    const mapaUnicos = new Map();
    (Array.isArray(grupos) ? grupos : []).forEach(function (item) {
      if (!item) return;
      const sede = String(item.sede || '').trim().toUpperCase();
      const grupo = String(item.grupo || '').replace(/\s+/g, ' ').trim().toUpperCase();
      if (!sede || !grupo) return;
      const clave = sede + '||' + grupo;
      if (!mapaUnicos.has(clave)) {
        mapaUnicos.set(clave, { sede: sede, grupo: grupo });
      }
    });
    const listaLimpia = Array.from(mapaUnicos.values());

    if (listaLimpia.length === 0) {
      throw new Error('No hay registros válidos para reemplazar la tabla diagnosticos.grupos.');
    }

    try {
      return await clienteAdmin.rpc(
        'admin_reemplazar_grupos',
        {
          p_grupos: listaLimpia
        },
        {
          esquema: 'diagnosticos',
          intentos: 1,
          etiquetasInvalidar: etiquetasInv
        }
      );
    } catch (err) {
      if (!err || (err.codigo !== 'PGRST202' && err.codigo !== '42883')) {
        throw err;
      }

      // Respaldo mediante PostgREST si la función RPC aún no ha sido creada:
      // 1. Consultar grupos actuales para no borrar registros que continúen vigentes (evitando violar la FK con estudiantes)
      const actuales = await clienteAdmin.consultarTodo('grupos', {
        select: 'id,sede,grupo'
      }, 'diagnosticos');

      const mapaActuales = new Map();
      (actuales || []).forEach(function (fila) {
        const clave = String(fila.sede || '').trim().toUpperCase() + '||' +
          String(fila.grupo || '').replace(/\s+/g, ' ').trim().toUpperCase();
        mapaActuales.set(clave, fila.id);
      });

      // 2. Insertar los grupos nuevos que están en el CSV y no existían en BD
      const paraInsertar = listaLimpia.filter(function (item) {
        return !mapaActuales.has(item.sede + '||' + item.grupo);
      });

      for (let i = 0; i < paraInsertar.length; i += 500) {
        const lote = paraInsertar.slice(i, i + 500);
        await clienteAdmin.insertar('grupos', lote, {
          esquema: 'diagnosticos',
          retorno: 'minimal',
          etiquetasInvalidar: etiquetasInv
        });
      }

      // 3. Eliminar únicamente los grupos que ya no figuran en el archivo CSV
      const clavesNuevas = new Set(listaLimpia.map(function (it) { return it.sede + '||' + it.grupo; }));
      const idsEliminar = (actuales || [])
        .filter(function (fila) {
          const clave = String(fila.sede || '').trim().toUpperCase() + '||' +
            String(fila.grupo || '').replace(/\s+/g, ' ').trim().toUpperCase();
          return !clavesNuevas.has(clave);
        })
        .map(function (f) { return f.id; });

      if (idsEliminar.length > 0) {
        await clienteAdmin.eliminar('grupos', idsEliminar, {
          esquema: 'diagnosticos',
          retorno: 'minimal',
          etiquetasInvalidar: etiquetasInv
        });
      }

      clienteAdmin.invalidar(etiquetasInv);
      return {
        insertados: listaLimpia.length
      };
    }
  }

  async function obtenerCatalogoVisitas(sede, opciones) {
    const sedeNorm = String(sede || '').trim().toLowerCase();
    if (sedeNorm !== 'norte' && sedeNorm !== 'sur') {
      throw new Error('Sede de visitas no válida: ' + sede);
    }
    const tabla = 'visitas_' + sedeNorm;
    const forzar = !!(opciones && opciones.forzar);

    return await clienteAdmin.consultarTodo(tabla, {
      cache: {
        clave: 'admin:visitas_catalogo:' + sedeNorm,
        ttl: TTL_ADMIN_CATALOGO_VISITAS,
        forzar: forzar,
        etiquetas: ['tabla:' + tabla, 'tabla:visitas.' + tabla, 'esquema:visitas']
      }
    }, 'visitas');
  }

  async function obtenerRegistrosVisitas(sede, opciones) {
    const sedeNorm = String(sede || '').trim().toLowerCase();
    if (sedeNorm !== 'norte' && sedeNorm !== 'sur') {
      throw new Error('Sede de registro de visitas no válida: ' + sede);
    }
    const op = opciones || {};
    const forzar = !!op.forzar;
    const orden = op.orden || 'created_at.desc';
    const tabla = 'registro_visitas_' + sedeNorm;

    return await clienteAdmin.consultarTodo(tabla, {
      order: orden,
      cache: {
        clave: 'admin:registro_visitas:' + sedeNorm + ':' + orden,
        ttl: TTL_ADMIN_DINAMICO,
        forzar: forzar,
        etiquetas: ['tabla:' + tabla, 'tabla:visitas.' + tabla, 'esquema:visitas']
      }
    }, 'visitas');
  }

  async function obtenerTutoresSede(sede, opciones) {
    const sedeNorm = String(sede || '').trim().toLowerCase();
    if (sedeNorm !== 'norte' && sedeNorm !== 'sur') {
      throw new Error('Sede de tutores no válida: ' + sede);
    }
    const tabla = 'tutores_' + sedeNorm;
    const forzar = !!(opciones && opciones.forzar);

    return await clienteAdmin.consultarTodo(tabla, {
      order: 'nombre.asc',
      cache: {
        clave: 'admin:' + tabla,
        ttl: TTL_ADMIN_CATALOGOS_PERSONAL,
        forzar: forzar,
        etiquetas: ['tabla:' + tabla, 'grupo:catalogos']
      }
    }, 'public');
  }

  async function actualizarEstudianteTransaccional(documentoOriginal, nuevosDatos) {
    return await clienteAdmin.rpc(
      'admin_actualizar_estudiante',
      {
        p_documento_original: String(documentoOriginal || '').trim(),
        p_datos: nuevosDatos || {}
      },
      {
        esquema: 'public',
        intentos: 1,
        etiquetasInvalidar: [
          'tabla:estudiantes',
          'tabla:public.estudiantes',
          'tabla:formularios',
          'tabla:public.formularios'
        ]
      }
    );
  }

  // Inicializar listeners de sincronización inmediatamente al cargar el módulo
  inicializarSincronizacionMultiPestana();

  // ==========================================================================
  // 7. APIS CONGELADAS: ConsultasAdmin y AdminAuth
  // ==========================================================================

  const ConsultasAdmin = Object.freeze({
    contexto: 'admin',
    consultar: clienteAdmin.consultar,
    consultarUno: clienteAdmin.consultarUno,
    consultarTodo: clienteAdmin.consultarTodo,
    contar: clienteAdmin.contar,
    insertar: clienteAdmin.insertar,
    actualizar: clienteAdmin.actualizar,
    eliminar: clienteAdmin.eliminar,
    rpc: clienteAdmin.rpc,
    invalidar: clienteAdmin.invalidar,
    limpiarCache: clienteAdmin.limpiarCache,
    alInvalidar: clienteAdmin.alInvalidar,
    crearControladorCancelacion: clienteAdmin.crearControladorCancelacion,
    interpretarError: clienteAdmin.interpretarError,

    // Proveedores de dominio administrativos con reutilización inteligente
    obtenerCatalogosEstadisticas: obtenerCatalogosEstadisticas,
    obtenerFacultadesProgramas: obtenerFacultadesProgramas,
    obtenerFormularios: obtenerFormularios,
    obtenerConteoPVU: obtenerConteoPVU,
    obtenerPVU: obtenerPVU,
    obtenerAcompanamiento: obtenerAcompanamiento,
    obtenerConteosDiagnosticos: obtenerConteosDiagnosticos,
    obtenerResultadosDiagnosticos: obtenerResultadosDiagnosticos,
    obtenerGruposDiagnosticos: obtenerGruposDiagnosticos,
    reemplazarGruposDiagnosticos: reemplazarGruposDiagnosticos,
    obtenerCatalogoVisitas: obtenerCatalogoVisitas,
    obtenerRegistrosVisitas: obtenerRegistrosVisitas,
    obtenerTutoresSede: obtenerTutoresSede,
    actualizarEstudianteTransaccional: actualizarEstudianteTransaccional
  });

  window.ConsultasAdmin = ConsultasAdmin;

  window.AdminAuth = Object.freeze({
    obtenerClienteAuth: obtenerClienteAuth,
    verificarSesionActiva: verificarSesionActiva,
    protegerPagina: protegerPagina,
    iniciarSesion: iniciarSesion,
    cerrarSesion: cerrarSesion,
    manejarExpiracionSesion: manejarExpiracionSesion,
    consumirMotivoRedireccionLogin: consumirMotivoRedireccionLogin,
    obtenerToken: obtenerToken,
    consultas: ConsultasAdmin
  });
})(window, document);
