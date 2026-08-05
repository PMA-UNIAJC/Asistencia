'use strict';

const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_ANON_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;


const NOMBRE_TABLA = 'preguntas';

// El cliente se crea solo si las credenciales fueron reemplazadas,
// para evitar errores confusos en consola si alguien abre el archivo
// sin haberlas configurado todavía.
let supabaseClient = null;
try {
  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('No se pudo inicializar el cliente de Supabase:', err);
}

/* ---------------------------------------------------------------------
   2. REFERENCIAS AL DOM
   ------------------------------------------------------------------ */
const el = {
  // Pantallas
  screens: {
    loading: document.getElementById('screen-loading'),
    countdown: document.getElementById('screen-countdown'),
    home: document.getElementById('screen-home'),
    game: document.getElementById('screen-game'),
    end: document.getElementById('screen-end'),
    mensaje: document.getElementById('screen-mensaje'),
  },

  // Home
  formConfig: document.getElementById('form-config'),
  inputCantidad: document.getElementById('input-cantidad'),
  inputTiempo: document.getElementById('input-tiempo'),
  inputSonido: document.getElementById('input-sonido'),
  btnCantidadMenos: document.getElementById('btn-cantidad-menos'),
  btnCantidadMas: document.getElementById('btn-cantidad-mas'),
  btnTiempoMenos: document.getElementById('btn-tiempo-menos'),
  btnTiempoMas: document.getElementById('btn-tiempo-mas'),
  homeMensaje: document.getElementById('home-mensaje'),
  sessionInfo: document.getElementById('session-info'),

  // Carga
  loadingText: document.getElementById('loading-text'),
    // Cuenta regresiva
  countdownNumero: document.getElementById('countdown-numero'),

  // Juego
  gameActual: document.getElementById('game-actual'),
  gameTotal: document.getElementById('game-total'),
  gameDificultad: document.getElementById('game-dificultad'),
  timer: document.getElementById('timer'),
  timerValor: document.getElementById('timer-valor'),
  timerRingFg: document.getElementById('timer-ring-fg'),
  ladder: document.getElementById('ladder'),
  btn5050: document.getElementById('btn-5050'),
  btn5050Texto: document.getElementById('btn-5050-texto'),
  btnTiempoExtra: document.getElementById('btn-tiempo-extra'),
  btnTiempoExtraTexto: document.getElementById('btn-tiempo-extra-texto'),

  // AGREGADO — Comodín "Doble Respuesta"
  btnDobleRespuesta: document.getElementById('btn-doble-respuesta'),
  btnDobleRespuestaTexto: document.getElementById('btn-doble-respuesta-texto'),
  dobleRespuestaAviso: document.getElementById('doble-respuesta-aviso'),

  // AGREGADO — Comodín/botón "Público"
  btnPublico: document.getElementById('btn-publico'),
  btnPublicoTexto: document.getElementById('btn-publico-texto'),
  modalPublico: document.getElementById('modal-publico'),
  btnCerrarPublico: document.getElementById('btn-cerrar-publico'),
  modalPublicoTimer: document.getElementById('modal-publico-timer'),
  modalPublicoTimerValor: document.getElementById('modal-publico-timer-valor'),

  contadorPartidas: document.getElementById('contador-partidas'),
  contadorAreaM: document.getElementById('contador-m'),
  contadorAreaC: document.getElementById('contador-c'),
  btnTerminarPartida: document.getElementById('btn-terminar-partida'),
  questionTexto: document.getElementById('question-texto'),
  options: document.getElementById('options'),
  btnSiguiente: document.getElementById('btn-siguiente'),

  // Modal de confirmación para terminar la partida
  modalTerminar: document.getElementById('modal-terminar'),
  btnReanudar: document.getElementById('btn-reanudar'),
  btnTerminarConfirmar: document.getElementById('btn-terminar-confirmar'),

  // Fin
  endEyebrow: document.getElementById('end-eyebrow'),
  endAciertos: document.getElementById('end-aciertos'),
  endTotal: document.getElementById('end-total'),
  endPorcentaje: document.getElementById('end-porcentaje'),
  endMensaje: document.getElementById('end-mensaje'),
  btnNuevaPartida: document.getElementById('btn-nueva-partida'),
  btnCambiarConfig: document.getElementById('btn-cambiar-config'),

  // Mensaje genérico
  mensajeIcono: document.getElementById('mensaje-icono'),
  mensajeTitulo: document.getElementById('mensaje-titulo'),
  mensajeTexto: document.getElementById('mensaje-texto'),
  mensajeAcciones: document.getElementById('mensaje-acciones'),

  // AGREGADO — Botón fijo de pantalla completa
  btnFullscreen: document.getElementById('btn-fullscreen'),
  btnFullscreenIcono: document.getElementById('btn-fullscreen-icono'),

  // MODIFICADO — Antes "Preguntas" (enlace al panel de administración),
  // ahora "Instrucciones" (abre una imagen dentro del modal genérico).
  btnInstrucciones: document.getElementById('btn-instrucciones'),

  // AGREGADO — Botón "Público · Código QR" en la pantalla de inicio.
  btnQrPublico: document.getElementById('btn-qr-publico'),

  // AGREGADO — Modal de imagen genérico (Instrucciones / Código QR).
  modalImagen: document.getElementById('modal-imagen'),
  modalImagenImg: document.getElementById('modal-imagen-img'),

  // AGREGADO — Botón "Limpiar BD" (mantenimiento, pantalla de inicio) y su modal de confirmación.
  btnLimpiarBd: document.getElementById('btn-limpiar-bd'),
  modalLimpiarBd: document.getElementById('modal-limpiar-bd'),
  btnLimpiarBdConfirmar: document.getElementById('btn-limpiar-bd-confirmar'),
  btnLimpiarBdCancelar: document.getElementById('btn-limpiar-bd-cancelar'),
  limpiarBdMensaje: document.getElementById('limpiar-bd-mensaje'),
};

// Longitud del contorno del círculo del temporizador (2 * PI * r), r=28.
const TIMER_RING_LENGTH = 2 * Math.PI * 28;
el.timerRingFg.style.strokeDasharray = String(TIMER_RING_LENGTH);

/* ---------------------------------------------------------------------
   3. ESTADO DE LA APLICACIÓN
   ------------------------------------------------------------------ */

// IDs de preguntas ya jugadas durante esta sesión del navegador.
// Vive únicamente en memoria (variable de JS): se reinicia solo si
// el usuario recarga la página, tal como pide la especificación.
const preguntasUsadasEnSesion = new Set();

// Todas las preguntas activas traídas de Supabase se cachean aquí
// para no volver a golpear la base de datos en cada "Nueva partida".
let bancoDePreguntas = null;

// Estado de la partida en curso.
let partida = null;
/* partida = {
     preguntas: [...],       // preguntas seleccionadas para esta ronda
     indiceActual: 0,
     aciertos: 0,
     config: { cantidad, tiempo, sonido },
     respondida: false,      // ¿ya se respondió la pregunta actual?
     terminada: false,       // ¿la partida ya terminó? (fallo o tiempo)
     motivoFin: null,        // 'completado' | 'incorrecta' | 'tiempo'
     comodinUsado: false,    // ¿ya se usó el 50/50 en esta partida?
     comodinTiempoUsado: false, // ¿ya se usó el "+30 segundos" en esta partida?
     comodinPublicoUsado: false, // ¿ya se usó el comodín "Público" en esta partida?
     comodinDobleUsado: false, // ¿ya se usó el comodín "Doble Respuesta" en esta partida?
     dobleRespuestaActivaPreguntaActual: false, // ¿está activo en la pregunta que se está jugando ahora mismo?
     dobleRespuestaPrimerIntentoUsado: false,   // ¿ya se falló el primer intento (queda el segundo)?
   } */

