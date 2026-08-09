// =========================================================
// MÓDULO DE BECARIOS - VISITAS A GRUPOS - PMA
// Módulo independiente (no comparte lógica con VISITAS/ADMIN
// ni con PMA, salvo el CSS reutilizado). Sin autenticación:
// el becario se identifica únicamente por su nombre.
// =========================================================

const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
const SUPABASE_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;
const ESQUEMA_VISITAS = 'visitas';
const ESQUEMA_PUBLICO = 'public';

// ===================================
// ESTADO GLOBAL
// ===================================
let sedeActual = null;
let becarioSeleccionado = null;
let registrosSede = [];        // filas de registro_visitas_{sede} (solo Asignada / Realizada)
let tutoresSede = [];          // filas de tutores_{sede}
let visitaSeleccionada = null; // fila de registro que se está diligenciando / eliminando

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

async function supabaseUpdate(table, id, data, esquema = ESQUEMA_VISITAS) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  return await fetchConReintentos(url, {
    method: 'PATCH',
    headers: construirHeaders(esquema, { 'Prefer': 'return=representation' }),
    body: JSON.stringify(data)
  });
}

async function supabaseDelete(table, id, esquema = ESQUEMA_VISITAS) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  return await fetchConReintentos(url, {
    method: 'DELETE',
    headers: construirHeaders(esquema, { 'Prefer': 'return=minimal' })
  });
}

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.visitas-sede-grande').forEach(boton => {
    boton.addEventListener('click', () => seleccionarSede(boton.dataset.sede));
  });

  document.getElementById('formVisita').addEventListener('submit', registrarVisita);

  mostrarVista('vistaSede');
});

// ===================================
// SEDE
// ===================================
async function seleccionarSede(sede) {
  sedeActual = sede;
  document.getElementById('nombreSedeBecarios').textContent = sede.toUpperCase();
  document.getElementById('subtituloVista').textContent = `Sede ${sede.toUpperCase()}`;

  await cargarDatosSede();
  renderizarListadoBecarios();
  mostrarVista('vistaBecarios');
}

function volverASede() {
  sedeActual = null;
  document.getElementById('subtituloVista').textContent = 'Seleccione su sede';
  mostrarVista('vistaSede');
}

async function cargarDatosSede() {
  mostrarLoaderInicio(true);
  try {
    const [registros, tutores] = await Promise.all([
      supabaseQuery(`registro_visitas_${sedeActual}`, { order: 'created_at.desc' }),
      supabaseQuery(`tutores_${sedeActual}`, { order: 'nombre.asc' }, ESQUEMA_PUBLICO)
    ]);
    registrosSede = Array.isArray(registros) ? registros : [];
    tutoresSede = Array.isArray(tutores) ? tutores : [];
  } catch (error) {
    mostrarMensaje('mensajeInicio', 'Error al cargar los datos: ' + error.message, 'error');
  } finally {
    mostrarLoaderInicio(false);
  }
}

