const SUPABASE_URL      = 'https://imagipcgbptyjwpmpakd.supabase.co';  
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYWdpcGNnYnB0eWp3cG1wYWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTI1NTQsImV4cCI6MjA5Nzk4ODU1NH0.fB61FNWsCqVm6HFvGRIqtZx3RI_pTjYL5TtLGZLAgmE';


const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DIAS  = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const SEDES = ['Norte','Sur','Virtual'];

const HORAS_OPTS   = [1,2,3,4,5,6,7,8,9,10,11,12];
const MINUTOS_OPTS = ['00','15','30','45'];

function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideErr(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.style.display = 'none';
}


function buildTimePicker(prefix) {
  const horaOpts  = HORAS_OPTS.map(h => `<option value="${h}">${String(h).padStart(2,'0')}</option>`).join('');
  const minOpts   = MINUTOS_OPTS.map(m => `<option value="${m}">${m}</option>`).join('');
  return `
    <div class="time-picker" id="${prefix}-picker">
      <select class="sel-hora" id="${prefix}-hora" aria-label="Hora">${horaOpts}</select>
      <span class="colon">:</span>
      <select class="sel-min" id="${prefix}-min" aria-label="Minutos">${minOpts}</select>
      <select class="sel-ampm" id="${prefix}-ampm" aria-label="AM o PM">
        <option value="AM">A.M.</option>
        <option value="PM">P.M.</option>
      </select>
    </div>`;
}


function to24Minutes(h, m, ap) {
  let hora24 = parseInt(h, 10);
  if (ap === 'AM' && hora24 === 12) hora24 = 0;
  if (ap === 'PM' && hora24 !== 12) hora24 += 12;
  return hora24 * 60 + parseInt(m, 10);
}


// ── Filtros de campos ─────────────────────────

function soloLetras(e) {
  e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
}

const ROMANOS = { 1:'I', 2:'II', 3:'III', 4:'IV', 5:'V', 6:'VI', 7:'VII', 8:'VIII', 9:'IX', 10:'X' };

function reemplazarNumerosRomanos(texto) {
  return texto.replace(/\b(10|[1-9])\b/g, n => ROMANOS[n] || n);
}

document.getElementById('decano-nombre').addEventListener('input', soloLetras);