// Número de partida actual en esta sesión del navegador.
// Empieza en 0 al cargar la página y sube en CADA "Iniciar partida" o
// "Nueva partida" sin excepciones: la primera pulsación de "Iniciar
// partida" lo lleva de 0 a 1, mostrando "Partida #1" para la primera
// partida jugada.
let numeroPartida = 0;


// Contadores de preguntas mostradas por área durante la partida en
// curso. Se reinician a 0 en cada nueva partida.
let contadorAreaM = 0;
let contadorAreaC = 0;


// Referencia al intervalo del temporizador, para poder cancelarlo.
let timerIntervalId = null;

// Tiempo restante/total de la pregunta actual, guardados aparte del
// intervalo para poder PAUSAR y REANUDAR sin perder el segundo exacto
// (por ejemplo, mientras se confirma "Terminar partida").
let segundosRestantesActuales = 0;
let segundosTotalesActuales = 0;

/* ---------------------------------------------------------------------
   4. UTILIDADES GENERALES
   ------------------------------------------------------------------ */

/** Mezcla un arreglo in-place usando el algoritmo Fisher-Yates. */
function mezclarArreglo(arreglo) {
  for (let i = arreglo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arreglo[i], arreglo[j]] = [arreglo[j], arreglo[i]];
  }
  return arreglo;
}

/** Limita un número entre un mínimo y un máximo. */
function limitar(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

/** Muestra una única pantalla (sección) y oculta el resto. */
function mostrarPantalla(nombre) {
  Object.entries(el.screens).forEach(([clave, seccion]) => {
    seccion.classList.toggle('hidden', clave !== nombre);
  });
}

/* ---------------------------------------------------------------------
   5. SONIDO (Web Audio API — sin archivos ni librerías externas)
   ------------------------------------------------------------------ */
let audioCtx = null;

function obtenerAudioCtx() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

/** Reproduce un tono simple. Se usa para dar retroalimentación auditiva. */
function reproducirTono({ frecuencia, duracion, tipo = 'sine', volumen = 0.15 }) {
  const sonidoActivado = el.inputSonido.checked;
  if (!sonidoActivado) return;

  try {
    const ctx = obtenerAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = tipo;
    osc.frequency.value = frecuencia;
    gain.gain.value = volumen;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion);
    osc.stop(ctx.currentTime + duracion);
  } catch (err) {
    // Si el navegador bloquea audio (autoplay policy), simplemente lo ignoramos.
    console.warn('No se pudo reproducir el sonido:', err);
  }
}

const sonidos = {
  correcta: () => reproducirTono({ frecuencia: 880, duracion: 0.25, tipo: 'sine' }),
  incorrecta: () => reproducirTono({ frecuencia: 160, duracion: 0.4, tipo: 'sawtooth' }),
  tiempo: () => reproducirTono({ frecuencia: 220, duracion: 0.5, tipo: 'square' }),
  // Tic-tac de tensión mientras el tiempo se está agotando (últimos segundos).
  tictac: () => reproducirTono({ frecuencia: 700, duracion: 0.12, tipo: 'square', volumen: 0.12 }),
  // Sonido de victoria: partida completada al 100%.
  victoria: () => reproducirTono({ frecuencia: 1046, duracion: 0.5, tipo: 'triangle' }),
  // Sonido de pérdida: partida terminada por fallo o por tiempo agotado.
  perdida: () => reproducirTono({ frecuencia: 130, duracion: 0.6, tipo: 'sawtooth', volumen: 0.18 }),
  // Sonido de cada segundo de la cuenta regresiva previa a la partida.
  cuentaAtras: () => reproducirTono({ frecuencia: 660, duracion: 0.18, tipo: 'sine', volumen: 0.16 }),
};

/* ---------------------------------------------------------------------
   6. ACCESO A DATOS (Supabase)
   ------------------------------------------------------------------ */

/**
 * Trae todas las preguntas activas desde Supabase.
 * Se cachean en memoria para no repetir la consulta en cada partida.
 */
async function obtenerPreguntasActivas() {
  if (bancoDePreguntas) return bancoDePreguntas;

  if (!supabaseClient) {
    throw new Error('Cliente de Supabase no configurado. Revisa SUPABASE_URL y SUPABASE_ANON_KEY en script.js.');
  }

  const { data, error } = await supabaseClient
  .schema("millonario")
  .from(NOMBRE_TABLA)
  .select('id, pregunta, respuesta_correcta, respuesta_incorrecta_1, respuesta_incorrecta_2, respuesta_incorrecta_3, dificultad, area')
  .eq('activa', true);

  if (error) throw error;

  bancoDePreguntas = data || [];
  return bancoDePreguntas;
}

/* ---------------------------------------------------------------------
   7. SELECCIÓN ALEATORIA DE PREGUNTAS POR DIFICULTAD
   ------------------------------------------------------------------ */

/**
 * Calcula cuántas preguntas de cada dificultad se necesitan para
 * completar "cantidad" preguntas en total, siguiendo el patrón
 * FACIL -> MEDIA -> DIFICIL (el excedente se reparte empezando
 * por la dificultad más alta, igual que en el ejemplo del enunciado:
 * 7 preguntas = 2 FACIL, 2 MEDIA, 3 DIFICIL).
 */
function calcularDistribucionPorDificultad(cantidad) {
  const base = Math.floor(cantidad / 3);
  const resto = cantidad - base * 3;

  const distribucion = { FACIL: base, MEDIA: base, DIFICIL: base };
  const ordenReparto = ['DIFICIL', 'MEDIA', 'FACIL'];

  for (let i = 0; i < resto; i++) {
    distribucion[ordenReparto[i % 3]] += 1;
  }

  return distribucion;
}

/**
 * Selecciona las preguntas para una nueva partida:
 * - Excluye las ya usadas en esta sesión.
 * - Respeta la proporción por dificultad.
 * - Si falta alguna dificultad, rellena con preguntas de otra
 *   dificultad para que el juego NUNCA falle.
 * - Ordena el resultado de más fácil a más difícil.
 *
 * Devuelve un arreglo que puede tener MENOS preguntas que las
 * solicitadas si no hay suficientes disponibles (nunca produce error).
 */
/**
 * Calcula cuántas preguntas de Matemáticas (M) y Comunicación (C) se
 * necesitan para repartir "cantidad" preguntas lo más equilibrado
 * posible entre ambas áreas. Si "cantidad" es impar, la pregunta
 * sobrante se asigna al azar a una de las dos áreas, así que la
 * diferencia entre M y C nunca es mayor a 1 y puede variar entre partidas.
 */
function calcularDistribucionPorArea(cantidad) {
  const base = Math.floor(cantidad / 2);
  const resto = cantidad - base * 2;

  const distribucion = { M: base, C: base };
  if (resto === 1) {
    const areaConExtra = Math.random() < 0.5 ? 'M' : 'C';
    distribucion[areaConExtra] += 1;
  }
  return distribucion;
}


/**
 * AGREGADO — Reparte el balance M/C priorizando a FACIL y MEDIA: cada
 * una recibe primero SU PROPIO split ideal de área (lo más parejo
 * posible para su propio tamaño, con el mismo criterio y sorteo de
 * calcularDistribucionPorArea). DIFICIL recibe lo que haga falta para
 * completar el total global: puede quedar menos pareja, pero nunca a
 * costa de FACIL o MEDIA.
 */
