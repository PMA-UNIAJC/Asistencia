const SUPABASE_URL      = 'https://imagipcgbptyjwpmpakd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYWdpcGNnYnB0eWp3cG1wYWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTI1NTQsImV4cCI6MjA5Nzk4ODU1NH0.fB61FNWsCqVm6HFvGRIqtZx3RI_pTjYL5TtLGZLAgmE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DIAS  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SEDES = ['Norte', 'Sur', 'Virtual'];
const HORAS_OPTS   = [1,2,3,4,5,6,7,8,9,10,11,12];
const MINUTOS_OPTS = ['00','15','30','45'];

// ── Estado global ─────────────────────────────────────────────────
let todosEnvios     = [];        // cache de todos los envíos
let envioActual     = null;      // envío seleccionado
let docentesActuales = [];       // docentes del envío seleccionado
let docenteEditando  = null;     // docente en el modal (null = nuevo)
let callbackConfirm  = null;     // función a ejecutar al confirmar



//  UTILIDADES
function normalizar(str) {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarBusqueda(str) {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const ROMANOS = { 1:'I', 2:'II', 3:'III', 4:'IV', 5:'V', 6:'VI', 7:'VII', 8:'VIII', 9:'IX', 10:'X' };

function reemplazarNumerosRomanos(texto) {
  return texto.replace(/\b(10|[1-9])\b/g, n => ROMANOS[n] || n);
}

function formatearFechaBogota(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function mostrarToast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast' + (tipo ? ` toast-${tipo}` : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideErr(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

function showInfo(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideInfo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

// Parseador seguro de hora "HH:MM A.M./P.M." → {h,m,ampm}
function parsearHora(horaStr) {
  if (!horaStr) return { h: 8, m: '00', ampm: 'AM' };
  // Acepta "08:00 A.M.", "8:00 AM", etc.
  const m = horaStr.match(/(\d+):(\d+)\s*(A\.?M\.?|P\.?M\.?)/i);
  if (!m) return { h: 8, m: '00', ampm: 'AM' };
  const ampm = m[3].replace(/\./g,'').toUpperCase(); // "AM" | "PM"
  return { h: parseInt(m[1], 10), m: m[2], ampm };
}

function to24Minutes(h, m, ap) {
  let hora24 = parseInt(h, 10);
  if (ap === 'AM' && hora24 === 12) hora24 = 0;
  if (ap === 'PM' && hora24 !== 12) hora24 += 12;
  return hora24 * 60 + parseInt(m, 10);
}


// ══════════════════════════════════════════════════════════════════
//  CARGA INICIAL DE ENVÍOS
// ══════════════════════════════════════════════════════════════════

async function cargarEnvios() {
  const contenedor = document.getElementById('envios-list');
  contenedor.innerHTML = `<div class="loading-state"><div class="spinner-dark"></div><p>Cargando envíos...</p></div>`;

  try {
    const { data, error } = await db
      .from('envios')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw error;

    todosEnvios = data || [];
    renderEnviosList();

  } catch (err) {
    console.error(err);
    contenedor.innerHTML = `<div class="no-results">Error al cargar envíos. Verifica tu conexión.</div>`;
  }
}

function renderEnviosList() {
  const contenedor    = document.getElementById('envios-list');
  const busqueda      = normalizarBusqueda(document.getElementById('filtro-busqueda').value);
  const filtroEstado  = document.getElementById('filtro-estado').value;
  const orden         = document.getElementById('filtro-orden').value;

  // Filtro de búsqueda de docentes: filtra envíos que contengan ese docente
  // (Se hace en cliente, ya que la búsqueda por docente es cruzada)
  let lista = [...todosEnvios];


  if (filtroEstado) {
    lista = lista.filter(e => e.estado === filtroEstado);
  }

  lista.sort((a, b) => {
    const da = new Date(a.creado_en);
    const db = new Date(b.creado_en);
    return orden === 'asc' ? da - db : db - da;
  });

  if (lista.length === 0) {
    contenedor.innerHTML = `<div class="no-results">No hay envíos que coincidan con los filtros.</div>`;
    return;
  }

  contenedor.innerHTML = lista.map(e => {
    const sel     = envioActual && envioActual.id === e.id ? 'selected' : '';
    const fecha   = formatearFechaBogota(e.creado_en);
    const estadoBadge = e.estado === 'publicado'
      ? `<span class="badge badge-publicado">● Publicado</span>`
      : `<span class="badge badge-pendiente">◑ Pendiente</span>`;
    const director = e.director || e.director || '—';

    return `
      <div class="envio-item ${sel}" onclick="seleccionarEnvio('${e.id}')" data-id="${e.id}">
        <div class="envio-item-facultad">${e.facultad}</div>
        <div class="envio-item-meta">
          ${estadoBadge}
          <span>${fecha}</span>
        </div>
        ${director !== '—' ? `<div style="font-size:11px;color:var(--gris);margin-top:3px">${director}</div>` : ''}
      </div>`;
  }).join('');
}


// ══════════════════════════════════════════════════════════════════
//  SELECCIONAR ENVÍO
// ══════════════════════════════════════════════════════════════════

async function seleccionarEnvio(envioId) {
  envioActual = todosEnvios.find(e => e.id === envioId);
  if (!envioActual) return;

  // Marcar seleccionado en sidebar
  document.querySelectorAll('.envio-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === envioId);
  });

  document.getElementById('empty-detail').style.display  = 'none';
  document.getElementById('detail-content').style.display = 'block';

  hideErr('err-detail');
  hideInfo('info-detail');

  renderEnvioHeader();
  actualizarBtnPublicar();
  await cargarDocentes();
}

function renderEnvioHeader() {
  const e = envioActual;
  const director  = e.director || e.director || '—';
  const correoDir = e.correo_director || e.correo_director || '—';
  const fecha     = formatearFechaBogota(e.creado_en);
  const estadoBadge = e.estado === 'publicado'
    ? `<span class="badge badge-publicado">● Publicado</span>`
    : `<span class="badge badge-pendiente">◑ Pendiente</span>`;

  document.getElementById('envio-header').innerHTML = `
    <div class="envio-header-info">
      <div class="envio-header-title">${e.facultad}</div>
      <div class="envio-header-meta">
        ${estadoBadge}
        <span>Enviado: ${fecha}</span>
        <span>Director: ${director}</span>
        ${correoDir !== '—' ? `<span>Correo: ${correoDir}</span>` : ''}
      </div>
    </div>
  `;
}

function actualizarBtnPublicar() {
  const btn = document.getElementById('btn-publicar');
  if (!btn) return;
  if (envioActual.estado === 'publicado') {
    btn.textContent = 'Despublicar';
    btn.classList.add('btn-ghost');
    btn.classList.remove('btn-primary');
  } else {
    btn.textContent = 'Publicar';
    btn.classList.remove('btn-ghost');
    btn.classList.add('btn-primary');
  }
}


// ══════════════════════════════════════════════════════════════════
//  CARGA DE DOCENTES DEL ENVÍO
// ══════════════════════════════════════════════════════════════════

async function cargarDocentes() {
  const contenedor = document.getElementById('docentes-list');
  contenedor.innerHTML = `<div class="loading-state"><div class="spinner-dark"></div><p>Cargando docentes...</p></div>`;

  try {
    const { data: docentes, error: e1 } = await db
      .from('docentes')
      .select('*')
      .eq('envio_id', envioActual.id)
      .order('docente', { ascending: true });

    if (e1) throw e1;

    if (!docentes || docentes.length === 0) {
      docentesActuales = [];
      contenedor.innerHTML = `<div class="no-results">Este envío no tiene docentes registrados. Puedes agregar uno con el botón de arriba.</div>`;
      return;
    }

    // Cargar materias y horarios en paralelo para cada docente
    const ids = docentes.map(d => d.id);

    const [{ data: materias, error: e2 }, { data: horarios, error: e3 }] = await Promise.all([
      db.from('materias').select('*').in('docente_id', ids),
      db.from('horarios').select('*').in('docente_id', ids)
    ]);

    if (e2) throw e2;
    if (e3) throw e3;

    // Agrupar por docente_id
    const matMap = {};
    const horMap = {};
    (materias || []).forEach(m => {
      if (!matMap[m.docente_id]) matMap[m.docente_id] = [];
      matMap[m.docente_id].push(m);
    });
    (horarios || []).forEach(h => {
      if (!horMap[h.docente_id]) horMap[h.docente_id] = [];
      horMap[h.docente_id].push(h);
    });

    docentesActuales = docentes.map(d => ({
      ...d,
      materias: matMap[d.id] || [],
      horarios: (horMap[d.id] || []).sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia))
    }));

    // Filtro de búsqueda (por nombre de docente)
    const busqueda = normalizarBusqueda(document.getElementById('filtro-busqueda').value);
    const visibles = busqueda
      ? docentesActuales.filter(d => normalizarBusqueda(d.docente).includes(busqueda))
      : docentesActuales;

    renderDocentes(visibles);

  } catch (err) {
    console.error(err);
    contenedor.innerHTML = `<div class="no-results">Error al cargar docentes.</div>`;
  }
}

function renderDocentes(lista) {
  const contenedor = document.getElementById('docentes-list');

  if (lista.length === 0) {
    contenedor.innerHTML = `<div class="no-results">No hay docentes que coincidan con la búsqueda.</div>`;
    return;
  }

  contenedor.innerHTML = lista.map((d, i) => {
    const avt       = iniciales(d.docente);
    const materias  = (d.materias || []).map(m => `<span class="materia-chip">${m.materia}</span>`).join('');
    const horarios  = (d.horarios || []).map(h => `
      <div class="info-horario-row">
        <span class="info-dia">${h.dia}</span>
        <span class="info-hora">${h.hora_inicio} – ${h.hora_fin}</span>
        <span class="info-sede">Sede ${h.sede}</span>
      </div>`).join('');

    const obsHtml = d.observaciones
      ? `<div class="info-section">
           <div class="info-section-title">Observaciones</div>
           <p style="font-size:13px;color:var(--gris);line-height:1.6">${d.observaciones}</p>
         </div>`
      : '';

    const enlaceHtml = d.enlace
      ? `<div class="info-section">
           <div class="info-section-title">Enlace</div>
           <a href="${d.enlace}" target="_blank" rel="noopener noreferrer"
              style="font-size:13px;color:var(--azul-med);word-break:break-all;">${d.enlace}</a>
         </div>`
      : '';

    return `
      <div class="docente-card" id="dc-${d.id}">
        <div class="docente-card-header" onclick="toggleDocente('${d.id}')">
          <div class="docente-avatar">${avt}</div>
          <div class="docente-card-info">
            <div class="docente-card-name">${d.docente}</div>
            <div class="docente-card-email">${d.correo_docente}</div>
          </div>
          <div class="docente-card-actions" onclick="event.stopPropagation()">
            <button class="btn btn-ghost" style="padding:5px 12px;font-size:12px"
              onclick="abrirModalDocente('${d.id}')">Editar</button>
            <button class="btn-danger" style="padding:5px 12px;font-size:12px"
              onclick="confirmarEliminarDocente('${d.id}', '${d.docente.replace(/'/g,"\\'")}')">Eliminar</button>
          </div>
          <span class="chevron-icon">▼</span>
        </div>
        <div class="docente-card-body">
          ${materias ? `<div class="info-section">
            <div class="info-section-title">Materias</div>
            <div>${materias}</div>
          </div>` : ''}
          ${horarios ? `<div class="info-section">
            <div class="info-section-title">Horarios de atención</div>
            ${horarios}
          </div>` : ''}
          ${obsHtml}
          ${enlaceHtml}
        </div>
      </div>`;
  }).join('');
}

function toggleDocente(docenteId) {
  const card = document.getElementById(`dc-${docenteId}`);
  if (card) card.classList.toggle('open');
}


// ══════════════════════════════════════════════════════════════════
//  FILTROS
// ══════════════════════════════════════════════════════════════════

document.getElementById('filtro-busqueda').addEventListener('input', () => {
  renderEnviosList();
  // Si hay envío seleccionado, refiltrar docentes también
  if (envioActual && docentesActuales.length > 0) {
    const busqueda = normalizarBusqueda(document.getElementById('filtro-busqueda').value);
    const visibles = busqueda
      ? docentesActuales.filter(d => normalizarBusqueda(d.docente).includes(busqueda))
      : docentesActuales;
    renderDocentes(visibles);
  }
});

document.getElementById('filtro-estado').addEventListener('change',   renderEnviosList);
document.getElementById('filtro-orden').addEventListener('change',    renderEnviosList);

function limpiarFiltros() {
  document.getElementById('filtro-busqueda').value  = '';
  document.getElementById('filtro-estado').value    = '';
  document.getElementById('filtro-orden').value     = 'desc';
  renderEnviosList();
  if (docentesActuales.length > 0) renderDocentes(docentesActuales);
}


// ══════════════════════════════════════════════════════════════════
//  PUBLICAR / DESPUBLICAR
// ══════════════════════════════════════════════════════════════════

async function togglePublicar() {
  if (!envioActual) return;

  const nuevoEstado = envioActual.estado === 'publicado' ? 'pendiente' : 'publicado';
  const btn = document.getElementById('btn-publicar');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const { error } = await db
      .from('envios')
      .update({ estado: nuevoEstado })
      .eq('id', envioActual.id);

    if (error) throw error;

    // Actualizar cache local
    envioActual.estado = nuevoEstado;
    todosEnvios = todosEnvios.map(e => e.id === envioActual.id ? { ...e, estado: nuevoEstado } : e);

    renderEnvioHeader();
    actualizarBtnPublicar();
    renderEnviosList();

    mostrarToast(
      nuevoEstado === 'publicado' ? 'Envío publicado correctamente.' : 'Envío despublicado.',
      nuevoEstado === 'publicado' ? 'ok' : ''
    );

  } catch (err) {
    console.error(err);
    mostrarToast('Error al cambiar el estado del envío.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
    actualizarBtnPublicar();
  }
}


// ══════════════════════════════════════════════════════════════════
//  ELIMINAR ENVÍO COMPLETO
// ══════════════════════════════════════════════════════════════════

function confirmarEliminarEnvio() {
  if (!envioActual) return;

  document.getElementById('confirm-titulo').textContent = 'Eliminar envío completo';
  document.getElementById('confirm-msg').textContent =
    `¿Estás seguro de que deseas eliminar el envío completo de "${envioActual.facultad}"? Esto borrará todos los docentes, materias y horarios asociados. Esta acción no se puede deshacer.`;

  callbackConfirm = eliminarEnvio;
  abrirModalConfirm();
}

async function eliminarEnvio() {
  cerrarModalConfirm();
  showInfo('info-detail', 'Eliminando envío...');

  try {
    // Obtener todos los docentes del envío para eliminar en cascada
    const { data: docs } = await db
      .from('docentes')
      .select('id')
      .eq('envio_id', envioActual.id);

    const docIds = (docs || []).map(d => d.id);

    if (docIds.length > 0) {
      await db.from('horarios').delete().in('docente_id', docIds);
      await db.from('materias').delete().in('docente_id', docIds);
      await db.from('docentes').delete().in('id', docIds);
    }

    const { error } = await db.from('envios').delete().eq('id', envioActual.id);
    if (error) throw error;

    // Actualizar cache y limpiar UI
    todosEnvios = todosEnvios.filter(e => e.id !== envioActual.id);
    envioActual = null;
    docentesActuales = [];

    renderEnviosList();

    document.getElementById('empty-detail').style.display   = 'block';
    document.getElementById('detail-content').style.display = 'none';

    mostrarToast('Envío eliminado correctamente.', 'ok');

  } catch (err) {
    console.error(err);
    hideInfo('info-detail');
    mostrarToast('Error al eliminar el envío.', 'error');
  }
}


// ══════════════════════════════════════════════════════════════════
//  ELIMINAR DOCENTE
// ══════════════════════════════════════════════════════════════════

function confirmarEliminarDocente(docenteId, nombreDocente) {
  document.getElementById('confirm-titulo').textContent = 'Eliminar docente';
  document.getElementById('confirm-msg').textContent =
    `¿Seguro que deseas eliminar a "${nombreDocente}" y toda su información (materias, horarios, observaciones)?`;

  callbackConfirm = () => eliminarDocente(docenteId);
  abrirModalConfirm();
}

async function eliminarDocente(docenteId) {
  cerrarModalConfirm();

  try {
    await db.from('horarios').delete().eq('docente_id', docenteId);
    await db.from('materias').delete().eq('docente_id', docenteId);
    const { error } = await db.from('docentes').delete().eq('id', docenteId);
    if (error) throw error;

    // Actualizar cache
    docentesActuales = docentesActuales.filter(d => d.id !== docenteId);
    renderDocentes(docentesActuales);
    mostrarToast('Docente eliminado correctamente.', 'ok');

  } catch (err) {
    console.error(err);
    mostrarToast('Error al eliminar el docente.', 'error');
  }
}


// ══════════════════════════════════════════════════════════════════
//  MODAL DOCENTE: EDITAR / AGREGAR
// ══════════════════════════════════════════════════════════════════

function abrirModalDocente(docenteId) {
  docenteEditando = docenteId
    ? docentesActuales.find(d => d.id === docenteId) || null
    : null;

  const esNuevo = !docenteEditando;
  document.getElementById('modal-docente-titulo').textContent = esNuevo ? 'Agregar docente' : 'Editar docente';
  document.getElementById('btn-guardar-docente').textContent  = esNuevo ? 'Agregar docente' : 'Guardar cambios';

  renderModalDocente();
  document.getElementById('modal-docente').style.display = 'flex';
  hideErr('err-modal');
}

function cerrarModalDocente(event) {
  if (event && event.target !== document.getElementById('modal-docente')) return;
  document.getElementById('modal-docente').style.display = 'none';
  docenteEditando = null;
}

function renderModalDocente() {
  const d      = docenteEditando;
  const esNuevo = !d;

  const nombre  = esNuevo ? '' : d.docente;
  const correo  = esNuevo ? '' : d.correo_docente;
  const obs     = esNuevo ? '' : (d.observaciones || '');
  const enlace  = esNuevo ? '' : (d.enlace || '');
  const materiasTexto = esNuevo ? '' : (d.materias || []).map(m => m.materia).join(', ');
  const horarios = esNuevo ? [] : d.horarios;


  // Horarios HTML
  const horariosHtml = horarios.length > 0
    ? horarios.map((h, i) => buildHorarioRow(h.dia, h.hora_inicio, h.hora_fin, h.sede, i)).join('')
    : buildHorarioRow('', '', '', '', 0);

  document.getElementById('modal-docente-body').innerHTML = `
    <div class="form-row" style="margin-bottom:.5rem">
      <div class="form-group">
        <label for="m-nombre">Nombre completo *</label>
        <input type="text" id="m-nombre" value="${nombre}" placeholder="Nombre del docente" autocomplete="off"/>
      </div>
      <div class="form-group">
        <label for="m-correo">Correo institucional *</label>
        <input type="email" id="m-correo" value="${correo}" placeholder="docente@profesores.uniajc.edu.co" autocomplete="off"/>
      </div>
    </div>

    <hr class="modal-divider"/>

    <div class="form-group">
      <label for="m-materias-input">Materias que atiende *</label>
      <p style="font-size:12px;color:var(--gris);margin:4px 0 8px 0">
        Separa cada materia con coma o punto y coma. <br> Ej: Cálculo, Álgebra; Física
      </p>
      <textarea id="m-materias-input" rows="2" style="resize:none"
        placeholder="Cálculo, Álgebra lineal; Física...">${materiasTexto}</textarea>
    </div>

    <hr class="modal-divider"/>

    <div class="form-group">
      <label style="margin-bottom:.5rem;display:block">Horarios de atención *</label>
      <div id="m-horarios-container">
        ${horariosHtml}
      </div>
      <button class="btn-add-inline" type="button" onclick="addHorarioRow()">+ Agregar horario</button>
    </div>

    <hr class="modal-divider"/>

    <div class="form-group">
      <label for="m-obs">Observaciones</label>
      <textarea id="m-obs" rows="2" maxlength="150" style="resize:none"
        placeholder="Información adicional...">${obs}</textarea>
      <span id="m-obs-count" style="font-size:11px;color:var(--gris)">${obs.length} / 150</span>
    </div>

    <div class="form-group">
      <label for="m-enlace">Enlace (opcional)</label>
      <input type="url" id="m-enlace" value="${enlace}" placeholder="https://..."/>
    </div>
  `;

  // Contador de observaciones
  document.getElementById('m-obs').addEventListener('input', function() {
    document.getElementById('m-obs-count').textContent = `${this.value.length} / 150`;
  });


// Filtro y normalización de materias (misma lógica que en registro)
  const matEl = document.getElementById('m-materias-input');
  matEl.addEventListener('input', function() {
    this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s,;\/]/g, '');
  });
  matEl.addEventListener('blur', function() {
    this.value = reemplazarNumerosRomanos(this.value);
  });

}




