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
// normalizarNombre(), limpiarEspacios(), compararDocumentos(), verificarRestriccionEnvio() — funciones globales definidas en ../Global/global.js
ConsultasPublicas.poblarSelectProgramasPorId('programa').catch(function (err) {
  console.error('[PVU] Error precargando programas:', err);
});

function obtenerProgramaIdSeleccionado() {
  const programaSelect = document.getElementById('programa');
  const valor = (programaSelect && programaSelect.value ? String(programaSelect.value) : '').trim();
  if (!valor) return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function normalizarCamposTextoPVU() {
  const nombresInput = document.getElementById('nombres');
  const apellidosInput = document.getElementById('apellidos');
  const comentarioTextarea = document.getElementById('comentario');

  const nombres = nombresInput ? normalizarNombre(nombresInput.value) : '';
  const apellidos = apellidosInput ? normalizarNombre(apellidosInput.value) : '';
  if (nombresInput) nombresInput.value = nombres;
  if (apellidosInput) apellidosInput.value = apellidos;

  let comentario = '';
  if (comentarioTextarea) {
    comentarioTextarea.value = comentarioTextarea.value
      .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9 ,.\-]/g, '')
      .toUpperCase();
    limpiarEspacios(comentarioTextarea);
    comentario = comentarioTextarea.value.trim();
  }

  return { nombres, apellidos, comentario };
}

// Función para obtener los datos del formulario
function obtenerDatosFormulario() {
  const documentoInput = document.getElementById('documento');
  const satisfaccion = document.querySelector('input[name="satisfaccion"]:checked')?.value;

  // Limpiar y normalizar campos antes de empaquetar (garantiza integridad aunque no haya blur)
  limpiarEspacios(documentoInput);
  const { nombres, apellidos, comentario: comentarioLimpio } = normalizarCamposTextoPVU();

  // Obtener valores después de normalizar
  const documento = documentoInput.value.trim();

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
  programa_id: obtenerProgramaIdSeleccionado()
};
}

function finalizarExitoPVU(claveEnvio) {
  if (claveEnvio) {
    ReintentosEnvio.limpiarEnvioIncierto(claveEnvio);
  }
  const btnEnviar = document.getElementById('btnEnviar');
  const mensajeEl = document.getElementById('mensajeFormulario');
  if (mensajeEl) mensajeEl.textContent = '';

  mostrarModalExito();

  setTimeout(() => {
    document.getElementById('formPVU').reset();
    document.getElementById('errorDocumento').style.display = 'none';
    manejarEstadoBoton(btnEnviar, false, '', 'Enviar Formulario');
    regresarABienvenida();
  }, 2000);
}

// Función para registrar la asistencia en Supabase utilizando la lógica global de reintentos
async function registrarAsistenciaPVU(datos, opcionesEnvio = {}) {
  const btnEnviar = document.getElementById('btnEnviar');
  const claveEnvio = opcionesEnvio.claveEnvio || ('pvu:formulario:' + datos.documento);
  const huellaDatos = opcionesEnvio.huellaDatos || [datos.documento, datos.programa_id ?? datos.programa ?? '', datos.satisfaccion].join('|');
  const fechaISO = opcionesEnvio.fechaISO || ReintentosEnvio.obtenerFechaEnvioIdempotente(claveEnvio, huellaDatos, obtenerFechaISOColombia);

  const datosEnvio = {
    documento: datos.documento,
    nombre: datos.nombre,
    jornada: datos.jornadaMayus,
    fecha_asistencia: datos.fechaAsistenciaMayus,
    satisfaccion: datos.satisfaccion,
    comentario: datos.comentarioLimpio,
    programa_id: datos.programa_id,
    fecha: fechaISO
  };

  return await ejecutarEnvioConReintentos({
    clave: claveEnvio,
    datos: datosEnvio,
    huellaDatos: huellaDatos,
    fechaISO: fechaISO,
    boton: btnEnviar,
    textoBotonEnviando: 'Enviando...',
    textoBotonOriginal: 'Enviar Formulario',
    contenedorMensaje: 'mensajeFormulario',
    contextoError: 'Error al enviar el formulario',
    enviar: async function () {
      return await ConsultasPublicas.insertar('pvu', datosEnvio, {
        retorno: 'minimal',
        intentos: 1
      });
    },
    verificarYaRegistrado: async function () {
      return await ConsultasPublicas.consultarUno('pvu', {
        select: 'id,documento,fecha',
        eq: [
          { field: 'documento', value: datosEnvio.documento },
          { field: 'fecha', value: datosEnvio.fecha }
        ]
      });
    },
    alExito: function () {
      finalizarExitoPVU(claveEnvio);
    }
  });
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

  // Limpiar espacios y garantizar normalización de texto antes de validar
  limpiarEspacios(documentoInput);
  normalizarCamposTextoPVU();
  
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
      valido: () => obtenerProgramaIdSeleccionado() !== null,
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


  const claveEnvio = 'pvu:formulario:' + datos.documento;
  const huellaDatos = [datos.documento, datos.programa_id, datos.satisfaccion].join('|');
  const previoIncierto = ReintentosEnvio.obtenerEnvioIncierto(claveEnvio);
  const fechaISO = ReintentosEnvio.obtenerFechaEnvioIdempotente(claveEnvio, huellaDatos, obtenerFechaISOColombia);

  // Deshabilitar botón mientras se verifica y se envía
  manejarEstadoBoton(btnEnviar, true, 'Verificando...');
  mostrarCargando('mensajeFormulario');

  // Validar restricción general de envío (5 horas) mediante Global/global.js
  const verificacion = await verificarRestriccionEnvio({
    tabla: 'pvu',
    documento: datos.documento,
    horasLimite: 5,
    construirMensaje: (tiempoRestante) =>
      `Ya registraste tu asistencia en este horario. Podrás volver a registrarla en ${tiempoRestante}.`
  });

  if (!verificacion.puedeRegistrar) {
    // Si el registro encontrado corresponde exactamente a un intento incierto previo de este mismo envío,
    // significa que el servidor sí lo había recibido y guardado antes de interrumpirse la conexión.
    if (previoIncierto && verificacion.registro && verificacion.registro.fecha === previoIncierto.fechaISO) {
      finalizarExitoPVU(claveEnvio);
      return;
    }

    mostrarMensaje(verificacion.mensaje, 'error');
    manejarEstadoBoton(btnEnviar, false, '', 'Enviar Formulario');
    return;
  }

  await registrarAsistenciaPVU(datos, {
    claveEnvio: claveEnvio,
    huellaDatos: huellaDatos,
    fechaISO: fechaISO
  });
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