function goStep2() {
  const nombre   = document.getElementById('decano-nombre').value.trim();
  const correo   = document.getElementById('decano-correo').value.trim();
  const facultad = document.getElementById('decano-facultad').value;

  if (!nombre)   return showErr('err-step1', 'Por favor ingresa nombre del decano.');
  if (!correo || !correo.includes('@'))
    return showErr('err-step1', 'Ingresa un correo válido.');
  if (!facultad) return showErr('err-step1', 'Selecciona una facultad.');

  hideErr('err-step1');

  document.getElementById('info-facultad').innerHTML =
  `Facultad: ${facultad}<br>Decano: ${normalizar(nombre)}`;

  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';

  // Agregar primer docente si el contenedor está vacío
  if (document.getElementById('docentes-container').children.length === 0) {
    addDocente();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goStep1() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goStep3() {
  hideErr('err-step2');
  const docentes = collectDocentes();
  if (!docentes) return;

  renderResumen(docentes);
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step3').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goStep2Edit() {
  document.getElementById('step3').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}



// ── Builder de docentes ───────────────────────

// Contador interno para IDs únicos (no se usa para numeración visible)
let docIdCounter = 0;

function addDocente() {
  docIdCounter++;
  const id        = `doc-${docIdCounter}`;
  const container = document.getElementById('docentes-container');
  const numero    = container.children.length + 1; // Numeración por posición

  const div = document.createElement('div');
  div.className = 'docente-builder';
  div.id        = id;

  div.innerHTML = `
    <div class="builder-header" onclick="toggleBuilder('${id}')">
      <div>
        <p class="builder-title" id="${id}-title">Docente ${numero}</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="builder-chevron" id="${id}-chevron">▲</span>
        <button class="btn-remove" onclick="event.stopPropagation(); removeDocente('${id}')" title="Eliminar docente" aria-label="Eliminar docente">×</button>
      </div>
    </div>

    <div class="builder-body" id="${id}-body">
      <!-- Nombre y correo -->
      <div class="form-row" style="margin-bottom:.5rem">
        <div class="form-group">
          <label for="${id}-nombre">Nombre completo del docente *</label>
          <input type="text" id="${id}-nombre" placeholder="Nombre del docente"
            oninput="updateBuilderTitle('${id}')"/>
        </div>
        <div class="form-group">
          <label for="${id}-correo">Correo institucional *</label>
          <input type="email" id="${id}-correo" placeholder="docente@profesores.uniajc.edu.co"/>
        </div>
      </div>


      <!-- Materias -->
      <div class="form-group" style="margin-top:2.5rem">
      <label for="${id}-materias-input">Materias que atiende *</label>
      <p style="font-size:12px;color:var(--gris);margin:4px 0 8px 0">
      Separa cada materia con coma o punto y coma. <br> Ej: Cálculo, Álgebra; Física
      </p>
      <textarea id="${id}-materias-input" rows="2" style="resize:none"
      placeholder="Cálculo, Álgebra lineal; Física..."></textarea>
      </div>

      <!-- Horarios -->
      <div class="form-group" style="margin-top:2.5rem">
        <label>Horarios de atención *</label>
        <div id="${id}-horarios"></div>
        <button class="btn-add-inline" type="button" onclick="addHorario('${id}')">
          + Agregar horario
        </button>
      </div>

      <!-- Observaciones -->
<div class="form-group" style="margin-top:2.5rem">
  <label for="${id}-obs">Observaciones</label>
  <textarea id="${id}-obs" placeholder="Información adicional del docente..." maxlength="150" rows="2"
    style="resize:none"></textarea>
  <span id="${id}-obs-count" style="font-size:11px;color:var(--gris)">0 / 150</span>
</div>

<!-- Enlace -->
<div class="form-group" style="margin-top:1rem">
  <label for="${id}-enlace">Enlace (opcional)</label>
  <p style="font-size:12px;color:var(--gris);margin:4px 0 8px 0">
    Ej: Link de Meet, Teams, Zoom, etc.
  </p>
  <input type="url" id="${id}-enlace" placeholder="https://..."/>
</div>

    </div>
  `;

  container.appendChild(div);

  document.getElementById(`${id}-nombre`).addEventListener('input', soloLetras);

  const matEl = document.getElementById(`${id}-materias-input`);
  matEl.addEventListener('input', function() {
    this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s,;\/]/g, '');
  });
  matEl.addEventListener('blur', function() {
    this.value = reemplazarNumerosRomanos(this.value);
  });

  const obsEl = document.getElementById(`${id}-obs`);
  const cntEl = document.getElementById(`${id}-obs-count`);
  obsEl.addEventListener('input', () => {
    obsEl.value = obsEl.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,;:¿?¡!()-]/g, '');
    cntEl.textContent = `${obsEl.value.length} / 150`;
  });


  // Agregar primer horario automáticamente
  addHorario(id);

  // Foco en el campo nombre
  document.getElementById(`${id}-nombre`).focus();
}


