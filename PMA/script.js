const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;

// Variables globales
let datosEstudiante = null;
let instructorActual = null;
let formularioEnviandose = false;
let graficoTutorias = null;
// Variable para controlar la página actual del formulario
let paginaFormularioActual = 1;

// NUEVO: Variable para el estudiante que está actualizando
let estudianteActualizando = null;

// Cache de datos precargados
const datosCache = {
  facultadesCarreras: [],
  tutoresNorte: [],
  tutoresSur: [],
  profesores: [],
  materias: [],
  temas: []
};

let facultadesData = {};

// ===================================
// CACHÉ DE REFERENCIAS DOM
// ===================================
// Cache de elementos DOM más frecuentemente accedidos para mejorar rendimiento
const elementosDOM = {
  // Mensajes
  mensajeLogin: null,
  mensajeRegistro: null,
  mensajeFormulario: null,
  mensajeAdminLogin: null,
  mensajeActualizacion: null,
  // Pantallas
  pantallaBienvenida: null,
  contenidoFormulario: null,
  pantallaLogin: null,
  pantallaRegistro: null,
  pantallaAdmin: null,
  // Formularios
  formRegistro: null,
  formLogin: null,
  formTutoria: null,
  formAdminLogin: null,
  formVerificarDocumento: null,
  // Confirmación y botones
  confirmacionDatos: null,
  datosConfirmacion: null,
  btnConfirmarRegistro: null,
  btnContinuar: null,
  btnEnviar: null,
  // Estadísticas
  statsGrid: null,
  detallesStats: null,
  contenidoEstadisticas: null,
  // Búsqueda
  resultadoBusqueda: null,
  // Inputs del formulario de registro (más usados)
  regDocumento: null,
  regPrimerNombre: null,
  regSegundoNombre: null,
  regPrimerApellido: null,
  regSegundoApellido: null,
  regFacultad: null,
  regPrograma: null,
  regSede: null,
  regSemestre: null,
  regGrupo: null,
  regDocumentoMostrar: null,
  // Inputs del formulario de login
  loginDocumento: null,
  // Inputs del formulario de tutoría
  sedeTutoria: null,
  tipoInstructor: null,
  facultadDepartamento: null,
  instructor: null,
  asignatura: null,
  // Otros
  pasoDocumento: null,
  grupoFacultad: null,
  grupoInstructor: null,
  grupoMateria: null,
  otraAsignaturaContainer: null,
  labelInstructor: null,
  nombreUsuario: null,
  nombreAdmin: null,
  iconActualizar: null
};


function inicializarCacheDOM() {
  // Mensajes
  elementosDOM.mensajeLogin = document.getElementById('mensajeLogin');
  elementosDOM.mensajeRegistro = document.getElementById('mensajeRegistro');
  elementosDOM.mensajeFormulario = document.getElementById('mensajeFormulario');
  elementosDOM.mensajeAdminLogin = document.getElementById('mensajeAdminLogin');
  elementosDOM.mensajeActualizacion = document.getElementById('mensajeActualizacion');
  
  // Pantallas
  elementosDOM.pantallaBienvenida = document.getElementById('pantallaBienvenida');
  elementosDOM.contenidoFormulario = document.getElementById('contenidoFormulario');
  elementosDOM.pantallaLogin = document.getElementById('pantallaLogin');
  elementosDOM.pantallaRegistro = document.getElementById('pantallaRegistro');
  elementosDOM.pantallaAdmin = document.getElementById('pantallaAdmin');
  
  // Formularios
  elementosDOM.formRegistro = document.getElementById('formRegistro');
  elementosDOM.formLogin = document.getElementById('formLogin');
  elementosDOM.formTutoria = document.getElementById('formTutoria');
  elementosDOM.formAdminLogin = document.getElementById('formAdminLogin');
  elementosDOM.formVerificarDocumento = document.getElementById('formVerificarDocumento');
  
  // Confirmación y botones
  elementosDOM.confirmacionDatos = document.getElementById('confirmacionDatos');
  elementosDOM.datosConfirmacion = document.getElementById('datosConfirmacion');
  elementosDOM.btnConfirmarRegistro = document.getElementById('btnConfirmarRegistro');
  elementosDOM.btnContinuar = document.getElementById('btnContinuar');
  elementosDOM.btnEnviar = document.getElementById('btnEnviar');
  
  // Estadísticas
  elementosDOM.statsGrid = document.getElementById('statsGrid');
  elementosDOM.detallesStats = document.getElementById('detallesStats');
  elementosDOM.contenidoEstadisticas = document.getElementById('contenidoEstadisticas');
  
  // Búsqueda
  elementosDOM.resultadoBusqueda = document.getElementById('resultadoBusqueda');
  
  // Inputs del formulario de registro
  elementosDOM.regDocumento = document.getElementById('regDocumento');
  elementosDOM.regPrimerNombre = document.getElementById('regPrimerNombre');
  elementosDOM.regSegundoNombre = document.getElementById('regSegundoNombre');
  elementosDOM.regPrimerApellido = document.getElementById('regPrimerApellido');
  elementosDOM.regSegundoApellido = document.getElementById('regSegundoApellido');
  elementosDOM.regFacultad = document.getElementById('regFacultad');
  elementosDOM.regPrograma = document.getElementById('regPrograma');
  elementosDOM.regSede = document.getElementById('regSede');
  elementosDOM.regSemestre = document.getElementById('regSemestre');
  elementosDOM.regGrupo = document.getElementById('regGrupo');
  elementosDOM.regDocumentoMostrar = document.getElementById('regDocumentoMostrar');
  
  // Inputs del formulario de login
  elementosDOM.loginDocumento = document.getElementById('loginDocumento');
  
  // Inputs del formulario de tutoría
  elementosDOM.sedeTutoria = document.getElementById('sedeTutoria');
  elementosDOM.tipoInstructor = document.getElementById('tipoInstructor');
  elementosDOM.facultadDepartamento = document.getElementById('facultadDepartamento');
  elementosDOM.instructor = document.getElementById('instructor');
  elementosDOM.asignatura = document.getElementById('asignatura');
  
  // Otros
  elementosDOM.pasoDocumento = document.getElementById('pasoDocumento');
  elementosDOM.grupoFacultad = document.getElementById('grupoFacultadDepartamento');
  elementosDOM.grupoInstructor = document.getElementById('grupoInstructor');
  elementosDOM.grupoMateria = document.getElementById('grupoMateria');
  elementosDOM.otraAsignaturaContainer = document.getElementById('otraAsignaturaContainer');
  elementosDOM.labelInstructor = document.getElementById('labelInstructor');
  elementosDOM.nombreUsuario = document.getElementById('nombreUsuario');
  elementosDOM.nombreAdmin = document.getElementById('nombreAdmin');
  elementosDOM.iconActualizar = document.getElementById('iconActualizar');
}

// ===================================
// CACHÉ DE CONSULTAS A BASE DE DATOS
// ===================================

const cacheFormularios = {
  datos: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutos en milisegundos
};


async function obtenerFormulariosCache() {
  const ahora = Date.now();
  
  // Si hay datos en caché y no han expirado, devolverlos
  if (cacheFormularios.datos && 
      cacheFormularios.timestamp && 
      (ahora - cacheFormularios.timestamp) < cacheFormularios.ttl) {
    console.log('Usando datos del caché de formularios');
    return cacheFormularios.datos;
  }
  
  // Si no hay caché o expiró, cargar desde la BD
  console.log('Cargando formularios desde la BD...');
  const datos = await supabaseQuery('formularios', { order: 'fecha.asc' });
  
  // Actualizar caché
  cacheFormularios.datos = datos;
  cacheFormularios.timestamp = ahora;
  
  return datos;
}


function invalidarCacheFormularios() {
  cacheFormularios.datos = null;
  cacheFormularios.timestamp = null;
  console.log('Caché de formularios invalidado');
}


// ===================================
// FUNCIÓN DE REINTENTOS AUTOMÁTICOS
// ===================================
async function fetchConReintentos(url, options, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.log(`Intento ${i + 1} de ${intentos} falló:`, error.message);
      
      if (i === intentos - 1) {
        throw new Error('No pudimos conectar con el servidor después de varios intentos. Por favor verifica tu conexión a internet e intenta de nuevo.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      console.log('Reintentando...');
    }
  }
}

// ===================================
// FUNCIONES HELPER PARA FECHAS EN HORA DE COLOMBIA
// ===================================


function obtenerFechaActualColombia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
}


function convertirFechaAColombia(fechaUTC) {
  const fecha = fechaUTC instanceof Date ? fechaUTC : new Date(fechaUTC);
  return new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
}


function obtenerFechaISOColombia() {
  return obtenerFechaActualColombia().toISOString();
}


function convertirFechaInputAISOColombia(fechaInput, hora = "00:00:00") {
  // Crear fecha en hora de Colombia para la fecha y hora especificadas
  const [año, mes, dia] = fechaInput.split('-');
  const [horas, minutos, segundos] = hora.split(':');
  
  // Crear fecha en hora de Colombia
  const fechaColombia = obtenerFechaActualColombia();
  fechaColombia.setFullYear(parseInt(año), parseInt(mes) - 1, parseInt(dia));
  fechaColombia.setHours(parseInt(horas), parseInt(minutos), parseInt(segundos || 0), 0);
  
  return fechaColombia.toISOString();
}

