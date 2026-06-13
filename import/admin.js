const cacheEstadisticas = {
  general: null,
  tutores: null,
  profesores: null
};

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

function invalidarCacheEstadisticas() {
  cacheEstadisticas.general = null;
  cacheEstadisticas.tutores = null;
  cacheEstadisticas.profesores = null;
}

function verificarCapsLock(event) {
  const aviso = document.getElementById('avisoCapsLock');
  if (!aviso) return;
  aviso.style.display = event.getModifierState('CapsLock') ? 'block' : 'none';
}

async function precargarDatosEstadisticas() {
  if (datosCache.tutoresNorte.length > 0 && datosCache.profesores.length > 0) return;
  try {
    const [tutoresNorte, tutoresSur, profesores] = await Promise.all([
      supabaseQuery('tutores_norte'),
      supabaseQuery('tutores_sur'),
      supabaseQuery('profesores')
    ]);
    
    datosCache.tutoresNorte = tutoresNorte;
    datosCache.tutoresSur = tutoresSur;
    datosCache.profesores = profesores;
  } catch (error) {
    console.error('Error precargando datos de estadísticas:', error);
    throw error;
  }
}

function mostrarLoginAdmin() {
  mostrarContenidoFormulario();
  setTimeout(() => {
    verificarSesionAdmin(); 
    if (elementosDOM.mensajeAdminLogin) {
      elementosDOM.mensajeAdminLogin.textContent = '';
    }
  }, 550);
}

async function loginAdmin(event) {
  event.preventDefault();
  mostrarCargando('mensajeAdminLogin');


  const email = document.getElementById('adminDocumento').value;
  const password = document.getElementById('adminContrasena').value;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      mostrarMensaje('mensajeAdminLogin', 'Acceso denegado.', 'error');
      console.error('Error de autenticación:', error.message);
      return;
    }

    const user = data.user;

    const { data: adminData, error: adminError } = await supabaseClient
      .from('admin_usuarios')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminData) {
      mostrarMensaje('mensajeAdminLogin', 'Usuario sin permisos de administrador.', 'error');
      await supabaseClient.auth.signOut();
      return;
    }

    mostrarPantalla('pantallaAdmin');
    history.pushState({ adminPanel: true }, '', window.location.href);

  } catch (error) {
    mostrarMensaje('mensajeAdminLogin', 'Error de conexión: ' + error.message, 'error');
    console.error('Error en login:', error);
  }
}

