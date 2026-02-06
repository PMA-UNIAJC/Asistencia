// Configuración de Supabase
const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;

// Zona horaria de Colombia (Bogotá, UTC-5)
const TIMEZONE_COLOMBIA = 'America/Bogota';

// Lista de asignaturas disponibles
const ASIGNATURAS_DISPONIBLES = [
  'Comunicación y Lenguaje I - II',
  'Cálculo Diferencial',
  'Cálculo Integral',
  'Matemáticas I - Básicas - Fundamental',
  'Matemáticas II',
  'Lógica y Razonamiento',
  'Otras'
];

// Opciones para selects compartidos
const OPCIONES_SEDE = [
  { value: 'Sur', text: 'Sur' },
  { value: 'Norte', text: 'Norte' },
  { value: 'Virtual', text: 'Virtual' }
];

// Caché para facultades y programas desde la BD
let datosCacheFacultades = [];
let facultadesData = {};

const OPCIONES_SEMESTRE = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  text: String(i + 1)
}));

const OPCIONES_CARGO = [
  { value: 'Profesor Ocasional Tiempo Completo', text: 'Profesor Ocasional Tiempo Completo' },
  { value: 'Profesor Hora Cátedra', text: 'Profesor Hora Cátedra' },
  { value: 'Funcionario', text: 'Funcionario' },
  { value: 'Dependencia - Facultad', text: 'Dependencia - Facultad' }
];

const OPCIONES_DEPENDENCIA = [
  { value: 'Centro de Idiomas', text: 'Centro de Idiomas' },
  { value: 'Coordinación Académica', text: 'Coordinación Académica' },
  { value: 'Departamento de Ciencias Básicas', text: 'Departamento de Ciencias Básicas' },
  { value: 'Facultad de Ciencias Empresariales', text: 'Facultad de Ciencias Empresariales' },
  { value: 'Facultad de Ciencias Sociales y Humanas', text: 'Facultad de Ciencias Sociales y Humanas' },
  { value: 'Facultad de Educación a Distancia y Virtual', text: 'Facultad de Educación a Distancia y Virtual' },
  { value: 'Facultad de Ingenierías', text: 'Facultad de Ingenierías' },
  { value: 'PAI', text: 'PAI' },
  { value: 'Psicología', text: 'Psicología' },
  { value: 'Vicerrectoría Académica', text: 'Vicerrectoría Académica' }
];

const OPCIONES_SI_NO = [
  { value: 'Si', text: 'Sí' },
  { value: 'No', text: 'No' }
];

const OPCIONES_DOMINIO_CORREO = [
  { value: 'estudiante.uniajc.edu.co', text: 'estudiante.uniajc.edu.co' },
  { value: 'profesores.uniajc.edu.co', text: 'profesores.uniajc.edu.co' },
  { value: 'admon.uniajc.edu.co', text: 'admon.uniajc.edu.co' }
];

// Motivos por asignatura
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

// Asignaturas de matemáticas
const ASIGNATURAS_MATEMATICAS = [
  'Cálculo Diferencial',
  'Cálculo Integral',
  'Matemáticas I - Básicas - Fundamental',
  'Matemáticas II',
  'Lógica y Razonamiento'
];

// Función para obtener la fecha actual en zona horaria de Colombia (sin timezone)
function obtenerFechaColombia() {
  const ahora = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_COLOMBIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const partes = formatter.formatToParts(ahora);
  const anio = partes.find(p => p.type === 'year').value;
  const mes = partes.find(p => p.type === 'month').value;
  const dia = partes.find(p => p.type === 'day').value;
  const hora = partes.find(p => p.type === 'hour').value;
  const minuto = partes.find(p => p.type === 'minute').value;
  const segundo = partes.find(p => p.type === 'second').value;
  
  const fechaLocal = `${anio}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;
  
  return fechaLocal;
}

// Función para consultar datos en Supabase
async function supabaseQuery(table, options = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = [];
  
  if (options.select) params.push(`select=${options.select}`);
  if (options.eq) params.push(`${options.eq.field}=eq.${encodeURIComponent(options.eq.value)}`);
  if (options.ilike) params.push(`${options.ilike.field}=ilike.${encodeURIComponent(options.ilike.value)}`);
  if (options.order) params.push(`order=${options.order}`);
  
  // Soporte para filtro "in" (múltiples valores)
  if (options.in) {
    const { field, values } = options.in;
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
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de respuesta:', response.status, response.statusText);
      console.error('Detalles del error:', errorData);
      throw new Error(errorData.message || errorData.hint || `Error ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error en supabaseQuery:', error);
    throw error;
  }
}

