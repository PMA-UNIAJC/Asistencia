// ============================================================================
// PMA/script.js — LÓGICA ESPECÍFICA DEL FORMULARIO DE ASISTENCIA PMA
// Las utilidades compartidas provienen de ../Global/global.js
// ============================================================================

let datosEstudiante = null;
let instructorActual = null;
let formularioEnviandose = false;
let paginaFormularioActual = 1;

// ===================================
// PRECARGA DE DATOS DEL FORMULARIO PMA
// ===================================
async function precargarDatosFormulario() {
  const todosCargados =
    datosCache.facultadesCarreras.length > 0 &&
    datosCache.tutoresNorte.length > 0 &&
    datosCache.tutoresSur.length > 0 &&
    datosCache.profesores.length > 0 &&
    datosCache.materias.length > 0 &&
    datosCache.temas.length > 0;

  if (todosCargados) {
    return;
  }

  await ConsultasPublicas.obtenerCatalogosPMA();
}

function obtenerTutoresPorSede(sede) {
  const sedeNormalizada = String(sede || '').trim().toUpperCase();
  if (sedeNormalizada === 'VIRTUAL') {
    return [...datosCache.tutoresNorte, ...datosCache.tutoresSur];
  } else if (sedeNormalizada === 'NORTE') {
    return datosCache.tutoresNorte;
  } else if (sedeNormalizada === 'SUR') {
    return datosCache.tutoresSur;
  }
  return [];
}

// ===================================
// FUNCIONES DE NAVEGACIÓN DE PMA
// ===================================
async function mostrarLogin() {
  mostrarContenidoFormulario();
  setTimeout(() => {
    mostrarPantalla('pantallaLogin');
    if (elementosDOM.mensajeLogin) {
      elementosDOM.mensajeLogin.textContent = '';
    }
  }, 230);
}

async function mostrarRegistro() {
  mostrarContenidoFormulario();
  setTimeout(() => {
    mostrarPantalla('pantallaRegistro');
    if (elementosDOM.mensajeRegistro) {
      elementosDOM.mensajeRegistro.textContent = '';
    }
    if (elementosDOM.confirmacionDatos) {
      elementosDOM.confirmacionDatos.classList.add('hidden');
    }
    if (elementosDOM.btnConfirmarRegistro) {
      elementosDOM.btnConfirmarRegistro.classList.add('hidden');
    }
    if (elementosDOM.pasoDocumento) {
      elementosDOM.pasoDocumento.classList.remove('hidden');
    }
    if (elementosDOM.formRegistro) {
      elementosDOM.formRegistro.classList.add('hidden');
    }
    if (elementosDOM.regDocumento) {
      elementosDOM.regDocumento.value = '';
    }
  }, 550);
}

function limpiarFormularios() {
  if (elementosDOM.formRegistro) elementosDOM.formRegistro.reset();
  if (elementosDOM.formLogin) elementosDOM.formLogin.reset();
  if (elementosDOM.formTutoria) elementosDOM.formTutoria.reset();
  if (elementosDOM.formAdminLogin) elementosDOM.formAdminLogin.reset();
}

// ===================================
// VALIDACIÓN MANUAL DE PANTALLAS PMA
// ===================================

// Pantalla "Verificar documento" (formVerificarDocumento)
function validarFormVerificarDocumento() {
  const regDocumento = document.getElementById('regDocumento');
  const regDocumentoConfirmar = document.getElementById('regDocumentoConfirmar');

  const reglas = [
    {
      valido: () => validarDocumento(regDocumento.value).valido,
      mensaje: 'Por favor ingrese un documento válido',
      elemento: () => regDocumento
    },
    {
      valido: () => validarDocumento(regDocumentoConfirmar.value).valido,
      mensaje: 'Por favor confirme su documento de identidad',
      elemento: () => regDocumentoConfirmar
    },
    {
      valido: () => compararDocumentos(regDocumento.value, regDocumentoConfirmar.value),
      mensaje: 'Los documentos no coinciden.',
      elemento: () => regDocumentoConfirmar
    }
  ];

  return validarCamposRequeridos(reglas);
}