function addHorario(docId) {
  const container = document.getElementById(`${docId}-horarios`);
  const rowId     = `${docId}-h${Date.now()}`;

  const diasOpts  = `<option value="">Seleccione</option>` + DIAS.map(d => `<option>${d}</option>`).join('');
const sedesOpts = `<option value="">Seleccione</option>` + SEDES.map(s => `<option>${s}</option>`).join('');

  const row = document.createElement('div');
  row.className = 'horario-builder-row';
  row.dataset.rowid = rowId;

  row.innerHTML = `
    <!-- Día -->
    <div class="form-group col-dia">
      <label>Día</label>
      <select class="sel-dia">${diasOpts}</select>
    </div>

    <!-- Hora inicio -->
    <div class="form-group">
      <label>Hora inicio</label>
      ${buildTimePicker(`${rowId}-ini`)}
    </div>

    <!-- Hora fin -->
<div class="form-group" style="position:relative">
  <label>Hora fin</label>
  ${buildTimePicker(`${rowId}-fin`)}
  <p class="horario-error" id="${rowId}-err">La hora fin debe ser posterior a la hora inicio.</p>
</div>

    <!-- Sede -->
    <div class="form-group col-sede">
      <label>Sede</label>
      <select class="sel-sede">${sedesOpts}</select>
    </div>

    <!-- Eliminar -->
    <div class="col-btn" style="padding-bottom:1px">
      <button class="btn-remove" onclick="removeHorarioRow(this)" title="Eliminar horario" aria-label="Eliminar horario">×</button>
    </div>
  `;

  container.appendChild(row);

  // Validar hora fin en tiempo real al cambiar cualquier selector
  ['hora','min','ampm'].forEach(part => {
    [`${rowId}-ini-${part}`, `${rowId}-fin-${part}`].forEach(selId => {
      const el = document.getElementById(selId);
      if (el) el.addEventListener('change', () => validateHorarioRow(row, rowId));
    });
  });
}


function validateHorarioRow(row, rowId) {
  const iniH  = document.getElementById(`${rowId}-ini-hora`)?.value;
  const iniM  = document.getElementById(`${rowId}-ini-min`)?.value;
  const iniAP = document.getElementById(`${rowId}-ini-ampm`)?.value;
  const finH  = document.getElementById(`${rowId}-fin-hora`)?.value;
  const finM  = document.getElementById(`${rowId}-fin-min`)?.value;
  const finAP = document.getElementById(`${rowId}-fin-ampm`)?.value;

  if (!iniH || !finH) return true; // Aún no están completos

  const iniMin = to24Minutes(iniH, iniM, iniAP);
  const finMin = to24Minutes(finH, finM, finAP);
  const errEl  = document.getElementById(`${rowId}-err`);

  if (finMin <= iniMin) {
    if (errEl) errEl.style.display = 'block';
    return false;
  } else {
    if (errEl) errEl.style.display = 'none';
    return true;
  }
}


function removeHorarioRow(btn) {
  btn.closest('.horario-builder-row').remove();
}


function updateBuilderTitle(docId) {
  const nombre  = document.getElementById(`${docId}-nombre`).value.trim();
  const titleEl = document.getElementById(`${docId}-title`);
  if (nombre) {
    const builders = [...document.querySelectorAll('.docente-builder')];
    const index    = builders.findIndex(b => b.id === docId);
    titleEl.textContent = `Docente ${index + 1}: ${normalizar(nombre)}`;
  } else {
    // Recuperar número por posición
    const builders = [...document.querySelectorAll('.docente-builder')];
    const index    = builders.findIndex(b => b.id === docId);
    titleEl.textContent = `Docente ${index + 1}`;
  }
}


function toggleBuilder(docId) {
  const body    = document.getElementById(`${docId}-body`);
  const chevron = document.getElementById(`${docId}-chevron`);
  const hidden  = body.style.display === 'none';
  body.style.display  = hidden ? 'block' : 'none';
  chevron.textContent = hidden ? '▲' : '▼';
}


function removeDocente(docId) {
  if (!confirm('¿Eliminar este docente?')) return;
  document.getElementById(docId).remove();
  // Renumerar después de eliminar
  renumerarDocentesSinNombre();
}


function renumerarDocentesSinNombre() {
  const builders = document.querySelectorAll('.docente-builder');
  builders.forEach((b, index) => {
    const nombre  = document.getElementById(`${b.id}-nombre`).value.trim();
    const titleEl = document.getElementById(`${b.id}-title`);
    if (nombre) {
      titleEl.textContent = `Docente ${index + 1}: ${normalizar(nombre)}`;
    } else {
      titleEl.textContent = `Docente ${index + 1}`;
    }
  });
}

