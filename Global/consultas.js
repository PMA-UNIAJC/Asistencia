// ============================================================================
// Global/consultas.js — MOTOR TÉCNICO CENTRALIZADO DE CONSULTAS A SUPABASE
// ============================================================================
// Responsabilidad única:
//   Proveer la infraestructura técnica reutilizable y agnóstica del nivel de
//   seguridad para comunicarse con Supabase (PostgREST y RPC):
//     1. Construcción estandarizada de URLs, esquemas, proyecciones y filtros.
//     2. Motor de red con timeouts, cancelación (AbortController) y reintentos
//        inteligentes con espera progresiva (sin reintentar errores 4xx).
//     3. Paginación automática sin límite de 1.000 registros y verificación de
//        integridad/completitud mediante Content-Range.
//     4. Conteos exactos eficientes (HEAD + Prefer: count=exact) sin descargar filas.
//     5. Deduplicación de solicitudes simultáneas idénticas en vuelo.
//     6. Caché centralizado por contexto con TTL, etiquetas e invalidación
//        automática local y entre pestañas/páginas.
//
// IMPORTANTE DE SEGURIDAD:
//   - Este archivo NO expone funciones administrativas ni almacena tokens JWT.
//   - Cada contexto (ConsultasPublicas en Global/supabase.js y ConsultasAdmin
//     en Admin/compartido/admin-auth.js) instancia su propio cliente aislado
//     mediante SupabaseMotor.crearClienteContexto(...), sin compartir caché
//     de datos ni cabeceras de autorización.
// ============================================================================

const SUPABASE_URL = 'https://hgppzklpukgslnrynvld.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs';

