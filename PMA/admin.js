const cacheEstadisticas = {
  general: null,
  tutores: null,
  profesores: null
};


const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

function invalidarCacheEstadisticas() {
  cacheEstadisticas.general = null;
  cacheEstadisticas.tutores = null;
  cacheEstadisticas.profesores = null;
  console.log('Caché de estadísticas invalidado');
}

async function precargarDatosEstadisticas() {
  // Para estadísticas necesitamos tutores y profesores
  if (datosCache.tutoresNorte.length > 0 && datosCache.profesores.length > 0) return; // Ya cargados
  
  try {
    console.log('Precargando datos de estadísticas...');
    
    const [tutoresNorte, tutoresSur, profesores] = await Promise.all([
      supabaseQuery('tutores_norte'),
      supabaseQuery('tutores_sur'),
      supabaseQuery('profesores')
    ]);
    
    datosCache.tutoresNorte = tutoresNorte;
    datosCache.tutoresSur = tutoresSur;
    datosCache.profesores = profesores;
    
    console.log('Datos de estadísticas cargados');
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


// ADMIN
async function loginAdmin(event) {
  event.preventDefault();
  mostrarCargando('mensajeAdminLogin');


  const email = document.getElementById('adminDocumento').value;
  const password = document.getElementById('adminContrasena').value;

  try {
    // AUTENTICACIÓN CON SUPABASE AUTH
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      mostrarMensaje('mensajeAdminLogin', 'Acceso denegado.', 'error');
      console.error('Error de autenticación:', error.message);
      return;
    }

    // Usuario autenticado correctamente
    const user = data.user;

    const { data: adminData, error: adminError } = await supabaseClient
      .from('admin_usuarios')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminData) {
      mostrarMensaje('mensajeAdminLogin', 'Usuario sin permisos de administrador.', 'error');
      // Cerrar sesión si no es admin
      await supabaseClient.auth.signOut();
      return;
    }

    mostrarPantalla('pantallaAdmin');

  } catch (error) {
    mostrarMensaje('mensajeAdminLogin', 'Error de conexión: ' + error.message, 'error');
    console.error('Error en login:', error);
  }
}