// ── Builders de filas ──────────────────────────────────────────────

let _matCounter = 0;
let _horCounter = 0;



function buildHorarioRow(dia, horaIni, horaFin, sede, idx) {
  _horCounter++;
  const rid   = `hor-${_horCounter}`;
  const iniParsed = parsearHora(horaIni);
  const finParsed = parsearHora(horaFin);

  const diasOpts = `<option value="">Seleccione</option>` +
    DIAS.map(d => `<option ${d === dia ? 'selected' : ''}>${d}</option>`).join('');
  const sedesOpts = `<option value="">Seleccione</option>` +
    SEDES.map(s => `<option ${s === sede ? 'selected' : ''}>${s}</option>`).join('');

  const buildSelectHora = (prefix, p) => {
    const horaOpts = HORAS_OPTS.map(h =>
      `<option value="${h}" ${h === p.h ? 'selected' : ''}>${String(h).padStart(2,'0')}</option>`
    ).join('');
    const minOpts = MINUTOS_OPTS.map(m =>
      `<option value="${m}" ${m === p.m ? 'selected' : ''}>${m}</option>`
    ).join('');
    return `
      <div class="time-picker" style="gap:3px">
        <select class="sel-hora" id="${prefix}-hora" aria-label="Hora">${horaOpts}</select>
        <span class="colon">:</span>
        <select class="sel-min" id="${prefix}-min" aria-label="Min">${minOpts}</select>
        <select class="sel-ampm" id="${prefix}-ampm" aria-label="AM/PM">
          <option value="AM" ${p.ampm === 'AM' ? 'selected' : ''}>A.M.</option>
          <option value="PM" ${p.ampm === 'PM' ? 'selected' : ''}>P.M.</option>
        </select>
      </div>`;
  };

  return `
    <div class="modal-horario-row" id="${rid}">
      <div class="form-group">
        <label>Día</label>
        <select class="sel-dia">${diasOpts}</select>
      </div>
      <div class="form-group">
        <label>Inicio</label>
        ${buildSelectHora(`${rid}-ini`, iniParsed)}
      </div>
      <div class="form-group">
        <label>Fin</label>
        ${buildSelectHora(`${rid}-fin`, finParsed)}
      </div>
      <div class="form-group">
        <label>Sede</label>
        <select class="sel-sede">${sedesOpts}</select>
      </div>
      <button class="btn-remove" onclick="document.getElementById('${rid}').remove()" title="Eliminar">×</button>
    </div>`;
}

