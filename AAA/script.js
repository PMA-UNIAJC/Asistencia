// Constantes y utilidades globales provienen de ../Global/global.js

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
  { value: 'NORTE',       text: 'NORTE' },
  { value: 'SUR',         text: 'SUR' },
  { value: 'VIRTUAL',     text: 'VIRTUAL' },
  { value: 'LADERA',      text: 'LADERA' },
  { value: 'NUEVO LATIR', text: 'NUEVO LATIR' }
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

const TEXTOS = {
  Individual: {
    subtitulo:               'Datos del Estudiante',
    labelNombres:            'Nombres del Estudiante',
    labelApellidos:          'Apellidos del Estudiante',
    labelDocumento:          'Número de documento de identidad del Estudiante',
    labelDocumentoConfirmar: 'Confirma el documento de identidad del Estudiante',
    labelContacto:           'Número de contacto del Estudiante',
    labelCorreo:             'Correo del Estudiante',
    labelGrupo:              'Grupo al que pertenece el Estudiante',
    labelFacultad:           'Facultad a la cual pertenece el Estudiante',
    labelPrograma:           'Programa académico al cual pertenece el Estudiante',
    labelConsciente:         '¿El Estudiante es consciente del acompañamiento académico?'
  },
  Grupal: {
    subtitulo:               'Datos del Grupo',
    labelNombres:            'Nombres del Vocero del Grupo',
    labelApellidos:          'Apellidos del Vocero del Grupo',
    labelDocumento:          'Número de documento de identidad del Vocero del Grupo',
    labelDocumentoConfirmar: 'Confirma el documento de identidad del Vocero del Grupo',
    labelContacto:           'Número de contacto del Vocero del Grupo',
    labelCorreo:             'Correo del Vocero del Grupo',
    labelGrupo:              'Grupo al que se debe realizar el acompañamiento',
    labelFacultad:           'Facultad a la cual pertenece el Grupo',
    labelPrograma:           'Programa académico al cual pertenece el Grupo',
    labelConsciente:         '¿El Grupo es consciente del acompañamiento académico?'
  }
};


// facultadesData, supabaseQuery(), supabaseInsert(), obtenerFechaColombia(),
// limpiarEspacios(), validarDocumentoInput() — definidos en ../Global/global.js


function validarContacto(input) {
  const val = input.value;
  if (val.length > 0) {
    return val.length === 10 && val.startsWith('3');
  }
  return false; // vacío = no válido (es campo requerido)
}


function actualizarCorreoCompleto(prefijo) {
  const correoInput    = document.getElementById(prefijo);
  const dominioSelect  = document.getElementById(`dominio${prefijo.charAt(0).toUpperCase()}${prefijo.slice(1)}`);
  const correoCompleto = document.getElementById(`${prefijo}Completo`);

  if (!correoInput || !dominioSelect || !correoCompleto) return;

  const correo = correoInput.value.trim().toLowerCase();
  const dominio = dominioSelect.value.toLowerCase();

  correoCompleto.value = (correo && dominio) ? `${correo}@${dominio}` : '';
}


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

  select.innerHTML = '<option value="">Seleccione un dominio</option>';
  OPCIONES_DOMINIO_CORREO.forEach(op => {
    const opt = document.createElement('option');
    opt.value       = op.value;
    opt.textContent = op.text;
    select.appendChild(opt);
  });
  select.required = true;
}

// poblarSelect(), precargarDatosFacultades(), cargarFacultadesCascada(),
// cargarProgramasCascada() — funciones globales definidas en ../Global/global.js


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

  const tieneOtras = seleccionadas.includes('Otras');
  otroContainer.classList.toggle('hidden', !tieneOtras);
  otroInput.required = tieneOtras;
  if (!tieneOtras) otroInput.value = '';

  if (seleccionadas.length === 0) {
    motivosContainer.classList.add('hidden');
    document.getElementById('motivosCheckboxes').innerHTML = '';
    return;
  }

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

  motivosAMostrar.sort((a, b) => {
    const aM = MOTIVOS_MATEMATICAS.includes(a);
    const bM = MOTIVOS_MATEMATICAS.includes(b);
    if (aM && !bM) return -1;
    if (!aM && bM) return 1;
    return 0;
  });

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