// ── Recolectar datos ──────────────────────────

function collectDocentes() {
  const builders = document.querySelectorAll('.docente-builder');

  if (builders.length === 0) {
    showErr('err-step2', 'Agrega al menos un docente antes de continuar.');
    return null;
  }

  const result = [];

  for (const b of builders) {
    const id       = b.id;
    const nombre   = normalizar(document.getElementById(`${id}-nombre`).value);
    const correo   = document.getElementById(`${id}-correo`).value.trim().toLowerCase();
    const obsRaw = document.getElementById(`${id}-obs`)?.value || '';
    const observaciones = obsRaw.trim() ? normalizar(obsRaw) : '';
    const enlaceRaw = document.getElementById(`${id}-enlace`)?.value.trim() || '';
    const enlace = enlaceRaw || null;

    if (!nombre) {
      showErr('err-step2', 'Falta el nombre en uno de los docentes.');
      return null;
    }
    if (!correo || !correo.includes('@')) {
      showErr('err-step2', `Correo inválido en: ${nombre}`);
      return null;
    }

    // Materias
  const materiasRaw = document.getElementById(`${id}-materias-input`)?.value || '';
  const materias = materiasRaw
  .split(/[,;]/)
  .map(m => normalizar(m))
  .filter(Boolean)
  .sort();

if (materias.length === 0) {
  showErr('err-step2', `Agrega al menos una materia para: ${nombre}`);
  return null;
}

    // Horarios
    const horarioRows = document.querySelectorAll(`#${id}-horarios .horario-builder-row`);
    const horarios    = [];
    let horarioValido = true;

    for (const row of horarioRows) {
      const rowId = row.dataset.rowid;
      const dia   = row.querySelector('.sel-dia')?.value;
      const sede  = row.querySelector('.sel-sede')?.value;

if (!dia) {
  showErr('err-step2', `Selecciona un día en todos los horarios de: ${nombre}`);
  horarioValido = false;
  break;
}
if (!sede) {
  showErr('err-step2', `Selecciona una sede en todos los horarios de: ${nombre}`);
  horarioValido = false;
  break;
}

      const iniH  = document.getElementById(`${rowId}-ini-hora`)?.value;
      const iniM  = document.getElementById(`${rowId}-ini-min`)?.value;
      const iniAP = document.getElementById(`${rowId}-ini-ampm`)?.value;
      const finH  = document.getElementById(`${rowId}-fin-hora`)?.value;
      const finM  = document.getElementById(`${rowId}-fin-min`)?.value;
      const finAP = document.getElementById(`${rowId}-fin-ampm`)?.value;

      // Validar rango de horas
      if (!validateHorarioRow(row, rowId)) {
        showErr('err-step2', `La hora de fin debe ser posterior a la hora de inicio en uno de los horarios de: ${nombre}`);
        horarioValido = false;
        break;
      }

      const horaInicio = `${String(iniH).padStart(2,'0')}:${iniM} ${iniAP.replace('AM','A.M.').replace('PM','P.M.')}`;
      const horaFin    = `${String(finH).padStart(2,'0')}:${finM} ${finAP.replace('AM','A.M.').replace('PM','P.M.')}`;

      horarios.push({ dia, hora_inicio: horaInicio, hora_fin: horaFin, sede });
    }

    if (!horarioValido) return null;

    if (horarios.length === 0) {
      showErr('err-step2', `Agrega al menos un horario para: ${nombre}`);
      return null;
    }

    const ordenDias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    horarios.sort((a, b) => ordenDias.indexOf(a.dia) - ordenDias.indexOf(b.dia));

    result.push({ docente: nombre, correo_docente: correo, materias, horarios, observaciones, enlace });
  }

  return result;
}

// ── Resumen (paso 3) ──────────────────────────