// Pantalla "Registro del estudiante" (formRegistro)
function validarFormRegistro() {
  const reglas = [
    {
      valido: () => (elementosDOM.regPrimerNombre || document.getElementById('regPrimerNombre')).value.trim().length > 0,
      mensaje: 'Por favor ingrese su primer nombre',
      elemento: () => elementosDOM.regPrimerNombre || document.getElementById('regPrimerNombre')
    },
    {
      valido: () => (elementosDOM.regPrimerApellido || document.getElementById('regPrimerApellido')).value.trim().length > 0,
      mensaje: 'Por favor ingrese su primer apellido',
      elemento: () => elementosDOM.regPrimerApellido || document.getElementById('regPrimerApellido')
    },
    {
      valido: () => (elementosDOM.regSegundoApellido || document.getElementById('regSegundoApellido')).value.trim().length > 0,
      mensaje: 'Por favor ingrese su segundo apellido',
      elemento: () => elementosDOM.regSegundoApellido || document.getElementById('regSegundoApellido')
    },
    {
      valido: () => !!(elementosDOM.regFacultad || document.getElementById('regFacultad')).value,
      mensaje: 'Por favor seleccione una facultad',
      elemento: () => elementosDOM.regFacultad || document.getElementById('regFacultad')
    },
    {
      valido: () => !!(elementosDOM.regPrograma || document.getElementById('regPrograma')).value,
      mensaje: 'Por favor seleccione un programa académico',
      elemento: () => elementosDOM.regPrograma || document.getElementById('regPrograma')
    },
    {
      valido: () => !!(elementosDOM.regSede || document.getElementById('regSede')).value,
      mensaje: 'Por favor seleccione una sede',
      elemento: () => elementosDOM.regSede || document.getElementById('regSede')
    },
    {
      valido: () => !!(elementosDOM.regSemestre || document.getElementById('regSemestre')).value,
      mensaje: 'Por favor seleccione su semestre actual',
      elemento: () => elementosDOM.regSemestre || document.getElementById('regSemestre')
    }
  ];

  return validarCamposRequeridos(reglas);
}

// Pantalla "Iniciar sesión" (formLogin)
function validarFormLogin() {
  const loginDocumento = document.getElementById('loginDocumento');

  const reglas = [
    {
      valido: () => validarDocumento(loginDocumento.value).valido,
      mensaje: 'Documento no válido',
      elemento: () => loginDocumento
    }
  ];

  return validarCamposRequeridos(reglas);
}

