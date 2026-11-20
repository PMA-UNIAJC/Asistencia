// ── MÓDULO DE DIAGNÓSTICOS (UTILIDADES COMPARTIDAS Y ESTADÍSTICAS) ──────────

(function (global) {
  'use strict';

  const AREAS_DIAGNOSTICO = ['MATEMATICAS', 'COMUNICACION', 'LECTURA'];
  const ORDEN_SEDES_PREFERIDO = ['NORTE', 'SUR', 'LADERA', 'NUEVO LATIR', 'VIRTUAL'];
  const ETIQUETAS_SEDES = {
    NORTE: 'Norte',
    SUR: 'Sur',
    LADERA: 'Ladera',
    'NUEVO LATIR': 'Nuevo Latir',
    VIRTUAL: 'Virtual'
  };

  let promesaCargaEnVuelo = null;
  let epocaCarga = 0;

  const estadoEstadisticas = {
    columna: 'promedioGeneral',
    direccion: 'desc'
  };

  // ── UTILIDADES COMPARTIDAS DE DIAGNÓSTICOS ──────────────────────────────

  function normalizarPrueba(valor) {
    return String(valor || '').trim().toUpperCase();
  }

  function extraerEstudiante(fila) {
    const raw = fila && fila.estudiantes;
    if (Array.isArray(raw)) return raw[0] || null;
    return raw && typeof raw === 'object' ? raw : null;
  }

  function obtenerNombrePrograma(fila) {
    const { programa } = resolverProgramaYFacultad(fila);
    return programa || 'Sin programa registrado';
  }

  function normalizarSede(fila) {
    const est = extraerEstudiante(fila);
    return String(est && est.sede || '').trim().toUpperCase();
  }

  function formatearEtiquetaSede(sede) {
    const clave = String(sede || '').trim().toUpperCase();
    if (!clave) return '';
    if (ETIQUETAS_SEDES[clave]) return ETIQUETAS_SEDES[clave];
    return clave
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function extraerSedesReales(datos) {
    const unicas = new Set();
    if (Array.isArray(datos)) {
      datos.forEach(fila => {
        const sede = normalizarSede(fila);
        if (sede) unicas.add(sede);
      });
    }

    return Array.from(unicas).sort((a, b) => {
      const idxA = ORDEN_SEDES_PREFERIDO.indexOf(a);
      const idxB = ORDEN_SEDES_PREFERIDO.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, 'es');
    });
  }

  function sincronizarSelectSedes(selectEl, sedesReales) {
    if (!selectEl) return 'todas';

    const seleccionPrevia = String(selectEl.value || 'todas').trim();
    const valorNormalizado = seleccionPrevia.toLowerCase() === 'todas'
      ? 'todas'
      : seleccionPrevia.toUpperCase();

    selectEl.textContent = '';

    const optTodas = document.createElement('option');
    optTodas.value = 'todas';
    optTodas.textContent = 'Todas las Sedes';
    selectEl.appendChild(optTodas);

    sedesReales.forEach(sede => {
      const opt = document.createElement('option');
      opt.value = sede;
      opt.textContent = formatearEtiquetaSede(sede);
      selectEl.appendChild(opt);
    });

    if (valorNormalizado !== 'todas' && sedesReales.includes(valorNormalizado)) {
      selectEl.value = valorNormalizado;
    } else {
      selectEl.value = 'todas';
    }

    return selectEl.value;
  }

  function filtrarPresentaciones(datos, filtros) {
    const lista = Array.isArray(datos) ? datos : [];
    const pruebaRaw = String(filtros && filtros.prueba || 'todas').trim();
    const sedeRaw = String(filtros && filtros.sede || 'todas').trim();

    const pruebaSel = pruebaRaw.toLowerCase() === 'todas' ? 'todas' : normalizarPrueba(pruebaRaw);
    const sedeSel = sedeRaw.toLowerCase() === 'todas' ? 'todas' : sedeRaw.toUpperCase();

    return lista.filter(fila => {
      if (pruebaSel !== 'todas' && normalizarPrueba(fila && fila.prueba) !== pruebaSel) {
        return false;
      }
      if (sedeSel !== 'todas' && normalizarSede(fila) !== sedeSel) {
        return false;
      }
      return true;
    });
  }

  function obtenerPorcentaje(fila) {
    if (!fila || typeof fila !== 'object') return null;

    if (fila.resultado !== null && fila.resultado !== undefined && fila.resultado !== '') {
      const resultadoNum = Number(fila.resultado);
      if (Number.isFinite(resultadoNum)) return resultadoNum;
    }

    const correctas = Number(fila.correctas);
    const incorrectas = Number(fila.incorrectas);
    if (Number.isFinite(correctas) && Number.isFinite(incorrectas)) {
      const total = correctas + incorrectas;
      if (total > 0) return (correctas * 100) / total;
    }

    return null;
  }

  function formatearPorcentaje(valor) {
    if (valor === null || valor === undefined || !Number.isFinite(valor)) {
      return '—';
    }
    return `${valor.toFixed(1)}%`;
  }

  function limpiarCachePresentaciones() {
    epocaCarga += 1;
    promesaCargaEnVuelo = null;
    global.datosDiagnosticosGlobal = null;
  }

  async function obtenerPresentaciones(opciones) {
    const forzar = Boolean(opciones && opciones.forzar);

    if (!forzar && Array.isArray(global.datosDiagnosticosGlobal)) {
      return global.datosDiagnosticosGlobal;
    }

    if (!forzar && promesaCargaEnVuelo) {
      return promesaCargaEnVuelo;
    }

    const epocaInicial = forzar ? (epocaCarga += 1) : epocaCarga;
    const promesa = ConsultasAdmin.obtenerResultadosDiagnosticos({ forzar: forzar })
      .then(datos => {
        const lista = Array.isArray(datos) ? datos : [];
        if (epocaInicial === epocaCarga) {
          global.datosDiagnosticosGlobal = lista;
        }
        return lista;
      })
      .finally(() => {
        if (promesaCargaEnVuelo === promesa) {
          promesaCargaEnVuelo = null;
        }
      });

    promesaCargaEnVuelo = promesa;
    return promesa;
  }

  // ── ESTADÍSTICAS DE DIAGNÓSTICOS (KPIs Y COMPARACIÓN POR PROGRAMAS) ──────

  function crearAcumuladorArea() {
    return { suma: 0, count: 0 };
  }

  function acumular(target, porcentaje) {
    if (porcentaje === null || !Number.isFinite(porcentaje)) return;
    target.suma += porcentaje;
    target.count += 1;
  }

  function calcularPromedio(acc) {
    if (!acc || acc.count <= 0) return null;
    return acc.suma / acc.count;
  }

  function construirMapaPruebasPorEstudiante(presentacionesSede) {
    const mapa = new Map();
    presentacionesSede.forEach(fila => {
      const doc = String(fila && fila.documento || '').trim();
      const prueba = normalizarPrueba(fila && fila.prueba);
      if (!doc || !AREAS_DIAGNOSTICO.includes(prueba)) return;

      if (!mapa.has(doc)) mapa.set(doc, new Set());
      mapa.get(doc).add(prueba);
    });
    return mapa;
  }

  function calcularEstadisticas(datos, filtros) {
    const presentacionesSede = filtrarPresentaciones(datos, {
      prueba: 'todas',
      sede: filtros && filtros.sede
    });
    const filtrados = filtrarPresentaciones(presentacionesSede, {
      prueba: filtros && filtros.prueba,
      sede: 'todas'
    });

    const pruebasPorDocSede = construirMapaPruebasPorEstudiante(presentacionesSede);
    const estudiantesUnicos = new Set();
    const aciertosArea = {
      MATEMATICAS: crearAcumuladorArea(),
      COMUNICACION: crearAcumuladorArea(),
      LECTURA: crearAcumuladorArea()
    };
    const programasMap = new Map();

    filtrados.forEach(fila => {
      const doc = String(fila && fila.documento || '').trim();
      const area = normalizarPrueba(fila && fila.prueba);
      const pct = obtenerPorcentaje(fila);
      const nombrePrograma = obtenerNombrePrograma(fila);
      const clavePrograma = nombrePrograma.toUpperCase();

      if (doc) {
        estudiantesUnicos.add(doc);
      }

      if (aciertosArea[area]) {
        acumular(aciertosArea[area], pct);
      }

      if (!programasMap.has(clavePrograma)) {
        programasMap.set(clavePrograma, {
          programa: nombrePrograma,
          estudiantes: new Set(),
          MATEMATICAS: crearAcumuladorArea(),
          COMUNICACION: crearAcumuladorArea(),
          LECTURA: crearAcumuladorArea(),
          general: crearAcumuladorArea()
        });
      }

      const entry = programasMap.get(clavePrograma);
      if (doc) entry.estudiantes.add(doc);
      if (entry[area]) acumular(entry[area], pct);
      acumular(entry.general, pct);
    });

    let diagnosticosCompletos = 0;
    estudiantesUnicos.forEach(doc => {
      const pruebas = pruebasPorDocSede.get(doc);
      if (pruebas && pruebas.size === AREAS_DIAGNOSTICO.length) {
        diagnosticosCompletos += 1;
      }
    });

    const programas = Array.from(programasMap.values()).map(entry => ({
      programa: entry.programa,
      estudiantes: entry.estudiantes.size,
      promedioMatematicas: calcularPromedio(entry.MATEMATICAS),
      promedioComunicacion: calcularPromedio(entry.COMUNICACION),
      promedioLectura: calcularPromedio(entry.LECTURA),
      promedioGeneral: calcularPromedio(entry.general)
    }));

    return {
      totalFiltrados: filtrados.length,
      kpis: {
        estudiantesUnicos: estudiantesUnicos.size,
        diagnosticosCompletos,
        promedioMatematicas: calcularPromedio(aciertosArea.MATEMATICAS),
        promedioComunicacion: calcularPromedio(aciertosArea.COMUNICACION),
        promedioLectura: calcularPromedio(aciertosArea.LECTURA)
      },
      programas
    };
  }

  function ordenarProgramas(programas, { columna, direccion }) {
    const dir = direccion === 'asc' ? 1 : -1;
    return [...programas].sort((a, b) => {
      if (columna === 'programa') {
        return a.programa.localeCompare(b.programa, 'es') * dir;
      }

      const valA = a[columna];
      const valB = b[columna];
      const nuloA = valA === null || valA === undefined || !Number.isFinite(valA);
      const nuloB = valB === null || valB === undefined || !Number.isFinite(valB);

      if (nuloA && nuloB) {
        return (b.estudiantes - a.estudiantes) || a.programa.localeCompare(b.programa, 'es');
      }
      if (nuloA) return 1;
      if (nuloB) return -1;

      if (valA !== valB) {
        return (valA - valB) * dir;
      }
      if (b.estudiantes !== a.estudiantes) {
        return b.estudiantes - a.estudiantes;
      }
      return a.programa.localeCompare(b.programa, 'es');
    });
  }

  function renderizarKpis(kpis) {
    const grid = document.getElementById('statsGridDiagnosticos');
    if (!grid) return;

    const tarjetas = [
      { valor: String(kpis.estudiantesUnicos), etiqueta: 'Estudiantes Únicos Evaluados' },
      { valor: String(kpis.diagnosticosCompletos), etiqueta: 'Diagnósticos Completos' },
      { valor: formatearPorcentaje(kpis.promedioMatematicas), etiqueta: 'Promedio Aciertos Matemáticas' },
      { valor: formatearPorcentaje(kpis.promedioComunicacion), etiqueta: 'Promedio Aciertos Comunicación' },
      { valor: formatearPorcentaje(kpis.promedioLectura), etiqueta: 'Promedio Aciertos Lectura' }
    ];

    grid.textContent = '';
    const fragmento = document.createDocumentFragment();
    tarjetas.forEach(t => {
      const card = document.createElement('div');
      card.className = 'stat-card';

      const h3 = document.createElement('h3');
      h3.textContent = t.valor;

      const p = document.createElement('p');
      p.textContent = t.etiqueta;

      card.appendChild(h3);
      card.appendChild(p);
      fragmento.appendChild(card);
    });
    grid.appendChild(fragmento);
  }

  function crearIconoOrden(columna) {
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    if (estadoEstadisticas.columna !== columna) {
      span.className = 'diag-sort-icon';
      span.textContent = '↕';
    } else {
      span.className = 'diag-sort-icon activo';
      span.textContent = estadoEstadisticas.direccion === 'asc' ? '▲' : '▼';
    }
    return span;
  }

  function renderizarTablaProgramas(programas) {
    const contenedor = document.getElementById('comparacionProgramasDiagnosticos');
    if (!contenedor) return;

    contenedor.textContent = '';

    const card = document.createElement('div');
    card.className = 'chart-container chart-container-spacing';

    const h3 = document.createElement('h3');
    h3.className = 'chart-title';
    h3.textContent = 'Comparación por Programas Académicos';
    card.appendChild(h3);

    if (!programas || programas.length === 0) {
      const pVacio = document.createElement('p');
      pVacio.className = 'diag-estado-vacio';
      pVacio.textContent = 'No hay registros de diagnósticos para los filtros seleccionados.';
      card.appendChild(pVacio);
      contenedor.appendChild(card);
      return;
    }

    const ordenados = ordenarProgramas(programas, estadoEstadisticas);
    const columnas = [
      { id: 'programa', etiqueta: 'Programa académico' },
      { id: 'estudiantes', etiqueta: 'Estudiantes evaluados' },
      { id: 'promedioMatematicas', etiqueta: 'Matemáticas' },
      { id: 'promedioComunicacion', etiqueta: 'Comunicación' },
      { id: 'promedioLectura', etiqueta: 'Lectura' },
      { id: 'promedioGeneral', etiqueta: 'Promedio general' }
    ];

    const wrapper = document.createElement('div');
    wrapper.className = 'tabla-tutores-wrapper';

    const tabla = document.createElement('table');
    tabla.className = 'tabla-estadisticas-tutores';

    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    columnas.forEach(col => {
      const th = document.createElement('th');
      th.className = 'diag-th-ordenable';
      th.title = `Ordenar por ${col.etiqueta}`;
      th.addEventListener('click', function () {
        ordenarComparacionProgramasDiagnosticos(col.id);
      });

      const spanTxt = document.createElement('span');
      spanTxt.textContent = col.etiqueta;
      th.appendChild(spanTxt);
      th.appendChild(document.createTextNode(' '));
      th.appendChild(crearIconoOrden(col.id));
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    tabla.appendChild(thead);

    const tbody = document.createElement('tbody');
    ordenados.forEach(item => {
      const tr = document.createElement('tr');

      const crearCelda = (clase, texto) => {
        const td = document.createElement('td');
        td.className = clase;
        td.textContent = texto;
        return td;
      };

      tr.appendChild(crearCelda('tabla-tutor-nombre', item.programa));
      tr.appendChild(crearCelda('tabla-tutor-num', String(item.estudiantes)));
      tr.appendChild(crearCelda('tabla-tutor-num', formatearPorcentaje(item.promedioMatematicas)));
      tr.appendChild(crearCelda('tabla-tutor-num', formatearPorcentaje(item.promedioComunicacion)));
      tr.appendChild(crearCelda('tabla-tutor-num', formatearPorcentaje(item.promedioLectura)));
      tr.appendChild(crearCelda('tabla-tutor-num diag-promedio-general', formatearPorcentaje(item.promedioGeneral)));

      tbody.appendChild(tr);
    });
    tabla.appendChild(tbody);

    wrapper.appendChild(tabla);
    card.appendChild(wrapper);
    contenedor.appendChild(card);
  }

  function mostrarMensajeEstado(mensaje, esError) {
    const estadoEl = document.getElementById('estadoEstadisticasDiagnosticos');
    if (!estadoEl) return;

    if (!mensaje) {
      estadoEl.textContent = '';
      estadoEl.className = 'hidden';
      return;
    }

    estadoEl.textContent = mensaje;
    estadoEl.className = esError ? 'diag-estado-error' : 'diag-estado-vacio';
  }

  function renderizarEstadisticasDiagnosticos(datos) {
    const selectPrueba = document.getElementById('filtroDiagEstPrueba');
    const selectSede = document.getElementById('filtroDiagEstSede');

    const sedesReales = extraerSedesReales(datos);
    const sedeActiva = sincronizarSelectSedes(selectSede, sedesReales);
    const pruebaActiva = selectPrueba ? selectPrueba.value : 'todas';

    const resumen = calcularEstadisticas(datos, {
      prueba: pruebaActiva,
      sede: sedeActiva
    });

    mostrarMensajeEstado('', false);
    renderizarKpis(resumen.kpis);
    renderizarTablaProgramas(resumen.programas);
  }

  async function cargarEstadisticasDiagnosticos(opciones) {
    const loader = document.getElementById('loaderEstadisticasDiagnosticos');
    const grid = document.getElementById('statsGridDiagnosticos');
    const tabla = document.getElementById('comparacionProgramasDiagnosticos');

    mostrarMensajeEstado('', false);
    if (loader) {
      mostrarCargando(loader, 'Cargando estadísticas de diagnósticos...');
    }

    try {
      const datos = await obtenerPresentaciones({
        forzar: Boolean(opciones && opciones.forzar)
      });
      renderizarEstadisticasDiagnosticos(datos);
    } catch (error) {
      console.error('Error cargando estadísticas de diagnósticos:', error);
      if (grid) grid.textContent = '';
      if (tabla) tabla.textContent = '';
      mostrarMensajeEstado('Error al cargar estadísticas. Por favor intenta de nuevo.', true);
    } finally {
      if (loader) ocultarCargando(loader);
    }
  }

  function actualizarEstadisticasDiagnosticos() {
    if (!Array.isArray(global.datosDiagnosticosGlobal)) {
      cargarEstadisticasDiagnosticos();
      return;
    }
    renderizarEstadisticasDiagnosticos(global.datosDiagnosticosGlobal);
  }

  function ordenarComparacionProgramasDiagnosticos(columna) {
    if (estadoEstadisticas.columna === columna) {
      estadoEstadisticas.direccion = estadoEstadisticas.direccion === 'asc' ? 'desc' : 'asc';
    } else {
      estadoEstadisticas.columna = columna;
      estadoEstadisticas.direccion = columna === 'programa' ? 'asc' : 'desc';
    }

    if (Array.isArray(global.datosDiagnosticosGlobal)) {
      renderizarEstadisticasDiagnosticos(global.datosDiagnosticosGlobal);
    }
  }

  function resetearTabsDiagnosticos() {
    const primerTabDiagnosticos = document.querySelector('#contenidoDiagnosticos .admin-tabs-secundario .admin-tab');
    if (primerTabDiagnosticos) {
      document.querySelectorAll('#contenidoDiagnosticos .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabDiagnosticos.classList.add('active');
      document.getElementById('tabEstadisticasDiagnosticos').classList.add('hidden');
      document.getElementById('tabGraficasDiagnosticos')?.classList.add('hidden');
      document.getElementById('tabGruposDiagnosticos')?.classList.add('hidden');
      document.getElementById('tabDescargasDiagnosticos').classList.remove('hidden');
    }
  }

  async function cambiarTabDiagnosticos(event, tab) {
    document.querySelectorAll('#contenidoDiagnosticos .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    } else if (event && event.target) {
      event.target.classList.add('active');
    }

    document.getElementById('tabEstadisticasDiagnosticos').classList.add('hidden');
    document.getElementById('tabGraficasDiagnosticos')?.classList.add('hidden');
    document.getElementById('tabDescargasDiagnosticos').classList.add('hidden');
    document.getElementById('tabGruposDiagnosticos')?.classList.add('hidden');

    if (tab === 'descargas') {
      document.getElementById('tabDescargasDiagnosticos').classList.remove('hidden');
    } else if (tab === 'estadisticas') {
      document.getElementById('tabEstadisticasDiagnosticos').classList.remove('hidden');
      if (!Array.isArray(global.datosDiagnosticosGlobal)) {
        await cargarEstadisticasDiagnosticos();
      } else {
        renderizarEstadisticasDiagnosticos(global.datosDiagnosticosGlobal);
      }
    } else if (tab === 'graficas') {
      document.getElementById('tabGraficasDiagnosticos')?.classList.remove('hidden');
      if (!Array.isArray(global.datosDiagnosticosGlobal)) {
        await cargarGraficasDiagnosticos();
      } else {
        actualizarGraficaDiagnosticos();
      }
    } else if (tab === 'grupos') {
      document.getElementById('tabGruposDiagnosticos')?.classList.remove('hidden');
      if (typeof inicializarSeccionGrupos === 'function') {
        inicializarSeccionGrupos();
      }
    }
  }

  async function actualizarDatosDiagnosticos() {
    ConsultasAdmin.invalidar([
      'esquema:diagnosticos',
      'tabla:presentaciones',
      'tabla:diagnosticos.presentaciones',
      'tabla:estudiantes',
      'tabla:diagnosticos.estudiantes',
      'tabla:programas',
      'tabla:facultades',
      'tabla:grupos',
      'tabla:diagnosticos.grupos'
    ]);
    limpiarCachePresentaciones();

    const tabEstDiag = document.getElementById('tabEstadisticasDiagnosticos');
    const tabGrafDiag = document.getElementById('tabGraficasDiagnosticos');
    if (tabGrafDiag && !tabGrafDiag.classList.contains('hidden') && typeof cargarGraficasDiagnosticos === 'function') {
      await cargarGraficasDiagnosticos({ forzar: true });
    } else if (tabEstDiag && !tabEstDiag.classList.contains('hidden') && typeof cargarEstadisticasDiagnosticos === 'function') {
      await cargarEstadisticasDiagnosticos({ forzar: true });
    } else {
      await obtenerPresentaciones({ forzar: true });
    }
  }

  // ── SINCRONIZACIÓN DE CACHÉ LOCAL DE DIAGNÓSTICOS ANTE MUTACIONES ──────────
  if (typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.alInvalidar === 'function') {
    ConsultasAdmin.alInvalidar(function (etiquetas) {
      if (!Array.isArray(etiquetas) || etiquetas.length === 0) return;
      const set = new Set(etiquetas);
      const todo = set.has('*');

      if (
        todo ||
        set.has('esquema:diagnosticos') ||
        set.has('tabla:presentaciones') ||
        set.has('tabla:diagnosticos.presentaciones') ||
        set.has('tabla:estudiantes') ||
        set.has('tabla:diagnosticos.estudiantes') ||
        set.has('tabla:programas') ||
        set.has('tabla:facultades') ||
        set.has('grupo:catalogos')
      ) {
        limpiarCachePresentaciones();
        if (typeof global.destruirGraficaDiagnosticos === 'function') {
          global.destruirGraficaDiagnosticos();
        }
      }
    });
  }

  global.DiagnosticosPanel = {
    AREAS: AREAS_DIAGNOSTICO,
    normalizarPrueba,
    normalizarSede,
    extraerEstudiante,
    obtenerNombrePrograma,
    formatearEtiquetaSede,
    extraerSedesReales,
    sincronizarSelectSedes,
    filtrarPresentaciones,
    obtenerPorcentaje,
    formatearPorcentaje,
    obtenerPresentaciones,
    limpiarCachePresentaciones
  };

  global.resetearTabsDiagnosticos = resetearTabsDiagnosticos;
  global.cambiarTabDiagnosticos = cambiarTabDiagnosticos;
  global.actualizarDatosDiagnosticos = actualizarDatosDiagnosticos;
  global.cargarEstadisticasDiagnosticos = cargarEstadisticasDiagnosticos;
  global.actualizarEstadisticasDiagnosticos = actualizarEstadisticasDiagnosticos;
  global.ordenarComparacionProgramasDiagnosticos = ordenarComparacionProgramasDiagnosticos;
  global.renderizarEstadisticasDiagnosticos = renderizarEstadisticasDiagnosticos;
})(window);
