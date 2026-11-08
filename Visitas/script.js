// =========================================================
// MÓDULO DE BECARIOS - VISITAS A GRUPOS - PMA
// Módulo independiente (no comparte lógica con VISITAS/ADMIN
// ni con PMA, salvo el CSS reutilizado). Sin autenticación:
// el becario se identifica únicamente por su nombre.
// =========================================================

// Constantes y utilidades globales provienen de ../Global/global.js
// Todas las operaciones con Supabase usan exclusivamente window.ConsultasPublicas.

// ===================================
// ESTADO GLOBAL
// ===================================
let sedeActual = null;
let areaActual = 'M';
let becarioSeleccionado = null;
let registrosSede = [];        // filas de registro_visitas_{sede} (solo Asignada / Realizada)
let tutoresSede = [];          // filas de tutores_{sede}
let visitaSeleccionada = null; // fila de registro que se está diligenciando / eliminando

const ORDEN_DIAS_SEMANA = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7
};

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', function () {
  // Precarga silenciosa de tutores de ambas sedes para respuesta inmediata al elegir sede
  ConsultasPublicas.precargarTutoresAmbasSedes();

  document.querySelectorAll('.visitas-sede-grande').forEach(boton => {
    boton.addEventListener('click', () => seleccionarSede(boton.dataset.sede));
  });

  document.querySelectorAll('.visitas-btn-area').forEach(boton => {
    boton.addEventListener('click', () => seleccionarArea(boton.dataset.area));
  });

  document.getElementById('formVisita').addEventListener('submit', registrarVisita);

  mostrarVista('vistaSede');
});

// ===================================
// SEDE Y ÁREA
// ===================================
async function seleccionarSede(sede) {
  sedeActual = sede;
  actualizarBotonesArea('M');
  document.getElementById('nombreSedeBecarios').textContent = sede.toUpperCase();
  document.getElementById('subtituloVista').textContent = `Sede ${sede.toUpperCase()}`;

  await cargarDatosSede();
  renderizarListadoBecarios();
  mostrarVista('vistaBecarios');
}

function seleccionarArea(area) {
  if (!area || areaActual === area) return;
  actualizarBotonesArea(area);
  renderizarListadoBecarios();
}

function actualizarBotonesArea(area) {
  areaActual = area;
  document.querySelectorAll('.visitas-btn-area').forEach(boton => {
    boton.classList.toggle('activo', boton.dataset.area === areaActual);
  });
}

function volverASede() {
  sedeActual = null;
  document.getElementById('subtituloVista').textContent = 'Seleccione su sede';
  mostrarVista('vistaSede');
}

async function cargarDatosSede() {
  mostrarLoaderInicio(true);
  try {
    const tablaCatalogo = `visitas_${sedeActual}`;
    const [registros, tutores] = await Promise.all([
      ConsultasPublicas.consultarTodo(`registro_visitas_${sedeActual}`, {
        select: `*,${tablaCatalogo}(dia,horario,salon)`,
        order: 'created_at.desc'
      }, 'visitas'),
      ConsultasPublicas.obtenerTutoresSede(sedeActual)
    ]);
    registrosSede = Array.isArray(registros) ? registros : [];
    tutoresSede = Array.isArray(tutores) ? tutores : [];
  } catch (error) {
    mostrarMensaje('mensajeInicio', ConsultasPublicas.interpretarError(error, 'Error al cargar los datos'), 'error');
  } finally {
    mostrarLoaderInicio(false);
  }
}

