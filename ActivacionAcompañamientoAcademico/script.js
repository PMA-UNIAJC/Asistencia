// ============================================================
// Configuración de Supabase
// ============================================================
const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;

const TIMEZONE_COLOMBIA = 'America/Bogota';

// ============================================================
// Datos estáticos de opciones
// ============================================================
const ASIGNATURAS_DISPONIBLES = [
  'Comunicación y Lenguaje I - II',
  'Cálculo Diferencial',
  'Cálculo Integral',
  'Matemáticas I - Básicas - Fundamental',
  'Matemáticas II',
  'Lógica y Razonamiento',
  'Otras'
];

const ASIGNATURAS_MATEMATICAS = [
  'Cálculo Diferencial',
  'Cálculo Integral',
  'Matemáticas I - Básicas - Fundamental',
  'Matemáticas II',
  'Lógica y Razonamiento'
];

const MOTIVOS_MATEMATICAS = [
  'Bajo rendimiento académico',
  'Bajas calificaciones en actividades evaluativas',
  'Falta de técnicas de estudio',
  'Manejo inadecuado de las herramientas tecnológicas',
  'Dificultad en el manejo de unidades de medida',
  'Dificultad en el planteamiento algebraico de problemas matemáticos',
  'Dificultad en la resolución de problemas matemáticos',
  'Dificultad en el trabajo algebraico',
  'Manejo de cálculos matemáticos con calculadora'
];

const MOTIVOS_COMUNICACION = [
  'Bajas calificaciones en actividades evaluativas',
  'Bajo rendimiento académico',
  'Falta de técnicas de estudio',
  'Manejo inadecuado de las herramientas tecnológicas',
  'Acentuación y uso de tildes',
  'Dificultad en el análisis de textos académicos',
  'Dificultad en la compresión de textos',
  'Dificultad en la lectura de textos académicos',
  'Dificultad en la redacción de textos académicos',
  'Manejo inadecuado en NORMAS APA',
  'Ortografía y uso de mayúsculas',
  'Taller de escritura',
  'Técnicas de estudio y lectura comprensiva',
  'Uso de signos de puntuación'
];

const OPCIONES_SEDE = [
  { value: 'Sur',     text: 'Sur' },
  { value: 'Norte',   text: 'Norte' },
  { value: 'Virtual', text: 'Virtual' }
];

const OPCIONES_SEMESTRE = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  text: String(i + 1)
}));

const OPCIONES_CARGO = [
  { value: 'Profesor Ocasional Tiempo Completo', text: 'Profesor Ocasional Tiempo Completo' },
  { value: 'Profesor Hora Cátedra',              text: 'Profesor Hora Cátedra' },
  { value: 'Funcionario',                        text: 'Funcionario' },
  { value: 'Dependencia - Facultad',             text: 'Dependencia - Facultad' }
];

const OPCIONES_DEPENDENCIA = [
  { value: 'Centro de Idiomas',                         text: 'Centro de Idiomas' },
  { value: 'Coordinación Académica',                    text: 'Coordinación Académica' },
  { value: 'Departamento de Ciencias Básicas',          text: 'Departamento de Ciencias Básicas' },
  { value: 'Facultad de Ciencias Empresariales',        text: 'Facultad de Ciencias Empresariales' },
  { value: 'Facultad de Ciencias Sociales y Humanas',   text: 'Facultad de Ciencias Sociales y Humanas' },
  { value: 'Facultad de Educación a Distancia y Virtual', text: 'Facultad de Educación a Distancia y Virtual' },
  { value: 'Facultad de Ingenierías',                   text: 'Facultad de Ingenierías' },
  { value: 'PAI',                                       text: 'PAI' },
  { value: 'Psicología',                                text: 'Psicología' },
  { value: 'Vicerrectoría Académica',                   text: 'Vicerrectoría Académica' }
];

const OPCIONES_SI_NO = [
  { value: 'Si', text: 'Sí' },
  { value: 'No', text: 'No' }
];

const OPCIONES_DOMINIO_CORREO = [
  { value: 'estudiante.uniajc.edu.co',  text: 'estudiante.uniajc.edu.co' },
  { value: 'profesores.uniajc.edu.co',  text: 'profesores.uniajc.edu.co' },
  { value: 'admon.uniajc.edu.co',       text: 'admon.uniajc.edu.co' }
];