// ===================================
// NAVEGACIÓN ENTRE VISTAS
// ===================================
function mostrarVista(id) {
  document.querySelectorAll('.visitas-tab-content').forEach(v => v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================================
// LISTADO DE BECARIOS
// Los becarios con 0 visitas asignadas se muestran pero
// deshabilitados: no permiten el ingreso a su listado.
// ===================================
function renderizarListadoBecarios() {
  const contenedor = document.getElementById('listadoBecarios');
  const ordenados = [...tutoresSede].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  if (ordenados.length === 0) {
    contenedor.innerHTML = '<p class="visitas-empty-state">No hay becarios registrados para esta sede.</p>';
    return;
  }

  contenedor.innerHTML = ordenados.map((t, indice) => {
    const pendientes = registrosSede.filter(r => r.becario_asignado === t.nombre && r.estado === 'Asignada').length;
    const deshabilitado = pendientes === 0;
    const claseItem = `list-item visitas-becario-item${deshabilitado ? ' deshabilitado' : ''}`;
    const claseContador = deshabilitado ? 'visitas-becario-contador sin-visitas' : 'visitas-becario-contador';
    const texto = pendientes === 1 ? '1 visita' : `${pendientes} visitas`;

    return `<div class="${claseItem}" data-indice="${indice}"${deshabilitado ? ' aria-disabled="true"' : ''}>
      <strong>${escaparHTML(t.nombre)}</strong>
      <span class="${claseContador}">${texto}</span>
    </div>`;
  }).join('');

  contenedor.querySelectorAll('.visitas-becario-item:not(.deshabilitado)').forEach(elemento => {
    const tutor = ordenados[Number(elemento.dataset.indice)];
    elemento.addEventListener('click', () => seleccionarBecario(tutor.nombre));
  });
}

// ===================================
// VISITAS ASIGNADAS AL BECARIO
// ===================================
function seleccionarBecario(nombre) {
  becarioSeleccionado = nombre;
  document.getElementById('nombreBecarioSeleccionado').textContent = nombre;
  renderizarVisitasBecario();
  mostrarVista('vistaVisitasBecario');
}

function volverABecarios() {
  becarioSeleccionado = null;
  renderizarListadoBecarios();
  mostrarVista('vistaBecarios');
}

function renderizarVisitasBecario() {
  const contenedor = document.getElementById('listadoVisitasBecario');
  const visitas = registrosSede
    .filter(r => r.becario_asignado === becarioSeleccionado && r.estado === 'Asignada')
    .sort((a, b) => (a.dia || '').localeCompare(b.dia || ''));

  if (visitas.length === 0) {
    contenedor.innerHTML = '<p class="visitas-empty-state">No tiene visitas pendientes por realizar.</p>';
    return;
  }

  contenedor.innerHTML = visitas.map((v, indice) => `
    <div class="list-item visitas-visita-item" data-indice="${indice}">
      <div class="visitas-visita-info" data-accion="abrir">
        <strong>Grupo ${escaparHTML(v.grupo)} — Visita ${v.numero_visita}/2</strong>
        <span>${escaparHTML(v.dia || '-')} · ${escaparHTML(v.horario || '-')}</span>
        <span>Salón ${escaparHTML(v.salon || '-')}</span>
      </div>
      <button type="button" class="btn-no-realizada" data-accion="no-realizada">No realizada</button>
    </div>
  `).join('');

  contenedor.querySelectorAll('.visitas-visita-item').forEach(elemento => {
    const visita = visitas[Number(elemento.dataset.indice)];

    elemento.querySelector('[data-accion="abrir"]').addEventListener('click', () => {
      abrirFormularioVisita(visita.id);
    });

    elemento.querySelector('[data-accion="no-realizada"]').addEventListener('click', (evento) => {
      evento.stopPropagation();
      visitaSeleccionada = visita;
      document.getElementById('modalNoRealizada').classList.remove('hidden');
    });
  });
}

// ===================================
// FORMULARIO DE VISITA
// ===================================
function abrirFormularioVisita(idRegistro) {
  visitaSeleccionada = registrosSede.find(r => r.id === idRegistro);
  if (!visitaSeleccionada) return;

  document.getElementById('detalleVisitaFormulario').innerHTML = `
    <tr><td>Grupo</td><td>${escaparHTML(visitaSeleccionada.grupo)}</td></tr>
    <tr><td>Día</td><td>${escaparHTML(visitaSeleccionada.dia || '-')}</td></tr>
    <tr><td>Horario</td><td>${escaparHTML(visitaSeleccionada.horario || '-')}</td></tr>
    <tr><td>Salón</td><td>${escaparHTML(visitaSeleccionada.salon || '-')}</td></tr>
    <tr><td>Visita número</td><td>${visitaSeleccionada.numero_visita} de 2</td></tr>
  `;

  document.getElementById('formVisita').reset();
  document.getElementById('mensajeFormularioVisita').innerHTML = '';
  mostrarVista('vistaFormularioVisita');
}

function volverAVisitasBecario() {
  visitaSeleccionada = null;
  renderizarVisitasBecario();
  mostrarVista('vistaVisitasBecario');
}

function limpiarEspaciosVisita(input) {
  input.value = input.value.trim().replace(/\s+/g, ' ');
}

// ===================================
// LIMPIEZA DE NOMBRES
// (misma lógica de limpieza de espacios del proyecto original,
// más mayúsculas y remoción de tildes/ñ, tal como se pidió)
// ===================================
function limpiarNombre(texto) {
  if (!texto) return '';
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes y convierte Ñ -> N
    .trim();
}

function documentoValido(valor) {
  return /^[0-9]{6,12}$/.test(valor);
}

async function registrarVisita(evento) {
  evento.preventDefault();
  if (!visitaSeleccionada) return;

  const documentoVocero = document.getElementById('visitaDocumentoVocero').value.trim();
  const nombreDocenteCrudo = document.getElementById('visitaNombreDocente').value.trim();
  const documentoDocente = document.getElementById('visitaDocumentoDocente').value.trim();

  if (!documentoVocero || !nombreDocenteCrudo || !documentoDocente) {
    mostrarMensaje('mensajeFormularioVisita', 'Por favor complete todos los campos obligatorios.', 'error');
    return;
  }
  if (!documentoValido(documentoVocero)) {
    mostrarMensaje('mensajeFormularioVisita', 'El documento del vocero debe tener entre 6 y 12 dígitos.', 'error');
    return;
  }
  if (!documentoValido(documentoDocente)) {
    mostrarMensaje('mensajeFormularioVisita', 'El documento del docente debe tener entre 6 y 12 dígitos.', 'error');
    return;
  }

  const nombreDocente = limpiarNombre(nombreDocenteCrudo);

  const boton = document.getElementById('btnRegistrarVisita');
  boton.disabled = true;
  boton.textContent = 'Guardando...';

  try {
    await supabaseUpdate(`registro_visitas_${sedeActual}`, visitaSeleccionada.id, {
      estado: 'Realizada',
      fecha_realizacion: new Date().toISOString(),
      documento_vocero: documentoVocero,
      nombre_docente: nombreDocente,
      documento_docente: documentoDocente
    });

    const grupoRegistrado = visitaSeleccionada.grupo;
    await cargarDatosSede();
    mostrarModalExito('¡Visita Registrada!', `La visita del grupo ${grupoRegistrado} fue registrada correctamente.`);

    setTimeout(() => {
      visitaSeleccionada = null;
      renderizarVisitasBecario();
      mostrarVista('vistaVisitasBecario');
    }, 2200);

  } catch (error) {
    mostrarMensaje('mensajeFormularioVisita', 'Error al guardar: ' + error.message, 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Registrar Visita';
  }
}

// ===================================
// "NO REALIZADA": elimina el registro por completo
// (ya no existe un estado permanente "No realizada").
// El grupo vuelve a estar Disponible de inmediato.
// ===================================
function cerrarModalNoRealizada() {
  document.getElementById('modalNoRealizada').classList.add('hidden');
}

async function marcarNoRealizada() {
  if (!visitaSeleccionada) return;

  const boton = document.getElementById('btnConfirmarNoRealizada');
  boton.disabled = true;
  boton.textContent = 'Guardando...';

  try {
    await supabaseDelete(`registro_visitas_${sedeActual}`, visitaSeleccionada.id);

    cerrarModalNoRealizada();
    await cargarDatosSede();
    mostrarModalExito('Visita actualizada', 'La visita fue liberada y el grupo vuelve a estar disponible.');

    visitaSeleccionada = null;
    renderizarVisitasBecario();

  } catch (error) {
    cerrarModalNoRealizada();
    mostrarMensaje('mensajeInicio', 'Error: ' + error.message, 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Sí, no fue realizada';
  }
}

function mostrarModalExito(titulo, mensaje) {
  document.getElementById('tituloModalExito').textContent = titulo;
  document.getElementById('mensajeModalExitoVisita').textContent = mensaje;
  document.getElementById('modalExitoVisita').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('modalExitoVisita').classList.add('hidden');
  }, 2100);
}

// ===================================
// HELPERS GENERALES
// ===================================
function mostrarLoaderInicio(mostrar) {
  const loader = document.getElementById('loaderInicio');
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