// ===================================
// FUNCIONES DE SUPABASE
// ===================================
async function supabaseQuery(table, options = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = [];
  
  if (options.select) params.push(`select=${options.select}`);
  if (options.eq) params.push(`${options.eq.field}=eq.${encodeURIComponent(options.eq.value)}`);
  if (options.ilike) params.push(`${options.ilike.field}=ilike.${encodeURIComponent(options.ilike.value)}`);
  if (options.order) params.push(`order=${options.order}`);
  
  // Soporte para filtro "in" (múltiples valores) - útil para filtrar por múltiples facultades
  if (options.in) {
    const { field, values } = options.in;
    // PostgREST usa formato: campo=in.(valor1,valor2,valor3)
    const valoresEncoded = values.map(v => encodeURIComponent(v)).join(',');
    params.push(`${field}=in.(${valoresEncoded})`);
  }
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
  
  return await fetchConReintentos(url, { headers });
}

async function supabaseInsert(table, data) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  return await fetchConReintentos(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
}

// ===================================
// PRECARGA OPTIMIZADA POR MÓDULO
// ===================================
async function precargarDatosFormulario() {
  // Verificar si TODOS los datos necesarios están cargados
  const todosCargados = 
    datosCache.tutoresNorte.length > 0 &&
    datosCache.tutoresSur.length > 0 &&
    datosCache.profesores.length > 0 &&
    datosCache.materias.length > 0 &&
    datosCache.temas.length > 0;
  
  if (todosCargados) {
    console.log('Todos los datos del formulario ya están cargados');
    return; // Ya cargados
  }
  
  try {
    console.log('Precargando datos del formulario...');
    
    // Recargar todos los datos para asegurar que estén completos
    const [tutoresNorte, tutoresSur, profesores, materias, temas] = await Promise.all([
      supabaseQuery('tutores_norte'),
      supabaseQuery('tutores_sur'),
      supabaseQuery('profesores'),
      supabaseQuery('materias'),
      supabaseQuery('temas')
    ]);
    
    // Actualizar el caché solo si los datos son válidos
    if (tutoresNorte && Array.isArray(tutoresNorte)) {
      datosCache.tutoresNorte = tutoresNorte;
    }
    if (tutoresSur && Array.isArray(tutoresSur)) {
      datosCache.tutoresSur = tutoresSur;
    }
    if (profesores && Array.isArray(profesores)) {
      datosCache.profesores = profesores;
    }
    if (materias && Array.isArray(materias)) {
      datosCache.materias = materias;
    }
    if (temas && Array.isArray(temas)) {
      datosCache.temas = temas;
    }
    
    console.log('Datos del formulario cargados correctamente');
  } catch (error) {
    console.error('Error precargando datos del formulario:', error);
    throw error;
  }
}

async function precargarDatosRegistro() {
  if (datosCache.facultadesCarreras.length > 0) return; // Ya cargados
  
  try {
    console.log('Precargando datos del registro...');
    
    const facultadesCarreras = await supabaseQuery('facultades_carreras');
    
    datosCache.facultadesCarreras = facultadesCarreras;
    procesarFacultadesData();
    
    console.log('Datos del registro cargados');
  } catch (error) {
    console.error('Error precargando datos del registro:', error);
    throw error;
  }
}




function procesarFacultadesData() {
  facultadesData = {};
  
  for (const item of datosCache.facultadesCarreras) {
    if (!facultadesData[item.facultad]) {
      facultadesData[item.facultad] = [];
    }
    facultadesData[item.facultad].push(item.programa);
  }
}


function limpiarEspacios(input) {
  const valorOriginal = input.value;
  
  // Limpiar espacios
  let valor = input.value.trim();
  valor = valor.replace(/\s+/g, ' ');
  
  // Si cambió algo, hacer un pequeño efecto
  if (valorOriginal !== valor) {
    input.value = valor;
    input.style.backgroundColor = '#e8f4fd';
    setTimeout(() => {
      input.style.backgroundColor = '';
    }, 300);
  }
}

// ===================================
// FUNCIONES HELPER REUTILIZABLES
// ===================================

function poblarSelect(selectElement, datos, opciones = {}) {
  const {
    valueKey = null,
    textKey = null,
    primeraOpcion = '',
    ordenar = null,
    opcionExtra = null
  } = opciones;
  
  // Limpiar select y agregar primera opción
  selectElement.innerHTML = primeraOpcion ? `<option value="">${primeraOpcion}</option>` : '';
  
  if (!datos || datos.length === 0) return;
  
  // Ordenar datos si se proporciona función
  const datosOrdenados = ordenar ? [...datos].sort(ordenar) : datos;
  
  // Crear fragment para mejor rendimiento
  const fragment = document.createDocumentFragment();
  
  for (const item of datosOrdenados) {
    const option = document.createElement('option');
    
    if (typeof item === 'string') {
      option.value = item;
      option.textContent = item;
    } else {
      option.value = valueKey ? item[valueKey] : item;
      option.textContent = textKey ? item[textKey] : item;
    }
    
    fragment.appendChild(option);
  }
  
  // Agregar opción extra si se proporciona
  if (opcionExtra) {
    const optionExtra = document.createElement('option');
    optionExtra.value = opcionExtra.value;
    optionExtra.textContent = opcionExtra.text;
    if (opcionExtra.style) {
      Object.assign(optionExtra.style, opcionExtra.style);
    }
    fragment.appendChild(optionExtra);
  }
  
  selectElement.appendChild(fragment);
}


function obtenerTutoresPorSede(sede) {
  if (sede === 'Virtual') {
    return [...datosCache.tutoresNorte, ...datosCache.tutoresSur];
  } else if (sede === 'Norte') {
    return datosCache.tutoresNorte;
  } else if (sede === 'Sur') {
    return datosCache.tutoresSur;
  }
  return [];
}


function formatearHora(fecha) {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}


function convertirFechaASerialExcel(fecha) {
  return (fecha - new Date(1899, 11, 30)) / 86400000;
}


function aplicarFormatoExcel(ws, range, columnaFecha = 0, columnaDocumento = 2) {
  // Aplicar formato de fecha DD/MM/YYYY
  for (let row = 1; row <= range.e.r; row++) {
    const fechaCell = XLSX.utils.encode_cell({ r: row, c: columnaFecha });
    if (ws[fechaCell] && row > 0) {
      ws[fechaCell].t = 'n';
      ws[fechaCell].z = 'dd/mm/yyyy';
    }
  }
  
  // Aplicar formato a documento como número
  for (let row = 1; row <= range.e.r; row++) {
    const docCell = XLSX.utils.encode_cell({ r: row, c: columnaDocumento });
    if (ws[docCell] && row > 0) {
      ws[docCell].t = 'n';
      ws[docCell].z = '0';
    }
  }
}


function manejarEstadoBoton(boton, desactivar, textoDesactivado = '', textoOriginal = '') {
  if (desactivar) {
    boton.disabled = true;
    boton.style.opacity = '0.6';
    boton.style.cursor = 'not-allowed';
    if (textoDesactivado) {
      boton.textContent = textoDesactivado;
    }
  } else {
    boton.disabled = false;
    boton.style.opacity = '1';
    boton.style.cursor = 'pointer';
    if (textoOriginal) {
      boton.textContent = textoOriginal;
    }
  }
}



