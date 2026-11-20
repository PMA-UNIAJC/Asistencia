// ── GRÁFICAS (PMA Y DIAGNÓSTICOS) ───────────────────────────────────────────

let graficoDiagnosticos = null;
let promesaCargaFormulariosPMA = null;
let epocaCargaPMA = 0;

function obtenerLunesGrafica(fecha) {
  const dia = fecha.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + diff);
}

function formatearDiaMesGrafica(fecha) {
  const d = String(fecha.getDate()).padStart(2, '0');
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

function agruparFechasPorPeriodo(fechasCol, periodo) {
  const grupos = new Map();
  const aniosUnicos = new Set();

  fechasCol.forEach(fecha => {
    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      aniosUnicos.add(fecha.getFullYear());
    }
  });

  const incluirAnioEnSemana = aniosUnicos.size > 1;
  const nombresMesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  fechasCol.forEach(fecha => {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return;

    let key;
    let label;

    if (periodo === 'semanal') {
      const lunes = obtenerLunesGrafica(fecha);
      const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
      key = lunes.getTime();
      label = incluirAnioEnSemana
        ? `${formatearDiaMesGrafica(lunes)}/${lunes.getFullYear()} - ${formatearDiaMesGrafica(domingo)}/${domingo.getFullYear()}`
        : `${formatearDiaMesGrafica(lunes)} - ${formatearDiaMesGrafica(domingo)}`;
    } else if (periodo === 'mensual') {
      const mes = fecha.getMonth();
      const anio = fecha.getFullYear();
      key = `${anio}-${String(mes + 1).padStart(2, '0')}`;
      label = `${nombresMesesCortos[mes]} ${anio}`;
    } else {
      const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      key = dia.getTime();
      label = `${formatearDiaMesGrafica(dia)}/${dia.getFullYear()}`;
    }

    if (!grupos.has(key)) {
      grupos.set(key, { label, cantidad: 0 });
    }
    grupos.get(key).cantidad += 1;
  });

  const ordenadas = [...grupos.entries()].sort((a, b) =>
    typeof a[0] === 'string' ? a[0].localeCompare(b[0]) : a[0] - b[0]
  );

  return {
    labels: ordenadas.map(([, v]) => v.label),
    valores: ordenadas.map(([, v]) => v.cantidad)
  };
}

function renderizarGraficaBarras(canvasId, instanciaAnterior, labels, valores, { datasetLabel, formatoTooltip }) {
  if (instanciaAnterior) {
    try { instanciaAnterior.destroy(); } catch (e) {}
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    throw new Error(`No se encontró el contenedor gráfico "${canvasId}".`);
  }

  if (typeof Chart !== 'function') {
    throw new Error('La librería de gráficas (Chart.js) no se cargó correctamente.');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(`No fue posible obtener el contexto 2D para "${canvasId}".`);
  }

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: datasetLabel,
        data: valores,
        backgroundColor: 'rgba(30, 60, 114, 0.7)',
        borderColor: 'rgba(30, 60, 114, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: formatoTooltip
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: 45, minRotation: 45 } }
      }
    }
  });
}

// ── PMA / GRÁFICAS ──────────────────────────────────────────────────────────

function destruirGraficaPMA() {
  if (typeof graficoTutorias !== 'undefined' && graficoTutorias) {
    try { graficoTutorias.destroy(); } catch (e) {}
    graficoTutorias = null;
  }
}

function invalidarCargaFormulariosPMA() {
  epocaCargaPMA += 1;
  promesaCargaFormulariosPMA = null;
  destruirGraficaPMA();
}

function actualizarErrorGraficaPMA(mensaje, esVacio) {
  const estadoEl = document.getElementById('estadoGraficasPMA');
  if (!estadoEl) return;

  if (!mensaje) {
    estadoEl.textContent = '';
    estadoEl.className = 'hidden';
    return;
  }

  estadoEl.textContent = mensaje;
  estadoEl.className = esVacio ? 'diag-estado-vacio' : 'diag-estado-error';
}

function sincronizarFiltroSedePMA(tipoInstructor) {
  const filtroSedeWrapper = document.getElementById('filtroSedeWrapper');
  if (!filtroSedeWrapper) return;
  filtroSedeWrapper.style.display = tipoInstructor === 'Profesor' ? 'none' : '';
}