function addHorarioRow() {
  const c = document.getElementById('m-horarios-container');
  const tmp = document.createElement('div');
  tmp.innerHTML = buildHorarioRow('', '', '', '', 0);
  c.appendChild(tmp.firstElementChild);
}


// ── Guardar docente (crear o actualizar) ───────────────────────────

async function guardarDocente() {
  hideErr('err-modal');

  const nombre = document.getElementById('m-nombre').value.trim().toUpperCase();
  const correo = document.getElementById('m-correo').value.trim().toLowerCase();
  const obs    = document.getElementById('m-obs').value.trim();
  const enlace = document.getElementById('m-enlace').value.trim() || null;

  if (!nombre) return showErr('err-modal', 'El nombre del docente es obligatorio.');
  if (!correo || !correo.includes('@')) return showErr('err-modal', 'Ingresa un correo institucional válido.');

  // Recolectar materias (separadas por coma o punto y coma, normalizadas y ordenadas)
  const materiasRaw = document.getElementById('m-materias-input')?.value || '';
  const materias = materiasRaw
    .split(/[,;]/)
    .map(m => normalizar(m))
    .filter(Boolean)
    .sort();

  if (materias.length === 0) return showErr('err-modal', 'Agrega al menos una materia.');

  // Recolectar horarios
  const horRows = document.querySelectorAll('#m-horarios-container .modal-horario-row');
  const horarios = [];
  for (const row of horRows) {
    const rid   = row.id;
    const dia   = row.querySelector('.sel-dia')?.value;
    const sede  = row.querySelector('.sel-sede')?.value;
    if (!dia  || dia  === '') return showErr('err-modal', 'Selecciona el día en todos los horarios.');
    if (!sede || sede === '') return showErr('err-modal', 'Selecciona la sede en todos los horarios.');

    const iniH  = document.getElementById(`${rid}-ini-hora`)?.value;
    const iniM  = document.getElementById(`${rid}-ini-min`)?.value;
    const iniAP = document.getElementById(`${rid}-ini-ampm`)?.value;
    const finH  = document.getElementById(`${rid}-fin-hora`)?.value;
    const finM  = document.getElementById(`${rid}-fin-min`)?.value;
    const finAP = document.getElementById(`${rid}-fin-ampm`)?.value;

    const iniMin = to24Minutes(iniH, iniM, iniAP);
    const finMin = to24Minutes(finH, finM, finAP);

    if (finMin <= iniMin) return showErr('err-modal', 'La hora de fin debe ser posterior a la de inicio.');

    const horaInicio = `${String(iniH).padStart(2,'0')}:${iniM} ${iniAP.replace('AM','A.M.').replace('PM','P.M.')}`;
    const horaFin    = `${String(finH).padStart(2,'0')}:${finM} ${finAP.replace('AM','A.M.').replace('PM','P.M.')}`;
    horarios.push({ dia, hora_inicio: horaInicio, hora_fin: horaFin, sede });
  }
  if (horarios.length === 0) return showErr('err-modal', 'Agrega al menos un horario.');

  // Ordenar horarios por día
  horarios.sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia));

  const btn = document.getElementById('btn-guardar-docente');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const esNuevo = !docenteEditando;

    let docenteId;

    if (esNuevo) {
      // ── CREAR ────────────────────────────────────────────────
      const { data: docData, error: eDoc } = await db
        .from('docentes')
        .insert({
          docente:        nombre,
          correo_docente: correo,
          facultad:       envioActual.facultad,
          observaciones:  obs || null,
          enlace,
          director:         envioActual.director || null,
          correo_director:  envioActual.correo_director || null,
          envio_id:       envioActual.id
        })
        .select()
        .single();

      if (eDoc) throw eDoc;
      docenteId = docData.id;

    } else {
      // ── ACTUALIZAR INFO BÁSICA ────────────────────────────────
      docenteId = docenteEditando.id;
      const { error: eUpd } = await db
        .from('docentes')
        .update({
  docente:        nombre,
  correo_docente: correo,
  observaciones:  obs || null,
  enlace,
  director:         envioActual.director || null,
  correo_director:  envioActual.correo_director || null
})
        .eq('id', docenteId);

      if (eUpd) throw eUpd;

      // Eliminar materias y horarios anteriores para reemplazar
      await db.from('materias').delete().eq('docente_id', docenteId);
      await db.from('horarios').delete().eq('docente_id', docenteId);
    }

    // Insertar materias
    const { error: eMat } = await db
      .from('materias')
      .insert(materias.map(m => ({ docente_id: docenteId, materia: m })));
    if (eMat) throw eMat;

    // Insertar horarios
    const { error: eHor } = await db
      .from('horarios')
      .insert(horarios.map(h => ({ docente_id: docenteId, ...h })));
    if (eHor) throw eHor;

    cerrarModalDocente();
    mostrarToast(esNuevo ? 'Docente agregado correctamente.' : 'Cambios guardados correctamente.', 'ok');
    await cargarDocentes();

  } catch (err) {
    console.error(err);
    showErr('err-modal', 'Error al guardar. Verifica los datos e inténtalo de nuevo.');
  } finally {
    btn.disabled = false;
    btn.textContent = docenteEditando ? 'Guardar cambios' : 'Agregar docente';
  }
}