function renderResumen(docentes) {
  const facultad = document.getElementById('decano-facultad').value;
  const decano   = normalizar(document.getElementById('decano-nombre').value);

  document.getElementById('resumen-header').innerHTML = `
    <div class="resumen-dato"><strong>Facultad:</strong> <span>${facultad}</span></div>
    <div class="resumen-dato"><strong>Decano:</strong> <span>${decano}</span></div>
    <div class="resumen-dato"><strong>Cantidad de docentes:</strong> <span>${docentes.length}</span></div>
  `;

  const lista = document.getElementById('resumen-lista');
  lista.innerHTML = docentes.map((d, i) => {
    const initials = d.docente.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    const horariosHTML = d.horarios.map(h => `
      <div class="horario-row">
        <span class="horario-dia">${h.dia}</span>
        <div>
          <p class="horario-hora">${h.hora_inicio} – ${h.hora_fin}</p>
          <p class="horario-lugar">Sede ${h.sede}</p>
        </div>
      </div>`).join('');

    return `
      <div class="summary-card" style="animation-delay:${i * .05}s">
        <div class="avatar">${initials}</div>
        <div style="flex:1;min-width:0">
          <p class="docente-nombre">${d.docente}</p>
          <a class="docente-email" href="mailto:${d.correo_docente}">${d.correo_docente}</a>
          <div style="margin:6px 0">
            ${d.materias.map(m => `<span class="badge badge-azul">${m}</span>`).join('')}
          </div>
          ${horariosHTML}
          ${d.observaciones || d.enlace ? `
  <div style="font-size:12px;color:var(--gris);margin:18px 0;padding:14px 0;border-top:1px solid var(--arena-dark)">
    ${d.observaciones ? `
      <p style="color:var(--azul);font-weight:400;margin:0 0 8px 0;">Observaciones:</p>
      <p style="margin:0 0 8px 0;line-height:1.5;">${d.observaciones}</p>
    ` : ''}
    ${d.enlace ? `
      <a href="${d.enlace}" target="_blank" rel="noopener noreferrer"
         style="color:var(--azul);text-decoration:underline;word-break:break-all;">
        ${d.enlace}
      </a>
    ` : ''}
  </div>
` : ''}
        </div>
      </div>`;
  }).join('');
}


function normalizar(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


// ── Envío a Supabase ──────────────────────────

async function submitTodo() {
  hideErr('err-step3');

  const docentes = collectDocentes();
  if (!docentes) { goStep2Edit(); return; }

  const facultad   = document.getElementById('decano-facultad').value;
  const decano     = normalizar(document.getElementById('decano-nombre').value);
  const decanoCorr = document.getElementById('decano-correo').value.trim().toLowerCase();

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Enviando...';

  try {
    // 1. Crear el envío
    const { data: envio, error: e0 } = await db
      .from('envios')
      .insert({
        facultad,
        decano:        decano,
        correo_decano: decanoCorr
      })
      .select()
      .single();

    if (e0) throw e0;

    for (const d of docentes) {
      // 2. Insertar docente
      const { data: doc, error: e1 } = await db
        .from('docentes')
        .insert({
          docente:        d.docente,
          correo_docente: d.correo_docente,
          facultad,
          observaciones:  d.observaciones || null,
          enlace:         d.enlace || null,
          decano:         decano,
          correo_decano:  decanoCorr,
          envio_id:       envio.id
        })
        .select()
        .single();

      if (e1) throw e1;

      // 3. Insertar materias
      const { error: e2 } = await db
        .from('materias')
        .insert(d.materias.map(m => ({ docente_id: doc.id, materia: m })));

      if (e2) throw e2;

      // 4. Insertar horarios
      const { error: e3 } = await db
        .from('horarios')
        .insert(d.horarios.map(h => ({ docente_id: doc.id, ...h })));

      if (e3) throw e3;
    }

    // Éxito
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step4').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => window.location.reload(), 5000);

  } catch (err) {
    console.error('Error al enviar a Supabase:', err);
    showErr('err-step3', 'Ocurrió un error al enviar. Verifica tu conexión e inténtalo de nuevo.');
    btn.disabled = false;
    btn.innerHTML = 'Enviar todos los horarios';
  }

  
}