function obtenerFormulariosParaGraficaPMA(opciones) {
  const forzar = Boolean(opciones && opciones.forzar);

  if (!forzar && Array.isArray(window.datosFormulariosGlobal)) {
    return Promise.resolve(window.datosFormulariosGlobal);
  }

  if (!forzar && promesaCargaFormulariosPMA) {
    return promesaCargaFormulariosPMA;
  }

  const epocaInicial = forzar ? (epocaCargaPMA += 1) : epocaCargaPMA;
  const promesa = ConsultasAdmin.obtenerFormularios({ forzar: forzar })
    .then(data => {
      if (!Array.isArray(data)) {
        throw new Error('Respuesta inesperada al consultar las tutorías.');
      }
      if (epocaInicial === epocaCargaPMA) {
        window.datosFormulariosGlobal = data;
      }
      return data;
    })
    .finally(() => {
      if (promesaCargaFormulariosPMA === promesa) {
        promesaCargaFormulariosPMA = null;
      }
    });

  promesaCargaFormulariosPMA = promesa;
  return promesa;
}

function renderizarGraficaPMA(data) {
  const selectPeriodo = document.getElementById('filtroGraficaPeriodo');
  const selectTipo = document.getElementById('filtroGraficaTipo');
  const selectSede = document.getElementById('filtroGraficaSede');

  const periodo = selectPeriodo ? selectPeriodo.value : 'semanal';
  const tipoInstructor = selectTipo ? selectTipo.value : 'todos';
  const sede = selectSede ? selectSede.value : 'todas';

  sincronizarFiltroSedePMA(tipoInstructor);

  if (!Array.isArray(data)) {
    destruirGraficaPMA();
    actualizarErrorGraficaPMA('No se pudieron mostrar las gráficas porque la respuesta del servidor no es válida.', false);
    return;
  }

  try {
    const registrosValidos = data.filter(item => item && typeof item === 'object');
    let datosFiltrados = tipoInstructor !== 'todos'
      ? registrosValidos.filter(item => item.tipo_instructor === tipoInstructor)
      : registrosValidos;

    if (tipoInstructor !== 'Profesor' && sede !== 'todas') {
      const sedeFiltroUpper = sede.trim().toUpperCase();
      datosFiltrados = datosFiltrados.filter(
        item => String(item.sede_tutoria || '').trim().toUpperCase() === sedeFiltroUpper
      );
    }

    const fechasCol = datosFiltrados
      .map(item => (item.fecha ? convertirFechaAColombia(item.fecha) : null))
      .filter(fecha => fecha instanceof Date && !Number.isNaN(fecha.getTime()));

    actualizarErrorGraficaPMA('');

    const { labels, valores } = fechasCol.length > 0
      ? agruparFechasPorPeriodo(fechasCol, periodo)
      : { labels: ['Sin datos'], valores: [0] };

    renderGrafica(labels, valores);
  } catch (error) {
    console.error('Error renderizando gráfica de PMA:', error);
    destruirGraficaPMA();
    actualizarErrorGraficaPMA('Error al renderizar la gráfica de tutorías. Por favor intenta de nuevo.', false);
  }
}

async function cargarGraficaPMA(opciones) {
  const loader = document.getElementById('loaderGraficasPMA');
  const selectTipo = document.getElementById('filtroGraficaTipo');
  sincronizarFiltroSedePMA(selectTipo ? selectTipo.value : 'todos');

  actualizarErrorGraficaPMA('');
  if (loader) {
    mostrarCargando(loader, 'Cargando gráfica de tutorías...');
  }

  try {
    const datos = await obtenerFormulariosParaGraficaPMA({
      forzar: Boolean(opciones && opciones.forzar)
    });
    renderizarGraficaPMA(datos);
  } catch (error) {
    console.error('Error cargando gráfica de PMA:', error);
    destruirGraficaPMA();
    const mensaje = typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.interpretarError === 'function'
      ? ConsultasAdmin.interpretarError(error, 'Error al cargar la gráfica de tutorías')
      : 'Error al cargar datos. Por favor intenta de nuevo.';
    actualizarErrorGraficaPMA(mensaje, false);
  } finally {
    if (loader) ocultarCargando(loader);
  }
}

function actualizarGrafica() {
  const selectTipo = document.getElementById('filtroGraficaTipo');
  sincronizarFiltroSedePMA(selectTipo ? selectTipo.value : 'todos');

  if (!Array.isArray(window.datosFormulariosGlobal)) {
    cargarGraficaPMA();
    return;
  }

  renderizarGraficaPMA(window.datosFormulariosGlobal);
}