// ══════════════════════════════════════════════════════════════════
//  MODAL LISTADO POR FACULTAD
// ══════════════════════════════════════════════════════════════════

async function abrirModalListado() {
  document.getElementById('modal-listado').style.display = 'flex';
  document.getElementById('modal-listado-body').innerHTML = `
    <div class="loading-state"><div class="spinner-dark"></div><p>Generando listado...</p></div>`;

  try {
    // Traer todos los docentes agrupados por facultad (solo publicados o todos según preferencia)
    const { data: docentes, error } = await db
      .from('docentes')
      .select('docente, facultad')
      .order('facultad', { ascending: true })
      .order('docente',  { ascending: true });

    if (error) throw error;

    // Agrupar
    const grupos = {};
    (docentes || []).forEach(d => {
      if (!grupos[d.facultad]) grupos[d.facultad] = [];
      // Evitar duplicados dentro de la misma facultad
      const nombre = d.docente.trim();
      if (!grupos[d.facultad].includes(nombre)) {
        grupos[d.facultad].push(nombre);
      }
    });

    const facultades = Object.keys(grupos).sort();

    if (facultades.length === 0) {
      document.getElementById('modal-listado-body').innerHTML = `
        <div class="no-results">No hay docentes registrados aún.</div>`;
      return;
    }

    document.getElementById('modal-listado-body').innerHTML = facultades.map(fac => {
      const lista = grupos[fac].join('; ');
      return `
        <div class="listado-facultad-bloque">
          <div class="listado-facultad-nombre">${fac}</div>
          <div class="listado-docentes-texto" id="lista-${limpiarId(fac)}">${lista}</div>
          <button class="btn-copy" onclick="copiarListado('${limpiarId(fac)}', this)">
            Copiar
          </button>
        </div>`;
    }).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('modal-listado-body').innerHTML = `
      <div class="no-results">Error al cargar el listado.</div>`;
  }
}