function calcularDistribucionAreaPorNivel(distribucionDificultad, distribucionAreaTotal) {
  const porNivel = {};
  let tomadasM = 0;
  let tomadasC = 0;

  ['FACIL', 'MEDIA'].forEach((nivel) => {
    const splitNivel = calcularDistribucionPorArea(distribucionDificultad[nivel]);
    porNivel[nivel] = splitNivel;
    tomadasM += splitNivel.M;
    tomadasC += splitNivel.C;
  });

  porNivel.DIFICIL = {
    M: Math.max(0, distribucionAreaTotal.M - tomadasM),
    C: Math.max(0, distribucionAreaTotal.C - tomadasC),
  };

  return porNivel;
}


/**
 * Selecciona las preguntas para una nueva partida combinando DOS
 * distribuciones a la vez:
 * - Por dificultad (FACIL/MEDIA/DIFICIL), como ya existía.
 * - Por área (M/C), lo más equilibrada posible.
 *
 * Excluye las ya usadas en esta sesión y, si falta alguna combinación
 * de dificultad/área, rellena automáticamente con otra para que el
 * juego NUNCA falle.
 *
 * Devuelve un arreglo que puede tener MENOS preguntas que las
 * solicitadas si no hay suficientes disponibles (nunca produce error).
 */
function seleccionarPreguntasParaPartida(todasLasPreguntas, cantidadSolicitada) {
  const disponibles = todasLasPreguntas.filter((p) => !preguntasUsadasEnSesion.has(p.id));

  // Agrupamos por dificultad y, dentro de cada dificultad, por área.
  const pools = {
    FACIL: { M: [], C: [] },
    MEDIA: { M: [], C: [] },
    DIFICIL: { M: [], C: [] },
  };
  disponibles.forEach((p) => {
    if (pools[p.dificultad] && pools[p.dificultad][p.area]) {
      pools[p.dificultad][p.area].push(p);
    }
  });
  Object.values(pools).forEach((porArea) => Object.values(porArea).forEach(mezclarArreglo));

  const distribucionDificultad = calcularDistribucionPorDificultad(cantidadSolicitada);
  const distribucionArea = calcularDistribucionPorArea(cantidadSolicitada);
  // AGREGADO — FACIL y MEDIA quedan priorizadas: cada una recibe su
  // propio split ideal de área primero; DIFICIL recibe el resto.
  const distribucionAreaPorNivel = calcularDistribucionAreaPorNivel(distribucionDificultad, distribucionArea);

  let tomadasM = 0;
  let tomadasC = 0;
  const seleccionadas = [];
  let faltantes = 0;

  ['FACIL', 'MEDIA', 'DIFICIL'].forEach((nivel) => {
    const necesariasPorArea = distribucionAreaPorNivel[nivel];

    ['M', 'C'].forEach((area) => {
      const areaAlterna = area === 'M' ? 'C' : 'M';

      for (let i = 0; i < necesariasPorArea[area]; i++) {
        // Si no hay preguntas de esa área en esta dificultad, tomamos
        // de la otra área (así se mantiene el tamaño por dificultad).
        const pregunta = pools[nivel][area].pop() || pools[nivel][areaAlterna].pop();

        if (pregunta) {
          seleccionadas.push(pregunta);
          if (pregunta.area === 'M') tomadasM += 1;
          else tomadasC += 1;
        } else {
          faltantes += 1;
        }
      }
    });
  });

  // Relleno automático: si faltó alguna combinación dificultad+área,
  // completamos con lo que sobre, pero respetando la preferencia de
  // área (para que la diferencia M/C nunca supere 1, salvo que una de
  // las dos áreas ya no tenga más preguntas disponibles).
  if (faltantes > 0) {
    const restanteM = mezclarArreglo([...pools.FACIL.M, ...pools.MEDIA.M, ...pools.DIFICIL.M]);
    const restanteC = mezclarArreglo([...pools.FACIL.C, ...pools.MEDIA.C, ...pools.DIFICIL.C]);

    for (let i = 0; i < faltantes; i++) {
      const faltanM = distribucionArea.M - tomadasM;
      const faltanC = distribucionArea.C - tomadasC;
      const areaPreferida = faltanM >= faltanC ? 'M' : 'C';
      const areaAlterna = areaPreferida === 'M' ? 'C' : 'M';
      const poolPreferido = areaPreferida === 'M' ? restanteM : restanteC;
      const poolAlterno = areaAlterna === 'M' ? restanteM : restanteC;

      const pregunta = poolPreferido.pop() || poolAlterno.pop();
      if (!pregunta) break;

      seleccionadas.push(pregunta);
      if (pregunta.area === 'M') tomadasM += 1;
      else tomadasC += 1;
    }
  }

  // Orden final: fácil -> media -> difícil, como pide el enunciado.
  const pesoDificultad = { FACIL: 0, MEDIA: 1, DIFICIL: 2 };
  seleccionadas.sort((a, b) => pesoDificultad[a.dificultad] - pesoDificultad[b.dificultad]);

  return seleccionadas;
}

/** Construye las 4 opciones mezcladas de una pregunta, marcando cuál es correcta. */
function construirOpciones(pregunta) {
  const opciones = [
    { texto: pregunta.respuesta_correcta, esCorrecta: true },
    { texto: pregunta.respuesta_incorrecta_1, esCorrecta: false },
    { texto: pregunta.respuesta_incorrecta_2, esCorrecta: false },
    { texto: pregunta.respuesta_incorrecta_3, esCorrecta: false },
  ];
  return mezclarArreglo(opciones);
}

/* ---------------------------------------------------------------------
   8. FLUJO DEL JUEGO
   ------------------------------------------------------------------ */

/** Devuelve una promesa que se resuelve después de "ms" milisegundos. */
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Muestra una cuenta regresiva de 3-2-1 (con sonido en cada segundo)
 * antes de que aparezca la primera pregunta de la partida.
 * Se usa en CADA partida (la primera y también en "Nueva partida").
 */
async function mostrarCuentaRegresivaInicio() {
  mostrarPantalla('countdown');

  for (let n = 3; n >= 1; n--) {
    el.countdownNumero.textContent = String(n);

    // Se reinicia la animación quitando y volviendo a poner la clase.
    el.countdownNumero.classList.remove('countdown-card__numero--pulso');
    void el.countdownNumero.offsetWidth; // fuerza el "reflow" para reiniciar la animación
    el.countdownNumero.classList.add('countdown-card__numero--pulso');

    sonidos.cuentaAtras();
    await esperar(1000);
  }
}