(function (window) {
  'use strict';

  const TAMANO_PAGINA_DEFECTO = 1000;
  const MAX_PAGINAS_SEGURIDAD = 1000; // Hasta 1.000.000 de registros
  const TIMEOUT_DEFECTO_MS = 20000;
  const TIMEOUT_PAGINA_MS = 25000;
  const CANAL_INVALIDACION = 'pma_consultas_invalidacion';
  const STORAGE_PING_INVALIDACION = 'pma_consultas_inv_ping';
  const STORAGE_VERSION_CATALOGOS = 'pma_consultas_ver_catalogos';
  const PREFIJO_SESSION_PUBLICO = 'pma_pub_cache_v1:';

  // Códigos SQLSTATE/PostgREST deterministas que NUNCA se resuelven reintentando
  const CODIGOS_NO_REINTENTABLES = new Set([
    '23502', // not_null_violation
    '23503', // foreign_key_violation
    '23505', // unique_violation
    '23514', // check_violation
    '22P02', // invalid_text_representation
    '22001', // string_data_right_truncation
    '42501', // insufficient_privilege (RLS)
    '42703', // undefined_column
    '42883', // undefined_function
    '42P01', // undefined_table
    'P0001'  // raise_exception (validaciones de negocio en RPC)
  ]);

  // ==========================================================================
  // 1. ERROR ESTRUCTURADO E INTÉRPRETE DE MENSAJES CLAROS
  // ==========================================================================

  class ErrorConsultaSupabase extends Error {
    constructor(mensaje, opciones) {
      super(mensaje);
      const op = opciones || {};
      this.name = 'ErrorConsultaSupabase';
      this.status = Number(op.status) || 0;
      this.codigo = op.codigo ? String(op.codigo) : '';
      this.detalle = op.detalle ? String(op.detalle) : '';
      this.sugerencia = op.sugerencia ? String(op.sugerencia) : '';
      this.red = !!op.red;
      this.timeout = !!op.timeout;
      this.temporal = !!op.temporal;
      this.cancelado = !!op.cancelado;
      this.sesionExpirada = !!op.sesionExpirada;
      this.incompleto = !!op.incompleto;
      this.origen = op.origen || 'bd';
    }
  }

  function interpretarErrorSupabase(error, contexto) {
    const prefijo = contexto ? contexto + ': ' : '';
    if (!error) return prefijo + 'Ocurrió un error inesperado al procesar la solicitud.';

    if (error.cancelado) {
      return prefijo + 'La consulta anterior fue cancelada.';
    }

    if (error.sesionExpirada || Number(error.status) === 401 || error.codigo === 'SESION_EXPIRADA') {
      return 'Tu sesión de administrador expiró. Vuelve a iniciar sesión para continuar.';
    }

    if (error.incompleto) {
      return prefijo + (error.message || 'No fue posible recuperar la totalidad de los registros solicitados. Intenta de nuevo.');
    }

    if (error.timeout) {
      return prefijo + 'El servidor tardó demasiado en responder. Verifica tu conexión a internet e inténtalo nuevamente.';
    }

    if (error.red || /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(String(error.message || ''))) {
      return prefijo + 'No fue posible conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.';
    }

    const codigo = String(error.codigo || error.code || '');
    const status = Number(error.status || error.statusCode || 0);
    const msg = String(error.message || '').trim();

    if (codigo === 'PGRST202' || codigo === '42883') {
      return prefijo + 'La función solicitada aún no está disponible en la base de datos. Ejecuta el script SQL actualizado en Supabase.';
    }
    if (codigo === '23505' || status === 409) {
      return prefijo + (msg && !/^duplicate key/i.test(msg) ? msg : 'Ya existe un registro con esos mismos datos únicos.');
    }
    if (codigo === '23503') {
      return prefijo + 'No se puede completar la operación porque existen registros relacionados.';
    }
    if (codigo === '42501' || status === 403) {
      return prefijo + 'No cuentas con permisos suficientes para realizar esta operación.';
    }
    if (codigo === 'P0001') {
      return msg || (prefijo + 'La operación fue rechazada por validación de datos.');
    }
    if (status === 429) {
      return prefijo + 'Se recibieron demasiadas solicitudes seguidas. Espera unos segundos e inténtalo de nuevo.';
    }
    if (status >= 500) {
      return prefijo + 'El servidor presenta una falla temporal en este momento. Intenta nuevamente en unos segundos.';
    }

    return prefijo + (msg || 'Error del servidor al procesar la solicitud.');
  }

  // ==========================================================================
  // 2. UTILIDADES DE CLONACIÓN SEGURA Y NORMALIZACIÓN
  // ==========================================================================

  function clonarDatos(valor) {
    if (valor === null || typeof valor !== 'object') return valor;
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(valor);
      } catch (e) {
        // Fallback manual si contiene tipos no clonables nativamente
      }
    }
    if (Array.isArray(valor)) {
      return valor.map(clonarDatos);
    }
    if (valor instanceof Date) {
      return new Date(valor.getTime());
    }
    const copia = {};
    const claves = Object.keys(valor);
    for (let i = 0; i < claves.length; i++) {
      const k = claves[i];
      copia[k] = clonarDatos(valor[k]);
    }
    return copia;
  }

  function normalizarEsquema(esquema) {
    const limpio = typeof esquema === 'string' ? esquema.trim() : '';
    return limpio || 'public';
  }

  function normalizarListaFiltros(entrada) {
    if (!entrada) return [];
    if (Array.isArray(entrada)) {
      return entrada.filter(function (item) {
        return item && item.field !== undefined && item.value !== undefined;
      });
    }
    if (typeof entrada === 'object') {
      if ('field' in entrada && 'value' in entrada) {
        return entrada.field !== undefined && entrada.value !== undefined ? [entrada] : [];
      }
      // Objeto plano { columna1: valor1, columna2: valor2 }
      return Object.keys(entrada)
        .filter(function (campo) { return entrada[campo] !== undefined; })
        .map(function (campo) { return { field: campo, value: entrada[campo] }; });
    }
    return [];
  }

  function normalizarListaIn(entrada) {
    if (!entrada) return [];
    const lista = Array.isArray(entrada) ? entrada : [entrada];
    return lista.filter(function (item) {
      return item && item.field && Array.isArray(item.values);
    });
  }

  function formatearElementoIn(valor) {
    if (typeof valor === 'number' && Number.isFinite(valor)) {
      return String(valor);
    }
    if (typeof valor === 'boolean') {
      return valor ? 'true' : 'false';
    }
    const texto = String(valor ?? '');
    const escapado = texto.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return '"' + escapado + '"';
  }

  function tieneFiltroInVacio(opciones) {
    const op = opciones || {};
    const listaIn = normalizarListaIn(op.in);
    return listaIn.some(function (item) { return item.values.length === 0; });
  }

  // ==========================================================================
  // 3. CONSTRUCTOR ESTANDARIZADO DE URL Y FILTROS POSTGREST
  // ==========================================================================

  function construirParametrosFiltro(opciones, incluirPaginacionExplicita) {
    const op = opciones || {};
    const params = [];

    if (op.select) {
      params.push('select=' + String(op.select).trim());
    }

    const operadoresSimples = [
      ['eq', 'eq'],
      ['neq', 'neq'],
      ['gt', 'gt'],
      ['gte', 'gte'],
      ['lt', 'lt'],
      ['lte', 'lte'],
      ['like', 'like'],
      ['ilike', 'ilike']
    ];

    for (let i = 0; i < operadoresSimples.length; i++) {
      const claveOp = operadoresSimples[i][0];
      const operadorPg = operadoresSimples[i][1];
      const lista = normalizarListaFiltros(op[claveOp]);
      for (let j = 0; j < lista.length; j++) {
        const item = lista[j];
        params.push(item.field + '=' + operadorPg + '.' + encodeURIComponent(String(item.value)));
      }
    }

    const listaIs = normalizarListaFiltros(op.is);
    for (let i = 0; i < listaIs.length; i++) {
      const item = listaIs[i];
      const valStr = item.value === null ? 'null' : String(item.value).toLowerCase();
      params.push(item.field + '=is.' + encodeURIComponent(valStr));
    }

    const listaIn = normalizarListaIn(op.in);
    for (let i = 0; i < listaIn.length; i++) {
      const item = listaIn[i];
      const serializados = item.values.map(formatearElementoIn).join(',');
      params.push(item.field + '=in.(' + encodeURIComponent(serializados) + ')');
    }

    if (op.or) {
      const expresionOr = String(op.or).trim();
      if (expresionOr) {
        params.push('or=' + (expresionOr.startsWith('(') ? expresionOr : '(' + expresionOr + ')'));
      }
    }

    if (op.order) {
      const ordenTexto = Array.isArray(op.order) ? op.order.join(',') : String(op.order).trim();
      if (ordenTexto) {
        params.push('order=' + ordenTexto);
      }
    }

    if (incluirPaginacionExplicita) {
      if (op.limit !== undefined && op.limit !== null) {
        const lim = Number(op.limit);
        if (Number.isInteger(lim) && lim >= 0) {
          params.push('limit=' + lim);
        }
      }
      if (op.offset !== undefined && op.offset !== null) {
        const off = Number(op.offset);
        if (Number.isInteger(off) && off >= 0) {
          params.push('offset=' + off);
        }
      }
    }

    return params;
  }

  function construirUrlTabla(baseUrl, tabla, opciones, incluirPaginacionExplicita) {
    const nombreTabla = String(tabla || '').trim();
    if (!nombreTabla) {
      throw new ErrorConsultaSupabase('Se intentó consultar una tabla sin nombre válido.');
    }
    const params = construirParametrosFiltro(opciones, incluirPaginacionExplicita !== false);
    const base = baseUrl + '/rest/v1/' + encodeURIComponent(nombreTabla);
    return params.length > 0 ? (base + '?' + params.join('&')) : base;
  }

  function construirFiltroMutacion(filtroOId) {
    if (filtroOId === null || filtroOId === undefined || filtroOId === '') {
      throw new ErrorConsultaSupabase('Operación rechazada por seguridad: falta condición de filtrado para modificar o eliminar.');
    }

    // Lista de IDs -> operación por lotes id=in.(...)
    if (Array.isArray(filtroOId)) {
      if (filtroOId.length === 0) return null;
      const serializados = filtroOId.map(formatearElementoIn).join(',');
      return 'id=in.(' + encodeURIComponent(serializados) + ')';
    }

    // Escalar numérico o texto -> id=eq.<valor>
    if (typeof filtroOId !== 'object') {
      return 'id=eq.' + encodeURIComponent(String(filtroOId));
    }

    // Objeto con sintaxis de filtros completa ({ eq, in, gte, ... }) o mapa { columna: valor }
    const tieneOperadoresExplicitos =
      'eq' in filtroOId || 'neq' in filtroOId || 'in' in filtroOId ||
      'gt' in filtroOId || 'gte' in filtroOId || 'lt' in filtroOId ||
      'lte' in filtroOId || 'is' in filtroOId || 'ilike' in filtroOId;

    const opcionesFiltro = tieneOperadoresExplicitos ? filtroOId : { eq: filtroOId };
    if (tieneFiltroInVacio(opcionesFiltro)) return null;

    const params = construirParametrosFiltro(opcionesFiltro, false);
    if (params.length === 0) {
      throw new ErrorConsultaSupabase('Operación rechazada por seguridad: el filtro de modificación/eliminación está vacío.');
    }
    return params.join('&');
  }

  function parsearContentRange(headerValor) {
    if (!headerValor || typeof headerValor !== 'string') return null;
    const texto = headerValor.trim();
    // Formatos PostgREST: "0-999/2450", "0-49/50", "*/0", "0-999/*"
    const matchRango = /^(\d+)-(\d+)\/(\d+|\*)$/.exec(texto);
    if (matchRango) {
      return {
        inicio: parseInt(matchRango[1], 10),
        fin: parseInt(matchRango[2], 10),
        total: matchRango[3] === '*' ? null : parseInt(matchRango[3], 10)
      };
    }
    const matchVacio = /^\*\/(\d+|\*)$/.exec(texto);
    if (matchVacio) {
      return {
        inicio: null,
        fin: null,
        total: matchVacio[1] === '*' ? null : parseInt(matchVacio[1], 10)
      };
    }
    return null;
  }

  // ==========================================================================
  // 4. COORDINADOR DE INVALIDACIÓN ENTRE PESTAÑAS Y PÁGINAS HTML
  // ==========================================================================

  const suscriptoresInvalidacionGlobal = new Set();
  let canalBroadcast = null;

  function obtenerVersionCatalogos() {
    try {
      return (window.localStorage && window.localStorage.getItem(STORAGE_VERSION_CATALOGOS)) || '1';
    } catch (e) {
      return '1';
    }
  }

  function incrementarVersionCatalogos() {
    try {
      if (!window.localStorage) return;
      const nueva = String(Date.now());
      window.localStorage.setItem(STORAGE_VERSION_CATALOGOS, nueva);
    } catch (e) {}
  }

  function limpiarSessionStoragePublicoPorEtiquetas(etiquetas) {
    try {
      if (!window.sessionStorage) return;
      const setEtiquetas = new Set(etiquetas || []);
      const limpiarTodo = setEtiquetas.has('*');
      const aBorrar = [];

      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (!k || !k.startsWith(PREFIJO_SESSION_PUBLICO)) continue;
        if (limpiarTodo) {
          aBorrar.push(k);
          continue;
        }
        try {
          const raw = window.sessionStorage.getItem(k);
          const obj = raw ? JSON.parse(raw) : null;
          const etiqEntrada = (obj && Array.isArray(obj.etiquetas)) ? obj.etiquetas : [];
          if (etiqEntrada.some(function (et) { return setEtiquetas.has(et); })) {
            aBorrar.push(k);
          }
        } catch (err) {
          aBorrar.push(k);
        }
      }

      for (let i = 0; i < aBorrar.length; i++) {
        window.sessionStorage.removeItem(aBorrar[i]);
      }
    } catch (e) {}
  }

  function notificarSuscriptoresLocales(etiquetas, origenRemoto) {
    suscriptoresInvalidacionGlobal.forEach(function (fn) {
      try {
        fn(etiquetas, !!origenRemoto);
      } catch (e) {
        console.warn('[Consultas] Error en suscriptor de invalidación:', e);
      }
    });
  }

  function emitirInvalidacionGlobal(etiquetas) {
    const lista = Array.isArray(etiquetas) ? etiquetas.filter(Boolean) : [etiquetas].filter(Boolean);
    if (lista.length === 0) return;

    const afectaCatalogos = lista.some(function (et) {
      return et === '*' || et === 'grupo:catalogos' ||
        /^tabla:(public\.)?(facultades|programas|tutores_norte|tutores_sur|profesores|materias|temas)$/.test(et);
    });
    if (afectaCatalogos) {
      incrementarVersionCatalogos();
    }

    limpiarSessionStoragePublicoPorEtiquetas(lista);
    notificarSuscriptoresLocales(lista, false);

    // Señal entre pestañas abiertas (sin incluir jamás datos sensibles ni JWT)
    const mensaje = { tipo: 'INVALIDAR_CACHE', etiquetas: lista, ts: Date.now() };
    if (canalBroadcast) {
      try { canalBroadcast.postMessage(mensaje); } catch (e) {}
    }
    try {
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_PING_INVALIDACION, JSON.stringify(mensaje));
      }
    } catch (e) {}
  }

  (function inicializarListenersInvalidacion() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        canalBroadcast = new BroadcastChannel(CANAL_INVALIDACION);
        canalBroadcast.onmessage = function (ev) {
          if (ev && ev.data && ev.data.tipo === 'INVALIDAR_CACHE' && Array.isArray(ev.data.etiquetas)) {
            limpiarSessionStoragePublicoPorEtiquetas(ev.data.etiquetas);
            notificarSuscriptoresLocales(ev.data.etiquetas, true);
          }
        };
      } catch (e) {
        canalBroadcast = null;
      }
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', function (ev) {
        if (!ev || ev.key !== STORAGE_PING_INVALIDACION || !ev.newValue) return;
        try {
          const data = JSON.parse(ev.newValue);
          if (data && data.tipo === 'INVALIDAR_CACHE' && Array.isArray(data.etiquetas)) {
            limpiarSessionStoragePublicoPorEtiquetas(data.etiquetas);
            notificarSuscriptoresLocales(data.etiquetas, true);
          }
        } catch (e) {}
      });
    }
  })();

  // ==========================================================================
  // 5. CACHÉ AISLADO POR CONTEXTO DE SEGURIDAD
  // ==========================================================================

  function crearCacheContexto(permitirSessionStorage) {
    const memoria = new Map();

    function obtener(clave) {
      const ahora = Date.now();
      const entradaMem = memoria.get(clave);

      if (entradaMem) {
        if (ahora - entradaMem.timestamp < entradaMem.ttl) {
          return { encontrado: true, valor: clonarDatos(entradaMem.valor) };
        }
        memoria.delete(clave);
      }

      if (permitirSessionStorage) {
        try {
          if (window.sessionStorage) {
            const raw = window.sessionStorage.getItem(PREFIJO_SESSION_PUBLICO + clave);
            if (raw) {
              const obj = JSON.parse(raw);
              const versionActual = obtenerVersionCatalogos();
              const vigente = obj &&
                obj.versionCatalogos === versionActual &&
                typeof obj.timestamp === 'number' &&
                typeof obj.ttl === 'number' &&
                (ahora - obj.timestamp < obj.ttl);

              if (vigente) {
                memoria.set(clave, {
                  valor: clonarDatos(obj.valor),
                  timestamp: obj.timestamp,
                  ttl: obj.ttl,
                  etiquetas: Array.isArray(obj.etiquetas) ? obj.etiquetas : []
                });
                return { encontrado: true, valor: clonarDatos(obj.valor) };
              }
              window.sessionStorage.removeItem(PREFIJO_SESSION_PUBLICO + clave);
            }
          }
        } catch (e) {}
      }

      return { encontrado: false, valor: null };
    }

    function guardar(clave, valor, opcionesCache) {
      const op = opcionesCache || {};
      const ttl = Number(op.ttl) || 0;
      if (!clave || ttl <= 0) return;

      const etiquetas = Array.isArray(op.etiquetas) ? op.etiquetas.slice() : [];
      const ahora = Date.now();
      const clon = clonarDatos(valor);

      memoria.set(clave, {
        valor: clon,
        timestamp: ahora,
        ttl: ttl,
        etiquetas: etiquetas
      });

      if (permitirSessionStorage && op.persistirSesion) {
        try {
          if (window.sessionStorage) {
            window.sessionStorage.setItem(
              PREFIJO_SESSION_PUBLICO + clave,
              JSON.stringify({
                valor: clon,
                timestamp: ahora,
                ttl: ttl,
                etiquetas: etiquetas,
                versionCatalogos: obtenerVersionCatalogos()
              })
            );
          }
        } catch (e) {
          // Si sessionStorage alcanza su cuota, el caché en memoria sigue operando sin fallo
        }
      }
    }

    function invalidarLocalPorEtiquetas(etiquetas) {
      const lista = Array.isArray(etiquetas) ? etiquetas : [etiquetas];
      const setEtiquetas = new Set(lista.filter(Boolean));
      if (setEtiquetas.size === 0) return 0;

      if (setEtiquetas.has('*')) {
        const total = memoria.size;
        memoria.clear();
        return total;
      }

      let eliminadas = 0;
      memoria.forEach(function (entrada, clave) {
        const coincide = entrada.etiquetas.some(function (et) {
          return setEtiquetas.has(et);
        });
        if (coincide) {
          memoria.delete(clave);
          eliminadas++;
        }
      });
      return eliminadas;
    }

    function invalidarClave(clave) {
      memoria.delete(clave);
      if (permitirSessionStorage) {
        try {
          if (window.sessionStorage) {
            window.sessionStorage.removeItem(PREFIJO_SESSION_PUBLICO + clave);
          }
        } catch (e) {}
      }
    }

    function limpiarTodoLocal() {
      memoria.clear();
      if (permitirSessionStorage) {
        limpiarSessionStoragePublicoPorEtiquetas(['*']);
      }
    }

    return {
      obtener: obtener,
      guardar: guardar,
      invalidarLocalPorEtiquetas: invalidarLocalPorEtiquetas,
      invalidarClave: invalidarClave,
      limpiarTodoLocal: limpiarTodoLocal
    };
  }

  // ==========================================================================
  // 6. MOTOR DE RED CON REINTENTOS INTELIGENTES, TIMEOUT Y CANCELACIÓN
  // ==========================================================================

  function calcularEsperaBackoff(intento, retryAfterHeader) {
    if (retryAfterHeader) {
      const segundos = Number(retryAfterHeader);
      if (Number.isFinite(segundos) && segundos > 0) {
        return Math.min(segundos * 1000, 8000);
      }
    }
    const base = 600 * Math.pow(2, intento); // 600ms, 1200ms, 2400ms...
    const jitter = Math.floor(Math.random() * 220);
    return Math.min(base + jitter, 6000);
  }

  function esperar(ms, signalExterno) {
    return new Promise(function (resolve, reject) {
      if (signalExterno && signalExterno.aborted) {
        reject(new ErrorConsultaSupabase('Solicitud cancelada.', { cancelado: true }));
        return;
      }
      const timer = setTimeout(function () {
        if (signalExterno) signalExterno.removeEventListener('abort', alAbortar);
        resolve();
      }, ms);

      function alAbortar() {
        clearTimeout(timer);
        reject(new ErrorConsultaSupabase('Solicitud cancelada.', { cancelado: true }));
      }

      if (signalExterno) {
        signalExterno.addEventListener('abort', alAbortar, { once: true });
      }
    });
  }

  function evaluarSiEsReintentable(error, permitirReintentoServidor) {
    if (!error) return false;
    if (error.cancelado || error.sesionExpirada) return false;

    const codigo = String(error.codigo || '');
    if (codigo && (CODIGOS_NO_REINTENTABLES.has(codigo) || codigo.startsWith('PGRST'))) {
      return false;
    }

    // Errores puros de red o timeout al conectar
    if (error.red || error.timeout) {
      return !!permitirReintentoServidor;
    }

    const status = Number(error.status) || 0;
    if (status === 408 || status === 429) {
      return !!permitirReintentoServidor;
    }
    if (status === 500 || status === 502 || status === 503 || status === 504) {
      return !!permitirReintentoServidor;
    }

    // Cualquier otro 4xx (400, 401, 403, 404, 406, 409, 416, 422) jamás se reintenta
    return false;
  }

  // ==========================================================================
  // 7. FÁBRICA DE CLIENTE POR CONTEXTO (PÚBLICO O ADMINISTRATIVO)
  // ==========================================================================

  function crearClienteContexto(configContexto) {
    const cfg = configContexto || {};
    const nombreContexto = cfg.nombre || 'desconocido';
    const baseUrl = cfg.baseUrl || SUPABASE_URL;
    const obtenerHeadersContexto = cfg.obtenerHeaders;
    const alRecibirErrorHttp = cfg.alRecibirErrorHttp || null;
    const permitirSessionStorage = !!cfg.permitirSessionStorage && nombreContexto === 'publico';

    if (typeof obtenerHeadersContexto !== 'function') {
      throw new Error('SupabaseMotor.crearClienteContexto requiere una función obtenerHeaders.');
    }

    const cache = crearCacheContexto(permitirSessionStorage);
    const enVuelo = new Map();
    const controladoresGrupo = new Map();
    const listenersContexto = new Set();

    // Escuchar invalidaciones globales (misma página u otras pestañas)
    suscriptoresInvalidacionGlobal.add(function (etiquetas, origenRemoto) {
      cache.invalidarLocalPorEtiquetas(etiquetas);
      listenersContexto.forEach(function (cb) {
        try { cb(etiquetas, origenRemoto); } catch (e) {}
      });
    });

    function etiquetasPorDefectoTabla(tabla, esquema) {
      const esq = normalizarEsquema(esquema);
      const tbl = String(tabla || '').trim();
      const etiquetas = ['tabla:' + tbl, 'tabla:' + esq + '.' + tbl, 'esquema:' + esq];
      if (esq === 'public' && /^(facultades|programas|tutores_norte|tutores_sur|profesores|materias|temas)$/.test(tbl)) {
        etiquetas.push('grupo:catalogos');
      }
      return etiquetas;
    }

    async function construirHeadersPeticion(esquema, metodo, headersExtra) {
      const esq = normalizarEsquema(esquema);
      const baseHeaders = await obtenerHeadersContexto();
      const headers = Object.assign({}, baseHeaders);

      if (metodo === 'GET' || metodo === 'HEAD') {
        headers['Accept-Profile'] = esq;
      } else {
        headers['Accept-Profile'] = esq;
        headers['Content-Profile'] = esq;
      }

      if (headersExtra) {
        Object.assign(headers, headersExtra);
      }
      return headers;
    }

    async function ejecutarPeticion(url, opcionesPeticion) {
      const op = opcionesPeticion || {};
      const metodo = (op.metodo || 'GET').toUpperCase();
      const esquema = normalizarEsquema(op.esquema);
      const esLecturaIdempotente = metodo === 'GET' || metodo === 'HEAD';
      const permitirReintentoServidor = op.permitirReintento !== undefined
        ? !!op.permitirReintento
        : (esLecturaIdempotente || metodo === 'DELETE' || metodo === 'PATCH');
      const totalIntentos = Math.max(1, Number(op.intentos) || (permitirReintentoServidor ? 3 : 1));
      const timeoutMs = Number(op.timeoutMs) > 0 ? Number(op.timeoutMs) : TIMEOUT_DEFECTO_MS;
      const signalExterno = op.signal || null;

      for (let intento = 0; intento < totalIntentos; intento++) {
        if (signalExterno && signalExterno.aborted) {
          throw new ErrorConsultaSupabase('Solicitud cancelada.', { cancelado: true });
        }

        let headers;
        try {
          headers = await construirHeadersPeticion(esquema, metodo, op.headers);
        } catch (errAuth) {
          if (errAuth instanceof ErrorConsultaSupabase) throw errAuth;
          throw new ErrorConsultaSupabase(errAuth && errAuth.message ? errAuth.message : 'Sesión no válida.', {
            status: 401,
            codigo: 'SESION_EXPIRADA',
            sesionExpirada: true
          });
        }

        const controladorIntento = new AbortController();
        let abortadoPorTimeout = false;

        const timerTimeout = setTimeout(function () {
          abortadoPorTimeout = true;
          controladorIntento.abort();
        }, timeoutMs);

        const propagarAbortoExterno = function () {
          controladorIntento.abort();
        };
        if (signalExterno) {
          if (signalExterno.aborted) {
            clearTimeout(timerTimeout);
            throw new ErrorConsultaSupabase('Solicitud cancelada.', { cancelado: true });
          }
          signalExterno.addEventListener('abort', propagarAbortoExterno, { once: true });
        }

        let respuesta;
        let textoRespuesta = '';
        let retryAfterHeader = null;

        try {
          const fetchOpts = {
            method: metodo,
            headers: headers,
            signal: controladorIntento.signal
          };
          if (op.cuerpo !== undefined && metodo !== 'GET' && metodo !== 'HEAD') {
            if (!fetchOpts.headers['Content-Type']) {
              fetchOpts.headers['Content-Type'] = 'application/json';
            }
            fetchOpts.body = typeof op.cuerpo === 'string' ? op.cuerpo : JSON.stringify(op.cuerpo);
          }

          respuesta = await fetch(url, fetchOpts);
          retryAfterHeader = respuesta.headers ? respuesta.headers.get('Retry-After') : null;
          if (metodo !== 'HEAD' && respuesta.status !== 204) {
            textoRespuesta = await respuesta.text();
          }
        } catch (errRed) {
          clearTimeout(timerTimeout);
          if (signalExterno) signalExterno.removeEventListener('abort', propagarAbortoExterno);

          if (signalExterno && signalExterno.aborted) {
            throw new ErrorConsultaSupabase('Solicitud cancelada.', { cancelado: true });
          }

          const errorNormalizado = abortadoPorTimeout
            ? new ErrorConsultaSupabase('Tiempo de espera agotado al consultar el servidor.', {
                red: true,
                timeout: true,
                temporal: true
              })
            : new ErrorConsultaSupabase('No fue posible comunicarse con el servidor.', {
                red: true,
                temporal: true
              });

          if (intento < totalIntentos - 1 && evaluarSiEsReintentable(errorNormalizado, permitirReintentoServidor)) {
            await esperar(calcularEsperaBackoff(intento, null), signalExterno);
            continue;
          }
          throw errorNormalizado;
        } finally {
          clearTimeout(timerTimeout);
          if (signalExterno) signalExterno.removeEventListener('abort', propagarAbortoExterno);
        }

        let datosJson = null;
        if (textoRespuesta) {
          try {
            datosJson = JSON.parse(textoRespuesta);
          } catch (e) {
            datosJson = null;
          }
        }

        if (!respuesta.ok) {
          // Permitir manejo especial de 416 en paginación cuando la tabla encogió en el borde exacto
          if (respuesta.status === 416 && op.permitir416Vacio) {
            return {
              status: 416,
              headers: respuesta.headers,
              datos: []
            };
          }

          const codigoPg = datosJson && datosJson.code ? String(datosJson.code) : '';
          const detallePg = datosJson && datosJson.details ? String(datosJson.details) : '';
          const sugerenciaPg = datosJson && datosJson.hint ? String(datosJson.hint) : '';
          const mensajeServidor =
            (datosJson && (datosJson.message || datosJson.error_description || datosJson.error || datosJson.hint)) ||
            (textoRespuesta && textoRespuesta.length < 240 ? textoRespuesta : '') ||
            ('Error del servidor (' + respuesta.status + ').');

          const errorHttp = new ErrorConsultaSupabase(mensajeServidor, {
            status: respuesta.status,
            codigo: codigoPg,
            detalle: detallePg,
            sugerencia: sugerenciaPg,
            sesionExpirada: respuesta.status === 401,
            temporal: respuesta.status === 408 || respuesta.status === 429 || respuesta.status >= 500
          });

          if (alRecibirErrorHttp) {
            try {
              await alRecibirErrorHttp(respuesta.status, errorHttp);
            } catch (e) {}
          }

          if (intento < totalIntentos - 1 && evaluarSiEsReintentable(errorHttp, permitirReintentoServidor)) {
            await esperar(calcularEsperaBackoff(intento, retryAfterHeader), signalExterno);
            continue;
          }

          throw errorHttp;
        }

        return {
          status: respuesta.status,
          headers: respuesta.headers,
          datos: metodo === 'HEAD' || respuesta.status === 204 ? null : datosJson
        };
      }

      throw new ErrorConsultaSupabase('No fue posible completar la consulta tras varios intentos.', {
        red: true,
        temporal: true
      });
    }

    function ejecutarConDeduplicacionYCache(claveOperacion, opcionesCache, signal, productorAsync) {
      const usarCache = opcionesCache && Number(opcionesCache.ttl) > 0 && !opcionesCache.forzar;
      const claveCache = (opcionesCache && opcionesCache.clave) || claveOperacion;

      if (usarCache) {
        const hit = cache.obtener(claveCache);
        if (hit.encontrado) {
          return Promise.resolve(hit.valor);
        }
      }

      // Si no tiene AbortSignal individual, comparte promesa en vuelo con llamadas simultáneas idénticas
      if (!signal && enVuelo.has(claveOperacion)) {
        return enVuelo.get(claveOperacion).then(clonarDatos);
      }

      const promesa = (async function () {
        const resultado = await productorAsync();
        if (opcionesCache && Number(opcionesCache.ttl) > 0) {
          cache.guardar(claveCache, resultado, opcionesCache);
        }
        return resultado;
      })();

      if (!signal) {
        enVuelo.set(claveOperacion, promesa);
        promesa.finally(function () {
          if (enVuelo.get(claveOperacion) === promesa) {
            enVuelo.delete(claveOperacion);
          }
        }).catch(function () {});
      }

      return promesa.then(clonarDatos);
    }

    // ------------------------------------------------------------------------
    // OPERACIONES PÚBLICAS DEL CLIENTE DE CONTEXTO
    // ------------------------------------------------------------------------

    async function consultar(tabla, opciones, esquema) {
      const op = opciones || {};
      const esq = normalizarEsquema(esquema || op.esquema);

      if (tieneFiltroInVacio(op)) {
        return [];
      }

      const url = construirUrlTabla(baseUrl, tabla, op, true);
      const claveOp = 'GET:' + esq + ':' + url;
      const opcionesCache = op.cache
        ? Object.assign({ etiquetas: etiquetasPorDefectoTabla(tabla, esq) }, op.cache)
        : null;

      return await ejecutarConDeduplicacionYCache(claveOp, opcionesCache, op.signal, async function () {
        const res = await ejecutarPeticion(url, {
          metodo: 'GET',
          esquema: esq,
          intentos: op.intentos,
          timeoutMs: op.timeoutMs,
          signal: op.signal
        });
        return Array.isArray(res.datos) ? res.datos : (res.datos ? [res.datos] : []);
      });
    }

    async function consultarUno(tabla, opciones, esquema) {
      const op = Object.assign({}, opciones || {}, { limit: 1 });
      const filas = await consultar(tabla, op, esquema);
      return Array.isArray(filas) && filas.length > 0 ? filas[0] : null;
    }

    async function consultarTodo(tabla, opciones, esquema) {
      const op = opciones || {};
      const esq = normalizarEsquema(esquema || op.esquema);

      if (tieneFiltroInVacio(op)) {
        return [];
      }

      const urlBase = construirUrlTabla(baseUrl, tabla, op, false);
      const tamanoPagina = Math.max(1, Math.min(Number(op.tamanoPagina) || TAMANO_PAGINA_DEFECTO, 1000));
      const claveOp = 'ALL:' + esq + ':' + urlBase;
      const opcionesCache = op.cache
        ? Object.assign({ etiquetas: etiquetasPorDefectoTabla(tabla, esq) }, op.cache)
        : null;

      return await ejecutarConDeduplicacionYCache(claveOp, opcionesCache, op.signal, async function () {
        const acumulado = [];
        let desde = 0;
        let totalEsperado = null;
        let paginasRecorridas = 0;

        while (paginasRecorridas < MAX_PAGINAS_SEGURIDAD) {
          paginasRecorridas++;
          const hasta = desde + tamanoPagina - 1;

          const res = await ejecutarPeticion(urlBase, {
            metodo: 'GET',
            esquema: esq,
            headers: {
              'Range': desde + '-' + hasta,
              'Range-Unit': 'items',
              'Prefer': 'count=exact'
            },
            permitir416Vacio: desde > 0,
            intentos: op.intentos || 3,
            timeoutMs: op.timeoutMs || TIMEOUT_PAGINA_MS,
            signal: op.signal
          });

          const infoRango = res.headers ? parsearContentRange(res.headers.get('Content-Range')) : null;
          if (infoRango && infoRango.total !== null) {
            totalEsperado = infoRango.total;
          }

          if (res.status === 416) {
            // Si la tabla disminuyó exactamente al límite entre páginas y ya alcanzamos el nuevo total
            if (totalEsperado === null || acumulado.length >= totalEsperado) {
              break;
            }
            throw new ErrorConsultaSupabase(
              'La consulta paginada sobre "' + tabla + '" quedó incompleta (rango fuera de límites antes de completar el total).',
              { status: 416, incompleto: true }
            );
          }

          if (!Array.isArray(res.datos)) {
            throw new ErrorConsultaSupabase(
              'Respuesta inesperada al consultar todos los registros de "' + tabla + '": se esperaba una lista de filas.',
              { status: res.status, incompleto: true }
            );
          }

          const pagina = res.datos;
          for (let i = 0; i < pagina.length; i++) {
            acumulado.push(pagina[i]);
          }

          if (totalEsperado !== null) {
            if (acumulado.length >= totalEsperado) {
              break;
            }
            if (pagina.length === 0) {
              throw new ErrorConsultaSupabase(
                'La consulta sobre "' + tabla + '" se interrumpió antes de completar los ' + totalEsperado + ' registros esperados (recibidos: ' + acumulado.length + ').',
                { incompleto: true }
              );
            }
            desde = infoRango && infoRango.fin !== null ? (infoRango.fin + 1) : (desde + pagina.length);
          } else {
            // Respaldo cuando el entorno no expone Content-Range
            if (pagina.length < tamanoPagina) {
              break;
            }
            desde += pagina.length;
          }
        }

        if (paginasRecorridas >= MAX_PAGINAS_SEGURIDAD && (totalEsperado === null || acumulado.length < totalEsperado)) {
          throw new ErrorConsultaSupabase(
            'La consulta sobre "' + tabla + '" excedió el límite de seguridad de paginación sin completarse.',
            { incompleto: true }
          );
        }

        return acumulado;
      });
    }

    async function contar(tabla, opciones, esquema) {
      const op = opciones || {};
      const esq = normalizarEsquema(esquema || op.esquema);

      if (tieneFiltroInVacio(op)) {
        return 0;
      }

      const opConteo = Object.assign({}, op);
      delete opConteo.order;
      delete opConteo.limit;
      delete opConteo.offset;

      const url = construirUrlTabla(baseUrl, tabla, opConteo, false);
      const claveOp = 'COUNT:' + esq + ':' + url;
      const opcionesCache = op.cache
        ? Object.assign({ etiquetas: etiquetasPorDefectoTabla(tabla, esq) }, op.cache)
        : null;

      return await ejecutarConDeduplicacionYCache(claveOp, opcionesCache, op.signal, async function () {
        const resHead = await ejecutarPeticion(url, {
          metodo: 'HEAD',
          esquema: esq,
          headers: { 'Prefer': 'count=exact' },
          intentos: op.intentos || 3,
          timeoutMs: op.timeoutMs,
          signal: op.signal
        });

        const infoHead = resHead.headers ? parsearContentRange(resHead.headers.get('Content-Range')) : null;
        if (infoHead && typeof infoHead.total === 'number') {
          return infoHead.total;
        }

        // Respaldo de 0 filas si algún proxy intermedio omite cabeceras en HEAD
        const urlFallback = url + (url.indexOf('?') === -1 ? '?limit=0' : '&limit=0');
        const resGet = await ejecutarPeticion(urlFallback, {
          metodo: 'GET',
          esquema: esq,
          headers: { 'Prefer': 'count=exact' },
          intentos: 2,
          timeoutMs: op.timeoutMs,
          signal: op.signal
        });
        const infoGet = resGet.headers ? parsearContentRange(resGet.headers.get('Content-Range')) : null;
        if (infoGet && typeof infoGet.total === 'number') {
          return infoGet.total;
        }

        throw new ErrorConsultaSupabase('No fue posible obtener el conteo exacto de "' + tabla + '".', {
          incompleto: true
        });
      });
    }

    async function insertar(tabla, datos, opciones, esquemaPosicional) {
      // Soporta firma moderna insertar(tabla, datos, { esquema, retorno, intentos })
      // y esquema explícito como 3er/4to argumento
      const op = (typeof opciones === 'string' || opciones === null)
        ? { esquema: opciones }
        : (opciones || {});
      const esq = normalizarEsquema(op.esquema || esquemaPosicional);

      if (Array.isArray(datos) && datos.length === 0) {
        return [];
      }

      const url = baseUrl + '/rest/v1/' + encodeURIComponent(String(tabla).trim());
      const retorno = op.retorno === 'minimal' ? 'return=minimal' : 'return=representation';
      const preferPartes = [retorno];
      if (op.onConflict) {
        preferPartes.push('resolution=' + op.onConflict);
      }

      const res = await ejecutarPeticion(url, {
        metodo: 'POST',
        esquema: esq,
        headers: { 'Prefer': preferPartes.join(',') },
        cuerpo: datos,
        permitirReintento: !!op.reintentar,
        intentos: op.intentos || 1,
        timeoutMs: op.timeoutMs,
        signal: op.signal
      });

      const etiquetasInvalidar = etiquetasPorDefectoTabla(tabla, esq)
        .concat(Array.isArray(op.etiquetasInvalidar) ? op.etiquetasInvalidar : []);
      emitirInvalidacionGlobal(etiquetasInvalidar);

      return res.datos;
    }

    async function actualizar(tabla, filtroOId, datos, opciones, esquemaPosicional) {
      const op = (typeof opciones === 'string' || opciones === null)
        ? { esquema: opciones }
        : (opciones || {});
      const esq = normalizarEsquema(op.esquema || esquemaPosicional);

      const queryFiltro = construirFiltroMutacion(filtroOId);
      if (queryFiltro === null) {
        return op.contarFilas ? { datos: [], totalActualizados: 0 } : [];
      }

      const url = baseUrl + '/rest/v1/' + encodeURIComponent(String(tabla).trim()) + '?' + queryFiltro;
      const retorno = op.retorno === 'minimal' ? 'return=minimal' : 'return=representation';
      const preferPartes = [retorno];
      if (op.contarFilas) {
        preferPartes.push('count=exact');
      }

      const res = await ejecutarPeticion(url, {
        metodo: 'PATCH',
        esquema: esq,
        headers: { 'Prefer': preferPartes.join(',') },
        cuerpo: datos,
        permitirReintento: op.reintentar !== undefined ? !!op.reintentar : true,
        intentos: op.intentos || 2,
        timeoutMs: op.timeoutMs,
        signal: op.signal
      });

      const etiquetasInvalidar = etiquetasPorDefectoTabla(tabla, esq)
        .concat(Array.isArray(op.etiquetasInvalidar) ? op.etiquetasInvalidar : []);
      emitirInvalidacionGlobal(etiquetasInvalidar);

      if (op.contarFilas) {
        const info = res.headers ? parsearContentRange(res.headers.get('Content-Range')) : null;
        const conteo = info && typeof info.total === 'number'
          ? info.total
          : (Array.isArray(res.datos) ? res.datos.length : 0);
        return { datos: res.datos, totalActualizados: conteo };
      }

      return res.datos;
    }

    async function eliminar(tabla, filtroOId, opciones, esquemaPosicional) {
      const op = (typeof opciones === 'string' || opciones === null)
        ? { esquema: opciones }
        : (opciones || {});
      const esq = normalizarEsquema(op.esquema || esquemaPosicional);

      const queryFiltro = construirFiltroMutacion(filtroOId);
      if (queryFiltro === null) {
        return null;
      }

      const url = baseUrl + '/rest/v1/' + encodeURIComponent(String(tabla).trim()) + '?' + queryFiltro;
      const retorno = op.retorno === 'representation' ? 'return=representation' : 'return=minimal';

      const res = await ejecutarPeticion(url, {
        metodo: 'DELETE',
        esquema: esq,
        headers: { 'Prefer': retorno },
        permitirReintento: op.reintentar !== undefined ? !!op.reintentar : true,
        intentos: op.intentos || 2,
        timeoutMs: op.timeoutMs,
        signal: op.signal
      });

      const etiquetasInvalidar = etiquetasPorDefectoTabla(tabla, esq)
        .concat(Array.isArray(op.etiquetasInvalidar) ? op.etiquetasInvalidar : []);
      emitirInvalidacionGlobal(etiquetasInvalidar);

      return res.datos;
    }

    async function rpc(nombreFuncion, parametros, opciones) {
      const op = opciones || {};
      const esq = normalizarEsquema(op.esquema);
      const fnLimpia = String(nombreFuncion || '').trim();
      if (!fnLimpia) {
        throw new ErrorConsultaSupabase('Se intentó invocar una función RPC sin nombre.');
      }

      const url = baseUrl + '/rest/v1/rpc/' + encodeURIComponent(fnLimpia);
      const cuerpo = parametros || {};
      const soloLectura = !!op.soloLectura;

      if (soloLectura) {
        const claveOp = 'RPC:' + esq + ':' + fnLimpia + ':' + JSON.stringify(cuerpo);
        const opcionesCache = op.cache
          ? Object.assign({ etiquetas: ['esquema:' + esq, 'rpc:' + fnLimpia] }, op.cache)
          : null;

        return await ejecutarConDeduplicacionYCache(claveOp, opcionesCache, op.signal, async function () {
          const res = await ejecutarPeticion(url, {
            metodo: 'POST',
            esquema: esq,
            cuerpo: cuerpo,
            permitirReintento: true,
            intentos: op.intentos || 3,
            timeoutMs: op.timeoutMs || TIMEOUT_PAGINA_MS,
            signal: op.signal
          });
          return res.datos;
        });
      }

      const res = await ejecutarPeticion(url, {
        metodo: 'POST',
        esquema: esq,
        cuerpo: cuerpo,
        permitirReintento: !!op.reintentar,
        intentos: op.intentos || 1,
        timeoutMs: op.timeoutMs || TIMEOUT_PAGINA_MS,
        signal: op.signal
      });

      if (Array.isArray(op.etiquetasInvalidar) && op.etiquetasInvalidar.length > 0) {
        emitirInvalidacionGlobal(op.etiquetasInvalidar);
      }

      return res.datos;
    }

    function crearControladorCancelacion(claveGrupo) {
      if (claveGrupo && controladoresGrupo.has(claveGrupo)) {
        const previo = controladoresGrupo.get(claveGrupo);
        try { previo.abort(); } catch (e) {}
      }
      const nuevo = new AbortController();
      if (claveGrupo) {
        controladoresGrupo.set(claveGrupo, nuevo);
      }
      return nuevo;
    }

    function invalidar(etiquetas, difundirGlobalmente) {
      const lista = Array.isArray(etiquetas) ? etiquetas : [etiquetas];
      if (difundirGlobalmente === false) {
        cache.invalidarLocalPorEtiquetas(lista);
      } else {
        emitirInvalidacionGlobal(lista);
      }
    }

    function limpiarCache() {
      cache.limpiarTodoLocal();
    }

    function alInvalidar(callback) {
      if (typeof callback !== 'function') return function () {};
      listenersContexto.add(callback);
      return function () { listenersContexto.delete(callback); };
    }

    return Object.freeze({
      contexto: nombreContexto,
      consultar: consultar,
      consultarUno: consultarUno,
      consultarTodo: consultarTodo,
      contar: contar,
      insertar: insertar,
      actualizar: actualizar,
      eliminar: eliminar,
      rpc: rpc,
      obtenerCacheDirecto: cache.obtener,
      guardarCacheDirecto: cache.guardar,
      invalidarClaveCache: cache.invalidarClave,
      invalidar: invalidar,
      limpiarCache: limpiarCache,
      alInvalidar: alInvalidar,
      crearControladorCancelacion: crearControladorCancelacion,
      interpretarError: interpretarErrorSupabase
    });
  }

  window.SupabaseMotor = Object.freeze({
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_KEY: SUPABASE_KEY,
    ErrorConsultaSupabase: ErrorConsultaSupabase,
    interpretarError: interpretarErrorSupabase,
    construirUrlTabla: construirUrlTabla,
    construirParametrosFiltro: construirParametrosFiltro,
    parsearContentRange: parsearContentRange,
    clonarDatos: clonarDatos,
    crearClienteContexto: crearClienteContexto,
    emitirInvalidacionGlobal: emitirInvalidacionGlobal
  });
})(window);
