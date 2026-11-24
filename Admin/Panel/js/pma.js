// ── MÓDULO DE PMA (NAVEGACIÓN, ESTADÍSTICAS, TUTORES, PROFESORES Y RANKING) ─

let graficoTutorias = null;

const cacheEstadisticas = {
  general: null,
  tutores: null,
  profesores: null
};

function invalidarCacheEstadisticas() {
  cacheEstadisticas.general = null;
  cacheEstadisticas.tutores = null;
  cacheEstadisticas.profesores = null;
}

function clonarHijosAFragmento(contenedor) {
  const fragmento = document.createDocumentFragment();
  if (!contenedor) return fragmento;
  Array.from(contenedor.childNodes).forEach(nodo => {
    fragmento.appendChild(nodo.cloneNode(true));
  });
  return fragmento;
}

function restaurarHijosDesdeFragmento(contenedor, fragmento) {
  if (!contenedor) return;
  contenedor.textContent = '';
  if (fragmento) {
    contenedor.appendChild(fragmento.cloneNode(true));
  }
}

function crearParrafoEstadoPMA(texto, color = '#666') {
  const p = document.createElement('p');
  p.style.textAlign = 'center';
  p.style.color = color;
  p.textContent = texto;
  return p;
}

function crearStatCardPMA(valor, etiqueta, subtitulo) {
  const card = document.createElement('div');
  card.className = 'stat-card';

  const h3 = document.createElement('h3');
  h3.textContent = String(valor ?? '');
  card.appendChild(h3);

  const p = document.createElement('p');
  p.textContent = String(etiqueta ?? '');
  if (subtitulo) {
    p.appendChild(document.createElement('br'));
    const small = document.createElement('small');
    small.textContent = subtitulo;
    p.appendChild(small);
  }
  card.appendChild(p);

  return card;
}

function crearItemListaPMA(etiqueta, valorNegrita) {
  const item = document.createElement('div');
  item.className = 'list-item';

  const span = document.createElement('span');
  span.textContent = String(etiqueta ?? '');
  const strong = document.createElement('strong');
  strong.textContent = String(valorNegrita ?? '');

  item.appendChild(span);
  item.appendChild(strong);
  return item;
}

