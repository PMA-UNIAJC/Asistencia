'use strict';


const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_ANON_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;

// La tabla "preguntas" vive en el schema "millonario" (no en "public").
const NOMBRE_TABLA = 'preguntas';
const NOMBRE_SCHEMA = 'millonario';

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
  // Encabezado / toolbar
  btnNuevaPregunta: document.getElementById('btn-nueva-pregunta'),
  inputBuscar: document.getElementById('input-buscar'),
  selectArea: document.getElementById('select-area'),
  selectDificultad: document.getElementById('select-dificultad'),
  btnLimpiarFiltros: document.getElementById('btn-limpiar-filtros'),
  adminContador: document.getElementById('admin-contador'),

  // Estados
  adminLoading: document.getElementById('admin-loading'),
  adminError: document.getElementById('admin-error'),
  adminErrorTexto: document.getElementById('admin-error-texto'),
  btnReintentar: document.getElementById('btn-reintentar'),
  adminVacio: document.getElementById('admin-vacio'),
  btnVacioLimpiarFiltros: document.getElementById('btn-vacio-limpiar-filtros'),

  // Listado
  preguntasGrid: document.getElementById('preguntas-grid'),

  // Modal crear/editar
  modalPregunta: document.getElementById('modal-pregunta'),
  modalPreguntaTitulo: document.getElementById('modal-pregunta-titulo'),
  formPregunta: document.getElementById('form-pregunta'),
  inputEnunciado: document.getElementById('input-enunciado'),
  inputCorrecta: document.getElementById('input-correcta'),
  inputIncorrecta1: document.getElementById('input-incorrecta-1'),
  inputIncorrecta2: document.getElementById('input-incorrecta-2'),
  inputIncorrecta3: document.getElementById('input-incorrecta-3'),
  inputArea: document.getElementById('input-area'),
  inputDificultad: document.getElementById('input-dificultad'),
  inputActiva: document.getElementById('input-activa'),
  formPreguntaError: document.getElementById('form-pregunta-error'),
  btnGuardarPregunta: document.getElementById('btn-guardar-pregunta'),
  btnCancelarPregunta: document.getElementById('btn-cancelar-pregunta'),

  // Modal eliminar
  modalEliminar: document.getElementById('modal-eliminar'),
  btnEliminarConfirmar: document.getElementById('btn-eliminar-confirmar'),
  btnEliminarCancelar: document.getElementById('btn-eliminar-cancelar'),

  // Toast
  toast: document.getElementById('toast'),
};

/* ---------------------------------------------------------------------
   3. ESTADO DE LA APLICACIÓN
   ------------------------------------------------------------------ */

// Copia local de TODAS las preguntas de la BD (activas e inactivas),
// para poder filtrar/buscar en el cliente sin volver a consultar
// Supabase en cada cambio de filtro.
let todasLasPreguntas = [];

// null => el modal de "crear/editar" está en modo creación.
// id    => el modal está editando la pregunta con ese id.
let preguntaEnEdicionId = null;

// id de la pregunta pendiente de confirmar su eliminación (modal).
let preguntaAEliminarId = null;

let toastTimeoutId = null;

const ETIQUETAS_AREA = { M: 'Matemáticas', C: 'Comunicación' };
const ETIQUETAS_DIFICULTAD = { FACIL: 'Fácil', MEDIA: 'Media', DIFICIL: 'Difícil' };
const CLASE_BADGE_DIFICULTAD = {
  FACIL: 'badge--dif-facil',
  MEDIA: 'badge--dif-media',
  DIFICIL: 'badge--dif-dificil',
};

/* ---------------------------------------------------------------------
   4. UTILIDADES GENERALES
   ------------------------------------------------------------------ */

/** Normaliza texto para comparar en la búsqueda (minúsculas + trim). */
function normalizar(texto) {
  return String(texto || '').toLowerCase().trim();
}

// Orden fijo de visualización: primero Matemáticas, luego Comunicación;
// dentro de cada área, de Fácil a Difícil.
const ORDEN_AREA = { M: 0, C: 1 };
const ORDEN_DIFICULTAD = { FACIL: 0, MEDIA: 1, DIFICIL: 2 };