function renderGrafica(labels, valores) {
  graficoTutorias = renderizarGraficaBarras('graficaTutorias', graficoTutorias, labels, valores, {
    datasetLabel: 'Cantidad de tutorías',
    formatoTooltip: ctx => ctx.parsed.y + ' tutoría' + (ctx.parsed.y !== 1 ? 's' : '')
  });
}

// ── DIAGNÓSTICOS / GRÁFICAS ─────────────────────────────────────────────────

function destruirGraficaDiagnosticos() {
  if (graficoDiagnosticos) {
    try { graficoDiagnosticos.destroy(); } catch (e) {}
    graficoDiagnosticos = null;
  }
}

function actualizarErrorGraficaDiagnosticos(mensaje) {
  const estadoEl = document.getElementById('estadoGraficasDiagnosticos');
  if (!estadoEl) return;

  if (!mensaje) {
    estadoEl.textContent = '';
    estadoEl.className = 'hidden';
    return;
  }

  estadoEl.textContent = mensaje;
  estadoEl.className = 'diag-estado-error';
}

function renderizarGraficaDiagnosticos(datos) {
  if (!Array.isArray(datos)) {
    destruirGraficaDiagnosticos();
    actualizarErrorGraficaDiagnosticos('Los datos recibidos para las gráficas de diagnósticos no son válidos.');
    return;
  }

  try {
    const selectPeriodo = document.getElementById('filtroDiagGrafPeriodo');
    const selectPrueba = document.getElementById('filtroDiagGrafPrueba');
    const selectSede = document.getElementById('filtroDiagGrafSede');

    const sedesReales = DiagnosticosPanel.extraerSedesReales(datos);
    const sedeActiva = DiagnosticosPanel.sincronizarSelectSedes(selectSede, sedesReales);
    const periodo = selectPeriodo ? selectPeriodo.value : 'semanal';
    const prueba = selectPrueba ? selectPrueba.value : 'todas';

    const filtrados = DiagnosticosPanel.filtrarPresentaciones(datos, { prueba, sede: sedeActiva });
    const fechasCol = filtrados
      .map(item => (item && item.fecha_presentacion ? convertirFechaAColombia(item.fecha_presentacion) : null))
      .filter(fecha => fecha instanceof Date && !Number.isNaN(fecha.getTime()));

    actualizarErrorGraficaDiagnosticos('');

    const { labels, valores } = fechasCol.length > 0
      ? agruparFechasPorPeriodo(fechasCol, periodo)
      : { labels: ['Sin datos'], valores: [0] };

    graficoDiagnosticos = renderizarGraficaBarras('graficaDiagnosticos', graficoDiagnosticos, labels, valores, {
      datasetLabel: 'Cantidad de diagnósticos',
      formatoTooltip: ctx => ctx.parsed.y + ' presentaci' + (ctx.parsed.y !== 1 ? 'ones' : 'ón')
    });
  } catch (error) {
    console.error('Error renderizando gráficas de diagnósticos:', error);
    destruirGraficaDiagnosticos();
    actualizarErrorGraficaDiagnosticos('Error al renderizar la gráfica de diagnósticos. Por favor intenta de nuevo.');
  }
}

async function cargarGraficasDiagnosticos(opciones) {
  const loader = document.getElementById('loaderGraficasDiagnosticos');

  actualizarErrorGraficaDiagnosticos('');
  if (loader) {
    mostrarCargando(loader, 'Cargando gráficas de diagnósticos...');
  }

  try {
    const datos = await DiagnosticosPanel.obtenerPresentaciones({
      forzar: Boolean(opciones && opciones.forzar)
    });
    renderizarGraficaDiagnosticos(datos);
  } catch (error) {
    console.error('Error cargando gráficas de diagnósticos:', error);
    destruirGraficaDiagnosticos();
    actualizarErrorGraficaDiagnosticos('Error al cargar gráficas. Por favor intenta de nuevo.');
  } finally {
    if (loader) ocultarCargando(loader);
  }
}

function actualizarGraficaDiagnosticos() {
  if (!Array.isArray(window.datosDiagnosticosGlobal)) {
    cargarGraficasDiagnosticos();
    return;
  }
  renderizarGraficaDiagnosticos(window.datosDiagnosticosGlobal);
}
