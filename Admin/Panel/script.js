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

function cambiarTabPrincipal(event, seccion) {
  document.querySelectorAll('.admin-tabs-principal .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('contenidoPMA').classList.add('hidden');
  document.getElementById('contenidoPVU').classList.add('hidden');
  document.getElementById('contenidoAAA').classList.add('hidden');
  document.getElementById('contenidoDiagnosticos').classList.add('hidden');
  
  if (seccion === 'pma') {
    document.getElementById('contenidoPMA').classList.remove('hidden');
    const primerTabPMA = document.querySelector('.admin-tabs-secundario .admin-tab');
    if (primerTabPMA) {
      document.querySelectorAll('.admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabPMA.classList.add('active');
      document.getElementById('tabEstadisticas').classList.add('hidden');
      document.getElementById('tabGraficas').classList.add('hidden');
      document.getElementById('tabVisitas').classList.add('hidden');
      document.getElementById('tabSupabase')?.classList.add('hidden');
      document.getElementById('tabDescargas').classList.remove('hidden');
    }

  } else if (seccion === 'pvu') {
    document.getElementById('contenidoPVU').classList.remove('hidden');
    const primerTabPVU = document.querySelector('#contenidoPVU .admin-tabs-secundario .admin-tab');
    if (primerTabPVU) {
      document.querySelectorAll('#contenidoPVU .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabPVU.classList.add('active');
      document.getElementById('tabEstadisticasPVU').classList.add('hidden');
      document.getElementById('tabDescargasPVU').classList.remove('hidden');
    }
  } else if (seccion === 'aaa') {
    document.getElementById('contenidoAAA').classList.remove('hidden');
    const primerTabAAA = document.querySelector('#contenidoAAA .admin-tabs-secundario .admin-tab');
    if (primerTabAAA) {
      document.querySelectorAll('#contenidoAAA .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabAAA.classList.add('active');
      document.getElementById('tabRemisionesAAA').classList.add('hidden');
      document.getElementById('tabDescargasAAA').classList.remove('hidden');
    }
  } else if (seccion === 'diagnosticos') {
    document.getElementById('contenidoDiagnosticos').classList.remove('hidden');
    const primerTabDiagnosticos = document.querySelector('#contenidoDiagnosticos .admin-tabs-secundario .admin-tab');
    if (primerTabDiagnosticos) {
      document.querySelectorAll('#contenidoDiagnosticos .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabDiagnosticos.classList.add('active');
      document.getElementById('tabEstadisticasDiagnosticos').classList.add('hidden');
      document.getElementById('tabGruposDiagnosticos')?.classList.add('hidden');
      document.getElementById('tabDescargasDiagnosticos').classList.remove('hidden');
    }
  }
}

async function cargarEstadisticasDiagnosticos(opciones) {
  const grid = document.getElementById('statsGridDiagnosticos');
  if (grid) {
    mostrarCargando(grid);
  }

  try {
    const datos = await ConsultasAdmin.obtenerConteosDiagnosticos({
      forzar: Boolean(opciones && opciones.forzar)
    });
    window.datosDiagnosticosGlobal = datos;
    mostrarEstadisticasDiagnosticos(datos);

  } catch (error) {
    console.error('Error cargando estadísticas de diagnósticos:', error);
    if (grid) {
      grid.innerHTML = '<p style="text-align: center; color: #dc3545;">Error al cargar estadísticas. Por favor intenta de nuevo.</p>';
    }
  }
}

function mostrarEstadisticasDiagnosticos(datos) {
  const grid = document.getElementById('statsGridDiagnosticos');
  if (!grid) return;

  grid.innerHTML = `
    <div class="stat-card">
      <h3>${datos.matematicas}</h3>
      <p>Matemáticas</p>
    </div>
    <div class="stat-card">
      <h3>${datos.comunicacion}</h3>
      <p>Comunicación</p>
    </div>
    <div class="stat-card">
      <h3>${datos.lectura}</h3>
      <p>Lectura</p>
    </div>
  `;
}


async function cambiarTab(event, tab) {
  document.querySelectorAll('.admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('tabEstadisticas').classList.add('hidden');
  document.getElementById('tabGraficas').classList.add('hidden');
  document.getElementById('tabDescargas').classList.add('hidden');
  document.getElementById('tabVisitas').classList.add('hidden');
  document.getElementById('tabSupabase')?.classList.add('hidden');
  
  if (tab === 'descargas') {
    document.getElementById('tabDescargas').classList.remove('hidden');

} else if (tab === 'visitas') {
    document.getElementById('tabVisitas').classList.remove('hidden');

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
    
    if (!window.datosFormulariosGlobal) {
      const container = document.querySelector('#tabGraficas .chart-container');
      const contenidoOriginal = container.innerHTML;
      mostrarCargando(container);
      
      try {
        const data = await ConsultasAdmin.obtenerFormularios();
        window.datosFormulariosGlobal = data;
        container.innerHTML = contenidoOriginal;
      } catch (error) {
        container.innerHTML = '<p style="text-align: center; color: #dc3545;">Error al cargar datos. Por favor intenta de nuevo.</p>';
        return;
      }
    }
    
    if (!graficoTutorias) {
      actualizarGrafica();
    }
  }    
}

async function actualizarEstadisticas() {
  const btnActualizar = document.getElementById('btnActualizar');
  const iconActualizar = document.getElementById('iconActualizar');
  btnActualizar.disabled = true;
  btnActualizar.style.opacity = '0.6';
  iconActualizar.style.animation = 'spin 1s linear infinite';
  try {
    const contenidoPMA = document.getElementById('contenidoPMA');
    const contenidoPVU = document.getElementById('contenidoPVU');
    const contenidoAAA = document.getElementById('contenidoAAA');
    const contenidoDiagnosticos = document.getElementById('contenidoDiagnosticos');
    
    if (!contenidoPMA.classList.contains('hidden')) {
      ConsultasAdmin.invalidar(['tabla:formularios', 'grupo:catalogos']);
      datosCache.tutoresNorte = [];
      datosCache.tutoresSur = [];
      datosCache.profesores = [];
      window.datosFormulariosGlobal = null;
      invalidarCacheEstadisticas();
      await precargarDatosEstadisticas({ forzar: true });
      await cargarEstadisticas({ forzar: true });
      const tabGraficas = document.getElementById('tabGraficas');
      if (tabGraficas && !tabGraficas.classList.contains('hidden')) {
        actualizarGrafica();
      }
    } else if (!contenidoPVU.classList.contains('hidden')) {
      ConsultasAdmin.invalidar(['tabla:pvu']);
      window.datosPVUGlobal = null;
      await cargarEstadisticasPVU({ forzar: true });
    } else if (!contenidoAAA.classList.contains('hidden')) {
      ConsultasAdmin.invalidar(['tabla:acompanamiento']);
      remisionesAAACache = [];
      await cargarRemisionesAAA({ forzar: true });
    } else if (!contenidoDiagnosticos.classList.contains('hidden')) {
      ConsultasAdmin.invalidar(['esquema:diagnosticos', 'tabla:grupos', 'tabla:diagnosticos.grupos']);
      window.datosDiagnosticosGlobal = null;
      await cargarEstadisticasDiagnosticos({ forzar: true });
    }


    iconActualizar.style.animation = 'none';
    iconActualizar.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    iconActualizar.style.color = '#28a745';
    
    setTimeout(() => {
      iconActualizar.innerHTML = '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>';
      iconActualizar.style.color = 'currentColor';
    }, 1500);
    
  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    iconActualizar.style.animation = 'none';
    iconActualizar.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
    iconActualizar.style.color = '#dc3545';
    
    setTimeout(() => {
      iconActualizar.innerHTML = '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>';
      iconActualizar.style.color = 'currentColor';
    }, 1500);
  } finally {
    btnActualizar.disabled = false;
    btnActualizar.style.opacity = '1';
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

    if (data.length === 0) {
      if (elementosDOM.statsGrid) {
        elementosDOM.statsGrid.textContent = '';
        const p = document.createElement('p');
        p.style.textAlign = 'center';
        p.style.color = '#666';
        p.textContent = 'No hay datos disponibles aún.';
        elementosDOM.statsGrid.appendChild(p);
      }
      ponerMarcaUltimaActualizacionEstadisticas();
      return;
    }

    const contenidoHTML = `
      <div class="estadisticas-menu-wrapper">
        <button class="btn btn-sede activo" onclick="mostrarEstadisticas('general', this)">
          General
        </button>
        <button class="btn btn-sede" onclick="mostrarEstadisticas('tutores', this)">
          Tutores
        </button>
        <button class="btn btn-sede" onclick="mostrarEstadisticas('profesores', this)">
          Profesores
        </button>
      </div>
      <div id="contenidoEstadisticas"></div>
    `;

    if (elementosDOM.statsGrid) {
      elementosDOM.statsGrid.innerHTML = contenidoHTML;
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
      const p = document.createElement('p');
      p.style.textAlign = 'center';
      p.style.color = '#dc3545';
      p.textContent = 'Error al cargar estadísticas. Por favor intenta de nuevo.';
      elementosDOM.statsGrid.appendChild(p);
    }
  }
}

// escapeHtmlAdmin() — función global definida en ../../Global/global.js

function mostrarEstadisticas(tipo, botonClickeado) {
  document.querySelectorAll('.estadisticas-menu-wrapper .btn-sede').forEach(btn => {
    btn.classList.remove('activo');
  });
  if (botonClickeado) {
    botonClickeado.classList.add('activo');
  } else {
    const btnGeneral = document.querySelector('.estadisticas-menu-wrapper .btn-sede');
    if (btnGeneral) btnGeneral.classList.add('activo');
  }
  if (cacheEstadisticas[tipo]) {
    const cache = cacheEstadisticas[tipo];
    document.getElementById('contenidoEstadisticas').innerHTML = cache.grid;
    document.getElementById('detallesStats').innerHTML = cache.detalles;
    return;
  }
  
  const data = window.datosFormulariosGlobal;
  
  let datosFiltrados;
  
  if (tipo === 'tutores') {
    datosFiltrados = data.filter(item => item.tipo_instructor === 'Tutor');
  } else if (tipo === 'profesores') {
    datosFiltrados = data.filter(item => item.tipo_instructor === 'Profesor');
  } else {
    datosFiltrados = data;
  }

  if (datosFiltrados.length === 0) {
    document.getElementById('contenidoEstadisticas').innerHTML = `<p style="text-align: center; color: #666;">No hay datos de ${tipo} disponibles aún.</p>`;
    document.getElementById('detallesStats').innerHTML = '';
    return;
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

  let estudiantesUnicos;
  let materiasCuenta;
  let semestresCuenta;
  let programasCuenta;
  let facultadesCuenta;
  let motivosCuenta;
  let tutoriasPorInstructor;
  let documentosPorInstructor;
  if (tipo === 'general') {
    estudiantesUnicos = new Set();
    materiasCuenta = {};
    semestresCuenta = {};
    programasCuenta = {};
    facultadesCuenta = {};
    motivosCuenta = {};
  }
  if (tipo === 'tutores') {
    tutoriasPorInstructor = {};
    documentosPorInstructor = {};
  }

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
    if (tipo === 'profesores' && item.facultad_departamento) {
      stats.facultadDepartamento[item.facultad_departamento] = (stats.facultadDepartamento[item.facultad_departamento] || 0) + 1;
    }

    if (tipo === 'general') {
      estudiantesUnicos.add(item.documento);
      const materia = item.asignatura || 'Sin especificar';
      materiasCuenta[materia] = (materiasCuenta[materia] || 0) + 1;
      const semestre = item.semestre || 'Sin especificar';
      semestresCuenta[semestre] = (semestresCuenta[semestre] || 0) + 1;
      const programa = item.programa || 'Sin especificar';
      programasCuenta[programa] = (programasCuenta[programa] || 0) + 1;
      const facultad = item.facultad || 'Sin especificar';
      facultadesCuenta[facultad] = (facultadesCuenta[facultad] || 0) + 1;
      const motivo = item.motivo_consulta || 'Sin especificar';
      motivosCuenta[motivo] = (motivosCuenta[motivo] || 0) + 1;
    }

    if (tipo === 'tutores') {
      if (instructor) {
        tutoriasPorInstructor[instructor] = (tutoriasPorInstructor[instructor] || 0) + 1;
        if (!documentosPorInstructor[instructor]) {
          documentosPorInstructor[instructor] = new Set();
        }
        const doc = item.documento != null && item.documento !== ''
          ? String(item.documento).trim()
          : '';
        if (doc) documentosPorInstructor[instructor].add(doc);
      }
    }
  });

  const promedioCalificacion = (stats.sumaCalificacionesTotal / stats.total).toFixed(2);
  const promedioCalificacionPMA = (stats.sumaCalificacionesPMA / stats.total).toFixed(2);

  const promediosPorInstructor = {};
  Object.keys(stats.calificacionesPorInstructor).forEach(instructor => {
    const info = stats.calificacionesPorInstructor[instructor];
    promediosPorInstructor[instructor] = (info.suma / info.cantidad).toFixed(2);
  });

  let mejorInstructor = null;
  Object.keys(stats.calificacionesPorInstructor).forEach(instructor => {
    const info = stats.calificacionesPorInstructor[instructor];
    const promedio = parseFloat((info.suma / info.cantidad).toFixed(2));
    if (!mejorInstructor) {
      mejorInstructor = { 
        nombre: instructor, 
        promedio: promedio.toFixed(2),
        cantidad: info.cantidad
      };
    } else {
      const promedioMejor = parseFloat(mejorInstructor.promedio);
      if (promedio > promedioMejor) {
        mejorInstructor = { 
          nombre: instructor, 
          promedio: promedio.toFixed(2),
          cantidad: info.cantidad
        };
      } else if (promedio === promedioMejor && info.cantidad > mejorInstructor.cantidad) {
        mejorInstructor = { 
          nombre: instructor, 
          promedio: promedio.toFixed(2),
          cantidad: info.cantidad
        };
      }
    }
  });

  let peorInstructor = null;
  Object.keys(stats.calificacionesPorInstructor).forEach(instructor => {
    const info = stats.calificacionesPorInstructor[instructor];
    const promedio = parseFloat((info.suma / info.cantidad).toFixed(2));
    if (!peorInstructor) {
      peorInstructor = { 
        nombre: instructor, 
        promedio: promedio.toFixed(2),
        cantidad: info.cantidad
      };
    } else {
      const promedioPeor = parseFloat(peorInstructor.promedio);
      if (promedio < promedioPeor) {
        peorInstructor = { 
          nombre: instructor, 
          promedio: promedio.toFixed(2),
          cantidad: info.cantidad
        };
      } else if (promedio === promedioPeor && info.cantidad > peorInstructor.cantidad) {
        peorInstructor = { 
          nombre: instructor, 
          promedio: promedio.toFixed(2),
          cantidad: info.cantidad
        };
      }
    }
  });
  if (!mejorInstructor) {
    mejorInstructor = { nombre: 'N/A', promedio: '0.00', cantidad: 0 };
  }
  if (!peorInstructor) {
    peorInstructor = { nombre: 'N/A', promedio: '0.00', cantidad: 0 };
  }

  const grid = document.getElementById('contenidoEstadisticas');
if (tipo === 'general') {
  const cantidadBeneficiados = estudiantesUnicos.size;
  
  grid.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>${stats.total}</h3>
        <p>Total de Registros</p>
      </div>
      <div class="stat-card">
        <h3>${cantidadBeneficiados}</h3>
        <p>Beneficiados</p>
      </div>
      <div class="stat-card">
        <h3>${promedioCalificacionPMA}</h3>
        <p>Calificación PMA</p>
      </div>
      
    </div>
  `;
  const top5Materias = Object.entries(materiasCuenta)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const top5Semestres = Object.entries(semestresCuenta)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const top5Programas = Object.entries(programasCuenta)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const todasFacultades = Object.entries(facultadesCuenta)
    .sort((a, b) => b[1] - a[1]);
  const todosMotivos = Object.entries(motivosCuenta)
    .sort((a, b) => b[1] - a[1]);
generarListasEstadisticas(top5Materias, top5Semestres, top5Programas, todasFacultades, todosMotivos, stats.total);

  cacheEstadisticas['general'] = {
    grid: document.getElementById('contenidoEstadisticas').innerHTML,
    detalles: document.getElementById('detallesStats').innerHTML
  };

  return;
}

  const tituloTipo = tipo === 'tutores' ? 'Tutorías' : 'Tutorías con Profesores';



  grid.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>${stats.total}</h3>
        <p>Total ${tituloTipo}</p>
      </div>
      <div class="stat-card">
        <h3>${promedioCalificacion}</h3>
        <p>Calificación Promedio</p>
      </div>
      <div class="stat-card">
        <h3>${mejorInstructor.nombre}</h3>
        <p>Mejor Calificación (${mejorInstructor.promedio})<br><small>${mejorInstructor.cantidad} ${mejorInstructor.cantidad === 1 ? 'tutoría' : 'tutorías'}</small></p>
      </div>
      <div class="stat-card">
        <h3>${peorInstructor.nombre}</h3>
        <p>Menor Calificación (${peorInstructor.promedio})<br><small>${peorInstructor.cantidad} ${peorInstructor.cantidad === 1 ? 'tutoría' : 'tutorías'}</small></p>
      </div>
    </div>
  `;

  let detalles = '';
  if (tipo === 'tutores') {
    detalles += '<div class="chart-container"><h3 class="chart-title">Cantidad de Tutorías por Sede</h3>';
    Object.entries(stats.sedesTutorias).forEach(([sede, cantidad]) => {
      const porcentaje = ((cantidad / stats.total) * 100).toFixed(1);
      detalles += `<div class="list-item"><span>${sede}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
    detalles += '</div>';
    const tutoresPorSedeOrigen = { Norte: {}, Sur: {} };
    if (datosCache.tutoresNorte.length > 0 || datosCache.tutoresSur.length > 0) {
      Object.keys(tutoriasPorInstructor).forEach(instructor => {
        const cantidadTotal = tutoriasPorInstructor[instructor];
        const esTutorNorte = datosCache.tutoresNorte.some(t => t.nombre === instructor);
        const esTutorSur = datosCache.tutoresSur.some(t => t.nombre === instructor);
        if (esTutorNorte) {
          tutoresPorSedeOrigen.Norte[instructor] = cantidadTotal;
        }
        if (esTutorSur) {
          tutoresPorSedeOrigen.Sur[instructor] = cantidadTotal;
        }
      });
    }

detalles += `<div class="chart-container">
      <h3 class="chart-title">Cantidad de Tutorías por Tutor</h3>

      <div style="margin-top: 24px; margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
        <select id="filtroOrdenTutores" onchange="reordenarTutores();" class="admin-input" style="flex: 1; min-width: 200px; max-width: 500px; padding: 10px 14px; font-size: 12px;">
          <option value="cantidad">Ordenar por Cantidad</option>
          <option value="calificacion">Ordenar por Calificación</option>
          <option value="beneficiados">Ordenar por Beneficiados</option>
        </select>
        <select id="filtroAreaTutores" onchange="filtrarTutoresPorArea()" class="admin-input" style="flex: 1; min-width: 200px; max-width: 500px; padding: 10px 14px; font-size: 12px;">
          <option value="todas">Área: Todas</option>
          <option value="M">Matemáticas (M)</option>
          <option value="C">Comunicación (C)</option>
        </select>
      </div>
      
      <div class="botones-sedes">
        <button class="btn btn-secondary btn-sede" onclick="toggleInstructoresSede('norte')">
          Sede Norte
        </button>
        <button class="btn btn-secondary btn-sede" onclick="toggleInstructoresSede('sur')">
          Sede Sur
        </button>
      </div>

      <div id="instructoresNorteAdmin" class="horario-info hidden">
        <h4 class="horario-titulo">Tutores de Sede Norte</h4>`;
    
    const instructoresNorte = Object.entries(tutoresPorSedeOrigen.Norte)
      .sort((a, b) => b[1] - a[1]);
    if (instructoresNorte.length > 0) {
      detalles += `
        <div class="tabla-tutores-wrapper">
          <table class="tabla-estadisticas-tutores">
            <thead>
              <tr>
                <th scope="col">Nombre del tutor</th>
                <th scope="col">Tutorías</th>
                <th scope="col">Beneficiados</th>
                <th scope="col">Calificación</th>
              </tr>
            </thead>
            <tbody>`;
      instructoresNorte.forEach(([instructor, cantidad]) => {
        const promedioStr = promediosPorInstructor[instructor] != null ? promediosPorInstructor[instructor] : 'N/A';
        const calSort = promedioStr === 'N/A' ? '-1' : String(parseFloat(promedioStr));
        const beneficiados = documentosPorInstructor[instructor] ? documentosPorInstructor[instructor].size : 0;
        detalles += `<tr data-tutor-nombre="${escapeHtmlAdmin(instructor)}" data-cantidad="${cantidad}" data-calificacion="${calSort}" data-beneficiados="${beneficiados}">
          <td class="tabla-tutor-nombre">${escapeHtmlAdmin(instructor)}</td>
          <td class="tabla-tutor-num">${cantidad}</td>
          <td class="tabla-tutor-num">${beneficiados}</td>
          <td class="tabla-tutor-num">${escapeHtmlAdmin(promedioStr)}</td>
        </tr>`;
      });
      detalles += `</tbody></table></div>`;
    } else {
      detalles += '<p style="text-align: center; color: #666;">No hay tutores registrados en Sede Norte</p>';
    }
    
    detalles += `</div>

      <div id="instructoresSurAdmin" class="horario-info hidden">
        <h4 class="horario-titulo">Tutores de Sede Sur</h4>`;
    
    const instructoresSur = Object.entries(tutoresPorSedeOrigen.Sur)
      .sort((a, b) => b[1] - a[1]);
    if (instructoresSur.length > 0) {
      detalles += `
        <div class="tabla-tutores-wrapper">
          <table class="tabla-estadisticas-tutores">
            <thead>
              <tr>
                <th scope="col">Nombre del tutor</th>
                <th scope="col">Tutorías</th>
                <th scope="col">Beneficiados</th>
                <th scope="col">Calificación</th>
              </tr>
            </thead>
            <tbody>`;
      instructoresSur.forEach(([instructor, cantidad]) => {
        const promedioStr = promediosPorInstructor[instructor] != null ? promediosPorInstructor[instructor] : 'N/A';
        const calSort = promedioStr === 'N/A' ? '-1' : String(parseFloat(promedioStr));
        const beneficiados = documentosPorInstructor[instructor] ? documentosPorInstructor[instructor].size : 0;
        detalles += `<tr data-tutor-nombre="${escapeHtmlAdmin(instructor)}" data-cantidad="${cantidad}" data-calificacion="${calSort}" data-beneficiados="${beneficiados}">
          <td class="tabla-tutor-nombre">${escapeHtmlAdmin(instructor)}</td>
          <td class="tabla-tutor-num">${cantidad}</td>
          <td class="tabla-tutor-num">${beneficiados}</td>
          <td class="tabla-tutor-num">${escapeHtmlAdmin(promedioStr)}</td>
        </tr>`;
      });
      detalles += `</tbody></table></div>`;
    } else {
      detalles += '<p style="text-align: center; color: #666;">No hay tutores registrados en Sede Sur</p>';
    }
    
    detalles += '</div></div>';

    // ── RANKING DE TUTORES ──────────────────────────────────────────
    detalles += `
      <div class="chart-container" id="contenedorRankingTutores">
        <h3 class="chart-title">Ranking de Tutores</h3>
        <p style="font-size:13px; color:#666; margin-bottom:16px;">
          Puntaje ponderado basado en tutorías realizadas, estudiantes beneficiados y calificación promedio.
        </p>
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; align-items:flex-end;">
          <div>
            <label style="font-size:12px; font-weight:600; color:#333; display:block; margin-bottom:4px;">Tutorías (%)</label>
            <input type="number" id="pesoTutorias" value="35" min="0" max="100" class="admin-input" style="width:90px; padding:8px 10px; font-size:13px;">
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:#333; display:block; margin-bottom:4px;">Beneficiados (%)</label>
            <input type="number" id="pesoBeneficiados" value="45" min="0" max="100" class="admin-input" style="width:90px; padding:8px 10px; font-size:13px;">
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:#333; display:block; margin-bottom:4px;">Calificación (%)</label>
            <input type="number" id="pesoCalificacion" value="20" min="0" max="100" class="admin-input" style="width:90px; padding:8px 10px; font-size:13px;">
          </div>
          <div>
            <span id="avisoSumaPesos" style="font-size:12px; color:#dc3545; display:none;">La suma debe ser 100%</span>
          </div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
          <button class="btn" style="width:auto; margin:0; padding:10px 20px; font-size:13px;" onclick="calcularRankingTutores()">
            Calcular Ranking
          </button>
        </div>
        <div id="resultadoRankingTutores"></div>
      </div>
    `;
  }

if (tipo === 'profesores') {
  detalles += '<div class="chart-container"><h3 class="chart-title">Cantidad de Tutorías por Facultad/Departamento</h3>';
  const facultadesOrdenadas = Object.entries(stats.facultadDepartamento)
    .sort((a, b) => b[1] - a[1]);
  
  if (facultadesOrdenadas.length > 0) {
    facultadesOrdenadas.forEach(([facultad, cantidad]) => {
      const nombreCompleto = obtenerNombreFacultad(facultad);
      const porcentaje = ((cantidad / stats.total) * 100).toFixed(1);
      detalles += `<div class="list-item"><span>${nombreCompleto}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
  } else {
    detalles += '<p style="text-align: center; color: #666;">No hay datos por facultad</p>';
  }
  
  detalles += '</div>';
  detalles += `<div class="chart-container">
    <h3 class="chart-title">Cantidad de Tutorías por Profesor</h3>
    <div style="margin-top: 24px; margin-bottom: 24px;">
      <select id="filtroOrdenProfesores" onchange="reordenarTodosProfesores()" class="admin-input" style="flex: 1; min-width: 200px; max-width: 500px; padding: 10px 14px; font-size: 12px;">
        <option value="cantidad">Ordenar por cantidad (mayor a menor)</option>
        <option value="calificacion">Ordenar por calificación (mayor a menor)</option>
        <option value="beneficiados">Ordenar por beneficiados (mayor a menor)</option>
      </select>
    </div>`;
  const profesoresPorFacultad = {};
  const documentosPorFacultadProfesor = {};

  datosFiltrados.forEach(item => {
    const facultad = item.facultad_departamento || 'Sin Facultad';
    const profesor = item.instructor;
    if (!profesor) return;

    if (!profesoresPorFacultad[facultad]) {
      profesoresPorFacultad[facultad] = {};
    }
    if (!documentosPorFacultadProfesor[facultad]) {
      documentosPorFacultadProfesor[facultad] = {};
    }
    if (!documentosPorFacultadProfesor[facultad][profesor]) {
      documentosPorFacultadProfesor[facultad][profesor] = new Set();
    }

    profesoresPorFacultad[facultad][profesor] = (profesoresPorFacultad[facultad][profesor] || 0) + 1;
    const doc = item.documento != null && item.documento !== ''
      ? String(item.documento).trim()
      : '';
    if (doc) documentosPorFacultadProfesor[facultad][profesor].add(doc);
  });

  const facultadesConProfesores = Object.keys(profesoresPorFacultad).sort();
  if (facultadesConProfesores.length > 0) {
    detalles += '<div class="botones-sedes">';
    
    facultadesConProfesores.forEach(facultad => {
      const facultadId = facultad.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const nombreCompleto = obtenerNombreFacultad(facultad);
      const facultadCorta = nombreCompleto.replace('Facultad de ', '').replace('Departamento de ', '');
      detalles += `
        <button class="btn btn-secondary btn-sede" onclick="toggleProfesoresFacultad('${facultadId}')">
          ${facultadCorta}
        </button>`;
    });
    
    detalles += '</div>';
    facultadesConProfesores.forEach(facultad => {
      const facultadId = facultad.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const profesores = profesoresPorFacultad[facultad];
      const profesoresOrdenados = Object.entries(profesores).sort((a, b) => b[1] - a[1]);
      
      const nombreCompletoTitulo = obtenerNombreFacultad(facultad);
      detalles += `
        <div id="profesores${facultadId}" class="horario-info hidden">
          <h4 class="horario-titulo">${nombreCompletoTitulo}</h4>
          `;

      if (profesoresOrdenados.length > 0) {
        detalles += `
          <div class="tabla-tutores-wrapper">
            <table class="tabla-estadisticas-tutores">
              <thead>
                <tr>
                  <th scope="col">Nombre del profesor</th>
                  <th scope="col">Tutorías</th>
                  <th scope="col">Beneficiados</th>
                  <th scope="col">Calificación</th>
                </tr>
              </thead>
              <tbody>`;
        profesoresOrdenados.forEach(([profesor, cantidad]) => {
          const promedioStr = promediosPorInstructor[profesor] != null ? promediosPorInstructor[profesor] : 'N/A';
          const calSort = promedioStr === 'N/A' ? '-1' : String(parseFloat(promedioStr));
          const beneficiados = documentosPorFacultadProfesor[facultad] && documentosPorFacultadProfesor[facultad][profesor]
            ? documentosPorFacultadProfesor[facultad][profesor].size
            : 0;
          detalles += `<tr data-profesor-nombre="${escapeHtmlAdmin(profesor)}" data-cantidad="${cantidad}" data-calificacion="${calSort}" data-beneficiados="${beneficiados}">
            <td class="tabla-tutor-nombre">${escapeHtmlAdmin(profesor)}</td>
            <td class="tabla-tutor-num">${cantidad}</td>
            <td class="tabla-tutor-num">${beneficiados}</td>
            <td class="tabla-tutor-num">${escapeHtmlAdmin(promedioStr)}</td>
          </tr>`;
        });
        detalles += `</tbody></table></div>`;
      } else {
        detalles += '<p style="text-align: center; color: #666;">No hay profesores en esta facultad</p>';
      }

      detalles += '</div>';
    });
  } else {
    detalles += '<p style="text-align: center; color: #666;">No hay datos de profesores disponibles</p>';
  }
  
  detalles += '</div>';
}

  document.getElementById('detallesStats').innerHTML = detalles;
  cacheEstadisticas[tipo] = {
    stats,
    promedioCalificacion,
    promedioCalificacionPMA,
    mejorInstructor,
    peorInstructor,
    promediosPorInstructor,
    datosFiltrados,
    grid: grid.innerHTML,
    detalles: detalles
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

async function cambiarTabPVU(event, tab) {
  document.querySelectorAll('#contenidoPVU .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('tabEstadisticasPVU').classList.add('hidden');
  document.getElementById('tabDescargasPVU').classList.add('hidden');
  
  if (tab === 'descargas') {
    document.getElementById('tabDescargasPVU').classList.remove('hidden');
  } else if (tab === 'estadisticas') {
    document.getElementById('tabEstadisticasPVU').classList.remove('hidden');
    if (!window.datosPVUGlobal) {
      await cargarEstadisticasPVU();
    } else {
      mostrarEstadisticasPVU();
    }
  }
}

function cambiarTabAAA(event, tab) {
  document.querySelectorAll('#contenidoAAA .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tabDescargasAAA').classList.add('hidden');
  document.getElementById('tabRemisionesAAA').classList.add('hidden');

  if (tab === 'descargas') {
    document.getElementById('tabDescargasAAA').classList.remove('hidden');
  } else if (tab === 'remisiones') {
    document.getElementById('tabRemisionesAAA').classList.remove('hidden');
    if (remisionesAAACache.length === 0) {
      cargarRemisionesAAA();
    }
  }
}

async function cambiarTabDiagnosticos(event, tab) {
  document.querySelectorAll('#contenidoDiagnosticos .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  document.getElementById('tabEstadisticasDiagnosticos').classList.add('hidden');
  document.getElementById('tabDescargasDiagnosticos').classList.add('hidden');
  document.getElementById('tabGruposDiagnosticos')?.classList.add('hidden');

  if (tab === 'descargas') {
    document.getElementById('tabDescargasDiagnosticos').classList.remove('hidden');
  } else if (tab === 'estadisticas') {
    document.getElementById('tabEstadisticasDiagnosticos').classList.remove('hidden');
    if (!window.datosDiagnosticosGlobal) {
      await cargarEstadisticasDiagnosticos();
    } else {
      mostrarEstadisticasDiagnosticos(window.datosDiagnosticosGlobal);
    }
  } else if (tab === 'grupos') {
    document.getElementById('tabGruposDiagnosticos')?.classList.remove('hidden');
    if (typeof inicializarSeccionGrupos === 'function') {
      inicializarSeccionGrupos();
    }
  }
}

async function cargarEstadisticasPVU(opciones) {
  const statsGridPVU = document.getElementById('statsGridPVU');
  const detallesStatsPVU = document.getElementById('detallesStatsPVU');
  if (statsGridPVU) {
    mostrarCargando(statsGridPVU);
  }
  if (detallesStatsPVU) {
    detallesStatsPVU.textContent = '';
  }
  
  try {
    const totalRegistros = await ConsultasAdmin.obtenerConteoPVU({
      forzar: Boolean(opciones && opciones.forzar)
    });

    if (totalRegistros === 0) {
      window.datosPVUGlobal = { totalRegistros: 0 };
      if (statsGridPVU) {
        statsGridPVU.textContent = '';
        const p = document.createElement('p');
        p.style.textAlign = 'center';
        p.style.color = '#666';
        p.textContent = 'No hay datos disponibles aún.';
        statsGridPVU.appendChild(p);
      }
      return;
    }
    window.datosPVUGlobal = { totalRegistros: totalRegistros };
    mostrarEstadisticasPVU();
    
  } catch (error) {
    console.error('Error cargando estadísticas PVU:', error);
    if (statsGridPVU) {
      statsGridPVU.textContent = '';
      const p = document.createElement('p');
      p.style.textAlign = 'center';
      p.style.color = '#dc3545';
      p.textContent = 'Error al cargar estadísticas. Por favor intenta de nuevo.';
      statsGridPVU.appendChild(p);
    }
  }
}

function mostrarEstadisticasPVU() {
  const data = window.datosPVUGlobal;
  const statsGridPVU = document.getElementById('statsGridPVU');
  const detallesStatsPVU = document.getElementById('detallesStatsPVU');
  const totalRegistros = Array.isArray(data)
    ? data.length
    : (data && typeof data.totalRegistros === 'number' ? data.totalRegistros : 0);
  
  if (!data || totalRegistros === 0) {
    if (statsGridPVU) {
      statsGridPVU.innerHTML = '<p style="text-align: center; color: #666;">No hay datos disponibles aún.</p>';
    }
    return;
  }
  if (statsGridPVU) {
    statsGridPVU.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h3>${totalRegistros}</h3>
          <p>Total de Registros</p>
        </div>
      </div>
    `;
  }
  
  if (detallesStatsPVU) {
    detallesStatsPVU.textContent = '';
  }
}


function generarListasEstadisticas(top5Materias, top5Semestres, top5Programas, todasFacultades, todosMotivos, total) {
  let detallesHTML = '';
  detallesHTML += '<div class="chart-container"><h3 class="chart-title">Top 5 Materias con Más Tutorías</h3>';
  if (top5Materias.length > 0) {
    top5Materias.forEach(([materia, cantidad]) => {
      const porcentaje = ((cantidad / total) * 100).toFixed(1);
      detallesHTML += `<div class="list-item"><span>${materia}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
  } else {
    detallesHTML += '<p style="text-align: center; color: #666;">No hay datos disponibles</p>';
  }
  detallesHTML += '</div>';
  detallesHTML += '<div class="chart-container"><h3 class="chart-title">Top 5 Semestres con Más Tutorías</h3>';
  if (top5Semestres.length > 0) {
    top5Semestres.forEach(([semestre, cantidad]) => {
      const porcentaje = ((cantidad / total) * 100).toFixed(1);
      const semestreTexto = semestre === 'Sin especificar' ? semestre : `Semestre ${semestre}`;
      detallesHTML += `<div class="list-item"><span>${semestreTexto}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
  } else {
    detallesHTML += '<p style="text-align: center; color: #666;">No hay datos disponibles</p>';
  }
  detallesHTML += '</div>';
  if (todasFacultades.length > 0) {
    detallesHTML += '<div class="chart-container"><h3 class="chart-title">Facultades con Más Tutorías</h3>';
    todasFacultades.forEach(([facultad, cantidad]) => {
      const porcentaje = ((cantidad / total) * 100).toFixed(1);
      detallesHTML += `<div class="list-item"><span>${facultad}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
    detallesHTML += '</div>';
  }
  detallesHTML += '<div class="chart-container"><h3 class="chart-title">Top 5 Programas con Más Tutorías</h3>';
  if (top5Programas.length > 0) {
    top5Programas.forEach(([programa, cantidad]) => {
      const porcentaje = ((cantidad / total) * 100).toFixed(1);
      detallesHTML += `<div class="list-item"><span>${programa}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
  } else {
    detallesHTML += '<p style="text-align: center; color: #666;">No hay datos disponibles</p>';
  }
  detallesHTML += '</div>';
  if (todosMotivos && todosMotivos.length > 0) {
    detallesHTML += '<div class="chart-container"><h3 class="chart-title">Motivos de Consulta</h3>';
    todosMotivos.forEach(([motivo, cantidad]) => {
      const porcentaje = ((cantidad / total) * 100).toFixed(1);
      detallesHTML += `<div class="list-item"><span>${motivo}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
    detallesHTML += '</div>';
  }
  
  document.getElementById('detallesStats').innerHTML = detallesHTML;
}


function calcularRankingTutores() {
  const pesoT = parseFloat(document.getElementById('pesoTutorias').value) || 0;
  const pesoB = parseFloat(document.getElementById('pesoBeneficiados').value) || 0;
  const pesoC = parseFloat(document.getElementById('pesoCalificacion').value) || 0;
  const aviso = document.getElementById('avisoSumaPesos');
  const contenedor = document.getElementById('resultadoRankingTutores');

  if (Math.round(pesoT + pesoB + pesoC) !== 100) {
    aviso.style.display = 'inline';
    contenedor.innerHTML = '';
    return;
  }
  aviso.style.display = 'none';

  const cache = cacheEstadisticas['tutores'];
  if (!cache) {
    contenedor.innerHTML = '<p style="color:#dc3545; text-align:center;">Primero carga las estadísticas de Tutores.</p>';
    return;
  }

  // Recopilar datos de todos los tutores (norte + sur)
  const tutoriasPorInstructor = cache.datosFiltrados.reduce((acc, item) => {
    const inst = item.instructor;
    if (!inst) return acc;
    acc[inst] = (acc[inst] || 0) + 1;
    return acc;
  }, {});

  const documentosPorInstructor = cache.datosFiltrados.reduce((acc, item) => {
    const inst = item.instructor;
    if (!inst) return acc;
    if (!acc[inst]) acc[inst] = new Set();
    const doc = item.documento != null && item.documento !== '' ? String(item.documento).trim() : '';
    if (doc) acc[inst].add(doc);
    return acc;
  }, {});

  const tutores = Object.keys(tutoriasPorInstructor);
  if (tutores.length === 0) {
    contenedor.innerHTML = '<p style="color:#666; text-align:center;">No hay datos de tutores disponibles.</p>';
    return;
  }

  // Construir array con los tres valores
  const datos = tutores.map(nombre => ({
    nombre,
    tutorias: tutoriasPorInstructor[nombre] || 0,
    beneficiados: documentosPorInstructor[nombre] ? documentosPorInstructor[nombre].size : 0,
    calificacion: parseFloat(cache.promediosPorInstructor[nombre] || 0)
  }));

  // Separar datos por sede
  const datosNorte = datos.filter(d =>
    datosCache.tutoresNorte.some(t => t.nombre === d.nombre)
  );
  const datosSur = datos.filter(d =>
    datosCache.tutoresSur.some(t => t.nombre === d.nombre)
  );

  const wT = pesoT / 100;
  const wB = pesoB / 100;
  const wC = pesoC / 100;

  function calcularRankingPorGrupo(grupo) {
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

  const rankingNorte = calcularRankingPorGrupo(datosNorte);
  const rankingSur = calcularRankingPorGrupo(datosSur);

  function generarTablaRanking(lista, titulo, sedeKey) {
    if (lista.length === 0) return '';
    let html = `
      <div id="rankingSede${sedeKey}" class="horario-info hidden" style="margin-top:12px;">
        <h4 class="horario-titulo">${titulo}</h4>
        <div class="tabla-tutores-wrapper">
          <table class="tabla-estadisticas-tutores">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Tutor</th>
                <th scope="col">Puntaje</th>
              </tr>
            </thead>
            <tbody>`;
    lista.forEach((d, i) => {
      html += `
        <tr>
          <td class="tabla-tutor-num">${i + 1}</td>
          <td class="tabla-tutor-nombre">${escapeHtmlAdmin(d.nombre)}</td>
          <td class="tabla-tutor-num" style="font-weight:700; color:#1e3c72;">${d.puntaje.toFixed(2)}%</td>
        </tr>`;
    });
    html += `</tbody></table></div></div>`;
    return html;
  }

  contenedor.innerHTML = `
    <div class="botones-sedes">
      <button class="btn btn-secondary btn-sede" onclick="toggleRankingSede('Norte')">
        Sede Norte
      </button>
      <button class="btn btn-secondary btn-sede" onclick="toggleRankingSede('Sur')">
        Sede Sur
      </button>
    </div>
    ${generarTablaRanking(rankingNorte, 'Tutores de Sede Norte', 'Norte')}
    ${generarTablaRanking(rankingSur, 'Tutores de Sede Sur', 'Sur')}
  `;
}

function toggleRankingSede(sedeKey) {
  const norte = document.getElementById('rankingSedeNorte');
  const sur = document.getElementById('rankingSedeSur');

  const objetivo = document.getElementById('rankingSede' + sedeKey);
  const yaAbierto = objetivo && !objetivo.classList.contains('hidden');

  [norte, sur].forEach(el => { if (el) el.classList.add('hidden'); });

  if (!yaAbierto && objetivo) objetivo.classList.remove('hidden');
}


// ── REMISIONES AAA ──────────────────────────────────────────────────────────

let remisionesAAACache = [];

async function cargarRemisionesAAA(opciones) {
  const tbody = document.getElementById('cuerpoRemisionesAAA');
  const mensaje = document.getElementById('mensajeRemisionesAAA');
  const loader = mostrarCargando(document.body);
  tbody.innerHTML = '';
  mensaje.textContent = '';

  try {
    const data = await ConsultasAdmin.obtenerAcompanamiento({
      orden: 'desc',
      forzar: Boolean(opciones && opciones.forzar)
    });
    remisionesAAACache = data;
    filtrarRemisiones();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#dc3545;">Error al cargar los registros.</td></tr>';
    console.error(err);
  } finally {
    ocultarCargando(loader);
  }
}

function filtrarRemisiones() {
  const textoBusqueda = (document.getElementById('buscadorCodigoRemision')?.value || '').trim().toUpperCase();
  const estadoFiltro = document.getElementById('filtroEstadoRemision')?.value || '';

  let filtrados = remisionesAAACache;

  if (textoBusqueda) {
    filtrados = filtrados.filter(r => (r.codigo_remision || '').toUpperCase().includes(textoBusqueda));
  }
  if (estadoFiltro) {
    filtrados = filtrados.filter(r => (r.estado_remision || '') === estadoFiltro);
  }

  renderTablaRemisiones(filtrados);
}

function renderTablaRemisiones(datos) {
  const tbody = document.getElementById('cuerpoRemisionesAAA');
  const mensaje = document.getElementById('mensajeRemisionesAAA');
  tbody.innerHTML = '';

  if (!datos || datos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#666;">No se encontraron registros.</td></tr>';
    mensaje.textContent = '';
    return;
  }

  mensaje.textContent = `Mostrando ${datos.length} registro${datos.length !== 1 ? 's' : ''}.`;

  const ESTADOS = ['Enviado', 'Recibido', 'En atención', 'Finalizado'];

  datos.forEach(fila => {
    const fechaStr = formatearFechaColombia(fila.fecha_hora, { formato: 'fecha' }) || '—';

    const estadoActual = fila.estado_remision || 'Enviado';
    const opcionesEstado = ESTADOS.map(e =>
      `<option value="${e}" ${e === estadoActual ? 'selected' : ''}>${e}</option>`
    ).join('');

    const tr = document.createElement('tr');
    tr.dataset.codigo = fila.codigo_remision || '';
    tr.innerHTML = `
      <td class="tabla-tutor-num" style="font-weight:700; color:#1e3c72; white-space:nowrap;">${escapeHtmlAdmin(fila.codigo_remision || '—')}</td>
      <td class="tabla-tutor-num" style="white-space:nowrap;">${fechaStr}</td>
      <td class="tabla-tutor-num" style="white-space:nowrap;">${escapeHtmlAdmin(fila.tipo_acompanamiento || '—')}</td>
      <td class="tabla-tutor-nombre">${escapeHtmlAdmin(fila.nombres_y_apellidos || fila.nombre || '—')}</td>
      <td class="tabla-tutor-num">${escapeHtmlAdmin(fila.grupo || '—')}</td>
      <td class="tabla-tutor-nombre">${escapeHtmlAdmin(fila.programa_estudiante || '—')}</td>
      <td class="tabla-tutor-nombre">${escapeHtmlAdmin(fila.profesor || '—')}</td>
      <td class="tabla-tutor-nombre">${escapeHtmlAdmin(fila.asignatura || '—')}</td>
      <td style="text-align:center; white-space:nowrap;">
  <div class="remision-acciones">
    <select class="remision-estado-select" data-codigo="${escapeHtmlAdmin(fila.codigo_remision || '')}" onchange="guardarEstadoRemision(this)">
      ${opcionesEstado}
    </select>
    <div class="remision-botones">
      <button class="remision-btn" title="Ver comentarios" onclick="abrirComentarioAAA('${escapeHtmlAdmin(fila.codigo_remision || '')}')">💬</button>
      <button class="remision-btn" title="Ver/editar información" onclick="abrirInformacionAAA('${escapeHtmlAdmin(fila.codigo_remision || '')}')">📝</button>
    </div>
  </div>
</td>
    `;
    tbody.appendChild(tr);
  });
}

function abrirComentarioAAA(codigo) {
  const registro = remisionesAAACache.find(r => r.codigo_remision === codigo);
  const comentario = registro?.comentarios?.trim() || 'No hay comentarios.';
  document.getElementById('contenidoComentarioAAA').textContent = comentario;
  document.getElementById('modalComentarioAAA').classList.remove('hidden');
}

function cerrarModalComentarioAAA() {
  document.getElementById('modalComentarioAAA').classList.add('hidden');
}

function abrirInformacionAAA(codigo) {
  const registro = remisionesAAACache.find(r => r.codigo_remision === codigo);
  document.getElementById('modalInfoCodigoAAA').value = codigo;
  document.getElementById('contenidoInformacionAAA').value = registro?.informacion || '';
  document.getElementById('mensajeGuardadoInfo').textContent = '';

  const fechaEl = document.getElementById('fechaActualizacionInfo');
  if (registro?.fecha_actualizacion_info) {
    const fechaFormateada = formatearFechaColombia(registro.fecha_actualizacion_info, { formato: 'fechaHoraLocal' });
    fechaEl.textContent = `Última actualización: ${fechaFormateada}`;
  } else {
    fechaEl.textContent = 'Sin actualizaciones registradas.';
  }

  document.getElementById('modalInformacionAAA').classList.remove('hidden');
}

function cerrarModalInformacionAAA() {
  document.getElementById('modalInformacionAAA').classList.add('hidden');
}

async function guardarInformacionAAA() {
  const codigo = document.getElementById('modalInfoCodigoAAA').value;
  const informacion = document.getElementById('contenidoInformacionAAA').value.trim();
  const msgEl = document.getElementById('mensajeGuardadoInfo');
  msgEl.style.color = '#666';
  msgEl.textContent = 'Guardando...';

  const ahora = obtenerFechaISOColombia();

  try {
    await ConsultasAdmin.actualizar(
      'acompanamiento',
      { codigo_remision: codigo },
      {
        informacion: informacion || null,
        fecha_actualizacion_info: ahora
      },
      {
        esquema: 'public',
        retorno: 'minimal',
        etiquetasInvalidar: ['tabla:acompanamiento']
      }
    );

    const idx = remisionesAAACache.findIndex(r => r.codigo_remision === codigo);
    if (idx !== -1) {
      remisionesAAACache[idx].informacion = informacion || null;
      remisionesAAACache[idx].fecha_actualizacion_info = ahora;
    }

    const fechaFormateada = formatearFechaColombia(ahora, { formato: 'fechaHoraLocal' });
    document.getElementById('fechaActualizacionInfo').textContent = `Última actualización: ${fechaFormateada}`;

    msgEl.style.color = '#155724';
    msgEl.textContent = '✓ Información guardada correctamente.';
    setTimeout(() => cerrarModalInformacionAAA(), 1500);
  } catch (err) {
    msgEl.style.color = '#dc3545';
    msgEl.textContent = 'No fue posible guardar los cambios.';
    console.error(err);
  }
}

async function guardarEstadoRemision(selectEl) {
  const codigo = selectEl.dataset.codigo;
  const nuevoEstado = selectEl.value;

  selectEl.disabled = true;

  const ahora = obtenerFechaISOColombia();

  try {
    await ConsultasAdmin.actualizar(
      'acompanamiento',
      { codigo_remision: codigo },
      {
        estado_remision: nuevoEstado,
        fecha_actualizacion_info: ahora
      },
      {
        esquema: 'public',
        retorno: 'minimal',
        etiquetasInvalidar: ['tabla:acompanamiento']
      }
    );

    const idx = remisionesAAACache.findIndex(r => r.codigo_remision === codigo);
    if (idx !== -1) {
      remisionesAAACache[idx].estado_remision = nuevoEstado;
      remisionesAAACache[idx].fecha_actualizacion_info = ahora;
    }

    selectEl.style.borderColor = '#28a745';
    setTimeout(() => { selectEl.style.borderColor = ''; }, 1500);

  } catch (err) {
    selectEl.style.borderColor = '#dc3545';
    setTimeout(() => { selectEl.style.borderColor = ''; }, 1500);
    console.error(err);
  } finally {
    selectEl.disabled = false;
  }
}

// ── SINCRONIZACIÓN DE CACHÉ LOCAL ANTE MUTACIONES EN SUBPÁGINAS ADMIN ────────
if (typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.alInvalidar === 'function') {
  ConsultasAdmin.alInvalidar(function (etiquetas, esRemoto) {
    if (!Array.isArray(etiquetas) || etiquetas.length === 0) return;
    const set = new Set(etiquetas);
    const todo = set.has('*');

    if (todo || set.has('tabla:formularios') || set.has('tabla:public.formularios') || set.has('tabla:estudiantes') || set.has('tabla:public.estudiantes')) {
      window.datosFormulariosGlobal = null;
      invalidarCacheEstadisticas();
      if (graficoTutorias) {
        graficoTutorias.destroy();
        graficoTutorias = null;
      }
    }

    if (todo || set.has('grupo:catalogos') || set.has('tabla:tutores_norte') || set.has('tabla:tutores_sur') || set.has('tabla:profesores')) {
      datosCache.tutoresNorte = [];
      datosCache.tutoresSur = [];
      datosCache.profesores = [];
      invalidarCacheEstadisticas();
    }

    if (todo || set.has('tabla:pvu') || set.has('tabla:public.pvu')) {
      window.datosPVUGlobal = null;
    }

    if (todo || set.has('esquema:diagnosticos') || set.has('tabla:diagnosticos.presentaciones')) {
      window.datosDiagnosticosGlobal = null;
    }

    if (todo || (esRemoto && (set.has('tabla:acompanamiento') || set.has('tabla:public.acompanamiento')))) {
      remisionesAAACache = [];
    }
  });
}