async function iniciarPartida(config) {
  mostrarPantalla('loading');
  el.loadingText.textContent = 'Consultando el banco de preguntas…';

  try {
    const todas = await obtenerPreguntasActivas();
    const seleccionadas = seleccionarPreguntasParaPartida(todas, config.cantidad);

    if (seleccionadas.length === 0) {
      mostrarMensajeSinPreguntas();
      return;
    }

    // Se marcan como usadas de inmediato para que no puedan repetirse
    // aunque el jugador abandone la partida a mitad de camino.
    seleccionadas.forEach((p) => preguntasUsadasEnSesion.add(p.id));

    // AGREGADO — Sistema de participación del público: nueva partida.
    // Si esto falla (p. ej. sin internet para esa parte), el juego
    // principal sigue funcionando igual; solo no habrá votación del público.
    try {
      await PanelPublico.nuevaPartida();
    } catch (errPublico) {
      console.warn('Público: no se pudo crear la partida (el juego continúa igual).', errPublico);
    }

    partida = {
      preguntas: seleccionadas.map((p) => ({ ...p, opciones: construirOpciones(p) })),
      indiceActual: 0,
      aciertos: 0,
      config,
      respondida: false,
      terminada: false,
      motivoFin: null,
      comodinUsado: false, // Cada partida nueva habilita un único uso del 50/50.
      comodinTiempoUsado: false, // Cada partida nueva habilita un único uso de "+30 segundos".
      comodinPublicoUsado: false, // Cada partida nueva habilita un único uso del comodín "Público".
      // AGREGADO — Cada partida nueva habilita un único uso del comodín "Doble Respuesta".
      comodinDobleUsado: false,
      dobleRespuestaActivaPreguntaActual: false,
      dobleRespuestaPrimerIntentoUsado: false,
    };

    contadorAreaM = 0;
    contadorAreaC = 0;
    actualizarContadorCategorias();

    renderizarEscalera();


    await mostrarCuentaRegresivaInicio();
    renderizarPreguntaActual();
    mostrarPantalla('game');
  } catch (err) {
    console.error(err);
    mostrarMensajeError(err);
  }
}

/** Dibuja la escalera lateral de progreso (elemento distintivo del diseño). */
function renderizarEscalera() {
  el.ladder.innerHTML = '';
  partida.preguntas.forEach((pregunta, indice) => {
    const paso = document.createElement('div');
    paso.className = 'ladder__paso';
    paso.dataset.nivel = pregunta.dificultad;
    paso.dataset.indice = String(indice);
    paso.textContent = String(indice + 1);
    el.ladder.appendChild(paso);
  });
}

/** Actualiza los estados visuales (actual / completado) de la escalera. */
function actualizarEscalera() {
  const pasos = el.ladder.querySelectorAll('.ladder__paso');
  pasos.forEach((paso) => {
    const indice = Number(paso.dataset.indice);
    if (indice < partida.indiceActual) {
      paso.dataset.estado = 'completado';
    } else if (indice === partida.indiceActual) {
      paso.dataset.estado = 'actual';
    } else {
      paso.dataset.estado = '';
    }
  });
}

// Solo cambia el TEXTO mostrado al usuario ("Conocimiento Básico/Intermedio/
// Avanzado"); la lógica interna sigue usando las claves originales
// FACIL / MEDIA / DIFICIL sin ningún cambio.
const ETIQUETAS_DIFICULTAD = { FACIL: 'Básico', MEDIA: 'Intermedio', DIFICIL: 'Avanzado' };
const LETRAS = ['A', 'B', 'C', 'D'];

/**
 * Calcula el tiempo total (en segundos) para la pregunta actual, sumando
 * segundos extra según su dificultad: MEDIA +10s, DIFICIL +20s.
 */
function calcularTiempoSegunDificultad(tiempoBase, dificultad) {
  if (dificultad === 'MEDIA') return tiempoBase + 10;
  if (dificultad === 'DIFICIL') return tiempoBase + 20;
  return tiempoBase;
}

function renderizarPreguntaActual() {
  // AGREGADO — Comodín "Público": si el modal quedó abierto de la
  // pregunta anterior, se cierra antes de mostrar la nueva pregunta.
  cerrarModalPublico();

  const pregunta = partida.preguntas[partida.indiceActual];
  partida.respondida = false;

  // AGREGADO — Comodín "Doble Respuesta": el efecto de "segundo intento"
  // solo es válido en la pregunta durante la cual se activó. Cada nueva
  // pregunta arranca sin él activo (aunque el comodín ya se haya
  // consumido para el resto de la partida vía "comodinDobleUsado").
  partida.dobleRespuestaActivaPreguntaActual = false;
  partida.dobleRespuestaPrimerIntentoUsado = false;

  if (pregunta.area === 'M') contadorAreaM += 1;
  else if (pregunta.area === 'C') contadorAreaC += 1;
  actualizarContadorCategorias();

  el.gameActual.textContent = String(partida.indiceActual + 1);
  el.gameTotal.textContent = String(partida.preguntas.length);
  el.gameDificultad.textContent = ETIQUETAS_DIFICULTAD[pregunta.dificultad];
  el.questionTexto.textContent = pregunta.pregunta;

  el.options.innerHTML = '';
  pregunta.opciones.forEach((opcion, indice) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'option';
    boton.dataset.esCorrecta = String(opcion.esCorrecta);
    boton.innerHTML = `<span class="option__letra">${LETRAS[indice]}</span><span>${escaparHTML(opcion.texto)}</span>`;
    boton.addEventListener('click', () => manejarRespuesta(boton, opcion.esCorrecta));
    el.options.appendChild(boton);
  });

  el.btnSiguiente.disabled = true;
  el.btnSiguiente.textContent = 'Siguiente';

  actualizarEscalera();
  actualizarBotonComodin();
  actualizarBotonComodinTiempo();
  actualizarBotonPublico();
  actualizarBotonDobleRespuesta();
  actualizarAvisoDobleRespuesta();
  iniciarTemporizador(calcularTiempoSegunDificultad(partida.config.tiempo, pregunta.dificultad));

  // AGREGADO — Sistema de participación del público: abre esta pregunta
  // para que el público vote. No se espera (no "await") para no retrasar
  // la interfaz del concursante; si falla, solo se pierde la votación
  // del público en esa pregunta, el juego principal no se ve afectado.
  // pregunta.opciones ya está mezclado y es el MISMO orden que se usó
  // arriba para pintar los botones A/B/C/D, así que las letras coinciden.
  PanelPublico.abrirPregunta(
    partida.indiceActual + 1,
    pregunta.pregunta,
    {
      a: pregunta.opciones[0]?.texto,
      b: pregunta.opciones[1]?.texto,
      c: pregunta.opciones[2]?.texto,
      d: pregunta.opciones[3]?.texto,
    }
  ).catch((errPublico) => console.warn('Público: no se pudo abrir la pregunta.', errPublico));
}

/**
 * Comodín 50/50: un único uso POR PARTIDA (no por pregunta).
 * Elimina al azar 2 de las 3 respuestas incorrectas de la pregunta actual.
 */
function usarComodin5050() {
  if (!partida || partida.comodinUsado || partida.respondida) return;

  const botones = Array.from(el.options.querySelectorAll('.option'));
  const incorrectas = botones.filter((boton) => boton.dataset.esCorrecta === 'false');

  mezclarArreglo(incorrectas)
    .slice(0, 2)
    .forEach((boton) => {
      boton.disabled = true;
      boton.dataset.estado = 'eliminada';
    });

  partida.comodinUsado = true;
  actualizarBotonComodin();
}

/** Sincroniza el texto/estado habilitado del botón 50/50 con la partida actual. */
function actualizarBotonComodin() {
  const disponible = Boolean(partida) && !partida.comodinUsado && !partida.respondida;
  el.btn5050.disabled = !disponible;
  const usado = Boolean(partida) && partida.comodinUsado;
  el.btn5050.classList.toggle('btn-comodin--usado', usado);
  el.btn5050Texto.textContent = usado ? 'Comodín usado' : 'Usar comodín';
}

/**
 * Comodín "+30 segundos": un único uso POR PARTIDA (no por pregunta).
 * Suma 30 segundos al tiempo total Y al restante de la pregunta actual,
 * para que el círculo del temporizador se vea consistente con el nuevo total.
 */
function usarComodinTiempoExtra() {
  if (!partida || partida.comodinTiempoUsado || partida.respondida) return;

  segundosTotalesActuales += 30;
  segundosRestantesActuales += 30;
  actualizarVistaTemporizador(segundosRestantesActuales, segundosTotalesActuales);

  partida.comodinTiempoUsado = true;
  actualizarBotonComodinTiempo();
}