// ============================================================
// Textos dinámicos según tipo de acompañamiento
// ============================================================
const TEXTOS = {
  Individual: {
    subtitulo:       'Datos del Estudiante',
    labelDocumento:  'Número de documento de identidad del estudiante',
    labelContacto:   'Número de contacto del estudiante',
    labelCorreo:     'Correo del estudiante',
    labelGrupo:      'Grupo al que pertenece el estudiante',
    labelFacultad:   'Facultad a la cual pertenece el estudiante',
    labelPrograma:   'Programa académico al cual pertenece el estudiante',
    labelConsciente: '¿El estudiante es consciente del acompañamiento académico?'
  },
  Grupal: {
    subtitulo:       'Datos del Grupo',
    labelDocumento:  'Número de documento de identidad del vocero',
    labelContacto:   'Número de contacto del vocero del grupo',
    labelCorreo:     'Correo del vocero del grupo',
    labelGrupo:      'Grupo al que se debe realizar el acompañamiento',
    labelFacultad:   'Facultad a la cual pertenece el grupo',
    labelPrograma:   'Programa académico al cual pertenece el grupo',
    labelConsciente: '¿El grupo es consciente del acompañamiento académico?'
  }
};

// ============================================================
// Caché de facultades / programas
// ============================================================
let datosCacheFacultades = [];
let facultadesData = {};

// ============================================================
// Utilidades Supabase
// ============================================================
async function supabaseQuery(table, options = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = [];

  if (options.select) params.push(`select=${options.select}`);
  if (options.eq)     params.push(`${options.eq.field}=eq.${encodeURIComponent(options.eq.value)}`);
  if (options.ilike)  params.push(`${options.ilike.field}=ilike.${encodeURIComponent(options.ilike.value)}`);
  if (options.order)  params.push(`order=${options.order}`);
  if (options.in) {
    const { field, values } = options.in;
    params.push(`${field}=in.(${values.map(v => encodeURIComponent(v)).join(',')})`);
  }

  if (params.length) url += `?${params.join('&')}`;

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || err.hint || `Error ${response.status}`);
  }
  return response.json();
}

async function supabaseInsert(table, data) {
  console.log('Enviando a tabla:', table, JSON.stringify(data, null, 2));
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || err.hint || `Error ${response.status}`);
  }
  return response.json();
}

