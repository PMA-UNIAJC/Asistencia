'use strict';

/* ---------------------------------------------------------------------
   Esta pantalla es TOTALMENTE independiente de la lógica del juego
   principal. Solo lee "sesion_activa" y escribe un voto. No conoce
   dinero, comodines ni niveles.
   ------------------------------------------------------------------ */

const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_ANON_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;
const SCHEMA = 'millonario';

let supabaseClient = null;
try {
  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('No se pudo inicializar Supabase:', err);
}

/* ---------------------------------------------------------------------
   1. IDENTIFICADOR DE DISPOSITIVO (sin login)
   ------------------------------------------------------------------ */
const CLAVE_UUID = 'millonario_publico_dispositivo_uuid';

function obtenerDispositivoUuid() {
  let id = localStorage.getItem(CLAVE_UUID);
  if (!id) {
    id = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'dev-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    localStorage.setItem(CLAVE_UUID, id);
  }
  return id;
}

const dispositivoUuid = obtenerDispositivoUuid();

/* Recuerda, por partida+pregunta, si este dispositivo ya votó.
   Así, si la persona recarga la página mientras la pregunta sigue
   abierta, no se le vuelve a mostrar la opción de votar. */
function claveVoto(partidaId, numeroPregunta) {
  return `millonario_voto_${partidaId}_${numeroPregunta}`;
}
function yaVotoLocalmente(partidaId, numeroPregunta) {
  return localStorage.getItem(claveVoto(partidaId, numeroPregunta)) === '1';
}
function marcarVotoLocal(partidaId, numeroPregunta) {
  localStorage.setItem(claveVoto(partidaId, numeroPregunta), '1');
}

/* ---------------------------------------------------------------------
   2. REFERENCIAS AL DOM
   ------------------------------------------------------------------ */
const el = {
  cargando: document.getElementById('publico-cargando'),
  error: document.getElementById('publico-error'),
  errorTexto: document.getElementById('publico-error-texto'),
  btnReintentar: document.getElementById('btn-publico-reintentar'),
  esperandoPartida: document.getElementById('publico-esperando-partida'),
  pregunta: document.getElementById('publico-pregunta'),
  preguntaTexto: document.getElementById('publico-pregunta-texto'),
  opciones: document.getElementById('publico-opciones'),
  opcionA: document.getElementById('publico-opcion-a'),
  opcionB: document.getElementById('publico-opcion-b'),
  opcionC: document.getElementById('publico-opcion-c'),
  opcionD: document.getElementById('publico-opcion-d'),
  esperandoSiguiente: document.getElementById('publico-esperando-siguiente'),
  esperandoSiguienteTexto: document.getElementById('publico-esperando-siguiente-texto'),
};

const TODAS_LAS_SECCIONES = [
  el.cargando, el.error, el.esperandoPartida, el.pregunta, el.esperandoSiguiente,
];

function mostrarSeccion(seccion) {
  TODAS_LAS_SECCIONES.forEach((s) => s.classList.add('hidden'));
  seccion.classList.remove('hidden');
}

/* ---------------------------------------------------------------------
   3. RENDER SEGÚN EL ESTADO DE LA SESIÓN
   ------------------------------------------------------------------ */
let votando = false; // evita doble clic mientras se envía el voto

function renderizarSesion(sesion) {
  if (!sesion || !sesion.partida_id || sesion.estado === 'ESPERANDO') {
    mostrarSeccion(el.esperandoPartida);
    return;
  }

  if (sesion.estado === 'ABIERTA') {
    if (yaVotoLocalmente(sesion.partida_id, sesion.numero_pregunta)) {
      el.esperandoSiguienteTexto.textContent = 'Respuesta enviada. Esperando la siguiente pregunta.';
      mostrarSeccion(el.esperandoSiguiente);
      return;
    }
    votando = false;
    el.preguntaTexto.textContent = sesion.pregunta_texto || '';
    el.opcionA.textContent = sesion.opcion_a || '';
    el.opcionB.textContent = sesion.opcion_b || '';
    el.opcionC.textContent = sesion.opcion_c || '';
    el.opcionD.textContent = sesion.opcion_d || '';
    el.opciones.querySelectorAll('.publico-opcion').forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove('esta-seleccionada');
    });
    mostrarSeccion(el.pregunta);
    return;
  }

  // sesion.estado === 'CERRADA'
  el.esperandoSiguienteTexto.textContent = 'Pregunta cerrada. Esperando la siguiente pregunta.';
  mostrarSeccion(el.esperandoSiguiente);
}

/* ---------------------------------------------------------------------
   4. VOTAR
   ------------------------------------------------------------------ */
async function votar(opcion, sesion, botonPulsado) {
  if (votando) return;
  votando = true;

  el.opciones.querySelectorAll('.publico-opcion').forEach((btn) => (btn.disabled = true));
  botonPulsado.classList.add('esta-seleccionada');

  try {
    const { data: yaSeRegistro, error } = await supabaseClient
      .schema(SCHEMA)
      .rpc('registrar_voto', {
        p_partida_id: sesion.partida_id,
        p_numero_pregunta: sesion.numero_pregunta,
        p_dispositivo_uuid: dispositivoUuid,
        p_opcion: opcion,
      });

    if (error) throw error;

    // Se marca localmente tanto si el voto se guardó ahora como si ya
    // existía de antes (yaSeRegistro === false): en ambos casos este
    // dispositivo no debe poder volver a votar esta pregunta.
    marcarVotoLocal(sesion.partida_id, sesion.numero_pregunta);
    el.esperandoSiguienteTexto.textContent = 'Respuesta enviada. Esperando la siguiente pregunta.';
    mostrarSeccion(el.esperandoSiguiente);
  } catch (err) {
    console.error('No se pudo registrar el voto:', err);
    // Se reactivan los botones para que la persona pueda reintentar.
    el.opciones.querySelectorAll('.publico-opcion').forEach((btn) => (btn.disabled = false));
    botonPulsado.classList.remove('esta-seleccionada');
    votando = false;
  }
}

/* ---------------------------------------------------------------------
   5. CARGA INICIAL + SUSCRIPCIÓN REALTIME
   ------------------------------------------------------------------ */
let sesionActual = null;

async function cargarEstadoInicial() {
  mostrarSeccion(el.cargando);

  if (!supabaseClient) {
    el.errorTexto.textContent = 'No se pudo inicializar la conexión. Revisa publico.js.';
    mostrarSeccion(el.error);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .schema(SCHEMA)
      .from('sesion_activa')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    sesionActual = data;
    renderizarSesion(sesionActual);
    suscribirseARealtime();
  } catch (err) {
    console.error(err);
    el.errorTexto.textContent = 'No se pudo conectar. Detalle: ' + (err?.message || 'error desconocido');
    mostrarSeccion(el.error);
  }
}

function suscribirseARealtime() {
  supabaseClient
    .channel('publico-sesion-activa')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: SCHEMA, table: 'sesion_activa' },
      (payload) => {
        sesionActual = payload.new;
        renderizarSesion(sesionActual);
      }
    )
    .subscribe();
}

/* ---------------------------------------------------------------------
   6. EVENTOS
   ------------------------------------------------------------------ */
el.opciones.addEventListener('click', (evento) => {
  const boton = evento.target.closest('.publico-opcion');
  if (!boton || boton.disabled || !sesionActual) return;
  votar(boton.dataset.opcion, sesionActual, boton);
});

el.btnReintentar.addEventListener('click', cargarEstadoInicial);

/* ---------------------------------------------------------------------
   INICIALIZACIÓN
   ------------------------------------------------------------------ */
cargarEstadoInicial();