// ===================================
// CONFIRMACIÓN Y REGISTRO
// ===================================
function mostrarConfirmacion() {
  const validacion = validarFormRegistro();
  if (!validacion.valido) {
    mostrarMensaje('mensajeRegistro', validacion.mensaje, 'error');
    if (validacion.elemento) {
      scrollToError(validacion.elemento);
    }
    return;
  }
  
  const doc = (elementosDOM.regDocumento || document.getElementById('regDocumento'))?.value;
  
  const validacionDoc = validarDocumento(doc);
  if (!validacionDoc.valido) {
    mostrarMensaje('mensajeRegistro', validacionDoc.mensaje, 'error');
    return;
  }
    
  const primerNombre = (elementosDOM.regPrimerNombre || document.getElementById('regPrimerNombre'))?.value.toUpperCase();
  const segundoNombre = (elementosDOM.regSegundoNombre || document.getElementById('regSegundoNombre'))?.value.toUpperCase();
  const primerApellido = (elementosDOM.regPrimerApellido || document.getElementById('regPrimerApellido'))?.value.toUpperCase();
  const segundoApellido = (elementosDOM.regSegundoApellido || document.getElementById('regSegundoApellido'))?.value.toUpperCase();
  const facultad = (elementosDOM.regFacultad || document.getElementById('regFacultad'))?.value;
  const programa = (elementosDOM.regPrograma || document.getElementById('regPrograma'))?.value;
  const sede = ((elementosDOM.regSede || document.getElementById('regSede'))?.value || '').trim().toUpperCase();
  
  const nombreCompleto = `${primerApellido} ${segundoApellido} ${primerNombre} ${segundoNombre}`.replace(/\s+/g, ' ').trim();
  const semestre = (elementosDOM.regSemestre || document.getElementById('regSemestre'))?.value;

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
  `;

  const datosConfirmacion = elementosDOM.datosConfirmacion || document.getElementById('datosConfirmacion');
  if (datosConfirmacion) {
    datosConfirmacion.innerHTML = html;
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

async function verificarDocumento(event) {
  event.preventDefault();
  
  const validacion = validarFormVerificarDocumento();
  if (!validacion.valido) {
    mostrarMensaje('mensajeRegistro', validacion.mensaje, 'error');
    if (validacion.elemento) {
      scrollToError(validacion.elemento);
    }
    return;
  }
  
  const doc = document.getElementById('regDocumento').value;
  
  mostrarCargando('mensajeRegistro');

  try {
    const [, estudianteExistente] = await Promise.all([
      precargarDatosFormulario(),
      ConsultasPublicas.consultarUno('estudiantes', {
        eq: { field: 'documento', value: doc }
      })
    ]);

    if (estudianteExistente) {
      mostrarFormularioParaEstudiante(estudianteExistente);
      return;
    }

    document.getElementById('mensajeRegistro').innerHTML = '';
    document.getElementById('pasoDocumento').classList.add('hidden');
    document.getElementById('formRegistro').classList.remove('hidden');
    document.getElementById('regDocumentoMostrar').value = doc;
    
    cargarFacultadesCascada('regFacultad', 'regPrograma');
    
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

  } catch (error) {
    mostrarMensaje('mensajeRegistro', ConsultasPublicas.interpretarError(error, 'Error al verificar el documento'), 'error');
  }
}

function manejarSubmitRegistro(event) {
  event.preventDefault();
  
  const btnConfirmar = document.getElementById('btnConfirmarRegistro');
  
  if (btnConfirmar && btnConfirmar.classList.contains('hidden')) {
    mostrarConfirmacion();
  } else {
    registrarEstudiante(event);
  }
}

async function registrarEstudiante(event) {
  event.preventDefault();
  
  const doc = document.getElementById('regDocumentoMostrar').value;
  const btnRegistro = document.getElementById('btnConfirmarRegistro');
  
  btnRegistro.disabled = true;
  btnRegistro.textContent = 'Continuando...';
  btnRegistro.style.opacity = '0.6';
  btnRegistro.style.cursor = 'not-allowed';
  
  mostrarCargando('mensajeRegistro');

  const primerNombre = document.getElementById('regPrimerNombre').value.toUpperCase();
  const segundoNombre = document.getElementById('regSegundoNombre').value.toUpperCase();
  const primerApellido = document.getElementById('regPrimerApellido').value.toUpperCase();
  const segundoApellido = document.getElementById('regSegundoApellido').value.toUpperCase();

  const datos = {
    documento: doc,
    nombre: [primerApellido, segundoApellido, primerNombre, segundoNombre].filter(Boolean).join(' '),
    facultad: document.getElementById('regFacultad').value,
    programa: document.getElementById('regPrograma').value,
    sede: document.getElementById('regSede').value.trim().toUpperCase(),
    semestre: parseInt(document.getElementById('regSemestre').value)
  };

  try {
    const resultado = await ConsultasPublicas.insertar('estudiantes', datos);
    
    if (resultado && resultado.length > 0) {
      document.getElementById('mensajeRegistro').innerHTML = '';
      mostrarFormularioParaEstudiante(datos);
    } else {
      mostrarMensaje('mensajeRegistro', 'Error: No se pudo completar el registro', 'error');
      btnRegistro.disabled = false;
      btnRegistro.textContent = 'Continuar';
      btnRegistro.style.opacity = '1';
      btnRegistro.style.cursor = 'pointer';
    }
  } catch (error) {
    mostrarMensaje('mensajeRegistro', ConsultasPublicas.interpretarError(error, 'No se pudo registrar el estudiante'), 'error');
    btnRegistro.disabled = false;
    btnRegistro.textContent = 'Continuar';
    btnRegistro.style.opacity = '1';
    btnRegistro.style.cursor = 'pointer';
  }
}

// ===================================
// LOGIN E INICIO DE FORMULARIO
// ===================================
function mostrarFormularioParaEstudiante(estudiante) {
  const nombreCompleto = estudiante.nombre;

  datosEstudiante = {
    documento: estudiante.documento,
    nombre: nombreCompleto,
    nombreCensurado: censurarNombre(nombreCompleto),
    facultad: estudiante.facultad,
    programa: estudiante.programa,
    sede: estudiante.sede || '',
    semestre: estudiante.semestre
  };

  formularioEnviandose = false;
  ocultarCargando('mensajeLogin');
  ocultarCargando('mensajeRegistro');
  mostrarPantalla('pantallaFormulario');
  if (elementosDOM.nombreUsuario) {
    elementosDOM.nombreUsuario.textContent = 'Bienvenido(a): ' + datosEstudiante.nombreCensurado;
  }
  if (elementosDOM.mensajeFormulario) {
    elementosDOM.mensajeFormulario.textContent = '';
  }
  actualizarBotonCerrarSesion();
}

async function iniciarRegistroDesdeFormulario(documento) {
  try {
    await ConsultasPublicas.obtenerFacultadesProgramas();
  } catch (error) {
    mostrarMensaje('mensajeLogin', 'Error al cargar los datos. Por favor intenta de nuevo.', 'error');
    return;
  }

  ocultarCargando('mensajeLogin');
  mostrarPantalla('pantallaRegistro');

  if (elementosDOM.mensajeRegistro) elementosDOM.mensajeRegistro.textContent = '';
  if (elementosDOM.confirmacionDatos) elementosDOM.confirmacionDatos.classList.add('hidden');
  if (elementosDOM.btnConfirmarRegistro) elementosDOM.btnConfirmarRegistro.classList.add('hidden');
  if (elementosDOM.btnContinuar) elementosDOM.btnContinuar.classList.remove('hidden');

  document.getElementById('formRegistro').classList.add('hidden');
  document.getElementById('pasoDocumento').classList.remove('hidden');
  document.getElementById('regDocumento').value = documento;
  document.getElementById('regDocumentoConfirmar').value = '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function iniciarSesion(event) {
  event.preventDefault();
  
  const validacion = validarFormLogin();
  if (!validacion.valido) {
    mostrarMensaje('mensajeLogin', validacion.mensaje, 'error');
    if (validacion.elemento) {
      scrollToError(validacion.elemento);
    }
    return;
  }
  
  const documento = document.getElementById('loginDocumento').value;
  
  mostrarCargando('mensajeLogin');

  try {
    const [, estudiante] = await Promise.all([
      precargarDatosFormulario(),
      ConsultasPublicas.consultarUno('estudiantes', {
        eq: { field: 'documento', value: documento }
      })
    ]);

    if (!estudiante) {
      await iniciarRegistroDesdeFormulario(documento);
      return;
    }
    mostrarFormularioParaEstudiante(estudiante);

  } catch (error) {
    mostrarMensaje('mensajeLogin', 'Error de conexión: ' + error.message, 'error');
  }
}

function poblarSelectInstructor(selectInstructor, lista, opciones) {
  const { tipoLabel, textoVacio, mensajeNormal, valueKey = 'nombre', textKey = 'nombre', agruparPorArea = false } = opciones;
  const avisoInstructor = document.getElementById('avisoInstructor');

  if (!lista || lista.length === 0) {
    poblarSelect(selectInstructor, [], {
      primeraOpcion: textoVacio
    });
    selectInstructor.disabled = true;
    selectInstructor.required = false;
    return;
  }

  selectInstructor.disabled = false;
  selectInstructor.required = true;
  if (avisoInstructor) {
    avisoInstructor.textContent = mensajeNormal;
    avisoInstructor.style.color = '';
    avisoInstructor.style.fontWeight = '';
  }

  if (agruparPorArea) {
    selectInstructor.innerHTML = `<option value="">Seleccione un ${tipoLabel}</option>`;
    const fragment = document.createDocumentFragment();

    const gruposArea = [
      { codigo: 'M', label: 'MATEMÁTICAS' },
      { codigo: 'C', label: 'COMUNICACIÓN' }
    ];

    for (const grupo of gruposArea) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = grupo.label;

      const itemsGrupo = lista.filter(
        item => String(item.area ?? '').trim().toUpperCase() === grupo.codigo
      );

      for (const item of itemsGrupo) {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        optgroup.appendChild(option);
      }

      fragment.appendChild(optgroup);
    }

    selectInstructor.appendChild(fragment);
    return;
  }

  poblarSelect(selectInstructor, lista, {
    valueKey,
    textKey,
    primeraOpcion: `Seleccione un ${tipoLabel}`
  });
}

// ===================================
// CARGAR INSTRUCTORES, MATERIAS Y TEMAS
// ===================================
async function cargarInstructores() {
  const sede = document.getElementById('sedeTutoria').value;
  const tipo = document.getElementById('tipoInstructor').value;

  if (!sede || !tipo) return;

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

    const instructores = obtenerTutoresPorSede(sede);
    const instructoresOrdenados = [...instructores].sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    const instructoresUnicos = [];
    const nombresVistos = new Set();
    for (const inst of instructoresOrdenados) {
      if (!nombresVistos.has(inst.nombre)) {
        nombresVistos.add(inst.nombre);
        instructoresUnicos.push(inst);
      }
    }
    
    poblarSelectInstructor(selectInstructor, instructoresUnicos, {
      tipoLabel: 'tutor',
      textoVacio: 'No hay tutores disponibles',
      mensajeNormal: '¿No estás seguro? Confirma con tu tutor.',
      agruparPorArea: true
    });
  } else if (tipo === 'Profesor') {
    grupoFacultad.classList.remove('hidden');
    selectFacultad.setAttribute('required', 'required');
  }
}

async function cargarProfesoresPorFacultad() {
  const facultadDepartamento = document.getElementById('facultadDepartamento').value;

  if (!facultadDepartamento) return;

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
  document.getElementById('avisoInstructor').textContent = '¿No estás seguro? Confirma con tu profesor.';

  const profesores = datosCache.profesores.filter(
    prof => prof.facultad_departamento === facultadDepartamento
  );

  const profesoresOrdenados = [...profesores].sort((a, b) => a.nombre.localeCompare(b.nombre));

  poblarSelectInstructor(selectInstructor, profesoresOrdenados, {
    tipoLabel: 'profesor',
    textoVacio: 'No hay profesores disponibles',
    mensajeNormal: '¿No estás seguro? Confirma con tu profesor.'
  });

  if (profesoresOrdenados.length > 0) {
    profesoresOrdenados.forEach((prof, index) => {
      const option = selectInstructor.options[index + 1];
      if (option) {
        option.setAttribute('data-area', prof.area);
      }
    });
  }
}

function obtenerTextoSugerenciaAreaTutor() {
  if (!instructorActual || !Array.isArray(instructorActual.areas) || instructorActual.areas.length === 0) {
    return '';
  }

  const mapaAreas = {
    M: 'MATEMÁTICAS',
    C: 'COMUNICACIÓN'
  };

  const nombresAreas = instructorActual.areas
    .map(area => mapaAreas[String(area ?? '').trim().toUpperCase()])
    .filter(Boolean);

  if (nombresAreas.length === 0) return '';

  return `El tutor seleccionado es del área de ${nombresAreas.join(' y ')}.`;
}

function actualizarSugerenciasAreaTutor() {
  const textoSugerencia = obtenerTextoSugerenciaAreaTutor();
  const idsAvisos = ['avisoAsignatura', 'avisoTema'];

  for (const id of idsAvisos) {
    const elemento = document.getElementById(id);
    if (!elemento) continue;

    if (textoSugerencia) {
      elemento.textContent = textoSugerencia;
      elemento.classList.remove('hidden');
    } else {
      elemento.textContent = '';
      elemento.classList.add('hidden');
    }
  }
}

async function cargarMaterias() {
  const selectInstructor = document.getElementById('instructor');
  const selectedOption = selectInstructor.options[selectInstructor.selectedIndex];
  
  if (!selectedOption || !selectedOption.value) return;

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
      mostrarCargando('mensajeFormulario');
    }
    
    try {
      await precargarDatosFormulario();
      if (mensajeFormulario) {
        ocultarCargando('mensajeFormulario');
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
    const tutores = obtenerTutoresPorSede(sede);
    
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
  actualizarSugerenciasAreaTutor();

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

async function cargarTemas() {
  const materia = document.getElementById('asignatura').value;
  if (!materia) return;

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

  actualizarSugerenciasAreaTutor();

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
    labelTema.textContent = 'Tema de la Tutoría *';
    
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
    
    labelTema.textContent = 'Tema de la Tutoría *';
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
    
    labelTema.textContent = 'Tema de la Tutoría *';
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
    actualizarSugerenciasAreaTutor();
    container.classList.remove('hidden');
    input.required = true;
  } else {
    container.classList.add('hidden');
    input.required = false;
    input.value = '';
  }
}

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
    function () {
      cerrarSesion();
    }
  );
}

// ===================================
// GUARDAR FORMULARIO
// ===================================
async function guardarFormulario(event) {
  event.preventDefault();
  
  const btnEnviar = document.getElementById('btnEnviar');
  
  const calificacionRadio = document.querySelector('input[name="calificacion"]:checked');
  const dudasResueltasRadio = document.querySelector('input[name="dudas_resueltas"]:checked');
  const dominioTemaRadio = document.querySelector('input[name="dominio_tema"]:checked');
  const ambienteRadio = document.querySelector('input[name="ambiente"]:checked');
  const recomendaPmaRadio = document.querySelector('input[name="recomienda_pma"]:checked');
  
  const reglasCalificacion = [
    { valor: calificacionRadio, contenedorId: 'ratingCalificacion', mensaje: 'Por favor seleccione la calificación de la tutoría' },
    { valor: dudasResueltasRadio, contenedorId: 'ratingDudasResueltas', mensaje: 'Por favor seleccione si se resolvieron sus dudas' },
    { valor: dominioTemaRadio, contenedorId: 'ratingDominioTema', mensaje: 'Por favor seleccione si el tutor demostró dominio del tema' },
    { valor: ambienteRadio, contenedorId: 'ratingAmbiente', mensaje: 'Por favor seleccione si el ambiente fue adecuado para concentrarse' },
    { valor: recomendaPmaRadio, contenedorId: 'ratingRecomiendaPma', mensaje: 'Por favor seleccione si recomendaría el PMA' }
  ];

  for (const regla of reglasCalificacion) {
    if (!regla.valor) {
      const ratingContainer = document.getElementById(regla.contenedorId);
      mostrarMensaje('mensajeFormulario', regla.mensaje, 'error');
      setTimeout(() => {
        scrollToError(ratingContainer);
      }, 100);
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      btnEnviar.style.opacity = '1';
      btnEnviar.style.cursor = 'pointer';
      return;
    }
  }
  
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';
  btnEnviar.style.opacity = '0.6';
  btnEnviar.style.cursor = 'not-allowed';
  
  mostrarCargando('mensajeFormulario');
  
  const instructorSeleccionado = document.getElementById('instructor').value;
  
  const verificacion = await verificarRestriccionesEnvio([
    {
      // 1. Envío general independientemente del tutor (1 hora)
      tabla: 'formularios',
      documento: datosEstudiante.documento,
      horasLimite: 1,
      construirMensaje: (tiempoRestante) =>
        `Ya registraste una tutoría recientemente. Podrás volver a registrar otra en ${tiempoRestante}.`
    },
    {
      // 2. Envío dependiendo del tutor (3 horas)
      tabla: 'formularios',
      documento: datosEstudiante.documento,
      horasLimite: 3,
      filtrosExtra: { instructor: instructorSeleccionado },
      construirMensaje: (tiempoRestante) =>
        `Ya tienes una tutoría reciente con este tutor. Podrás registrar otra en ${tiempoRestante}, o puedes realizarla con otro tutor si lo prefieres.`
    }
  ]);
  
  if (!verificacion.puedeRegistrar) {
    const mensajeElement = document.getElementById('mensajeFormulario');
    
    mostrarMensaje('mensajeFormulario', verificacion.mensaje, 'error');
    
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

  let asignatura = document.getElementById('asignatura').value;
  if (asignatura === 'Otra') {
    asignatura = document.getElementById('otraAsignatura').value.trim();
    if (!asignatura) {
      mostrarMensaje('mensajeFormulario', 'Por favor especifique la asignatura', 'error');
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      btnEnviar.style.opacity = '1';
      btnEnviar.style.cursor = 'pointer';
      return;
    }
  }

  const selectTema = document.getElementById('tema');
  const inputTema = document.getElementById('otroTema');
  let tema = '';

  if (selectTema.value === 'Otro') {
    tema = inputTema.value.trim();
    if (!tema) {
      mostrarMensaje('mensajeFormulario', 'Por favor especifique el tema', 'error');
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      btnEnviar.style.opacity = '1';
      btnEnviar.style.cursor = 'pointer';
      return;
    }
  } else if (selectTema.style.display === 'none') {
    tema = inputTema.value.trim();
    if (!tema) {
      mostrarMensaje('mensajeFormulario', 'Por favor especifique el tema de la tutoría', 'error');
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      btnEnviar.style.opacity = '1';
      btnEnviar.style.cursor = 'pointer';
      return;
    }
  } else {
    tema = selectTema.value;
  }

  const tipoAcompanamiento = document.getElementById('tipoAcompanamiento').value;
  const tituloCurso = tipoAcompanamiento === 'Curso y/o capacitación' 
    ? document.getElementById('tituloCurso').value
    : null;
  
  const fechaISO = obtenerFechaISOColombia();
  const facultadDepartamentoValue = document.getElementById('facultadDepartamento').value || null;
  
  const datos = {
    documento: datosEstudiante.documento,
    tipo_acompanamiento: tipoAcompanamiento,
    titulo_curso: tituloCurso,
    sede_tutoria: document.getElementById('sedeTutoria').value.trim().toUpperCase(),
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
    sugerencias: document.getElementById('sugerencias').value || null,
    fecha: fechaISO
  };

  try {
    await ConsultasPublicas.insertar('formularios', datos, { retorno: 'minimal', intentos: 1 });
    
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
      location.reload();
    }, 3000);
  } catch (error) {
    mostrarMensaje('mensajeFormulario', ConsultasPublicas.interpretarError(error, 'No se pudo enviar el formulario'), 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
  }
}

function cerrarSesion() {
  datosEstudiante = null;
  instructorActual = null;
  formularioEnviandose = false;
  
  const btnEnviar = document.getElementById('btnEnviar');
  if (btnEnviar) {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    btnEnviar.style.opacity = '1';
    btnEnviar.style.cursor = 'pointer';
  }
  
  paginaFormularioActual = 1;
  document.getElementById('paginaFormulario1').classList.remove('hidden');
  document.getElementById('paginaFormulario2').classList.add('hidden');
  document.getElementById('btnEnviar').classList.add('hidden');
  
  location.reload();
}

// ===================================
// MANEJO DEL BOTÓN DE RETROCESO (BACK BUTTON)
// ===================================
let historialNavegacion = ['pantallaBienvenida'];

function actualizarHistorialNavegacion(nuevaPantalla) {
  pantallaActual = nuevaPantalla;
  
  const estadoActual = {
    pantalla: nuevaPantalla,
    timestamp: Date.now()
  };
  
  window.history.pushState(estadoActual, '', window.location.href);
}

const mostrarPantallaOriginal = mostrarPantalla;
mostrarPantalla = function (id) {
  mostrarPantallaOriginal(id);
  actualizarHistorialNavegacion(id);
};

window.addEventListener('popstate', function (event) {
  event.preventDefault();
  
  if (!event.state) {
    if (pantallaActual !== 'pantallaBienvenida') {
      manejarRetroceso();
    }
    return;
  }
  
  manejarRetroceso();
});

function manejarRetroceso() {
  if (pantallaActual === 'pantallaLogin') {
    volverInicio();
    return;
  }
  
  if (pantallaActual === 'pantallaFormulario') {
    window.history.pushState({ pantalla: pantallaActual }, '', window.location.href);
    confirmarCancelacion();
    return;
  }
  
  if (pantallaActual === 'pantallaRegistro') {
    window.history.pushState({ pantalla: pantallaActual }, '', window.location.href);
    confirmarCancelacion();
    return;
  }
  
  volverInicio();
}

window.addEventListener('load', function () {
  const estadoInicial = {
    pantalla: 'pantallaBienvenida',
    timestamp: Date.now()
  };
  
  window.history.replaceState(estadoInicial, '', window.location.href);
  pantallaActual = 'pantallaBienvenida';
});

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// ===================================
// FUNCIONES DE PAGINACIÓN
// ===================================
function validarPagina1() {
  const tipoAcompanamientoEl = document.getElementById('tipoAcompanamiento');
  const tituloCursoEl = document.getElementById('tituloCurso');
  const sedeTutoriaEl = document.getElementById('sedeTutoria');
  const tipoInstructorEl = document.getElementById('tipoInstructor');
  const facultadDepartamentoEl = document.getElementById('facultadDepartamento');
  const instructorEl = document.getElementById('instructor');
  const asignaturaEl = document.getElementById('asignatura');
  const otraAsignaturaEl = document.getElementById('otraAsignatura');
  const temaSelectEl = document.getElementById('tema');
  const otroTemaEl = document.getElementById('otroTema');
  const motivoConsultaEl = document.getElementById('motivoConsulta');

  const tipoAcompanamiento = tipoAcompanamientoEl.value;
  const tipoInstructor = tipoInstructorEl.value;
  const asignatura = asignaturaEl.value;

  if (!tipoAcompanamiento) {
    return { valido: false, mensaje: 'Por favor seleccione un tipo de acompañamiento', elemento: tipoAcompanamientoEl };
  }

  if (tipoAcompanamiento === 'Curso y/o capacitación' && !tituloCursoEl.value.trim()) {
    return { valido: false, mensaje: 'Por favor ingrese el título del curso/capacitación', elemento: tituloCursoEl };
  }

  if (!sedeTutoriaEl.value) {
    return { valido: false, mensaje: 'Por favor seleccione una sede', elemento: sedeTutoriaEl };
  }

  if (!tipoInstructor) {
    return { valido: false, mensaje: 'Por favor seleccione un tipo de instructor', elemento: tipoInstructorEl };
  }

  if (tipoInstructor === 'Profesor' && !facultadDepartamentoEl.value) {
    return { valido: false, mensaje: 'Por favor seleccione una facultad/departamento', elemento: facultadDepartamentoEl };
  }

  if (instructorEl.disabled) {
    const mensajeSinInstructor = tipoInstructor === 'Profesor'
      ? 'No hay profesores disponibles para esta facultad/departamento en este momento. Por favor seleccione otra facultad o comuníquese con el PMA.'
      : 'No hay tutores disponibles para esta sede en este momento. Por favor seleccione otra sede o comuníquese con el PMA.';
    const elementoSinInstructor = tipoInstructor === 'Profesor' ? facultadDepartamentoEl : sedeTutoriaEl;
    return { valido: false, mensaje: mensajeSinInstructor, elemento: elementoSinInstructor };
  }

  if (!instructorEl.value) {
    return { valido: false, mensaje: 'Por favor seleccione un instructor', elemento: instructorEl };
  }

  if (!asignatura) {
    return { valido: false, mensaje: 'Por favor seleccione una asignatura', elemento: asignaturaEl };
  }

  if (asignatura === 'Otra' && !otraAsignaturaEl.value.trim()) {
    return { valido: false, mensaje: 'Por favor especifique la asignatura', elemento: otraAsignaturaEl };
  }

  if (temaSelectEl.style.display === 'none') {
    if (!otroTemaEl.value.trim()) {
      return { valido: false, mensaje: 'Por favor ingrese el tema de la tutoría', elemento: otroTemaEl };
    }
  } else {
    const tema = temaSelectEl.value;
    if (!tema) {
      return { valido: false, mensaje: 'Por favor seleccione un tema', elemento: temaSelectEl };
    }
    if (tema === 'Otro' && !otroTemaEl.value.trim()) {
      return { valido: false, mensaje: 'Por favor especifique el tema', elemento: otroTemaEl };
    }
  }

  if (!motivoConsultaEl.value) {
    return { valido: false, mensaje: 'Por favor seleccione un motivo de consulta', elemento: motivoConsultaEl };
  }

  return { valido: true };
}

function avanzarPagina() {
  if (paginaFormularioActual === 1) {
    const validacion = validarPagina1();
    
    if (!validacion.valido) {
      mostrarMensaje('mensajeFormulario', validacion.mensaje, 'error');
      if (validacion.elemento) {
        setTimeout(() => {
          scrollToError(validacion.elemento);
        }, 100);
      }
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

document.addEventListener('DOMContentLoaded', function () {
  // Precarga integral en segundo plano de todos los catálogos públicos del formulario
  // para que el estudiante no espere entre preguntas (reutilizando caché entre recargas).
  ConsultasPublicas.obtenerCatalogosPMA().catch(function (err) {
    console.warn('[PMA] Precarga inicial diferida:', err.message);
  });

  const recomendacionesPma = document.querySelectorAll('input[name="recomienda_pma"]');
  recomendacionesPma.forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.checked) {
      }
    });
  });

  if (elementosDOM.pantallaBienvenida && elementosDOM.pantallaBienvenida.style.display !== 'none') {
    document.body.classList.add('welcome-active');
  }
});

// Activar reinicio automático por inactividad de 3 minutos (definido en Global/global.js)
inicializarReinicioPorInactividad(3);
