const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;
const ESQUEMA_VISITAS = 'visitas';
const ESQUEMA_PUBLICO = 'public';

// ── Cliente de Supabase (para verificar sesión de administrador) ───────────
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// ── Verificación de acceso (bandera local + sesión real de administrador) ──
document.addEventListener('DOMContentLoaded', async function () {
  if (!sessionStorage.getItem('adminAuth')) {
    alert('Debe iniciar sesión como administrador para acceder a esta página.');
    window.location.href = '../../import/admin.html';
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    alert('Debe iniciar sesión como administrador para acceder a esta página.');
    window.location.href = '../../import/admin.html';
    return;
  }

  const { data: adminData, error: adminError } = await supabaseClient
    .from('admin_usuarios')
    .select('user_id')
    .eq('user_id', session.user.id)
    .single();

  if (adminError || !adminData) {
    alert('Debe iniciar sesión como administrador para acceder a esta página.');
    window.location.href = '../../import/admin.html';
    return;
  }
});

// ===================================
// ESTADO GLOBAL
// ===================================
let sedeActual = 'norte';
let tabActual = 'asignar';
let registrosSede = [];   // filas de registro_visitas_{sede}  (solo Asignada / Realizada)
let tutoresSede = [];     // filas de tutores_{sede}
let catalogoDia = [];     // filas de visitas_{sede} para el día filtrado
let filaSeleccionada = null; // fila del catálogo que se está asignando

// ===================================
// HELPERS DE CONEXIÓN A SUPABASE
// ===================================
async function fetchConReintentos(url, options, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const textoError = await response.text().catch(() => '');
        throw new Error(`Error del servidor (${response.status}): ${textoError || response.statusText}`);
      }

      if (response.status === 204) return null;
      const texto = await response.text();
      return texto ? JSON.parse(texto) : null;

    } catch (error) {
      if (i === intentos - 1) {
        throw new Error('No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

function construirHeaders(esquema, extra = {}) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Accept-Profile': esquema,
    'Content-Profile': esquema,
    ...extra
  };
}

async function supabaseQuery(table, options = {}, esquema = ESQUEMA_VISITAS) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = [];

  if (options.select) params.push(`select=${options.select}`);
  if (options.order) params.push(`order=${options.order}`);

  if (params.length > 0) url += `?${params.join('&')}`;

  return await fetchConReintentos(url, { headers: construirHeaders(esquema) });
}

async function supabaseInsert(table, data, esquema = ESQUEMA_VISITAS) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  return await fetchConReintentos(url, {
    method: 'POST',
    headers: construirHeaders(esquema, { 'Prefer': 'return=representation' }),
    body: JSON.stringify(data)
  });
}

// ===================================
// HELPER: lectura de campos sin importar mayúsculas/minúsculas
// (las tablas de catálogo se llenan desde CSV y no debe asumirse
// que los encabezados llegaron en minúsculas)
// ===================================
function obtenerCampo(fila, nombreCampo) {
  if (!fila) return '';
  if (Object.prototype.hasOwnProperty.call(fila, nombreCampo)) return fila[nombreCampo] ?? '';
  const claves = Object.keys(fila);
  const coincidencia = claves.find(k => k.toLowerCase() === nombreCampo.toLowerCase());
  return coincidencia ? (fila[coincidencia] ?? '') : '';
}