function manejarTipoAcompanamiento() {
  const tipo = document.getElementById('tipoAcompanamiento').value;
  const seccion = document.getElementById('seccionDinamica');

  if (!tipo) {
    seccion.classList.add('hidden');
    resetearFormulario(false);
    return;
  }


  seccion.classList.remove('hidden');

  const textos = TEXTOS[tipo];

 
  document.getElementById('subtituloDinamico').textContent = textos.subtitulo;


  actualizarLabel('labelNombres', textos.labelNombres);
  actualizarLabel('labelApellidos', textos.labelApellidos);
  actualizarLabel('labelDocumento',  textos.labelDocumento);
  actualizarLabel('labelDocumentoConfirmar', textos.labelDocumentoConfirmar);
  actualizarLabel('labelContacto',   textos.labelContacto);
  actualizarLabel('labelCorreoPersona', textos.labelCorreo);
  actualizarLabel('labelGrupo',      textos.labelGrupo);
  actualizarLabel('labelFacultad',   textos.labelFacultad);
  actualizarLabel('labelPrograma',   textos.labelPrograma);
  actualizarLabel('labelConsciente', textos.labelConsciente);

 
  limpiarCamposComunes();
}


function actualizarLabel(labelId, nuevoTexto) {
  const label = document.getElementById(labelId);
  if (!label) return;
  const asterisco = label.querySelector('span');
  label.textContent = nuevoTexto + ' ';
  if (asterisco) label.appendChild(asterisco);
}