// Función para insertar datos en Supabase
async function supabaseInsert(table, data) {
  try {
    console.log('Enviando datos a la tabla:', table);
    console.log('Datos a enviar:', JSON.stringify(data, null, 2));
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de respuesta:', response.status, response.statusText);
      console.error('Detalles del error:', errorData);
      throw new Error(errorData.message || errorData.hint || `Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Datos guardados exitosamente:', result);
    return result;
  } catch (error) {
    console.error('Error en supabaseInsert:', error);
    throw error;
  }
}

// Función para limpiar espacios
function limpiarEspacios(input) {
  let valor = input.value;
  valor = valor.trim();
  valor = valor.replace(/\s+/g, ' ');
  input.value = valor;
}

// Función para validar documento
function validarDocumento(input) {
  const documento = input.value;
  
  if (documento.length > 0 && documento.length < 7) {
    input.setCustomValidity('Escriba correctamente su documento');
  } else if (documento.length > 12) {
    input.setCustomValidity('Escriba correctamente su documento');
  } else {
    input.setCustomValidity('');
  }
}

// Función para validar contacto (10 números exactos y debe empezar por 3)
function validarContacto(input) {
  const contacto = input.value;
  
  if (contacto.length > 0) {
    if (contacto.length !== 10) {
      input.setCustomValidity('Número de contacto no válido');
    } else if (!contacto.startsWith('3')) {
      input.setCustomValidity('Número de contacto no válido');
    } else {
      input.setCustomValidity('');
    }
  } else {
    input.setCustomValidity('');
  }
}

// Función para actualizar correo completo
function actualizarCorreoCompleto() {
  const correoInput = document.getElementById('correo');
  const dominioSelect = document.getElementById('dominioCorreo');
  const correoCompleto = document.getElementById('correoCompleto');
  
  const correo = correoInput.value.trim().toLowerCase();
  const dominio = dominioSelect.value.toLowerCase();
  
  if (correo && dominio && dominio !== '') {
    correoCompleto.value = `${correo}@${dominio}`;
    correoInput.setCustomValidity('');
  } else {
    correoCompleto.value = '';
    if (correoInput.value.trim() && !dominio) {
      correoInput.setCustomValidity('Seleccione un dominio de correo');
    } else {
      correoInput.setCustomValidity('');
    }
  }
}

// Función para actualizar correo del vocero completo
function actualizarCorreoVoceroCompleto() {
  const correoInput = document.getElementById('correoVocero');
  const dominioSelect = document.getElementById('dominioCorreoVocero');
  const correoCompleto = document.getElementById('correoVoceroCompleto');
  
  const correo = correoInput.value.trim().toLowerCase();
  const dominio = dominioSelect.value.toLowerCase();
  
  if (correo && dominio && dominio !== '') {
    correoCompleto.value = `${correo}@${dominio}`;
    correoInput.setCustomValidity('');
  } else {
    correoCompleto.value = '';
    if (correoInput.value.trim() && !dominio) {
      correoInput.setCustomValidity('Seleccione un dominio de correo');
    } else {
      correoInput.setCustomValidity('');
    }
  }
}

// Función para actualizar correo grupal completo
function actualizarCorreoGrupalCompleto() {
  const correoInput = document.getElementById('correoGrupal');
  const dominioSelect = document.getElementById('dominioCorreoGrupal');
  const correoCompleto = document.getElementById('correoGrupalCompleto');
  
  const correo = correoInput.value.trim().toLowerCase();
  const dominio = dominioSelect.value.toLowerCase();
  
  if (correo && dominio && dominio !== '') {
    correoCompleto.value = `${correo}@${dominio}`;
    correoInput.setCustomValidity('');
  } else {
    correoCompleto.value = '';
    if (correoInput.value.trim() && !dominio) {
      correoInput.setCustomValidity('Seleccione un dominio de correo');
    } else {
      correoInput.setCustomValidity('');
    }
  }
}

// Función para limpiar todos los campos de un contenedor
function limpiarCampos(contenedor) {
  // Limpiar inputs
  const inputs = contenedor.querySelectorAll('input[type="text"], input[type="tel"]');
  inputs.forEach(input => {
    input.value = '';
    input.required = false;
  });
  
  // Limpiar selects
  const selects = contenedor.querySelectorAll('select');
  selects.forEach(select => {
    select.selectedIndex = 0;
    select.required = false;
    // Si es un select de programa, deshabilitarlo y limpiarlo
    if (select.id === 'programa' || select.id === 'programaGrupal') {
      select.disabled = true;
      select.innerHTML = '<option value="">Seleccione un programa</option>';
      select.required = true; // Mantener requerido pero deshabilitado
    }
  });
  
  // Limpiar checkboxes
  const checkboxes = contenedor.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Limpiar campos hidden de correo
  const correosCompletos = contenedor.querySelectorAll('input[type="hidden"]');
  correosCompletos.forEach(campo => {
    campo.value = '';
  });
  
  // Ocultar contenedores de "otras asignaturas"
  const otrosContainers = contenedor.querySelectorAll('.otro-asignatura-container');
  otrosContainers.forEach(container => {
    container.classList.add('hidden');
    const input = container.querySelector('input');
    if (input) {
      input.value = '';
      input.required = false;
    }
  });
}

// Manejar cambio de tipo de acompañamiento
function manejarTipoAcompanamiento() {
  const tipo = document.getElementById('tipoAcompanamiento').value;
  const camposIndividual = document.getElementById('camposIndividual');
  const camposGrupal = document.getElementById('camposGrupal');
  
  if (tipo === 'Individual') {
    // Limpiar campos grupales antes de ocultarlos
    limpiarCampos(camposGrupal);
    
    camposIndividual.classList.remove('hidden');
    camposGrupal.classList.add('hidden');
    // Hacer requeridos los campos individuales
    const campos = camposIndividual.querySelectorAll('input[required], select[required]');
    campos.forEach(campo => campo.required = true);
    // Quitar requerido de campos grupales
    const camposGrupales = camposGrupal.querySelectorAll('input[required], select[required]');
    camposGrupales.forEach(campo => campo.required = false);
  } else if (tipo === 'Grupal') {
    // Limpiar campos individuales antes de ocultarlos
    limpiarCampos(camposIndividual);
    
    camposIndividual.classList.add('hidden');
    camposGrupal.classList.remove('hidden');
    // Quitar requerido de campos individuales
    const campos = camposIndividual.querySelectorAll('input[required], select[required]');
    campos.forEach(campo => campo.required = false);
    // Hacer requeridos los campos grupales
    const camposGrupales = camposGrupal.querySelectorAll('input[required], select[required]');
    camposGrupales.forEach(campo => campo.required = true);
  } else {
    // Limpiar ambos si no hay selección
    limpiarCampos(camposIndividual);
    limpiarCampos(camposGrupal);
    camposIndividual.classList.add('hidden');
    camposGrupal.classList.add('hidden');
  }
  
  // Limpiar motivos cuando cambia el tipo
  limpiarMotivos();
  limpiarMotivosGrupal();
}

// Manejar cambio de asignaturas
function manejarAsignaturas() {
  const asignaturasSeleccionadas = Array.from(document.querySelectorAll('input[name="asignatura"]:checked')).map(cb => cb.value);
  const otroAsignaturaContainer = document.getElementById('otroAsignaturaContainer');
  const motivosContainer = document.getElementById('motivosContainer');
  const motivosCheckboxes = document.getElementById('motivosCheckboxes');
  
  // Mostrar/ocultar campo "Otras"
  const otrasSeleccionada = asignaturasSeleccionadas.includes('Otras');
  if (otrasSeleccionada) {
    otroAsignaturaContainer.classList.remove('hidden');
    document.getElementById('otroAsignatura').required = true;
  } else {
    otroAsignaturaContainer.classList.add('hidden');
    document.getElementById('otroAsignatura').required = false;
    document.getElementById('otroAsignatura').value = '';
  }
  
  // Si no hay asignaturas seleccionadas, ocultar motivos
  if (asignaturasSeleccionadas.length === 0) {
    motivosContainer.classList.add('hidden');
    limpiarMotivos();
    return;
  }
  
  // Determinar qué motivos mostrar
  const tieneMatematicas = asignaturasSeleccionadas.some(a => ASIGNATURAS_MATEMATICAS.includes(a));
  const tieneComunicacion = asignaturasSeleccionadas.includes('Comunicación y Lenguaje I - II');
  const tieneOtras = asignaturasSeleccionadas.includes('Otras');
  
  let motivosAMostrar = [];
  
  if (tieneOtras) {
    // Si tiene "Otras", mostrar todos los motivos (sin repetir)
    const todosMotivos = [...MOTIVOS_MATEMATICAS, ...MOTIVOS_COMUNICACION];
    // Eliminar duplicados
    motivosAMostrar = [...new Set(todosMotivos)];
    // Ordenar: primero matemáticas, luego comunicación
    motivosAMostrar.sort((a, b) => {
      const aEsMat = MOTIVOS_MATEMATICAS.includes(a);
      const bEsMat = MOTIVOS_MATEMATICAS.includes(b);
      if (aEsMat && !bEsMat) return -1;
      if (!aEsMat && bEsMat) return 1;
      return 0;
    });
  } else {
    if (tieneMatematicas) {
      motivosAMostrar = [...motivosAMostrar, ...MOTIVOS_MATEMATICAS];
    }
    if (tieneComunicacion) {
      motivosAMostrar = [...motivosAMostrar, ...MOTIVOS_COMUNICACION];
    }
    // Eliminar duplicados si tiene ambos
    if (tieneMatematicas && tieneComunicacion) {
      motivosAMostrar = [...new Set(motivosAMostrar)];
      // Mantener orden: primero matemáticas, luego comunicación
      motivosAMostrar.sort((a, b) => {
        const aEsMat = MOTIVOS_MATEMATICAS.includes(a);
        const bEsMat = MOTIVOS_MATEMATICAS.includes(b);
        if (aEsMat && !bEsMat) return -1;
        if (!aEsMat && bEsMat) return 1;
        return 0;
      });
    }
  }
  
  // Generar checkboxes de motivos
  generarMotivos(motivosAMostrar);
  
  // Mostrar contenedor de motivos
  if (motivosAMostrar.length > 0) {
    motivosContainer.classList.remove('hidden');
  } else {
    motivosContainer.classList.add('hidden');
  }
}

// Función genérica para generar checkboxes de motivos
function generarMotivosGenerico(motivos, containerId, nameAttr) {
  const motivosCheckboxes = document.getElementById(containerId);
  if (!motivosCheckboxes) return;
  
  motivosCheckboxes.innerHTML = '';
  
  motivos.forEach(motivo => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = nameAttr;
    input.value = motivo;
    
    const span = document.createElement('span');
    span.textContent = motivo;
    
    label.appendChild(input);
    label.appendChild(span);
    motivosCheckboxes.appendChild(label);
  });
}

// Generar checkboxes de motivos (Individual)
function generarMotivos(motivos) {
  generarMotivosGenerico(motivos, 'motivosCheckboxes', 'motivo');
}

// Generar checkboxes de motivos (Grupal)
function generarMotivosGrupal(motivos) {
  generarMotivosGenerico(motivos, 'motivosCheckboxesGrupal', 'motivoGrupal');
}

// Función genérica para limpiar motivos
function limpiarMotivosGenerico(checkboxesId, containerId) {
  const motivosCheckboxes = document.getElementById(checkboxesId);
  if (motivosCheckboxes) {
    motivosCheckboxes.innerHTML = '';
  }
  const motivosContainer = document.getElementById(containerId);
  if (motivosContainer) {
    motivosContainer.classList.add('hidden');
  }
}

// Limpiar motivos (Individual)
function limpiarMotivos() {
  limpiarMotivosGenerico('motivosCheckboxes', 'motivosContainer');
}

// Limpiar motivos (Grupal)
function limpiarMotivosGrupal() {
  limpiarMotivosGenerico('motivosCheckboxesGrupal', 'motivosContainerGrupal');
}

// Función genérica para manejar asignaturas (reutilizable)
function manejarAsignaturasGenerico(tipo) {
  const esGrupal = tipo === 'grupal';
  const nameAttr = esGrupal ? 'asignaturaGrupal' : 'asignatura';
  const otroContainerId = esGrupal ? 'otroAsignaturaContainerGrupal' : 'otroAsignaturaContainer';
  const otroInputId = esGrupal ? 'otroAsignaturaGrupal' : 'otroAsignatura';
  const motivosContainerId = esGrupal ? 'motivosContainerGrupal' : 'motivosContainer';
  const motivosCheckboxesId = esGrupal ? 'motivosCheckboxesGrupal' : 'motivosCheckboxes';
  const generarMotivosFunc = esGrupal ? generarMotivosGrupal : generarMotivos;
  const limpiarMotivosFunc = esGrupal ? limpiarMotivosGrupal : limpiarMotivos;
  
  const asignaturasSeleccionadas = Array.from(document.querySelectorAll(`input[name="${nameAttr}"]:checked`)).map(cb => cb.value);
  const otroAsignaturaContainer = document.getElementById(otroContainerId);
  const motivosContainer = document.getElementById(motivosContainerId);
  const motivosCheckboxes = document.getElementById(motivosCheckboxesId);
  
  // Mostrar/ocultar campo "Otras"
  const otrasSeleccionada = asignaturasSeleccionadas.includes('Otras');
  if (otrasSeleccionada) {
    otroAsignaturaContainer.classList.remove('hidden');
    document.getElementById(otroInputId).required = true;
  } else {
    otroAsignaturaContainer.classList.add('hidden');
    document.getElementById(otroInputId).required = false;
    document.getElementById(otroInputId).value = '';
  }
  
  // Si no hay asignaturas seleccionadas, ocultar motivos
  if (asignaturasSeleccionadas.length === 0) {
    motivosContainer.classList.add('hidden');
    limpiarMotivosFunc();
    return;
  }
  
  // Determinar qué motivos mostrar
  const tieneMatematicas = asignaturasSeleccionadas.some(a => ASIGNATURAS_MATEMATICAS.includes(a));
  const tieneComunicacion = asignaturasSeleccionadas.includes('Comunicación y Lenguaje I - II');
  const tieneOtras = asignaturasSeleccionadas.includes('Otras');
  
  let motivosAMostrar = [];
  
  if (tieneOtras) {
    // Si tiene "Otras", mostrar todos los motivos (sin repetir)
    const todosMotivos = [...MOTIVOS_MATEMATICAS, ...MOTIVOS_COMUNICACION];
    // Eliminar duplicados
    motivosAMostrar = [...new Set(todosMotivos)];
    // Ordenar: primero matemáticas, luego comunicación
    motivosAMostrar.sort((a, b) => {
      const aEsMat = MOTIVOS_MATEMATICAS.includes(a);
      const bEsMat = MOTIVOS_MATEMATICAS.includes(b);
      if (aEsMat && !bEsMat) return -1;
      if (!aEsMat && bEsMat) return 1;
      return 0;
    });
  } else {
    if (tieneMatematicas) {
      motivosAMostrar = [...motivosAMostrar, ...MOTIVOS_MATEMATICAS];
    }
    if (tieneComunicacion) {
      motivosAMostrar = [...motivosAMostrar, ...MOTIVOS_COMUNICACION];
    }
    // Eliminar duplicados si tiene ambos
    if (tieneMatematicas && tieneComunicacion) {
      motivosAMostrar = [...new Set(motivosAMostrar)];
      // Mantener orden: primero matemáticas, luego comunicación
      motivosAMostrar.sort((a, b) => {
        const aEsMat = MOTIVOS_MATEMATICAS.includes(a);
        const bEsMat = MOTIVOS_MATEMATICAS.includes(b);
        if (aEsMat && !bEsMat) return -1;
        if (!aEsMat && bEsMat) return 1;
        return 0;
      });
    }
  }
  
  // Generar checkboxes de motivos
  generarMotivosFunc(motivosAMostrar);
  
  // Mostrar contenedor de motivos
  if (motivosAMostrar.length > 0) {
    motivosContainer.classList.remove('hidden');
  } else {
    motivosContainer.classList.add('hidden');
  }
}

// Manejar cambio de asignaturas (Individual)
function manejarAsignaturas() {
  manejarAsignaturasGenerico('individual');
}

// Manejar cambio de asignaturas (Grupal)
function manejarAsignaturasGrupal() {
  manejarAsignaturasGenerico('grupal');
}

// Función genérica para generar un select
function generarSelect(selectId, opciones, placeholder, required = true) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '';
  
  // Agregar opción placeholder
  const optionPlaceholder = document.createElement('option');
  optionPlaceholder.value = '';
  optionPlaceholder.textContent = placeholder;
  select.appendChild(optionPlaceholder);
  
  // Agregar opciones
  opciones.forEach(opcion => {
    const option = document.createElement('option');
    option.value = opcion.value;
    option.textContent = opcion.text;
    select.appendChild(option);
  });
  
  select.required = required;
}

// Función para generar select de dominio de correo
function generarSelectDominioCorreo(selectId, required = true) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '';
  
  const optionPlaceholder = document.createElement('option');
  optionPlaceholder.value = '';
  optionPlaceholder.textContent = 'Seleccione';
  select.appendChild(optionPlaceholder);
  
  OPCIONES_DOMINIO_CORREO.forEach(opcion => {
    const option = document.createElement('option');
    option.value = opcion.value;
    option.textContent = opcion.text;
    select.appendChild(option);
  });
  
  select.required = required;
}

// Función genérica para poblar un select
function poblarSelect(selectElement, datos, opciones = {}) {
  const {
    valueKey = null,
    textKey = null,
    primeraOpcion = '',
    ordenar = null
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
  
  selectElement.appendChild(fragment);
}

// Función para precargar datos de facultades desde la BD
async function precargarDatosFacultades() {
  if (datosCacheFacultades.length > 0) return; // Ya cargados
  
  try {
    console.log('Precargando datos de facultades y programas...');
    
    const facultadesCarreras = await supabaseQuery('facultades_carreras');
    
    datosCacheFacultades = facultadesCarreras;
    procesarFacultadesData();
    
    console.log('Datos de facultades y programas cargados');
  } catch (error) {
    console.error('Error precargando datos de facultades:', error);
    throw error;
  }
}

// Función para procesar los datos de facultades y crear la estructura
function procesarFacultadesData() {
  facultadesData = {};
  
  for (const item of datosCacheFacultades) {
    if (!facultadesData[item.facultad]) {
      facultadesData[item.facultad] = [];
    }
    facultadesData[item.facultad].push(item.programa);
  }
  
  // Eliminar duplicados de programas por facultad
  for (const facultad in facultadesData) {
    facultadesData[facultad] = [...new Set(facultadesData[facultad])];
  }
}

// Función para cargar facultades en el select
function cargarFacultades(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const facultades = Object.keys(facultadesData);
  poblarSelect(select, facultades, {
    primeraOpcion: 'Seleccione una facultad',
    ordenar: (a, b) => a.localeCompare(b)
  });
}

// Función para actualizar programas según facultad seleccionada
function actualizarProgramas(facultadSelectId, programaSelectId) {
  const facultadSelect = document.getElementById(facultadSelectId);
  const programaSelect = document.getElementById(programaSelectId);
  
  if (!facultadSelect || !programaSelect) return;
  
  const facultadSeleccionada = facultadSelect.value;
  
  // Limpiar el select de programas
  programaSelect.innerHTML = '';
  
  // Agregar opción placeholder
  const optionPlaceholder = document.createElement('option');
  optionPlaceholder.value = '';
  optionPlaceholder.textContent = 'Seleccione un programa';
  programaSelect.appendChild(optionPlaceholder);
  
  // Si hay una facultad seleccionada, mostrar sus programas
  if (facultadSeleccionada && facultadesData[facultadSeleccionada]) {
    const programas = facultadesData[facultadSeleccionada];
    poblarSelect(programaSelect, programas, {
      primeraOpcion: 'Seleccione un programa',
      ordenar: (a, b) => a.localeCompare(b)
    });
    programaSelect.disabled = false;
    programaSelect.required = true;
  } else {
    programaSelect.disabled = true;
    programaSelect.required = false;
  }
}

// Función para generar checkboxes de asignaturas
function generarAsignaturasCheckboxes(containerId, nameAttr, onChangeFunc) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  ASIGNATURAS_DISPONIBLES.forEach(asignatura => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = nameAttr;
    input.value = asignatura;
    input.onchange = onChangeFunc;
    
    const span = document.createElement('span');
    span.textContent = asignatura;
    
    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  });
}

// Manejar cambio de dominio de correo
document.addEventListener('DOMContentLoaded', async function() {
  // Precargar datos de facultades desde la BD
  try {
    await precargarDatosFacultades();
  } catch (error) {
    console.error('Error al cargar facultades:', error);
  }
  
  // Generar selects compartidos para Individual
  generarSelect('sede', OPCIONES_SEDE, 'Seleccione una sede');
  // Facultad se carga desde la BD
  cargarFacultades('facultad');
  // Programa se genera dinámicamente según facultad
  const programaIndividual = document.getElementById('programa');
  if (programaIndividual) {
    programaIndividual.innerHTML = '<option value="">Seleccione un programa</option>';
    programaIndividual.disabled = true;
    programaIndividual.required = true;
  }
  generarSelect('semestre', OPCIONES_SEMESTRE, 'Seleccione un semestre');
  generarSelect('estudianteConsciente', OPCIONES_SI_NO, 'Seleccione una opción');
  generarSelect('cargo', OPCIONES_CARGO, 'Seleccione un cargo');
  generarSelect('dependencia', OPCIONES_DEPENDENCIA, 'Seleccione una dependencia');
  generarSelectDominioCorreo('dominioCorreo');
  
  // Generar selects compartidos para Grupal
  generarSelect('sedeGrupal', OPCIONES_SEDE, 'Seleccione una sede');
  // Facultad se carga desde la BD
  cargarFacultades('facultadGrupal');
  // Programa se genera dinámicamente según facultad
  const programaGrupal = document.getElementById('programaGrupal');
  if (programaGrupal) {
    programaGrupal.innerHTML = '<option value="">Seleccione un programa</option>';
    programaGrupal.disabled = true;
    programaGrupal.required = true;
  }
  generarSelect('semestreGrupal', OPCIONES_SEMESTRE, 'Seleccione un semestre');
  generarSelect('grupoConsciente', OPCIONES_SI_NO, 'Seleccione una opción');
  generarSelect('cargoGrupal', OPCIONES_CARGO, 'Seleccione un cargo');
  generarSelect('dependenciaGrupal', OPCIONES_DEPENDENCIA, 'Seleccione una dependencia');
  generarSelectDominioCorreo('dominioCorreoVocero');
  generarSelectDominioCorreo('dominioCorreoGrupal');
  
  // Agregar event listeners para cambios de facultad
  const facultadIndividual = document.getElementById('facultad');
  const facultadGrupal = document.getElementById('facultadGrupal');
  
  if (facultadIndividual) {
    facultadIndividual.addEventListener('change', function() {
      actualizarProgramas('facultad', 'programa');
    });
  }
  
  if (facultadGrupal) {
    facultadGrupal.addEventListener('change', function() {
      actualizarProgramas('facultadGrupal', 'programaGrupal');
    });
  }
  
  // Generar checkboxes de asignaturas para Individual
  generarAsignaturasCheckboxes('asignaturasContainer', 'asignatura', manejarAsignaturas);
  
  // Generar checkboxes de asignaturas para Grupal
  generarAsignaturasCheckboxes('asignaturasContainerGrupal', 'asignaturaGrupal', manejarAsignaturasGrupal);
  
  const dominioSelect = document.getElementById('dominioCorreo');
  const correoInput = document.getElementById('correo');
  const dominioVoceroSelect = document.getElementById('dominioCorreoVocero');
  const correoVoceroInput = document.getElementById('correoVocero');
  const dominioGrupalSelect = document.getElementById('dominioCorreoGrupal');
  const correoGrupalInput = document.getElementById('correoGrupal');

  if (dominioSelect) {
    dominioSelect.addEventListener('change', function() {
      actualizarCorreoCompleto();
    });
  }

  if (correoInput) {
    correoInput.addEventListener('blur', function() {
      actualizarCorreoCompleto();
      const correoCompleto = document.getElementById('correoCompleto');
      if (this.value.trim() && !correoCompleto.value) {
        this.setCustomValidity('Seleccione un dominio de correo');
      }
    });
  }

  if (dominioVoceroSelect) {
    dominioVoceroSelect.addEventListener('change', function() {
      actualizarCorreoVoceroCompleto();
    });
  }

  if (correoVoceroInput) {
    correoVoceroInput.addEventListener('blur', function() {
      actualizarCorreoVoceroCompleto();
      const correoCompleto = document.getElementById('correoVoceroCompleto');
      if (this.value.trim() && !correoCompleto.value) {
        this.setCustomValidity('Seleccione un dominio de correo');
      }
    });
  }

  if (dominioGrupalSelect) {
    dominioGrupalSelect.addEventListener('change', function() {
      actualizarCorreoGrupalCompleto();
    });
  }

  if (correoGrupalInput) {
    correoGrupalInput.addEventListener('blur', function() {
      actualizarCorreoGrupalCompleto();
      const correoCompleto = document.getElementById('correoGrupalCompleto');
      if (this.value.trim() && !correoCompleto.value) {
        this.setCustomValidity('Seleccione un dominio de correo');
      }
    });
  }
});

// Variable para controlar los reintentos
let intentosRestantes = 3;

// Función para obtener los datos del formulario
function obtenerDatosFormulario() {
  const tipoAcompanamiento = document.getElementById('tipoAcompanamiento').value;
  
  // Limpiar espacios en todos los campos
  const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], textarea');
  inputs.forEach(input => {
    if (input.value.trim()) {
      limpiarEspacios(input);
    }
  });
  
  // Obtener fecha en formato ISO con timezone para PostgreSQL
  const fechaColombia = obtenerFechaColombia();
  const fechaISO = fechaColombia.includes('T') ? fechaColombia : `${fechaColombia}T00:00:00`;
  
  let datos = {
    tipo_acompanamiento: tipoAcompanamiento, // Select - mantener original
    fecha_hora: fechaISO
  };
  
  if (tipoAcompanamiento === 'Individual') {
    // Campos de escritura (inputs de texto) - convertir a mayúsculas
    const documento = document.getElementById('documento').value.trim().toUpperCase();
    const nombresApellidos = document.getElementById('nombresApellidos').value.trim().toUpperCase();
    const grupo = document.getElementById('grupo').value.trim().toUpperCase();
    const nombreSolicitante = document.getElementById('nombreSolicitante').value.trim().toUpperCase();
    const correoCompleto = document.getElementById('correoCompleto').value.trim().toLowerCase();
    
    // Campos de opciones (selects) - mantener original
    const sede = document.getElementById('sede').value;
    const facultad = document.getElementById('facultad').value;
    const programa = document.getElementById('programa').value;
    const semestre = document.getElementById('semestre').value;
    const estudianteConsciente = document.getElementById('estudianteConsciente').value;
    const cargo = document.getElementById('cargo').value;
    const dependencia = document.getElementById('dependencia').value;
    
    // Asignaturas seleccionadas (checkboxes) - mantener original
    const asignaturas = Array.from(document.querySelectorAll('input[name="asignatura"]:checked')).map(cb => cb.value);
    const otraAsignatura = document.getElementById('otroAsignatura').value.trim();
    if (asignaturas.includes('Otras') && otraAsignatura) {
      asignaturas[asignaturas.indexOf('Otras')] = `Otras: ${otraAsignatura.toUpperCase()}`;
    }
    
    // Motivos seleccionados (checkboxes) - mantener original
    const motivos = Array.from(document.querySelectorAll('input[name="motivo"]:checked')).map(cb => cb.value);
    
    datos = {
      ...datos,
      documento,
      nombres_y_apellidos: nombresApellidos,
      grupo,
      sede,
      facultad_estudiante: facultad,
      programa_estudiante: programa,
      semestre,
      enterado: estudianteConsciente,
      profesor: nombreSolicitante,
      cargo,
      dependencia,
      correo_profesor: correoCompleto,
      asignatura: asignaturas.join('; '),
      motivo: motivos.join('; ')
    };
  } else if (tipoAcompanamiento === 'Grupal') {
    // Campos de escritura (inputs de texto) - convertir a mayúsculas
    const grupoGrupal = document.getElementById('grupoGrupal').value.trim().toUpperCase();
    const nombresApellidosVocero = document.getElementById('nombresApellidosVocero').value.trim().toUpperCase();
    const contactoVocero = document.getElementById('contactoVocero').value.trim();
    const nombreSolicitanteGrupal = document.getElementById('nombreSolicitanteGrupal').value.trim().toUpperCase();
    const correoVoceroCompleto = document.getElementById('correoVoceroCompleto').value.trim().toLowerCase();
    const correoGrupalCompleto = document.getElementById('correoGrupalCompleto').value.trim().toLowerCase();
    
    // Campos de opciones (selects) - mantener original
    const sedeGrupal = document.getElementById('sedeGrupal').value;
    const facultadGrupal = document.getElementById('facultadGrupal').value;
    const programaGrupal = document.getElementById('programaGrupal').value;
    const semestreGrupal = document.getElementById('semestreGrupal').value;
    const grupoConsciente = document.getElementById('grupoConsciente').value;
    const cargoGrupal = document.getElementById('cargoGrupal').value;
    const dependenciaGrupal = document.getElementById('dependenciaGrupal').value;
    
    // Asignaturas seleccionadas (checkboxes) - mantener original
    const asignaturasGrupal = Array.from(document.querySelectorAll('input[name="asignaturaGrupal"]:checked')).map(cb => cb.value);
    const otraAsignaturaGrupal = document.getElementById('otroAsignaturaGrupal').value.trim();
    if (asignaturasGrupal.includes('Otras') && otraAsignaturaGrupal) {
      asignaturasGrupal[asignaturasGrupal.indexOf('Otras')] = `Otras: ${otraAsignaturaGrupal.toUpperCase()}`;
    }
    
    // Motivos seleccionados (checkboxes) - mantener original
    const motivosGrupal = Array.from(document.querySelectorAll('input[name="motivoGrupal"]:checked')).map(cb => cb.value);
    
    datos = {
      ...datos,
      // No enviar documento en grupal (es opcional)
      nombres_y_apellidos: nombresApellidosVocero,
      grupo: grupoGrupal,
      contacto_vocero: contactoVocero,
      correo_vocero: correoVoceroCompleto,
      sede: sedeGrupal,
      facultad_estudiante: facultadGrupal,
      programa_estudiante: programaGrupal,
      semestre: semestreGrupal,
      enterado: grupoConsciente,
      profesor: nombreSolicitanteGrupal,
      cargo: cargoGrupal,
      dependencia: dependenciaGrupal,
      correo_profesor: correoGrupalCompleto,
      asignatura: asignaturasGrupal.join('; '),
      motivo: motivosGrupal.join('; ')
    };
  }
  
  return datos;
}

// Función para intentar enviar con reintentos
async function intentarEnviarConReintentos(datos, intento = 1) {
  const btnEnviar = document.getElementById('btnEnviar');
  
  try {
    // Insertar en Supabase (ajustar el nombre de la tabla según corresponda)
    await supabaseInsert('acompanamiento', datos);
    
    intentosRestantes = 3;
    mostrarModalExito();
    
    setTimeout(() => {
      document.getElementById('formAcompanamiento').reset();
      document.getElementById('correoCompleto').value = '';
      document.getElementById('correoVoceroCompleto').value = '';
      document.getElementById('correoGrupalCompleto').value = '';
      const errorDocumento = document.getElementById('errorDocumento');
      if (errorDocumento) {
        errorDocumento.style.display = 'none';
      }
      document.getElementById('camposIndividual').classList.add('hidden');
      document.getElementById('camposGrupal').classList.add('hidden');
      limpiarMotivos();
      limpiarMotivosGrupal();
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      regresarABienvenida();
    }, 2000);

    return true;
  } catch (error) {
    console.error(`Error en intento ${intento}:`, error);
    
    if (intento < 3) {
      intentosRestantes = 3 - intento;
      const delay = intento * 1000;
      
      btnEnviar.textContent = `Reintentando... (${intentosRestantes} intentos restantes)`;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return await intentarEnviarConReintentos(datos, intento + 1);
    } else {
      intentosRestantes = 3;
      throw error;
    }
  }
}

// Función para enviar el formulario
async function enviarFormulario(event) {
  event.preventDefault();

  const btnEnviar = document.getElementById('btnEnviar');
  const mensajeFormulario = document.getElementById('mensajeFormulario');
  const tipoAcompanamiento = document.getElementById('tipoAcompanamiento').value;
  
  // Validar tipo de acompañamiento
  if (!tipoAcompanamiento) {
    mostrarMensaje('Por favor seleccione un tipo de acompañamiento', 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    return;
  }
  
  // Validaciones para Individual
  if (tipoAcompanamiento === 'Individual') {
    const documentoInput = document.getElementById('documento');
    validarDocumento(documentoInput);
    if (!documentoInput.validity.valid) {
      documentoInput.reportValidity();
      scrollToError(documentoInput);
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar asignaturas
    const asignaturas = Array.from(document.querySelectorAll('input[name="asignatura"]:checked'));
    if (asignaturas.length === 0) {
      mostrarMensaje('Por favor seleccione al menos una asignatura', 'error');
      scrollToError(document.getElementById('asignaturasContainer'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar "Otras" asignatura
    if (asignaturas.some(a => a.value === 'Otras')) {
      const otraAsignatura = document.getElementById('otroAsignatura').value.trim();
      if (!otraAsignatura) {
        mostrarMensaje('Por favor especifique la otra asignatura', 'error');
        scrollToError(document.getElementById('otroAsignatura'));
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar Formulario';
        return;
      }
    }
    
    // Validar motivos
    const motivos = Array.from(document.querySelectorAll('input[name="motivo"]:checked'));
    if (motivos.length === 0) {
      mostrarMensaje('Por favor seleccione al menos un motivo', 'error');
      scrollToError(document.getElementById('motivosContainer'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar facultad
    const facultad = document.getElementById('facultad').value;
    if (!facultad) {
      mostrarMensaje('Por favor seleccione una facultad', 'error');
      scrollToError(document.getElementById('facultad'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar programa
    const programa = document.getElementById('programa').value;
    if (!programa || document.getElementById('programa').disabled) {
      mostrarMensaje('Por favor seleccione un programa', 'error');
      scrollToError(document.getElementById('programa'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar correo
    const correoCompleto = document.getElementById('correoCompleto').value.trim();
    if (!correoCompleto || !correoCompleto.includes('@')) {
      mostrarMensaje('Por favor complete el correo electrónico correctamente', 'error');
      scrollToError(document.getElementById('correo'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
  } else if (tipoAcompanamiento === 'Grupal') {
    // Validar contacto del vocero (10 números)
    const contactoInput = document.getElementById('contactoVocero');
    validarContacto(contactoInput);
    if (!contactoInput.validity.valid) {
      contactoInput.reportValidity();
      scrollToError(contactoInput);
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar correo del vocero
    const correoVoceroCompleto = document.getElementById('correoVoceroCompleto').value.trim();
    if (!correoVoceroCompleto || !correoVoceroCompleto.includes('@')) {
      mostrarMensaje('Por favor complete el correo del vocero correctamente', 'error');
      scrollToError(document.getElementById('correoVocero'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar asignaturas
    const asignaturas = Array.from(document.querySelectorAll('input[name="asignaturaGrupal"]:checked'));
    if (asignaturas.length === 0) {
      mostrarMensaje('Por favor seleccione al menos una asignatura', 'error');
      scrollToError(document.getElementById('asignaturasContainerGrupal'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar "Otras" asignatura
    if (asignaturas.some(a => a.value === 'Otras')) {
      const otraAsignatura = document.getElementById('otroAsignaturaGrupal').value.trim();
      if (!otraAsignatura) {
        mostrarMensaje('Por favor especifique la otra asignatura', 'error');
        scrollToError(document.getElementById('otroAsignaturaGrupal'));
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar Formulario';
        return;
      }
    }
    
    // Validar motivos
    const motivos = Array.from(document.querySelectorAll('input[name="motivoGrupal"]:checked'));
    if (motivos.length === 0) {
      mostrarMensaje('Por favor seleccione al menos un motivo', 'error');
      scrollToError(document.getElementById('motivosContainerGrupal'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar facultad
    const facultadGrupal = document.getElementById('facultadGrupal').value;
    if (!facultadGrupal) {
      mostrarMensaje('Por favor seleccione una facultad', 'error');
      scrollToError(document.getElementById('facultadGrupal'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar programa
    const programaGrupal = document.getElementById('programaGrupal').value;
    if (!programaGrupal || document.getElementById('programaGrupal').disabled) {
      mostrarMensaje('Por favor seleccione un programa', 'error');
      scrollToError(document.getElementById('programaGrupal'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
    
    // Validar correo institucional
    const correoGrupalCompleto = document.getElementById('correoGrupalCompleto').value.trim();
    if (!correoGrupalCompleto || !correoGrupalCompleto.includes('@')) {
      mostrarMensaje('Por favor complete el correo electrónico correctamente', 'error');
      scrollToError(document.getElementById('correoGrupal'));
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      return;
    }
  }
  
  // Obtener datos del formulario
  let datos;
  try {
    datos = obtenerDatosFormulario();
  } catch (error) {
    console.error('Error al obtener datos:', error);
    mostrarMensaje('Error al procesar los datos del formulario', 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    return;
  }

  // Deshabilitar botón mientras se envía
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';
  intentosRestantes = 3;

  try {
    await intentarEnviarConReintentos(datos);
  } catch (error) {
    console.error('Error al enviar formulario después de 3 intentos:', error);
    mostrarMensaje('Error al enviar el formulario después de 3 intentos. Por favor, verifique su conexión e intente nuevamente más tarde.', 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
  }
}

// Función para hacer scroll a un elemento de error
function scrollToError(elemento) {
  if (elemento) {
    elemento.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    setTimeout(() => {
      if (elemento.tagName === 'INPUT' || elemento.tagName === 'SELECT' || elemento.tagName === 'TEXTAREA') {
        elemento.focus();
        elemento.style.transition = 'box-shadow 0.3s ease';
        elemento.style.boxShadow = '0 0 0 4px rgba(220, 53, 69, 0.3)';
        setTimeout(() => {
          elemento.style.boxShadow = '';
        }, 2000);
      } else {
        elemento.style.transition = 'box-shadow 0.3s ease';
        elemento.style.boxShadow = '0 0 0 4px rgba(220, 53, 69, 0.3)';
        setTimeout(() => {
          elemento.style.boxShadow = '';
        }, 2000);
      }
    }, 300);
  }
}

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
  const mensajeFormulario = document.getElementById('mensajeFormulario');
  mensajeFormulario.textContent = mensaje;
  mensajeFormulario.className = `mensaje ${tipo}`;
  mensajeFormulario.style.display = 'block';

  if (tipo === 'error') {
    setTimeout(() => {
      mensajeFormulario.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  }

  setTimeout(() => {
    mensajeFormulario.style.display = 'none';
  }, 5000);
}

// Función para mostrar modal de éxito
function mostrarModalExito() {
  const modal = document.getElementById('modalExito');
  modal.classList.remove('hidden');

  setTimeout(() => {
    modal.classList.add('hidden');
  }, 3000);
}

// Función para mostrar el formulario
async function mostrarFormulario() {
  // Asegurar que las facultades estén cargadas
  try {
    if (datosCacheFacultades.length === 0) {
      await precargarDatosFacultades();
    }
    // Recargar las facultades en los selects
    cargarFacultades('facultad');
    cargarFacultades('facultadGrupal');
  } catch (error) {
    console.error('Error al cargar facultades:', error);
  }
  
  const pantallaBienvenida = document.getElementById('pantallaBienvenida');
  const contenidoFormulario = document.getElementById('contenidoFormulario');
  
  pantallaBienvenida.style.opacity = '0';
  pantallaBienvenida.style.transition = 'opacity 0.5s ease';
  
  setTimeout(() => {
    pantallaBienvenida.style.display = 'none';
    contenidoFormulario.classList.remove('hidden');
    contenidoFormulario.style.opacity = '0';
    contenidoFormulario.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
      contenidoFormulario.style.opacity = '1';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, 500);
}

// Función para regresar a la pantalla de bienvenida
function regresarABienvenida() {
  const pantallaBienvenida = document.getElementById('pantallaBienvenida');
  const contenidoFormulario = document.getElementById('contenidoFormulario');
  
  contenidoFormulario.style.opacity = '0';
  contenidoFormulario.style.transition = 'opacity 0.5s ease';
  
  setTimeout(() => {
    contenidoFormulario.classList.add('hidden');
    pantallaBienvenida.style.display = 'flex';
    pantallaBienvenida.style.opacity = '0';
    pantallaBienvenida.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
      pantallaBienvenida.style.opacity = '1';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, 500);
}

// Función para mostrar modal de confirmación de cancelar
function mostrarConfirmacionCancelar() {
  const modal = document.getElementById('modalConfirmacion');
  document.getElementById('tituloConfirmacion').textContent = '¿Seguro que deseas cancelar?';
  document.getElementById('mensajeConfirmacion').textContent = 'Se perderán todos los datos del formulario que has ingresado.';
  
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  
  document.getElementById('btnConfirmarModal').onclick = function() {
    modal.style.display = 'none';
    modal.classList.add('hidden');
    window.location.reload();
  };
  
  document.getElementById('btnCancelarModal').onclick = function() {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  };
}

// Inicialización
console.log('Formulario Acompañamiento Académico iniciado');

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