function cambiarTabPrincipal(event, seccion) {
  document.querySelectorAll('.admin-tabs-principal .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('contenidoPMA').classList.add('hidden');
  document.getElementById('contenidoPVU').classList.add('hidden');
  document.getElementById('contenidoAAA').classList.add('hidden');
  
  if (seccion === 'pma') {
    document.getElementById('contenidoPMA').classList.remove('hidden');
    const primerTabPMA = document.querySelector('.admin-tabs-secundario .admin-tab');
    if (primerTabPMA) {
      document.querySelectorAll('.admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabPMA.classList.add('active');
      document.getElementById('tabEstadisticas').classList.add('hidden');
      document.getElementById('tabGraficas').classList.add('hidden');
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
    }
  }
}

async function cambiarTab(event, tab) {
  document.querySelectorAll('.admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('tabEstadisticas').classList.add('hidden');
  document.getElementById('tabGraficas').classList.add('hidden');
  document.getElementById('tabDescargas').classList.add('hidden');
  
  if (tab === 'descargas') {
    document.getElementById('tabDescargas').classList.remove('hidden');

} else if (tab === 'estadisticas') {
    document.getElementById('tabEstadisticas').classList.remove('hidden');
    if (datosCache.tutoresNorte.length === 0) {
      if (elementosDOM.statsGrid) {
        elementosDOM.statsGrid.textContent = '';
        const loader = document.createElement('div');
        loader.className = 'loader';
        elementosDOM.statsGrid.appendChild(loader);
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
      container.innerHTML = '<div class="loader"></div>';
      
      try {
        const data = await obtenerFormulariosCache();
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

function solicitarForzarActualizacion() {
  mostrarModalConfirmacion(
    '¿Forzar Actualización de Datos?',
    'Esta acción hará que TODOS los estudiantes deban actualizar su semestre antes de llenar el formulario. ¿Está seguro de continuar?',
    forzarActualizacionEstudiantes
  );
}

async function forzarActualizacionEstudiantes() {
  const btnForzar = document.getElementById('btnForzarActualizacion');
  btnForzar.disabled = true;
  btnForzar.style.opacity = '0.6';
  
  try {
 
    const url = `${SUPABASE_URL}/rest/v1/estudiantes?documento=neq.`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        fecha_actualizacion: null
      })
    });
    
    if (!response.ok) {
      console.log('PATCH masivo falló, intentando actualización individual...');
      
      const estudiantes = await supabaseQuery('estudiantes');
      let actualizados = 0;
      let errores = 0;
      
      for (const estudiante of estudiantes) {
        try {
          const urlIndividual = `${SUPABASE_URL}/rest/v1/estudiantes?documento=eq.${estudiante.documento}`;
          const responseIndividual = await fetch(urlIndividual, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              fecha_actualizacion: null
            })
          });
          
          if (responseIndividual.ok) {
            actualizados++;
          } else {
            errores++;
          }
        } catch (error) {
          errores++;
          console.error(`Error actualizando estudiante ${estudiante.documento}:`, error);
        }
      }
      
      if (errores > 0) {
        alert(`Actualización parcial: ${actualizados} estudiantes actualizados, ${errores} con errores.`);
      } else {
        alert(`Actualización forzada exitosa. ${actualizados} estudiantes deberán actualizar sus datos antes de llenar el formulario.`);
      }
    } else {
      alert('Actualización forzada exitosa. Todos los estudiantes deberán actualizar sus datos antes de llenar el formulario.');
    }
    
  } catch (error) {
    console.error('Error forzando actualización:', error);
    alert('Error al forzar actualización: ' + error.message);
  } finally {
    btnForzar.disabled = false;
    btnForzar.style.opacity = '1';
  }
}

async function actualizarEstadisticas() {
  const btnActualizar = document.getElementById('btnActualizar');
  const iconActualizar = document.getElementById('iconActualizar');
  btnActualizar.disabled = true;
  btnActualizar.style.opacity = '0.6';
  iconActualizar.style.animation = 'spin 1s linear infinite';
  try {
    invalidarCacheFormularios();
    invalidarCacheEstadisticas();
    
    const contenidoPMA = document.getElementById('contenidoPMA');
    const contenidoPVU = document.getElementById('contenidoPVU');
    
    if (!contenidoPMA.classList.contains('hidden')) {
      await cargarEstadisticas();
    } else if (!contenidoPVU.classList.contains('hidden')) {
      window.datosPVUGlobal = null;
      await cargarEstadisticasPVU();
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
  const ahora = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const p = document.createElement('p');
  p.id = id;
  p.style.textAlign = 'right';
  p.style.color = '#666';
  p.style.fontSize = '12px';
  p.textContent = 'Última actualización: ' + ahora;
  grid.insertAdjacentElement('afterbegin', p);
}

async function cargarEstadisticas() {

  if (elementosDOM.statsGrid) {
    elementosDOM.statsGrid.textContent = '';
    const loader = document.createElement('div');
    loader.className = 'loader';
    elementosDOM.statsGrid.appendChild(loader);
  }
  if (elementosDOM.detallesStats) {
    elementosDOM.detallesStats.textContent = '';
  }
  
  try {
    const data = await obtenerFormulariosCache();

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

function escapeHtmlAdmin(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
    const sede = item.sede_tutoria;
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
    if (datosCache.tutoresNorte.length > 0 && datosCache.tutoresSur.length > 0) {
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


async function descargarDatos(event) {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;

  if (desde && !hasta) {
    alert('Si selecciona una Fecha Desde, también debe seleccionar una Fecha Hasta.');
    return;
  }

  if (desde && hasta && new Date(desde) > new Date(hasta)) {
    alert('La fecha inicial no puede ser mayor que la fecha final');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const opcionesQuery = { order: 'fecha.asc' };

    if (!desde && hasta) {
      opcionesQuery.lte = { field: 'fecha', value: convertirFechaInputAISOColombia(hasta, '23:59:59') };
    } else if (desde && hasta) {
      opcionesQuery.gte = { field: 'fecha', value: convertirFechaInputAISOColombia(desde, '00:00:00') };
      opcionesQuery.lte = { field: 'fecha', value: convertirFechaInputAISOColombia(hasta, '23:59:59') };
    }

    const data = await supabaseQuerySinLimite('formularios', opcionesQuery);
    const datosTutores = data.filter(item => item.tipo_instructor === 'Tutor');

    if (datosTutores.length === 0) {
      alert('No hay registros de tutores para el período seleccionado');
      return;
    }

    generarExcelSimplificado(datosTutores, desde, hasta);
    alert(`${datosTutores.length} registros de tutores descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


async function descargarTodo(event) {
  if (!confirm('¿Descargar todos los registros?')) {
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga completa...';

  try {
const data = await supabaseQuerySinLimite('formularios', { order: 'fecha.asc' });
    
    if (data.length === 0) {
      alert('No hay registros para descargar');
      return;
    }

    generarExcelCompleto(data, 'PMA_Completo');
    alert(`${data.length} registros descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


async function descargarDocentes(event) {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;

  if (desde && !hasta) {
    alert('Si selecciona una Fecha Desde, también debe seleccionar una Fecha Hasta.');
    return;
  }

  if (desde && hasta && new Date(desde) > new Date(hasta)) {
    alert('La fecha inicial no puede ser mayor que la fecha final');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const opcionesQuery = { order: 'fecha.asc' };

    if (!desde && hasta) {
      opcionesQuery.lte = { field: 'fecha', value: convertirFechaInputAISOColombia(hasta, '23:59:59') };
    } else if (desde && hasta) {
      opcionesQuery.gte = { field: 'fecha', value: convertirFechaInputAISOColombia(desde, '00:00:00') };
      opcionesQuery.lte = { field: 'fecha', value: convertirFechaInputAISOColombia(hasta, '23:59:59') };
    }

    const data = await supabaseQuerySinLimite('formularios', opcionesQuery);
    const datosDocentes = data.filter(item => item.tipo_instructor === 'Profesor');

    if (datosDocentes.length === 0) {
      alert('No hay registros de docentes para el período seleccionado');
      return;
    }

    generarExcelDocentes(datosDocentes, desde, hasta);
    alert(`${datosDocentes.length} registros de docentes descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


async function descargarPorFacultad(event) {
  const checkboxes = document.querySelectorAll('.facultad-checkbox:checked');

  if (checkboxes.length === 0) {
    alert('Por favor seleccione al menos una facultad');
    return;
  }

  const nombresFacultadesBD = Array.from(checkboxes).map(cb => cb.value);

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const datosFinales = await supabaseQuerySinLimite('formularios', {
      in: { field: 'facultad', values: nombresFacultadesBD },
      order: 'fecha.asc'
    });

    if (datosFinales.length === 0) {
      alert('No hay registros para las facultades seleccionadas');
      return;
    }

    generarExcelPorFacultad(datosFinales, nombresFacultadesBD);
    alert(`${datosFinales.length} registros descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function generarExcelPorFacultad(datos, facultadesSeleccionadas) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Documento': parseInt(fila.documento),
      'Nombres': fila.nombres || '',
      'Apellidos': fila.apellidos || '',
      'Semestre': fila.semestre || '',
      'Facultad': fila.facultad || '',
      'Programa': fila.programa || '',
      'Asignatura': fila.asignatura || '',
      'Tema': fila.tema || ''
    };
  });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);
  
  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 1);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 10 }, { wch: 35 }, { wch: 35 }, { wch: 30 }, { wch: 30 }
  ];
  
  const nombresFacultades = facultadesSeleccionadas.join('_');
  XLSX.utils.book_append_sheet(wb, ws, "Por Facultad");
  
  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `PMA_PorFacultad_${nombresFacultades.replace(/\s+/g, '_')}_${fechaHoy}.xlsx`);
}


async function descargarPorGrupo(event) {
  const archivoInput = document.getElementById('archivoMatriculados');
  const grupoRaw = document.getElementById('buscadorGrupo').value.trim().toUpperCase();

  if (!archivoInput.files || archivoInput.files.length === 0) {
    alert('Por favor selecciona el archivo MATRICULADOS.');
    return;
  }
  if (!grupoRaw) {
    alert('Por favor ingresa al menos un grupo.');
    return;
  }

  const gruposFiltro = grupoRaw
    .split(';')
    .map(g => g.trim())
    .filter(Boolean);

  if (gruposFiltro.length === 0) {
    alert('No se encontraron grupos válidos.');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Procesando...';

  try {
    const mapaGrupos = await leerMatriculadosMultiple(archivoInput.files[0], gruposFiltro);

    if (mapaGrupos.size === 0) {
      alert(`No se encontraron estudiantes con los grupos "${gruposFiltro.join('; ')}" en el archivo MATRICULADOS.`);
      return;
    }

    btnDescarga.textContent = 'Descargando de la BD...';
    const data = await supabaseQuerySinLimite('formularios', { order: 'fecha.asc' });

    if (!data || data.length === 0) {
      alert('No hay registros en la base de datos.');
      return;
    }

    const datosFiltrados = data.filter(fila =>
      mapaGrupos.has(String(fila.documento).trim())
    );

    if (datosFiltrados.length === 0) {
      alert(`No se encontraron registros en la BD para los estudiantes de los grupos "${gruposFiltro.join('; ')}".`);
      return;
    }

    generarExcelPorGrupoMatriculados(datosFiltrados, mapaGrupos, gruposFiltro.join('_'));
    alert(`${datosFiltrados.length} registros descargados exitosamente para los grupos: ${gruposFiltro.join(', ')}.`);

  } catch (error) {
    alert('Error: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


function generarExcelPorGrupoMatriculados(datos, mapaGrupos, grupoFiltro) {
  const datosExcel = datos.map(fila => {
    const doc = String(fila.documento).trim();
    const grupoReal = mapaGrupos.get(doc) || grupoFiltro;
    const apellidos = fila.apellidos || '';
    const nombres = fila.nombres || '';
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);

    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Documento': parseInt(fila.documento) || '',
      'Apellidos y Nombres': `${apellidos} ${nombres}`.trim(),
      'Facultad': fila.facultad || '',
      'Programa': fila.programa || '',
      'Grupo': grupoReal,
      'Asignatura': fila.asignatura || '',
      'Tema': fila.tema || '',
      'Motivo de Consulta': fila.motivo_consulta || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

const range = XLSX.utils.decode_range(ws['!ref']);
aplicarFormatoExcel(ws, range, 0, 2);
for (let row = 1; row <= range.e.r; row++) {
  const docCell = XLSX.utils.encode_cell({ r: row, c: 2 });
  if (ws[docCell]) { ws[docCell].t = 'n'; ws[docCell].z = '0'; }
}

  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
ws['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 40 },
    { wch: 35 }, { wch: 35 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Por Grupo');

  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `PMA_PorGrupo_${grupoFiltro.replace(/\s+/g, '_')}_${fechaHoy}.xlsx`);
}


function leerMatriculadosMultiple(archivo, gruposFiltro) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });

        const hojasObjetivo = ['MATEMATICAS', 'COMUNICACION'];
        const mapa = new Map();

        hojasObjetivo.forEach(nombreHoja => {
          const ws = wb.Sheets[nombreHoja];
          if (!ws) return;

          const filas = XLSX.utils.sheet_to_json(ws, { defval: '' });
          if (filas.length === 0) return;

          const keys = Object.keys(filas[0]);
          const colDoc = keys.find(k => k.trim().toUpperCase() === 'DOCUMENTO');
          const colGrupo = keys.find(k => k.trim().toUpperCase() === 'GRUPO');

          if (!colDoc || !colGrupo) {
            console.warn(`Hoja "${nombreHoja}" no tiene columnas DOCUMENTO y GRUPO. Columnas: ${keys.join(', ')}`);
            return;
          }

          filas.forEach(fila => {
            const doc = String(fila[colDoc]).trim();
            const grupo = String(fila[colGrupo]).trim().toUpperCase();
            if (gruposFiltro.includes(grupo) && doc && !mapa.has(doc)) {
              mapa.set(doc, grupo);
            }
          });
        });

        if (mapa.size === 0) {
          const hojasEncontradas = wb.SheetNames.join(', ');
          reject(new Error(`No se encontraron estudiantes con los grupos indicados en las hojas MATEMATICAS y COMUNICACION. Hojas en el archivo: ${hojasEncontradas}`));
          return;
        }

        resolve(mapa);
      } catch (err) {
        reject(new Error('Error leyendo el archivo Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsArrayBuffer(archivo);
  });
}

function leerMatriculadosPorHoja(archivo, nombreHoja) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[nombreHoja];

        if (!ws) {
          const hojasEncontradas = wb.SheetNames.join(', ');
          reject(new Error(`No se encontró la hoja "${nombreHoja}". Hojas en el archivo: ${hojasEncontradas}`));
          return;
        }

        const filas = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (filas.length === 0) {
          resolve(new Map());
          return;
        }

        const keys = Object.keys(filas[0]);
        const colDoc = keys.find(k => k.trim().toUpperCase() === 'DOCUMENTO');
        const colGrupo = keys.find(k => k.trim().toUpperCase() === 'GRUPO');

        if (!colDoc || !colGrupo) {
          reject(new Error(`La hoja "${nombreHoja}" no tiene columnas DOCUMENTO y GRUPO. Columnas encontradas: ${keys.join(', ')}`));
          return;
        }

        const mapa = new Map();
        filas.forEach(fila => {
          const doc = String(fila[colDoc]).trim();
          const grupo = String(fila[colGrupo]).trim();
          if (doc && !mapa.has(doc)) {
            mapa.set(doc, grupo);
          }
        });

        resolve(mapa);
      } catch (err) {
        reject(new Error('Error leyendo el archivo Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsArrayBuffer(archivo);
  });
}



async function descargarPorDocumento(event) {
  const inputRaw = document.getElementById('inputDocumentos').value.trim();
  const archivoInput = document.getElementById('archivoMatriculadosDoc');
  const areaSeleccionada = document.querySelector('input[name="areaDoc"]:checked');

  if (!inputRaw) {
    alert('Por favor ingrese al menos un número de documento.');
    return;
  }

  const documentos = inputRaw
    .split(';')
    .map(d => d.trim())
    .filter(d => d.length > 0);

  if (documentos.length === 0) {
    alert('No se encontraron documentos válidos.');
    return;
  }

  const tieneArchivo = archivoInput.files && archivoInput.files.length > 0;

  if (tieneArchivo && !areaSeleccionada) {
    alert('Por favor selecciona un área (Matemáticas o Comunicación) para buscar el grupo.');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Buscando y preparando descarga...';

  try {
    let mapaGrupos = null;

    if (tieneArchivo) {
      mapaGrupos = await leerMatriculadosPorHoja(archivoInput.files[0], areaSeleccionada.value);
    }

    const data = await supabaseQuerySinLimite('formularios', {
      in: { field: 'documento', values: documentos },
      order: 'fecha.asc'
    });

    if (!data || data.length === 0) {
      alert('No se encontraron registros para los documentos ingresados.');
      return;
    }

    generarExcelPorDocumento(data, documentos, mapaGrupos);
    alert(`${data.length} registros descargados exitosamente.`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


function generarExcelPorDocumento(datos, documentos, mapaGrupos) {
  const datosExcel = datos.map(fila => {
    const apellidos = fila.apellidos || '';
    const nombres = fila.nombres || '';
    const apellidosYNombres = `${apellidos} ${nombres}`.trim();
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    const doc = String(fila.documento).trim();
    const grupo = (mapaGrupos && mapaGrupos.get(doc)) || '';

    return {
      'Fecha': serialDate,
      'Documento': parseInt(fila.documento) || '',
      'Apellidos y Nombres': apellidosYNombres,
      'Grupo': grupo,
      'Programa': fila.programa || '',
      'Asignatura': fila.asignatura || '',
      'Tema': fila.tema || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 1);
  for (let row = 1; row <= range.e.r; row++) {
    const docCell = XLSX.utils.encode_cell({ r: row, c: 1 });
    if (ws[docCell]) { ws[docCell].t = 'n'; ws[docCell].z = '0'; }
  }

  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  ws['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 40 },
    { wch: 12 },
    { wch: 35 },
    { wch: 30 },
    { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Por Documento');

  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `PMA_PorDocumento_${fechaHoy}.xlsx`);
}


function generarExcelSimplificado(datos, desde, hasta) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Documento': parseInt(fila.documento),
      'Nombres': fila.nombres,
      'Apellidos': fila.apellidos,
      'Programa': fila.programa,
      'Instructor': fila.instructor,
      'Asignatura': fila.asignatura,
      'Tema': fila.tema
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 2);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 35 }, { wch: 25 }, { wch: 30 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Tutores");

const mesesCortos = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
let sufijo = 'COMPLETO';
if (!desde && hasta) {
  const [, mesH, diaH] = hasta.split('-');
  sufijo = `HASTA_${mesesCortos[parseInt(mesH) - 1]}_${diaH}`;
} else if (desde && hasta) {
  const [, mesD, diaD] = desde.split('-');
  const [, mesH, diaH] = hasta.split('-');
  sufijo = `${mesesCortos[parseInt(mesD)-1]} ${diaD} - ${mesesCortos[parseInt(mesH)-1]} ${diaH}`;
}
XLSX.writeFile(wb, `TUTORES_${sufijo}.xlsx`);
}



function generarExcelCompleto(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Documento': parseInt(fila.documento),
      'Nombres': fila.nombres,
      'Apellidos': fila.apellidos,
      'Facultad': fila.facultad,
      'Programa': fila.programa,
      'Semestre': fila.semestre,
      'Tipo Acompañamiento': fila.tipo_acompanamiento,
      'Título Curso': fila.titulo_curso || '',
      'Sede Estudiante': fila.sede_estudiante || '',
      'Sede Tutoría': fila.sede_tutoria,
      'Tipo Instructor': fila.tipo_instructor,
      'Facultad/Departamento': fila.facultad_departamento || '',
      'Instructor': fila.instructor,
      'Asignatura': fila.asignatura,
      'Tema': fila.tema,
      'Motivo de Consulta': fila.motivo_consulta || '',
      'Calificación': fila.calificacion,
      'Dudas Resueltas': fila.dudas_resueltas || '',
      'Dominio del Tema': fila.dominio_tema || '',
      'Ambiente': fila.ambiente || '',
      'Recomienda PMA': fila.recomienda_pma || '',
      'Sugerencias': fila.sugerencias || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 2);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

ws['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 35 }, { wch: 35 }, { wch: 10 }, { wch: 20 },
    { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 },
    { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Registros Completos");

    const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}


function generarExcelDocentes(datos, desde, hasta) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Documento': parseInt(fila.documento),
      'Nombres': fila.nombres,
      'Apellidos': fila.apellidos,
      'Programa': fila.programa,
      'Facultad/Departamento': fila.facultad_departamento || '',
      'Instructor': fila.instructor,
      'Asignatura': fila.asignatura,
      'Tema': fila.tema
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 2);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 8 },  // Hora
    { wch: 12 }, // Documento
    { wch: 20 }, // Nombres
    { wch: 20 }, // Apellidos
    { wch: 35 }, // Programa
    { wch: 20 }, // Facultad/Departamento
    { wch: 25 }, // Instructor
    { wch: 30 }, // Asignatura
    { wch: 30 }  // Tema
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Docentes");

const mesesCortos = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
let sufijo = 'COMPLETO';
if (!desde && hasta) {
  const [, mesH, diaH] = hasta.split('-');
  sufijo = `HASTA_${mesesCortos[parseInt(mesH) - 1]}_${diaH}`;
} else if (desde && hasta) {
  const [, mesD, diaD] = desde.split('-');
  const [, mesH, diaH] = hasta.split('-');
  sufijo = `${mesesCortos[parseInt(mesD)-1]} ${diaD} - ${mesesCortos[parseInt(mesH)-1]} ${diaH}`;
}
XLSX.writeFile(wb, `DOCENTES_${sufijo}.xlsx`);
}



async function cerrarSesionAdmin() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Error cerrando sesión:', error);
    }
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  } finally {
    location.reload();
  }
}

async function verificarSesionAdmin() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      const { data: adminData } = await supabaseClient
        .from('admin_usuarios')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();

      if (adminData) {
        mostrarPantalla('pantallaAdmin');
        history.pushState({ adminPanel: true }, '', window.location.href);
        return;
      } else {
        await supabaseClient.auth.signOut();
      }
    }
    mostrarPantalla('pantallaAdminLogin');

  } catch (error) {
    console.error('Error verificando sesión:', error);
    mostrarPantalla('pantallaAdminLogin');
  }
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


function togglePassword() {
  const input = document.getElementById('adminContrasena');
  const icon = document.getElementById('iconPassword');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  }
}


async function descargarAAATodo() {
  const btnDescarga = document.getElementById('btnDescargarAAATodo');
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Cargando vista previa...';

  try {
    const data = await supabaseQuerySinLimite('acompanamiento', { order: 'fecha_hora.asc' });

    if (!data || data.length === 0) {
      alert('No hay registros de AAA para descargar');
      return;
    }

    // Guardar datos para usar al confirmar
    window.datosAAADescarga = data;

    // Llenar tabla preview con los últimos 8
    const ultimos5 = data.slice(-5);
    const tbody = document.getElementById('cuerpoPreviewAAA');
    tbody.innerHTML = '';

    ultimos5.forEach(fila => {
      const fechaColombia = convertirFechaAColombia(fila.fecha_hora);
      const fechaStr = fechaColombia.toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit', month: '2-digit', year: 'numeric'
      });

      
      const tr = document.createElement('tr');
      tr.innerHTML = `
  <td class="tabla-tutor-num">${fechaStr}</td>
  <td class="tabla-tutor-num">${fila.tipo_acompanamiento || ''}</td>
  <td class="tabla-tutor-nombre">${fila.nombres_y_apellidos || ''}</td>
  <td class="tabla-tutor-num">${fila.grupo || ''}</td>
  <td class="tabla-tutor-nombre">${fila.profesor || ''}</td>
  <td class="tabla-tutor-nombre">${fila.asignatura || ''}</td>
`;
      tbody.appendChild(tr);
    });

    document.getElementById('totalPreviewAAA').textContent =
      `Total de Registros a Descargar: ${data.length} — Mostrando los Últimos ${ultimos5.length}`;

    document.getElementById('modalPreviewAAA').classList.remove('hidden');

  } catch (error) {
    alert('Error al cargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function confirmarDescargaAAA() {
  cerrarModalPreviewAAA();
  const data = window.datosAAADescarga;
  if (!data || data.length === 0) return;
  generarExcelAAACompleto(data, 'AAA_Completo');
  alert(`${data.length} registros de AAA descargados exitosamente`);
}

function cerrarModalPreviewAAA() {
  document.getElementById('modalPreviewAAA').classList.add('hidden');
}


function generarExcelAAACompleto(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha_hora);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Tipo Acompañamiento': fila.tipo_acompanamiento || '',
      'Documento': fila.documento ? parseInt(fila.documento) : '',
      'Nombres y Apellidos': fila.nombres_y_apellidos || '',
      'Contacto': fila.contacto || '',
      'Correo Estudiante': fila.correo_estudiante || '',
      'Grupo': fila.grupo || '',
      'Sede': fila.sede || '',
      'Facultad': fila.facultad_estudiante || '',
      'Programa': fila.programa_estudiante || '',
      'Semestre': fila.semestre || '',
      'Enterado': fila.enterado || '',
      'Profesor': fila.profesor || '',
      'Cargo': fila.cargo || '',
      'Dependencia': fila.dependencia || '',
      'Correo Profesor': fila.correo_profesor || '',
      'Asignatura': fila.asignatura || '',
      'Motivo': fila.motivo || '',
      'Comentarios': fila.comentarios || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 3);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 },  // Fecha
    { wch: 8 },   // Hora
    { wch: 18 },  // Tipo Acompañamiento
    { wch: 12 },  // Documento
    { wch: 30 },  // Nombres y Apellidos
    { wch: 15 },  // Contacto
    { wch: 35 },  // Correo Estudiante
    { wch: 12 },  // Grupo
    { wch: 10 },  // Sede
    { wch: 40 },  // Facultad
    { wch: 35 },  // Programa
    { wch: 10 },  // Semestre
    { wch: 10 },  // Enterado
    { wch: 30 },  // Profesor
    { wch: 30 },  // Cargo
    { wch: 35 },  // Dependencia
    { wch: 35 },  // Correo Profesor
    { wch: 40 },  // Asignatura
    { wch: 50 },  // Motivo
    { wch: 50 }   // Comentarios
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Todos");

  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}