function limpiarCamposComunes() {

  ['documento', 'documentoConfirmar', 'nombres', 'apellidos', 'contacto',
    'correoPersona', 'grupo', 'nombreSolicitante', 'correo', 'otroAsignatura', 'infoAdicional'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });


  ['correoPersonaCompleto', 'correoCompleto'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

 
  ['sede', 'facultad', 'semestre', 'consciente', 'cargo', 'dependencia',
   'dominioCorreoPersona', 'dominioCorreo'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  
  // Facultad ya quedó sin selección: el programa vuelve al estado inicial del Patrón 1
  cargarProgramasCascada('facultad', 'programa');


  document.querySelectorAll('input[name="asignatura"]').forEach(cb => cb.checked = false);


  document.getElementById('motivosCheckboxes').innerHTML = '';
  document.getElementById('motivosContainer').classList.add('hidden');
  document.getElementById('otroAsignaturaContainer').classList.add('hidden');
}


function obtenerDatosFormulario() {
  const tipo = document.getElementById('tipoAcompanamiento').value;

  
  document.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(el => {
    if (el.value.trim()) limpiarEspacios(el);
  });

  
  const asignaturas = Array.from(document.querySelectorAll('input[name="asignatura"]:checked')).map(cb => cb.value);
  const otraAsignatura = document.getElementById('otroAsignatura').value.trim();
  if (asignaturas.includes('Otras') && otraAsignatura) {
    asignaturas[asignaturas.indexOf('Otras')] = `Otras: ${otraAsignatura}`;
  }


  const motivos = Array.from(document.querySelectorAll('input[name="motivo"]:checked')).map(cb => cb.value);


  const datos = {
    tipo_acompanamiento:  tipo,
    fecha_hora:           obtenerFechaISOColombia(),
    documento:            document.getElementById('documento').value.trim().toUpperCase(),
    contacto:             document.getElementById('contacto').value.trim(),
    correo_estudiante:    document.getElementById('correoPersonaCompleto').value.trim().toLowerCase(),
    grupo:                document.getElementById('grupo').value.trim(),
    sede:                 document.getElementById('sede').value.trim().toUpperCase(),
    facultad_estudiante:  document.getElementById('facultad').value,
    programa_estudiante:  document.getElementById('programa').value,
    semestre:             document.getElementById('semestre').value,
    enterado:             document.getElementById('consciente').value,
    profesor:             document.getElementById('nombreSolicitante').value.trim(),
    cargo:                document.getElementById('cargo').value,
    dependencia:          document.getElementById('dependencia').value,
    correo_profesor:      document.getElementById('correoCompleto').value.trim().toLowerCase(),
    asignatura:           asignaturas.join('; '),
    motivo:               motivos.join('; '),
    comentarios:          document.getElementById('infoAdicional').value.trim() || null,
    estado_remision: 'Enviado',
  };

  // Unificar Apellidos y Nombres en un solo campo: Apellidos + Nombres
  const nombres = normalizarNombre(document.getElementById('nombres').value);
  const apellidos = normalizarNombre(document.getElementById('apellidos').value);
  datos.nombre = `${apellidos} ${nombres}`.replace(/\s+/g, ' ').trim();

  return datos;
}


function validarFormulario() {
  const tipo = document.getElementById('tipoAcompanamiento').value;

  if (!tipo) {
    mostrarMensaje('Por favor seleccione un tipo de acompañamiento', 'error');
    return false;
  }

  const docInput             = document.getElementById('documento');
  const docConfirmarInput    = document.getElementById('documentoConfirmar');
  const nombres              = document.getElementById('nombres');
  const apellidos            = document.getElementById('apellidos');
  const contactoInput        = document.getElementById('contacto');
  const correoPersona        = document.getElementById('correoPersona');
  const dominioCorreoPersona = document.getElementById('dominioCorreoPersona');
  const grupoInput           = document.getElementById('grupo');
  const sedeEl                = document.getElementById('sede');
  const facultad              = document.getElementById('facultad');
  const programaEl            = document.getElementById('programa');
  const semestreEl             = document.getElementById('semestre');
  const conscienteEl           = document.getElementById('consciente');
  const nombreSolicitante      = document.getElementById('nombreSolicitante');
  const cargoEl                = document.getElementById('cargo');
  const dependenciaEl          = document.getElementById('dependencia');
  const correoInstitucional        = document.getElementById('correo');
  const dominioCorreoInstitucional = document.getElementById('dominioCorreo');

  // Preparar la lista de asignaturas/motivos para las reglas
  const asignaturas = Array.from(document.querySelectorAll('input[name="asignatura"]:checked'));
  const motivos     = Array.from(document.querySelectorAll('input[name="motivo"]:checked'));

    const reglas = [
    // 1. Nombres
    {
      valido:   () => nombres.value.trim().length > 0,
      mensaje:  'Por favor ingrese Nombres',
      elemento: () => nombres
    },
    // 2. Apellidos
    {
      valido:   () => apellidos.value.trim().length > 0,
      mensaje:  'Por favor ingrese Apellidos',
      elemento: () => apellidos
    },
    // 2. Documento (6-10 dígitos)
    {
      valido:   () => { validarDocumentoInput(docInput); return validarDocumento(docInput.value).valido; },
      mensaje:  'Escriba correctamente el documento',
      elemento: () => docInput
    },
    // 2b. Confirmar Documento
    {
      valido:   () => {
        const doc = docInput.value;
        const docConfirmar = docConfirmarInput.value;
        return docConfirmar.length > 0 && compararDocumentos(doc, docConfirmar);
      },
      mensaje:  'Los documentos no coinciden',
      elemento: () => docConfirmarInput
    },
    // 3. Contacto (10 dígitos, empieza por 3)
    {
      valido:   () => validarContacto(contactoInput),
      mensaje:  'Número de contacto no válido',
      elemento: () => contactoInput
    },
    // 4. Correo personal — usuario
    {
      valido:   () => correoPersona.value.trim().length > 0,
      mensaje:  'Por favor ingrese el usuario del correo',
      elemento: () => correoPersona
    },
    // 5. Correo personal — dominio
    {
      valido:   () => !!dominioCorreoPersona.value,
      mensaje:  'Por favor seleccione el dominio del correo',
      elemento: () => dominioCorreoPersona
    },
    // 6. Grupo
    {
      valido:   () => grupoInput.value.trim().length > 0,
      mensaje:  'Por favor ingrese el grupo',
      elemento: () => grupoInput
    },
    // 7. Sede
    {
      valido:   () => !!sedeEl.value,
      mensaje:  'Por favor seleccione la sede académica',
      elemento: () => sedeEl
    },
    // 8. Facultad
    {
      valido:   () => !!facultad.value,
      mensaje:  'Por favor seleccione una facultad',
      elemento: () => facultad
    },
    // 9. Programa
    {
      valido:   () => !!programaEl.value && !programaEl.disabled,
      mensaje:  'Por favor seleccione un programa',
      elemento: () => programaEl
    },
    // 10. Semestre
    {
      valido:   () => !!semestreEl.value,
      mensaje:  'Por favor seleccione el semestre',
      elemento: () => semestreEl
    },
    // 11. Consciente / Enterado
    {
      valido:   () => !!conscienteEl.value,
      mensaje:  'Por favor indique si el estudiante consciente del acompañamiento académico',
      elemento: () => conscienteEl
    },
    // 12. Nombre del profesor/solicitante
    {
      valido:   () => nombreSolicitante.value.trim().length > 0,
      mensaje:  'Por favor ingrese el nombre del profesor, director y/o programa que solicita',
      elemento: () => nombreSolicitante
    },
    // 13. Cargo
    {
      valido:   () => !!cargoEl.value,
      mensaje:  'Por favor seleccione el cargo',
      elemento: () => cargoEl
    },
    // 14. Dependencia
    {
      valido:   () => !!dependenciaEl.value,
      mensaje:  'Por favor seleccione la dependencia',
      elemento: () => dependenciaEl
    },
    // 15. Correo institucional — usuario
    {
      valido:   () => correoInstitucional.value.trim().length > 0,
      mensaje:  'Por favor ingrese el usuario del correo',
      elemento: () => correoInstitucional
    },
    // 16. Correo institucional — dominio
    {
      valido:   () => !!dominioCorreoInstitucional.value,
      mensaje:  'Por favor seleccione el dominio del correo',
      elemento: () => dominioCorreoInstitucional
    },
    // 17. Asignaturas (al menos una)
    {
      valido:   () => asignaturas.length > 0,
      mensaje:  'Por favor seleccione al menos una asignatura',
      elemento: () => document.getElementById('asignaturasContainer')
    },
    // 17b. Si seleccionó "Otras", debe especificar cuál
    {
      valido:   () => !asignaturas.some(a => a.value === 'Otras') || document.getElementById('otroAsignatura').value.trim().length > 0,
      mensaje:  'Por favor especifique la otra asignatura',
      elemento: () => document.getElementById('otroAsignatura')
    },
    // 18. Motivos (al menos uno)
    {
      valido:   () => motivos.length > 0,
      mensaje:  'Por favor seleccione al menos un motivo',
      elemento: () => document.getElementById('motivosContainer')
    }
  ];

  const resultado = validarCamposRequeridos(reglas);

  if (!resultado.valido) {
    mostrarMensaje(resultado.mensaje, 'error');
    scrollToError(resultado.elemento);
    return false;
  }

  return true;
}


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

  try {
    await registrarRemisionAAA(datos);
  } catch (err) {
    console.error('Error al registrar remisión AAA:', err);
    mostrarMensaje(ConsultasPublicas.interpretarError(err, 'No se pudo enviar el formulario'), 'error');
    btnEnviar.disabled    = false;
    btnEnviar.textContent = 'Enviar Formulario';
  }
}