function compararPreguntas(a, b) {
  const areaA = ORDEN_AREA[a.area] ?? 99;
  const areaB = ORDEN_AREA[b.area] ?? 99;
  if (areaA !== areaB) return areaA - areaB;

  const difA = ORDEN_DIFICULTAD[a.dificultad] ?? 99;
  const difB = ORDEN_DIFICULTAD[b.dificultad] ?? 99;
  if (difA !== difB) return difA - difB;

  return a.id - b.id; // desempate estable
}

/* ---------------------------------------------------------------------
   5. ACCESO A DATOS (Supabase)
   ------------------------------------------------------------------ */

/** Trae TODAS las preguntas (activas e inactivas) desde Supabase. */
async function cargarPreguntas() {
  mostrarEstado('loading');

  if (!supabaseClient) {
    el.adminErrorTexto.textContent =
      'Cliente de Supabase no configurado. Revisa SUPABASE_URL y SUPABASE_ANON_KEY en script.js.';
    mostrarEstado('error');
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .schema(NOMBRE_SCHEMA)
      .from(NOMBRE_TABLA)
      .select(
        'id, pregunta, respuesta_correcta, respuesta_incorrecta_1, respuesta_incorrecta_2, respuesta_incorrecta_3, dificultad, area, activa'
      )
      .order('id', { ascending: true });

    if (error) throw error;

    todasLasPreguntas = (data || []).slice().sort(compararPreguntas);
    renderizarLista();
  } catch (err) {
    console.error(err);
    el.adminErrorTexto.textContent =
      'Revisa tu conexión a internet. Detalle: ' + (err?.message || 'error desconocido');
    mostrarEstado('error');
  }
}

/** Inserta una nueva pregunta en la base de datos. */
async function obtenerSiguienteId() {
  const { data, error } = await supabaseClient
    .schema(NOMBRE_SCHEMA)
    .from(NOMBRE_TABLA)
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data && data.length > 0 ? data[0].id : 0;
  return maxId + 1;
}

async function crearPregunta(datos) {
  const siguienteId = await obtenerSiguienteId();

  const { error } = await supabaseClient
    .schema(NOMBRE_SCHEMA)
    .from(NOMBRE_TABLA)
    .insert([{ id: siguienteId, ...datos }]);

  if (error) throw error;
}


async function actualizarPregunta(id, datos) {
  const { data, error } = await supabaseClient
    .schema(NOMBRE_SCHEMA)
    .from(NOMBRE_TABLA)
    .update(datos)
    .eq('id', id)
    .select(
      'id, pregunta, respuesta_correcta, respuesta_incorrecta_1, respuesta_incorrecta_2, respuesta_incorrecta_3, dificultad, area, activa'
    )
    .single();

  if (error) throw error;
  return data;
}

