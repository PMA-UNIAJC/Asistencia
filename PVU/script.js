// Constantes y utilidades globales provienen de ../Global/global.js

function actualizarFechaHora() {
  const elemento = document.getElementById('fechaHoraActual');
  if (elemento) {
    elemento.textContent = formatearFechaColombia(new Date(), { formato: 'encabezado' });
  }
}

actualizarFechaHora();
setInterval(actualizarFechaHora, 1000); // Se actualiza cada segundo

// obtenerFechaISOColombia(), obtenerDiaSemanaColombia(), obtenerJornadaColombia(),
// limpiarEspacios(), compararDocumentos(), verificarRestriccionEnvio() — funciones globales definidas en ../Global/global.js
ConsultasPublicas.poblarSelectProgramasPlana('programa').catch(function (err) {
  console.error('[PVU] Error precargando programas:', err);
});

// Función para obtener los datos del formulario
function obtenerDatosFormulario() {
  const documentoInput = document.getElementById('documento');
  const nombresInput = document.getElementById('nombres');
  const apellidosInput = document.getElementById('apellidos');
  const programaSelect = document.getElementById('programa');
  const comentarioTextarea = document.getElementById('comentario');
  const satisfaccion = document.querySelector('input[name="satisfaccion"]:checked')?.value;

  // Limpiar espacios en todos los campos antes de enviar
  limpiarEspacios(documentoInput);
  limpiarEspacios(nombresInput);
  limpiarEspacios(apellidosInput);
  limpiarEspacios(comentarioTextarea);
  
  // Obtener valores después de limpiar
  const documento = documentoInput.value.trim();
  let nombres = nombresInput.value.trim();
  let apellidos = apellidosInput.value.trim();
  let comentarioLimpio = comentarioTextarea.value.trim();


  // Unificar Nombres y Apellidos en un solo campo: APELLIDO(S) + NOMBRE(S)
  const nombreCompleto = `${apellidos} ${nombres}`.replace(/\s+/g, ' ').trim();

  // Día de asistencia y jornada calculados automáticamente (no los ingresa el usuario)
  const fechaAsistenciaMayus = obtenerDiaSemanaColombia();
  const jornadaMayus = obtenerJornadaColombia();

return {
  documento,
  nombre: nombreCompleto,
  jornadaMayus,
  fechaAsistenciaMayus,
  satisfaccion: parseInt(satisfaccion),
  comentarioLimpio,
  programa: programaSelect.value
};
}

// Función para registrar la asistencia en Supabase
async function registrarAsistenciaPVU(datos) {
  const btnEnviar = document.getElementById('btnEnviar');

  const datosEnvio = {
    documento: datos.documento,
    nombre: datos.nombre,
    jornada: datos.jornadaMayus,
    fecha_asistencia: datos.fechaAsistenciaMayus,
    satisfaccion: datos.satisfaccion,
    comentario: datos.comentarioLimpio,
    programa: datos.programa,
    fecha: obtenerFechaISOColombia()
  };

  await ConsultasPublicas.insertar('pvu', datosEnvio, { retorno: 'minimal', intentos: 1 });

  mostrarModalExito();

  setTimeout(() => {
    document.getElementById('formPVU').reset();
    document.getElementById('errorDocumento').style.display = 'none';
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    regresarABienvenida();
  }, 2000);

  return true;
}

// Función para enviar el formulario
async function enviarFormulario(event) {
  event.preventDefault();

  const btnEnviar = document.getElementById('btnEnviar');
  
  // Obtener referencias a los campos
  const documentoInput = document.getElementById('documento');
  const documentoConfirmarInput = document.getElementById('documentoConfirmar');
  const nombresInput = document.getElementById('nombres');
  const apellidosInput = document.getElementById('apellidos');
  const programaSelect = document.getElementById('programa');
  const comentarioTextarea = document.getElementById('comentario');
  const satisfaccionRadio = document.querySelector('input[name="satisfaccion"]:checked');

  // Limpiar espacios en todos los campos antes de validar
  limpiarEspacios(documentoInput);
  limpiarEspacios(nombresInput);
  limpiarEspacios(apellidosInput);
  limpiarEspacios(comentarioTextarea);
  
  // Validación de todos los campos mediante lista de reglas
  const reglasValidacion = [
    {
      valido: () => {
        const len = documentoInput.value.trim().length;
        return len >= 6 && len <= 10;
      },
      mensaje: 'Escriba correctamente su documento',
      elemento: () => documentoInput
    },
    {
      valido: () => {
        const doc = documentoInput.value.trim();
        const docConfirmar = documentoConfirmarInput.value.trim();
        return docConfirmar.length > 0 && compararDocumentos(doc, docConfirmar);
      },
      mensaje: 'Los documentos no coinciden',
      elemento: () => documentoConfirmarInput
    },
    {
      valido: () => nombresInput.value.trim().length > 0,
      mensaje: 'Por favor ingrese sus nombres',
      elemento: () => nombresInput
    },
    {
      valido: () => apellidosInput.value.trim().length > 0,
      mensaje: 'Por favor ingrese sus apellidos',
      elemento: () => apellidosInput
    },
    {
      valido: () => !!programaSelect.value,
      mensaje: 'Por favor seleccione su programa académico',
      elemento: () => programaSelect
    },
    {
      valido: () => !!satisfaccionRadio,
      mensaje: 'Por favor seleccione un nivel de satisfacción',
      elemento: () => document.getElementById('ratingContainer')
    },
  ];

  for (const regla of reglasValidacion) {
    if (!regla.valido()) {
      mostrarMensaje(regla.mensaje, 'error');
      setTimeout(() => {
        scrollToError(regla.elemento());
      }, 100);
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


    // Deshabilitar botón mientras se verifica y se envía
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Verificando...';

  // Validar restricción general de envío (5 horas) mediante Global/global.js
  const verificacion = await verificarRestriccionEnvio({
    tabla: 'pvu',
    documento: datos.documento,
    horasLimite: 5,
    construirMensaje: (tiempoRestante) =>
      `Ya registraste tu asistencia en este horario. Podrás volver a registrarla en ${tiempoRestante}.`
  });

  if (!verificacion.puedeRegistrar) {
    mostrarMensaje(verificacion.mensaje, 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    return;
  }

  btnEnviar.textContent = 'Enviando...';

  try {
    await registrarAsistenciaPVU(datos);
  } catch (error) {
    console.error('Error al enviar formulario PVU:', error);
    mostrarMensaje(ConsultasPublicas.interpretarError(error, 'Error al enviar el formulario'), 'error');
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
  }
}

// scrollToError(), mostrarMensaje(), mostrarFormulario(), regresarABienvenida(),
// mostrarConfirmacionCancelar() — funciones globales definidas en ../Global/global.js

// Función para mostrar modal de éxito
function mostrarModalExito() {
  const modal = document.getElementById('modalExito');
  modal.classList.remove('hidden');

  setTimeout(() => {
    modal.classList.add('hidden');
  }, 3000);
}

// Inicialización
console.log('Formulario PVU iniciado');

inicializarReinicioPorInactividad(3);