async function registrarRemisionAAA(datos) {
  const btnEnviar = document.getElementById('btnEnviar');
  const respuesta = await ConsultasPublicas.crearRemisionAAA(datos);
  mostrarModalExito(respuesta.codigo_remision);

  btnEnviar.disabled    = false;
  btnEnviar.textContent = 'Enviar Formulario';

  return true;
}


function resetearFormulario(incluirTipo = true) {
  if (incluirTipo) {
    document.getElementById('tipoAcompanamiento').selectedIndex = 0;
    document.getElementById('seccionDinamica').classList.add('hidden');
  }
  limpiarCamposComunes();
}


// scrollToError(), mostrarMensaje(), mostrarFormulario(), regresarABienvenida(),
// mostrarConfirmacionCancelar() — funciones globales definidas en ../Global/global.js

function mostrarModalExito(codigoRemision) {
  const modal = document.getElementById('modalExito');
  document.getElementById('codigoRemisionModal').textContent = codigoRemision;
  modal.classList.remove('hidden');
}

inicializarReinicioPorInactividad(3);


async function buscarSeguimiento() {
  const input = document.getElementById('inputSeguimiento');
  const codigo = input.value.trim().toUpperCase();

  if (!codigo) {
    alert('Por favor ingrese un código de remisión.');
    return;
  }

  const loader = mostrarCargando(document.body);

  try {
    const r = await ConsultasPublicas.consultarUno('acompanamiento', {
      select: 'fecha_hora,tipo_acompanamiento,nombre,facultad_estudiante,programa_estudiante,grupo,estado_remision,informacion,fecha_actualizacion_info',
      eq: { field: 'codigo_remision', value: codigo }
    });

    if (!r) {
      document.getElementById('mensajeSeguimiento').textContent =
        'No se encontró ningún caso asociado al código de remisión ingresado.';
      document.getElementById('mensajeSeguimiento').classList.remove('hidden');
      return;
    }

    document.getElementById('mensajeSeguimiento').classList.add('hidden');
    document.getElementById('seg_fecha').textContent =
      formatearFechaColombia(r.fecha_hora, { formato: 'fechaHora' }) || '—';

    document.getElementById('seg_tipo').textContent           = r.tipo_acompanamiento || '—';
    document.getElementById('seg_estudiante').textContent     = r.nombre || '—';
    document.getElementById('seg_facultad').textContent       = r.facultad_estudiante || '—';
    document.getElementById('seg_programa').textContent       = r.programa_estudiante || '—';
    document.getElementById('seg_grupo').textContent          = r.grupo || '—';
    document.getElementById('seg_estado').textContent         = r.estado_remision || '—';
    document.getElementById('seg_info').textContent           = r.informacion || 'No hay información. Aquí se mostrarán las observaciones de PMA';
    const fechaActTexto = formatearFechaColombia(r.fecha_actualizacion_info, { formato: 'fechaHora' });
    document.getElementById('seg_fecha_info').textContent = fechaActTexto
      ? `Última actualización: ${fechaActTexto}`
      : '';

    const modal = document.getElementById('modalSeguimiento');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

  } catch (err) {
    console.error('Error al buscar seguimiento:', err);
    document.getElementById('mensajeSeguimiento').textContent =
      'Ocurrió un error al buscar el código. Intente nuevamente.';
    document.getElementById('mensajeSeguimiento').classList.remove('hidden');
  } finally {
    ocultarCargando(loader);
  }
}