/** Sincroniza el texto/estado habilitado del botón "+30 segundos" con la partida actual. */
function actualizarBotonComodinTiempo() {
  const disponible = Boolean(partida) && !partida.comodinTiempoUsado && !partida.respondida;
  el.btnTiempoExtra.disabled = !disponible;
  const usado = Boolean(partida) && partida.comodinTiempoUsado;
  el.btnTiempoExtra.classList.toggle('btn-comodin--usado', usado);
  el.btnTiempoExtraTexto.textContent = usado ? 'Comodín usado' : 'Usar comodín';
}

/**
 * AGREGADO — Comodín "Doble Respuesta": un único uso POR PARTIDA (no por
 * pregunta), igual que 50/50, "+30 segundos" y "Público". Debe activarse
 * ANTES de responder la pregunta actual (misma regla que los demás
 * comodines: una vez respondida la pregunta, ya no se puede activar).
 *
 * Efecto: si está activo y el jugador falla su PRIMER intento en la
 * pregunta donde se activó, esa pregunta NO termina — el fallo solo
 * queda marcado y se habilita un segundo intento entre las respuestas
 * restantes (ver manejarRespuesta). Si el segundo intento también es
 * incorrecto, o se acaba el tiempo antes de usarlo, la pregunta se
 * pierde con el comportamiento normal de fin de partida.
 */
function usarComodinDobleRespuesta() {
  if (!partida || partida.comodinDobleUsado || partida.respondida) return;

  partida.comodinDobleUsado = true;
  partida.dobleRespuestaActivaPreguntaActual = true;
  partida.dobleRespuestaPrimerIntentoUsado = false;

  actualizarBotonDobleRespuesta();
  actualizarAvisoDobleRespuesta();
}

/** Sincroniza el texto/estado habilitado del botón "Doble Respuesta" con la partida actual. */
function actualizarBotonDobleRespuesta() {
  const disponible = Boolean(partida) && !partida.comodinDobleUsado && !partida.respondida;
  el.btnDobleRespuesta.disabled = !disponible;
  const usado = Boolean(partida) && partida.comodinDobleUsado;
  el.btnDobleRespuesta.classList.toggle('btn-comodin--usado', usado);
  el.btnDobleRespuestaTexto.textContent = usado ? 'Comodín usado' : 'Usar comodín';
}

/**
 * Muestra/oculta y actualiza el texto del aviso de "Doble Respuesta"
 * (indica que el comodín está activo en la pregunta actual y, tras el
 * primer intento fallido, que hay un segundo intento disponible).
 */
function actualizarAvisoDobleRespuesta() {
  if (!partida || !partida.dobleRespuestaActivaPreguntaActual) {
    el.dobleRespuestaAviso.classList.add('hidden');
    el.dobleRespuestaAviso.textContent = '';
    return;
  }

  el.dobleRespuestaAviso.classList.remove('hidden');
  el.dobleRespuestaAviso.textContent = partida.dobleRespuestaPrimerIntentoUsado
    ? 'Segundo intento: elige otra respuesta entre las restantes.'
    : 'Doble Respuesta activa: si fallas, tendrás un segundo intento.';
}

/**
 * Botón/comodín "Público".
 *
 * Mientras la pregunta está ACTIVA (aún no se respondió ni se agotó el
 * tiempo), se comporta como un comodín más: un único uso POR PARTIDA
 * (igual que 50/50 y "+30 segundos") que suma 15 segundos al cronómetro,
 * abre el modal del público y muestra el conteo de votos EN VIVO
 * (actualizado cada 3 segundos), sin cerrar la pregunta ni impedir que
 * el público siga votando.
 *
 * Una vez que la pregunta TERMINA (se respondió o se acabó el tiempo),
 * deja de comportarse como comodín: el botón vuelve a abrir el modal
 * libremente, sin restricciones y sin consumir nada, mostrando el
 * resultado final ya pintado por PanelPublico.cerrarPreguntaYMostrar(),
 * exactamente igual que el comportamiento original de "Preguntar al
 * público".
 *
 * La lógica de PanelPublico (recibir votos, actualizarlos y mostrarlos
 * dentro de #panel-publico-stats) no se toca en ningún momento: esta
 * función solo decide CUÁNDO se abre el modal y cuándo se pide el
 * conteo en vivo o el resultado final.
 */
function usarBotonPublico() {
  if (!partida) return;

  const preguntaActiva = !partida.respondida;

  if (preguntaActiva) {
    // Ya se usó el comodín en esta partida: el botón debería estar
    // deshabilitado en la interfaz, pero por seguridad no hacemos nada.
    if (partida.comodinPublicoUsado) return;

    partida.comodinPublicoUsado = true;
    segundosTotalesActuales += 15;
    segundosRestantesActuales += 15;
    actualizarVistaTemporizador(segundosRestantesActuales, segundosTotalesActuales);
    actualizarBotonPublico();

    // AGREGADO — Muestra el conteo de votos EN VIVO (sin cerrar la
    // pregunta ni impedir que el público siga votando), refrescándose
    // cada 3 segundos. Cuando la pregunta termine, cerrarPreguntaYMostrar()
    // detiene este refresco automáticamente y pinta el resultado final.
    PanelPublico.mostrarConteoEnVivo(partida.indiceActual + 1, 3000)
      .catch((errPublico) => console.warn('Público: no se pudo mostrar el conteo en vivo.', errPublico));
  }

  // Termine o no de usarse como comodín, siempre abre el modal para que
  // el jugador vea la información del público (igual que antes).
  abrirModalPublico();
}

/** Sincroniza apariencia/estado del botón "Público" con la partida actual. */
function actualizarBotonPublico() {
  if (!partida) {
    el.btnPublico.disabled = false;
    el.btnPublico.classList.remove('btn-comodin--usado');
    el.btnPublicoTexto.textContent = 'Usar comodín';
    el.modalPublicoTimer.classList.add('hidden');
    return;
  }

  const preguntaActiva = !partida.respondida;

  // AGREGADO — El cronómetro dentro del modal "Público" solo tiene
  // sentido mientras la pregunta sigue activa; al terminar, se oculta.
  el.modalPublicoTimer.classList.toggle('hidden', !preguntaActiva);

  if (preguntaActiva) {
    // Fase de comodín: mismo diseño/estado visual que los demás comodines.
    const usado = partida.comodinPublicoUsado;
    el.btnPublico.disabled = usado;
    el.btnPublico.classList.toggle('btn-comodin--usado', usado);
    el.btnPublicoTexto.textContent = usado ? 'Comodín usado' : 'Usar comodín';
  } else {
    // Pregunta terminada: vuelve a ser un botón de consulta libre, sin
    // restricciones ni consumo de comodín (comportamiento original).
    el.btnPublico.disabled = false;
    el.btnPublico.classList.remove('btn-comodin--usado');
    el.btnPublicoTexto.textContent = 'Ver público';
  }
}

function abrirModalPublico() {
  el.modalPublico.classList.remove('hidden');
}

function cerrarModalPublico() {
  el.modalPublico.classList.add('hidden');
}