function obtenerInfoGrupo(registro) {
  if (!registro || !sedeActual) return {};
  return registro[`visitas_${sedeActual}`] || {};
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
  const ordenados = tutoresSede
    .filter(t => (t.area || '').trim() === areaActual)
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  if (ordenados.length === 0) {
    contenedor.innerHTML = '<p class="visitas-empty-state">No hay becarios registrados para esta área.</p>';
    return;
  }

  contenedor.innerHTML = ordenados.map((t, indice) => {
    const pendientes = registrosSede.filter(r => r.becario_asignado === t.nombre && r.estado === 'Asignada').length;
    const deshabilitado = pendientes === 0;
    const claseItem = `list-item visitas-becario-item${deshabilitado ? ' deshabilitado' : ''}`;
    const claseContador = deshabilitado ? 'visitas-becario-contador sin-visitas' : 'visitas-becario-contador';
    const texto = pendientes === 1 ? '1 visita' : `${pendientes} visitas`;

    return `<div class="${claseItem}" data-indice="${indice}"${deshabilitado ? ' aria-disabled="true"' : ''}>
      <span class="visitas-becario-nombre">${escaparHTML(t.nombre)}</span>
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

function normalizarClaveDia(dia) {
  return String(dia || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function compararDias(diaA, diaB) {
  const ordenA = ORDEN_DIAS_SEMANA[normalizarClaveDia(diaA)];
  const ordenB = ORDEN_DIAS_SEMANA[normalizarClaveDia(diaB)];
  if (ordenA !== undefined && ordenB !== undefined) {
    return ordenA - ordenB;
  }
  if (ordenA !== undefined) return -1;
  if (ordenB !== undefined) return 1;
  return String(diaA || '').localeCompare(String(diaB || ''));
}

function parsearHorario(horario) {
  if (typeof horario !== 'string') {
    return { inicio: Number.MAX_SAFE_INTEGER, fin: Number.MAX_SAFE_INTEGER };
  }
  const partes = horario.trim().split(/\s*-\s*/);
  const inicio = parseInt(partes[0], 10);
  const fin = partes.length > 1 ? parseInt(partes[1], 10) : Number.MAX_SAFE_INTEGER;
  return {
    inicio: Number.isNaN(inicio) ? Number.MAX_SAFE_INTEGER : inicio,
    fin: Number.isNaN(fin) ? Number.MAX_SAFE_INTEGER : fin
  };
}

function compararVisitasPorHorario(a, b) {
  const hA = parsearHorario(obtenerInfoGrupo(a).horario);
  const hB = parsearHorario(obtenerInfoGrupo(b).horario);
  if (hA.inicio !== hB.inicio) {
    return hA.inicio - hB.inicio;
  }
  return hA.fin - hB.fin;
}

function renderizarVisitasBecario() {
  const contenedor = document.getElementById('listadoVisitasBecario');
  const visitas = registrosSede.filter(
    r => r.becario_asignado === becarioSeleccionado && r.estado === 'Asignada'
  );

  if (visitas.length === 0) {
    contenedor.innerHTML = '<p class="visitas-empty-state">No tiene visitas pendientes por realizar.</p>';
    return;
  }

  // 1. Agrupar primero por día de la semana conservando el valor original del día
  const gruposPorDia = new Map();
  visitas.forEach(v => {
    const dia = (obtenerInfoGrupo(v).dia || '-').trim();
    if (!gruposPorDia.has(dia)) {
      gruposPorDia.set(dia, []);
    }
    gruposPorDia.get(dia).push(v);
  });

  // 2. Ordenar los días de la semana y dentro de cada día ordenar cronológicamente por horario
  const diasOrdenados = Array.from(gruposPorDia.keys()).sort(compararDias);
  const mapaVisitasPorId = new Map(visitas.map(v => [String(v.id), v]));

  contenedor.innerHTML = diasOrdenados.map(dia => {
    const visitasDelDia = gruposPorDia.get(dia).slice().sort(compararVisitasPorHorario);
    const itemsHTML = visitasDelDia.map(v => {
      const infoGrupo = obtenerInfoGrupo(v);
      return `
      <div class="list-item visitas-visita-item" data-id="${escaparHTML(String(v.id))}">
        <div class="visitas-visita-info" data-accion="abrir">
          <strong>Grupo ${escaparHTML(v.grupo)} — Visita ${v.numero_visita}/2</strong>
          <span>${escaparHTML(infoGrupo.horario || '-')}</span>
          <span>Salón ${escaparHTML(infoGrupo.salon || '-')}</span>
        </div>
        <button type="button" class="btn-no-realizada" data-accion="no-realizada">No realizada</button>
      </div>
    `;
    }).join('');

    return `
      <div class="visitas-grupo-dia">
        <h3 class="visitas-dia-encabezado">${escaparHTML(dia)}</h3>
        <div class="visitas-dia-lista">
          ${itemsHTML}
        </div>
      </div>
    `;
  }).join('');

  contenedor.querySelectorAll('.visitas-visita-item').forEach(elemento => {
    const visita = mapaVisitasPorId.get(elemento.dataset.id);
    if (!visita) return;

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

  const infoGrupo = obtenerInfoGrupo(visitaSeleccionada);

  document.getElementById('detalleVisitaFormulario').innerHTML = `
    <tr><td>Grupo</td><td>${escaparHTML(visitaSeleccionada.grupo)}</td></tr>
    <tr><td>Día</td><td>${escaparHTML(infoGrupo.dia || '-')}</td></tr>
    <tr><td>Horario</td><td>${escaparHTML(infoGrupo.horario || '-')}</td></tr>
    <tr><td>Salón</td><td>${escaparHTML(infoGrupo.salon || '-')}</td></tr>
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

// normalizarNombre(), validarDocumentoInput(), validarDocumento(),
// compararDocumentos(), validarCamposRequeridos(), scrollToError(),
// obtenerFechaISOColombia(), manejarEstadoBoton(), ejecutarEnvioConReintentos()
// — funciones globales definidas en ../Global/global.js

function validarFormularioVisita() {
  const documentoVoceroInput = document.getElementById('visitaDocumentoVocero');
  const documentoVoceroConfirmarInput = document.getElementById('visitaDocumentoVoceroConfirmar');
  const nombreDocenteInput = document.getElementById('visitaNombreDocente');
  const documentoDocenteInput = document.getElementById('visitaDocumentoDocente');
  const documentoDocenteConfirmarInput = document.getElementById('visitaDocumentoDocenteConfirmar');

  const reglas = [
    // 1. Documento del Vocero (6-10 dígitos)
    {
      valido: () => {
        validarDocumentoInput(documentoVoceroInput);
        return validarDocumento(documentoVoceroInput.value).valido;
      },
      mensaje: 'Escriba correctamente el documento del vocero',
      elemento: () => documentoVoceroInput
    },
    // 2. Confirmar Documento del Vocero
    {
      valido: () => {
        const doc = documentoVoceroInput.value;
        const docConfirmar = documentoVoceroConfirmarInput.value;
        return docConfirmar.length > 0 && compararDocumentos(doc, docConfirmar);
      },
      mensaje: 'Los documentos del vocero no coinciden',
      elemento: () => documentoVoceroConfirmarInput
    },
    // 3. Nombre del Docente
    {
      valido: () => nombreDocenteInput.value.trim().length > 0,
      mensaje: 'Por favor ingrese el nombre del docente',
      elemento: () => nombreDocenteInput
    },
    // 4. Documento del Docente (6-10 dígitos)
    {
      valido: () => {
        validarDocumentoInput(documentoDocenteInput);
        return validarDocumento(documentoDocenteInput.value).valido;
      },
      mensaje: 'Escriba correctamente el documento del docente',
      elemento: () => documentoDocenteInput
    },
    // 5. Confirmar Documento del Docente
    {
      valido: () => {
        const doc = documentoDocenteInput.value;
        const docConfirmar = documentoDocenteConfirmarInput.value;
        return docConfirmar.length > 0 && compararDocumentos(doc, docConfirmar);
      },
      mensaje: 'Los documentos del docente no coinciden',
      elemento: () => documentoDocenteConfirmarInput
    }
  ];

  const resultado = validarCamposRequeridos(reglas);

  if (!resultado.valido) {
    mostrarMensaje('mensajeFormularioVisita', resultado.mensaje, 'error');
    scrollToError(resultado.elemento);
    return false;
  }

  return true;
}

function obtenerDatosFormularioVisita() {
  return {
    estado: 'Realizada',
    fecha_realizacion: obtenerFechaISOColombia(),
    documento_vocero: document.getElementById('visitaDocumentoVocero').value,
    nombre_docente: normalizarNombre(document.getElementById('visitaNombreDocente').value),
    documento_docente: document.getElementById('visitaDocumentoDocente').value
  };
}

async function registrarVisita(evento) {
  evento.preventDefault();
  if (!visitaSeleccionada) return;

  const boton = document.getElementById('btnRegistrarVisita');

  if (!validarFormularioVisita()) {
    manejarEstadoBoton(boton, false, '', 'Registrar Visita');
    return;
  }

  const datos = obtenerDatosFormularioVisita();
  manejarEstadoBoton(boton, true, 'Guardando...');

  try {
    await ConsultasPublicas.actualizar(
      `registro_visitas_${sedeActual}`,
      visitaSeleccionada.id,
      datos,
      { esquema: 'visitas', retorno: 'minimal' }
    );

    const grupoRegistrado = visitaSeleccionada.grupo;
    await cargarDatosSede();
    mostrarModalExito('¡Visita Registrada!', `La visita del grupo ${grupoRegistrado} fue registrada correctamente.`);

    setTimeout(() => {
      visitaSeleccionada = null;
      renderizarVisitasBecario();
      mostrarVista('vistaVisitasBecario');
    }, 2200);

  } catch (error) {
    mostrarMensaje('mensajeFormularioVisita', ConsultasPublicas.interpretarError(error, 'Error al guardar'), 'error');
  } finally {
    manejarEstadoBoton(boton, false, '', 'Registrar Visita');
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
  manejarEstadoBoton(boton, true, 'Guardando...');

  try {
    await ConsultasPublicas.eliminar(
      `registro_visitas_${sedeActual}`,
      visitaSeleccionada.id,
      { esquema: 'visitas' }
    );

    cerrarModalNoRealizada();
    await cargarDatosSede();
    mostrarModalExito('Visita actualizada', 'La visita fue liberada y el grupo vuelve a estar disponible.');

    visitaSeleccionada = null;
    renderizarVisitasBecario();

  } catch (error) {
    cerrarModalNoRealizada();
    mostrarMensaje('mensajeInicio', ConsultasPublicas.interpretarError(error, 'Error al liberar la visita'), 'error');
  } finally {
    manejarEstadoBoton(boton, false, '', 'Sí, no fue realizada');
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
  controlarLoader('loaderInicio', mostrar);
}

// mostrarMensaje(), escaparHTML() e inicializarReinicioPorInactividad() — funciones globales definidas en ../Global/global.js
inicializarReinicioPorInactividad(3);