function cerrarModalSeguimiento() {
  const modal = document.getElementById('modalSeguimiento');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', async () => {
  try {
    await ConsultasPublicas.obtenerFacultadesProgramas();
  } catch (err) {
    console.error('Error al precargar facultades:', err);
  }

  generarSelect('sede',       OPCIONES_SEDE,      'Seleccione una sede');
  generarSelect('semestre',   OPCIONES_SEMESTRE,  'Seleccione un semestre');
  generarSelect('consciente', OPCIONES_SI_NO,     'Seleccione una opción');
  generarSelect('cargo',      OPCIONES_CARGO,     'Seleccione un cargo');
  generarSelect('dependencia',OPCIONES_DEPENDENCIA,'Seleccione una dependencia');

  generarSelectDominioCorreo('dominioCorreoPersona');
  generarSelectDominioCorreo('dominioCorreo');

  // Llena facultades y deja el programa en su estado inicial (Patrón 1).
  // El cambio de facultad lo maneja el onchange del HTML.
  cargarFacultadesCascada('facultad', 'programa');

  generarAsignaturasCheckboxes();

  [
    { input: 'correoPersona', dominio: 'dominioCorreoPersona' },
    { input: 'correo',        dominio: 'dominioCorreo'        }
  ].forEach(({ input, dominio }) => {
    document.getElementById(dominio)?.addEventListener('change', () => actualizarCorreoCompleto(input));
    document.getElementById(input)?.addEventListener('blur',     () => actualizarCorreoCompleto(input));
  });

  console.log('Formulario Acompañamiento Académico iniciado (refactorizado)');
});