function limpiarId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '_');
}

function copiarListado(facId, btn) {
  const el = document.getElementById(`lista-${facId}`);
  if (!el) return;

  const nombreFac = el.closest('.listado-facultad-bloque').querySelector('.listado-facultad-nombre').textContent;
  const texto = `${nombreFac}\n${el.textContent}`;

  navigator.clipboard.writeText(texto).then(() => {
    btn.textContent = '✓ Copiado';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copiar';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    mostrarToast('No se pudo copiar. Selecciona el texto manualmente.', 'error');
  });
}

function cerrarModalListado(event) {
  if (event && event.target !== document.getElementById('modal-listado')) return;
  document.getElementById('modal-listado').style.display = 'none';
}


// ══════════════════════════════════════════════════════════════════
//  MODAL CONFIRMACIÓN
// ══════════════════════════════════════════════════════════════════

function abrirModalConfirm() {
  document.getElementById('modal-confirm').style.display = 'flex';
  document.getElementById('btn-confirm-ok').onclick = () => {
    if (callbackConfirm) callbackConfirm();
    callbackConfirm = null;
  };
}

function cerrarModalConfirm(event) {
  if (event && event.target !== document.getElementById('modal-confirm')) return;
  document.getElementById('modal-confirm').style.display = 'none';
  callbackConfirm = null;
}

