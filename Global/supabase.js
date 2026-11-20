// ============================================================================
// Global/supabase.js — CAPA CENTRALIZADA EXCLUSIVA DE CONSULTAS PÚBLICAS
// ============================================================================
// Responsabilidad única:
//   Proveer el mecanismo oficial y único de consulta a Supabase para TODOS los
//   módulos públicos (no autenticados administrativamente):
//     - PMA (registro y asistencia a tutorías)
//     - PVU (asistencia Proyecto de Vida Universitario)
//     - AAA (solicitud y seguimiento público de acompañamiento académico)
//     - Visitas (gestión de visitas asignadas por becarios)
//     - Diagnóstico (Matemáticas, Comunicación Escrita y Lectura Crítica)
//
// Reglas de seguridad:
//   - Utiliza exclusivamente las credenciales públicas (rol `anon` + RLS).
//   - No incluye ninguna función administrativa ni acceso a sesiones JWT.
//   - El caché en sessionStorage se limita estrictamente a catálogos públicos
//     académicos no sensibles (facultades, programas, tutores, docentes,
//     materias y temas).
// ============================================================================

(function (window) {
  'use strict';

  if (!window.SupabaseMotor) {
    throw new Error('Global/consultas.js debe cargarse antes que Global/supabase.js.');
  }

  const Motor = window.SupabaseMotor;

  // Vigencias diferenciadas según naturaleza de los catálogos públicos
  const TTL_CATALOGOS_ACADEMICOS = 30 * 60 * 1000; // 30 min: facultades, programas, materias, temas
  const TTL_CATALOGOS_PERSONAL = 20 * 60 * 1000;   // 20 min: tutores_norte, tutores_sur, profesores

  const clientePublico = Motor.crearClienteContexto({
    nombre: 'publico',
    baseUrl: SUPABASE_URL,
    permitirSessionStorage: true,
    obtenerHeaders: function () {
      return {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      };
    }
  });

  // Si en otra pestaña se invalida un catálogo público, limpiar también datosCache y catálogo central en memoria
  clientePublico.alInvalidar(function (etiquetas) {
    const set = new Set(etiquetas || []);
    const limpiarTodo = set.has('*') || set.has('grupo:catalogos');

    if (limpiarTodo || set.has('tabla:facultades') || set.has('tabla:programas')) {
      if (typeof limpiarCatalogoProgramasYFacultades === 'function') {
        limpiarCatalogoProgramasYFacultades();
      } else if (typeof datosCache !== 'undefined' && datosCache) {
        datosCache.facultadesCarreras = [];
      }
    }

    if (typeof datosCache === 'undefined' || !datosCache) return;

    if (limpiarTodo || set.has('tabla:tutores_norte')) {
      datosCache.tutoresNorte = [];
    }
    if (limpiarTodo || set.has('tabla:tutores_sur')) {
      datosCache.tutoresSur = [];
    }
    if (limpiarTodo || set.has('tabla:profesores')) {
      datosCache.profesores = [];
    }
    if (limpiarTodo || set.has('tabla:materias')) {
      datosCache.materias = [];
    }
    if (limpiarTodo || set.has('tabla:temas')) {
      datosCache.temas = [];
    }
  });

  // ==========================================================================
  // CARGADORES INTELIGENTES DE CATÁLOGOS PÚBLICOS COMPARTIDOS
  // ==========================================================================

  function sincronizarCatalogoPublico(lista) {
    const catalogo = Array.isArray(lista) ? lista : [];
    if (typeof sincronizarCatalogoProgramasYFacultades === 'function') {
      sincronizarCatalogoProgramasYFacultades(catalogo);
    } else if (typeof datosCache !== 'undefined' && datosCache) {
      datosCache.facultadesCarreras = catalogo;
      if (typeof procesarFacultadesData === 'function') {
        procesarFacultadesData();
      }
    }
    return catalogo;
  }

  async function obtenerFacultadesProgramas(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    const datos = await clientePublico.consultarTodo('facultades', {
      select: 'id,nombre,programas(id,nombre,facultad_id)',
      order: 'nombre.asc',
      cache: {
        clave: 'pub:facultades_programas',
        ttl: TTL_CATALOGOS_ACADEMICOS,
        persistirSesion: true,
        forzar: forzar,
        etiquetas: ['tabla:facultades', 'tabla:programas', 'grupo:catalogos']
      }
    }, 'public');

    return sincronizarCatalogoPublico(datos);
  }

  async function asegurarCatalogoProgramasYFacultades(opciones) {
    const forzar = !!(opciones && opciones.forzar);
    if (!forzar && typeof estaCatalogoProgramasCargado === 'function' && estaCatalogoProgramasCargado()) {
      return (typeof datosCache !== 'undefined' && datosCache && Array.isArray(datosCache.facultadesCarreras))
        ? datosCache.facultadesCarreras
        : [];
    }
    return await obtenerFacultadesProgramas({ forzar: forzar });
  }

  async function obtenerProgramasListaPlana(opciones) {
    const forzar = !!(opciones && opciones.forzar);

    try {
      const programas = await obtenerProgramasConRelacion({ forzar: forzar });
      const nombres = (programas || [])
        .map(function (prog) { return prog && prog.nombre ? String(prog.nombre).trim() : ''; })
        .filter(Boolean);
      if (nombres.length > 0) {
        return Array.from(new Set(nombres)).sort(function (a, b) {
          return a.localeCompare(b, 'es');
        });
      }
    } catch (error) {
      console.warn('[ConsultasPublicas] Respaldo plano desde tabla programas:', error);
    }

    const filas = await clientePublico.consultarTodo('programas', {
      select: 'nombre',
      order: 'nombre.asc'
    }, 'public');

    return Array.from(
      new Set((filas || []).map(function (f) { return f && f.nombre ? String(f.nombre).trim() : ''; }).filter(Boolean))
    );
  }

  async function poblarSelectProgramasPlana(idSelectPrograma, opciones) {
    const selectPrograma = document.getElementById(idSelectPrograma);
    if (!selectPrograma) return [];

    try {
      const programasUnicos = await obtenerProgramasListaPlana(opciones);
      selectPrograma.innerHTML = '<option value="" disabled selected>Seleccione su programa</option>';
      programasUnicos.forEach(function (programa) {
        const option = document.createElement('option');
        option.value = programa;
        option.textContent = programa;
        selectPrograma.appendChild(option);
      });
      return programasUnicos;
    } catch (error) {
      console.error('[ConsultasPublicas] Error al cargar programas:', error);
      selectPrograma.innerHTML = '<option value="" disabled selected>Error al cargar programas</option>';
      throw error;
    }
  }

  function ordenarProgramasRelacionales(items) {
    const porId = new Map();
    (items || []).forEach(function (item) {
      if (!item || item.id === undefined || item.id === null || !item.nombre) return;
      const clave = String(item.id);
      if (!porId.has(clave)) {
        porId.set(clave, item);
      }
    });
    return Array.from(porId.values()).sort(function (a, b) {
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }

  /**
   * Obtiene los programas activos con su PK (`id`) y relación a `public.facultades`
   * para formularios que almacenan FK (`programa_id`) en lugar de texto plano.
   */
  async function obtenerProgramasConRelacion(opciones) {
    const forzar = !!(opciones && opciones.forzar);

    try {
      await asegurarCatalogoProgramasYFacultades({ forzar: forzar });
      if (typeof obtenerProgramasCatalogo === 'function') {
        const derivados = obtenerProgramasCatalogo();
        if (Array.isArray(derivados) && derivados.length > 0) {
          return ordenarProgramasRelacionales(derivados);
        }
      }
    } catch (error) {
      console.warn('[ConsultasPublicas] Respaldo relacional desde tabla programas:', error);
    }

    const filas = await clientePublico.consultarTodo('programas', {
      select: 'id,nombre,facultad_id,facultades(id,nombre)',
      order: 'nombre.asc'
    }, 'public');

    const normalizados = (filas || []).map(function (fila) {
      const fac = Array.isArray(fila && fila.facultades)
        ? (fila.facultades[0] || null)
        : (fila ? fila.facultades : null);
      return {
        id: fila ? fila.id : null,
        nombre: fila && fila.nombre ? String(fila.nombre).trim() : '',
        facultad_id: fila && fila.facultad_id !== undefined ? fila.facultad_id : (fac ? fac.id : null),
        facultad: fac && fac.nombre ? String(fac.nombre).trim() : ''
      };
    });

    return ordenarProgramasRelacionales(normalizados);
  }

  /**
   * Llena un <select> usando el identificador (`programas.id`) como value y el
   * nombre del programa como texto visible.
   */
  async function poblarSelectProgramasPorId(idSelectPrograma, opciones) {
    const selectPrograma = document.getElementById(idSelectPrograma);
    if (!selectPrograma) return [];

    try {
      const programas = await obtenerProgramasConRelacion(opciones);
      selectPrograma.innerHTML = '<option value="" disabled selected>Seleccione su programa</option>';
      programas.forEach(function (programa) {
        const option = document.createElement('option');
        option.value = String(programa.id);
        option.textContent = programa.nombre;
        if (programa.facultad) {
          option.dataset.facultad = programa.facultad;
        }
        if (programa.facultad_id !== undefined && programa.facultad_id !== null) {
          option.dataset.facultadId = String(programa.facultad_id);
        }
        selectPrograma.appendChild(option);
      });
      return programas;
    } catch (error) {
      console.error('[ConsultasPublicas] Error al cargar programas por ID:', error);
      selectPrograma.innerHTML = '<option value="" disabled selected>Error al cargar programas</option>';
      throw error;
    }
  }

  async function obtenerTutoresSede(sede, opciones) {
    const sedeNorm = String(sede || '').trim().toLowerCase();
    if (sedeNorm !== 'norte' && sedeNorm !== 'sur') {
      throw new Error('Sede de tutores no válida: ' + sede);
    }
    const tabla = 'tutores_' + sedeNorm;
    const forzar = !!(opciones && opciones.forzar);

    return await clientePublico.consultarTodo(tabla, {
      order: 'nombre.asc',
      cache: {
        clave: 'pub:' + tabla,
        ttl: TTL_CATALOGOS_PERSONAL,
        persistirSesion: true,
        forzar: forzar,
        etiquetas: ['tabla:' + tabla, 'grupo:catalogos']
      }
    }, 'public');
  }

  function precargarTutoresAmbasSedes() {
    return Promise.all([
      obtenerTutoresSede('norte'),
      obtenerTutoresSede('sur')
    ]).catch(function (err) {
      console.warn('[ConsultasPublicas] Precarga silenciosa de tutores diferida:', err.message);
      return null;
    });
  }

  async function obtenerCatalogosPMA(opciones) {
    const forzar = !!(opciones && opciones.forzar);

    const resultados = await Promise.all([
      obtenerFacultadesProgramas({ forzar: forzar }),
      obtenerTutoresSede('norte', { forzar: forzar }),
      obtenerTutoresSede('sur', { forzar: forzar }),
      clientePublico.consultarTodo('profesores', {
        order: 'nombre.asc',
        cache: {
          clave: 'pub:profesores',
          ttl: TTL_CATALOGOS_PERSONAL,
          persistirSesion: true,
          forzar: forzar,
          etiquetas: ['tabla:profesores', 'grupo:catalogos']
        }
      }, 'public'),
      clientePublico.consultarTodo('materias', {
        order: 'materia.asc',
        cache: {
          clave: 'pub:materias',
          ttl: TTL_CATALOGOS_ACADEMICOS,
          persistirSesion: true,
          forzar: forzar,
          etiquetas: ['tabla:materias', 'grupo:catalogos']
        }
      }, 'public'),
      clientePublico.consultarTodo('temas', {
        order: 'tema.asc',
        cache: {
          clave: 'pub:temas',
          ttl: TTL_CATALOGOS_ACADEMICOS,
          persistirSesion: true,
          forzar: forzar,
          etiquetas: ['tabla:temas', 'grupo:catalogos']
        }
      }, 'public')
    ]);

    const catalogos = {
      facultadesCarreras: resultados[0] || [],
      tutoresNorte: resultados[1] || [],
      tutoresSur: resultados[2] || [],
      profesores: resultados[3] || [],
      materias: resultados[4] || [],
      temas: resultados[5] || []
    };

    sincronizarCatalogoPublico(catalogos.facultadesCarreras);
    if (typeof datosCache !== 'undefined' && datosCache) {
      datosCache.tutoresNorte = catalogos.tutoresNorte;
      datosCache.tutoresSur = catalogos.tutoresSur;
      datosCache.profesores = catalogos.profesores;
      datosCache.materias = catalogos.materias;
      datosCache.temas = catalogos.temas;
    }

    return catalogos;
  }

  async function crearRemisionAAA(datos) {
    const respuesta = await clientePublico.rpc('crear_remision_aaa', { p_datos: datos }, {
      esquema: 'public',
      intentos: 1,
      etiquetasInvalidar: ['tabla:acompanamiento', 'tabla:public.acompanamiento']
    });

    if (!respuesta || !respuesta.codigo_remision) {
      throw new Motor.ErrorConsultaSupabase('El servidor no devolvió un código de remisión válido.');
    }
    return respuesta;
  }

  // ==========================================================================
  // API PÚBLICA CONGELADA
  // ==========================================================================

  const ConsultasPublicas = Object.freeze({
    contexto: 'publico',
    consultar: clientePublico.consultar,
    consultarUno: clientePublico.consultarUno,
    consultarTodo: clientePublico.consultarTodo,
    contar: clientePublico.contar,
    insertar: clientePublico.insertar,
    actualizar: clientePublico.actualizar,
    eliminar: clientePublico.eliminar,
    rpc: clientePublico.rpc,
    invalidar: clientePublico.invalidar,
    limpiarCache: clientePublico.limpiarCache,
    alInvalidar: clientePublico.alInvalidar,
    crearControladorCancelacion: clientePublico.crearControladorCancelacion,
    interpretarError: clientePublico.interpretarError,

    // Cargadores de dominio públicos reutilizables
    obtenerFacultadesProgramas: obtenerFacultadesProgramas,
    asegurarCatalogoProgramasYFacultades: asegurarCatalogoProgramasYFacultades,
    obtenerProgramasListaPlana: obtenerProgramasListaPlana,
    poblarSelectProgramasPlana: poblarSelectProgramasPlana,
    obtenerProgramasConRelacion: obtenerProgramasConRelacion,
    poblarSelectProgramasPorId: poblarSelectProgramasPorId,
    obtenerTutoresSede: obtenerTutoresSede,
    precargarTutoresAmbasSedes: precargarTutoresAmbasSedes,
    obtenerCatalogosPMA: obtenerCatalogosPMA,
    crearRemisionAAA: crearRemisionAAA
  });

  window.ConsultasPublicas = ConsultasPublicas;
})(window);
