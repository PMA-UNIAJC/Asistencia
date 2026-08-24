const SUPABASE_URL      = 'https://imagipcgbptyjwpmpakd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYWdpcGNnYnB0eWp3cG1wYWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTI1NTQsImV4cCI6MjA5Nzk4ODU1NH0.fB61FNWsCqVm6HFvGRIqtZx3RI_pTjYL5TtLGZLAgmE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosDocentes = [];   
let docentesFiltrados = [];  
const cacheFacultades = {};  

const ORDEN_DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function mostrarSolo(idVisible) {
  const ids = [
    'estado-inicial',
    'estado-cargando',
    'estado-error',
    'estado-sin-horarios',
    'estado-sin-busqueda',
    'listado-docentes'
  ];
  ids.forEach(id => {
    document.getElementById(id).style.display = id === idVisible ? '' : 'none';
  });
}

function ocultarTodos() {
  ['estado-inicial','estado-cargando','estado-error',
   'estado-sin-horarios','estado-sin-busqueda','listado-docentes']
    .forEach(id => { document.getElementById(id).style.display = 'none'; });
}


async function onFacultadChange() {
  const facultad = document.getElementById('sel-facultad').value;

  const inputBusqueda = document.getElementById('input-busqueda');
  inputBusqueda.value = '';
  inputBusqueda.disabled = true;
  document.getElementById('btn-pdf').disabled = true;

  if (!facultad) {
    todosLosDocentes = [];
    mostrarSolo('estado-inicial');
    return;
  }

  // ── Si la facultad ya fue cargada antes, usar caché
  if (cacheFacultades.hasOwnProperty(facultad)) {
    todosLosDocentes = cacheFacultades[facultad];
    docentesFiltrados = [...todosLosDocentes];

    if (todosLosDocentes.length === 0) {
      mostrarSolo('estado-sin-horarios');
      return;
    }

    renderDocentes(facultad);
    inputBusqueda.disabled = false;
    document.getElementById('btn-pdf').disabled = false;
    return;
  }

  mostrarSolo('estado-cargando');

  try {
    const { data: enviosPublicados, error: e0 } = await db
      .from('envios')
      .select('id')
      .eq('facultad', facultad)
      .eq('estado', 'publicado');

    if (e0) throw e0;

    if (!enviosPublicados || enviosPublicados.length === 0) {
      todosLosDocentes = [];
      cacheFacultades[facultad] = [];
      mostrarSolo('estado-sin-horarios');
      return;
    }

    const envioIds = enviosPublicados.map(e => e.id);

    const { data: docentes, error: e1 } = await db
      .from('docentes')
      .select('id, docente, correo_docente, observaciones, enlace')
      .in('envio_id', envioIds)
      .order('docente', { ascending: true });

    if (e1) throw e1;

    if (!docentes || docentes.length === 0) {
      todosLosDocentes = [];
      cacheFacultades[facultad] = [];
      mostrarSolo('estado-sin-horarios');
      return;
    }

    const docenteIds = docentes.map(d => d.id);

    // ── 2. Traer materias ─────────────────────────────────────
    const { data: materias, error: e2 } = await db
      .from('materias')
      .select('docente_id, materia')
      .in('docente_id', docenteIds)
      .order('materia', { ascending: true });

    if (e2) throw e2;

    // ── 3. Traer horarios ─────────────────────────────────────
    const { data: horarios, error: e3 } = await db
      .from('horarios')
      .select('docente_id, dia, hora_inicio, hora_fin, sede')
      .in('docente_id', docenteIds);

    if (e3) throw e3;

    // ── 4. Combinar datos ─────────────────────────────────────
    const materiasMap = {};
    (materias || []).forEach(m => {
      if (!materiasMap[m.docente_id]) materiasMap[m.docente_id] = [];
      materiasMap[m.docente_id].push(m.materia);
    });

    const horariosMap = {};
    (horarios || []).forEach(h => {
      if (!horariosMap[h.docente_id]) horariosMap[h.docente_id] = [];
      horariosMap[h.docente_id].push(h);
    });

    todosLosDocentes = docentes.map(d => ({
      ...d,
      materias: (materiasMap[d.id] || []).sort((a, b) => a.localeCompare(b, 'es')),
      horarios: (horariosMap[d.id] || []).sort((a, b) =>
        ORDEN_DIAS.indexOf(a.dia) - ORDEN_DIAS.indexOf(b.dia)
      )
    }));

    cacheFacultades[facultad] = todosLosDocentes;

    // ── 5. Mostrar resultados ─────────────────────────────────
    docentesFiltrados = [...todosLosDocentes];
    renderDocentes(facultad);

    inputBusqueda.disabled = false;
    document.getElementById('btn-pdf').disabled = false;

  } catch (err) {
    console.error('Error al consultar Supabase:', err);
    const errEl = document.getElementById('estado-error');
    errEl.textContent = 'Ocurrió un error al cargar los horarios. Verifica tu conexión e intenta de nuevo.';
    mostrarSolo('estado-error');
  }
}


