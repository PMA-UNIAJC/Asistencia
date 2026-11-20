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
let registroVisitaEnProceso = false;
let temporizadorPostRegistro = null;

function establecerBloqueoFormularioVisita(bloqueado) {
  const estadoBloqueo = Boolean(bloqueado);
  registroVisitaEnProceso = estadoBloqueo;

  const formVisita = document.getElementById('formVisita');
  if (formVisita) {
    formVisita.setAttribute('aria-busy', estadoBloqueo ? 'true' : 'false');
    formVisita.querySelectorAll('input, select, textarea, button').forEach(control => {
      control.disabled = estadoBloqueo;
    });
  }

  const btnVolver = document.querySelector('#vistaFormularioVisita .visitas-btn-volver');
  if (btnVolver) {
    btnVolver.disabled = estadoBloqueo;
  }
}

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

const CONTENEDORES_MENSAJE_VISITAS = {
  vistaSede: 'mensajeInicio',
  vistaBecarios: 'mensajeBecarios',
  vistaVisitasBecario: 'mensajeVisitasBecario',
  vistaFormularioVisita: 'mensajeFormularioVisita'
};

function limpiarMensajeVisitas(idContenedor) {
  if (!idContenedor) return;
  if (typeof temporizadoresMensaje !== 'undefined' && temporizadoresMensaje[idContenedor]) {
    clearTimeout(temporizadoresMensaje[idContenedor].scroll);
    clearTimeout(temporizadoresMensaje[idContenedor].limpiar);
    delete temporizadoresMensaje[idContenedor];
  }
  const el = document.getElementById(idContenedor);
  if (el) el.textContent = '';
}

function obtenerContenedorMensajeActivo() {
  const vistaActiva = document.querySelector('.visitas-tab-content:not(.hidden)');
  if (vistaActiva && CONTENEDORES_MENSAJE_VISITAS[vistaActiva.id]) {
    return CONTENEDORES_MENSAJE_VISITAS[vistaActiva.id];
  }
  return 'mensajeInicio';
}

// ===================================
// SEDE Y ÁREA
// ===================================
async function seleccionarSede(sede) {
  limpiarMensajeVisitas('mensajeInicio');
  limpiarMensajeVisitas('mensajeBecarios');
  sedeActual = sede;

  try {
    await cargarDatosSede({ contenedorMensaje: 'mensajeInicio', lanzarError: true });
  } catch (error) {
    sedeActual = null;
    return;
  }

  actualizarBotonesArea('M');
  document.getElementById('nombreSedeBecarios').textContent = sede.toUpperCase();
  document.getElementById('subtituloVista').textContent = `Sede ${sede.toUpperCase()}`;

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
  limpiarMensajeVisitas('mensajeBecarios');
  limpiarMensajeVisitas('mensajeVisitasBecario');
  document.getElementById('subtituloVista').textContent = 'Seleccione su sede';
  mostrarVista('vistaSede');
}

async function cargarDatosSede(opciones) {
  const op = opciones || {};
  const contenedorMensaje = op.contenedorMensaje || obtenerContenedorMensajeActivo();
  const silencioso = Boolean(op.silencioso);
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
    return true;
  } catch (error) {
    if (!silencioso) {
      mostrarMensaje(contenedorMensaje, ConsultasPublicas.interpretarError(error, 'Error al cargar los datos'), 'error');
    }
    if (op.lanzarError) {
      throw error;
    }
    return false;
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
  limpiarMensajeVisitas('mensajeVisitasBecario');
  document.getElementById('nombreBecarioSeleccionado').textContent = nombre;
  renderizarVisitasBecario();
  mostrarVista('vistaVisitasBecario');
}

function volverABecarios() {
  becarioSeleccionado = null;
  limpiarMensajeVisitas('mensajeVisitasBecario');
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
  if (registroVisitaEnProceso) return;

  visitaSeleccionada = registrosSede.find(r => r.id === idRegistro);
  if (!visitaSeleccionada) return;

  if (temporizadorPostRegistro) {
    clearTimeout(temporizadorPostRegistro);
    temporizadorPostRegistro = null;
  }

  const infoGrupo = obtenerInfoGrupo(visitaSeleccionada);

  document.getElementById('detalleVisitaFormulario').innerHTML = `
    <tr><td>Grupo</td><td>${escaparHTML(visitaSeleccionada.grupo)}</td></tr>
    <tr><td>Día</td><td>${escaparHTML(infoGrupo.dia || '-')}</td></tr>
    <tr><td>Horario</td><td>${escaparHTML(infoGrupo.horario || '-')}</td></tr>
    <tr><td>Salón</td><td>${escaparHTML(infoGrupo.salon || '-')}</td></tr>
    <tr><td>Visita número</td><td>${visitaSeleccionada.numero_visita} de 2</td></tr>
  `;

  document.getElementById('formVisita').reset();
  establecerBloqueoFormularioVisita(false);
  manejarEstadoBoton(document.getElementById('btnRegistrarVisita'), false, '', 'Registrar Visita');
  limpiarMensajeVisitas('mensajeFormularioVisita');
  mostrarVista('vistaFormularioVisita');
}