// ============================================================
// Fecha Colombia
// ============================================================
function obtenerFechaColombia() {
  const ahora = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_COLOMBIA,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const p = formatter.formatToParts(ahora);
  const g = type => p.find(x => x.type === type).value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}`;
}

// ============================================================
// Validaciones
// ============================================================
function limpiarEspacios(input) {
  input.value = input.value.trim().replace(/\s+/g, ' ');
}

function validarDocumento(input) {
  const len = input.value.length;
  input.setCustomValidity(len > 0 && (len < 7 || len > 12) ? 'Escriba correctamente su documento' : '');
}

function validarContacto(input) {
  const val = input.value;
  if (val.length > 0) {
    input.setCustomValidity(val.length !== 10 || !val.startsWith('3') ? 'Número de contacto no válido' : '');
  } else {
    input.setCustomValidity('');
  }
}

// ============================================================
// Correos (función genérica — funciona con cualquier prefijo)
// ============================================================
function actualizarCorreoCompleto(prefijo) {
  const correoInput    = document.getElementById(prefijo);
  const dominioSelect  = document.getElementById(`dominio${prefijo.charAt(0).toUpperCase()}${prefijo.slice(1)}`);
  const correoCompleto = document.getElementById(`${prefijo}Completo`);

  if (!correoInput || !dominioSelect || !correoCompleto) return;

  const correo = correoInput.value.trim().toLowerCase();
  const dominio = dominioSelect.value.toLowerCase();

  correoCompleto.value = (correo && dominio) ? `${correo}@${dominio}` : '';
  correoInput.setCustomValidity('');
}

// ============================================================
// Generadores de selects
// ============================================================
function generarSelect(selectId, opciones, placeholder, required = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = `<option value="">${placeholder}</option>`;
  opciones.forEach(op => {
    const opt = document.createElement('option');
    opt.value   = op.value;
    opt.textContent = op.text;
    select.appendChild(opt);
  });
  select.required = required;
}

function generarSelectDominioCorreo(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Seleccione</option>';
  OPCIONES_DOMINIO_CORREO.forEach(op => {
    const opt = document.createElement('option');
    opt.value       = op.value;
    opt.textContent = op.text;
    select.appendChild(opt);
  });
  select.required = true;
}

function poblarSelect(selectElement, datos, opciones = {}) {
  const { primeraOpcion = '', ordenar = null } = opciones;

  selectElement.innerHTML = primeraOpcion ? `<option value="">${primeraOpcion}</option>` : '';

  const datosOrdenados = ordenar ? [...datos].sort(ordenar) : datos;
  const fragment = document.createDocumentFragment();

  datosOrdenados.forEach(item => {
    const opt = document.createElement('option');
    opt.value       = item;
    opt.textContent = item;
    fragment.appendChild(opt);
  });

  selectElement.appendChild(fragment);
}

// ============================================================
// Facultades y programas (desde BD)
// ============================================================
async function precargarDatosFacultades() {
  if (datosCacheFacultades.length > 0) return;
  const data = await supabaseQuery('facultades_carreras');
  datosCacheFacultades = data;

  facultadesData = {};
  data.forEach(item => {
    if (!facultadesData[item.facultad]) facultadesData[item.facultad] = [];
    facultadesData[item.facultad].push(item.programa);
  });
  for (const f in facultadesData) {
    facultadesData[f] = [...new Set(facultadesData[f])];
  }
}

function cargarFacultades() {
  const select = document.getElementById('facultad');
  if (!select) return;
  poblarSelect(select, Object.keys(facultadesData), {
    primeraOpcion: 'Seleccione una facultad',
    ordenar: (a, b) => a.localeCompare(b)
  });
}

// Un solo select de programa, un solo select de facultad
function actualizarProgramas() {
  const facultadSelect  = document.getElementById('facultad');
  const programaSelect  = document.getElementById('programa');
  const facultad        = facultadSelect.value;

  programaSelect.innerHTML = '<option value="">Seleccione un programa</option>';

  if (facultad && facultadesData[facultad]) {
    poblarSelect(programaSelect, facultadesData[facultad], {
      primeraOpcion: 'Seleccione un programa',
      ordenar: (a, b) => a.localeCompare(b)
    });
    programaSelect.disabled = false;
    programaSelect.required = true;
  } else {
    programaSelect.disabled = true;
  }
}

// ============================================================
// Asignaturas y motivos (un solo conjunto de elementos)
// ============================================================
function generarAsignaturasCheckboxes() {
  const container = document.getElementById('asignaturasContainer');
  if (!container) return;
  container.innerHTML = '';

  ASIGNATURAS_DISPONIBLES.forEach(asignatura => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';

    const input = document.createElement('input');
    input.type     = 'checkbox';
    input.name     = 'asignatura';
    input.value    = asignatura;
    input.onchange = manejarAsignaturas;

    const span = document.createElement('span');
    span.textContent = asignatura;

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function manejarAsignaturas() {
  const seleccionadas  = Array.from(document.querySelectorAll('input[name="asignatura"]:checked')).map(cb => cb.value);
  const otroContainer  = document.getElementById('otroAsignaturaContainer');
  const otroInput      = document.getElementById('otroAsignatura');
  const motivosContainer = document.getElementById('motivosContainer');

  // Mostrar/ocultar "Otras"
  const tieneOtras = seleccionadas.includes('Otras');
  otroContainer.classList.toggle('hidden', !tieneOtras);
  otroInput.required = tieneOtras;
  if (!tieneOtras) otroInput.value = '';

  if (seleccionadas.length === 0) {
    motivosContainer.classList.add('hidden');
    document.getElementById('motivosCheckboxes').innerHTML = '';
    return;
  }

  // Calcular motivos a mostrar
  const tieneMatematicas  = seleccionadas.some(a => ASIGNATURAS_MATEMATICAS.includes(a));
  const tieneComunicacion = seleccionadas.includes('Comunicación y Lenguaje I - II');

  let motivosAMostrar = [];

  if (tieneOtras) {
    motivosAMostrar = [...new Set([...MOTIVOS_MATEMATICAS, ...MOTIVOS_COMUNICACION])];
  } else {
    if (tieneMatematicas)  motivosAMostrar.push(...MOTIVOS_MATEMATICAS);
    if (tieneComunicacion) motivosAMostrar.push(...MOTIVOS_COMUNICACION);
    if (tieneMatematicas && tieneComunicacion) motivosAMostrar = [...new Set(motivosAMostrar)];
  }

  // Orden: matemáticas primero, comunicación después
  motivosAMostrar.sort((a, b) => {
    const aM = MOTIVOS_MATEMATICAS.includes(a);
    const bM = MOTIVOS_MATEMATICAS.includes(b);
    if (aM && !bM) return -1;
    if (!aM && bM) return 1;
    return 0;
  });

  // Renderizar checkboxes de motivos
  const motivosCheckboxes = document.getElementById('motivosCheckboxes');
  motivosCheckboxes.innerHTML = '';
  motivosAMostrar.forEach(motivo => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';

    const input = document.createElement('input');
    input.type  = 'checkbox';
    input.name  = 'motivo';
    input.value = motivo;

    const span = document.createElement('span');
    span.textContent = motivo;

    label.appendChild(input);
    label.appendChild(span);
    motivosCheckboxes.appendChild(label);
  });

  motivosContainer.classList.toggle('hidden', motivosAMostrar.length === 0);
}

// ============================================================
// Manejo del tipo de acompañamiento — actualiza labels y visibilidad
// ============================================================
function manejarTipoAcompanamiento() {
  const tipo = document.getElementById('tipoAcompanamiento').value;
  const seccion = document.getElementById('seccionDinamica');

  if (!tipo) {
    seccion.classList.add('hidden');
    resetearFormulario(false);
    return;
  }

  // Mostrar sección compartida
  seccion.classList.remove('hidden');

  const textos = TEXTOS[tipo];

  // Actualizar subtítulo
  document.getElementById('subtituloDinamico').textContent = textos.subtitulo;

  // Actualizar todos los labels dinámicos (sin tocar el asterisco)
  actualizarLabel('labelDocumento',  textos.labelDocumento);
  actualizarLabel('labelContacto',   textos.labelContacto);
  actualizarLabel('labelCorreoPersona', textos.labelCorreo);
  actualizarLabel('labelGrupo',      textos.labelGrupo);
  actualizarLabel('labelFacultad',   textos.labelFacultad);
  actualizarLabel('labelPrograma',   textos.labelPrograma);
  actualizarLabel('labelConsciente', textos.labelConsciente);

  // Campos exclusivos según tipo
  const campoNombreIndividual = document.getElementById('campoNombresIndividual');
  const campoNombreVocero     = document.getElementById('campoNombreVocero');
  const nombresApellidos      = document.getElementById('nombresApellidos');
  const nombresVocero         = document.getElementById('nombresApellidosVocero');

  if (tipo === 'Individual') {
    // Mostrar nombre del estudiante, ocultar nombre del vocero
    campoNombreIndividual.classList.remove('hidden');
    campoNombreVocero.classList.add('hidden');
    nombresApellidos.required = true;
    nombresVocero.required    = false;
    nombresVocero.value       = '';
  } else {
    // Mostrar nombre del vocero, ocultar nombre del estudiante
    campoNombreVocero.classList.remove('hidden');
    campoNombreIndividual.classList.add('hidden');
    nombresVocero.required    = true;
    nombresApellidos.required = false;
    nombresApellidos.value    = '';
  }

  // Limpiar campos comunes al cambiar de tipo para evitar datos cruzados
  limpiarCamposComunes();
}

// Actualiza el texto de un label conservando el <span> del asterisco
function actualizarLabel(labelId, nuevoTexto) {
  const label = document.getElementById(labelId);
  if (!label) return;
  const asterisco = label.querySelector('span');
  label.textContent = nuevoTexto + ' ';
  if (asterisco) label.appendChild(asterisco);
}

function limpiarCamposComunes() {
  // Inputs de texto / tel
  ['documento', 'nombresApellidos', 'nombresApellidosVocero', 'contacto',
   'correoPersona', 'grupo', 'nombreSolicitante', 'correo', 'otroAsignatura', 'infoAdicional'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Campos ocultos de correo
  ['correoPersonaCompleto', 'correoCompleto'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Selects — volver a primera opción
  ['sede', 'facultad', 'semestre', 'consciente', 'cargo', 'dependencia',
   'dominioCorreoPersona', 'dominioCorreo'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  // Programa — deshabilitar y limpiar
  const programa = document.getElementById('programa');
  if (programa) {
    programa.innerHTML = '<option value="">Seleccione un programa</option>';
    programa.disabled = true;
  }

  // Checkboxes de asignaturas
  document.querySelectorAll('input[name="asignatura"]').forEach(cb => cb.checked = false);

  // Motivos — ocultar y limpiar
  document.getElementById('motivosCheckboxes').innerHTML = '';
  document.getElementById('motivosContainer').classList.add('hidden');
  document.getElementById('otroAsignaturaContainer').classList.add('hidden');
}

// ============================================================
// Obtener datos del formulario (estructura unificada)
// ============================================================
function obtenerDatosFormulario() {
  const tipo = document.getElementById('tipoAcompanamiento').value;

  // Limpiar espacios en todos los inputs visibles
  document.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(el => {
    if (el.value.trim()) limpiarEspacios(el);
  });

  // Asignaturas
  const asignaturas = Array.from(document.querySelectorAll('input[name="asignatura"]:checked')).map(cb => cb.value);
  const otraAsignatura = document.getElementById('otroAsignatura').value.trim();
  if (asignaturas.includes('Otras') && otraAsignatura) {
    asignaturas[asignaturas.indexOf('Otras')] = `Otras: ${otraAsignatura.toUpperCase()}`;
  }

  // Motivos
  const motivos = Array.from(document.querySelectorAll('input[name="motivo"]:checked')).map(cb => cb.value);

  // Campos comunes
  const datos = {
    tipo_acompanamiento:  tipo,
    fecha_hora:           obtenerFechaColombia(),
    documento:            document.getElementById('documento').value.trim().toUpperCase(),
    contacto:             document.getElementById('contacto').value.trim(),
    correo_estudiante:    document.getElementById('correoPersonaCompleto').value.trim().toLowerCase(),
    grupo:                document.getElementById('grupo').value.trim().toUpperCase(),
    sede:                 document.getElementById('sede').value,
    facultad_estudiante:  document.getElementById('facultad').value,
    programa_estudiante:  document.getElementById('programa').value,
    semestre:             document.getElementById('semestre').value,
    enterado:             document.getElementById('consciente').value,
    profesor:             document.getElementById('nombreSolicitante').value.trim().toUpperCase(),
    cargo:                document.getElementById('cargo').value,
    dependencia:          document.getElementById('dependencia').value,
    correo_profesor:      document.getElementById('correoCompleto').value.trim().toLowerCase(),
    asignatura:           asignaturas.join('; '),
    motivo:               motivos.join('; '),
    comentarios:          document.getElementById('infoAdicional').value.trim().toUpperCase() || null
  };

  // Campos exclusivos según tipo
  if (tipo === 'Individual') {
    datos.nombres_y_apellidos = document.getElementById('nombresApellidos').value.trim().toUpperCase();
  } else {
    datos.nombres_y_apellidos = document.getElementById('nombresApellidosVocero').value.trim().toUpperCase();
  }

  return datos;
}

// ============================================================
// Validación antes de enviar
// ============================================================
function validarFormulario() {
  const tipo = document.getElementById('tipoAcompanamiento').value;

  if (!tipo) {
    mostrarMensaje('Por favor seleccione un tipo de acompañamiento', 'error');
    return false;
  }

  // Documento
  const docInput = document.getElementById('documento');
  validarDocumento(docInput);
  if (!docInput.validity.valid) { docInput.reportValidity(); scrollToError(docInput); return false; }

  // Nombre individual
  if (tipo === 'Individual') {
    const nombres = document.getElementById('nombresApellidos');
    if (!nombres.value.trim()) {
      mostrarMensaje('Por favor ingrese los nombres y apellidos del estudiante', 'error');
      scrollToError(nombres); return false;
    }
  } else {
    const vocero = document.getElementById('nombresApellidosVocero');
    if (!vocero.value.trim()) {
      mostrarMensaje('Por favor ingrese los nombres y apellidos del vocero', 'error');
      scrollToError(vocero); return false;
    }
  }

  // Contacto
  const contactoInput = document.getElementById('contacto');
  validarContacto(contactoInput);
  if (!contactoInput.validity.valid) { contactoInput.reportValidity(); scrollToError(contactoInput); return false; }

  // Correo de la persona (estudiante/vocero)
  const correoPersonaCompleto = document.getElementById('correoPersonaCompleto').value.trim();
  if (!correoPersonaCompleto || !correoPersonaCompleto.includes('@')) {
    mostrarMensaje('Por favor complete el correo correctamente', 'error');
    scrollToError(document.getElementById('correoPersona')); return false;
  }

  // Facultad
  if (!document.getElementById('facultad').value) {
    mostrarMensaje('Por favor seleccione una facultad', 'error');
    scrollToError(document.getElementById('facultad')); return false;
  }

  // Programa
  const programaEl = document.getElementById('programa');
  if (!programaEl.value || programaEl.disabled) {
    mostrarMensaje('Por favor seleccione un programa', 'error');
    scrollToError(programaEl); return false;
  }

  // Asignaturas
  const asignaturas = Array.from(document.querySelectorAll('input[name="asignatura"]:checked'));
  if (asignaturas.length === 0) {
    mostrarMensaje('Por favor seleccione al menos una asignatura', 'error');
    scrollToError(document.getElementById('asignaturasContainer')); return false;
  }

  if (asignaturas.some(a => a.value === 'Otras')) {
    if (!document.getElementById('otroAsignatura').value.trim()) {
      mostrarMensaje('Por favor especifique la otra asignatura', 'error');
      scrollToError(document.getElementById('otroAsignatura')); return false;
    }
  }

  // Motivos
  const motivos = Array.from(document.querySelectorAll('input[name="motivo"]:checked'));
  if (motivos.length === 0) {
    mostrarMensaje('Por favor seleccione al menos un motivo', 'error');
    scrollToError(document.getElementById('motivosContainer')); return false;
  }

  // Correo institucional del solicitante
  const correoCompleto = document.getElementById('correoCompleto').value.trim();
  if (!correoCompleto || !correoCompleto.includes('@')) {
    mostrarMensaje('Por favor complete el correo institucional correctamente', 'error');
    scrollToError(document.getElementById('correo')); return false;
  }

  return true;
}

// ============================================================
// Envío del formulario
// ============================================================
let intentosRestantes = 3;

async function enviarFormulario(event) {
  event.preventDefault();

  const btnEnviar = document.getElementById('btnEnviar');

  if (!validarFormulario()) {
    btnEnviar.disabled  = false;
    btnEnviar.textContent = 'Enviar Formulario';
    return;
  }

  let datos;
  try {
    datos = obtenerDatosFormulario();
  } catch (err) {
    console.error('Error al obtener datos:', err);
    mostrarMensaje('Error al procesar los datos del formulario', 'error');
    return;
  }

  btnEnviar.disabled    = true;
  btnEnviar.textContent = 'Enviando...';
  intentosRestantes     = 3;

  try {
    await intentarEnviarConReintentos(datos);
  } catch (err) {
    console.error('Error después de 3 intentos:', err);
    mostrarMensaje('Error al enviar el formulario después de 3 intentos. Verifique su conexión e intente nuevamente.', 'error');
    btnEnviar.disabled    = false;
    btnEnviar.textContent = 'Enviar Formulario';
  }
}

async function intentarEnviarConReintentos(datos, intento = 1) {
  const btnEnviar = document.getElementById('btnEnviar');
  try {
    await supabaseInsert('acompanamiento', datos);
    intentosRestantes = 3;
    mostrarModalExito();

    setTimeout(() => {
      resetearFormulario(true);
      btnEnviar.disabled    = false;
      btnEnviar.textContent = 'Enviar Formulario';
      regresarABienvenida();
    }, 2000);

    return true;
  } catch (err) {
    console.error(`Error intento ${intento}:`, err);
    if (intento < 3) {
      intentosRestantes = 3 - intento;
      btnEnviar.textContent = `Reintentando... (${intentosRestantes} intentos restantes)`;
      await new Promise(r => setTimeout(r, intento * 1000));
      return intentarEnviarConReintentos(datos, intento + 1);
    }
    intentosRestantes = 3;
    throw err;
  }
}

// ============================================================
// Resetear formulario completo
// ============================================================
function resetearFormulario(incluirTipo = true) {
  if (incluirTipo) {
    document.getElementById('tipoAcompanamiento').selectedIndex = 0;
    document.getElementById('seccionDinamica').classList.add('hidden');
  }
  limpiarCamposComunes();
}

// ============================================================
// UI helpers
// ============================================================
function scrollToError(elemento) {
  if (!elemento) return;
  elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    if (elemento.focus) elemento.focus();
    elemento.style.transition  = 'box-shadow 0.3s ease';
    elemento.style.boxShadow   = '0 0 0 4px rgba(220, 53, 69, 0.3)';
    setTimeout(() => { elemento.style.boxShadow = ''; }, 2000);
  }, 300);
}

function mostrarMensaje(mensaje, tipo) {
  const el = document.getElementById('mensajeFormulario');
  el.textContent = mensaje;
  el.className   = `mensaje ${tipo}`;
  el.style.display = 'block';

  if (tipo === 'error') {
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function mostrarModalExito() {
  const modal = document.getElementById('modalExito');
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('hidden'), 3000);
}

// ============================================================
// Navegación entre pantallas
// ============================================================
async function mostrarFormulario() {
  try {
    if (datosCacheFacultades.length === 0) await precargarDatosFacultades();
    cargarFacultades();
  } catch (err) {
    console.error('Error al cargar facultades:', err);
  }

  const bienvenida  = document.getElementById('pantallaBienvenida');
  const formulario  = document.getElementById('contenidoFormulario');

  bienvenida.style.opacity    = '0';
  bienvenida.style.transition = 'opacity 0.5s ease';

  setTimeout(() => {
    bienvenida.style.display  = 'none';
    formulario.classList.remove('hidden');
    formulario.style.opacity  = '0';
    formulario.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      formulario.style.opacity = '1';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, 500);
}

function regresarABienvenida() {
  const bienvenida = document.getElementById('pantallaBienvenida');
  const formulario = document.getElementById('contenidoFormulario');

  formulario.style.opacity    = '0';
  formulario.style.transition = 'opacity 0.5s ease';

  setTimeout(() => {
    formulario.classList.add('hidden');
    bienvenida.style.display  = 'flex';
    bienvenida.style.opacity  = '0';
    bienvenida.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      bienvenida.style.opacity = '1';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, 500);
}

function mostrarConfirmacionCancelar() {
  const modal = document.getElementById('modalConfirmacion');
  document.getElementById('tituloConfirmacion').textContent  = '¿Seguro que deseas cancelar?';
  document.getElementById('mensajeConfirmacion').textContent = 'Se perderán todos los datos del formulario que has ingresado.';

  modal.style.display = 'flex';
  modal.classList.remove('hidden');

  document.getElementById('btnConfirmarModal').onclick = () => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
    window.location.reload();
  };
  document.getElementById('btnCancelarModal').onclick = () => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  };
}

// ============================================================
// Reinicio automático por inactividad (3 minutos)
// ============================================================
let tiempoSalida = null;
const MINUTOS_PARA_REINICIAR = 3;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    tiempoSalida = Date.now();
  } else if (tiempoSalida) {
    const minutosAusente = (Date.now() - tiempoSalida) / 60000;
    if (minutosAusente >= MINUTOS_PARA_REINICIAR) location.reload();
    tiempoSalida = null;
  }
});

// ============================================================
// Inicialización al cargar el DOM
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Precargar facultades en segundo plano
  try {
    await precargarDatosFacultades();
  } catch (err) {
    console.error('Error al precargar facultades:', err);
  }

  // Generar todos los selects estáticos (una sola vez)
  generarSelect('sede',       OPCIONES_SEDE,      'Seleccione una sede');
  generarSelect('semestre',   OPCIONES_SEMESTRE,  'Seleccione un semestre');
  generarSelect('consciente', OPCIONES_SI_NO,     'Seleccione una opción');
  generarSelect('cargo',      OPCIONES_CARGO,     'Seleccione un cargo');
  generarSelect('dependencia',OPCIONES_DEPENDENCIA,'Seleccione una dependencia');

  generarSelectDominioCorreo('dominioCorreoPersona');
  generarSelectDominioCorreo('dominioCorreo');

  // Programa empieza deshabilitado
  const programaEl = document.getElementById('programa');
  if (programaEl) {
    programaEl.innerHTML = '<option value="">Seleccione un programa</option>';
    programaEl.disabled  = true;
  }

  // Cargar facultades en el select
  cargarFacultades();

  // Event listener facultad → programa
  document.getElementById('facultad').addEventListener('change', actualizarProgramas);

  // Generar checkboxes de asignaturas
  generarAsignaturasCheckboxes();

  // Event listeners de correos
  [
    { input: 'correoPersona', dominio: 'dominioCorreoPersona' },
    { input: 'correo',        dominio: 'dominioCorreo'        }
  ].forEach(({ input, dominio }) => {
    document.getElementById(dominio)?.addEventListener('change', () => actualizarCorreoCompleto(input));
    document.getElementById(input)?.addEventListener('blur',     () => actualizarCorreoCompleto(input));
  });

  console.log('Formulario Acompañamiento Académico iniciado (refactorizado)');
});