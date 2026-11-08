// ============================================================================
// Admin/Panel/js/login.js
// Controlador de interfaz de inicio y cierre de sesión del Panel Principal.
// Delega toda la lógica de autenticación, verificación de rol y revocación
// multi-pestaña en window.AdminAuth (../compartido/admin-auth.js).
// ============================================================================

function verificarCapsLock(event) {
  const aviso = document.getElementById('avisoCapsLock');
  if (!aviso) return;
  if (typeof event.getModifierState !== 'function') return;
  aviso.style.display = event.getModifierState('CapsLock') ? 'block' : 'none';
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
    const resultado = await AdminAuth.iniciarSesion(email, password);

    if (!resultado.ok) {
      mostrarMensaje('mensajeAdminLogin', resultado.mensaje || 'Acceso denegado.', 'error');
      return;
    }

    ocultarCargando('mensajeAdminLogin');
    const campoPass = document.getElementById('adminContrasena');
    if (campoPass) campoPass.value = '';
    mostrarPantalla('pantallaAdmin');
  } catch (error) {
    mostrarMensaje('mensajeAdminLogin', 'Error de conexión: ' + error.message, 'error');
    console.error('Error en login:', error);
  }
}

async function cerrarSesionAdmin() {
  await AdminAuth.cerrarSesion();
}

async function verificarSesionAdmin() {
  const motivoRedireccion = AdminAuth.consumirMotivoRedireccionLogin();

  try {
    const verificacion = await AdminAuth.verificarSesionActiva({ forzarServidor: true });

    if (verificacion.autorizado) {
      mostrarPantalla('pantallaAdmin');
      return;
    }

    mostrarPantalla('pantallaAdminLogin');
    if (motivoRedireccion) {
      mostrarMensaje('mensajeAdminLogin', motivoRedireccion, 'error');
    }
  } catch (error) {
    console.error('Error verificando sesión:', error);
    mostrarPantalla('pantallaAdminLogin');
    if (motivoRedireccion) {
      mostrarMensaje('mensajeAdminLogin', motivoRedireccion, 'error');
    }
  }
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

(function initVisibilidadPanelAdmin() {
  document.addEventListener('visibilitychange', function () {
    if (typeof tiempoSalida !== 'undefined') {
      tiempoSalida = null;
    }
  }, true);
})();