async function descargarPVU() {
  const btnDescarga = document.getElementById('btnDescargarPVU');
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
const data = await supabaseQuerySinLimite('pvu', { order: 'fecha.asc' });    
    if (data.length === 0) {
      alert('No hay registros de PVU para descargar');
      return;
    }

    generarExcelPVU(data, 'PVU_Registros');
    alert(`${data.length} registros de PVU descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function generarExcelPVU(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Fecha de Asistencia': fila.fecha_asistencia || '',
      'Horario de Asistencia': fila.horario || '',
      'Documento': parseInt(fila.documento) || '',
      'Nombres': fila.nombres || '',
      'Apellidos': fila.apellidos || '',
      'Correo': fila.correo || '',
      'Programa': fila.programa || '',
      'Sede': fila.sede || '',
      'Jornada': fila.jornada || '',
      'Satisfaccion': fila.satisfaccion || '',
      'Comentario': fila.comentario || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 4);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 },  // Fecha
    { wch: 8 },   // Hora
    { wch: 18 },  // Fecha de Asistencia
    { wch: 16 },  // Horario de Asistencia
    { wch: 12 },  // Documento
    { wch: 20 },  // Nombres
    { wch: 20 },  // Apellidos
    { wch: 35 },  // Correo
    { wch: 45 },  // Programa
    { wch: 10 },  // Sede
    { wch: 12 },  // Jornada
    { wch: 12 },  // Satisfaccion
    { wch: 40 }   // Comentario
  ];

  XLSX.utils.book_append_sheet(wb, ws, "PVU");

  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}

function actualizarGrafica() {
  const periodo = document.getElementById('filtroGraficaPeriodo').value;
  const tipoInstructor = document.getElementById('filtroGraficaTipo').value;
  
  const data = window.datosFormulariosGlobal;
  if (!data || data.length === 0) return;

  let datosFiltrados = tipoInstructor !== 'todos'
  ? data.filter(item => item.tipo_instructor === tipoInstructor)
  : data;

const filtroSedeWrapper = document.getElementById('filtroSedeWrapper');
const sede = document.getElementById('filtroGraficaSede').value;

if (tipoInstructor === 'Profesor') {
  filtroSedeWrapper.style.display = 'none';
} else {
  filtroSedeWrapper.style.display = '';
  if (sede !== 'todas') {
    datosFiltrados = datosFiltrados.filter(item => item.sede_tutoria === sede);
  }
}

  if (datosFiltrados.length === 0) {
    renderGrafica(['Sin datos'], [0]);
    return;
  }

  const itemsConFecha = datosFiltrados.map(item => ({
    fecha: convertirFechaAColombia(item.fecha)
  }));

  let labels = [];
  let valores = [];

  if (periodo === 'semanal') {
    function obtenerLunes(fecha) {
      const dia = fecha.getDay();
      const diff = dia === 0 ? -6 : 1 - dia;
      const lunes = new Date(fecha);
      lunes.setDate(fecha.getDate() + diff);
      lunes.setHours(0, 0, 0, 0);
      return lunes;
    }

    const semanas = new Map(); 

    itemsConFecha.forEach(({ fecha }) => {
      const lunes = obtenerLunes(fecha);
      const key = lunes.getTime();
      if (!semanas.has(key)) {
        const domingo = new Date(lunes);
        domingo.setDate(domingo.getDate() + 6);
        const fmt = d =>
          `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
        semanas.set(key, { label: `${fmt(lunes)} - ${fmt(domingo)}`, cantidad: 0 });
      }
      semanas.get(key).cantidad++;
    });

    const ordenadas = [...semanas.entries()].sort((a, b) => a[0] - b[0]);
    labels = ordenadas.map(([, v]) => v.label);
    valores = ordenadas.map(([, v]) => v.cantidad);

  } else if (periodo === 'mensual') {
    const meses = new Map();
    const nombresMesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    itemsConFecha.forEach(({ fecha }) => {
      const mes = fecha.getMonth();
      const año = fecha.getFullYear();
      const key = `${año}-${String(mes + 1).padStart(2, '0')}`;
      if (!meses.has(key)) {
        meses.set(key, { label: `${nombresMesesCortos[mes]} ${año}`, cantidad: 0 });
      }
      meses.get(key).cantidad++;
    });

    const ordenadas = [...meses.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    labels = ordenadas.map(([, v]) => v.label);
    valores = ordenadas.map(([, v]) => v.cantidad);
  }

  renderGrafica(labels, valores);
}