// ===================================
// FUNCIONES DE NAVEGACIÓN
// ===================================
function mostrarPantalla(id) {
  document.querySelectorAll('.container > div').forEach(div => div.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Función para mostrar el contenido del formulario (ocultar bienvenida)
function mostrarContenidoFormulario() {
  // Usar caché DOM
  const pantallaBienvenida = elementosDOM.pantallaBienvenida || document.getElementById('pantallaBienvenida');
  const contenidoFormulario = elementosDOM.contenidoFormulario || document.getElementById('contenidoFormulario');
  const body = document.body;
  
  // Actualizar estado de navegación
  pantallaActual = 'contenidoFormulario';
  
  // Remover clase welcome-active del body
  body.classList.remove('welcome-active');
  
  // Ocultar pantalla de bienvenida con animación
  pantallaBienvenida.style.opacity = '0';
  pantallaBienvenida.style.transition = 'opacity 0.5s ease';
  
  setTimeout(() => {
    pantallaBienvenida.style.display = 'none';
    contenidoFormulario.classList.remove('hidden');
    contenidoFormulario.style.opacity = '0';
    contenidoFormulario.style.transition = 'opacity 0.5s ease';
    
    // Mostrar formulario con animación
    setTimeout(() => {
      contenidoFormulario.style.opacity = '1';
      // Scroll suave al inicio del formulario
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, 500);
}

async function mostrarLogin() {
  mostrarContenidoFormulario();
  setTimeout(() => {
    mostrarPantalla('pantallaLogin');
    // Usar caché DOM y textContent en lugar de innerHTML
    if (elementosDOM.mensajeLogin) {
      elementosDOM.mensajeLogin.textContent = '';
    }
    // Los datos del formulario se cargarán SOLO cuando se haga click en "Continuar" (iniciarSesion)
  }, 550);
}


async function mostrarRegistro() {
  mostrarContenidoFormulario();
  setTimeout(() => {
    mostrarPantalla('pantallaRegistro');
    // Usar caché DOM y textContent en lugar de innerHTML
    if (elementosDOM.mensajeRegistro) {
      elementosDOM.mensajeRegistro.textContent = '';
    }
    if (elementosDOM.confirmacionDatos) {
      elementosDOM.confirmacionDatos.classList.add('hidden');
    }
    if (elementosDOM.btnConfirmarRegistro) {
      elementosDOM.btnConfirmarRegistro.classList.add('hidden');
    }
    
    // Mostrar paso de verificación de documento
    if (elementosDOM.pasoDocumento) {
      elementosDOM.pasoDocumento.classList.remove('hidden');
    }
    if (elementosDOM.formRegistro) {
      elementosDOM.formRegistro.classList.add('hidden');
    }
    if (elementosDOM.regDocumento) {
      elementosDOM.regDocumento.value = '';
    }
    // Los datos del registro se cargarán SOLO cuando se haga click en "Continuar" (verificarDocumento)
  }, 550);
}

function volverInicio() {
  // Usar caché DOM
  const pantallaBienvenida = elementosDOM.pantallaBienvenida || document.getElementById('pantallaBienvenida');
  const contenidoFormulario = elementosDOM.contenidoFormulario || document.getElementById('contenidoFormulario');
  const body = document.body;
  
  // Actualizar estado de navegación
  pantallaActual = 'pantallaBienvenida';
  
  limpiarFormularios();
  formularioEnviandose = false;
  const btnContinuar = elementosDOM.btnContinuar || document.getElementById('btnContinuar');
  const btnConfirmarRegistro = elementosDOM.btnConfirmarRegistro || document.getElementById('btnConfirmarRegistro');
  const confirmacionDatos = elementosDOM.confirmacionDatos || document.getElementById('confirmacionDatos');
  
  if (btnContinuar) btnContinuar.classList.remove('hidden');
  if (btnConfirmarRegistro) btnConfirmarRegistro.classList.add('hidden');
  if (confirmacionDatos) confirmacionDatos.classList.add('hidden');
  
  // Ocultar contenido del formulario y mostrar bienvenida
  contenidoFormulario.style.opacity = '0';
  contenidoFormulario.style.transition = 'opacity 0.5s ease';
  
  setTimeout(() => {
    contenidoFormulario.classList.add('hidden');
    body.classList.add('welcome-active');
    pantallaBienvenida.style.display = 'flex';
    pantallaBienvenida.style.opacity = '0';
    pantallaBienvenida.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
      pantallaBienvenida.style.opacity = '1';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, 500);


// REACTIVAR BOTONES usando caché DOM
  const btnEnviar = elementosDOM.btnEnviar || document.getElementById('btnEnviar');
  if (btnEnviar) {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
  }
  
  const btnRegistro = elementosDOM.btnConfirmarRegistro || document.getElementById('btnConfirmarRegistro');
  if (btnRegistro) {
    btnRegistro.disabled = false;
    btnRegistro.textContent = 'Confirmar y Registrarme';
    btnRegistro.style.opacity = '1';
    btnRegistro.style.cursor = 'pointer';
  }
}

function limpiarFormularios() {
  // Usar caché DOM
  if (elementosDOM.formRegistro) elementosDOM.formRegistro.reset();
  if (elementosDOM.formLogin) elementosDOM.formLogin.reset();
  if (elementosDOM.formTutoria) elementosDOM.formTutoria.reset();
  if (elementosDOM.formAdminLogin) elementosDOM.formAdminLogin.reset();
}

function mostrarMensaje(elementId, mensaje, tipo) {
  // Intentar usar caché DOM primero, si no está disponible usar getElementById
  let elemento = elementosDOM[elementId] || document.getElementById(elementId);
  
  if (!elemento) return;
  
  // Usar manipulación DOM directa en lugar de innerHTML
  elemento.textContent = ''; // Limpiar primero
  const divMensaje = document.createElement('div');
  divMensaje.className = `mensaje ${tipo}`;
  divMensaje.textContent = mensaje;
  elemento.appendChild(divMensaje);
  
  setTimeout(() => {
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
  
  setTimeout(() => {
    elemento.textContent = ''; // Limpiar usando textContent
  }, 10000);
}

// Función para hacer scroll a un elemento de error
function scrollToError(elemento) {
  if (elemento) {
    elemento.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    // Resaltar el campo con un pequeño delay
    setTimeout(() => {
      // Solo hacer focus si es un elemento input, select o textarea
      if (elemento.tagName === 'INPUT' || elemento.tagName === 'SELECT' || elemento.tagName === 'TEXTAREA') {
        elemento.focus();
        elemento.style.transition = 'box-shadow 0.3s ease';
        elemento.style.boxShadow = '0 0 0 4px rgba(220, 53, 69, 0.3)';
        setTimeout(() => {
          elemento.style.boxShadow = '';
        }, 2000);
      } else {
        // Para otros elementos (como el contenedor de rating), solo resaltar
        elemento.style.transition = 'box-shadow 0.3s ease';
        elemento.style.boxShadow = '0 0 0 4px rgba(220, 53, 69, 0.3)';
        setTimeout(() => {
          elemento.style.boxShadow = '';
        }, 2000);
      }
    }, 300);
  }
}

function mostrarCargando(elementId) {
  // Intentar usar caché DOM primero
  let elemento = elementosDOM[elementId] || document.getElementById(elementId);
  
  if (!elemento) return;
  
  // Usar manipulación DOM directa en lugar de innerHTML
  elemento.textContent = ''; // Limpiar primero
  const loader = document.createElement('div');
  loader.className = 'loader';
  elemento.appendChild(loader);
  
  setTimeout(() => {
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

// ===================================
// VALIDACIÓN DE DOCUMENTO
// ===================================
function validarDocumento(documento) {
  if (documento.length < 6) {
    return {
      valido: false,
      mensaje: 'Documento no válido'
    };
  }
  
  return { valido: true };
}

// ===================================
// CARGAR FACULTADES Y PROGRAMAS
// ===================================
function cargarFacultades() {
  // Usar caché DOM
  const select = elementosDOM.regFacultad || document.getElementById('regFacultad');
  if (!select) return;
  const facultades = Object.keys(facultadesData);
  poblarSelect(select, facultades, {
    primeraOpcion: 'Seleccione una facultad',
    ordenar: (a, b) => a.localeCompare(b)
  });
}

function cargarProgramas() {
  // Usar caché DOM
  const selectFacultad = elementosDOM.regFacultad || document.getElementById('regFacultad');
  const selectPrograma = elementosDOM.regPrograma || document.getElementById('regPrograma');
  
  if (!selectFacultad || !selectPrograma) return;
  
  const facultad = selectFacultad.value;
  
  if (!facultad) {
    selectPrograma.disabled = true;
    // Usar manipulación DOM directa en lugar de innerHTML
    selectPrograma.textContent = '';
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Primero seleccione una facultad';
    selectPrograma.appendChild(option);
    return;
  }
  
  selectPrograma.disabled = false;
  const programas = facultadesData[facultad] || [];
  poblarSelect(selectPrograma, programas, {
    primeraOpcion: 'Seleccione un programa',
    ordenar: (a, b) => a.localeCompare(b)
  });
}

// ===================================
// CONFIRMACIÓN Y REGISTRO
// ===================================
function mostrarConfirmacion() {
  // Validar que el formulario sea válido antes de continuar usando caché DOM
  const form = elementosDOM.formRegistro || document.getElementById('formRegistro');
  if (!form || !form.checkValidity()) {
    if (form) form.reportValidity(); // Muestra los mensajes de required del navegador
    return;
  }
  
  const doc = (elementosDOM.regDocumento || document.getElementById('regDocumento'))?.value;
  
  const validacion = validarDocumento(doc);
  if (!validacion.valido) {
    mostrarMensaje('mensajeRegistro', validacion.mensaje, 'error');
    return;
  }
    
  // Usar caché DOM para obtener valores
  const primerNombre = (elementosDOM.regPrimerNombre || document.getElementById('regPrimerNombre'))?.value.toUpperCase();
  const segundoNombre = (elementosDOM.regSegundoNombre || document.getElementById('regSegundoNombre'))?.value.toUpperCase();
  const primerApellido = (elementosDOM.regPrimerApellido || document.getElementById('regPrimerApellido'))?.value.toUpperCase();
  const segundoApellido = (elementosDOM.regSegundoApellido || document.getElementById('regSegundoApellido'))?.value.toUpperCase();
  const facultad = (elementosDOM.regFacultad || document.getElementById('regFacultad'))?.value;
  const programa = (elementosDOM.regPrograma || document.getElementById('regPrograma'))?.value;
  const sede = (elementosDOM.regSede || document.getElementById('regSede'))?.value;
  
  const nombreCompleto = `${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}`.replace(/\s+/g, ' ');
  const semestre = (elementosDOM.regSemestre || document.getElementById('regSemestre'))?.value;
  const grupo = (elementosDOM.regGrupo || document.getElementById('regGrupo'))?.value.toUpperCase();

  const html = `
    <div class="confirmation-item">
      <div class="confirmation-label">Documento:</div>
      <div class="confirmation-value">${doc}</div>
    </div>
    <div class="confirmation-item">
      <div class="confirmation-label">Nombre Completo:</div>
      <div class="confirmation-value">${nombreCompleto}</div>
    </div>
    <div class="confirmation-item">
      <div class="confirmation-label">Facultad:</div>
      <div class="confirmation-value">${facultad}</div>
    </div>
    <div class="confirmation-item">
      <div class="confirmation-label">Programa:</div>
      <div class="confirmation-value">${programa}</div>
    </div>
    <div class="confirmation-item">
      <div class="confirmation-label">Sede:</div>
      <div class="confirmation-value">${sede}</div>
    </div>
    <div class="confirmation-item">
      <div class="confirmation-label">Semestre:</div>
      <div class="confirmation-value">${semestre}</div>
    </div>
    <div class="confirmation-item">
      <div class="confirmation-label">Grupo:</div>
      <div class="confirmation-value">${grupo}</div>
    </div>
  `;

  // Usar caché DOM y manipulación DOM directa en lugar de innerHTML
  const datosConfirmacion = elementosDOM.datosConfirmacion || document.getElementById('datosConfirmacion');
  if (datosConfirmacion) {
    datosConfirmacion.innerHTML = html; // Mantener innerHTML aquí porque es HTML complejo estructurado
  }
  if (elementosDOM.confirmacionDatos) {
    elementosDOM.confirmacionDatos.classList.remove('hidden');
  }
  if (elementosDOM.btnConfirmarRegistro) {
    elementosDOM.btnConfirmarRegistro.classList.remove('hidden');
  }
  if (elementosDOM.btnContinuar) {
    elementosDOM.btnContinuar.classList.add('hidden');
  }
  
  setTimeout(() => {
    if (elementosDOM.confirmacionDatos) {
      elementosDOM.confirmacionDatos.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

// NUEVA FUNCIÓN: Verificar documento antes de mostrar el formulario
async function verificarDocumento(event) {
  event.preventDefault();
  
  const doc = document.getElementById('regDocumento').value;
  const docConfirmar = document.getElementById('regDocumentoConfirmar').value;
  
  // Validar que ambos documentos coincidan
  if (doc !== docConfirmar) {
    mostrarMensaje('mensajeRegistro', 'Los documentos no coinciden. Por favor verifica que hayas escrito correctamente tu documento en ambos campos.', 'error');
    return;
  }
  
  const validacion = validarDocumento(doc);
  if (!validacion.valido) {
    mostrarMensaje('mensajeRegistro', validacion.mensaje, 'error');
    return;
  }
  
  mostrarCargando('mensajeRegistro');

  try {
    // PRECARGAR DATOS DEL REGISTRO SOLO AQUÍ (cuando se hace click en Continuar)
    if (datosCache.facultadesCarreras.length === 0) {
      try {
        await precargarDatosRegistro();
      } catch (error) {
        mostrarMensaje('mensajeRegistro', 'Error al cargar los datos. Por favor intenta de nuevo.', 'error');
        return;
      }
    }

    const existing = await supabaseQuery('estudiantes', {
      eq: { field: 'documento', value: doc }
    });

    if (existing.length > 0) {
      mostrarMensaje('mensajeRegistro', 'Este documento ya está registrado correctamente.', 'success');
      return;
    }

    // Si el documento NO está registrado, mostrar el formulario completo
    document.getElementById('mensajeRegistro').innerHTML = '';
    document.getElementById('pasoDocumento').classList.add('hidden');
    document.getElementById('formRegistro').classList.remove('hidden');
    document.getElementById('regDocumentoMostrar').value = doc;
    
    // Cargar facultades ahora que los datos están disponibles
    cargarFacultades();
    
    // Hacer scroll al inicio de la página
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

  } catch (error) {
    mostrarMensaje('mensajeRegistro', 'Error al verificar el documento: ' + error.message, 'error');
  }
}

// FUNCIÓN PARA MANEJAR EL SUBMIT DEL FORMULARIO DE REGISTRO
function manejarSubmitRegistro(event) {
  event.preventDefault();
  
  const btnConfirmar = document.getElementById('btnConfirmarRegistro');
  
  // Si el botón de confirmar está oculto, mostrar la confirmación
  if (btnConfirmar && btnConfirmar.classList.contains('hidden')) {
    mostrarConfirmacion();
  } else {
    // Si el botón de confirmar está visible, enviar el registro
    registrarEstudiante(event);
  }
}

// FUNCIÓN MODIFICADA: Registrar estudiante (sin verificación de documento duplicado)
async function registrarEstudiante(event) {
  event.preventDefault();
  
  const doc = document.getElementById('regDocumentoMostrar').value;
  const btnRegistro = document.getElementById('btnConfirmarRegistro');
  
  // Desactivar botón para evitar doble click
  btnRegistro.disabled = true;
  btnRegistro.textContent = '⏳ Registrando...';
  btnRegistro.style.opacity = '0.6';
  btnRegistro.style.cursor = 'not-allowed';
  
  mostrarCargando('mensajeRegistro');

const datos = {
    documento: doc,
    primer_nombre: document.getElementById('regPrimerNombre').value.toUpperCase(),
    segundo_nombre: document.getElementById('regSegundoNombre').value.toUpperCase() || null,
    primer_apellido: document.getElementById('regPrimerApellido').value.toUpperCase(),
    segundo_apellido: document.getElementById('regSegundoApellido').value.toUpperCase(),
    facultad: document.getElementById('regFacultad').value,
    programa: document.getElementById('regPrograma').value,
    sede: document.getElementById('regSede').value,
    semestre: parseInt(document.getElementById('regSemestre').value),
    grupo: document.getElementById('regGrupo').value.toUpperCase(),
    fecha_actualizacion: obtenerFechaISOColombia()
  };

  try {
    const resultado = await supabaseInsert('estudiantes', datos);
    
    if (resultado && resultado.length > 0) {
      document.getElementById('mensajeRegistro').innerHTML = '';
      
      const modal = document.getElementById('modalExitoRegistro');
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      
      setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        location.reload(); // Recargar página para limpiar todo
      }, 3000);
    } else {
      mostrarMensaje('mensajeRegistro', 'Error: No se pudo completar el registro', 'error');
      // Reactivar botón si falla
      btnRegistro.disabled = false;
      btnRegistro.textContent = 'Confirmar y Registrarme';
      btnRegistro.style.opacity = '1';
      btnRegistro.style.cursor = 'pointer';
    }
  } catch (error) {
    mostrarMensaje('mensajeRegistro', error.message, 'error');
    // Reactivar botón si hay error
    btnRegistro.disabled = false;
    btnRegistro.textContent = 'Confirmar y Registrarme';
    btnRegistro.style.opacity = '1';
    btnRegistro.style.cursor = 'pointer';
  }
}

// ===================================
// LOGIN
// ===================================
function censurarNombre(nombreCompleto) {
  const partes = nombreCompleto.split(' ');
  return partes.map(parte => {
    if (parte.length <= 2) return parte;
    return parte.substring(0, 2) + '*'.repeat(parte.length - 2);
  }).join(' ');
}

async function iniciarSesion(event) {
  event.preventDefault();
  
  const documento = document.getElementById('loginDocumento').value;
  
  const validacion = validarDocumento(documento);
  if (!validacion.valido) {
    mostrarMensaje('mensajeLogin', validacion.mensaje, 'error');
    return;
  }
  
  mostrarCargando('mensajeLogin');

  // ASEGURAR QUE TODOS LOS DATOS DEL FORMULARIO ESTÉN CARGADOS
  if (datosCache.tutoresNorte.length === 0 || datosCache.materias.length === 0 || datosCache.temas.length === 0) {
    try {
      // precargarDatosFormulario() ya imprime sus propios mensajes, no duplicar aquí
      await precargarDatosFormulario();
    } catch (error) {
      console.error('Error al cargar datos:', error);
      mostrarMensaje('mensajeLogin', 'Error al cargar los datos del formulario. Por favor intenta de nuevo.', 'error');
      return;
    }
  }

  try {
    const data = await supabaseQuery('estudiantes', {
      eq: { field: 'documento', value: documento }
    });

    if (data.length === 0) {
      mostrarMensaje('mensajeLogin', 'Documento no encontrado. Por favor regístrese primero.', 'error');
      return;
    }

    const estudiante = data[0];
    
    // NUEVO: Verificar si necesita actualizar datos
    const necesitaActualizacion = verificarActualizacionSemestral(estudiante);
    
    if (necesitaActualizacion) {
      estudianteActualizando = estudiante;
      mostrarFormularioActualizacion(estudiante);
      return;
    }

    // Continuar con el flujo normal
    const nombres = `${estudiante.primer_nombre} ${estudiante.segundo_nombre || ''}`.trim();
    const apellidos = `${estudiante.primer_apellido} ${estudiante.segundo_apellido}`.trim();
    const nombreCompleto = `${nombres} ${apellidos}`;

    datosEstudiante = {
      documento: estudiante.documento,
      nombres: nombres,
      apellidos: apellidos,
      nombreCensurado: censurarNombre(nombreCompleto),
      facultad: estudiante.facultad,
      programa: estudiante.programa,
      sede: estudiante.sede || '',
      semestre: estudiante.semestre,
      grupo: estudiante.grupo
    };

    formularioEnviandose = false;
    mostrarPantalla('pantallaFormulario');
    // Usar caché DOM
    if (elementosDOM.nombreUsuario) {
      elementosDOM.nombreUsuario.textContent = 'Bienvenido(a): ' + datosEstudiante.nombreCensurado;
    }
    if (elementosDOM.mensajeFormulario) {
      elementosDOM.mensajeFormulario.textContent = '';
    }
    actualizarBotonCerrarSesion();

  } catch (error) {
    mostrarMensaje('mensajeLogin', 'Error de conexión: ' + error.message, 'error');
  }
}


// ===================================
// VERIFICAR REGISTRO RECIENTE CON INSTRUCTOR ESPECÍFICO
// ===================================
async function verificarRegistroRecenteConInstructor(documento, instructorSeleccionado) {
  try {
    // Obtener la fecha y hora REAL actual en Colombia
    const ahoraColombia = obtenerFechaActualColombia();
    
    // Calcular hace 1 hora y 30 minutos (90 minutos)
    const hace90Minutos = new Date(ahoraColombia.getTime() - (90 * 60 * 1000));
    const hace90MinutosISO = hace90Minutos.toISOString();
    
    // Consultar registros de los últimos 90 minutos CON EL MISMO INSTRUCTOR
    const url = `${SUPABASE_URL}/rest/v1/formularios?documento=eq.${documento}&instructor=eq.${encodeURIComponent(instructorSeleccionado)}&fecha=gte.${hace90MinutosISO}&order=fecha.desc`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const registrosRecientes = await response.json();
    
    if (registrosRecientes.length === 0) {
      // No hay registros recientes con este instructor, puede registrar
      return { puedeRegistrar: true };
    }
    
    // Obtener el registro más reciente con este instructor
    const registroMasReciente = registrosRecientes[0];
    const fechaRegistro = new Date(registroMasReciente.fecha);
    const fechaRegistroColombia = convertirFechaAColombia(fechaRegistro);
    
    // Calcular tiempo transcurrido en minutos
    const tiempoTranscurrido = Math.floor((ahoraColombia - fechaRegistroColombia) / (1000 * 60));
    const tiempoRestanteMinutos = 90 - tiempoTranscurrido;
    
    // Formatear tiempo restante
    let tiempoRestante;
    if (tiempoRestanteMinutos >= 60) {
      const horas = Math.floor(tiempoRestanteMinutos / 60);
      const minutos = tiempoRestanteMinutos % 60;
      tiempoRestante = minutos > 0 ? `${horas} hora y ${minutos} minutos` : `${horas} hora`;
    } else {
      tiempoRestante = `${tiempoRestanteMinutos} minutos`;
    }
    
    return {
      puedeRegistrar: false,
      tiempoRestante: tiempoRestante,
      instructor: instructorSeleccionado
    };
    
  } catch (error) {
    console.error('Error verificando registro reciente:', error);
    // En caso de error, permitir el registro
    return { puedeRegistrar: true };
  }
}


// ===================================
// CARGAR INSTRUCTORES - MODIFICADO
// ===================================
async function cargarInstructores() {
  const sede = document.getElementById('sedeTutoria').value;
  const tipo = document.getElementById('tipoInstructor').value;

  if (!sede || !tipo) return;

  // VERIFICAR QUE LOS DATOS ESTÉN CARGADOS ANTES DE USARLOS
  const necesitaTutores = tipo === 'Tutor';
  const necesitaProfesores = tipo === 'Profesor';
  
  if (necesitaTutores && (datosCache.tutoresNorte.length === 0 || datosCache.tutoresSur.length === 0)) {
    console.warn('Datos de tutores no disponibles, recargando...');
    try {
      await precargarDatosFormulario();
    } catch (error) {
      console.error('Error recargando datos:', error);
      mostrarMensaje('mensajeFormulario', 'Error al cargar los tutores. Por favor recargue la página.', 'error');
      return;
    }
  }
  
  if (necesitaProfesores && datosCache.profesores.length === 0) {
    console.warn('Datos de profesores no disponibles, recargando...');
    try {
      await precargarDatosFormulario();
    } catch (error) {
      console.error('Error recargando datos:', error);
      mostrarMensaje('mensajeFormulario', 'Error al cargar los profesores. Por favor recargue la página.', 'error');
      return;
    }
  }

  const grupoFacultad = document.getElementById('grupoFacultadDepartamento');
  const selectFacultad = document.getElementById('facultadDepartamento');
  
  grupoFacultad.classList.add('hidden');
  document.getElementById('grupoInstructor').classList.add('hidden');
  selectFacultad.value = '';
  document.getElementById('instructor').value = '';
  
  selectFacultad.removeAttribute('required');

  if (tipo === 'Tutor') {
    const selectInstructor = document.getElementById('instructor');
    document.getElementById('grupoInstructor').classList.remove('hidden');
    document.getElementById('labelInstructor').textContent = 'Tutor *';

    let instructores = [];
    
    instructores = obtenerTutoresPorSede(sede);

    const instructoresOrdenados = [...instructores].sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    // Eliminar duplicados
    const instructoresUnicos = [];
    const nombresVistos = new Set();
    for (const inst of instructoresOrdenados) {
      if (!nombresVistos.has(inst.nombre)) {
        nombresVistos.add(inst.nombre);
        instructoresUnicos.push(inst);
      }
    }
    
    poblarSelect(selectInstructor, instructoresUnicos, {
      valueKey: 'nombre',
      textKey: 'nombre',
      primeraOpcion: 'Seleccione un tutor'
    });
  } else if (tipo === 'Profesor') {
    grupoFacultad.classList.remove('hidden');
    selectFacultad.setAttribute('required', 'required');
  }
}

// ===================================
// CARGAR PROFESORES POR FACULTAD/DEPARTAMENTO
// ===================================
async function cargarProfesoresPorFacultad() {
  const facultadDepartamento = document.getElementById('facultadDepartamento').value;

  if (!facultadDepartamento) return;

  // VERIFICAR QUE LOS DATOS ESTÉN CARGADOS
  if (datosCache.profesores.length === 0) {
    console.warn('Datos de profesores no disponibles, recargando...');
    try {
      await precargarDatosFormulario();
    } catch (error) {
      console.error('Error recargando datos:', error);
      mostrarMensaje('mensajeFormulario', 'Error al cargar los profesores. Por favor recargue la página.', 'error');
      return;
    }
  }

  const selectInstructor = document.getElementById('instructor');
  document.getElementById('grupoInstructor').classList.remove('hidden');
  document.getElementById('labelInstructor').textContent = 'Profesor *';

  const profesores = datosCache.profesores.filter(
    prof => prof.facultad_departamento === facultadDepartamento
  );

  const profesoresOrdenados = [...profesores].sort((a, b) => a.nombre.localeCompare(b.nombre));

  poblarSelect(selectInstructor, profesoresOrdenados, {
    valueKey: 'nombre',
    textKey: 'nombre',
    primeraOpcion: 'Seleccione un profesor',
    opcionExtra: null
  });
  
  // Agregar atributo data-area manualmente ya que poblarSelect no lo maneja directamente
  profesoresOrdenados.forEach((prof, index) => {
    const option = selectInstructor.options[index + 1]; // +1 por la opción vacía
    if (option) {
      option.setAttribute('data-area', prof.area);
    }
  });
}

// ===================================
// CARGAR MATERIAS
// ===================================
async function cargarMaterias() {
  const selectInstructor = document.getElementById('instructor');
  const selectedOption = selectInstructor.options[selectInstructor.selectedIndex];
  
  if (!selectedOption || !selectedOption.value) return;

  // VERIFICAR QUE TODOS LOS DATOS NECESARIOS ESTÉN CARGADOS
  const tipoInstructor = document.getElementById('tipoInstructor').value;
  const necesitaRecargar = 
    datosCache.materias.length === 0 ||
    (tipoInstructor === 'Tutor' && 
     (datosCache.tutoresNorte.length === 0 || datosCache.tutoresSur.length === 0)) ||
    (tipoInstructor === 'Profesor' && 
     datosCache.profesores.length === 0);
  
  if (necesitaRecargar) {
    console.warn('Datos del formulario no disponibles, recargando...');
    const mensajeFormulario = document.getElementById('mensajeFormulario');
    if (mensajeFormulario) {
      mensajeFormulario.innerHTML = '<div class="loader"></div>';
    }
    
    try {
      await precargarDatosFormulario();
      if (mensajeFormulario) {
        mensajeFormulario.innerHTML = '';
      }
      console.log('Datos recargados correctamente');
    } catch (error) {
      console.error('Error recargando datos:', error);
      if (mensajeFormulario) {
        mostrarMensaje('mensajeFormulario', 'Error al cargar los datos. Por favor recargue la página.', 'error');
      }
      return;
    }
  }

  const instructorNombre = selectedOption.value;
  
  let areasInstructor = [];
  
  if (document.getElementById('tipoInstructor').value === 'Tutor') {
    const sede = document.getElementById('sedeTutoria').value;
    let tutores = [];
    
    tutores = obtenerTutoresPorSede(sede);
    
    for (const tutor of tutores) {
      if (tutor.nombre === instructorNombre && !areasInstructor.includes(tutor.area)) {
        areasInstructor.push(tutor.area);
      }
    }
  } else {
    for (const prof of datosCache.profesores) {
      if (prof.nombre === instructorNombre && !areasInstructor.includes(prof.area)) {
        areasInstructor.push(prof.area);
      }
    }
  }

  instructorActual = { nombre: instructorNombre, areas: areasInstructor };

  document.getElementById('grupoMateria').classList.remove('hidden');

  const materiasFiltradas = datosCache.materias.filter(mat => 
    areasInstructor.includes(mat.area)
  );
  
  const materiasOrdenadas = materiasFiltradas.sort((a, b) => a.materia.localeCompare(b.materia));

  const selectMateria = document.getElementById('asignatura');
  poblarSelect(selectMateria, materiasOrdenadas, {
    valueKey: 'materia',
    textKey: 'materia',
    primeraOpcion: 'Seleccione una asignatura',
    opcionExtra: {
      value: 'Otra',
      text: 'Otra: ¿Cuál?',
      style: { fontWeight: 'bold' }
    }
  });
}

// ===================================
// CARGAR TEMAS
// ===================================
async function cargarTemas() {
  const materia = document.getElementById('asignatura').value;
  if (!materia) return;

  // VERIFICAR QUE LOS DATOS ESTÉN CARGADOS
  if (datosCache.temas.length === 0) {
    console.warn('Datos de temas no disponibles, recargando...');
    try {
      await precargarDatosFormulario();
    } catch (error) {
      console.error('Error recargando datos:', error);
      mostrarMensaje('mensajeFormulario', 'Error al cargar los temas. Por favor recargue la página.', 'error');
      return;
    }
  }

  const containerAsignatura = document.getElementById('otraAsignaturaContainer');
  const inputAsignatura = document.getElementById('otraAsignatura');
  
  if (materia === 'Otra') {
    containerAsignatura.classList.remove('hidden');
    inputAsignatura.required = true;
    
    document.getElementById('grupoTema').classList.remove('hidden');
    
    const selectTema = document.getElementById('tema');
    selectTema.style.display = 'none';
    selectTema.required = false;
    
    const containerTema = document.getElementById('otroTemaContainer');
    const inputTema = document.getElementById('otroTema');
    containerTema.classList.remove('hidden');
    inputTema.required = true;
    
    const labelTema = document.querySelector('#grupoTema label');
    labelTema.textContent = 'Tema *';
    
    document.getElementById('grupoMotivo').classList.remove('hidden');
    
    formularioEnviandose = true;
    actualizarBotonCerrarSesion();
    return;
  } else {
    containerAsignatura.classList.add('hidden');
    inputAsignatura.required = false;
    inputAsignatura.value = '';
  }

  document.getElementById('grupoTema').classList.remove('hidden');

  const temasFiltrados = datosCache.temas.filter(tem => tem.materia === materia);
  
  const selectTema = document.getElementById('tema');
  const containerTema = document.getElementById('otroTemaContainer');
  const inputTema = document.getElementById('otroTema');
  const labelTema = document.querySelector('#grupoTema label');

  if (temasFiltrados.length === 0) {
    selectTema.style.display = 'none';
    selectTema.required = false;
    
    containerTema.classList.remove('hidden');
    inputTema.required = true;
    inputTema.value = '';
    
    labelTema.textContent = 'Tema *';
  } else {
    const temasOrdenados = temasFiltrados.sort((a, b) => a.tema.localeCompare(b.tema));
    
    selectTema.style.display = '';
    selectTema.required = true;
    poblarSelect(selectTema, temasOrdenados, {
      valueKey: 'tema',
      textKey: 'tema',
      primeraOpcion: 'Seleccione un tema',
      opcionExtra: {
        value: 'Otro',
        text: 'Otro: ¿Cuál?',
        style: { fontWeight: 'bold' }
      }
    });
    
    containerTema.classList.add('hidden');
    inputTema.required = false;
    inputTema.value = '';
    
    labelTema.textContent = 'Tema de la tutoría *';
  }

  document.getElementById('grupoMotivo').classList.remove('hidden');
  
  formularioEnviandose = true;
  actualizarBotonCerrarSesion();
}

function toggleOtroTema() {
  const tema = document.getElementById('tema').value;
  const container = document.getElementById('otroTemaContainer');
  const input = document.getElementById('otroTema');
  
  if (tema === 'Otro') {
    container.classList.remove('hidden');
    input.required = true;
  } else {
    container.classList.add('hidden');
    input.required = false;
    input.value = '';
  }
}

// Agregar listener para "¿Recomendarías el PMA?" - Solo esta pregunta completa el paso 4
document.addEventListener('DOMContentLoaded', function() {
  // Agregar listener para "¿Recomendarías el PMA?"
  const recomendacionesPma = document.querySelectorAll('input[name="recomienda_pma"]');
  recomendacionesPma.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.checked) {
      }
    });
  });
});


function toggleTituloCurso() {
  const tipoAcompanamiento = document.getElementById('tipoAcompanamiento').value;
  const grupoTituloCurso = document.getElementById('grupoTituloCurso');
  const inputTituloCurso = document.getElementById('tituloCurso');
  
  if (tipoAcompanamiento === 'Curso y/o capacitación') {
    grupoTituloCurso.classList.remove('hidden');
    inputTituloCurso.required = true;
  } else {
    grupoTituloCurso.classList.add('hidden');
    inputTituloCurso.required = false;
    inputTituloCurso.value = '';
  }
}

// ===================================
// BOTÓN CANCELAR Y CONFIRMACIÓN
// ===================================
function actualizarBotonCerrarSesion() {
  const btnCerrar = document.getElementById('btnCancelarFormulario');
  if (btnCerrar) {
    btnCerrar.textContent = 'Cancelar';
    btnCerrar.onclick = confirmarCancelacion;
  }
}

function confirmarCancelacion() {
  mostrarModalConfirmacion(
    '¿Seguro que deseas cancelar?',
    'Se perderán todos los datos del formulario que has ingresado.',
    function() {
      cerrarSesion();
    }
  );
}

function mostrarModalConfirmacion(titulo, mensaje, callbackConfirmar) {
  const modal = document.getElementById('modalConfirmacion');
  document.getElementById('tituloConfirmacion').textContent = titulo;
  document.getElementById('mensajeConfirmacion').textContent = mensaje;
  
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  
  document.getElementById('btnConfirmarModal').onclick = function() {
    modal.style.display = 'none';
    modal.classList.add('hidden');
    if (callbackConfirmar) callbackConfirmar();
  };
  
  document.getElementById('btnCancelarModal').onclick = function() {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  };
}

// ===================================
// GUARDAR FORMULARIO
// ===================================
async function guardarFormulario(event) {
  event.preventDefault();
  
  const btnEnviar = document.getElementById('btnEnviar');
  
  // ===================================
  // VALIDACIÓN DE TODAS LAS CALIFICACIONES
  // ===================================
  const calificacionRadio = document.querySelector('input[name="calificacion"]:checked');
  const dudasResueltasRadio = document.querySelector('input[name="dudas_resueltas"]:checked');
  const dominioTemaRadio = document.querySelector('input[name="dominio_tema"]:checked');
  const ambienteRadio = document.querySelector('input[name="ambiente"]:checked');
  const recomendaPmaRadio = document.querySelector('input[name="recomienda_pma"]:checked');
  
  // Validar calificación de la tutoría
  if (!calificacionRadio) {
    const ratingContainer = document.getElementById('ratingCalificacion');
    mostrarMensaje('mensajeFormulario', 'Por favor seleccione la calificación de la tutoría', 'error');
    setTimeout(() => {
      scrollToError(ratingContainer);
    }, 100);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
    return;
  }
  
  // Validar ¿Se resolvieron tus dudas?
  if (!dudasResueltasRadio) {
    const ratingContainer = document.getElementById('ratingDudasResueltas');
    mostrarMensaje('mensajeFormulario', 'Por favor seleccione si se resolvieron sus dudas', 'error');
    setTimeout(() => {
      scrollToError(ratingContainer);
    }, 100);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
    return;
  }
  
  // Validar ¿El tutor demostró dominio del tema?
  if (!dominioTemaRadio) {
    const ratingContainer = document.getElementById('ratingDominioTema');
    mostrarMensaje('mensajeFormulario', 'Por favor seleccione si el tutor demostró dominio del tema', 'error');
    setTimeout(() => {
      scrollToError(ratingContainer);
    }, 100);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
    return;
  }
  
  // Validar ¿Ambiente adecuado para concentrarte?
  if (!ambienteRadio) {
    const ratingContainer = document.getElementById('ratingAmbiente');
    mostrarMensaje('mensajeFormulario', 'Por favor seleccione si el ambiente fue adecuado para concentrarse', 'error');
    setTimeout(() => {
      scrollToError(ratingContainer);
    }, 100);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
    return;
  }
  
  // Validar ¿Recomendarías el PMA?
  if (!recomendaPmaRadio) {
    const ratingContainer = document.getElementById('ratingRecomiendaPma');
    mostrarMensaje('mensajeFormulario', 'Por favor seleccione si recomendaría el PMA', 'error');
    setTimeout(() => {
      scrollToError(ratingContainer);
    }, 100);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
    return;
  }
  
  // Desactivar botón para evitar doble envío
  btnEnviar.disabled = true;
  btnEnviar.textContent = '⏳ Enviando...';
  btnEnviar.style.opacity = '0.6';
  btnEnviar.style.cursor = 'not-allowed';
  
  mostrarCargando('mensajeFormulario');
  
  // NUEVO: Verificar si el instructor seleccionado ya fue usado en los últimos 90 minutos
  const instructorSeleccionado = document.getElementById('instructor').value;
  
  const verificacion = await verificarRegistroRecenteConInstructor(datosEstudiante.documento, instructorSeleccionado);
  
 if (!verificacion.puedeRegistrar) {
    const mensajeElement = document.getElementById('mensajeFormulario');
    
    mostrarMensaje('mensajeFormulario', 
      `Ya tienes una tutoría reciente con este tutor. Podrás registrar otra en ${verificacion.tiempoRestante}, o puedes realizarla con otro tutor si lo prefieres.`, 
      'error');
    
    // Reactivar botón
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
    
    setTimeout(() => {
      mensajeElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
    
    return;
  }

  // Obtener asignatura (puede ser personalizada)
  let asignatura = document.getElementById('asignatura').value;
  if (asignatura === 'Otra') {
    asignatura = document.getElementById('otraAsignatura').value.trim().toUpperCase();
    if (!asignatura) {
      mostrarMensaje('mensajeFormulario', 'Por favor especifique la asignatura', 'error');
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      btnEnviar.style.opacity = '1';
      btnEnviar.style.cursor = 'pointer';
      return;
    }
  }

  // Obtener tema (puede ser personalizado)
const selectTema = document.getElementById('tema');
const inputTema = document.getElementById('otroTema');
let tema = '';

// Caso 1: Select visible y con valor "Otro"
if (selectTema.value === 'Otro') {
  tema = inputTema.value.trim().toUpperCase();
  if (!tema) {
    mostrarMensaje('mensajeFormulario', 'Por favor especifique el tema', 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
    return;
  }
}
// Caso 2: Select oculto (no hay temas en BD o asignatura es "Otra")
else if (selectTema.style.display === 'none') {
  tema = inputTema.value.trim().toUpperCase();
  if (!tema) {
    mostrarMensaje('mensajeFormulario', 'Por favor ingrese el tema de la tutoría', 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
    return;
  }
}
// Caso 3: Select visible con tema normal seleccionado
else {
  tema = selectTema.value;
}

  const tipoAcompanamiento = document.getElementById('tipoAcompanamiento').value;
  const tituloCurso = tipoAcompanamiento === 'Curso y/o capacitación' 
    ? document.getElementById('tituloCurso').value.toUpperCase() 
    : null;
  
  // Obtener fecha y hora actual en Colombia (UTC-5)
  const fechaISO = obtenerFechaISOColombia();
  
  // Obtener el valor de facultad_departamento (puede estar vacío si es tutor)
  const facultadDepartamentoValue = document.getElementById('facultadDepartamento').value || null;
  
const datos = {
    documento: datosEstudiante.documento,
    nombres: datosEstudiante.nombres,
    apellidos: datosEstudiante.apellidos,
    facultad: datosEstudiante.facultad,
    programa: datosEstudiante.programa,
    semestre: datosEstudiante.semestre,
    grupo: datosEstudiante.grupo,
    tipo_acompanamiento: tipoAcompanamiento,
    titulo_curso: tituloCurso,
    sede_estudiante: datosEstudiante.sede,
    sede_tutoria: document.getElementById('sedeTutoria').value,
    tipo_instructor: document.getElementById('tipoInstructor').value,
    facultad_departamento: facultadDepartamentoValue,
    instructor: instructorSeleccionado,
    asignatura: asignatura,
    tema: tema,
    motivo_consulta: document.getElementById('motivoConsulta').value,
    calificacion: parseInt(calificacionRadio.value),
    dudas_resueltas: parseInt(dudasResueltasRadio.value),
    dominio_tema: parseInt(dominioTemaRadio.value),
    ambiente: parseInt(ambienteRadio.value),
    recomienda_pma: parseInt(recomendaPmaRadio.value),
    sugerencias: document.getElementById('sugerencias').value.toUpperCase() || 'Ninguna',
    fecha: fechaISO
  };

  try {
    await supabaseInsert('formularios', datos);
    
    if (elementosDOM.mensajeFormulario) {
      elementosDOM.mensajeFormulario.textContent = '';
    }
    
    const modal = document.getElementById('modalExitoFormulario');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    
    document.getElementById('formTutoria').reset();
    document.getElementById('grupoTituloCurso').classList.add('hidden');
    document.getElementById('grupoFacultadDepartamento').classList.add('hidden');
    document.getElementById('grupoInstructor').classList.add('hidden');
    document.getElementById('grupoMateria').classList.add('hidden');
    document.getElementById('grupoTema').classList.add('hidden');
    document.getElementById('grupoCalificacion').classList.add('hidden');
    document.getElementById('grupoMotivo').classList.add('hidden');
    document.getElementById('grupoSugerencias').classList.add('hidden');
    document.getElementById('btnEnviar').classList.add('hidden');
    formularioEnviandose = false;
    
    setTimeout(() => {
      location.reload(); // Recargar página para limpiar todo
    }, 3000);
  } catch (error) {
    mostrarMensaje('mensajeFormulario', error.message, 'error');
    // Reactivar botón si hay error
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
  }
}

// ===================================
// ACTUALIZACIÓN DE DATOS SEMESTRALES
// ===================================

function verificarActualizacionSemestral(estudiante) {
  // SOLO verificar si fecha_actualizacion es null (forzado desde ADMIN)
  // Ya NO se calculan fechas automáticamente
  
  if (!estudiante.fecha_actualizacion) {
    console.log('Necesita actualizar: fecha_actualizacion es null (forzado por admin)');
    return true;
  }
  
  console.log('NO necesita actualizar - Ya tiene fecha_actualizacion:', estudiante.fecha_actualizacion);
  return false;
}

function mostrarFormularioActualizacion(estudiante) {
  mostrarPantalla('pantallaActualizacion');
  document.getElementById('mensajeActualizacion').innerHTML = '';
  
  // Pre-llenar con datos actuales (SOLO semestre y grupo)
  document.getElementById('actualizarSemestre').value = estudiante.semestre || '';
  document.getElementById('actualizarGrupo').value = estudiante.grupo || '';
  
  // Mostrar nombre censurado
  const nombres = `${estudiante.primer_nombre} ${estudiante.segundo_nombre || ''}`.trim();
  const apellidos = `${estudiante.primer_apellido} ${estudiante.segundo_apellido}`.trim();
  const nombreCompleto = `${nombres} ${apellidos}`;
  document.getElementById('nombreEstudianteActualizacion').textContent = censurarNombre(nombreCompleto);
}

async function actualizarDatosEstudiante(event) {
  event.preventDefault();
  
  if (!estudianteActualizando) {
    mostrarMensaje('mensajeActualizacion', 'Error: No se encontró el estudiante', 'error');
    return;
  }
  
  const nuevoSemestre = parseInt(document.getElementById('actualizarSemestre').value);
  const nuevoGrupo = document.getElementById('actualizarGrupo').value.toUpperCase().trim();
  
  if (!nuevoSemestre || !nuevoGrupo) {
    mostrarMensaje('mensajeActualizacion', 'Por favor complete todos los campos', 'error');
    return;
  }
  
  mostrarCargando('mensajeActualizacion');
  
  try {
    // Fecha REAL en Colombia
    const fechaColombiaISO = obtenerFechaISOColombia();
    
    // Actualizar en Supabase
    const url = `${SUPABASE_URL}/rest/v1/estudiantes?documento=eq.${estudianteActualizando.documento}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        semestre: nuevoSemestre,
        grupo: nuevoGrupo,
        fecha_actualizacion: fechaColombiaISO
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar en la base de datos');
    }
    
    const resultado = await response.json();
    console.log('Datos actualizados:', resultado);
    
    // Continuar con el login
    const nombres = `${estudianteActualizando.primer_nombre} ${estudianteActualizando.segundo_nombre || ''}`.trim();
    const apellidos = `${estudianteActualizando.primer_apellido} ${estudianteActualizando.segundo_apellido}`.trim();
    const nombreCompleto = `${nombres} ${apellidos}`;
    
    datosEstudiante = {
      documento: estudianteActualizando.documento,
      nombres: nombres,
      apellidos: apellidos,
      nombreCensurado: censurarNombre(nombreCompleto),
      facultad: estudianteActualizando.facultad,
      programa: estudianteActualizando.programa,
      sede: estudianteActualizando.sede,
      semestre: nuevoSemestre,
      grupo: nuevoGrupo
    };
    
    formularioEnviandose = false;
    
    // ASEGURAR QUE TODOS LOS DATOS DEL FORMULARIO ESTÉN CARGADOS
    if (datosCache.tutoresNorte.length === 0 || datosCache.materias.length === 0 || datosCache.temas.length === 0) {
      try {
        // precargarDatosFormulario() ya imprime sus propios mensajes, no duplicar aquí
        await precargarDatosFormulario();
      } catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarMensaje('mensajeActualizacion', 'Error al cargar los datos del formulario. Por favor intenta de nuevo.', 'error');
        return;
      }
    }
    
    mostrarPantalla('pantallaFormulario');
    document.getElementById('nombreUsuario').textContent = 'Bienvenido(a): ' + datosEstudiante.nombreCensurado;
    if (elementosDOM.mensajeFormulario) {
      elementosDOM.mensajeFormulario.textContent = '';
    }
    actualizarBotonCerrarSesion();
    
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('mensajeActualizacion', 'Error al actualizar: ' + error.message, 'error');
  }
}

function cerrarSesion() {
  datosEstudiante = null;
  instructorActual = null;
  formularioEnviandose = false;
  
  // REACTIVAR BOTÓN DE ENVIAR
  const btnEnviar = document.getElementById('btnEnviar');
  if (btnEnviar) {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
  }
  
  // Resetear paginación
  paginaFormularioActual = 1;
  document.getElementById('paginaFormulario1').classList.remove('hidden');
  document.getElementById('paginaFormulario2').classList.add('hidden');
  document.getElementById('btnEnviar').classList.add('hidden');
  
  // Recargar la página para limpiar todo
  location.reload();
}




// ===================================
// MANEJO DEL BOTÓN DE RETROCESO (BACK BUTTON)
// ===================================

// Variable para rastrear la pantalla actual
let pantallaActual = 'pantallaBienvenida';
let historialNavegacion = ['pantallaBienvenida'];

// Actualizar el historial cuando cambia la pantalla
function actualizarHistorialNavegacion(nuevaPantalla) {
  pantallaActual = nuevaPantalla;
  
  // Agregar al historial del navegador
  const estadoActual = {
    pantalla: nuevaPantalla,
    timestamp: Date.now()
  };
  
  window.history.pushState(estadoActual, '', window.location.href);
}

// Modificar la función mostrarPantalla existente
const mostrarPantallaOriginal = mostrarPantalla;
mostrarPantalla = function(id) {
  mostrarPantallaOriginal(id);
  actualizarHistorialNavegacion(id);
};

// Manejador del evento popstate (botón de retroceso)
window.addEventListener('popstate', function(event) {
  event.preventDefault();
  
  // Si no hay estado, estamos en la página inicial
  if (!event.state) {
    if (pantallaActual !== 'pantallaBienvenida') {
      manejarRetroceso();
    }
    return;
  }
  
  manejarRetroceso();
});

// Función principal que maneja la lógica de retroceso
function manejarRetroceso() {
  
  // REGLA 1: Si estoy en "Llenar Formulario" → Volver a "Bienvenido"
  if (pantallaActual === 'pantallaLogin') {
    volverInicio();
    return;
  }
  
  // REGLA 2: Si estoy en "Registro de Asistencia" → Mostrar confirmación
  if (pantallaActual === 'pantallaFormulario') {
    // Prevenir el retroceso real del navegador
    window.history.pushState({ pantalla: pantallaActual }, '', window.location.href);
    
    confirmarCancelacion();
    return;
  }
  
  // REGLA 3: Si estoy en "Registro de Estudiante" → Mostrar confirmación
  if (pantallaActual === 'pantallaRegistro') {
    // Prevenir el retroceso real del navegador
    window.history.pushState({ pantalla: pantallaActual }, '', window.location.href);
    
    confirmarCancelacion();
    return;
  }
  
  
  // Por defecto, volver al inicio
  volverInicio();
}

// Inicializar el estado del historial al cargar la página
window.addEventListener('load', function() {
  // Establecer el estado inicial
  const estadoInicial = {
    pantalla: 'pantallaBienvenida',
    timestamp: Date.now()
  };
  
  window.history.replaceState(estadoInicial, '', window.location.href);
  pantallaActual = 'pantallaBienvenida';
});

// Prevenir que el navegador restaure el scroll al usar el botón de retroceso
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// ===================================
// FUNCIONES DE PAGINACIÓN
// ===================================
function validarPagina1() {
  const tipoAcompanamiento = document.getElementById('tipoAcompanamiento').value;
  const sedeTutoria = document.getElementById('sedeTutoria').value;
  const tipoInstructor = document.getElementById('tipoInstructor').value;
  const instructor = document.getElementById('instructor').value;
  const asignatura = document.getElementById('asignatura').value;
  const motivoConsulta = document.getElementById('motivoConsulta').value;

  // Validar campos básicos con mensajes específicos
  if (!tipoAcompanamiento) {
    return { valido: false, mensaje: 'Por favor seleccione un tipo de acompañamiento' };
  }
  if (!sedeTutoria) {
    return { valido: false, mensaje: 'Por favor seleccione una sede' };
  }
  if (!tipoInstructor) {
    return { valido: false, mensaje: 'Por favor seleccione un tipo de instructor' };
  }
  if (!instructor) {
    return { valido: false, mensaje: 'Por favor seleccione un instructor' };
  }
  if (!asignatura) {
    return { valido: false, mensaje: 'Por favor seleccione una asignatura' };
  }

  // Validar título del curso si es necesario
  if (tipoAcompanamiento === 'Curso y/o capacitación') {
    const tituloCurso = document.getElementById('tituloCurso').value.trim();
    if (!tituloCurso) {
      return { valido: false, mensaje: 'Por favor ingrese el título del curso/capacitación' };
    }
  }

  // Validar facultad/departamento si es profesor
  if (tipoInstructor === 'Profesor') {
    const facultadDepartamento = document.getElementById('facultadDepartamento').value;
    if (!facultadDepartamento) {
      return { valido: false, mensaje: 'Por favor seleccione una facultad/departamento' };
    }
  }

  // Validar asignatura personalizada si es necesaria
  if (asignatura === 'Otra') {
    const otraAsignatura = document.getElementById('otraAsignatura').value.trim();
    if (!otraAsignatura) {
      return { valido: false, mensaje: 'Por favor especifique la asignatura' };
    }
  }

  // Validar tema (ANTES del motivo de consulta)
  const selectTema = document.getElementById('tema');
  const inputTema = document.getElementById('otroTema');
  
  if (selectTema.style.display === 'none') {
    // Si el select está oculto, validar el input
    if (!inputTema.value.trim()) {
      return { valido: false, mensaje: 'Por favor ingrese el tema de la tutoría' };
    }
  } else {
    // Si el select está visible
    const tema = selectTema.value;
    if (!tema) {
      return { valido: false, mensaje: 'Por favor seleccione un tema' };
    }
    
    if (tema === 'Otro') {
      if (!inputTema.value.trim()) {
        return { valido: false, mensaje: 'Por favor especifique el tema' };
      }
    }
  }

  // Validar motivo de consulta (DESPUÉS del tema)
  if (!motivoConsulta) {
    return { valido: false, mensaje: 'Por favor seleccione un motivo de consulta' };
  }

  return { valido: true };
}

function avanzarPagina() {
  if (paginaFormularioActual === 1) {
    // Validar página 1 antes de avanzar
    const validacion = validarPagina1();
    
    if (!validacion.valido) {
      mostrarMensaje('mensajeFormulario', validacion.mensaje, 'error');
      return;
    }
    
  
    document.getElementById('paginaFormulario1').classList.add('hidden');
    document.getElementById('paginaFormulario2').classList.remove('hidden');
    document.getElementById('btnEnviar').classList.remove('hidden');
    if (elementosDOM.mensajeFormulario) {
      elementosDOM.mensajeFormulario.textContent = '';
    }
    
    paginaFormularioActual = 2;
    

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function retrocederPagina() {
  if (paginaFormularioActual === 2) {
    // Ocultar página 2, mostrar página 1
    document.getElementById('paginaFormulario2').classList.add('hidden');
    document.getElementById('paginaFormulario1').classList.remove('hidden');
    document.getElementById('btnEnviar').classList.add('hidden');
    if (elementosDOM.mensajeFormulario) {
      elementosDOM.mensajeFormulario.textContent = '';
    }
    
    paginaFormularioActual = 1;

    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Inicializar caché DOM primero
  inicializarCacheDOM();
  
  const labels = document.querySelectorAll('label');
  
  labels.forEach(label => {
    if (label.textContent.includes('*')) {
      // Usar manipulación DOM directa en lugar de innerHTML
      const asteriscos = label.querySelectorAll('span[style*="color: #dc3545"]');
      if (asteriscos.length === 0) {
        const span = document.createElement('span');
        span.style.color = '#dc3545';
        span.style.fontWeight = 'bold';
        span.style.fontSize = '16px';
        span.textContent = '*';
        label.innerHTML = label.innerHTML.replace(/\*/g, span.outerHTML);
      }
    }
  });
  
  // Inicializar pantalla de bienvenida usando caché DOM
  if (elementosDOM.pantallaBienvenida && elementosDOM.pantallaBienvenida.style.display !== 'none') {
    document.body.classList.add('welcome-active');
  }
  
});

// ===================================
// REINICIO AUTOMÁTICO POR INACTIVIDAD
// ===================================
// Reinicia la página si el usuario estuvo fuera más de X minutos

let tiempoSalida = null;
const MINUTOS_PARA_REINICIAR = 3;

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    // Usuario salió de la página (minimizó, cambió de pestaña, cerró navegador)
    tiempoSalida = Date.now();
  } else {
    // Usuario volvió a la página
    if (tiempoSalida) {
      const minutosAusente = (Date.now() - tiempoSalida) / 1000 / 60;
      if (minutosAusente >= MINUTOS_PARA_REINICIAR) {
        location.reload();
      }
      tiempoSalida = null;
    }
  }
});