function cambiarTabPrincipal(event, seccion) {
  // Remover active de tabs principales
  document.querySelectorAll('.admin-tabs-principal .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  // Ocultar todos los contenidos principales
  document.getElementById('contenidoPMA').classList.add('hidden');
  document.getElementById('contenidoPVU').classList.add('hidden');
  document.getElementById('contenidoAAA').classList.add('hidden');
  
  if (seccion === 'pma') {
    document.getElementById('contenidoPMA').classList.remove('hidden');
    // Al mostrar PMA, activar la primera pestaña (Descargar Datos) por defecto
    const primerTabPMA = document.querySelector('.admin-tabs-secundario .admin-tab');
    if (primerTabPMA) {
      // Simular click en Descargar Datos
      document.querySelectorAll('.admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabPMA.classList.add('active');
      document.getElementById('tabEstadisticas').classList.add('hidden');
      document.getElementById('tabGraficas').classList.add('hidden');
      document.getElementById('tabDescargas').classList.remove('hidden');
      setTimeout(() => inicializarBuscadorGrupos(), 100);
    }
  } else if (seccion === 'pvu') {
    document.getElementById('contenidoPVU').classList.remove('hidden');
    // Al mostrar PVU, activar la primera pestaña (Descargar Datos) por defecto
    const primerTabPVU = document.querySelector('#contenidoPVU .admin-tabs-secundario .admin-tab');
    if (primerTabPVU) {
      document.querySelectorAll('#contenidoPVU .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabPVU.classList.add('active');
      document.getElementById('tabEstadisticasPVU').classList.add('hidden');
      document.getElementById('tabDescargasPVU').classList.remove('hidden');
    }
  } else if (seccion === 'aaa') {
    document.getElementById('contenidoAAA').classList.remove('hidden');
    // Al mostrar AAA, activar la primera pestaña (Descargar Datos) por defecto
    const primerTabAAA = document.querySelector('#contenidoAAA .admin-tabs-secundario .admin-tab');
    if (primerTabAAA) {
      document.querySelectorAll('#contenidoAAA .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
      primerTabAAA.classList.add('active');
      document.getElementById('tabEstadisticasAAA').classList.add('hidden');
      document.getElementById('tabDescargasAAA').classList.remove('hidden');
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
    // Inicializar buscador de grupos cuando se muestra la pestaña de descargas
    setTimeout(() => inicializarBuscadorGrupos(), 100);
  } else if (tab === 'estadisticas') {
    document.getElementById('tabEstadisticas').classList.remove('hidden');
    
    // CARGAR DATOS DE ESTADÍSTICAS
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
    
    // Cargar estadísticas si no existen
    if (!window.datosFormulariosGlobal) {
      await cargarEstadisticas();
    }
    
  } else if (tab === 'graficas') {
    document.getElementById('tabGraficas').classList.remove('hidden');
    
    // CARGAR DATOS PARA GRÁFICAS (solo necesita formularios)
    if (!window.datosFormulariosGlobal) {
      const container = document.querySelector('#tabGraficas .chart-container');
      const contenidoOriginal = container.innerHTML;
      container.innerHTML = '<div class="loader"></div>';
      
      try {
        // Usar caché de formularios en lugar de consulta directa
        const data = await obtenerFormulariosCache();
        window.datosFormulariosGlobal = data;
        container.innerHTML = contenidoOriginal;
      } catch (error) {
        container.innerHTML = '<p style="text-align: center; color: #dc3545;">Error al cargar datos. Por favor intenta de nuevo.</p>';
        return;
      }
    }
    
    // Crear/actualizar gráfica
    if (!graficoTutorias) {
      actualizarGrafica();
    }
    
  } else if (tab === 'descargas') {
    document.getElementById('tabDescargas').classList.remove('hidden');
    // Inicializar buscador de grupos cuando se muestra la pestaña de descargas
    setTimeout(() => inicializarBuscadorGrupos(), 100);
  }
}


function solicitarForzarActualizacion() {
  mostrarModalConfirmacion(
    '¿Forzar Actualización de Datos?',
    'Esta acción hará que TODOS los estudiantes deban actualizar su semestre y grupo académico antes de llenar el formulario. ¿Está seguro de continuar?',
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
      // Si falla, intentar obtener todos los estudiantes y actualizarlos uno por uno
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
      // Mostrar mensaje de éxito
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
  
  // Deshabilitar botón mientras carga
  btnActualizar.disabled = true;
  btnActualizar.style.opacity = '0.6';
  
  // Agregar animación de rotación
  iconActualizar.style.animation = 'spin 1s linear infinite';
  
  try {
    // Invalidar cachés antes de actualizar
    invalidarCacheFormularios();
    invalidarCacheEstadisticas();
    
    // Determinar qué sección está activa y actualizar las estadísticas correspondientes
    const contenidoPMA = document.getElementById('contenidoPMA');
    const contenidoPVU = document.getElementById('contenidoPVU');
    const contenidoAAA = document.getElementById('contenidoAAA');
    
    if (!contenidoPMA.classList.contains('hidden')) {
      // PMA está activo
      await cargarEstadisticas();
    } else if (!contenidoPVU.classList.contains('hidden')) {
      // PVU está activo
      // Invalidar caché de PVU
      window.datosPVUGlobal = null;
      await cargarEstadisticasPVU();
    } else if (!contenidoAAA.classList.contains('hidden')) {
      // AAA está activo
      // Invalidar caché de AAA
      window.datosAAAGlobal = null;
      await cargarEstadisticasAAA();
    }
    
    // Cambiar a check (éxito)
    iconActualizar.style.animation = 'none';
    iconActualizar.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    iconActualizar.style.color = '#28a745';
    
    // Volver al icono original después de 1.5 segundos
    setTimeout(() => {
      iconActualizar.innerHTML = '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>';
      iconActualizar.style.color = 'currentColor';
    }, 1500);
    
  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    
    // Mostrar X en caso de error
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
    // Usar caché de formularios en lugar de consulta directa
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
      return;
    }

    // Crear HTML con estructura correcta
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

    // Para contenidoHTML complejo, mantener innerHTML pero usar caché DOM
    if (elementosDOM.statsGrid) {
      elementosDOM.statsGrid.innerHTML = contenidoHTML;
    }
    if (elementosDOM.detallesStats) {
      elementosDOM.detallesStats.textContent = '';
    }

 
    const datosAnteriores = window.datosFormulariosGlobal;
    const datosCambiaron = !datosAnteriores || datosAnteriores.length !== data.length;
    
    window.datosFormulariosGlobal = data;
    
    // Solo invalidar caché de estadísticas si los datos cambiaron
    if (datosCambiaron) {
      console.log('Datos de formularios cambiaron, invalidando caché de estadísticas');
      invalidarCacheEstadisticas();
    } else {
      console.log('Datos de formularios sin cambios, manteniendo caché de estadísticas');
    }

    // Mostrar estadísticas generales por defecto
    mostrarEstadisticas('general');

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

  const ahora = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  document.getElementById('statsGrid').insertAdjacentHTML('afterbegin', 
    `<p style="text-align: right; color: #666; font-size: 12px;">
      Última actualización: ${ahora}
    </p>`
  );
}

function mostrarEstadisticas(tipo, botonClickeado) {
  // Remover clase activo de todos los botones
  document.querySelectorAll('.estadisticas-menu-wrapper .btn-sede').forEach(btn => {
    btn.classList.remove('activo');
  });
  
  // Agregar clase activo al botón clickeado (si existe)
  if (botonClickeado) {
    botonClickeado.classList.add('activo');
  } else {
    // Si se llama sin botón (carga inicial), activar el botón de General
    const btnGeneral = document.querySelector('.estadisticas-menu-wrapper .btn-sede');
    if (btnGeneral) btnGeneral.classList.add('activo');
  }
  
  // MEMOIZACIÓN: Verificar si ya tenemos los resultados calculados en caché
  if (cacheEstadisticas[tipo]) {
    console.log(`Usando estadísticas en caché para: ${tipo}`);
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
    // General: todos los datos
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
    sumaCalificacionesPMA: 0  // Para General: incluye las 5 calificaciones
  };

  datosFiltrados.forEach(item => {
    const sede = item.sede_tutoria;
    const instructor = item.instructor;
    
    if (!stats.instructoresPorSede[sede]) {
      stats.instructoresPorSede[sede] = {};
    }
    stats.instructoresPorSede[sede][instructor] = (stats.instructoresPorSede[sede][instructor] || 0) + 1;

    stats.sedesTutorias[sede] = (stats.sedesTutorias[sede] || 0) + 1;

    // CÁLCULO: Promedio de 3 preguntas por tutoría (para Tutores y Profesores)
    const calificacionTutoria = item.calificacion || 0;
    const dudasResueltas = item.dudas_resueltas || 0;
    const dominioTema = item.dominio_tema || 0;
    
    const promedioTutoria = (calificacionTutoria + dudasResueltas + dominioTema) / 3;
    
    // CÁLCULO: Promedio de 5 preguntas por tutoría (para General - Calificación PMA)
    const ambiente = item.ambiente || 0;
    const recomiendaPMA = item.recomienda_pma || 0;
    const promedioPMA = (calificacionTutoria + dudasResueltas + dominioTema + ambiente + recomiendaPMA) / 5;
    
    if (!stats.calificacionesPorInstructor[instructor]) {
      stats.calificacionesPorInstructor[instructor] = { suma: 0, cantidad: 0 };
    }
    stats.calificacionesPorInstructor[instructor].suma += promedioTutoria;
    stats.calificacionesPorInstructor[instructor].cantidad += 1;

    stats.sumaCalificacionesTotal += promedioTutoria;
    stats.sumaCalificacionesPMA += promedioPMA;  // Acumular para General

    // Para profesores: contar por facultad/departamento
    if (tipo === 'profesores' && item.facultad_departamento) {
      stats.facultadDepartamento[item.facultad_departamento] = (stats.facultadDepartamento[item.facultad_departamento] || 0) + 1;
    }
  });

  const promedioCalificacion = (stats.sumaCalificacionesTotal / stats.total).toFixed(2);
  const promedioCalificacionPMA = (stats.sumaCalificacionesPMA / stats.total).toFixed(2);

  const promediosPorInstructor = {};
  Object.keys(stats.calificacionesPorInstructor).forEach(instructor => {
    const info = stats.calificacionesPorInstructor[instructor];
    promediosPorInstructor[instructor] = (info.suma / info.cantidad).toFixed(2);
  });

  // Encontrar el MEJOR instructor: mayor calificación, y si hay empate, el que tiene más tutorías
  let mejorInstructor = null;
  
  Object.keys(stats.calificacionesPorInstructor).forEach(instructor => {
    const info = stats.calificacionesPorInstructor[instructor];
    const promedio = parseFloat((info.suma / info.cantidad).toFixed(2));
    
    if (!mejorInstructor) {
      // Primera iteración: inicializar
      mejorInstructor = { 
        nombre: instructor, 
        promedio: promedio.toFixed(2),
        cantidad: info.cantidad
      };
    } else {
      const promedioMejor = parseFloat(mejorInstructor.promedio);
      
      // Si el promedio es mayor, gana
      if (promedio > promedioMejor) {
        mejorInstructor = { 
          nombre: instructor, 
          promedio: promedio.toFixed(2),
          cantidad: info.cantidad
        };
      } 
      // Si hay empate en calificación, gana el que tiene más tutorías
      else if (promedio === promedioMejor && info.cantidad > mejorInstructor.cantidad) {
        mejorInstructor = { 
          nombre: instructor, 
          promedio: promedio.toFixed(2),
          cantidad: info.cantidad
        };
      }
    }
  });

  // Encontrar el MENOR instructor: menor calificación, y si hay empate, el que tiene más tutorías
  let peorInstructor = null;
  
  Object.keys(stats.calificacionesPorInstructor).forEach(instructor => {
    const info = stats.calificacionesPorInstructor[instructor];
    const promedio = parseFloat((info.suma / info.cantidad).toFixed(2));
    
    if (!peorInstructor) {
      // Primera iteración: inicializar
      peorInstructor = { 
        nombre: instructor, 
        promedio: promedio.toFixed(2),
        cantidad: info.cantidad
      };
    } else {
      const promedioPeor = parseFloat(peorInstructor.promedio);
      
      // Si el promedio es menor, gana
      if (promedio < promedioPeor) {
        peorInstructor = { 
          nombre: instructor, 
          promedio: promedio.toFixed(2),
          cantidad: info.cantidad
        };
      } 
      // Si hay empate en calificación, gana el que tiene más tutorías
      else if (promedio === promedioPeor && info.cantidad > peorInstructor.cantidad) {
        peorInstructor = { 
          nombre: instructor, 
          promedio: promedio.toFixed(2),
          cantidad: info.cantidad
        };
      }
    }
  });
  
  // Si no hay instructores, usar valores por defecto
  if (!mejorInstructor) {
    mejorInstructor = { nombre: 'N/A', promedio: '0.00', cantidad: 0 };
  }
  if (!peorInstructor) {
    peorInstructor = { nombre: 'N/A', promedio: '0.00', cantidad: 0 };
  }

  const grid = document.getElementById('contenidoEstadisticas');
  
// GENERAL
if (tipo === 'general') {
  // Calcular estudiantes únicos (beneficiados)
  const estudiantesUnicos = new Set(datosFiltrados.map(item => item.documento));
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
  
 
  const materiasCuenta = {};
  datosFiltrados.forEach(item => {
    const materia = item.asignatura || 'Sin especificar';
    materiasCuenta[materia] = (materiasCuenta[materia] || 0) + 1;
  });
  
  const top5Materias = Object.entries(materiasCuenta)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Top 5 Semestres
  const semestresCuenta = {};
  datosFiltrados.forEach(item => {
    const semestre = item.semestre || 'Sin especificar';
    semestresCuenta[semestre] = (semestresCuenta[semestre] || 0) + 1;
  });
  
  const top5Semestres = Object.entries(semestresCuenta)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Top 5 Programas
  const programasCuenta = {};
  datosFiltrados.forEach(item => {
    const programa = item.programa || 'Sin especificar';
    programasCuenta[programa] = (programasCuenta[programa] || 0) + 1;
  });
  
  const top5Programas = Object.entries(programasCuenta)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  

  const facultadesCuenta = {};
  
  // Contar tutorías por facultad directamente desde formularios
  datosFiltrados.forEach(item => {
    const facultad = item.facultad || 'Sin especificar';
    facultadesCuenta[facultad] = (facultadesCuenta[facultad] || 0) + 1;
  });
  
  // Ordenar facultades de mayor a menor
  const todasFacultades = Object.entries(facultadesCuenta)
    .sort((a, b) => b[1] - a[1]);
  
  // Contar motivos de consulta
  const motivosCuenta = {};
  datosFiltrados.forEach(item => {
    const motivo = item.motivo_consulta || 'Sin especificar';
    motivosCuenta[motivo] = (motivosCuenta[motivo] || 0) + 1;
  });
  
  // Ordenar motivos de consulta de mayor a menor
  const todosMotivos = Object.entries(motivosCuenta)
    .sort((a, b) => b[1] - a[1]);
  
  // Generar HTML de las listas (incluyendo facultades y motivos de consulta)
  generarListasEstadisticas(top5Materias, top5Semestres, top5Programas, todasFacultades, todosMotivos, stats.total);
  
  return;
}

// Función auxiliar para generar las listas de estadísticas
function generarListasEstadisticas(top5Materias, top5Semestres, top5Programas, todasFacultades, todosMotivos, total) {
  let detallesHTML = '';
  
  // Lista 1: Top 5 Materias
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
  
  // Lista 2: Top 5 Semestres
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
  
  // Lista de Facultades (antes de Top 5 Programas)
  if (todasFacultades.length > 0) {
    detallesHTML += '<div class="chart-container"><h3 class="chart-title">Facultades con Más Tutorías</h3>';
    todasFacultades.forEach(([facultad, cantidad]) => {
      const porcentaje = ((cantidad / total) * 100).toFixed(1);
      detallesHTML += `<div class="list-item"><span>${facultad}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
    detallesHTML += '</div>';
  }
  
  // Lista 3: Top 5 Programas
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
  
  // Lista de Motivos de Consulta (todas, ordenadas de mayor a menor)
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

  // TUTORES y PROFESORES: Cards completos
  const tituloTipo = tipo === 'tutores' ? 'Tutorías' : 'Asesorías con Profesores';

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

// TUTORES: Mostrar por sede
  if (tipo === 'tutores') {
    detalles += '<div class="chart-container"><h3 class="chart-title">Cantidad de Tutorías por Sede</h3>';
    Object.entries(stats.sedesTutorias).forEach(([sede, cantidad]) => {
      const porcentaje = ((cantidad / stats.total) * 100).toFixed(1);
      detalles += `<div class="list-item"><span>${sede}</span><strong>${cantidad} (${porcentaje}%)</strong></div>`;
    });
    detalles += '</div>';

    // Contar tutorías totales por instructor (sin importar dónde las dio)
    const tutoriasPorInstructor = {};
    datosFiltrados.forEach(item => {
      const instructor = item.instructor;
      tutoriasPorInstructor[instructor] = (tutoriasPorInstructor[instructor] || 0) + 1;
    });


    const tutoresPorSedeOrigen = { Norte: {}, Sur: {} };
    
    // Verificar si los datos están cargados
    if (datosCache.tutoresNorte.length > 0 && datosCache.tutoresSur.length > 0) {
      Object.keys(tutoriasPorInstructor).forEach(instructor => {
        const cantidadTotal = tutoriasPorInstructor[instructor];
        
        // Verificar en qué tabla de ORIGEN está el tutor
        const esTutorNorte = datosCache.tutoresNorte.some(t => t.nombre === instructor);
        const esTutorSur = datosCache.tutoresSur.some(t => t.nombre === instructor);
        
        // Agregar a las sedes de origen con el TOTAL de tutorías
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
      .sort((a, b) => b[1] - a[1]); // Ordenar de mayor a menor cantidad
    
    if (instructoresNorte.length > 0) {
      instructoresNorte.forEach(([instructor, cantidad]) => {
        const promedio = promediosPorInstructor[instructor] || 'N/A';
        detalles += `<div class="list-item">
          <span>${instructor}</span>
          <strong>${cantidad} tutoría${cantidad !== 1 ? 's' : ''}<br><span style="font-size: 12px; font-weight: normal;">Calificación: ${promedio}</span></strong>
        </div>`;
      });
    } else {
      detalles += '<p style="text-align: center; color: #666;">No hay tutores registrados en Sede Norte</p>';
    }
    
    detalles += `</div>

      <div id="instructoresSurAdmin" class="horario-info hidden">
        <h4 class="horario-titulo">Tutores de Sede Sur</h4>`;
    
    const instructoresSur = Object.entries(tutoresPorSedeOrigen.Sur)
      .sort((a, b) => b[1] - a[1]); // Ordenar de mayor a menor cantidad
    
    if (instructoresSur.length > 0) {
      instructoresSur.forEach(([instructor, cantidad]) => {
        const promedio = promediosPorInstructor[instructor] || 'N/A';
        detalles += `<div class="list-item">
          <span>${instructor}</span>
          <strong>${cantidad} tutoría${cantidad !== 1 ? 's' : ''}<br><span style="font-size: 12px; font-weight: normal;">Calificación: ${promedio}</span></strong>
        </div>`;
      });
    } else {
      detalles += '<p style="text-align: center; color: #666;">No hay tutores registrados en Sede Sur</p>';
    }
    
    detalles += '</div></div>';
  }

  
  
if (tipo === 'profesores') {
  detalles += '<div class="chart-container"><h3 class="chart-title">Cantidad de Asesorías por Facultad/Departamento</h3>';
  
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

  // Cantidad de Asesorías por Profesor agrupados por Facultad/Departamento
  detalles += `<div class="chart-container">
    <h3 class="chart-title">Cantidad de Asesorías por Profesor</h3>`;

  // Agrupar profesores por facultad/departamento
  const profesoresPorFacultad = {};
  
  datosFiltrados.forEach(item => {
    const facultad = item.facultad_departamento || 'Sin Facultad';
    const profesor = item.instructor;
    
    if (!profesoresPorFacultad[facultad]) {
      profesoresPorFacultad[facultad] = {};
    }
    
    profesoresPorFacultad[facultad][profesor] = (profesoresPorFacultad[facultad][profesor] || 0) + 1;
  });

  const facultadesConProfesores = Object.keys(profesoresPorFacultad).sort();
  
  // Crear botones para cada facultad/departamento
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

    // Crear secciones ocultas para cada facultad con sus profesores
    facultadesConProfesores.forEach(facultad => {
      const facultadId = facultad.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const profesores = profesoresPorFacultad[facultad];
      const profesoresOrdenados = Object.entries(profesores).sort((a, b) => b[1] - a[1]);
      
      const nombreCompletoTitulo = obtenerNombreFacultad(facultad);
      detalles += `
        <div id="profesores${facultadId}" class="horario-info hidden">
          <h4 class="horario-titulo">${nombreCompletoTitulo}</h4>`;
      
      if (profesoresOrdenados.length > 0) {
        profesoresOrdenados.forEach(([profesor, cantidad]) => {
          const promedio = promediosPorInstructor[profesor] || 'N/A';
          detalles += `<div class="list-item">
            <span>${profesor}</span>
            <strong>${cantidad} asesorías<br><span style="font-size: 12px; font-weight: normal;">Calificación: ${promedio}</span></strong>
          </div>`;
        });
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
  
  // MEMOIZACIÓN: Guardar resultados calculados en caché para reutilización
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
  
  console.log(`Estadísticas de ${tipo} guardadas en caché`);
}



// DESCARGAR
async function descargarDatos() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;

  if (!desde || !hasta) {
    alert('Por favor seleccione ambas fechas');
    return;
  }

  if (new Date(desde) > new Date(hasta)) {
    alert('La fecha inicial no puede ser mayor que la fecha final');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const desdeISO = convertirFechaInputAISOColombia(desde, "00:00:00");
    const hastaISO = convertirFechaInputAISOColombia(hasta, "23:59:59");
    let url = `${SUPABASE_URL}/rest/v1/formularios?fecha=gte.${desdeISO}&fecha=lte.${hastaISO}&order=fecha.asc`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const data = await response.json();
    const datosTutores = data.filter(item => item.tipo_instructor === 'Tutor');
    
    if (datosTutores.length === 0) {
      alert('No hay registros de tutores en el rango de fechas seleccionado');
      return;
    }

    generarExcelSimplificado(datosTutores, `PMA_Tutores_${desde}_a_${hasta}`);
    alert(`${datosTutores.length} registros de tutores descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

async function descargarTodo() {
  if (!confirm('¿Descargar todos los registros?')) {
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga completa...';

  try {
    // CARGAR TODOS LOS DATOS SOLO CUANDO SE VA A DESCARGAR
    const data = await supabaseQuery('formularios', { order: 'fecha.asc' });
    
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


async function descargarDocentes() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;

  if (!desde || !hasta) {
    alert('Por favor seleccione ambas fechas');
    return;
  }

  if (new Date(desde) > new Date(hasta)) {
    alert('La fecha inicial no puede ser mayor que la fecha final');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
  
    const desdeISO = convertirFechaInputAISOColombia(desde, "00:00:00");
    const hastaISO = convertirFechaInputAISOColombia(hasta, "23:59:59");
    let url = `${SUPABASE_URL}/rest/v1/formularios?fecha=gte.${desdeISO}&fecha=lte.${hastaISO}&order=fecha.asc`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const data = await response.json();
    const datosDocentes = data.filter(item => item.tipo_instructor === 'Profesor');
    
    if (datosDocentes.length === 0) {
      alert('No hay registros de docentes en el rango de fechas seleccionado');
      return;
    }

    generarExcelDocentes(datosDocentes, `PMA_Docentes_${desde}_a_${hasta}`);
    alert(`${datosDocentes.length} registros de docentes descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


// DESCARGAR POR FACULTAD
async function descargarPorFacultad() {
  const checkboxes = document.querySelectorAll('.facultad-checkbox:checked');
  
  if (checkboxes.length === 0) {
    alert('Por favor seleccione al menos una facultad');
    return;
  }
  
  // Mapeo de códigos a nombres reales en la BD
  const mapeoFacultades = {
    'FCE': 'Ciencias Empresariales',
    'FCSH': 'Ciencias Sociales y Humanas',
    'FEDV': 'Educación a Distancia y Virtual',
    'FI': 'Ingeniería'
  };
  
  // Convertir códigos seleccionados a nombres reales de la BD
  const codigosSeleccionados = Array.from(checkboxes).map(cb => cb.value);
  const nombresFacultadesBD = codigosSeleccionados.map(codigo => mapeoFacultades[codigo]).filter(Boolean);
  
  if (nombresFacultadesBD.length === 0) {
    alert('Error al mapear las facultades seleccionadas');
    return;
  }
  
  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';
  
  try {
    // OPTIMIZACIÓN: Filtrar en el servidor usando filtro "in" para múltiples facultades
    // Esto evita cargar todos los formularios y filtra directamente en Supabase
    const datosFinales = await supabaseQuery('formularios', {
      in: { field: 'facultad', values: nombresFacultadesBD },
      order: 'fecha.asc'
    });
    
    if (datosFinales.length === 0) {
      alert('No hay registros para las facultades seleccionadas');
      return;
    }
    
    // Generar Excel con columnas específicas (todas desde formularios)
    generarExcelPorFacultad(datosFinales, codigosSeleccionados);
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
  // Todas las columnas vienen directamente de la tabla FORMULARIOS
  const datosExcel = datos.map(fila => {
    // Convertir fecha UTC a hora de Colombia
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
      'Grupo': fila.grupo || '',
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
    { wch: 10 }, { wch: 35 }, { wch: 35 }, { wch: 12 }, { wch: 30 }, { wch: 30 }
  ];
  
  const nombresFacultades = facultadesSeleccionadas.map(f => obtenerNombreFacultad(f)).join('_');
  XLSX.utils.book_append_sheet(wb, ws, "Por Facultad");
  
  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `PMA_PorFacultad_${nombresFacultades.replace(/\s+/g, '_')}_${fechaHoy}.xlsx`);
}


// DESCARGAR POR GRUPO
let grupoSeleccionadoParaDescarga = null;
let cantidadRegistrosEncontrados = 0;

// Inicializar buscador de grupos cuando se carga el panel de admin
function inicializarBuscadorGrupos() {
  // No necesita inicialización especial, el botón buscar maneja todo
}

async function buscarGrupo() {
  const buscadorGrupo = document.getElementById('buscadorGrupo');
  const resultadoBusqueda = document.getElementById('resultadoBusquedaGrupo');
  const grupoSeleccionado = document.getElementById('grupoSeleccionado');
  const btnDescargar = document.getElementById('btnDescargarGrupo');
  const btnBuscar = document.getElementById('btnBuscarGrupo');
  
  if (!buscadorGrupo || !resultadoBusqueda) return;
  
  const grupoBuscado = buscadorGrupo.value.trim().toUpperCase();
  
  if (!grupoBuscado) {
    resultadoBusqueda.style.display = 'block';
    resultadoBusqueda.style.background = '#fff3cd';
    resultadoBusqueda.style.borderLeft = '4px solid #ffc107';
    resultadoBusqueda.innerHTML = '<strong>Advertencia:</strong> Por favor ingrese un grupo para buscar.';
    grupoSeleccionado.style.display = 'none';
    btnDescargar.disabled = true;
    grupoSeleccionadoParaDescarga = null;
    return;
  }
  
  // Deshabilitar botón mientras busca
  btnBuscar.disabled = true;
  btnBuscar.textContent = 'Buscando...';
  resultadoBusqueda.style.display = 'block';
  resultadoBusqueda.style.background = '#e8f4fd';
  resultadoBusqueda.style.borderLeft = '4px solid #1e3c72';
  resultadoBusqueda.innerHTML = '<strong>Buscando...</strong> Por favor espere...';
  grupoSeleccionado.style.display = 'none';
  btnDescargar.disabled = true;
  
  try {
    // BUSCAR CON FILTRO EN EL SERVIDOR (filtrado antes de traer datos)
    // Construir URL directamente para usar upper() en la consulta (case-insensitive exact match)
    // Esto filtra en el servidor antes de traer los datos
    const grupoBuscadoEncoded = encodeURIComponent(grupoBuscado);
    const url = `${SUPABASE_URL}/rest/v1/formularios?grupo=ilike.${grupoBuscadoEncoded}`;
    
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };
    
    const registrosEncontrados = await fetchConReintentos(url, { headers });
    
    // Verificación adicional en el cliente para asegurar coincidencia exacta (por espacios, etc.)
    const registrosFiltrados = registrosEncontrados.filter(item => {
      const grupo = item.grupo ? item.grupo.trim().toUpperCase() : '';
      return grupo === grupoBuscado;
    });
    
    cantidadRegistrosEncontrados = registrosFiltrados.length;
    
    if (registrosFiltrados.length > 0) {
      // Grupo encontrado - quitar mensaje y mostrar solo el grupo seleccionado
      grupoSeleccionadoParaDescarga = grupoBuscado;
      resultadoBusqueda.style.display = 'none';
      resultadoBusqueda.innerHTML = '';
      
      document.getElementById('grupoSeleccionadoTexto').textContent = grupoBuscado;
      grupoSeleccionado.style.display = 'block';
      btnDescargar.disabled = false;
    } else {
      // Grupo no encontrado - mostrar solo mensaje simple sin emojis
      grupoSeleccionadoParaDescarga = null;
      resultadoBusqueda.style.background = '#f8d7da';
      resultadoBusqueda.style.borderLeft = '4px solid #dc3545';
      resultadoBusqueda.innerHTML = '<strong>Grupo no encontrado</strong>';
      
      grupoSeleccionado.style.display = 'none';
      btnDescargar.disabled = true;
    }
  } catch (error) {
    console.error('Error buscando grupo:', error);
    resultadoBusqueda.style.background = '#f8d7da';
    resultadoBusqueda.style.borderLeft = '4px solid #dc3545';
    resultadoBusqueda.innerHTML = `<strong>Error:</strong> ${error.message}`;
    
    grupoSeleccionado.style.display = 'none';
    btnDescargar.disabled = true;
    grupoSeleccionadoParaDescarga = null;
  } finally {
    btnBuscar.disabled = false;
    btnBuscar.textContent = 'Buscar';
  }
}

function limpiarSeleccionGrupo() {
  grupoSeleccionadoParaDescarga = null;
  cantidadRegistrosEncontrados = 0;
  document.getElementById('buscadorGrupo').value = '';
  document.getElementById('resultadoBusquedaGrupo').style.display = 'none';
  document.getElementById('grupoSeleccionado').style.display = 'none';
  document.getElementById('btnDescargarGrupo').disabled = true;
}

async function descargarPorGrupo() {
  if (!grupoSeleccionadoParaDescarga) {
    alert('Por favor busque y seleccione un grupo primero');
    return;
  }
  
  const btnDescarga = document.getElementById('btnDescargarGrupo');
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';
  
  try {
    // OPTIMIZACIÓN: Filtrar en el servidor usando ilike para búsqueda case-insensitive
    // Esto evita cargar todos los formularios y filtra directamente en Supabase
    const data = await supabaseQuery('formularios', {
      ilike: { field: 'grupo', value: grupoSeleccionadoParaDescarga },
      order: 'fecha.asc'
    });
    
    // Verificación adicional en el cliente para asegurar coincidencia exacta (por espacios, etc.)
    const datosFinales = data.filter(item => {
      const grupo = item.grupo ? item.grupo.trim().toUpperCase() : '';
      return grupo === grupoSeleccionadoParaDescarga;
    });
    
    if (datosFinales.length === 0) {
      alert('No hay registros para el grupo seleccionado. Por favor busque nuevamente.');
      limpiarSeleccionGrupo();
      return;
    }
    
    // Generar Excel con columnas específicas
    generarExcelPorGrupo(datosFinales, grupoSeleccionadoParaDescarga);
    alert(`${datosFinales.length} registros descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function generarExcelPorGrupo(datos, grupo) {
  // Columnas: documento, apellidos y nombres (juntos), programa, grupo, asignatura, tema
  const datosExcel = datos.map(fila => {
    // Combinar apellidos y nombres
    const apellidos = fila.apellidos || '';
    const nombres = fila.nombres || '';
    const apellidosYNombres = `${apellidos} ${nombres}`.trim();
    
    return {
      'Documento': parseInt(fila.documento) || '',
      'Apellidos y Nombres': apellidosYNombres,
      'Programa': fila.programa || '',
      'Grupo': fila.grupo || '',
      'Asignatura': fila.asignatura || '',
      'Tema': fila.tema || ''
    };
  });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);
  
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // Aplicar formato a documento como número (columna 0 en este caso)
  for (let row = 1; row <= range.e.r; row++) {
    const docCell = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (ws[docCell] && row > 0) {
      ws[docCell].t = 'n';
      ws[docCell].z = '0';
    }
  }
  
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  
  ws['!cols'] = [
    { wch: 12 },  // Documento
    { wch: 40 },  // Apellidos y Nombres
    { wch: 35 },  // Programa
    { wch: 12 },  // Grupo
    { wch: 30 },  // Asignatura
    { wch: 30 }   // Tema
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Por Grupo");
  
  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const nombreGrupo = grupo.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `PMA_PorGrupo_${nombreGrupo}_${fechaHoy}.xlsx`);
}


function generarExcelSimplificado(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    // Convertir fecha UTC a hora de Colombia
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

    const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}

function generarExcelCompleto(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    // Convertir fecha UTC a hora de Colombia
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
      'Grupo': fila.grupo,
      'Tipo Acompañamiento': fila.tipo_acompanamiento || 'Tutoría',
      'Título Curso': fila.titulo_curso || '',
      'Sede Estudiante': fila.sede_estudiante || '',
      'Sede Tutoría': fila.sede_tutoria,
      'Tipo Instructor': fila.tipo_instructor,
      'Facultad/Departamento': fila.facultad_departamento || '',
      'Instructor': fila.instructor,
      'Asignatura': fila.asignatura,
      'Tema': fila.tema,
      'Motivo Consulta': fila.motivo_consulta || '',
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
    { wch: 35 }, { wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 20 },
    { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 },
    { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Registros Completos");

    const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}



function generarExcelDocentes(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    // Convertir fecha UTC a hora de Colombia
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

    const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}




// CERRAR SESIÓN ADMIN
async function cerrarSesionAdmin() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Error cerrando sesión:', error);
    }
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  } finally {
    // Recargar página para volver al login
    location.reload();
  }
}


// VERIFICAR SESIÓN
async function verificarSesionAdmin() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
      // Usuario ya tiene sesión activa
      console.log('Sesión activa detectada');

      // Verificar que sea admin
      const { data: adminData } = await supabaseClient
        .from('admin_usuarios')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();

      if (adminData) {
        mostrarPantalla('pantallaAdmin');
        return;
      } else {
        // Usuario autenticado pero no es admin
        await supabaseClient.auth.signOut();
      }
    }

    // No hay sesión o no es admin: mostrar login
    mostrarPantalla('pantallaAdminLogin');

  } catch (error) {
    console.error('Error verificando sesión:', error);
    mostrarPantalla('pantallaAdminLogin');
  }
}


function toggleInstructoresSede(sede) {
  document.getElementById('instructoresNorteAdmin').classList.add('hidden');
  document.getElementById('instructoresSurAdmin').classList.add('hidden');
  
  if (sede === 'norte') {
    document.getElementById('instructoresNorteAdmin').classList.toggle('hidden');
  } else if (sede === 'sur') {
    document.getElementById('instructoresSurAdmin').classList.toggle('hidden');
  }
}


function toggleProfesoresFacultad(facultadId) {
  // Ocultar todas las secciones de profesores
  const todasLasSecciones = document.querySelectorAll('[id^="profesores"]');
  todasLasSecciones.forEach(seccion => {
    if (seccion.id.startsWith('profesores')) {
      seccion.classList.add('hidden');
    }
  });
  
  // Mostrar/ocultar la sección clickeada
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
    // Ojo abierto (visible)
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  } else {
    input.type = 'password';
    // Ojo cerrado (oculto)
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  }
}


function toggleUsername() {
  const input = document.getElementById('adminDocumento');
  const icon = document.getElementById('iconUsername');
  
  if (input.type === 'password') {
    input.type = 'text';
    // Ojo abierto (visible)
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  } else {
    input.type = 'password';
    // Ojo cerrado (oculto)
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  }
}


// GRÁFICAS
async function descargarAAAIndividual() {
  const btnDescarga = document.getElementById('btnDescargarAAAIndividual');
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    // Cargar datos filtrados por tipo Individual
    const data = await supabaseQuery('acompanamiento', { 
      eq: { field: 'tipo_acompanamiento', value: 'Individual' },
      order: 'fecha_hora.asc' 
    });
    
    if (data.length === 0) {
      alert('No hay registros de acompañamiento individual para descargar');
      return;
    }

    generarExcelAAAIndividual(data, 'AAA_Individual');
    alert(`${data.length} registros de acompañamiento individual descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

async function descargarAAAGrupal() {
  const btnDescarga = document.getElementById('btnDescargarAAAGrupal');
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    // Cargar datos filtrados por tipo Grupal
    const data = await supabaseQuery('acompanamiento', { 
      eq: { field: 'tipo_acompanamiento', value: 'Grupal' },
      order: 'fecha_hora.asc' 
    });
    
    if (data.length === 0) {
      alert('No hay registros de acompañamiento grupal para descargar');
      return;
    }

    generarExcelAAAGrupal(data, 'AAA_Grupal');
    alert(`${data.length} registros de acompañamiento grupal descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

async function descargarAAATodo() {
  const btnDescarga = document.getElementById('btnDescargarAAATodo');
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    // Cargar todos los datos de la tabla acompanamiento
    const data = await supabaseQuery('acompanamiento', { order: 'fecha_hora.asc' });
    
    if (data.length === 0) {
      alert('No hay registros de AAA para descargar');
      return;
    }

    generarExcelAAACompleto(data, 'AAA_Completo');
    alert(`${data.length} registros de AAA descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function generarExcelAAAIndividual(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    // Convertir fecha UTC a hora de Colombia
    const fechaColombia = convertirFechaAColombia(fila.fecha_hora);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Tipo Acompañamiento': fila.tipo_acompanamiento || '',
      'Documento': parseInt(fila.documento) || '',
      'Nombre': fila.nombres_y_apellidos || '',
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
      'Motivo': fila.motivo || ''
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
    { wch: 30 },  // Nombre
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
    { wch: 50 }   // Motivo
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Individual");

  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}

function generarExcelAAAGrupal(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    // Convertir fecha UTC a hora de Colombia
    const fechaColombia = convertirFechaAColombia(fila.fecha_hora);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Tipo Acompañamiento': fila.tipo_acompanamiento || '',
      'Vocero (Nombre)': fila.nombres_y_apellidos || '',
      'Contacto Vocero': fila.contacto_vocero || '',
      'Correo Vocero': fila.correo_vocero || '',
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
      'Motivo': fila.motivo || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, -1); // -1 porque no hay columna documento
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 },  // Fecha
    { wch: 8 },   // Hora
    { wch: 18 },  // Tipo Acompañamiento
    { wch: 30 },  // Vocero (Nombre)
    { wch: 15 },  // Contacto Vocero
    { wch: 35 },  // Correo Vocero
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
    { wch: 50 }   // Motivo
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Grupal");

  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}

function generarExcelAAACompleto(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    // Convertir fecha UTC a hora de Colombia
    const fechaColombia = convertirFechaAColombia(fila.fecha_hora);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
      'Tipo Acompañamiento': fila.tipo_acompanamiento || '',
      'Documento': fila.documento ? parseInt(fila.documento) : '',
      'Nombres y Apellidos': fila.nombres_y_apellidos || '',
      'Contacto Vocero': fila.contacto_vocero || '',
      'Correo Vocero': fila.correo_vocero || '',
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
      'Motivo': fila.motivo || ''
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
    { wch: 15 },  // Contacto Vocero
    { wch: 35 },  // Correo Vocero
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
    { wch: 50 }   // Motivo
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
    // Cargar todos los datos de la tabla PVU
    const data = await supabaseQuery('pvu', { order: 'fecha.asc' });
    
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
    // Convertir fecha UTC a hora de Colombia
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'Fecha': serialDate,
      'Hora': horaFormateada,
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
  aplicarFormatoExcel(ws, range, 0, 2);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 },  // Fecha
    { wch: 8 },   // Hora
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
  
  // Filtrar por tipo de instructor si no es "todos"
  let datosFiltrados = data;
  if (tipoInstructor !== 'todos') {
    datosFiltrados = data.filter(item => item.tipo_instructor === tipoInstructor);
  }
  
  if (datosFiltrados.length === 0) {
    // Si no hay datos filtrados, mostrar gráfico vacío
    if (graficoTutorias) {
      graficoTutorias.destroy();
    }
    const ctx = document.getElementById('graficaTutorias').getContext('2d');
    graficoTutorias = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Sin datos'],
        datasets: [{
          label: 'Cantidad de tutorías',
          data: [0],
          backgroundColor: 'rgba(30, 60, 114, 0.7)',
          borderColor: 'rgba(30, 60, 114, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
    return;
  }
  
  let labels = [];
  let valores = [];
  
  if (periodo === 'semanal') {
    // Agrupar por semanas (Lunes a Domingo) - Hora Colombia
    
    // Encontrar la fecha más antigua y más reciente (convertidas a Colombia)
    const fechas = datosFiltrados.map(item => {
      return convertirFechaAColombia(item.fecha);
    });
    const fechaMin = new Date(Math.min(...fechas));
    const fechaMax = new Date(Math.max(...fechas));
    
    // Función para obtener el lunes de una fecha
    function obtenerLunes(fecha) {
      const dia = fecha.getDay(); // 0=Dom, 1=Lun, 2=Mar...
      // Si es domingo (0), retroceder 6 días. Si es otro día, retroceder (día - 1)
      const diff = dia === 0 ? -6 : 1 - dia;
      const lunes = new Date(fecha);
      lunes.setDate(fecha.getDate() + diff);
      lunes.setHours(0, 0, 0, 0);
      return lunes;
    }
    
    // Obtener el lunes de la primera semana
    let lunesActual = obtenerLunes(fechaMin);
    
    // Iterar por cada semana hasta cubrir todas las fechas
    const semanas = {};
    
    while (lunesActual <= fechaMax) {
      const domingo = new Date(lunesActual);
      domingo.setDate(domingo.getDate() + 6);
      domingo.setHours(23, 59, 59, 999);
      
      // Formatear las fechas para el label (SIN AÑO)
      const diaL = String(lunesActual.getDate()).padStart(2, '0');
      const mesL = String(lunesActual.getMonth() + 1).padStart(2, '0');
      
      const diaD = String(domingo.getDate()).padStart(2, '0');
      const mesD = String(domingo.getMonth() + 1).padStart(2, '0');
      
      const label = `${diaL}/${mesL} - ${diaD}/${mesD}`;
      
      // Contar registros en esta semana (convertidos a hora Colombia)
      const cantidad = datosFiltrados.filter(item => {
        const fechaItem = convertirFechaAColombia(item.fecha);
        return fechaItem >= lunesActual && fechaItem <= domingo;
      }).length;
      
      semanas[label] = cantidad;
      
      // Avanzar a la siguiente semana (siguiente lunes)
      lunesActual = new Date(lunesActual);
      lunesActual.setDate(lunesActual.getDate() + 7);
    }
    
    labels = Object.keys(semanas);
    valores = Object.values(semanas);
    
  } else if (periodo === 'mensual') {
    // Agrupar por meses completos
    
    const meses = {};
    const nombresMesesCortos = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    
            datosFiltrados.forEach(item => {
      const fecha = convertirFechaAColombia(item.fecha);
      const mes = fecha.getMonth();
      const año = fecha.getFullYear();
      const claveMes = `${año}-${String(mes + 1).padStart(2, '0')}`; // Para ordenar
      const labelMes = `${nombresMesesCortos[mes]} ${año}`;
      
      if (!meses[claveMes]) {
        meses[claveMes] = {
          label: labelMes,
          cantidad: 0
        };
      }
      
      meses[claveMes].cantidad++;
    });
    
    // Ordenar por fecha (año-mes)
    const clavesMesesOrdenadas = Object.keys(meses).sort();
    
    labels = clavesMesesOrdenadas.map(clave => meses[clave].label);
    valores = clavesMesesOrdenadas.map(clave => meses[clave].cantidad);
  }
  
  // Destruir gráfico anterior si existe
  if (graficoTutorias) {
    graficoTutorias.destroy();
  }
  
  // Crear nuevo gráfico
  const ctx = document.getElementById('graficaTutorias').getContext('2d');
  graficoTutorias = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
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
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.parsed.y + ' tutoría' + (context.parsed.y !== 1 ? 's' : '');
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  });
}


// CAMBIAR TAB
async function cambiarTabPVU(event, tab) {
  document.querySelectorAll('#contenidoPVU .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('tabEstadisticasPVU').classList.add('hidden');
  document.getElementById('tabDescargasPVU').classList.add('hidden');
  
  if (tab === 'descargas') {
    document.getElementById('tabDescargasPVU').classList.remove('hidden');
  } else if (tab === 'estadisticas') {
    document.getElementById('tabEstadisticasPVU').classList.remove('hidden');
    
    // Cargar estadísticas de PVU
    if (!window.datosPVUGlobal) {
      await cargarEstadisticasPVU();
    } else {
      mostrarEstadisticasPVU();
    }
  }
}

// CAMBIAR TAB
async function cambiarTabAAA(event, tab) {
  document.querySelectorAll('#contenidoAAA .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('tabEstadisticasAAA').classList.add('hidden');
  document.getElementById('tabDescargasAAA').classList.add('hidden');
  
  if (tab === 'descargas') {
    document.getElementById('tabDescargasAAA').classList.remove('hidden');
  } else if (tab === 'estadisticas') {
    document.getElementById('tabEstadisticasAAA').classList.remove('hidden');
    
    // Cargar estadísticas de AAA
    if (!window.datosAAAGlobal) {
      await cargarEstadisticasAAA();
    } else {
      mostrarEstadisticasAAA();
    }
  }
}


// ESTADÍSTICAS
async function cargarEstadisticasPVU() {
  const statsGridPVU = document.getElementById('statsGridPVU');
  const detallesStatsPVU = document.getElementById('detallesStatsPVU');
  
  // Mostrar loader mientras carga
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
    // Cargar datos de la tabla pvu
    const data = await supabaseQuery('pvu', { order: 'fecha.asc' });
    
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
    
    // Guardar datos globalmente
    window.datosPVUGlobal = data;
    
    // Mostrar estadísticas
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

// MOSTRAR ESTADÍSTICAS
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
  
  // Crear HTML con la tarjeta de Total de Registros
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


// CARGAR ESTADÍSTICAS
async function cargarEstadisticasAAA() {
  const statsGridAAA = document.getElementById('statsGridAAA');
  const detallesStatsAAA = document.getElementById('detallesStatsAAA');
  
  // Mostrar loader mientras carga
  if (statsGridAAA) {
    statsGridAAA.textContent = '';
    const loader = document.createElement('div');
    loader.className = 'loader';
    statsGridAAA.appendChild(loader);
  }
  if (detallesStatsAAA) {
    detallesStatsAAA.textContent = '';
  }
  
  try {
    // Cargar datos de la tabla acompanamiento
    const data = await supabaseQuery('acompanamiento', { order: 'fecha_hora.asc' });
    
    if (data.length === 0) {
      if (statsGridAAA) {
        statsGridAAA.textContent = '';
        const p = document.createElement('p');
        p.style.textAlign = 'center';
        p.style.color = '#666';
        p.textContent = 'No hay datos disponibles aún.';
        statsGridAAA.appendChild(p);
      }
      return;
    }
    
    // Guardar datos globalmente
    window.datosAAAGlobal = data;
    
    // Mostrar estadísticas
    mostrarEstadisticasAAA();
    
  } catch (error) {
    console.error('Error cargando estadísticas AAA:', error);
    if (statsGridAAA) {
      statsGridAAA.textContent = '';
      const p = document.createElement('p');
      p.style.textAlign = 'center';
      p.style.color = '#dc3545';
      p.textContent = 'Error al cargar estadísticas. Por favor intenta de nuevo.';
      statsGridAAA.appendChild(p);
    }
  }
}


// MOSTRAR ESTADÍSTICAS
function mostrarEstadisticasAAA() {
  const data = window.datosAAAGlobal;
  const statsGridAAA = document.getElementById('statsGridAAA');
  const detallesStatsAAA = document.getElementById('detallesStatsAAA');
  
  if (!data || data.length === 0) {
    if (statsGridAAA) {
      statsGridAAA.innerHTML = '<p style="text-align: center; color: #666;">No hay datos disponibles aún.</p>';
    }
    return;
  }
  
  const totalRegistros = data.length;
  
  // Crear HTML con la tarjeta de Total de Registros
  if (statsGridAAA) {
    statsGridAAA.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h3>${totalRegistros}</h3>
          <p>Total de Registros</p>
        </div>
      </div>
    `;
  }
  
  if (detallesStatsAAA) {
    detallesStatsAAA.textContent = '';
  }
}