// ══════════════════════════════════════════════════════════════════
//  MODAL ENLACES VIRTUALES — BECARIOS
// ══════════════════════════════════════════════════════════════════

let enlacesBecarios   = [];
let enlaceEditandoId  = null;

async function abrirModalEnlaces() {
  document.getElementById('modal-enlaces').style.display = 'flex';
  document.getElementById('nuevo-enlace-nombre').value = '';
  document.getElementById('nuevo-enlace-url').value = '';
  hideErr('err-enlace');
  enlaceEditandoId = null;
  await cargarEnlacesBecarios();
}

function cerrarModalEnlaces(event) {
  if (event && event.target !== document.getElementById('modal-enlaces')) return;
  document.getElementById('modal-enlaces').style.display = 'none';
  enlaceEditandoId = null;
}

async function cargarEnlacesBecarios() {
  const contenedor = document.getElementById('enlaces-list');
  contenedor.innerHTML = `<div class="loading-state"><div class="spinner-dark"></div><p>Cargando enlaces...</p></div>`;

  try {
    const { data, error } = await db
      .from('becarios_virtual')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    enlacesBecarios = data || [];
    renderEnlacesBecarios();

  } catch (err) {
    console.error(err);
    contenedor.innerHTML = `<div class="no-results">Error al cargar los enlaces.</div>`;
  }
}