/** Evita que el texto de una pregunta/opción rompa el HTML por accidente. */
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function manejarRespuesta(botonSeleccionado, esCorrecta) {
  // Evita respuestas dobles: si ya se respondió, no hace nada.
  if (partida.respondida) return;

  // AGREGADO — Comodín "Doble Respuesta": si está activo en esta pregunta
  // y el jugador falla su PRIMER intento, la pregunta NO termina. Se
  // marca esa opción como incorrecta (queda deshabilitada) y se habilita
  // un segundo intento entre las respuestas restantes; el resto del
  // flujo (temporizador, otros comodines) sigue exactamente igual.
  if (partida.dobleRespuestaActivaPreguntaActual && !esCorrecta && !partida.dobleRespuestaPrimerIntentoUsado) {
    partida.dobleRespuestaPrimerIntentoUsado = true;

    botonSeleccionado.disabled = true;
    botonSeleccionado.dataset.estado = 'incorrecta';
    // Marca auxiliar para que, al resolverse la pregunta (segundo intento
    // o tiempo agotado), este botón conserve su color "incorrecta" en vez
    // de quedar "apagada" como una opción cualquiera no elegida.
    botonSeleccionado.dataset.primerIntentoFallido = 'true';

    sonidos.incorrecta();
    actualizarAvisoDobleRespuesta();
    return; // No se marca "partida.respondida": la pregunta sigue activa.
  }

  partida.respondida = true;
  detenerTemporizador();

  const botones = el.options.querySelectorAll('.option');
  botones.forEach((boton) => {
    boton.disabled = true;
    const esLaCorrecta = boton.dataset.esCorrecta === 'true';
    if (esLaCorrecta) {
      boton.dataset.estado = 'correcta';
    } else if (boton === botonSeleccionado) {
      boton.dataset.estado = 'incorrecta';
    } else if (boton.dataset.primerIntentoFallido === 'true') {
      // AGREGADO — Conserva la marca del primer intento fallido (Doble Respuesta).
      boton.dataset.estado = 'incorrecta';
    } else {
      boton.dataset.estado = 'apagada';
    }
  });

  // AGREGADO — La pregunta ya se resolvió: se apaga el aviso de "Doble Respuesta".
  partida.dobleRespuestaActivaPreguntaActual = false;
  actualizarAvisoDobleRespuesta();

  if (esCorrecta) {
    partida.aciertos += 1;
    sonidos.correcta();

    const esUltimaPregunta = partida.indiceActual === partida.preguntas.length - 1;

    if (esUltimaPregunta) {
      // Partida completada: no hace falta presionar "Ver resultado",
      // pasamos al resumen automáticamente 2 segundos después.
      partida.motivoFin = 'completado';
      el.btnSiguiente.disabled = true;
      el.btnSiguiente.textContent = 'Ver resultado';
      setTimeout(() => {
        if (partida && partida.motivoFin === 'completado') {
          finalizarPartida();
        }
      }, 2000);
    } else {
      partida.motivoFin = null;
      el.btnSiguiente.disabled = false;
      el.btnSiguiente.textContent = 'Siguiente';
    }
  } else {
    sonidos.incorrecta();
    partida.terminada = true;
    partida.motivoFin = 'incorrecta';
    el.btnSiguiente.disabled = false;
    el.btnSiguiente.textContent = 'Ver resultado';
  }

  actualizarBotonComodin();
  actualizarBotonComodinTiempo();
  actualizarBotonPublico();
  actualizarBotonDobleRespuesta();

  // AGREGADO — Sistema de participación del público: cierra la votación
  // de esta pregunta, calcula el resumen y lo pinta en #panel-publico-stats.
  PanelPublico.cerrarPreguntaYMostrar(partida.indiceActual + 1)
    .catch((errPublico) => console.warn('Público: no se pudo cerrar la pregunta.', errPublico));
}


/** Se ejecuta cuando el temporizador llega a cero sin respuesta. */
function manejarTiempoAgotado() {
  if (partida.respondida) return;

  partida.respondida = true;
  partida.terminada = true;
  partida.motivoFin = 'tiempo';
  sonidos.tiempo();

  const botones = el.options.querySelectorAll('.option');
  botones.forEach((boton) => {
    boton.disabled = true;
    const esLaCorrecta = boton.dataset.esCorrecta === 'true';
    if (esLaCorrecta) {
      // Se usa 'correcta-tiempo' (morado) en vez de 'correcta' (verde) para
      // dejar claro que la respuesta no se marcó a tiempo y no cuenta como acierto.
      boton.dataset.estado = 'correcta-tiempo';
    } else if (boton.dataset.primerIntentoFallido === 'true') {
      // AGREGADO — Conserva la marca del primer intento fallido (Doble Respuesta),
      // por si el tiempo se agota mientras se espera el segundo intento.
      boton.dataset.estado = 'incorrecta';
    } else {
      boton.dataset.estado = 'apagada';
    }
  });

  // AGREGADO — La pregunta ya se resolvió: se apaga el aviso de "Doble Respuesta".
  partida.dobleRespuestaActivaPreguntaActual = false;
  actualizarAvisoDobleRespuesta();

  el.btnSiguiente.disabled = false;
  el.btnSiguiente.textContent = 'Ver resultado';
  actualizarBotonComodin();
  actualizarBotonComodinTiempo();
  actualizarBotonPublico();
  actualizarBotonDobleRespuesta();

  // AGREGADO — Sistema de participación del público: el tiempo también
  // cierra la pregunta (nadie más puede votar) y muestra el resultado.
  PanelPublico.cerrarPreguntaYMostrar(partida.indiceActual + 1)
    .catch((errPublico) => console.warn('Público: no se pudo cerrar la pregunta.', errPublico));
}

/** Maneja el clic en "Siguiente" / "Ver resultado". */
function irASiguientePregunta() {
  if (!partida.respondida) return;

  if (partida.terminada) {
    finalizarPartida();
    return;
  }

  const esUltimaPregunta = partida.indiceActual === partida.preguntas.length - 1;
  if (esUltimaPregunta) {
    finalizarPartida();
    return;
  }

  partida.indiceActual += 1;
  renderizarPreguntaActual();
}

/**
 * Termina la partida en curso manualmente (botón "Terminar partida" +
 * confirmación) y regresa directamente a la pantalla de inicio.
 * Las preguntas ya usadas quedan igual de excluidas para el resto de
 * la sesión, tal como si la partida hubiera terminado por pérdida o victoria
 * (esa exclusión ya ocurrió al seleccionarlas, así que no hay nada más que hacer).
 */
function terminarPartidaManualmente() {
  detenerTemporizador();
  cerrarModalPublico();
  // AGREGADO — Si el comodín "Público" dejó un refresco en vivo corriendo
  // (pregunta abandonada a mitad de camino), se detiene aquí.
  PanelPublico.detenerConteoEnVivo();
  partida = null;
  actualizarInfoSesion();
  mostrarPantalla('home');
}

function finalizarPartida() {
  detenerTemporizador();
  cerrarModalPublico();
  actualizarEscalera();

  const total = partida.preguntas.length;
  const aciertos = partida.aciertos;
  const porcentaje = Math.round((aciertos / total) * 100);

  if (partida.motivoFin === 'completado') {
    sonidos.victoria();
  } else {
    sonidos.perdida();
  }

  el.endEyebrow.textContent =
    partida.motivoFin === 'completado' ? '¡Partida completada!' :
    partida.motivoFin === 'tiempo' ? 'Se acabó el tiempo' :
    'Respuesta incorrecta';

  el.endAciertos.textContent = String(aciertos);
  el.endTotal.textContent = String(total);
  el.endPorcentaje.textContent = `${porcentaje}% de aciertos`;
  el.endMensaje.textContent = obtenerMensajeFinal(porcentaje, partida.motivoFin);

  mostrarPantalla('end');
}