function renderGrafica(labels, valores) {
  if (graficoTutorias) graficoTutorias.destroy();

  const ctx = document.getElementById('graficaTutorias').getContext('2d');
  graficoTutorias = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Cantidad de tutorías',
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
            label: ctx => ctx.parsed.y + ' tutoría' + (ctx.parsed.y !== 1 ? 's' : '')
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
  document.getElementById('tabDescargasAAA').classList.remove('hidden');
}

async function cargarEstadisticasPVU() {
  const statsGridPVU = document.getElementById('statsGridPVU');
  const detallesStatsPVU = document.getElementById('detallesStatsPVU');
  if (statsGridPVU) {
    statsGridPVU.textContent = '';
    const loader = document.createElement('div');
    loader.className = 'loader';
    statsGridPVU.appendChild(loader);
  }
  if (detallesStatsPVU) {
    detallesStatsPVU.textContent = '';
  }
  
  try {
const data = await supabaseQuerySinLimite('pvu', { order: 'fecha.asc' });

    if (data.length === 0) {
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
    window.datosPVUGlobal = data;
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

async function supabaseQuerySinLimite(tabla, opciones = {}) {
  const pageSize = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${tabla}`);
    if (opciones.order) url.searchParams.set('order', opciones.order);
    if (opciones.eq) url.searchParams.set(opciones.eq.field, `eq.${opciones.eq.value}`);
    if (opciones.ilike) url.searchParams.set(opciones.ilike.field, `ilike.${opciones.ilike.value}`);
    if (opciones.gte) url.searchParams.append(opciones.gte.field, `gte.${opciones.gte.value}`);
    if (opciones.lte) url.searchParams.append(opciones.lte.field, `lte.${opciones.lte.value}`);
    if (opciones.in) {
      const { field, values } = opciones.in;
      url.searchParams.set(field, `in.(${values.join(',')})`);
    }

    const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

let response;
try {
  response = await fetch(url.toString(), {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Range': `${from}-${from + pageSize - 1}`,
      'Range-Unit': 'items'
    },
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error de base de datos: ${errorData.message || response.status}`);
    }

    const page = await response.json();
    if (!Array.isArray(page)) break;
    allData = allData.concat(page);

    if (page.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return allData;
}

function mostrarEstadisticasPVU() {
  const data = window.datosPVUGlobal;
  const statsGridPVU = document.getElementById('statsGridPVU');
  const detallesStatsPVU = document.getElementById('detallesStatsPVU');
  
  if (!data || data.length === 0) {
    if (statsGridPVU) {
      statsGridPVU.innerHTML = '<p style="text-align: center; color: #666;">No hay datos disponibles aún.</p>';
    }
    return;
  }
  
  const totalRegistros = data.length;
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




async function descargarInforme(event) {
  const desde = document.getElementById('fechaDesdeInforme').value;
  const hasta = document.getElementById('fechaHastaInforme').value;

  if (desde && !hasta) {
    alert('Si selecciona una Fecha Desde, también debe seleccionar una Fecha Hasta.');
    return;
  }

  if (desde && hasta && new Date(desde) > new Date(hasta)) {
    alert('La fecha inicial no puede ser mayor que la fecha final.');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const [tutoresNorte, tutoresSur] = await Promise.all([
      supabaseQuerySinLimite('tutores_norte', {}),
      supabaseQuerySinLimite('tutores_sur', {})
    ]);

    const areasPorInstructor = {};
    [...tutoresNorte, ...tutoresSur].forEach(t => {
      if (t.nombre && t.area) {
        areasPorInstructor[t.nombre.trim()] = t.area.trim().toUpperCase();
      }
    });

    const AREAS_PERMITIDAS = new Set(['M', 'C']);

    const opcionesQuery = { order: 'fecha.asc' };

    if (!desde && hasta) {
      opcionesQuery.lte = {
        field: 'fecha',
        value: convertirFechaInputAISOColombia(hasta, '23:59:59')
      };
    } else if (desde && hasta) {
      opcionesQuery.gte = {
        field: 'fecha',
        value: convertirFechaInputAISOColombia(desde, '00:00:00')
      };
      opcionesQuery.lte = {
        field: 'fecha',
        value: convertirFechaInputAISOColombia(hasta, '23:59:59')
      };
    }

    const data = await supabaseQuerySinLimite('formularios', opcionesQuery);

    if (!data || data.length === 0) {
      alert('No hay registros para el período seleccionado.');
      return;
    }

    const datosFiltrados = data.filter(fila => {
      const instructor = (fila.instructor || '').trim();
      const area = areasPorInstructor[instructor];
      const esDCB = (fila.facultad_departamento || '').trim().toUpperCase() === 'DCB';
      return esDCB || (area && AREAS_PERMITIDAS.has(area));
    });

    if (datosFiltrados.length === 0) {
      alert('No hay registros con instructores de las áreas M, C o DCB en el período seleccionado.');
      return;
    }

    generarExcelInforme(datosFiltrados, areasPorInstructor, desde, hasta);
    alert(`${datosFiltrados.length} registros descargados exitosamente.`);

  } catch (error) {
    alert('Error al descargar el informe: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function generarExcelInforme(datos, areasPorInstructor, desde, hasta) {

  const acentos = {
    'ADMINISTRACION': 'ADMINISTRACIÓN',
    'ALGEBRA': 'ÁLGEBRA',
    'ANATOMIA': 'ANATOMÍA',
    'AUDITORIA': 'AUDITORÍA',
    'BASICAS': 'BÁSICAS',
    'BIOLOGIA': 'BIOLOGÍA',
    'CALCULO': 'CÁLCULO',
    'CIUDADANIA': 'CIUDADANÍA',
    'COMUNICACION': 'COMUNICACIÓN',
    'CONSTITUCION': 'CONSTITUCIÓN',
    'CONTADURIA': 'CONTADURÍA',
    'ECONOMIA': 'ECONOMÍA',
    'ECOLOGIA': 'ECOLOGÍA',
    'EDUCACION': 'EDUCACIÓN',
    'ELECTRONICA': 'ELECTRÓNICA',
    'ESTADISTICA': 'ESTADÍSTICA',
    'ETICA': 'ÉTICA',
    'FISICA': 'FÍSICA',
    'FISIOLOGIA': 'FISIOLOGÍA',
    'GESTION': 'GESTIÓN',
    'INFORMACION': 'INFORMACIÓN',
    'INGENIERIA': 'INGENIERÍA',
    'INGENIERIAS': 'INGENIERÍA',
    'LEGISLACION': 'LEGISLACIÓN',
    'LOGICA': 'LÓGICA',
    'MATEMATICA': 'MATEMÁTICA',
    'MATEMATICAS': 'MATEMÁTICAS',
    'MECATRONICA': 'MECATRÓNICA',
    'ORGANIZACION': 'ORGANIZACIÓN',
    'PLANEACION': 'PLANEACIÓN',
    'POLITICA': 'POLÍTICA',
    'PRODUCCION': 'PRODUCCIÓN',
    'QUIMICA': 'QUÍMICA',
    'SOCIOLOGIA': 'SOCIOLOGÍA',
    'EVALUACION': 'EVALUACIÓN',
    'TECNOLOGIA': 'TECNOLOGÍA',
    'TEORIA': 'TEORÍA'
  };

  function corregirAcentos(texto) {
    if (!texto) return '';
    return texto
      .split(' ')
      .map(palabra => acentos[palabra.toUpperCase()] || palabra)
      .join(' ');
  }

  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    const instructor = (fila.instructor || '').trim();
    const area = areasPorInstructor[instructor] ||
      ((fila.facultad_departamento || '').trim().toUpperCase() === 'DCB' ? 'DCB' : '');

    return {
      'FECHA': serialDate,
      'DOCUMENTO': parseInt(fila.documento) || '',
      'NOMBRE': `${(fila.apellidos || '').trim()} ${(fila.nombres || '').trim()}`.trim(),
      'FACULTAD': corregirAcentos(fila.facultad || ''),
      'PROGRAMA': corregirAcentos(fila.programa || ''),
      'SEDE ESTUDIANTE': fila.sede_estudiante || '',
      'AREA': area,
      'TEMA': corregirAcentos(fila.tema || ''),
      'MOTIVO DE CONSULTA': fila.motivo_consulta || '',
      'CALIFICACION': fila.calificacion || '',
      'DUDAS RESUELTAS': fila.dudas_resueltas || '',
      'DOMINIO TEMA': fila.dominio_tema || '',
      'AMBIENTE': fila.ambiente || '',
      'RECOMIENDA PMA': fila.recomienda_pma || '',
      'SUGERENCIAS': fila.sugerencias || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 1);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 },  // FECHA
    { wch: 12 },  // DOCUMENTO
    { wch: 35 },  // NOMBRE
    { wch: 35 },  // FACULTAD
    { wch: 35 },  // PROGRAMA
    { wch: 15 },  // SEDE ESTUDIANTE
    { wch: 8 },   // ÁREA
    { wch: 30 },  // TEMA
    { wch: 25 },  // MOTIVO DE CONSULTA
    { wch: 13 },  // CALIFICACIÓN
    { wch: 16 },  // DUDAS RESUELTAS
    { wch: 14 },  // DOMINIO TEMA
    { wch: 12 },  // AMBIENTE
    { wch: 15 },  // RECOMIENDA PMA
    { wch: 40 }   // SUGERENCIAS
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'INFORME');

  const mesesCortos = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  let sufijo = 'COMPLETO';
  if (!desde && hasta) {
    const [, mesH, diaH] = hasta.split('-');
    sufijo = `HASTA_${mesesCortos[parseInt(mesH) - 1]}_${diaH}`;
  } else if (desde && hasta) {
    const [, mesD, diaD] = desde.split('-');
    const [, mesH, diaH] = hasta.split('-');
    sufijo = `${mesesCortos[parseInt(mesD) - 1]} ${diaD} - ${mesesCortos[parseInt(mesH) - 1]} ${diaH}`;
  }

  XLSX.writeFile(wb, `INFORME_${sufijo}.xlsx`);
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


//INFORME FINAL DE SEMESTRE


async function descargarPDF() {
  const btn = document.querySelector('[onclick="descargarPDF()"]');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generando PDF...';

  try {
    await precargarDatosEstadisticas();
    const dataFormularios = await obtenerFormulariosCache();
    window.datosFormulariosGlobal = dataFormularios;
    invalidarCacheEstadisticas();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    function checkY(espacioNecesario) {
      if (y + espacioNecesario > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
    }

    function dibujarSeccion(titulo) {
  if (y + 28 > pageH - margin) {
    pdf.addPage();
    y = margin;
  }
  y += 6;
  pdf.setFillColor(30, 60, 114);
  pdf.rect(margin, y, contentW, 10, 'F');
  pdf.setFontSize(13);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(titulo, margin + 4, y + 7);
  pdf.setTextColor(0, 0, 0);
  y += 16;
}

    function dibujarSubtitulo(texto) {
  if (y + 20 > pageH - margin) {
    pdf.addPage();
    y = margin;
  }
  y += 8;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 60, 114);
  pdf.text(texto, margin, y);
  pdf.setTextColor(0, 0, 0);
  y += 8;
}

    function dibujarTarjetas(tarjetas) {
      checkY(22);
      const tw = contentW / tarjetas.length;
      tarjetas.forEach((t, i) => {
        const x = margin + tw * i;
        pdf.setFillColor(240, 244, 255);
        pdf.setDrawColor(197, 208, 232);
        pdf.roundedRect(x + 2, y, tw - 4, 18, 2, 2, 'FD');
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 60, 114);
        pdf.text(String(t.valor), x + tw / 2, y + 8, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text(t.etiqueta, x + tw / 2, y + 14, { align: 'center' });
      });
      pdf.setTextColor(0, 0, 0);
      y += 24;
    }

    function dibujarListaBarras(items, total) {
      items.forEach(([nombre, cantidad]) => {
        checkY(8);
        const pct = ((cantidad / total) * 100).toFixed(1);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        const nombreCorto = nombre.length > 55 ? nombre.substring(0, 52) + '...' : nombre;
        pdf.text(nombreCorto, margin, y);
        const barX = margin + 120;
        const barW = 40;
        const barH = 4;
        pdf.setFillColor(230, 236, 245);
        pdf.rect(barX, y - 4, barW, barH, 'F');
        pdf.setFillColor(30, 60, 114);
        pdf.rect(barX, y - 4, Math.max(0.5, (parseFloat(pct) / 100) * barW), barH, 'F');
        pdf.setTextColor(30, 60, 114);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${cantidad} (${pct}%)`, barX + barW + 3, y);
        pdf.setTextColor(0, 0, 0);
        y += 7;
      });
      y += 3;
    }

    function dibujarTabla(headers, filas, colWidths) {
  const rowH = 7;
  const headerH = 8;
  const totalW = contentW;
  const widths = colWidths || headers.map(() => totalW / headers.length);

  // Detectar si hay columna "Tutor" para forzar alineación izquierda
  const indicesTutor = headers.map((h, i) => h === 'Tutor' ? i : -1).filter(i => i !== -1);

  function dibujarHeader() {
    pdf.setFillColor(30, 60, 114);
    pdf.rect(margin, y, totalW, headerH, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    let xPos = margin;
    headers.forEach((h, i) => {
      const align = (i === 0 || indicesTutor.includes(i)) ? 'left' : 'center';
      const x = align === 'left' ? xPos + 3 : xPos + widths[i] / 2;
      pdf.text(h, x, y + 5.5, { align });
      xPos += widths[i];
    });
    y += headerH;
  }

  const espacioHeader = headerH + rowH;
  if (y + espacioHeader > pageH - margin) {
    pdf.addPage(); y = margin;
  }
  dibujarHeader();

  filas.forEach((fila, ri) => {
    if (y + rowH > pageH - margin) {
      pdf.addPage(); y = margin;
      dibujarHeader();
    }
    const bg = ri % 2 === 0 ? [248, 249, 255] : [255, 255, 255];
    pdf.setFillColor(...bg);
    pdf.rect(margin, y, totalW, rowH, 'F');
    pdf.setDrawColor(224, 224, 224);
    pdf.line(margin, y + rowH, margin + totalW, y + rowH);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);
    let xPos = margin;
    fila.forEach((celda, i) => {
      const align = (i === 0 || indicesTutor.includes(i)) ? 'left' : 'center';
      const x = align === 'left' ? xPos + 3 : xPos + widths[i] / 2;
      const texto = String(celda);
      const textoCorto = texto.length > 45 ? texto.substring(0, 42) + '...' : texto;
      pdf.text(textoCorto, x, y + 5, { align });
      xPos += widths[i];
    });
    y += rowH;
  });

  pdf.setDrawColor(0, 0, 0);
  y += 6;
}

    function generarGraficaCanvas(datos, titulo) {
      const meses = new Map();
      const nombresMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      datos.forEach(item => {
        const fecha = convertirFechaAColombia(item.fecha);
        const mes = fecha.getMonth();
        const año = fecha.getFullYear();
        const key = `${año}-${String(mes+1).padStart(2,'0')}`;
        if (!meses.has(key)) meses.set(key, { label: `${nombresMeses[mes]} ${año}`, cantidad: 0 });
        meses.get(key).cantidad++;
      });
      const ordenadas = [...meses.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const labels = ordenadas.map(([, v]) => v.label);
      const valores = ordenadas.map(([, v]) => v.cantidad);

      const canvas = document.createElement('canvas');
      canvas.width = 820; canvas.height = 300;
      const ctx = canvas.getContext('2d');
      const padL = 50, padR = 20, padT = 40, padB = 70;
      const w = canvas.width - padL - padR;
      const h = canvas.height - padT - padB;
      const maxVal = Math.max(...valores, 1);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e3c72';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(titulo, canvas.width / 2, 22);

      const pasos = 5;
      for (let i = 0; i <= pasos; i++) {
        const yG = padT + h - (i / pasos) * h;
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, yG); ctx.lineTo(padL + w, yG); ctx.stroke();
        ctx.fillStyle = '#888'; ctx.font = '10px Arial'; ctx.textAlign = 'right';
        ctx.fillText(Math.round((maxVal / pasos) * i), padL - 6, yG + 4);
      }

      const gap = w / Math.max(labels.length, 1);
      const barW = Math.min(40, gap * 0.6);
      valores.forEach((val, i) => {
        const x = padL + gap * i + gap / 2 - barW / 2;
        const barH = (val / maxVal) * h;
        const yB = padT + h - barH;
        ctx.fillStyle = 'rgba(30,60,114,0.8)';
        ctx.fillRect(x, yB, barW, barH);
        ctx.fillStyle = '#1e3c72'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(val, x + barW / 2, yB - 5);
      });

      ctx.fillStyle = '#555'; ctx.font = '9px Arial';
      labels.forEach((lbl, i) => {
        const x = padL + gap * i + gap / 2;
        ctx.save(); ctx.translate(x, padT + h + 12);
        ctx.rotate(-Math.PI / 4); ctx.textAlign = 'right';
        ctx.fillText(lbl, 0, 0); ctx.restore();
      });

      return canvas;
    }

    function agregarGraficaPDF(canvasGrafica) {
      pdf.addPage();
      y = margin;
      const gW = contentW;
      const gH = (canvasGrafica.height * gW) / canvasGrafica.width;
      pdf.addImage(canvasGrafica.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, gW, gH);
      y += gH + 8;
    }

    // ── CALCULAR DATOS
    const datosTodos = dataFormularios;
    const datosTutores = datosTodos.filter(i => i.tipo_instructor === 'Tutor');
    const datosProfesores = datosTodos.filter(i => i.tipo_instructor === 'Profesor');

    function calcularStats(datos, tipo) {
      const stats = { total: datos.length, sedesTutorias: {}, calificacionesPorInstructor: {}, facultadDepartamento: {}, sumaCalificacionesTotal: 0, sumaCalificacionesPMA: 0 };
      const estudiantesUnicos = new Set();
      const materiasCuenta = {}, semestresCuenta = {}, programasCuenta = {}, facultadesCuenta = {}, motivosCuenta = {};
      const tutoriasPorInstructor = {}, documentosPorInstructor = {};
      const profesoresPorFacultad = {}, documentosPorFacultadProfesor = {};

      datos.forEach(item => {
        const instructor = item.instructor;
        const sede = item.sede_tutoria;
        stats.sedesTutorias[sede] = (stats.sedesTutorias[sede] || 0) + 1;
        const cal = item.calificacion || 0, dud = item.dudas_resueltas || 0, dom = item.dominio_tema || 0;
        const amb = item.ambiente || 0, rec = item.recomienda_pma || 0;
        const promT = (cal + dud + dom) / 3;
        const promPMA = (cal + dud + dom + amb + rec) / 5;
        if (!stats.calificacionesPorInstructor[instructor]) stats.calificacionesPorInstructor[instructor] = { suma: 0, cantidad: 0 };
        stats.calificacionesPorInstructor[instructor].suma += promT;
        stats.calificacionesPorInstructor[instructor].cantidad += 1;
        stats.sumaCalificacionesTotal += promT;
        stats.sumaCalificacionesPMA += promPMA;

        if (tipo === 'general') {
          estudiantesUnicos.add(item.documento);
          materiasCuenta[item.asignatura || 'Sin especificar'] = (materiasCuenta[item.asignatura || 'Sin especificar'] || 0) + 1;
          semestresCuenta[item.semestre || 'Sin especificar'] = (semestresCuenta[item.semestre || 'Sin especificar'] || 0) + 1;
          programasCuenta[item.programa || 'Sin especificar'] = (programasCuenta[item.programa || 'Sin especificar'] || 0) + 1;
          facultadesCuenta[item.facultad || 'Sin especificar'] = (facultadesCuenta[item.facultad || 'Sin especificar'] || 0) + 1;
          motivosCuenta[item.motivo_consulta || 'Sin especificar'] = (motivosCuenta[item.motivo_consulta || 'Sin especificar'] || 0) + 1;
        }
        if (tipo === 'tutores' && instructor) {
          tutoriasPorInstructor[instructor] = (tutoriasPorInstructor[instructor] || 0) + 1;
          if (!documentosPorInstructor[instructor]) documentosPorInstructor[instructor] = new Set();
          const doc = item.documento != null ? String(item.documento).trim() : '';
          if (doc) documentosPorInstructor[instructor].add(doc);
        }
        if (tipo === 'profesores') {
          if (item.facultad_departamento) stats.facultadDepartamento[item.facultad_departamento] = (stats.facultadDepartamento[item.facultad_departamento] || 0) + 1;
          const fac = item.facultad_departamento || 'Sin Facultad';
          if (instructor) {
            if (!profesoresPorFacultad[fac]) profesoresPorFacultad[fac] = {};
            profesoresPorFacultad[fac][instructor] = (profesoresPorFacultad[fac][instructor] || 0) + 1;
            if (!documentosPorFacultadProfesor[fac]) documentosPorFacultadProfesor[fac] = {};
            if (!documentosPorFacultadProfesor[fac][instructor]) documentosPorFacultadProfesor[fac][instructor] = new Set();
            const doc = item.documento != null ? String(item.documento).trim() : '';
            if (doc) documentosPorFacultadProfesor[fac][instructor].add(doc);
          }
        }
      });

      const promediosPorInstructor = {};
      Object.keys(stats.calificacionesPorInstructor).forEach(inst => {
        const info = stats.calificacionesPorInstructor[inst];
        promediosPorInstructor[inst] = (info.suma / info.cantidad).toFixed(2);
      });

      return { stats, estudiantesUnicos, materiasCuenta, semestresCuenta, programasCuenta, facultadesCuenta, motivosCuenta, tutoriasPorInstructor, documentosPorInstructor, profesoresPorFacultad, documentosPorFacultadProfesor, promediosPorInstructor };
    }

    function calcularRankingPDF(datosFiltrados, promediosPorInstructor) {
      const wT = 0.35, wB = 0.45, wC = 0.20;
      const tutoriasPorInst = {}, docsPorInst = {};
      datosFiltrados.forEach(item => {
        const inst = item.instructor; if (!inst) return;
        tutoriasPorInst[inst] = (tutoriasPorInst[inst] || 0) + 1;
        if (!docsPorInst[inst]) docsPorInst[inst] = new Set();
        const doc = item.documento != null ? String(item.documento).trim() : '';
        if (doc) docsPorInst[inst].add(doc);
      });
      const datos = Object.keys(tutoriasPorInst).map(nombre => ({
        nombre, tutorias: tutoriasPorInst[nombre], beneficiados: docsPorInst[nombre]?.size || 0, calificacion: parseFloat(promediosPorInstructor[nombre] || 0)
      }));
      function rankGrupo(grupo) {
        if (!grupo.length) return [];
        const maxT = Math.max(...grupo.map(d => d.tutorias));
        const maxB = Math.max(...grupo.map(d => d.beneficiados));
        const maxC = Math.max(...grupo.map(d => d.calificacion));
        return grupo.map(d => ({
          ...d,
          puntaje: ((maxT > 0 ? (d.tutorias/maxT)*100 : 0) * wT) + ((maxB > 0 ? (d.beneficiados/maxB)*100 : 0) * wB) + ((maxC > 0 ? (d.calificacion/maxC)*100 : 0) * wC)
        })).sort((a, b) => b.puntaje - a.puntaje);
      }
      return {
        norte: rankGrupo(datos.filter(d => datosCache.tutoresNorte.some(t => t.nombre === d.nombre))),
        sur: rankGrupo(datos.filter(d => datosCache.tutoresSur.some(t => t.nombre === d.nombre)))
      };
    }

    const stGeneral = calcularStats(datosTodos, 'general');
    const stTutores = calcularStats(datosTutores, 'tutores');
    const stProfesores = calcularStats(datosProfesores, 'profesores');


    // SECCIÓN 1 — ESTADÍSTICAS GENERALES

    dibujarSeccion('ESTADÍSTICAS GENERALES');

    dibujarTarjetas([
      { valor: stGeneral.stats.total, etiqueta: 'Total de Registros' },
      { valor: stGeneral.estudiantesUnicos.size, etiqueta: 'Beneficiados' },
      { valor: (stGeneral.stats.sumaCalificacionesPMA / stGeneral.stats.total).toFixed(2), etiqueta: 'Calificación PMA' }
    ]);

    const top5Mat = Object.entries(stGeneral.materiasCuenta).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const top5Sem = Object.entries(stGeneral.semestresCuenta).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const top5Prog = Object.entries(stGeneral.programasCuenta).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const todasFac = Object.entries(stGeneral.facultadesCuenta).sort((a,b)=>b[1]-a[1]);
    const todosMotivos = Object.entries(stGeneral.motivosCuenta).sort((a,b)=>b[1]-a[1]);

    dibujarSubtitulo('Top 5 Materias con Más Tutorías');
    dibujarListaBarras(top5Mat, stGeneral.stats.total);
    dibujarSubtitulo('Top 5 Semestres con Más Tutorías');
    dibujarListaBarras(top5Sem.map(([s,c]) => [s === 'Sin especificar' ? s : `Semestre ${s}`, c]), stGeneral.stats.total);
    dibujarSubtitulo('Facultades con Más Tutorías');
    dibujarListaBarras(todasFac, stGeneral.stats.total);
    dibujarSubtitulo('Top 5 Programas con Más Tutorías');
    dibujarListaBarras(top5Prog, stGeneral.stats.total);
    dibujarSubtitulo('Motivos de Consulta');
    dibujarListaBarras(todosMotivos, stGeneral.stats.total);

  
    // SECCIÓN 2 — ESTADÍSTICAS DE TUTORES

    pdf.addPage(); y = margin;
    dibujarSeccion('ESTADÍSTICAS DE TUTORES');

    dibujarTarjetas([
      { valor: stTutores.stats.total, etiqueta: 'Total Tutorías' },
      { valor: (stTutores.stats.sumaCalificacionesTotal / stTutores.stats.total).toFixed(2), etiqueta: 'Calificación Promedio' }
    ]);

    dibujarSubtitulo('Cantidad de Tutorías por Sede');
    dibujarTabla(
      ['Sede', 'Cantidad', '%'],
      Object.entries(stTutores.stats.sedesTutorias).sort((a,b)=>b[1]-a[1]).map(([sede, cant]) => [
        sede, cant, ((cant / stTutores.stats.total) * 100).toFixed(1) + '%'
      ]),
      [contentW * 0.5, contentW * 0.25, contentW * 0.25]
    );

    dibujarSubtitulo('Tutores de Sede Norte');
    const tutoresNorteData = Object.entries(stTutores.tutoriasPorInstructor)
      .filter(([inst]) => datosCache.tutoresNorte.some(t => t.nombre === inst))
      .sort((a,b) => b[1]-a[1]);
    dibujarTabla(
      ['Nombre del Tutor', 'Tutorías', 'Beneficiados', 'Calificación'],
      tutoresNorteData.map(([inst, cant]) => [
        inst, cant,
        stTutores.documentosPorInstructor[inst]?.size || 0,
        stTutores.promediosPorInstructor[inst] || 'N/A'
      ]),
      [contentW * 0.55, contentW * 0.15, contentW * 0.15, contentW * 0.15]
    );

    pdf.addPage(); y = margin;
    dibujarSubtitulo('Tutores de Sede Sur');
    const tutoresSurData = Object.entries(stTutores.tutoriasPorInstructor)
      .filter(([inst]) => datosCache.tutoresSur.some(t => t.nombre === inst))
      .sort((a,b) => b[1]-a[1]);
    dibujarTabla(
      ['Nombre del Tutor', 'Tutorías', 'Beneficiados', 'Calificación'],
      tutoresSurData.map(([inst, cant]) => [
        inst, cant,
        stTutores.documentosPorInstructor[inst]?.size || 0,
        stTutores.promediosPorInstructor[inst] || 'N/A'
      ]),
      [contentW * 0.55, contentW * 0.15, contentW * 0.15, contentW * 0.15]
    );

    const ranking = calcularRankingPDF(datosTutores, stTutores.promediosPorInstructor);
    pdf.addPage(); y = margin;
    dibujarSubtitulo('Ranking Mejor Tutor');
    checkY(8);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(`${ranking.pesoT !== undefined ? ranking.pesoT : 35}% Cantidad de Tutorías`, margin, y); y += 5;
    pdf.text(`${ranking.pesoB !== undefined ? ranking.pesoB : 45}% Cantidad de Beneficiados`, margin, y); y += 5;
    pdf.text(`${ranking.pesoC !== undefined ? ranking.pesoC : 20}% Calificación`, margin, y); y += 8;
    pdf.setTextColor(0, 0, 0);

    dibujarSubtitulo('Sede Norte');
    dibujarTabla(
      ['#', 'Tutor', 'Puntaje'],
      ranking.norte.map((d, i) => [i+1, d.nombre, d.puntaje.toFixed(2) + '%']),
      [contentW * 0.08, contentW * 0.72, contentW * 0.20]
    );

    pdf.addPage(); y = margin;
    dibujarSubtitulo('Ranking Mejor Tutor');
    checkY(8);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('35% Cantidad de Tutorías', margin, y); y += 5;
    pdf.text('45% Cantidad de Beneficiados', margin, y); y += 5;
    pdf.text('20% Calificación', margin, y); y += 8;
    pdf.setTextColor(0, 0, 0);

    dibujarSubtitulo('Sede Sur');
    dibujarTabla(
      ['#', 'Tutor', 'Puntaje'],
      ranking.sur.map((d, i) => [i+1, d.nombre, d.puntaje.toFixed(2) + '%']),
      [contentW * 0.08, contentW * 0.72, contentW * 0.20]
    );

    pdf.addPage(); y = margin;
    const graficaNorte = generarGraficaCanvas(
      datosTutores.filter(i => i.sede_tutoria === 'Norte'),
      'Tutorías por Mes — Sede Norte'
    );
    const graficaSur = generarGraficaCanvas(
      datosTutores.filter(i => i.sede_tutoria === 'Sur'),
      'Tutorías por Mes — Sede Sur'
    );
    const gW = contentW;
    const gH = (graficaNorte.height * gW) / graficaNorte.width;
    pdf.addImage(graficaNorte.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, gW, gH);
    y += gH + 6;
    pdf.addImage(graficaSur.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, gW, gH);
    y += gH + 6;




    // SECCIÓN 3 — ESTADÍSTICAS DE PROFESORES

    pdf.addPage(); y = margin;
    dibujarSeccion('ESTADÍSTICAS DE PROFESORES');

    dibujarTarjetas([
      { valor: stProfesores.stats.total, etiqueta: 'Total Tutorías' },
      { valor: (stProfesores.stats.sumaCalificacionesTotal / stProfesores.stats.total).toFixed(2), etiqueta: 'Calificación Promedio' }
    ]);

    dibujarSubtitulo('Cantidad de Tutorías por Facultad/Departamento');
    dibujarTabla(['Facultad/Departamento', 'Cantidad', '%'],
      Object.entries(stProfesores.stats.facultadDepartamento).sort((a,b)=>b[1]-a[1]).map(([fac, cant]) => [
        obtenerNombreFacultad(fac), cant, ((cant / stProfesores.stats.total) * 100).toFixed(1) + '%'
      ])
    );

    Object.keys(stProfesores.profesoresPorFacultad).sort().forEach(fac => {
      dibujarSubtitulo('Tutorías — ' + obtenerNombreFacultad(fac));
      dibujarTabla(['Nombre del Profesor', 'Tutorías', 'Beneficiados', 'Calificación'],
        Object.entries(stProfesores.profesoresPorFacultad[fac]).sort((a,b)=>b[1]-a[1]).map(([prof, cant]) => [
          prof, cant,
          stProfesores.documentosPorFacultadProfesor[fac]?.[prof]?.size || 0,
          stProfesores.promediosPorInstructor[prof] || 'N/A'
        ])
      );
    });

    agregarGraficaPDF(generarGraficaCanvas(datosProfesores, 'Tutorías por Mes — Profesores'));


    // ── NÚMEROS DE PÁGINA 
    const totalPaginas = pdf.internal.getNumberOfPages();
    const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    for (let i = 1; i <= totalPaginas; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Página ${i} de ${totalPaginas}`, pageW - margin, pageH - 6, { align: 'right' });
      pdf.text(`Estadísticas PMA — ${fechaHoy}`, margin, pageH - 6);
    }

    pdf.save(`Estadisticas_PMA_${fechaHoy}.pdf`);

  } catch (error) {
    alert('Error al generar el PDF: ' + error.message);
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}


(function initNavegacionAdmin() {
  window.addEventListener('popstate', function() {
    var pantallaAdmin = document.getElementById('pantallaAdmin');
    if (pantallaAdmin && !pantallaAdmin.classList.contains('hidden')) {
      cerrarSesionAdmin();
    }
  });
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      var pantallaAdmin = document.getElementById('pantallaAdmin');
      if (pantallaAdmin && !pantallaAdmin.classList.contains('hidden')) {
        location.reload();
      }
    }
  });
})();