function renderEnlacesBecarios() {
  const contenedor = document.getElementById('enlaces-list');

  if (enlacesBecarios.length === 0) {
    contenedor.innerHTML = `<div class="no-results">No hay enlaces registrados aún.</div>`;
    return;
  }

  contenedor.innerHTML = enlacesBecarios.map(e => {
    if (enlaceEditandoId === e.id) {
      return `
        <div class="enlace-item enlace-item-editando" id="enlace-${e.id}">
          <input type="text" id="edit-nombre-${e.id}" value="${e.nombre.replace(/"/g,'&quot;')}" placeholder="Nombre"/>
          <input type="url" id="edit-url-${e.id}" value="${e.enlace.replace(/"/g,'&quot;')}" placeholder="https://..."/>
          <div class="enlace-item-actions">
            <button class="btn btn-primary" style="padding:5px 12px;font-size:12px" onclick="guardarEdicionEnlace('${e.id}')">Guardar</button>
            <button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="cancelarEdicionEnlace()">Cancelar</button>
          </div>
        </div>`;
    }

    return `
      <div class="enlace-item" id="enlace-${e.id}">
        <div class="enlace-item-info">
          <div class="enlace-item-nombre">${e.nombre}</div>
          <a href="${e.enlace}" target="_blank" rel="noopener noreferrer" class="enlace-item-url">${e.enlace}</a>
        </div>
        <div class="enlace-item-actions">
          <button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="editarEnlaceInline('${e.id}')">Editar</button>
          <button class="btn-danger" style="padding:5px 12px;font-size:12px" onclick="confirmarEliminarEnlace('${e.id}', '${e.nombre.replace(/'/g,"\\'")}')">Eliminar</button>
        </div>
      </div>`;
  }).join('');
}