function obtenerMensajeFinal(porcentaje, motivo) {
  if (motivo === 'completado') {
    return 'Respondiste todas las preguntas correctamente.';
  }
  if (porcentaje === 0) {
    return 'No te preocupes, todos empezamos en algún punto.';
  }
  if (porcentaje < 50) {
    return 'Buen intento.';
  }
  if (porcentaje < 100) {
    return '¡Muy bien! Estuviste cerca.';
  }
  return '¡Excelente partida!';
}

/* ---------------------------------------------------------------------
   9. TEMPORIZADOR
   ------------------------------------------------------------------ */

function iniciarTemporizador(segundosTotales) {
  detenerTemporizador();
  segundosTotalesActuales = segundosTotales;
  segundosRestantesActuales = segundosTotales;
  actualizarVistaTemporizador(segundosRestantesActuales, segundosTotalesActuales);
  arrancarIntervaloTemporizador();
}

/** Arranca (o reanuda) el intervalo de 1 segundo del temporizador. */
function arrancarIntervaloTemporizador() {
  timerIntervalId = setInterval(() => {
    segundosRestantesActuales -= 1;
    actualizarVistaTemporizador(segundosRestantesActuales, segundosTotalesActuales);

    // Tic-tac de tensión en los últimos 5 segundos.
    if (segundosRestantesActuales > 0 && segundosRestantesActuales <= 5) {
      sonidos.tictac();
    }

    if (segundosRestantesActuales <= 0) {
      detenerTemporizador();
      manejarTiempoAgotado();
    }
  }, 1000);
}

/** Detiene el intervalo. El tiempo restante queda guardado (no se pierde). */
function detenerTemporizador() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

/**
 * Reanuda el temporizador justo donde se quedó (se usa al presionar
 * "Reanudar" en el modal de "Terminar partida"). No hace nada si la
 * pregunta actual ya fue respondida o si ya está corriendo.
 */
function reanudarTemporizador() {
  if (!partida || partida.respondida || partida.terminada) return;
  if (timerIntervalId) return;
  arrancarIntervaloTemporizador();
}

function actualizarVistaTemporizador(restante, total) {
  const restanteVisible = Math.max(restante, 0);
  el.timerValor.textContent = String(restanteVisible);

  // AGREGADO — Mantiene visible el tiempo restante dentro del modal
  // "Público" (que cubre el cronómetro principal mientras está abierto).
  el.modalPublicoTimerValor.textContent = String(restanteVisible);

  const fraccion = restanteVisible / total;
  el.timerRingFg.style.strokeDashoffset = String(TIMER_RING_LENGTH * (1 - fraccion));

  let estado = 'ok';
  if (fraccion <= 0.2) estado = 'danger';
  else if (fraccion <= 0.5) estado = 'warn';
  el.timer.dataset.state = estado;
}

/* ---------------------------------------------------------------------
   10. MENSAJES / PANTALLAS AUXILIARES
   ------------------------------------------------------------------ */

function mostrarMensajeSinPreguntas() {
  el.mensajeIcono.textContent = '';
  el.mensajeTitulo.textContent = 'No hay preguntas disponibles';
  el.mensajeTexto.textContent =
    'Ya jugaste todas las preguntas activas disponibles en esta sesión. Puedes reiniciar el mazo para volver a jugarlas.';

  el.mensajeAcciones.innerHTML = '';
  el.mensajeAcciones.appendChild(
    crearBotonMensaje('Reiniciar mazo de preguntas', 'btn--primary', () => {
      preguntasUsadasEnSesion.clear();
      mostrarPantalla('home');
    })
  );
  el.mensajeAcciones.appendChild(
    crearBotonMensaje('Volver al inicio', 'btn--ghost', () => mostrarPantalla('home'))
  );

  mostrarPantalla('mensaje');
}

function mostrarMensajeError(error) {
  el.mensajeIcono.textContent = '⚠️';
  el.mensajeTitulo.textContent = 'No se pudo conectar con la base de preguntas';
  el.mensajeTexto.textContent =
    'Revisa tu conexión a internet.      Detalle: ' +
    (error?.message || 'error desconocido');

  el.mensajeAcciones.innerHTML = '';
  el.mensajeAcciones.appendChild(
    crearBotonMensaje('Volver a intentar', 'btn--primary', () => mostrarPantalla('home'))
  );

  mostrarPantalla('mensaje');
}

function crearBotonMensaje(texto, clase, onClick) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = `btn ${clase}`;
  boton.textContent = texto;
  boton.addEventListener('click', onClick);
  return boton;
}

function actualizarInfoSesion() {
  const usadas = preguntasUsadasEnSesion.size;
  el.sessionInfo.textContent = usadas > 0
    ? `Preguntas jugadas en esta sesión: ${usadas}.`
    : 'Las preguntas ya jugadas no se repiten durante esta sesión del navegador.';
}

/** Refleja "numeroPartida" en el contador visible (siempre en pantalla). */
function actualizarContadorPartidas() {
  el.contadorPartidas.textContent = `Partida #${numeroPartida}`;
}

/** Refleja los contadores de preguntas mostradas por área (M/C) en la interfaz. */
function actualizarContadorCategorias() {
  el.contadorAreaM.textContent = String(contadorAreaM);
  el.contadorAreaC.textContent = String(contadorAreaC);
}

/* ---------------------------------------------------------------------
   11. EVENTOS DE LA INTERFAZ
   ------------------------------------------------------------------ */

function ajustarStepper(input, delta, min, max) {
  const valorActual = parseInt(input.value, 10) || min;
  input.value = String(limitar(valorActual + delta, min, max));
}

el.btnCantidadMenos.addEventListener('click', () => ajustarStepper(el.inputCantidad, -1, 5, 10));
el.btnCantidadMas.addEventListener('click', () => ajustarStepper(el.inputCantidad, 1, 5, 10));
el.btnTiempoMenos.addEventListener('click', () => ajustarStepper(el.inputTiempo, -5, 10, 120));
el.btnTiempoMas.addEventListener('click', () => ajustarStepper(el.inputTiempo, 5, 10, 120));

el.btnTerminarPartida.addEventListener('click', () => {
  // Se pausa el tiempo mientras se confirma la decisión.
  detenerTemporizador();
  el.modalTerminar.classList.remove('hidden');
});

el.btnReanudar.addEventListener('click', () => {
  el.modalTerminar.classList.add('hidden');
  reanudarTemporizador();
});

el.btnTerminarConfirmar.addEventListener('click', () => {
  el.modalTerminar.classList.add('hidden');
  terminarPartidaManualmente();
});

el.formConfig.addEventListener('submit', (evento) => {
  evento.preventDefault();

  const cantidad = parseInt(el.inputCantidad.value, 10);
  const tiempo = limitar(parseInt(el.inputTiempo.value, 10) || 30, 10, 120);
  el.inputTiempo.value = String(tiempo);

  // Validación: la cantidad de preguntas debe estar entre 5 y 10.
  // Si no lo está, NO se permite iniciar la partida.
  if (!Number.isInteger(cantidad) || cantidad < 5 || cantidad > 10) {
    el.homeMensaje.textContent = 'La cantidad de preguntas debe ser entre 5 y 10.';
    el.homeMensaje.classList.remove('hidden');
    return;
  }

  el.homeMensaje.classList.add('hidden');

  // El contador sube en cada "Iniciar partida" (0 → 1 en la primera).
  numeroPartida += 1;
  actualizarContadorPartidas();

  iniciarPartida({
    cantidad,
    tiempo,
    sonido: el.inputSonido.checked,
  });
});