// Normaliza un texto para comparaciones de filtros: mayúsculas y sin
// tildes/diacríticos (ej. "Miércoles" y "MIERCOLES" son equivalentes)
function normalizarTexto(texto) {
  return String(texto || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', inicializar);

async function inicializar() {
  await cambiarSede('norte');
}

// ===================================
// SEDE
// ===================================
async function cambiarSede(sede) {
  sedeActual = sede;

  document.getElementById('btnSedeNorte').classList.toggle('activo', sede === 'norte');
  document.getElementById('btnSedeSur').classList.toggle('activo', sede === 'sur');

  document.getElementById('filtroDia').value = '';
  document.getElementById('filtroJornada').value = '';
  document.getElementById('filtroSemestre').value = '';
  document.getElementById('filtroEstado').value = '';
  document.getElementById('contenedorClasesDia').innerHTML =
    '<p class="visitas-placeholder">Seleccione un día para ver las clases programadas.</p>';

  await cargarDatosBase();

  if (tabActual === 'grupos') await cargarEstadoGrupos();
  if (tabActual === 'becarios') await cargarBecarios();
}

async function cargarDatosBase() {
  mostrarLoader(true);
  try {
    const [registros, tutores] = await Promise.all([
      supabaseQuery(`registro_visitas_${sedeActual}`, { order: 'created_at.desc' }),
      supabaseQuery(`tutores_${sedeActual}`, { order: 'nombre.asc' }, ESQUEMA_PUBLICO)
    ]);
    registrosSede = Array.isArray(registros) ? registros : [];
    tutoresSede = Array.isArray(tutores) ? tutores : [];
  } catch (error) {
    mostrarMensaje('mensajeAdmin', 'Error al cargar los datos: ' + error.message, 'error');
  } finally {
    mostrarLoader(false);
  }
}

// ===================================
// TABS
// ===================================
function cambiarTab(tab) {
  tabActual = tab;

  document.querySelectorAll('.visitas-tabs .admin-tab').forEach(boton => {
    boton.classList.toggle('active', boton.dataset.tab === tab);
  });

  document.getElementById('tabAsignar').classList.toggle('hidden', tab !== 'asignar');
  document.getElementById('tabGrupos').classList.toggle('hidden', tab !== 'grupos');
  document.getElementById('tabBecarios').classList.toggle('hidden', tab !== 'becarios');

  if (tab === 'grupos') cargarEstadoGrupos();
  if (tab === 'becarios') cargarBecarios();
}

// ===================================
// CÁLCULO CENTRAL DEL ESTADO DE UN GRUPO
// - El límite de 2 visitas se controla por el campo GRUPO
//   (comparación insensible a mayúsculas/minúsculas).
// - La Visita 2 NO puede asignarse mientras la Visita 1 no
//   esté en estado "Realizada".
// - Como ya no existe el estado "No realizada" (las filas se
//   eliminan), a lo sumo puede existir UNA fila "Asignada"
//   activa por grupo en un momento dado.
// ===================================
function calcularEstadoGrupo(nombreGrupo) {
  const clave = String(nombreGrupo || '').toUpperCase();
  const registros = registrosSede.filter(r => String(r.grupo || '').toUpperCase() === clave);

  const realizadas = registros
    .filter(r => r.estado === 'Realizada')
    .sort((a, b) => a.numero_visita - b.numero_visita);

  const asignadaActiva = registros.find(r => r.estado === 'Asignada') || null;
  const completado = realizadas.length >= 2;

  let siguienteNumero = null;
  if (!completado && !asignadaActiva) {
    siguienteNumero = realizadas.length + 1; // 1 si no hay realizadas, 2 si ya hay 1 realizada
  }

  return {
    realizadas,          // array de filas 'Realizada' ordenadas por numero_visita
    asignadaActiva,      // fila 'Asignada' actual (o null)
    completado,
    siguienteNumero,     // 1, 2 o null si no se puede asignar ahora
    disponible: !completado && !asignadaActiva
  };
}

// Determina la categoría de estado de un grupo (disponible / proceso /
// completado) para el filtro "Estado". Misma lógica que se usaba
// antes en el filtro de "Estado de Grupos".
function categoriaEstadoGrupo(nombreGrupo) {
  const estado = calcularEstadoGrupo(nombreGrupo);
  if (estado.completado) return 'completado';
  if (estado.asignadaActiva || estado.realizadas.length > 0) return 'proceso';
  return 'disponible';
}

// ===================================
// TAB 1: ASIGNAR VISITAS
// ===================================
async function cargarClasesDelDia() {
  const dia = document.getElementById('filtroDia').value;
  const jornada = document.getElementById('filtroJornada').value;
  const semestre = document.getElementById('filtroSemestre').value;
  const estadoFiltro = document.getElementById('filtroEstado').value;
  const contenedor = document.getElementById('contenedorClasesDia');

  if (!dia) {
    contenedor.innerHTML = '<p class="visitas-placeholder">Seleccione un día para ver las clases programadas.</p>';
    return;
  }

  mostrarLoader(true);
  try {
    let filas = await supabaseQuery(`visitas_${sedeActual}`, {});
    filas = Array.isArray(filas) ? filas : [];

    // Filtros insensibles a mayúsculas/minúsculas y a tildes (los datos
    // vienen de un CSV y pueden llegar en cualquier formato)
    filas = filas.filter(f => normalizarTexto(obtenerCampo(f, 'dia')) === normalizarTexto(dia));
    if (jornada) {
      filas = filas.filter(f => normalizarTexto(obtenerCampo(f, 'jornada')) === normalizarTexto(jornada));
    }
    if (semestre) {
      filas = filas.filter(f => normalizarTexto(obtenerCampo(f, 'semestre')) === normalizarTexto(semestre));
    }
    if (estadoFiltro) {
      filas = filas.filter(f => categoriaEstadoGrupo(obtenerCampo(f, 'grupo')) === estadoFiltro);
    }

    filas.sort((a, b) => String(obtenerCampo(a, 'horario')).localeCompare(String(obtenerCampo(b, 'horario'))));

    catalogoDia = filas;
    renderizarClasesDelDia(filas);
  } catch (error) {
    mostrarMensaje('mensajeAdmin', 'Error al cargar las clases: ' + error.message, 'error');
  } finally {
    mostrarLoader(false);
  }
}

function renderizarClasesDelDia(filas) {
  const contenedor = document.getElementById('contenedorClasesDia');

  if (filas.length === 0) {
    contenedor.innerHTML = '<p class="visitas-placeholder">No hay clases programadas para ese día.</p>';
    return;
  }

  let html = `<div class="tabla-visitas-wrapper"><table class="tabla-estadisticas-tutores tabla-visitas">
    <thead>
      <tr>
        <th>Horario</th><th>Grupo</th><th>Semestre</th><th>Salón</th><th>Estado</th><th>Acción</th>
      </tr>
    </thead>
    <tbody>`;

  filas.forEach((fila, indice) => {
    const grupo = obtenerCampo(fila, 'grupo');
    const estado = calcularEstadoGrupo(grupo);
    let badge, accion;

    if (estado.completado) {
      badge = '<span class="badge-estado badge-completado">Completado (2/2)</span>';
      accion = '<span class="visitas-sin-accion">—</span>';
    } else if (estado.asignadaActiva) {
      badge = `<span class="badge-estado badge-asignada">Visita ${estado.asignadaActiva.numero_visita} - Asignada a ${escaparHTML(estado.asignadaActiva.becario_asignado)}</span>`;
      accion = '<span class="visitas-sin-accion">—</span>';
    } else {
      badge = `<span class="badge-estado badge-disponible">Disponible (${estado.realizadas.length}/2)</span>`;
      accion = `<button type="button" class="btn-accion-tabla" data-indice="${indice}">Asignar Visita ${estado.siguienteNumero}</button>`;
    }

    html += `<tr>
      <td>${escaparHTML(obtenerCampo(fila, 'horario') || '-')}</td>
      <td class="tabla-tutor-nombre">${escaparHTML(grupo || '-')}</td>
      <td style="text-align:center">${escaparHTML(obtenerCampo(fila, 'semestre') || '-')}</td>
      <td>${escaparHTML(obtenerCampo(fila, 'salon') || '-')}</td>
      <td>${badge}</td>
      <td>${accion}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;

  contenedor.querySelectorAll('.btn-accion-tabla').forEach(boton => {
    boton.addEventListener('click', () => abrirModalAsignar(Number(boton.dataset.indice)));
  });
}

// ===================================
// MODAL: ASIGNAR VISITA
// ===================================
function abrirModalAsignar(indiceFila) {
  filaSeleccionada = catalogoDia[indiceFila];
  if (!filaSeleccionada) return;

  const grupo = obtenerCampo(filaSeleccionada, 'grupo');
  const estado = calcularEstadoGrupo(grupo);

  if (!estado.siguienteNumero) {
    mostrarMensaje('mensajeAdmin', 'Este grupo no está disponible para una nueva asignación en este momento.', 'error');
    return;
  }

  document.getElementById('detalleAsignacion').innerHTML = `
    <div class="confirmation-item"><span class="confirmation-label">Grupo:</span><span class="confirmation-value">${escaparHTML(grupo)}</span></div>
    <div class="confirmation-item"><span class="confirmation-label">Día:</span><span class="confirmation-value">${escaparHTML(obtenerCampo(filaSeleccionada, 'dia'))}</span></div>
    <div class="confirmation-item"><span class="confirmation-label">Horario:</span><span class="confirmation-value">${escaparHTML(obtenerCampo(filaSeleccionada, 'horario'))}</span></div>
    <div class="confirmation-item"><span class="confirmation-label">Salón:</span><span class="confirmation-value">${escaparHTML(obtenerCampo(filaSeleccionada, 'salon'))}</span></div>
    <div class="confirmation-item"><span class="confirmation-label">Visita número:</span><span class="confirmation-value">${estado.siguienteNumero} de 2</span></div>
  `;

  const select = document.getElementById('selectBecarioAsignar');
  select.innerHTML = '<option value="">Seleccione...</option>';
  [...tutoresSede]
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    .forEach(t => {
      const opcion = document.createElement('option');
      opcion.value = t.nombre;
      opcion.textContent = t.nombre;
      select.appendChild(opcion);
    });

  document.getElementById('mensajeModalAsignar').innerHTML = '';
  document.getElementById('modalAsignar').classList.remove('hidden');
}

function cerrarModalAsignar() {
  document.getElementById('modalAsignar').classList.add('hidden');
  filaSeleccionada = null;
}

async function confirmarAsignacion() {
  const becario = document.getElementById('selectBecarioAsignar').value;

  if (!becario) {
    mostrarMensaje('mensajeModalAsignar', 'Seleccione un becario.', 'error');
    return;
  }
  if (!filaSeleccionada) return;

  const grupo = obtenerCampo(filaSeleccionada, 'grupo');
  const estado = calcularEstadoGrupo(grupo);

  if (!estado.siguienteNumero) {
    mostrarMensaje('mensajeModalAsignar', 'Este grupo ya no está disponible para una nueva asignación.', 'error');
    return;
  }

  const boton = document.getElementById('btnConfirmarAsignar');
  boton.disabled = true;
  boton.textContent = 'Asignando...';

  try {
    await supabaseInsert(`registro_visitas_${sedeActual}`, {
      grupo_id: filaSeleccionada.id,
      grupo: grupo,
      dia: obtenerCampo(filaSeleccionada, 'dia'),
      horario: obtenerCampo(filaSeleccionada, 'horario'),
      salon: obtenerCampo(filaSeleccionada, 'salon'),
      semestre: obtenerCampo(filaSeleccionada, 'semestre'),
      numero_visita: estado.siguienteNumero,
      estado: 'Asignada',
      becario_asignado: becario
    });

    const numeroAsignado = estado.siguienteNumero;

    cerrarModalAsignar();
    await cargarDatosBase();
    await cargarClasesDelDia();

    mostrarModalExito(`Visita ${numeroAsignado} del grupo ${grupo} asignada a ${becario}.`);
  } catch (error) {
    mostrarMensaje('mensajeModalAsignar', 'Error al asignar: ' + error.message, 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Confirmar Asignación';
  }
}

function mostrarModalExito(mensaje) {
  document.getElementById('mensajeExitoAdmin').textContent = mensaje;
  document.getElementById('modalExitoAdmin').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('modalExitoAdmin').classList.add('hidden');
  }, 2200);
}

// ===================================
// TAB 2: ESTADO DE GRUPOS
// ===================================
async function cargarEstadoGrupos() {
  mostrarLoader(true);
  const contenedor = document.getElementById('contenedorGrupos');

  try {
    let catalogoCompleto = await supabaseQuery(`visitas_${sedeActual}`, {});
    catalogoCompleto = Array.isArray(catalogoCompleto) ? catalogoCompleto : [];

    // Agrupar por GRUPO (case-insensitive: un mismo grupo puede
    // aparecer varias veces en el horario semanal)
    const gruposMap = new Map();
    catalogoCompleto.forEach(fila => {
      const grupo = obtenerCampo(fila, 'grupo');
      if (!grupo) return;
      const clave = String(grupo).toUpperCase();
      if (!gruposMap.has(clave)) {
        gruposMap.set(clave, { grupo, semestre: obtenerCampo(fila, 'semestre') });
      }
    });

    let grupos = Array.from(gruposMap.values()).sort((a, b) => String(a.grupo).localeCompare(String(b.grupo)));

    const semestreFiltro = document.getElementById('filtroSemestreGrupos').value;
    if (semestreFiltro) {
      grupos = grupos.filter(g => normalizarTexto(g.semestre) === normalizarTexto(semestreFiltro));
    }

    let totalDisponibles = 0, totalProceso = 0, totalCompletados = 0;
    const filasHTML = [];

    grupos.forEach(g => {
      const estado = calcularEstadoGrupo(g.grupo);
      let etiqueta, clase;

      if (estado.completado) {
        etiqueta = 'completado'; clase = 'badge-completado'; totalCompletados++;
      } else if (estado.asignadaActiva || estado.realizadas.length > 0) {
        etiqueta = 'proceso'; clase = 'badge-asignada'; totalProceso++;
      } else {
        etiqueta = 'disponible'; clase = 'badge-disponible'; totalDisponibles++;
      }

      const visita1 = estado.realizadas.find(r => r.numero_visita === 1);
      const visita2 = estado.realizadas.find(r => r.numero_visita === 2);

      // Solo becarios con visitas REALIZADAS, uno debajo del otro
      // (visita 1 arriba, visita 2 abajo). Las fechas de cada visita
      // se conservan en la base de datos, pero ya no se muestran aquí.
      const becariosHTML = [visita1, visita2]
        .filter(Boolean)
        .map(v => `<div>${escaparHTML(v.becario_asignado)}</div>`)
        .join('') || '—';

      filasHTML.push(`<tr>
        <td class="tabla-tutor-nombre">${escaparHTML(g.grupo)}</td>
        <td style="text-align:center">${escaparHTML(g.semestre || '-')}</td>
        <td style="text-align:center"><span class="badge-estado ${clase}">${estado.realizadas.length}/2</span></td>
        <td>${becariosHTML}</td>
      </tr>`);
    });

    document.getElementById('statsGrupos').innerHTML = `
      <div class="stat-card"><h3>${totalDisponibles}</h3><p>Disponibles</p></div>
      <div class="stat-card"><h3>${totalProceso}</h3><p>En proceso</p></div>
      <div class="stat-card"><h3>${totalCompletados} / ${grupos.length}</h3><p>Completados</p></div>
    `;

    contenedor.innerHTML = filasHTML.length > 0
      ? `<div class="tabla-visitas-wrapper"><table class="tabla-estadisticas-tutores tabla-visitas">
          <thead><tr><th>Grupo</th><th>Semestre</th><th>Visitas</th><th>Becario(s)</th></tr></thead>
          <tbody>${filasHTML.join('')}</tbody>
        </table></div>`
      : '<p class="visitas-placeholder">No hay grupos que coincidan con el filtro.</p>';

  } catch (error) {
    mostrarMensaje('mensajeAdmin', 'Error al cargar los grupos: ' + error.message, 'error');
  } finally {
    mostrarLoader(false);
  }
}

// ===================================
// TAB 3: BECARIOS
// ===================================
async function cargarBecarios() {
  mostrarLoader(true);
  const contenedor = document.getElementById('contenedorBecarios');

  try {
    const ordenados = [...tutoresSede].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    const filasHTML = ordenados.map(t => {
      const pendientes = registrosSede.filter(r => r.becario_asignado === t.nombre && r.estado === 'Asignada').length;
      const realizadas = registrosSede.filter(r => r.becario_asignado === t.nombre && r.estado === 'Realizada').length;
      return `<tr>
        <td class="tabla-tutor-nombre">${escaparHTML(t.nombre)}</td>
        <td style="text-align:center" class="tabla-tutor-num">${pendientes}</td>
        <td style="text-align:center" class="tabla-tutor-num">${realizadas}</td>
      </tr>`;
    });

    contenedor.innerHTML = filasHTML.length > 0
      ? `<div class="tabla-visitas-wrapper"><table class="tabla-estadisticas-tutores tabla-visitas">
          <thead><tr><th>Becario</th><th>Visitas pendientes</th><th>Visitas realizadas</th></tr></thead>
          <tbody>${filasHTML.join('')}</tbody>
        </table></div>`
      : '<p class="visitas-placeholder">No hay becarios registrados para esta sede.</p>';

  } catch (error) {
    mostrarMensaje('mensajeAdmin', 'Error al cargar los becarios: ' + error.message, 'error');
  } finally {
    mostrarLoader(false);
  }
}

// ===================================
// HELPERS GENERALES
// ===================================
function mostrarLoader(mostrar) {
  const loader = document.getElementById('loaderAdmin');
  if (loader) loader.classList.toggle('hidden', !mostrar);
}

function mostrarMensaje(elementId, mensaje, tipo) {
  const elemento = document.getElementById(elementId);
  if (!elemento) return;

  elemento.innerHTML = '';
  const div = document.createElement('div');
  div.className = `mensaje ${tipo}`;
  div.textContent = mensaje;
  elemento.appendChild(div);

  setTimeout(() => { elemento.innerHTML = ''; }, 6000);
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = (texto === null || texto === undefined) ? '' : String(texto);
  return div.innerHTML;
}