function inicializarEventosEstadisticasPMA() {
  const statsGrid = elementosDOM.statsGrid || document.getElementById('statsGrid');
  if (statsGrid && statsGrid.dataset.pmaDelegado !== 'true') {
    statsGrid.dataset.pmaDelegado = 'true';
    statsGrid.addEventListener('click', function (e) {
      const btn = e.target.closest('.estadisticas-menu-wrapper .btn-sede[data-tipo-stats]');
      if (!btn) return;
      mostrarEstadisticas(btn.dataset.tipoStats, btn);
    });
  }

  const detallesStats = elementosDOM.detallesStats || document.getElementById('detallesStats');
  if (detallesStats && detallesStats.dataset.pmaDelegado !== 'true') {
    detallesStats.dataset.pmaDelegado = 'true';
    detallesStats.addEventListener('click', function (e) {
      const btnSede = e.target.closest('button[data-sede-toggle]');
      if (btnSede) {
        toggleInstructoresSede(btnSede.dataset.sedeToggle);
        return;
      }

      const btnFacultad = e.target.closest('button[data-facultad-id]');
      if (btnFacultad) {
        toggleProfesoresFacultad(btnFacultad.dataset.facultadId);
        return;
      }

      const btnRanking = e.target.closest('button[data-accion="calcular-ranking"]');
      if (btnRanking) {
        calcularRankingTutores();
        return;
      }

      const btnRankingSede = e.target.closest('button[data-ranking-sede]');
      if (btnRankingSede) {
        toggleRankingSede(btnRankingSede.dataset.rankingSede);
      }
    });

    detallesStats.addEventListener('change', function (e) {
      const target = e.target;
      if (!target) return;
      if (target.id === 'filtroOrdenTutores') {
        reordenarTutores();
      } else if (target.id === 'filtroAreaTutores') {
        filtrarTutoresPorArea();
      } else if (target.id === 'filtroOrdenProfesores') {
        reordenarTodosProfesores();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', inicializarEventosEstadisticasPMA);

async function precargarDatosEstadisticas(opciones) {
  const forzar = Boolean(opciones && opciones.forzar);
  if (!forzar && datosCache.tutoresNorte.length > 0 && datosCache.tutoresSur.length > 0 && datosCache.profesores.length > 0) return;
  try {
    const catalogos = await ConsultasAdmin.obtenerCatalogosEstadisticas({ forzar: forzar });
    
    datosCache.tutoresNorte = catalogos.tutoresNorte;
    datosCache.tutoresSur = catalogos.tutoresSur;
    datosCache.profesores = catalogos.profesores;
  } catch (error) {
    console.error('Error precargando datos de estadísticas:', error);
    throw error;
  }
}

function resetearTabsPMA() {
  const primerTabPMA = document.querySelector('#contenidoPMA .admin-tabs-secundario .admin-tab');
  if (primerTabPMA) {
    document.querySelectorAll('#contenidoPMA .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
    primerTabPMA.classList.add('active');
    document.getElementById('tabEstadisticas').classList.add('hidden');
    document.getElementById('tabGraficas').classList.add('hidden');
    document.getElementById('tabVisitas').classList.add('hidden');
    document.getElementById('tabSupabase')?.classList.add('hidden');
    document.getElementById('tabDescargas').classList.remove('hidden');
  }
}

async function cambiarTab(event, tab) {
  document.querySelectorAll('#contenidoPMA .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else if (event && event.target) {
    event.target.classList.add('active');
  }
  
  document.getElementById('tabEstadisticas').classList.add('hidden');
  document.getElementById('tabGraficas').classList.add('hidden');
  document.getElementById('tabDescargas').classList.add('hidden');
  document.getElementById('tabVisitas').classList.add('hidden');
  document.getElementById('tabSupabase')?.classList.add('hidden');
  
  if (tab === 'descargas') {
    document.getElementById('tabDescargas').classList.remove('hidden');

} else if (tab === 'visitas') {
    document.getElementById('tabVisitas').classList.remove('hidden');
    if (typeof inicializarSeccionVisitasCSV === 'function') {
      inicializarSeccionVisitasCSV();
    }

} else if (tab === 'supabase') {
    document.getElementById('tabSupabase')?.classList.remove('hidden');
    if (typeof inicializarSeccionSupabase === 'function') {
      inicializarSeccionSupabase();
    }

} else if (tab === 'estadisticas') {
    document.getElementById('tabEstadisticas').classList.remove('hidden');
    if (datosCache.tutoresNorte.length === 0 || datosCache.tutoresSur.length === 0) {
      if (elementosDOM.statsGrid) {
        mostrarCargando(elementosDOM.statsGrid);
      }
      try {
        await precargarDatosEstadisticas();
      } catch (error) {
        if (elementosDOM.statsGrid) {
          elementosDOM.statsGrid.textContent = '';
          const p = document.createElement('p');
          p.style.textAlign = 'center';
          p.style.color = '#dc3545';
          p.textContent = 'Error al cargar datos. Por favor intenta de nuevo.';
          elementosDOM.statsGrid.appendChild(p);
        }
        return;
      }
    }

const contenidoYaRenderizado = document.getElementById('contenidoEstadisticas');
    if (!window.datosFormulariosGlobal || !contenidoYaRenderizado || contenidoYaRenderizado.children.length === 0) {
      await cargarEstadisticas();
    } else {
      mostrarEstadisticas('general');
    }
    
  } else if (tab === 'graficas') {
    document.getElementById('tabGraficas').classList.remove('hidden');

    if (!Array.isArray(window.datosFormulariosGlobal)) {
      if (typeof cargarGraficaPMA === 'function') {
        await cargarGraficaPMA();
      }
    } else if (typeof actualizarGrafica === 'function') {
      actualizarGrafica();
    }
  }
}

async function actualizarEstadisticasPMA() {
  ConsultasAdmin.invalidar(['tabla:formularios', 'grupo:catalogos']);
  datosCache.tutoresNorte = [];
  datosCache.tutoresSur = [];
  datosCache.profesores = [];
  window.datosFormulariosGlobal = null;
  invalidarCacheEstadisticas();
  if (typeof invalidarCargaFormulariosPMA === 'function') {
    invalidarCargaFormulariosPMA();
  } else if (graficoTutorias) {
    try { graficoTutorias.destroy(); } catch (e) {}
    graficoTutorias = null;
  }

  const tabGraficas = document.getElementById('tabGraficas');
  const graficasVisible = Boolean(tabGraficas && !tabGraficas.classList.contains('hidden'));

  let errorCatalogos = null;
  try {
    await precargarDatosEstadisticas({ forzar: true });
  } catch (err) {
    errorCatalogos = err;
  }

  if (!errorCatalogos) {
    await cargarEstadisticas({ forzar: true });
  } else if (elementosDOM.statsGrid) {
    elementosDOM.statsGrid.textContent = '';
    elementosDOM.statsGrid.appendChild(
      crearParrafoEstadoPMA('Error al cargar datos. Por favor intenta de nuevo.', '#dc3545')
    );
  }

  if (graficasVisible) {
    if (Array.isArray(window.datosFormulariosGlobal)) {
      if (typeof actualizarGrafica === 'function') {
        actualizarGrafica();
      }
    } else if (typeof cargarGraficaPMA === 'function') {
      await cargarGraficaPMA({ forzar: true });
    }
  }
}

function ponerMarcaUltimaActualizacionEstadisticas() {
  const grid = elementosDOM.statsGrid || document.getElementById('statsGrid');
  if (!grid) return;
  const id = 'marcaUltimaActualizacionEstadisticas';
  grid.querySelector('#' + id)?.remove();
  const ahora = formatearFechaColombia(new Date(), { formato: 'fechaHoraLocal' });
  const p = document.createElement('p');
  p.id = id;
  p.style.textAlign = 'right';
  p.style.color = '#666';
  p.style.fontSize = '12px';
  p.textContent = 'Última actualización: ' + ahora;
  grid.insertAdjacentElement('afterbegin', p);
}

async function cargarEstadisticas(opciones) {
  inicializarEventosEstadisticasPMA();

  if (elementosDOM.statsGrid) {
    mostrarCargando(elementosDOM.statsGrid);
  }
  if (elementosDOM.detallesStats) {
    elementosDOM.detallesStats.textContent = '';
  }
  
  try {
    const data = await ConsultasAdmin.obtenerFormularios(
      opciones && opciones.forzar ? { forzar: true } : {}
    );

    if (!Array.isArray(data)) {
      throw new Error('Respuesta inesperada al consultar las estadísticas de tutorías.');
    }

    if (data.length === 0) {
      if (window.datosFormulariosGlobal && window.datosFormulariosGlobal.length > 0) {
        invalidarCacheEstadisticas();
      }
      window.datosFormulariosGlobal = [];
      if (elementosDOM.statsGrid) {
        elementosDOM.statsGrid.textContent = '';
        elementosDOM.statsGrid.appendChild(
          crearParrafoEstadoPMA('No hay datos disponibles aún.', '#666')
        );
      }
      ponerMarcaUltimaActualizacionEstadisticas();
      return;
    }

    if (elementosDOM.statsGrid) {
      elementosDOM.statsGrid.textContent = '';

      const menuWrapper = document.createElement('div');
      menuWrapper.className = 'estadisticas-menu-wrapper';

      [
        { tipo: 'general', etiqueta: 'General', activo: true },
        { tipo: 'tutores', etiqueta: 'Tutores', activo: false },
        { tipo: 'profesores', etiqueta: 'Profesores', activo: false }
      ].forEach(cfg => {
        const btn = document.createElement('button');
        btn.className = cfg.activo ? 'btn btn-sede activo' : 'btn btn-sede';
        btn.dataset.tipoStats = cfg.tipo;
        btn.textContent = cfg.etiqueta;
        menuWrapper.appendChild(btn);
      });

      const contEst = document.createElement('div');
      contEst.id = 'contenidoEstadisticas';

      elementosDOM.statsGrid.appendChild(menuWrapper);
      elementosDOM.statsGrid.appendChild(contEst);
    }
    if (elementosDOM.detallesStats) {
      elementosDOM.detallesStats.textContent = '';
    }

    const datosAnteriores = window.datosFormulariosGlobal;
    const datosCambiaron = !datosAnteriores || datosAnteriores.length !== data.length;
    window.datosFormulariosGlobal = data;
    if (datosCambiaron) {
      invalidarCacheEstadisticas();
    }
    mostrarEstadisticas('general');
    ponerMarcaUltimaActualizacionEstadisticas();

  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    if (elementosDOM.statsGrid) {
      elementosDOM.statsGrid.textContent = '';
      elementosDOM.statsGrid.appendChild(
        crearParrafoEstadoPMA('Error al cargar estadísticas. Por favor intenta de nuevo.', '#dc3545')
      );
    }
  }
}

const PESOS_RANKING_PMA_DEFECTO = Object.freeze({
  pesoT: 35,
  pesoB: 45,
  pesoC: 20
});

function calcularPorcentajePMA(cantidad, total) {
  const cantNum = Number(cantidad) || 0;
  const totNum = Number(total) || 0;
  return totNum > 0 ? ((cantNum / totNum) * 100).toFixed(1) : '0.0';
}

function obtenerPesosRankingPMA(opciones) {
  const op = opciones || {};
  const inputT = document.getElementById('pesoTutorias');
  const inputB = document.getElementById('pesoBeneficiados');
  const inputC = document.getElementById('pesoCalificacion');

  if (inputT && inputB && inputC) {
    const pesoT = parseFloat(inputT.value) || 0;
    const pesoB = parseFloat(inputB.value) || 0;
    const pesoC = parseFloat(inputC.value) || 0;
    const sumaValida = Math.round(pesoT + pesoB + pesoC) === 100;

    if (sumaValida || op.usarInputsSiempre) {
      return { pesoT, pesoB, pesoC, sumaValida };
    }
  }

  return {
    pesoT: PESOS_RANKING_PMA_DEFECTO.pesoT,
    pesoB: PESOS_RANKING_PMA_DEFECTO.pesoB,
    pesoC: PESOS_RANKING_PMA_DEFECTO.pesoC,
    sumaValida: true
  };
}

function calcularEstadisticasPMA(data, tipo = 'general', opciones = {}) {
  const listaOrigen = Array.isArray(data) ? data : [];
  let datosFiltrados;

  if (tipo === 'tutores') {
    datosFiltrados = listaOrigen.filter(item => item && item.tipo_instructor === 'Tutor');
  } else if (tipo === 'profesores') {
    datosFiltrados = listaOrigen.filter(item => item && item.tipo_instructor === 'Profesor');
  } else {
    datosFiltrados = listaOrigen.filter(Boolean);
  }

  const stats = {
    total: datosFiltrados.length,
    instructoresPorSede: { Norte: {}, Sur: {} },
    sedesTutorias: {},
    calificacionesPorInstructor: {},
    facultadDepartamento: {},
    sumaCalificacionesTotal: 0,
    sumaCalificacionesPMA: 0
  };

  const estudiantesUnicos = new Set();
  const materiasCuenta = {};
  const semestresCuenta = {};
  const programasCuenta = {};
  const facultadesCuenta = {};
  const motivosCuenta = {};
  const tutoriasPorInstructor = {};
  const documentosPorInstructor = {};
  const profesoresPorFacultad = {};
  const documentosPorFacultadProfesor = {};

  datosFiltrados.forEach(item => {
    const sede = String(item.sede_tutoria || '').trim().toUpperCase() || 'SIN ESPECIFICAR';
    const instructor = item.instructor;

    if (!stats.instructoresPorSede[sede]) {
      stats.instructoresPorSede[sede] = {};
    }
    stats.instructoresPorSede[sede][instructor] = (stats.instructoresPorSede[sede][instructor] || 0) + 1;
    stats.sedesTutorias[sede] = (stats.sedesTutorias[sede] || 0) + 1;

    const calificacionTutoria = item.calificacion || 0;
    const dudasResueltas = item.dudas_resueltas || 0;
    const dominioTema = item.dominio_tema || 0;
    const promedioTutoria = (calificacionTutoria + dudasResueltas + dominioTema) / 3;
    const ambiente = item.ambiente || 0;
    const recomiendaPMA = item.recomienda_pma || 0;
    const promedioPMA = (calificacionTutoria + dudasResueltas + dominioTema + ambiente + recomiendaPMA) / 5;

    if (!stats.calificacionesPorInstructor[instructor]) {
      stats.calificacionesPorInstructor[instructor] = { suma: 0, cantidad: 0 };
    }
    stats.calificacionesPorInstructor[instructor].suma += promedioTutoria;
    stats.calificacionesPorInstructor[instructor].cantidad += 1;

    stats.sumaCalificacionesTotal += promedioTutoria;
    stats.sumaCalificacionesPMA += promedioPMA;

    if (tipo === 'general') {
      estudiantesUnicos.add(item.documento);
      const { programa: programaResuelto, facultad: facultadResuelta } = resolverProgramaYFacultad(item);
      const materia = item.asignatura || 'Sin especificar';
      materiasCuenta[materia] = (materiasCuenta[materia] || 0) + 1;
      const semestre = item.semestre || 'Sin especificar';
      semestresCuenta[semestre] = (semestresCuenta[semestre] || 0) + 1;
      const programa = programaResuelto || 'Sin especificar';
      programasCuenta[programa] = (programasCuenta[programa] || 0) + 1;
      const facultad = facultadResuelta || 'Sin especificar';
      facultadesCuenta[facultad] = (facultadesCuenta[facultad] || 0) + 1;
      const motivo = item.motivo_consulta || 'Sin especificar';
      motivosCuenta[motivo] = (motivosCuenta[motivo] || 0) + 1;
    }

    if (tipo === 'tutores' && instructor) {
      tutoriasPorInstructor[instructor] = (tutoriasPorInstructor[instructor] || 0) + 1;
      if (!documentosPorInstructor[instructor]) {
        documentosPorInstructor[instructor] = new Set();
      }
      const doc = item.documento != null && item.documento !== ''
        ? String(item.documento).trim()
        : '';
      if (doc) documentosPorInstructor[instructor].add(doc);
    }

    if (tipo === 'profesores') {
      if (item.facultad_departamento) {
        stats.facultadDepartamento[item.facultad_departamento] =
          (stats.facultadDepartamento[item.facultad_departamento] || 0) + 1;
      }
      const facultad = item.facultad_departamento || 'Sin Facultad';
      if (instructor) {
        if (!profesoresPorFacultad[facultad]) {
          profesoresPorFacultad[facultad] = {};
        }
        if (!documentosPorFacultadProfesor[facultad]) {
          documentosPorFacultadProfesor[facultad] = {};
        }
        if (!documentosPorFacultadProfesor[facultad][instructor]) {
          documentosPorFacultadProfesor[facultad][instructor] = new Set();
        }
        profesoresPorFacultad[facultad][instructor] =
          (profesoresPorFacultad[facultad][instructor] || 0) + 1;
        const doc = item.documento != null && item.documento !== ''
          ? String(item.documento).trim()
          : '';
        if (doc) documentosPorFacultadProfesor[facultad][instructor].add(doc);
      }
    }
  });

  const promedioCalificacion = stats.total > 0
    ? (stats.sumaCalificacionesTotal / stats.total).toFixed(2)
    : '0.00';
  const promedioCalificacionPMA = stats.total > 0
    ? (stats.sumaCalificacionesPMA / stats.total).toFixed(2)
    : '0.00';

  const promediosPorInstructor = {};
  Object.keys(stats.calificacionesPorInstructor).forEach(instructor => {
    const info = stats.calificacionesPorInstructor[instructor];
    promediosPorInstructor[instructor] = info.cantidad > 0
      ? (info.suma / info.cantidad).toFixed(2)
      : '0.00';
  });

  let mejorInstructor = null;
  let peorInstructor = null;

  Object.keys(stats.calificacionesPorInstructor).forEach(instructor => {
    const info = stats.calificacionesPorInstructor[instructor];
    const promedio = parseFloat(promediosPorInstructor[instructor]);

    if (!mejorInstructor) {
      mejorInstructor = { nombre: instructor, promedio: promedio.toFixed(2), cantidad: info.cantidad };
    } else {
      const promedioMejor = parseFloat(mejorInstructor.promedio);
      if (promedio > promedioMejor || (promedio === promedioMejor && info.cantidad > mejorInstructor.cantidad)) {
        mejorInstructor = { nombre: instructor, promedio: promedio.toFixed(2), cantidad: info.cantidad };
      }
    }

    if (!peorInstructor) {
      peorInstructor = { nombre: instructor, promedio: promedio.toFixed(2), cantidad: info.cantidad };
    } else {
      const promedioPeor = parseFloat(peorInstructor.promedio);
      if (promedio < promedioPeor || (promedio === promedioPeor && info.cantidad > peorInstructor.cantidad)) {
        peorInstructor = { nombre: instructor, promedio: promedio.toFixed(2), cantidad: info.cantidad };
      }
    }
  });

  if (!mejorInstructor) {
    mejorInstructor = { nombre: 'N/A', promedio: '0.00', cantidad: 0 };
  }
  if (!peorInstructor) {
    peorInstructor = { nombre: 'N/A', promedio: '0.00', cantidad: 0 };
  }

  const tutoresNorteCat = Array.isArray(opciones.tutoresNorte) ? opciones.tutoresNorte : datosCache.tutoresNorte;
  const tutoresSurCat = Array.isArray(opciones.tutoresSur) ? opciones.tutoresSur : datosCache.tutoresSur;
  const nombresNorte = new Set(tutoresNorteCat.map(t => t && t.nombre).filter(Boolean));
  const nombresSur = new Set(tutoresSurCat.map(t => t && t.nombre).filter(Boolean));

  const tutoresPorSedeOrigen = { Norte: {}, Sur: {} };
  if (tipo === 'tutores' && (nombresNorte.size > 0 || nombresSur.size > 0)) {
    nombresNorte.forEach(nombre => {
      tutoresPorSedeOrigen.Norte[nombre] = tutoriasPorInstructor[nombre] || 0;
    });
    nombresSur.forEach(nombre => {
      tutoresPorSedeOrigen.Sur[nombre] = tutoriasPorInstructor[nombre] || 0;
    });
  }

  return {
    tipo,
    datosFiltrados,
    stats,
    promedioCalificacion,
    promedioCalificacionPMA,
    mejorInstructor,
    peorInstructor,
    promediosPorInstructor,
    estudiantesUnicos,
    cantidadBeneficiados: estudiantesUnicos.size,
    materiasCuenta,
    semestresCuenta,
    programasCuenta,
    facultadesCuenta,
    motivosCuenta,
    top5Materias: Object.entries(materiasCuenta).sort((a, b) => b[1] - a[1]).slice(0, 5),
    top5Semestres: Object.entries(semestresCuenta).sort((a, b) => b[1] - a[1]).slice(0, 5),
    top5Programas: Object.entries(programasCuenta).sort((a, b) => b[1] - a[1]).slice(0, 5),
    todasFacultades: Object.entries(facultadesCuenta).sort((a, b) => b[1] - a[1]),
    todosMotivos: Object.entries(motivosCuenta).sort((a, b) => b[1] - a[1]),
    sedesOrdenadas: Object.entries(stats.sedesTutorias).sort((a, b) => b[1] - a[1]),
    tutoriasPorInstructor,
    documentosPorInstructor,
    tutoresPorSedeOrigen,
    instructoresNorte: Object.entries(tutoresPorSedeOrigen.Norte).sort((a, b) => b[1] - a[1]),
    instructoresSur: Object.entries(tutoresPorSedeOrigen.Sur).sort((a, b) => b[1] - a[1]),
    facultadesOrdenadas: Object.entries(stats.facultadDepartamento).sort((a, b) => b[1] - a[1]),
    profesoresPorFacultad,
    documentosPorFacultadProfesor,
    facultadesConProfesores: Object.keys(profesoresPorFacultad).sort()
  };
}

function calcularRankingTutoresPMA(datosTutores, opciones = {}) {
  const op = opciones || {};
  const pesosDef = obtenerPesosRankingPMA();
  const pesoT = op.pesoT !== undefined ? Number(op.pesoT) : pesosDef.pesoT;
  const pesoB = op.pesoB !== undefined ? Number(op.pesoB) : pesosDef.pesoB;
  const pesoC = op.pesoC !== undefined ? Number(op.pesoC) : pesosDef.pesoC;

  const st = op.statsTutores || calcularEstadisticasPMA(datosTutores, 'tutores', op);

  const tutoresNorteCat = Array.isArray(op.tutoresNorte) ? op.tutoresNorte : datosCache.tutoresNorte;
  const tutoresSurCat = Array.isArray(op.tutoresSur) ? op.tutoresSur : datosCache.tutoresSur;
  const nombresNorte = new Set(tutoresNorteCat.map(t => t && t.nombre).filter(Boolean));
  const nombresSur = new Set(tutoresSurCat.map(t => t && t.nombre).filter(Boolean));

  const wT = pesoT / 100;
  const wB = pesoB / 100;
  const wC = pesoC / 100;

  function construirDatosGrupo(nombresSet) {
    return Array.from(nombresSet).map(nombre => ({
      nombre,
      tutorias: (st.tutoriasPorInstructor && st.tutoriasPorInstructor[nombre]) || 0,
      beneficiados: st.documentosPorInstructor && st.documentosPorInstructor[nombre]
        ? st.documentosPorInstructor[nombre].size
        : 0,
      calificacion: parseFloat((st.promediosPorInstructor && st.promediosPorInstructor[nombre]) || 0)
    }));
  }

  function calcularRankingPorGrupo(grupo) {
    if (!Array.isArray(grupo) || grupo.length === 0) return [];
    const maxT = Math.max(...grupo.map(d => d.tutorias));
    const maxB = Math.max(...grupo.map(d => d.beneficiados));
    const maxC = Math.max(...grupo.map(d => d.calificacion));

    return grupo.map(d => {
      const pT = maxT > 0 ? (d.tutorias / maxT) * 100 : 0;
      const pB = maxB > 0 ? (d.beneficiados / maxB) * 100 : 0;
      const pC = maxC > 0 ? (d.calificacion / maxC) * 100 : 0;
      const puntaje = (pT * wT) + (pB * wB) + (pC * wC);
      return { ...d, pT, pB, pC, puntaje };
    }).sort((a, b) => b.puntaje - a.puntaje);
  }

  const norte = calcularRankingPorGrupo(construirDatosGrupo(nombresNorte));
  const sur = calcularRankingPorGrupo(construirDatosGrupo(nombresSur));

  return {
    pesoT,
    pesoB,
    pesoC,
    wT,
    wB,
    wC,
    totalTutores: norte.length + sur.length,
    norte,
    sur
  };
}

function calcularSerieMensualTutoriasPMA(datos) {
  const lista = Array.isArray(datos) ? datos : [];
  const meses = new Map();
  const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  lista.forEach(item => {
    if (!item || !item.fecha) return;
    const fecha = convertirFechaAColombia(item.fecha);
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return;
    const mes = fecha.getMonth();
    const anio = fecha.getFullYear();
    const key = `${anio}-${String(mes + 1).padStart(2, '0')}`;
    if (!meses.has(key)) {
      meses.set(key, { label: `${nombresMeses[mes]} ${anio}`, cantidad: 0 });
    }
    meses.get(key).cantidad += 1;
  });

  const ordenadas = [...meses.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return {
    labels: ordenadas.map(([, v]) => v.label),
    valores: ordenadas.map(([, v]) => v.cantidad)
  };
}

function mostrarEstadisticas(tipo, botonClickeado) {
  inicializarEventosEstadisticasPMA();

  document.querySelectorAll('.estadisticas-menu-wrapper .btn-sede').forEach(btn => {
    btn.classList.remove('activo');
  });
  if (botonClickeado) {
    botonClickeado.classList.add('activo');
  } else {
    const btnGeneral = document.querySelector('.estadisticas-menu-wrapper .btn-sede');
    if (btnGeneral) btnGeneral.classList.add('activo');
  }

  const contEst = document.getElementById('contenidoEstadisticas');
  const contDet = document.getElementById('detallesStats');

  if (cacheEstadisticas[tipo]) {
    const cache = cacheEstadisticas[tipo];
    restaurarHijosDesdeFragmento(contEst, cache.gridFragment);
    restaurarHijosDesdeFragmento(contDet, cache.detallesFragment);
    return;
  }
  
  const data = window.datosFormulariosGlobal;
  if (!Array.isArray(data)) {
    if (contEst) {
      contEst.textContent = '';
      contEst.appendChild(crearParrafoEstadoPMA('No hay datos disponibles aún.', '#666'));
    }
    if (contDet) contDet.textContent = '';
    return;
  }

  const calculo = calcularEstadisticasPMA(data, tipo);
  const {
    datosFiltrados,
    stats,
    promedioCalificacion,
    promedioCalificacionPMA,
    mejorInstructor,
    peorInstructor,
    promediosPorInstructor
  } = calculo;

  if (datosFiltrados.length === 0) {
    if (contEst) {
      contEst.textContent = '';
      contEst.appendChild(crearParrafoEstadoPMA(`No hay datos de ${tipo} disponibles aún.`, '#666'));
    }
    if (contDet) contDet.textContent = '';
    return;
  }

  const grid = document.getElementById('contenidoEstadisticas');
  if (tipo === 'general') {
    grid.textContent = '';
    const statsGridEl = document.createElement('div');
    statsGridEl.className = 'stats-grid';
    statsGridEl.appendChild(crearStatCardPMA(stats.total, 'Total de Registros'));
    statsGridEl.appendChild(crearStatCardPMA(calculo.cantidadBeneficiados, 'Beneficiados'));
    statsGridEl.appendChild(crearStatCardPMA(promedioCalificacionPMA, 'Calificación PMA'));
    grid.appendChild(statsGridEl);

    generarListasEstadisticas(
      calculo.top5Materias,
      calculo.top5Semestres,
      calculo.top5Programas,
      calculo.todasFacultades,
      calculo.todosMotivos,
      stats.total
    );

    cacheEstadisticas['general'] = {
      ...calculo,
      gridFragment: clonarHijosAFragmento(grid),
      detallesFragment: clonarHijosAFragmento(document.getElementById('detallesStats'))
    };

    return;
  }

  const tituloTipo = tipo === 'tutores' ? 'Tutorías' : 'Tutorías con Profesores';

  grid.textContent = '';
  const statsGridTipoEl = document.createElement('div');
  statsGridTipoEl.className = 'stats-grid';
  statsGridTipoEl.appendChild(crearStatCardPMA(stats.total, `Total ${tituloTipo}`));
  statsGridTipoEl.appendChild(crearStatCardPMA(promedioCalificacion, 'Calificación Promedio'));
  statsGridTipoEl.appendChild(crearStatCardPMA(
    mejorInstructor.nombre,
    `Mejor Calificación (${mejorInstructor.promedio})`,
    `${mejorInstructor.cantidad} ${mejorInstructor.cantidad === 1 ? 'tutoría' : 'tutorías'}`
  ));
  statsGridTipoEl.appendChild(crearStatCardPMA(
    peorInstructor.nombre,
    `Menor Calificación (${peorInstructor.promedio})`,
    `${peorInstructor.cantidad} ${peorInstructor.cantidad === 1 ? 'tutoría' : 'tutorías'}`
  ));
  grid.appendChild(statsGridTipoEl);

  const detallesContainer = document.getElementById('detallesStats');
  detallesContainer.textContent = '';
  const detallesFragmento = document.createDocumentFragment();

  function crearTablaInstructoresDOM({ registros, etiquetaNombre, attrNombre, documentosMapa, mensajeVacio }) {
    if (registros.length === 0) {
      return crearParrafoEstadoPMA(mensajeVacio, '#666');
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'tabla-tutores-wrapper';

    const tabla = document.createElement('table');
    tabla.className = 'tabla-estadisticas-tutores';

    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    [etiquetaNombre, 'Tutorías', 'Beneficiados', 'Calificación'].forEach(col => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = col;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    tabla.appendChild(thead);

    const tbody = document.createElement('tbody');
    registros.forEach(([instructor, cantidad]) => {
      const promedioStr = promediosPorInstructor[instructor] != null ? String(promediosPorInstructor[instructor]) : 'N/A';
      const calSort = promedioStr === 'N/A' ? '-1' : String(parseFloat(promedioStr));
      const beneficiados = documentosMapa && documentosMapa[instructor]
        ? documentosMapa[instructor].size
        : 0;

      const tr = document.createElement('tr');
      tr.dataset[attrNombre] = instructor;
      tr.dataset.cantidad = String(cantidad);
      tr.dataset.calificacion = calSort;
      tr.dataset.beneficiados = String(beneficiados);

      const tdNombre = document.createElement('td');
      tdNombre.className = 'tabla-tutor-nombre';
      tdNombre.textContent = instructor;

      const tdCant = document.createElement('td');
      tdCant.className = 'tabla-tutor-num';
      tdCant.textContent = String(cantidad);

      const tdBen = document.createElement('td');
      tdBen.className = 'tabla-tutor-num';
      tdBen.textContent = String(beneficiados);

      const tdProm = document.createElement('td');
      tdProm.className = 'tabla-tutor-num';
      tdProm.textContent = promedioStr;

      tr.appendChild(tdNombre);
      tr.appendChild(tdCant);
      tr.appendChild(tdBen);
      tr.appendChild(tdProm);
      tbody.appendChild(tr);
    });

    tabla.appendChild(tbody);
    wrapper.appendChild(tabla);
    return wrapper;
  }

  function crearSelectAdmin(id, opciones, styleCss) {
    const select = document.createElement('select');
    select.id = id;
    select.className = 'admin-input';
    select.style.cssText = styleCss;
    opciones.forEach(optCfg => {
      const opt = document.createElement('option');
      opt.value = optCfg.value;
      opt.textContent = optCfg.label;
      select.appendChild(opt);
    });
    return select;
  }

  if (tipo === 'tutores') {
    const cardSedes = document.createElement('div');
    cardSedes.className = 'chart-container';
    const tituloSedes = document.createElement('h3');
    tituloSedes.className = 'chart-title';
    tituloSedes.textContent = 'Cantidad de Tutorías por Sede';
    cardSedes.appendChild(tituloSedes);

    Object.entries(stats.sedesTutorias).forEach(([sede, cantidad]) => {
      const porcentaje = calcularPorcentajePMA(cantidad, stats.total);
      cardSedes.appendChild(crearItemListaPMA(sede, `${cantidad} (${porcentaje}%)`));
    });
    detallesFragmento.appendChild(cardSedes);

    const documentosPorInstructor = calculo.documentosPorInstructor;
    const instructoresNorte = calculo.instructoresNorte;
    const instructoresSur = calculo.instructoresSur;

    const cardTutores = document.createElement('div');
    cardTutores.className = 'chart-container';

    const tituloTutores = document.createElement('h3');
    tituloTutores.className = 'chart-title';
    tituloTutores.textContent = 'Cantidad de Tutorías por Tutor';
    cardTutores.appendChild(tituloTutores);

    const filaFiltros = document.createElement('div');
    filaFiltros.style.cssText = 'margin-top: 24px; margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;';
    filaFiltros.appendChild(crearSelectAdmin(
      'filtroOrdenTutores',
      [
        { value: 'cantidad', label: 'Ordenar por Cantidad' },
        { value: 'calificacion', label: 'Ordenar por Calificación' },
        { value: 'beneficiados', label: 'Ordenar por Beneficiados' }
      ],
      'flex: 1; min-width: 200px; max-width: 500px; padding: 10px 14px; font-size: 12px;'
    ));
    filaFiltros.appendChild(crearSelectAdmin(
      'filtroAreaTutores',
      [
        { value: 'todas', label: 'Área: Todas' },
        { value: 'M', label: 'Matemáticas (M)' },
        { value: 'C', label: 'Comunicación (C)' }
      ],
      'flex: 1; min-width: 200px; max-width: 500px; padding: 10px 14px; font-size: 12px;'
    ));
    cardTutores.appendChild(filaFiltros);

    const botonesSedes = document.createElement('div');
    botonesSedes.className = 'botones-sedes';
    [
      { sede: 'norte', texto: 'Sede Norte' },
      { sede: 'sur', texto: 'Sede Sur' }
    ].forEach(cfg => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sede';
      btn.dataset.sedeToggle = cfg.sede;
      btn.textContent = cfg.texto;
      botonesSedes.appendChild(btn);
    });
    cardTutores.appendChild(botonesSedes);

    const secNorte = document.createElement('div');
    secNorte.id = 'instructoresNorteAdmin';
    secNorte.className = 'horario-info hidden';
    const titNorte = document.createElement('h4');
    titNorte.className = 'horario-titulo';
    titNorte.textContent = 'Tutores de Sede Norte';
    secNorte.appendChild(titNorte);
    secNorte.appendChild(crearTablaInstructoresDOM({
      registros: instructoresNorte,
      etiquetaNombre: 'Nombre del tutor',
      attrNombre: 'tutorNombre',
      documentosMapa: documentosPorInstructor,
      mensajeVacio: 'No hay tutores registrados en Sede Norte'
    }));
    cardTutores.appendChild(secNorte);

    const secSur = document.createElement('div');
    secSur.id = 'instructoresSurAdmin';
    secSur.className = 'horario-info hidden';
    const titSur = document.createElement('h4');
    titSur.className = 'horario-titulo';
    titSur.textContent = 'Tutores de Sede Sur';
    secSur.appendChild(titSur);
    secSur.appendChild(crearTablaInstructoresDOM({
      registros: instructoresSur,
      etiquetaNombre: 'Nombre del tutor',
      attrNombre: 'tutorNombre',
      documentosMapa: documentosPorInstructor,
      mensajeVacio: 'No hay tutores registrados en Sede Sur'
    }));
    cardTutores.appendChild(secSur);

    detallesFragmento.appendChild(cardTutores);

    // ── RANKING DE TUTORES ──────────────────────────────────────────
    const cardRanking = document.createElement('div');
    cardRanking.className = 'chart-container';
    cardRanking.id = 'contenedorRankingTutores';

    const titRanking = document.createElement('h3');
    titRanking.className = 'chart-title';
    titRanking.textContent = 'Ranking de Tutores';
    cardRanking.appendChild(titRanking);

    const descRanking = document.createElement('p');
    descRanking.style.cssText = 'font-size:13px; color:#666; margin-bottom:16px;';
    descRanking.textContent = 'Puntaje ponderado basado en tutorías realizadas, estudiantes beneficiados y calificación promedio.';
    cardRanking.appendChild(descRanking);

    const filaPesos = document.createElement('div');
    filaPesos.style.cssText = 'display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; align-items:flex-end;';

    [
      { id: 'pesoTutorias', label: 'Tutorías (%)', val: '35' },
      { id: 'pesoBeneficiados', label: 'Beneficiados (%)', val: '45' },
      { id: 'pesoCalificacion', label: 'Calificación (%)', val: '20' }
    ].forEach(campo => {
      const box = document.createElement('div');
      const lbl = document.createElement('label');
      lbl.style.cssText = 'font-size:12px; font-weight:600; color:#333; display:block; margin-bottom:4px;';
      lbl.textContent = campo.label;
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.id = campo.id;
      inp.value = campo.val;
      inp.min = '0';
      inp.max = '100';
      inp.className = 'admin-input';
      inp.style.cssText = 'width:90px; padding:8px 10px; font-size:13px;';
      box.appendChild(lbl);
      box.appendChild(inp);
      filaPesos.appendChild(box);
    });

    const boxAviso = document.createElement('div');
    const avisoSpan = document.createElement('span');
    avisoSpan.id = 'avisoSumaPesos';
    avisoSpan.style.cssText = 'font-size:12px; color:#dc3545; display:none;';
    avisoSpan.textContent = 'La suma debe ser 100%';
    boxAviso.appendChild(avisoSpan);
    filaPesos.appendChild(boxAviso);
    cardRanking.appendChild(filaPesos);

    const rowBtnRanking = document.createElement('div');
    rowBtnRanking.style.cssText = 'display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;';
    const btnCalc = document.createElement('button');
    btnCalc.className = 'btn';
    btnCalc.style.cssText = 'width:auto; margin:0; padding:10px 20px; font-size:13px;';
    btnCalc.dataset.accion = 'calcular-ranking';
    btnCalc.textContent = 'Calcular Ranking';
    rowBtnRanking.appendChild(btnCalc);
    cardRanking.appendChild(rowBtnRanking);

    const contResRanking = document.createElement('div');
    contResRanking.id = 'resultadoRankingTutores';
    cardRanking.appendChild(contResRanking);

    detallesFragmento.appendChild(cardRanking);
  }

  if (tipo === 'profesores') {
    const cardFac = document.createElement('div');
    cardFac.className = 'chart-container';
    const titFac = document.createElement('h3');
    titFac.className = 'chart-title';
    titFac.textContent = 'Cantidad de Tutorías por Facultad/Departamento';
    cardFac.appendChild(titFac);

    const facultadesOrdenadas = calculo.facultadesOrdenadas;

    if (facultadesOrdenadas.length > 0) {
      facultadesOrdenadas.forEach(([facultad, cantidad]) => {
        const nombreCompleto = obtenerNombreFacultad(facultad);
        const porcentaje = calcularPorcentajePMA(cantidad, stats.total);
        cardFac.appendChild(crearItemListaPMA(nombreCompleto, `${cantidad} (${porcentaje}%)`));
      });
    } else {
      cardFac.appendChild(crearParrafoEstadoPMA('No hay datos por facultad', '#666'));
    }
    detallesFragmento.appendChild(cardFac);

    const cardProf = document.createElement('div');
    cardProf.className = 'chart-container';
    const titProf = document.createElement('h3');
    titProf.className = 'chart-title';
    titProf.textContent = 'Cantidad de Tutorías por Profesor';
    cardProf.appendChild(titProf);

    const filtroBox = document.createElement('div');
    filtroBox.style.cssText = 'margin-top: 24px; margin-bottom: 24px;';
    filtroBox.appendChild(crearSelectAdmin(
      'filtroOrdenProfesores',
      [
        { value: 'cantidad', label: 'Ordenar por cantidad (mayor a menor)' },
        { value: 'calificacion', label: 'Ordenar por calificación (mayor a menor)' },
        { value: 'beneficiados', label: 'Ordenar por beneficiados (mayor a menor)' }
      ],
      'flex: 1; min-width: 200px; max-width: 500px; padding: 10px 14px; font-size: 12px;'
    ));
    cardProf.appendChild(filtroBox);

    const profesoresPorFacultad = calculo.profesoresPorFacultad;
    const documentosPorFacultadProfesor = calculo.documentosPorFacultadProfesor;
    const facultadesConProfesores = calculo.facultadesConProfesores;
    if (facultadesConProfesores.length > 0) {
      const idsUsados = new Set();
      const botonesFac = document.createElement('div');
      botonesFac.className = 'botones-sedes';

      const entradasFacultad = facultadesConProfesores.map((facultad, idx) => {
        let baseId = facultad.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || ('fac' + idx);
        let facultadId = baseId;
        if (idsUsados.has(facultadId)) {
          facultadId = `${baseId}_${idx}`;
        }
        idsUsados.add(facultadId);
        return { facultad, facultadId };
      });

      entradasFacultad.forEach(({ facultad, facultadId }) => {
        const nombreCompleto = obtenerNombreFacultad(facultad);
        const facultadCorta = nombreCompleto.replace('Facultad de ', '').replace('Departamento de ', '');
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sede';
        btn.dataset.facultadId = facultadId;
        btn.textContent = facultadCorta;
        botonesFac.appendChild(btn);
      });
      cardProf.appendChild(botonesFac);

      entradasFacultad.forEach(({ facultad, facultadId }) => {
        const profesores = profesoresPorFacultad[facultad];
        const profesoresOrdenados = Object.entries(profesores).sort((a, b) => b[1] - a[1]);
        const nombreCompletoTitulo = obtenerNombreFacultad(facultad);

        const secFac = document.createElement('div');
        secFac.id = 'profesores' + facultadId;
        secFac.className = 'horario-info hidden';

        const h4 = document.createElement('h4');
        h4.className = 'horario-titulo';
        h4.textContent = nombreCompletoTitulo;
        secFac.appendChild(h4);

        secFac.appendChild(crearTablaInstructoresDOM({
          registros: profesoresOrdenados,
          etiquetaNombre: 'Nombre del profesor',
          attrNombre: 'profesorNombre',
          documentosMapa: documentosPorFacultadProfesor[facultad],
          mensajeVacio: 'No hay profesores en esta facultad'
        }));

        cardProf.appendChild(secFac);
      });
    } else {
      cardProf.appendChild(crearParrafoEstadoPMA('No hay datos de profesores disponibles', '#666'));
    }

    detallesFragmento.appendChild(cardProf);
  }

  detallesContainer.appendChild(detallesFragmento);
  cacheEstadisticas[tipo] = {
    ...calculo,
    gridFragment: clonarHijosAFragmento(grid),
    detallesFragment: clonarHijosAFragmento(detallesContainer)
  };
}

function reordenarTutores() {
  const criterio = document.getElementById('filtroOrdenTutores')?.value;
  if (!criterio) return;

  ['instructoresNorteAdmin', 'instructoresSurAdmin'].forEach(seccionId => {
    const seccion = document.getElementById(seccionId);
    if (!seccion) return;

    const tbody = seccion.querySelector('.tabla-estadisticas-tutores tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) return;

    rows.sort((a, b) => {
      if (criterio === 'beneficiados') {
        return parseInt(b.dataset.beneficiados || '0', 10) - parseInt(a.dataset.beneficiados || '0', 10);
      }
      if (criterio === 'calificacion') {
        return parseFloat(b.dataset.calificacion || '0') - parseFloat(a.dataset.calificacion || '0');
      }
      return parseInt(b.dataset.cantidad || '0', 10) - parseInt(a.dataset.cantidad || '0', 10);
    });

    rows.forEach(row => tbody.appendChild(row));
  });
}


function reordenarTodosProfesores() {
  const criterio = document.getElementById('filtroOrdenProfesores')?.value;
  if (!criterio) return;

  const secciones = document.querySelectorAll('[id^="profesores"]');
  secciones.forEach(seccion => {
    const tbody = seccion.querySelector('.tabla-estadisticas-tutores tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) return;

    rows.sort((a, b) => {
      if (criterio === 'beneficiados') {
        return parseInt(b.dataset.beneficiados || '0', 10) - parseInt(a.dataset.beneficiados || '0', 10);
      }
      if (criterio === 'calificacion') {
        return parseFloat(b.dataset.calificacion || '0') - parseFloat(a.dataset.calificacion || '0');
      }
      return parseInt(b.dataset.cantidad || '0', 10) - parseInt(a.dataset.cantidad || '0', 10);
    });

    rows.forEach(row => tbody.appendChild(row));
  });
}


function filtrarTutoresPorArea() {
  const area = document.getElementById('filtroAreaTutores')?.value;
  if (area == null) return;

  ['instructoresNorteAdmin', 'instructoresSurAdmin'].forEach(seccionId => {
    const seccion = document.getElementById(seccionId);
    if (!seccion) return;

    const rows = seccion.querySelectorAll('.tabla-estadisticas-tutores tbody tr');
    if (!rows.length) return;

    const cache = seccionId === 'instructoresNorteAdmin'
      ? datosCache.tutoresNorte
      : datosCache.tutoresSur;

    rows.forEach(tr => {
      const nombreTutor = tr.dataset.tutorNombre?.trim();
      if (!nombreTutor) return;

      if (area === 'todas') {
        tr.style.display = '';
      } else {
        const tutorData = cache.find(t => (t.nombre || '').trim() === nombreTutor);
        const areaTutor = tutorData?.area?.trim().toUpperCase();
        tr.style.display = areaTutor === area ? '' : 'none';
      }
    });
  });
}


function toggleInstructoresSede(sede) {
  const norte = document.getElementById('instructoresNorteAdmin');
  const sur = document.getElementById('instructoresSurAdmin');

  if (sede === 'norte') {
    const yaAbierto = !norte.classList.contains('hidden');
    norte.classList.add('hidden');
    sur.classList.add('hidden');
    if (!yaAbierto) {
      norte.classList.remove('hidden');
    }
  } else if (sede === 'sur') {
    const yaAbierto = !sur.classList.contains('hidden');
    norte.classList.add('hidden');
    sur.classList.add('hidden');
    if (!yaAbierto) {
      sur.classList.remove('hidden');
    }
  }
}


function toggleProfesoresFacultad(facultadId) {
  const todasLasSecciones = document.querySelectorAll('[id^="profesores"]');
  todasLasSecciones.forEach(seccion => {
    if (seccion.id.startsWith('profesores')) {
      seccion.classList.add('hidden');
    }
  });
  const seccionActual = document.getElementById('profesores' + facultadId);
  if (seccionActual) {
    seccionActual.classList.toggle('hidden');
  }
}


function obtenerNombreFacultad(codigo) {
  const nombres = {
    'DCB': 'Departamento de Ciencias Básicas',
    'FCE': 'Facultad de Ciencias Empresariales',
    'FCSH': 'Facultad de Ciencias Sociales y Humanas',
    'FEDV': 'Facultad de Educación a Distancia y Virtual',
    'FI': 'Facultad de Ingeniería'
  };
  return nombres[codigo] || codigo;
}


function generarListasEstadisticas(top5Materias, top5Semestres, top5Programas, todasFacultades, todosMotivos, total) {
  const detallesContenedor = document.getElementById('detallesStats');
  if (!detallesContenedor) return;

  const fragmento = document.createDocumentFragment();

  function agregarSeccionLista(titulo, filas, textoVacio, formatearEtiqueta) {
    const card = document.createElement('div');
    card.className = 'chart-container';

    const h3 = document.createElement('h3');
    h3.className = 'chart-title';
    h3.textContent = titulo;
    card.appendChild(h3);

    if (filas.length > 0) {
      filas.forEach(([clave, cantidad]) => {
        const porcentaje = calcularPorcentajePMA(cantidad, total);
        const etiqueta = formatearEtiqueta ? formatearEtiqueta(clave) : clave;
        card.appendChild(crearItemListaPMA(etiqueta, `${cantidad} (${porcentaje}%)`));
      });
    } else if (textoVacio) {
      card.appendChild(crearParrafoEstadoPMA(textoVacio, '#666'));
    }

    fragmento.appendChild(card);
  }

  agregarSeccionLista('Top 5 Materias con Más Tutorías', top5Materias, 'No hay datos disponibles');
  agregarSeccionLista(
    'Top 5 Semestres con Más Tutorías',
    top5Semestres,
    'No hay datos disponibles',
    semestre => (semestre === 'Sin especificar' ? semestre : `Semestre ${semestre}`)
  );

  if (todasFacultades.length > 0) {
    agregarSeccionLista('Facultades con Más Tutorías', todasFacultades, '');
  }

  agregarSeccionLista('Top 5 Programas con Más Tutorías', top5Programas, 'No hay datos disponibles');

  if (todosMotivos && todosMotivos.length > 0) {
    agregarSeccionLista('Motivos de Consulta', todosMotivos, '');
  }

  detallesContenedor.textContent = '';
  detallesContenedor.appendChild(fragmento);
}


function calcularRankingTutores() {
  const { pesoT, pesoB, pesoC, sumaValida } = obtenerPesosRankingPMA({ usarInputsSiempre: true });
  const aviso = document.getElementById('avisoSumaPesos');
  const contenedor = document.getElementById('resultadoRankingTutores');

  if (!sumaValida) {
    if (aviso) aviso.style.display = 'inline';
    if (contenedor) contenedor.textContent = '';
    return;
  }
  if (aviso) aviso.style.display = 'none';

  const cache = cacheEstadisticas['tutores'];
  if (!cache) {
    if (contenedor) {
      contenedor.textContent = '';
      contenedor.appendChild(crearParrafoEstadoPMA('Primero carga las estadísticas de Tutores.', '#dc3545'));
    }
    return;
  }

  const ranking = calcularRankingTutoresPMA(cache.datosFiltrados, {
    statsTutores: cache,
    pesoT,
    pesoB,
    pesoC
  });

  if (ranking.totalTutores === 0) {
    if (contenedor) {
      contenedor.textContent = '';
      contenedor.appendChild(crearParrafoEstadoPMA('No hay datos de tutores disponibles.', '#666'));
    }
    return;
  }

  const rankingNorte = ranking.norte;
  const rankingSur = ranking.sur;

  function generarTablaRankingDOM(lista, titulo, sedeKey) {
    if (lista.length === 0) return null;

    const contenedorSede = document.createElement('div');
    contenedorSede.id = `rankingSede${sedeKey}`;
    contenedorSede.className = 'horario-info hidden';
    contenedorSede.style.marginTop = '12px';

    const h4 = document.createElement('h4');
    h4.className = 'horario-titulo';
    h4.textContent = titulo;
    contenedorSede.appendChild(h4);

    const wrapper = document.createElement('div');
    wrapper.className = 'tabla-tutores-wrapper';

    const tabla = document.createElement('table');
    tabla.className = 'tabla-estadisticas-tutores';

    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    ['#', 'Tutor', 'Puntaje'].forEach(col => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = col;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    tabla.appendChild(thead);

    const tbody = document.createElement('tbody');
    lista.forEach((d, i) => {
      const tr = document.createElement('tr');

      const tdPos = document.createElement('td');
      tdPos.className = 'tabla-tutor-num';
      tdPos.textContent = String(i + 1);

      const tdNombre = document.createElement('td');
      tdNombre.className = 'tabla-tutor-nombre';
      tdNombre.textContent = d.nombre;

      const tdPuntaje = document.createElement('td');
      tdPuntaje.className = 'tabla-tutor-num';
      tdPuntaje.style.fontWeight = '700';
      tdPuntaje.style.color = '#1e3c72';
      tdPuntaje.textContent = `${d.puntaje.toFixed(2)}%`;

      tr.appendChild(tdPos);
      tr.appendChild(tdNombre);
      tr.appendChild(tdPuntaje);
      tbody.appendChild(tr);
    });

    tabla.appendChild(tbody);
    wrapper.appendChild(tabla);
    contenedorSede.appendChild(wrapper);
    return contenedorSede;
  }

  contenedor.textContent = '';
  const botonesDiv = document.createElement('div');
  botonesDiv.className = 'botones-sedes';

  [
    { key: 'Norte', texto: 'Sede Norte' },
    { key: 'Sur', texto: 'Sede Sur' }
  ].forEach(cfg => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-sede';
    btn.dataset.rankingSede = cfg.key;
    btn.textContent = cfg.texto;
    botonesDiv.appendChild(btn);
  });
  contenedor.appendChild(botonesDiv);

  const tablaNorte = generarTablaRankingDOM(rankingNorte, 'Tutores de Sede Norte', 'Norte');
  if (tablaNorte) contenedor.appendChild(tablaNorte);

  const tablaSur = generarTablaRankingDOM(rankingSur, 'Tutores de Sede Sur', 'Sur');
  if (tablaSur) contenedor.appendChild(tablaSur);
}

function toggleRankingSede(sedeKey) {
  const norte = document.getElementById('rankingSedeNorte');
  const sur = document.getElementById('rankingSedeSur');

  const objetivo = document.getElementById('rankingSede' + sedeKey);
  const yaAbierto = objetivo && !objetivo.classList.contains('hidden');

  [norte, sur].forEach(el => { if (el) el.classList.add('hidden'); });

  if (!yaAbierto && objetivo) objetivo.classList.remove('hidden');
}

// ── SINCRONIZACIÓN DE CACHÉ LOCAL DE PMA ANTE MUTACIONES ───────────────────
if (typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.alInvalidar === 'function') {
  ConsultasAdmin.alInvalidar(function (etiquetas) {
    if (!Array.isArray(etiquetas) || etiquetas.length === 0) return;
    const set = new Set(etiquetas);
    const todo = set.has('*');

    if (
      todo ||
      set.has('tabla:formularios') ||
      set.has('tabla:public.formularios') ||
      set.has('tabla:estudiantes') ||
      set.has('tabla:public.estudiantes') ||
      set.has('tabla:programas') ||
      set.has('tabla:facultades') ||
      set.has('grupo:catalogos')
    ) {
      window.datosFormulariosGlobal = null;
      invalidarCacheEstadisticas();
      if (typeof invalidarCargaFormulariosPMA === 'function') {
        invalidarCargaFormulariosPMA();
      } else if (graficoTutorias) {
        try { graficoTutorias.destroy(); } catch (e) {}
        graficoTutorias = null;
      }
    }

    if (todo || set.has('grupo:catalogos') || set.has('tabla:tutores_norte') || set.has('tabla:tutores_sur') || set.has('tabla:profesores')) {
      datosCache.tutoresNorte = [];
      datosCache.tutoresSur = [];
      datosCache.profesores = [];
      invalidarCacheEstadisticas();
    }
  });
}
