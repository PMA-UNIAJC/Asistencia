const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;

const TIMEZONE_COLOMBIA = 'America/Bogota';

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

async function supabaseInsert(table, data) {
  try {
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
      throw new Error(errorData.message || 'Error al guardar los datos');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en supabaseInsert:', error);
    throw error;
  }
}

function limpiarEspacios(input) {
  let valor = input.value;
  // Eliminar espacios al inicio y al final
  valor = valor.trim();
  // Reemplazar múltiples espacios por un solo espacio
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

// Función para limpiar el estado de validación del campo de confirmación
function limpiarValidacionConfirmacionDocumento() {
  const inputConfirmar = document.getElementById('documentoConfirmar');
  if (inputConfirmar) {
    inputConfirmar.setCustomValidity('');
  }
}

// Función para validar confirmación de documento
function validarConfirmacionDocumento() {
  const documento = document.getElementById('documento').value.trim();
  const documentoConfirmar = document.getElementById('documentoConfirmar').value.trim();
  const inputConfirmar = document.getElementById('documentoConfirmar');
  
  // Limpiar cualquier validación previa antes de validar
  inputConfirmar.setCustomValidity('');
  
  if (documentoConfirmar && documento !== documentoConfirmar) {
    inputConfirmar.setCustomValidity('Los documentos no coinciden');
    return false;
  } else {
    inputConfirmar.setCustomValidity('');
    return true;
  }
}

// Función global para actualizar correo completo
function actualizarCorreoCompleto() {
  const correoInput = document.getElementById('correo');
  const dominioSelect = document.getElementById('dominioCorreo');
  const otroDominio = document.getElementById('otroDominio');
  const correoCompleto = document.getElementById('correoCompleto');
  
  const correo = correoInput.value.trim().toLowerCase();
  let dominio = dominioSelect.value.toLowerCase();
  
  if (dominio === 'otro') {
    dominio = otroDominio.value.trim().toLowerCase();
  }
  
  // Construir el correo completo solo si hay correo y dominio (todo en minúsculas)
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

// Manejar cambio de dominio de correo
document.addEventListener('DOMContentLoaded', function() {
  const dominioSelect = document.getElementById('dominioCorreo');
  const otroDominioContainer = document.getElementById('otroDominioContainer');
  const otroDominio = document.getElementById('otroDominio');
  const correoInput = document.getElementById('correo');

  dominioSelect.addEventListener('change', function() {
    if (this.value === 'otro') {
      otroDominioContainer.classList.remove('hidden');
      otroDominio.required = true;
    } else {
      otroDominioContainer.classList.add('hidden');
      otroDominio.required = false;
      otroDominio.value = '';
    }
    actualizarCorreoCompleto();
  });

  otroDominio.addEventListener('input', actualizarCorreoCompleto);
  
  // Validar el campo de correo cuando se intenta enviar
  correoInput.addEventListener('blur', function() {
    actualizarCorreoCompleto();
    const correoCompleto = document.getElementById('correoCompleto');
    if (this.value.trim() && !correoCompleto.value) {
      this.setCustomValidity('Seleccione un dominio de correo');
    }
  });
});

// Variable para controlar los reintentos
let intentosRestantes = 3;

// Función para obtener los datos del formulario
function obtenerDatosFormulario() {
  const documentoInput = document.getElementById('documento');
  const nombresInput = document.getElementById('nombres');
  const apellidosInput = document.getElementById('apellidos');
  const correoInput = document.getElementById('correo');
  const comentarioTextarea = document.getElementById('comentario');
  const correoCompleto = document.getElementById('correoCompleto').value.trim();
  const programa = document.getElementById('programa').value;
  const sede = document.getElementById('sede').value;
  const jornada = document.getElementById('jornada').value;
  const fechaAsistencia = document.getElementById('fechaAsistencia').value;
  const horarioAsistencia = document.getElementById('horarioAsistencia').value;
  const satisfaccion = document.querySelector('input[name="satisfaccion"]:checked')?.value;

  // Limpiar espacios en todos los campos antes de enviar
  limpiarEspacios(documentoInput);
  limpiarEspacios(nombresInput);
  limpiarEspacios(apellidosInput);
  limpiarEspacios(correoInput);
  limpiarEspacios(comentarioTextarea);
  
  // Obtener valores después de limpiar
  const documento = documentoInput.value.trim();
  let nombres = nombresInput.value.trim();
  let apellidos = apellidosInput.value.trim();
  let comentarioLimpio = comentarioTextarea.value.trim();

  // Construir correo completo si no está en el campo hidden
  let correoFinal = correoCompleto;
  if (!correoFinal) {
    const correo = document.getElementById('correo').value.trim();
    const dominio = document.getElementById('dominioCorreo').value;
    if (dominio === 'otro') {
      const otroDom = document.getElementById('otroDominio').value.trim();
      if (correo && otroDom) {
        correoFinal = `${correo}@${otroDom}`;
      }
    } else if (correo && dominio && dominio !== '') {
      correoFinal = `${correo}@${dominio}`;
    }
  }

  // Convertir a mayúsculas antes de guardar (excepto correo)
  nombres = nombres.toUpperCase();
  apellidos = apellidos.toUpperCase();
  comentarioLimpio = comentarioLimpio.toUpperCase();
  const programaMayus = programa.toUpperCase();
  const sedeMayus = sede.toUpperCase();
  const jornadaMayus = jornada.toUpperCase();
  const fechaAsistenciaMayus = fechaAsistencia.toUpperCase();
  
  // Convertir correo a minúsculas
  correoFinal = correoFinal.toLowerCase();

return {
  documento,
  nombres,
  apellidos,
  correoFinal,
  programaMayus,
  sedeMayus,
  jornadaMayus,
  fechaAsistenciaMayus,
  horarioAsistencia,
  satisfaccion: parseInt(satisfaccion),
  comentarioLimpio
};
}

// Función para intentar enviar con reintentos
async function intentarEnviarConReintentos(datos, intento = 1) {
  const btnEnviar = document.getElementById('btnEnviar');
  
  try {
    // Preparar datos para enviar
    const datosEnvio = {
      documento: datos.documento,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      correo: datos.correoFinal,
      programa: datos.programaMayus,
      sede: datos.sedeMayus,
      jornada: datos.jornadaMayus,
      fecha_asistencia: datos.fechaAsistenciaMayus,
      horario: datos.horarioAsistencia,
      satisfaccion: datos.satisfaccion,
      comentario: datos.comentarioLimpio,
      fecha: obtenerFechaColombia()
    };

    // Insertar en Supabase
    await supabaseInsert('pvu', datosEnvio);
    
    // Éxito - resetear intentos
    intentosRestantes = 3;
    
    // Mostrar mensaje de éxito
    mostrarModalExito();
    
    // Limpiar formulario y regresar a pantalla principal después de 2 segundos
    setTimeout(() => {
      document.getElementById('formPVU').reset();
      document.getElementById('correoCompleto').value = '';
      document.getElementById('otroDominioContainer').classList.add('hidden');
      document.getElementById('errorDocumento').style.display = 'none';
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar Formulario';
      // Regresar a la pantalla de bienvenida
      regresarABienvenida();
    }, 2000);

    return true; // Éxito
  } catch (error) {
    console.error(`Error en intento ${intento}:`, error);
    
    // Si quedan intentos, reintentar después de un delay
    if (intento < 3) {
      intentosRestantes = 3 - intento;
      const delay = intento * 1000; // Delay progresivo: 1s, 2s
      
      btnEnviar.textContent = `Reintentando... (${intentosRestantes} intentos restantes)`;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return await intentarEnviarConReintentos(datos, intento + 1);
    } else {
      // Se agotaron los intentos
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
  
  // Obtener referencias a los campos
  const documentoInput = document.getElementById('documento');
  const nombresInput = document.getElementById('nombres');
  const apellidosInput = document.getElementById('apellidos');
  const correoInput = document.getElementById('correo');
  const comentarioTextarea = document.getElementById('comentario');
  const satisfaccion = document.querySelector('input[name="satisfaccion"]:checked')?.value;

  // Limpiar espacios en todos los campos antes de validar
  limpiarEspacios(documentoInput);
  limpiarEspacios(nombresInput);
  limpiarEspacios(apellidosInput);
  limpiarEspacios(correoInput);
  limpiarEspacios(comentarioTextarea);
  
  // Validar documento
  validarDocumento(documentoInput);
  if (!documentoInput.validity.valid) {
    documentoInput.reportValidity();
    scrollToError(documentoInput);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    return;
  }
  
  // Validar confirmación de documento
  if (!validarConfirmacionDocumento()) {
    const documentoConfirmarInput = document.getElementById('documentoConfirmar');
    documentoConfirmarInput.reportValidity();
    scrollToError(documentoConfirmarInput);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    return;
  }
  
  // Validar satisfacción
  if (!satisfaccion) {
    const ratingContainer = document.getElementById('ratingContainer');
    ratingContainer.setAttribute('data-invalid', 'true');
    mostrarMensaje('Por favor seleccione un nivel de satisfacción', 'error');
    // Hacer scroll al contenedor de rating
    setTimeout(() => {
      scrollToError(ratingContainer);
    }, 100);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    return;
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

  // Validar correo
  if (!datos.correoFinal || !datos.correoFinal.includes('@')) {
    mostrarMensaje('Por favor complete el correo electrónico correctamente. Escriba su correo y seleccione un dominio.', 'error');
    // Hacer scroll al campo de correo
    setTimeout(() => {
      scrollToError(correoInput);
    }, 100);
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Formulario';
    return;
  }

  // Deshabilitar botón mientras se envía
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';
  intentosRestantes = 3;

  try {
    // Intentar enviar con sistema de reintentos
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

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
  const mensajeFormulario = document.getElementById('mensajeFormulario');
  mensajeFormulario.textContent = mensaje;
  mensajeFormulario.className = `mensaje ${tipo}`;
  mensajeFormulario.style.display = 'block';

  // Hacer scroll al mensaje de error
  if (tipo === 'error') {
    setTimeout(() => {
      mensajeFormulario.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  }

  // Ocultar mensaje después de 5 segundos
  setTimeout(() => {
    mensajeFormulario.style.display = 'none';
  }, 5000);
}

// Función para mostrar modal de éxito
function mostrarModalExito() {
  const modal = document.getElementById('modalExito');
  modal.classList.remove('hidden');

  // Redirigir o recargar después de 3 segundos
  setTimeout(() => {
    modal.classList.add('hidden');
    // Opcional: recargar la página o redirigir
    // window.location.reload();
  }, 3000);
}

// Función para mostrar el formulario (ocultar bienvenida)
function mostrarFormulario() {
  const pantallaBienvenida = document.getElementById('pantallaBienvenida');
  const contenidoFormulario = document.getElementById('contenidoFormulario');
  
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

// Función para regresar a la pantalla de bienvenida
function regresarABienvenida() {
  const pantallaBienvenida = document.getElementById('pantallaBienvenida');
  const contenidoFormulario = document.getElementById('contenidoFormulario');
  
  // Ocultar formulario con animación
  contenidoFormulario.style.opacity = '0';
  contenidoFormulario.style.transition = 'opacity 0.5s ease';
  
  setTimeout(() => {
    contenidoFormulario.classList.add('hidden');
    pantallaBienvenida.style.display = 'flex';
    pantallaBienvenida.style.opacity = '0';
    pantallaBienvenida.style.transition = 'opacity 0.5s ease';
    
    // Mostrar pantalla de bienvenida con animación
    setTimeout(() => {
      pantallaBienvenida.style.opacity = '1';
      // Scroll suave al inicio
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
console.log('Formulario PVU iniciado');

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