function onBusquedaInput() {
  const query = normalizar(document.getElementById('input-busqueda').value.trim());

function normalizar(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

  const facultad = document.getElementById('sel-facultad').value;

  if (!query) {
    docentesFiltrados = [...todosLosDocentes];
    renderDocentes(facultad);
    return;
  }

  docentesFiltrados = todosLosDocentes.filter(d => {
  const nombreCoincide = normalizar(d.docente).includes(query);
  const materiaCoincide = d.materias.some(m => normalizar(m).includes(query));
  return nombreCoincide || materiaCoincide;
});

  if (docentesFiltrados.length === 0) {
    document.getElementById('texto-busqueda-vacia').textContent = query;
    ocultarTodos();
    document.getElementById('estado-sin-busqueda').style.display = '';
    return;
  }

  renderDocentes(facultad);
}


function renderDocentes(facultad) {
  const container = document.getElementById('cards-container');
  const countEl   = document.getElementById('count-resultados');
  const chipEl    = document.getElementById('chip-facultad');

  chipEl.textContent = facultad;

  const total    = todosLosDocentes.length;
  const visibles = docentesFiltrados.length;
  countEl.innerHTML = visibles === total
    ? `<strong>${total}</strong> docente${total !== 1 ? 's' : ''}`
    : `Mostrando <strong>${visibles}</strong> de <strong>${total}</strong> docente${total !== 1 ? 's' : ''}`;

  container.innerHTML = docentesFiltrados.map(d => buildCard(d)).join('');
  mostrarSolo('listado-docentes');
}

function buildCard(d) {
  const iniciales = d.docente
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  // Materias
  const materiasHTML = d.materias.length
    ? d.materias.map(m => `<span class="badge badge-azul">${m}</span>`).join('')
    : `<span style="font-size:12px;color:var(--gris)">Sin materias registradas</span>`;

// Horarios
  const horariosHTML = d.horarios.length
    ? d.horarios.map(h => `
        <div class="horario-row">
          <span class="horario-dia">${h.dia}</span>
          <p class="horario-hora">${h.hora_inicio} – ${h.hora_fin}</p>
          <span class="horario-sede-badge${h.sede === 'Virtual' ? ' sede-virtual' : ''}">
            Sede ${h.sede}
          </span>
        </div>`).join('')
    : `<p style="font-size:12px;color:var(--gris);padding:6px 0">Sin horarios registrados</p>`;
    
  // Observaciones
  const obsHTML = d.observaciones
    ? `<div style="font-size:12px;color:var(--gris);margin-top:10px;padding-top:10px;border-top:1px solid var(--arena-dark)">
         <p style="color:var(--azul);font-weight:500;margin:0 0 4px 0;">Observaciones</p>
         <p style="margin:0;line-height:1.5;">${d.observaciones}</p>
       </div>`
    : '';

  // Enlace virtual
  const enlaceHTML = d.enlace
    ? `<a href="${d.enlace}" target="_blank" rel="noopener noreferrer" class="docente-link-virtual">
         <svg viewBox="0 0 24 24">
           <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
           <polyline points="15 3 21 3 21 9"/>
           <line x1="10" y1="14" x2="21" y2="3"/>
         </svg>
         Ingresar al Enlace
       </a>`
    : '';

  return `
    <div class="docente-card-consulta">
      <div class="avatar">${iniciales}</div>
      <div class="card-body">
        <p class="docente-nombre">${d.docente}</p>
        <a class="docente-email" href="mailto:${d.correo_docente}">${d.correo_docente}</a>

        <div style="margin:8px 0 4px 0">${materiasHTML}</div>

        <div style="margin-top:10px">${horariosHTML}</div>

        ${obsHTML}
        ${enlaceHTML}
      </div>
    </div>`;
}

/* GENERACIÓN DE PDF */
function descargarPDF() {
  if (!todosLosDocentes.length) return;

  const facultad = document.getElementById('sel-facultad').value;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const PW  = 210;   // ancho página
  const PH  = 297;   // alto página
  const ML  = 18;    // margen izquierdo
  const MR  = 18;    // margen derecho
  const CW  = PW - ML - MR;  // ancho del contenido
  const MT  = 20;    // margen superior primera página
  const MB  = 18;    // margen inferior

  let y = MT;

  // ── Paleta de colores ─────────────────────────────────────
  const AZUL   = [15, 42, 61];
  const AZUL_M = [29, 78, 107];
  const GRIS   = [110, 122, 133];
  const BORDE  = [220, 225, 230];
  const ARENA  = [247, 243, 238];
  const VERDE  = [21, 92, 58];
  const VERDE_BG = [232, 245, 238];

  // ── Función: nueva página si es necesario ─────────────────
  function checkPage(needed) {
    if (y + needed > PH - MB) {
      doc.addPage();
      y = MT;
      drawPageHeader();
    }
  }

  // ── Encabezado de página (línea superior en páginas 2+) ───
  function drawPageHeader() {
    doc.setDrawColor(...BORDE);
    doc.setFillColor(...AZUL);
    doc.rect(ML, y - 4, CW, 0.4, 'F');
  }

  // ── Cabecera principal 
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, PW, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HORARIOS DE TUTORÍAS PMA - FACULTADES', ML, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Institución Universitaria Antonio José Camacho', ML, 21);

  // Nombre de facultad
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`FACULTAD DE ${facultad}`, ML, 29);

  // Fecha de generación
  const hoy = new Date();
  const fecha = hoy.toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text(`Generado el ${fecha}`, PW - MR, 29, { align: 'right' });

  y = 48;

  // ── Datos del listado: usamos todosLosDocentes (no filtrados) ──
  const lista = [...todosLosDocentes].sort((a, b) =>
    a.docente.localeCompare(b.docente, 'es')
  );

  lista.forEach((d, idx) => {

    // ── Calcular altura real del contenido ──────────────────
    doc.setFontSize(7.5);
    const matLines = d.materias.length
      ? doc.splitTextToSize(d.materias.join(' · '), CW - 14)
      : [];

    doc.setFontSize(7.5);
    const obsLines = d.observaciones
      ? doc.splitTextToSize(d.observaciones, CW - 14)
      : [];

    const altNombre    = 10;   // nombre
    const altCorreo    = 8;    // correo
    const altEsp1      = 2;    // espacio
    const altTitMat    = d.materias.length ? 6 : 0;   // "Materias:"
    const altMat       = d.materias.length ? matLines.length * 5 + 4 : 0;
    const altEsp2      = d.materias.length ? 1 : 0;   // espacio
    const altTitHor    = 6;    // "Horarios:"
    const altHorarios  = (d.horarios.length || 1) * 9;
    const altEsp3      = 2;    // espacio
    const altObs       = d.observaciones
      ? 6 + obsLines.length * 5 + 4
      : 0;
    const altEnlace    = d.enlace ? 6 : 0;
    const altPadding   = 8;    // padding inferior

    const alturaTotal =
      altNombre + altCorreo + altEsp1 +
      altTitMat + altMat + altEsp2 +
      altTitHor + altHorarios + altEsp3 +
      altObs + altEnlace + altPadding;

    // ── Si no cabe entero, saltar a nueva página ────────────
    checkPage(alturaTotal);
    const cardY = y;

    // ── Fondo de tarjeta ────────────────────────────────────
    doc.setFillColor(252, 251, 249);
    doc.roundedRect(ML, cardY, CW, alturaTotal, 2, 2, 'F');

    // ── Línea azul izquierda (cubre altura real) ────────────
    doc.setFillColor(...AZUL_M);
    doc.rect(ML, cardY, 3, alturaTotal, 'F');

    // ── Cursor de contenido ─────────────────────────────────
    let cy = cardY + altNombre;

    // Nombre
    doc.setTextColor(...AZUL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(toTitleCase(d.docente), ML + 7, cy);
    cy += altCorreo;

    // Correo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...AZUL_M);
    doc.text(d.correo_docente, ML + 7, cy);
    cy += altEsp1;

    // ── Materias ────────────────────────────────────────────
    if (d.materias.length) {
      cy += altTitMat;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRIS);
      doc.text('Materias:', ML + 7, cy);
      cy += 5;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text(matLines, ML + 7, cy);
      cy += matLines.length * 5 + altEsp2;
    }

    // ── Horarios ────────────────────────────────────────────
    cy += altTitHor;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text('Horarios:', ML + 7, cy);
    cy += 6;

    d.horarios.forEach(h => {
      doc.setFillColor(...AZUL_M);
      doc.circle(ML + 8, cy - 1.5, 0.8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...AZUL);
      doc.text(h.dia, ML + 11, cy);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRIS);
      doc.text(`${h.hora_inicio} – ${h.hora_fin}`, ML + 38, cy);

      const sedeX = ML + 95;
      const esVirtual = h.sede === 'Virtual';
      doc.setFillColor(...(esVirtual ? VERDE_BG : ARENA));
      doc.setTextColor(...(esVirtual ? VERDE : GRIS));
      doc.roundedRect(sedeX, cy - 4, 28, 5.5, 1, 1, 'F');
      doc.setFontSize(7);
      doc.text(`Sede ${h.sede}`, sedeX + 1.5, cy);

      cy += 9;
    });

    cy += altEsp3;

    // ── Observaciones ───────────────────────────────────────
    if (d.observaciones) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRIS);
      doc.text('Observaciones:', ML + 7, cy);
      cy += 6;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text(obsLines, ML + 7, cy);
      cy += obsLines.length * 5;
    }

    // ── Enlace ──────────────────────────────────────────────
    if (d.enlace) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 102, 204);
      doc.textWithLink(d.enlace, ML + 7, cy, { url: d.enlace });
      cy += 6;
    }

    // ── Avanzar y con separación entre tarjetas ─────────────
    y = cardY + alturaTotal + 5;
  });

  // ── Pie de página ─────────────────────────────────────────
  const totalPags = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPags; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDE);
    doc.line(ML, PH - 12, PW - MR, PH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text('Programa de Mejoramiento Académico · UNIAJC', ML, PH - 7);
    doc.text(`Página ${p} de ${totalPags}`, PW - MR, PH - 7, { align: 'right' });
  }

  // ── Guardar ───────────────────────────────────────────────
  const nombreArchivo = `Horarios Facultad - ${facultad.replace(/\s+/g, ' ')}.pdf`;
  doc.save(nombreArchivo);
}