/** Elimina una pregunta por id. */
async function eliminarPregunta(id) {
  const { error } = await supabaseClient
    .schema(NOMBRE_SCHEMA)
    .from(NOMBRE_TABLA)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/* ---------------------------------------------------------------------
   6. FILTROS, BÚSQUEDA Y CONTADOR
   ------------------------------------------------------------------ */

/** Aplica los filtros de área/dificultad y la búsqueda por enunciado. */
function obtenerPreguntasFiltradas() {
  const area = el.selectArea.value; // 'TODAS' | 'M' | 'C'
  const dificultad = el.selectDificultad.value; // 'TODAS' | 'FACIL' | 'MEDIA' | 'DIFICIL'
  const busqueda = normalizar(el.inputBuscar.value);

  return todasLasPreguntas.filter((p) => {
    if (area !== 'TODAS' && p.area !== area) return false;
    if (dificultad !== 'TODAS' && p.dificultad !== dificultad) return false;
    if (busqueda && !normalizar(p.pregunta).includes(busqueda)) return false;
    return true;
  });
}

function actualizarContador(mostradas, total) {
  const plural = total === 1 ? 'pregunta' : 'preguntas';
  el.adminContador.textContent = `Mostrando ${mostradas} de ${total} ${plural}`;
}

function limpiarFiltros() {
  el.selectArea.value = 'TODAS';
  el.selectDificultad.value = 'TODAS';
  el.inputBuscar.value = '';
  renderizarLista();
}

/* ---------------------------------------------------------------------
   7. RENDER DE LA LISTA
   ------------------------------------------------------------------ */

/** Muestra únicamente el estado indicado ('loading' | 'error' | null). */
function mostrarEstado(nombre) {
  el.adminLoading.classList.toggle('hidden', nombre !== 'loading');
  el.adminError.classList.toggle('hidden', nombre !== 'error');

  if (nombre === 'loading' || nombre === 'error') {
    el.adminVacio.classList.add('hidden');
    el.preguntasGrid.classList.add('hidden');
    el.adminContador.textContent = nombre === 'loading' ? 'Cargando preguntas…' : '';
  }
}

/** Vuelve a calcular filtros y redibuja el contador + la grilla/estado vacío. */
function renderizarLista() {
  const filtradas = obtenerPreguntasFiltradas();
  actualizarContador(filtradas.length, todasLasPreguntas.length);

  el.adminLoading.classList.add('hidden');
  el.adminError.classList.add('hidden');

  if (filtradas.length === 0) {
    el.preguntasGrid.classList.add('hidden');
    el.preguntasGrid.innerHTML = '';
    el.adminVacio.classList.remove('hidden');
    return;
  }

  el.adminVacio.classList.add('hidden');
  el.preguntasGrid.classList.remove('hidden');
  el.preguntasGrid.innerHTML = '';

  filtradas.forEach((p) => el.preguntasGrid.appendChild(crearTarjetaPregunta(p)));
}

/** Construye la tarjeta visual de una pregunta con sus 4 opciones. */
function crearTarjetaPregunta(p) {
  const opciones = [
    { texto: p.respuesta_correcta, esCorrecta: true },
    { texto: p.respuesta_incorrecta_1, esCorrecta: false },
    { texto: p.respuesta_incorrecta_2, esCorrecta: false },
    { texto: p.respuesta_incorrecta_3, esCorrecta: false },
  ];

  // Se asume "activa" cuando la columna es true o no existe/es null,
  // para no ocultar preguntas por accidente si el campo aún no se usa.
  const activa = p.activa !== false;
  const claseArea = p.area === 'C' ? 'badge--area-c' : 'badge--area-m';
  const claseDificultad = CLASE_BADGE_DIFICULTAD[p.dificultad] || '';

  const card = document.createElement('article');
  card.className = 'pregunta-card';
  card.dataset.id = p.id; // permite ubicar y reemplazar SOLO esta tarjeta más adelante

  card.innerHTML = `
    <div class="pregunta-card__badges">
      <span class="badge ${claseArea}"></span>
      <span class="badge ${claseDificultad}"></span>
      <span class="badge ${activa ? 'badge--activa' : 'badge--inactiva'}">${activa ? 'Activa' : 'Inactiva'}</span>
    </div>
    <p class="pregunta-card__texto"></p>
    <ul class="pregunta-card__opciones"></ul>
    <div class="pregunta-card__acciones">
      <button type="button" class="btn btn--ghost btn-editar">Editar</button>
      <button type="button" class="btn btn--peligro btn-eliminar">Eliminar</button>
    </div>
  `;

  // Se usa textContent (en vez de interpolar en el innerHTML de arriba)
  // para que el texto de la BD nunca pueda romper el marcado.
  card.querySelectorAll('.badge')[0].textContent = ETIQUETAS_AREA[p.area] || p.area || '—';
  card.querySelectorAll('.badge')[1].textContent = ETIQUETAS_DIFICULTAD[p.dificultad] || p.dificultad || '—';
  card.querySelector('.pregunta-card__texto').textContent = p.pregunta;

  const lista = card.querySelector('.pregunta-card__opciones');
  opciones.forEach((op) => {
    const li = document.createElement('li');
    li.className = 'pregunta-card__opcion' + (op.esCorrecta ? ' pregunta-card__opcion--correcta' : '');

    const icono = document.createElement('span');
    icono.className = 'pregunta-card__opcion-icono';
    icono.textContent = op.esCorrecta ? '✓' : '—';

    const texto = document.createElement('span');
    texto.textContent = op.texto;

    li.appendChild(icono);
    li.appendChild(texto);
    lista.appendChild(li);
  });

  card.querySelector('.btn-editar').addEventListener('click', () => abrirModalEdicion(p));
  card.querySelector('.btn-eliminar').addEventListener('click', () => abrirModalEliminar(p.id));

  return card;
}


function aplicarEdicionEnPantalla(preguntaActualizada) {
  // 1) Sincroniza la copia local con lo que realmente quedó en la BD.
  const indice = todasLasPreguntas.findIndex((p) => p.id === preguntaActualizada.id);
  if (indice !== -1) {
    todasLasPreguntas[indice] = preguntaActualizada;
  } else {
    todasLasPreguntas.push(preguntaActualizada);
  }
  // Mantiene el orden (Matemáticas→Comunicación, Fácil→Difícil) correcto
  // para la próxima vez que se recalculen los filtros, sin mover nada
  // visualmente ahora mismo.
  todasLasPreguntas.sort(compararPreguntas);

  // 2) ¿Sigue cumpliendo los filtros/búsqueda actuales? (pudo cambiar de
  // área o dificultad y dejar de calzar con el filtro activo).
  const sigueVisible = obtenerPreguntasFiltradas().some((p) => p.id === preguntaActualizada.id);
  const tarjetaExistente = el.preguntasGrid.querySelector(`[data-id="${preguntaActualizada.id}"]`);

  if (sigueVisible && tarjetaExistente) {
    // Caso normal: se reemplaza SOLO esta tarjeta, en su misma posición.
    tarjetaExistente.replaceWith(crearTarjetaPregunta(preguntaActualizada));
  } else if (!sigueVisible && tarjetaExistente) {
    // Editaste el área/dificultad y ya no cumple el filtro activo: se quita.
    tarjetaExistente.remove();
  } else {
    // Caso borde no esperado en edición: se recalcula todo por seguridad.
    renderizarLista();
    return;
  }

  // 3) Contador y estado vacío, sin tocar el resto de tarjetas.
  const totalVisibles = el.preguntasGrid.querySelectorAll('.pregunta-card').length;
  actualizarContador(totalVisibles, todasLasPreguntas.length);

  if (totalVisibles === 0) {
    el.preguntasGrid.classList.add('hidden');
    el.adminVacio.classList.remove('hidden');
  }
}

/* ---------------------------------------------------------------------
   8. MODAL: CREAR / EDITAR PREGUNTA
   ------------------------------------------------------------------ */

function abrirModalNueva() {
  preguntaEnEdicionId = null;
  el.modalPreguntaTitulo.textContent = 'Nueva pregunta';
  el.formPregunta.reset();
  el.inputArea.value = 'M';
  el.inputDificultad.value = 'FACIL';
  el.inputActiva.checked = true;
  ocultarErrorFormulario();
  el.modalPregunta.classList.remove('hidden');
  el.inputEnunciado.focus();
}

function abrirModalEdicion(p) {
  preguntaEnEdicionId = p.id;
  el.modalPreguntaTitulo.textContent = 'Editar pregunta';
  el.inputEnunciado.value = p.pregunta || '';
  el.inputCorrecta.value = p.respuesta_correcta || '';
  el.inputIncorrecta1.value = p.respuesta_incorrecta_1 || '';
  el.inputIncorrecta2.value = p.respuesta_incorrecta_2 || '';
  el.inputIncorrecta3.value = p.respuesta_incorrecta_3 || '';
  el.inputArea.value = p.area || 'M';
  el.inputDificultad.value = p.dificultad || 'FACIL';
  el.inputActiva.checked = p.activa !== false;
  ocultarErrorFormulario();
  el.modalPregunta.classList.remove('hidden');
  el.inputEnunciado.focus();
}

function cerrarModalPregunta() {
  el.modalPregunta.classList.add('hidden');
  preguntaEnEdicionId = null;
}

function ocultarErrorFormulario() {
  el.formPreguntaError.classList.add('hidden');
  el.formPreguntaError.textContent = '';
}

function mostrarErrorFormulario(mensaje) {
  el.formPreguntaError.textContent = mensaje;
  el.formPreguntaError.classList.remove('hidden');
}

/** Lee y valida los campos del formulario. Devuelve null si falta algo. */
function leerDatosFormulario() {
  const datos = {
    pregunta: el.inputEnunciado.value.trim(),
    respuesta_correcta: el.inputCorrecta.value.trim(),
    respuesta_incorrecta_1: el.inputIncorrecta1.value.trim(),
    respuesta_incorrecta_2: el.inputIncorrecta2.value.trim(),
    respuesta_incorrecta_3: el.inputIncorrecta3.value.trim(),
    area: el.inputArea.value,
    dificultad: el.inputDificultad.value,
    activa: el.inputActiva.checked,
  };

  const camposTexto = [
    datos.pregunta,
    datos.respuesta_correcta,
    datos.respuesta_incorrecta_1,
    datos.respuesta_incorrecta_2,
    datos.respuesta_incorrecta_3,
  ];

  if (camposTexto.some((valor) => valor.length === 0)) {
    return { datos: null, error: 'Completa el enunciado y las cuatro opciones de respuesta.' };
  }

  return { datos, error: null };
}

async function manejarEnvioFormulario(evento) {
  evento.preventDefault();
  ocultarErrorFormulario();

  const { datos, error } = leerDatosFormulario();
  if (error) {
    mostrarErrorFormulario(error);
    return;
  }

  el.btnGuardarPregunta.disabled = true;
  el.btnGuardarPregunta.textContent = 'Guardando…';

  try {
    if (preguntaEnEdicionId) {
      // 1º se confirma en la BD (actualizarPregunta lanza error si algo
      // falló) y solo DESPUÉS se refleja en pantalla — nunca al revés.
      const filaActualizada = await actualizarPregunta(preguntaEnEdicionId, datos);
      cerrarModalPregunta();
      aplicarEdicionEnPantalla(filaActualizada);
      mostrarToast('Pregunta actualizada correctamente.', 'exito');
    } else {
      await crearPregunta(datos);
      cerrarModalPregunta();
      await cargarPreguntas();
      mostrarToast('Pregunta creada correctamente.', 'exito');
    }
  } catch (err) {
    console.error(err);
    mostrarErrorFormulario('No se pudo guardar la pregunta. Detalle: ' + (err?.message || 'error desconocido'));
  } finally {
    el.btnGuardarPregunta.disabled = false;
    el.btnGuardarPregunta.textContent = 'Guardar';
  }
}

/* ---------------------------------------------------------------------
   9. MODAL: CONFIRMAR ELIMINACIÓN
   ------------------------------------------------------------------ */

function abrirModalEliminar(id) {
  preguntaAEliminarId = id;
  el.modalEliminar.classList.remove('hidden');
}

function cerrarModalEliminar() {
  el.modalEliminar.classList.add('hidden');
  preguntaAEliminarId = null;
}

async function manejarConfirmacionEliminar() {
  if (!preguntaAEliminarId) return;

  el.btnEliminarConfirmar.disabled = true;
  el.btnEliminarConfirmar.textContent = 'Eliminando…';

  try {
    await eliminarPregunta(preguntaAEliminarId);
    mostrarToast('Pregunta eliminada.', 'exito');
    cerrarModalEliminar();
    await cargarPreguntas();
  } catch (err) {
    console.error(err);
    mostrarToast('No se pudo eliminar la pregunta: ' + (err?.message || 'error desconocido'), 'error');
    cerrarModalEliminar();
  } finally {
    el.btnEliminarConfirmar.disabled = false;
    el.btnEliminarConfirmar.textContent = 'Eliminar';
  }
}

/* ---------------------------------------------------------------------
   10. NOTIFICACIÓN FLOTANTE (TOAST)
   ------------------------------------------------------------------ */

function mostrarToast(mensaje, tipo = 'exito') {
  clearTimeout(toastTimeoutId);
  el.toast.textContent = mensaje;
  el.toast.className = `toast toast--${tipo}`;

  toastTimeoutId = setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 3200);
}

/* ---------------------------------------------------------------------
   11. EVENTOS DE LA INTERFAZ
   ------------------------------------------------------------------ */

// Filtros y búsqueda: se actualizan dinámicamente, sin recargar la página.
el.selectArea.addEventListener('change', renderizarLista);
el.selectDificultad.addEventListener('change', renderizarLista);
el.inputBuscar.addEventListener('input', renderizarLista);
el.btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
el.btnVacioLimpiarFiltros.addEventListener('click', limpiarFiltros);

// Recarga de datos
el.btnReintentar.addEventListener('click', cargarPreguntas);

// Modal crear/editar
el.btnNuevaPregunta.addEventListener('click', abrirModalNueva);
el.btnCancelarPregunta.addEventListener('click', cerrarModalPregunta);
el.formPregunta.addEventListener('submit', manejarEnvioFormulario);

// Modal eliminar
el.btnEliminarCancelar.addEventListener('click', cerrarModalEliminar);
el.btnEliminarConfirmar.addEventListener('click', manejarConfirmacionEliminar);

/* ---------------------------------------------------------------------
   INICIALIZACIÓN
   ------------------------------------------------------------------ */
cargarPreguntas();