function editarEnlaceInline(id) {
  enlaceEditandoId = id;
  renderEnlacesBecarios();
}

function cancelarEdicionEnlace() {
  enlaceEditandoId = null;
  renderEnlacesBecarios();
}

async function guardarEdicionEnlace(id) {
  const nombre = document.getElementById(`edit-nombre-${id}`).value.trim();
  const enlace = document.getElementById(`edit-url-${id}`).value.trim();

  if (!nombre) return mostrarToast('Ingresa un nombre para el enlace.', 'error');
  if (!enlace || !/^https?:\/\//i.test(enlace)) return mostrarToast('Ingresa una URL válida (debe empezar con http:// o https://).', 'error');

  try {
    const { error } = await db
      .from('becarios_virtual')
      .update({ nombre, enlace })
      .eq('id', id);

    if (error) throw error;

    enlaceEditandoId = null;
    mostrarToast('Enlace actualizado correctamente.', 'ok');
    await cargarEnlacesBecarios();

  } catch (err) {
    console.error(err);
    mostrarToast('Error al guardar el enlace.', 'error');
  }
}

async function agregarEnlaceBecario() {
  const nombreEl = document.getElementById('nuevo-enlace-nombre');
  const urlEl    = document.getElementById('nuevo-enlace-url');
  const nombre   = nombreEl.value.trim();
  const enlace   = urlEl.value.trim();

  hideErr('err-enlace');

  if (!nombre) return showErr('err-enlace', 'Ingresa un nombre para el enlace.');
  if (!enlace || !/^https?:\/\//i.test(enlace)) return showErr('err-enlace', 'Ingresa una URL válida (debe empezar con http:// o https://).');

  const btn = document.getElementById('btn-agregar-enlace');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const { error } = await db
      .from('becarios_virtual')
      .insert({ nombre, enlace });

    if (error) throw error;

    nombreEl.value = '';
    urlEl.value = '';
    mostrarToast('Enlace agregado correctamente.', 'ok');
    await cargarEnlacesBecarios();

  } catch (err) {
    console.error(err);
    showErr('err-enlace', 'Error al agregar el enlace. Inténtalo de nuevo.');
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Agregar';
  }
}

function confirmarEliminarEnlace(id, nombre) {
  document.getElementById('confirm-titulo').textContent = 'Eliminar enlace';
  document.getElementById('confirm-msg').textContent =
    `¿Estás seguro de que deseas eliminar el enlace "${nombre}"? Esta acción no se puede deshacer.`;

  callbackConfirm = () => eliminarEnlaceBecario(id);
  abrirModalConfirm();
}

async function eliminarEnlaceBecario(id) {
  cerrarModalConfirm();

  try {
    const { error } = await db
      .from('becarios_virtual')
      .delete()
      .eq('id', id);

    if (error) throw error;

    mostrarToast('Enlace eliminado.', 'ok');
    await cargarEnlacesBecarios();

  } catch (err) {
    console.error(err);
    mostrarToast('Error al eliminar el enlace.', 'error');
  }
}


// ══════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  if (!sessionStorage.getItem('adminAuth')) {
    alert('Debe iniciar sesión como administrador para acceder a esta página.');
    window.location.href = '../../import/admin.html';
    return;
  }
  cargarEnvios();
});