function toTitleCase(str) {
  const minusculas = new Set([
    'de','del','la','las','el','los','y','en','con','por','a','al','un','una'
  ]);
  return str
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i === 0 || !minusculas.has(w)) ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(' ');
}


/* ENLACES VIRTUALES DE BECARIOS (desde Supabase) */
async function cargarEnlacesBecarios() {
  const cont = document.getElementById('becarios-enlaces-virtuales');
  if (!cont) return;

  try {
    const { data: enlaces, error } = await db
      .from('becarios_virtual')
      .select('nombre, enlace')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!enlaces || enlaces.length === 0) {
      cont.innerHTML = `<p style="font-size:12px;color:var(--gris)">No hay enlaces disponibles.</p>`;
      return;
    }

    cont.innerHTML = enlaces.map((e, i) => {
      const acento = i % 2 === 1 ? ' becarios-virtual-item--verde' : '';
      const acentoBtn = i % 2 === 1 ? ' becarios-virtual-link--verde' : '';
      return `
      <div class="becarios-virtual-item${acento}">
        <div class="becarios-virtual-item-text">
          <span class="nombre">${e.nombre}</span>
        </div>
        <a href="${e.enlace}" target="_blank" rel="noopener noreferrer" class="becarios-virtual-link${acentoBtn}">
          Enlace Teams
        </a>
      </div>
    `;
    }).join('');

  } catch (err) {
    console.error('Error al cargar enlaces de becarios:', err);
    cont.innerHTML = `<p style="font-size:12px;color:var(--gris)">Error al cargar los enlaces.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', cargarEnlacesBecarios);