function volverAVisitasBecario() {
  if (registroVisitaEnProceso) return;
  visitaSeleccionada = null;
  limpiarMensajeVisitas('mensajeFormularioVisita');
  limpiarMensajeVisitas('mensajeVisitasBecario');
  renderizarVisitasBecario();
  mostrarVista('vistaVisitasBecario');
}

// normalizarNombre(), validarDocumentoInput(), validarDocumento(),
// compararDocumentos(), validarCamposRequeridos(), scrollToError(),
// obtenerFechaISOColombia(), manejarEstadoBoton()
// — funciones globales definidas en ../Global/global.js
// ejecutarEnvioConReintentos(), obtenerFechaEnvioIdempotente()
// — funciones globales definidas en ../Global/reintentos.js

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

function obtenerDatosFormularioVisita(fechaRealizacion) {
  return {
    estado: 'Realizada',
    fecha_realizacion: fechaRealizacion || obtenerFechaISOColombia(),
    documento_vocero: document.getElementById('visitaDocumentoVocero').value,
    nombre_docente: normalizarNombre(document.getElementById('visitaNombreDocente').value),
    documento_docente: document.getElementById('visitaDocumentoDocente').value
  };
}

async function registrarVisita(evento) {
  evento.preventDefault();
  if (registroVisitaEnProceso || !visitaSeleccionada) return;

  const boton = document.getElementById('btnRegistrarVisita');
  if (boton && boton.disabled) return;

  if (!validarFormularioVisita()) {
    manejarEstadoBoton(boton, false, '', 'Registrar Visita');
    return;
  }

  const idVisita = visitaSeleccionada.id;
  const grupoRegistrado = visitaSeleccionada.grupo;
  const tablaRegistro = `registro_visitas_${sedeActual}`;
  const claveOperacion = `visitas:registrar:${sedeActual}:${idVisita}`;
  const fechaRealizacion = typeof obtenerFechaEnvioIdempotente === 'function'
    ? obtenerFechaEnvioIdempotente(claveOperacion)
    : obtenerFechaISOColombia();
  const datos = obtenerDatosFormularioVisita(fechaRealizacion);

  establecerBloqueoFormularioVisita(true);
  let exitoRegistro = false;

  try {
    const resultado = await ejecutarEnvioConReintentos({
      clave: claveOperacion,
      datos,
      fechaISO: fechaRealizacion,
      boton,
      contenedorMensaje: 'mensajeFormularioVisita',
      textoBotonEnviando: 'Guardando...',
      textoBotonOriginal: 'Registrar Visita',
      textoCargando: 'Guardando visita...',
      contextoError: 'No se pudo registrar la visita',
      mensajeReintento: (intento, maxIntentos) =>
        `Problema temporal de conexión. Reintentando guardar visita (intento ${intento} de ${maxIntentos})...`,
      interpretarError: (err, respaldo) => ConsultasPublicas.interpretarError(err, respaldo),
      enviar: async () => {
        const resActualizacion = await ConsultasPublicas.actualizar(
          tablaRegistro,
          idVisita,
          datos,
          { esquema: 'visitas', retorno: 'representation', contarFilas: true, intentos: 1 }
        );
        const filas = resActualizacion && Array.isArray(resActualizacion.datos)
          ? resActualizacion.datos
          : [];
        const totalActualizados = resActualizacion && typeof resActualizacion.totalActualizados === 'number'
          ? resActualizacion.totalActualizados
          : filas.length;

        if (totalActualizados === 0 || filas.length === 0 || filas[0]?.estado !== 'Realizada') {
          throw new window.SupabaseMotor.ErrorConsultaSupabase(
            'No se pudo confirmar el registro de la visita en el servidor. Es posible que la visita ya haya sido modificada o eliminada.',
            { codigo: 'P0001', status: 409 }
          );
        }

        return filas[0];
      },
      verificarYaRegistrado: async () => {
        const fila = await ConsultasPublicas.consultarUno(tablaRegistro, {
          select: 'id,estado',
          eq: { field: 'id', value: idVisita },
          intentos: 1
        }, 'visitas');
        return fila && fila.estado === 'Realizada' ? fila : null;
      },
      alExito: async () => {
        exitoRegistro = true;
        registrosSede = registrosSede.map(r => (
          r.id === idVisita ? Object.assign({}, r, datos) : r
        ));

        let recargaOk = true;
        try {
          await cargarDatosSede({ silencioso: true, lanzarError: true });
        } catch (errRecarga) {
          recargaOk = false;
        }

        // Mantener botón y formulario bloqueados durante toda la transición visual del modal
        establecerBloqueoFormularioVisita(true);
        manejarEstadoBoton(boton, true, '¡Registrada!');
        mostrarModalExito('¡Visita Registrada!', `La visita del grupo ${grupoRegistrado} fue registrada correctamente.`);

        if (temporizadorPostRegistro) {
          clearTimeout(temporizadorPostRegistro);
        }
        temporizadorPostRegistro = setTimeout(() => {
          temporizadorPostRegistro = null;
          visitaSeleccionada = null;
          const formVisita = document.getElementById('formVisita');
          if (formVisita) formVisita.reset();
          establecerBloqueoFormularioVisita(false);
          manejarEstadoBoton(boton, false, '', 'Registrar Visita');
          renderizarVisitasBecario();
          mostrarVista('vistaVisitasBecario');
          if (!recargaOk) {
            mostrarMensaje('mensajeVisitasBecario', 'La visita se registró, pero no se pudo actualizar el listado desde el servidor.', 'warning');
          }
        }, 2200);
      }
    });

    exitoRegistro = exitoRegistro || Boolean(resultado && resultado.exito);
  } finally {
    if (!exitoRegistro) {
      establecerBloqueoFormularioVisita(false);
      manejarEstadoBoton(boton, false, '', 'Registrar Visita');
    }
  }
}