el.btnSiguiente.addEventListener('click', irASiguientePregunta);
el.btn5050.addEventListener('click', usarComodin5050);
el.btnTiempoExtra.addEventListener('click', usarComodinTiempoExtra);
el.btnDobleRespuesta.addEventListener('click', usarComodinDobleRespuesta);
el.btnPublico.addEventListener('click', usarBotonPublico);
el.btnCerrarPublico.addEventListener('click', cerrarModalPublico);

el.btnNuevaPartida.addEventListener('click', () => {
  // El contador sube con CADA "Nueva partida" (la primera partida ya
  // arranca mostrando "Partida #1" desde que se carga la página).
  numeroPartida += 1;
  actualizarContadorPartidas();
  iniciarPartida(partida.config);
});

el.btnCambiarConfig.addEventListener('click', () => {
  actualizarInfoSesion();
  mostrarPantalla('home');
});

/* ---------------------------------------------------------------------
   12. PANTALLA COMPLETA
   ------------------------------------------------------------------ */

/** Alterna entre entrar y salir de pantalla completa (botón fijo). */
function alternarPantallaCompleta() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch((err) => {
      console.warn('No se pudo entrar en pantalla completa:', err);
    });
  } else {
    document.exitFullscreen?.().catch((err) => {
      console.warn('No se pudo salir de pantalla completa:', err);
    });
  }
}

/** Sincroniza el ícono/etiqueta del botón según el estado real de pantalla completa. */
function actualizarIconoPantallaCompleta() {
  const enPantallaCompleta = Boolean(document.fullscreenElement);
  el.btnFullscreenIcono.textContent = enPantallaCompleta ? '⤢' : '⛶';
  el.btnFullscreen.setAttribute(
    'aria-label',
    enPantallaCompleta ? 'Salir de pantalla completa' : 'Entrar en pantalla completa'
  );
  el.btnFullscreen.title = enPantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa';
}

el.btnFullscreen.addEventListener('click', alternarPantallaCompleta);
// Se escucha el evento del navegador para mantener el ícono correcto incluso
// si el usuario sale de pantalla completa con la tecla Esc (en vez del botón).
document.addEventListener('fullscreenchange', actualizarIconoPantallaCompleta);

/* ---------------------------------------------------------------------
   13. MODAL DE IMAGEN (Instrucciones / Código QR del público)
   AGREGADO — Modal genérico reutilizado por dos botones distintos:
   - "Instrucciones" (esquina superior derecha, antes era "Preguntas").
   - "Público · Código QR" (pantalla de inicio, debajo de "Iniciar partida").
   No afecta ninguna otra lógica: solo abre/cierra una imagen dentro de
   la misma pantalla, sin navegar ni depender de la partida en curso.
   ------------------------------------------------------------------ */

const URL_INSTRUCCIONES = 'https://hgppzklpukgslnrynvld.supabase.co/storage/v1/object/public/IMG/INSTRUCCIONES%20JUEGO.png';
const URL_QR_PUBLICO = 'https://hgppzklpukgslnrynvld.supabase.co/storage/v1/object/public/IMG/QR%20ASISTENCIA%20PVU.jpeg';

function abrirModalImagen(url, alt) {
  el.modalImagenImg.src = url;
  el.modalImagenImg.alt = alt;
  el.modalImagen.classList.remove('hidden');
}

function cerrarModalImagen() {
  el.modalImagen.classList.add('hidden');
}

el.btnInstrucciones.addEventListener('click', () => {
  abrirModalImagen(URL_INSTRUCCIONES, 'Instrucciones del juego');
});

el.btnQrPublico.addEventListener('click', () => {
  abrirModalImagen(URL_QR_PUBLICO, 'Código QR de asistencia del público');
});

// AGREGADO — Cierra el modal al hacer clic fuera de la imagen (sobre el
// fondo oscuro). Un clic sobre la imagen misma no cierra el modal.
el.modalImagen.addEventListener('click', (evento) => {
  if (evento.target === el.modalImagen) {
    cerrarModalImagen();
  }
});

/* ---------------------------------------------------------------------
   14. LIMPIAR BASE DE DATOS DEL PÚBLICO (mantenimiento)
   AGREGADO — Botón fijo en la esquina inferior izquierda de la pantalla
   de inicio. Vacía por completo las tablas del sistema de participación
   del público (partidas, votos temporales y estadísticas) y reinicia
   "sesion_activa" a su estado inicial ('ESPERANDO', sin partida ni
   pregunta), todo a través de la función RPC
   millonario.limpiar_base_datos() (ver supabase-limpiar-bd.sql).
   NO toca la tabla "preguntas": el banco de preguntas no se ve afectado.
   ------------------------------------------------------------------ */

function abrirModalLimpiarBd() {
  el.limpiarBdMensaje.textContent = '';
  el.limpiarBdMensaje.classList.add('hidden');
  el.btnLimpiarBdConfirmar.disabled = false;
  el.btnLimpiarBdConfirmar.textContent = 'Sí, limpiar todo';
  el.modalLimpiarBd.classList.remove('hidden');
}

function cerrarModalLimpiarBd() {
  el.modalLimpiarBd.classList.add('hidden');
}

async function limpiarBaseDeDatosPublico() {
  if (!supabaseClient) {
    el.limpiarBdMensaje.textContent = 'No se pudo inicializar la conexión con Supabase.';
    el.limpiarBdMensaje.classList.remove('hidden');
    return;
  }

  el.btnLimpiarBdConfirmar.disabled = true;
  el.btnLimpiarBdConfirmar.textContent = 'Limpiando…';
  el.limpiarBdMensaje.classList.add('hidden');

  try {
    const { error } = await supabaseClient
      .schema('millonario')
      .rpc('limpiar_base_datos');

    if (error) throw error;

    cerrarModalLimpiarBd();

    // El contador de partidas visible en pantalla también vuelve a
    // cero, para que "Partida #" sea coherente con la base de datos
    // recién limpiada.
    numeroPartida = 0;
    actualizarContadorPartidas();

    el.mensajeTitulo.textContent = 'Base de datos limpiada correctamente';
    el.mensajeAcciones.innerHTML = '';
    el.mensajeAcciones.appendChild(
      crearBotonMensaje('Volver al inicio', 'btn--primary', () => mostrarPantalla('home'))
    );
    mostrarPantalla('mensaje');
  } catch (err) {
    console.error('No se pudo limpiar la base de datos del público:', err);
    el.limpiarBdMensaje.textContent =
      'No se pudo limpiar la base de datos. Detalle: ' + (err?.message || 'error desconocido');
    el.limpiarBdMensaje.classList.remove('hidden');
    el.btnLimpiarBdConfirmar.disabled = false;
    el.btnLimpiarBdConfirmar.textContent = 'Sí, limpiar todo';
  }
}

el.btnLimpiarBd.addEventListener('click', abrirModalLimpiarBd);
el.btnLimpiarBdCancelar.addEventListener('click', cerrarModalLimpiarBd);
el.btnLimpiarBdConfirmar.addEventListener('click', limpiarBaseDeDatosPublico);

// Cierra el modal al hacer clic fuera de la tarjeta (sobre el fondo
// oscuro), igual que el resto de modales de esta pantalla.
el.modalLimpiarBd.addEventListener('click', (evento) => {
  if (evento.target === el.modalLimpiarBd) {
    cerrarModalLimpiarBd();
  }
});

/* ---------------------------------------------------------------------
   INICIALIZACIÓN
   ------------------------------------------------------------------ */
actualizarInfoSesion();
actualizarContadorPartidas();
actualizarIconoPantallaCompleta();
mostrarPantalla('home');