// ===================================
// "NO REALIZADA": elimina el registro por completo
// (ya no existe un estado permanente "No realizada").
// El grupo vuelve a estar Disponible de inmediato.
// ===================================
function cerrarModalNoRealizada() {
  document.getElementById('modalNoRealizada').classList.add('hidden');
  visitaSeleccionada = null;
}

async function marcarNoRealizada() {
  if (!visitaSeleccionada) return;

  const boton = document.getElementById('btnConfirmarNoRealizada');
  if (boton && boton.disabled) return;

  const idVisita = visitaSeleccionada.id;
  const tablaRegistro = `registro_visitas_${sedeActual}`;
  const claveOperacion = `visitas:no_realizada:${sedeActual}:${idVisita}`;

  limpiarMensajeVisitas('mensajeVisitasBecario');

  await ejecutarEnvioConReintentos({
    clave: claveOperacion,
    datos: { id: idVisita },
    boton,
    textoBotonEnviando: 'Guardando...',
    textoBotonOriginal: 'Sí, no fue realizada',
    mostrarLoader: false,
    mostrarErrorAutomatico: false,
    contextoError: 'Error al liberar la visita',
    interpretarError: (err, respaldo) => ConsultasPublicas.interpretarError(err, respaldo),
    enviar: async () => {
      const eliminadas = await ConsultasPublicas.eliminar(
        tablaRegistro,
        idVisita,
        { esquema: 'visitas', retorno: 'representation', intentos: 1 }
      );
      if (!Array.isArray(eliminadas) || eliminadas.length === 0) {
        throw new window.SupabaseMotor.ErrorConsultaSupabase(
          'No se pudo confirmar la liberación de la visita en el servidor. Es posible que ya haya sido eliminada o existan restricciones de permisos.',
          { codigo: 'P0001', status: 409 }
        );
      }
      return eliminadas[0];
    },
    verificarYaRegistrado: async () => {
      const fila = await ConsultasPublicas.consultarUno(tablaRegistro, {
        select: 'id',
        eq: { field: 'id', value: idVisita },
        intentos: 1
      }, 'visitas');
      return !fila ? { eliminada: true } : null;
    },
    alExito: async () => {
      cerrarModalNoRealizada();
      manejarEstadoBoton(boton, false, '', 'Sí, no fue realizada');
      registrosSede = registrosSede.filter(r => r.id !== idVisita);

      let recargaOk = true;
      try {
        await cargarDatosSede({ silencioso: true, lanzarError: true });
      } catch (errRecarga) {
        recargaOk = false;
      }

      mostrarModalExito('Visita actualizada', 'La visita fue liberada y el grupo vuelve a estar disponible.');

      visitaSeleccionada = null;
      renderizarVisitasBecario();
      if (!recargaOk) {
        mostrarMensaje('mensajeVisitasBecario', 'La visita fue liberada, pero no se pudo actualizar el listado desde el servidor.', 'warning');
      }
    },
    alErrorFinal: (error, meta) => {
      cerrarModalNoRealizada();
      visitaSeleccionada = null;
      manejarEstadoBoton(boton, false, '', 'Sí, no fue realizada');
      mostrarMensaje(
        'mensajeVisitasBecario',
        meta && meta.mensaje ? meta.mensaje : ConsultasPublicas.interpretarError(error, 'Error al liberar la visita'),
        'error'
      );
    }
  });
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
