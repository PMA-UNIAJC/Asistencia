// ============================================================================
// Admin/Diagnosticos/script.js
// Controlador de interfaz del CRUD administrativo de Diagnósticos.
//
// Reutiliza de ../../Global/global.js:
//   mostrarMensaje(), mostrarCargando(), ocultarCargando(), controlarLoader(),
//   mostrarModalConfirmacion(), manejarEstadoBoton(), escaparHTML(),
//   scrollToError(), validarCamposRequeridos(), formatearAsteriscosLabels()
//
// Reutiliza de ./supabase.js:
//   window.DiagnosticosAPI
// ============================================================================

(function (window, document) {
  'use strict';

  const API = window.DiagnosticosAPI;
  const U = API.utilidades;
  const MIN_OPCIONES = 2;
  const MAX_OPCIONES = 4;

  // =========================================================
  // 1. ESTADO DEL PANEL
  // =========================================================

  const estado = {
    pruebaActual: 'MATEMATICAS',
    vistaActual: 'preguntas', // 'preguntas' | 'textos'
    cargando: false,
    procesandoAccion: false,
    preguntas: [],
    textos: [],
    textosPorId: new Map(),
    resumenDiagnosticos: {},
    bustCacheImagen: Date.now()
  };

  const editorPregunta = {
    abierto: false,
    guardando: false,
    original: null, // null = crear, objeto = editar
    opciones: [],   // [{ clave: 'opcion_1', texto: '' }] — la primera opción es siempre la correcta
    archivoNuevo: null,
    previewBlobUrl: null,
    quitarImagen: false,
    extensionActual: '',
    snapshotInicial: ''
  };

  const editorTexto = {
    abierto: false,
    guardando: false,
    original: null,
    archivoNuevo: null,
    previewBlobUrl: null,
    quitarImagen: false,
    extensionActual: '',
    snapshotInicial: ''
  };

  // =========================================================
  // 2. REFERENCIAS DOM
  // =========================================================

  const $ = function (id) { return document.getElementById(id); };
  const dom = {};

  function cachearDOM() {
    [
      'btnRecargarDiagnostico', 'iconoRecargar',
      'btnPruebaMatematicas', 'btnPruebaComunicacion', 'btnPruebaLectura',
      'countPruebaMatematicas', 'countPruebaComunicacion', 'countPruebaLectura',
      'mensajePrincipal', 'alertaSinActivas', 'textoAlertaSinActivas',
      'statTotalPreguntas', 'statPreguntasActivas', 'statConImagen',
      'statTextosCompartidos',
      'tabVistaPreguntas', 'tabVistaTextos',
      'vistaPreguntas', 'vistaTextos',
      'tituloSeccionPreguntas', 'btnNuevaPregunta',
      'inputBuscarPregunta', 'filtroEstadoPregunta', 'filtroRecursoPregunta',
      'contadorPreguntasFiltradas', 'btnLimpiarFiltrosPreguntas', 'contenedorListaPreguntas',
      'tituloSeccionTextos', 'btnNuevoTexto',
      'inputBuscarTexto', 'filtroEstadoTexto',
      'contadorTextosFiltrados', 'btnLimpiarFiltrosTextos', 'contenedorListaTextos',
      // Modal Pregunta
      'modalPregunta', 'subtituloModalPregunta', 'tituloModalPregunta', 'btnCerrarModalPregunta',
      'formPregunta', 'avisoRespuestasEdicion', 'textoAvisoRespuestasEdicion',
      'pregNumero', 'pregEstado', 'pregTextoCompartido', 'btnIrATextosDesdeModal',
      'previewTextoSeleccionado', 'pregEnunciado',
      'contadorOpcionesModal', 'listaOpcionesEditor', 'btnAgregarOpcion',
      'inputArchivoImagenPregunta', 'dropzoneImagenPregunta', 'panelImagenPreguntaActiva',
      'imgPreviewPregunta', 'errorPreviewPregunta', 'pregNombreImagen',
      'rutaStoragePreviewPregunta', 'btnReemplazarImagenPregunta', 'btnQuitarImagenPregunta',
      'mensajeModalPregunta', 'btnCancelarModalPregunta', 'btnGuardarPregunta',
      // Modal Texto Compartido
      'modalTexto', 'subtituloModalTexto', 'tituloModalTexto', 'btnCerrarModalTexto',
      'formTexto', 'txtTitulo', 'txtEstado', 'txtContenido',
      'inputArchivoImagenTexto', 'dropzoneImagenTexto', 'panelImagenTextoActiva',
      'imgPreviewTexto', 'errorPreviewTexto', 'txtNombreImagen',
      'rutaStoragePreviewTexto', 'btnReemplazarImagenTexto', 'btnQuitarImagenTexto',
      'mensajeModalTexto', 'btnCancelarModalTexto', 'btnGuardarTexto',
      // Lightbox Imagen y Confirmación
      'modalVistaImagen', 'rutaVistaImagen', 'tituloVistaImagen', 'btnCerrarVistaImagen', 'imgVistaAmpliada',
      'modalConfirmacion', 'btnConfirmarModal', 'btnCancelarModal'
    ].forEach(function (id) {
      dom[id] = $(id);
    });
  }

  // =========================================================
  // 3. UTILIDADES GENERALES DE INTERFAZ
  // =========================================================

  function configActual() {
    return API.CONFIG[estado.pruebaActual];
  }

  function normalizarBusqueda(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function ordenarClavesOpciones(claves) {
    return claves.slice().sort(function (a, b) {
      const numA = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return String(a).localeCompare(String(b));
    });
  }

  function extraerEntradasOpciones(opcionesObj, respuestaCorrecta) {
    if (!opcionesObj || typeof opcionesObj !== 'object' || Array.isArray(opcionesObj)) {
      return [];
    }
    const entradas = ordenarClavesOpciones(Object.keys(opcionesObj))
      .filter(function (clave) {
        return typeof opcionesObj[clave] === 'string';
      })
      .map(function (clave) {
        return { clave: clave, texto: opcionesObj[clave] };
      });

    if (respuestaCorrecta) {
      const idxCorrecta = entradas.findIndex(function (op) {
        return op.clave === respuestaCorrecta;
      });
      if (idxCorrecta > 0) {
        const correcta = entradas.splice(idxCorrecta, 1)[0];
        entradas.unshift(correcta);
      }
    }

    return entradas;
  }

  function siguienteClaveOpcion(listaOpciones) {
    let maxNum = 0;
    listaOpciones.forEach(function (op) {
      const m = /^opcion_(\d+)$/.exec(op.clave);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    return 'opcion_' + (maxNum + 1);
  }

  function siguienteNumeroPregunta() {
    let maxNumero = 0;
    estado.preguntas.forEach(function (p) {
      const n = Number(p.numero) || 0;
      if (n > maxNumero) maxNumero = n;
    });
    return maxNumero + 1;
  }

  function imagenUsadaPorOtroRegistro(nombreArchivo, tipoExcluir, idExcluir) {
    if (!nombreArchivo) return false;
    const objetivo = nombreArchivo.toLowerCase();

    const enOtraPregunta = estado.preguntas.some(function (p) {
      if (tipoExcluir === 'pregunta' && Number(p.id) === Number(idExcluir)) return false;
      return p.imagen && String(p.imagen).trim().toLowerCase() === objetivo;
    });
    if (enOtraPregunta) return true;

    return estado.textos.some(function (t) {
      if (tipoExcluir === 'texto' && Number(t.id) === Number(idExcluir)) return false;
      return t.imagen && String(t.imagen).trim().toLowerCase() === objetivo;
    });
  }

  function liberarBlobUrl(controlador) {
    if (controlador.previewBlobUrl) {
      URL.revokeObjectURL(controlador.previewBlobUrl);
      controlador.previewBlobUrl = null;
    }
  }

  // Envoltura sobre mostrarModalConfirmacion global que permite personalizar
  // texto y estilo de peligro del botón principal sin alterar Global/global.js.
  function confirmarAccion(opciones) {
    const btnConfirmar = dom.btnConfirmarModal;
    const btnCancelar = dom.btnCancelarModal;
    if (!btnConfirmar || !btnCancelar) return;

    btnConfirmar.textContent = opciones.textoConfirmar || 'Sí, continuar';
    btnCancelar.textContent = opciones.textoCancelar || 'Cancelar';
    btnConfirmar.classList.toggle('diag-btn-peligro', !!opciones.peligro);

    mostrarModalConfirmacion(opciones.titulo, opciones.mensaje, function () {
      btnConfirmar.classList.remove('diag-btn-peligro');
      if (typeof opciones.alConfirmar === 'function') {
        opciones.alConfirmar();
      }
    });

    const cancelarOriginal = btnCancelar.onclick;
    btnCancelar.onclick = function () {
      btnConfirmar.classList.remove('diag-btn-peligro');
      if (cancelarOriginal) cancelarOriginal();
    };
  }

  function abrirVistaImagen(url, titulo, rutaRelativa) {
    if (!url) return;
    dom.imgVistaAmpliada.src = url;
    dom.tituloVistaImagen.textContent = titulo || 'Vista previa de imagen';
    dom.rutaVistaImagen.textContent = rutaRelativa || '';
    dom.modalVistaImagen.classList.remove('hidden');
  }

  function cerrarVistaImagen() {
    dom.modalVistaImagen.classList.add('hidden');
    dom.imgVistaAmpliada.src = '';
  }

  // =========================================================
  // 4. CARGA DE DATOS Y CAMBIO DE DIAGNÓSTICO / PESTAÑAS
  // =========================================================

  async function cargarDiagnosticoActual(silencioso, forzarServidor) {
    if (estado.cargando) return;
    estado.cargando = true;
    dom.btnRecargarDiagnostico.disabled = true;
    if (dom.iconoRecargar) dom.iconoRecargar.classList.add('diag-girando');

    if (!silencioso) {
      controlarLoader('loaderDiagnosticos', true, 'Cargando ' + configActual().titulo + '...');
    }

    try {
      const respuesta = await API.obtenerDiagnostico(estado.pruebaActual, {
        forzar: Boolean(forzarServidor)
      });
      const preguntas = Array.isArray(respuesta && respuesta.preguntas) ? respuesta.preguntas : [];
      const textos = Array.isArray(respuesta && respuesta.textos) ? respuesta.textos : [];

      estado.preguntas = preguntas;
      estado.textos = textos;
      estado.textosPorId = new Map();
      textos.forEach(function (t) {
        estado.textosPorId.set(Number(t.id), t);
      });

      estado.resumenDiagnosticos = (respuesta && respuesta.resumen_diagnosticos) || {};
      estado.bustCacheImagen = Date.now();

      actualizarEncabezadosYResumen();
      renderizarListaPreguntas();
      renderizarListaTextos();
    } catch (error) {
      console.error('[Admin Diagnósticos] Error cargando diagnóstico:', error);
      const mensaje = U.interpretarErrorDiagnostico(error, 'No se pudo cargar el diagnóstico');
      mostrarMensaje('mensajePrincipal', mensaje, 'error');
      renderizarEstadoErrorCarga(mensaje);
    } finally {
      estado.cargando = false;
      dom.btnRecargarDiagnostico.disabled = false;
      if (dom.iconoRecargar) dom.iconoRecargar.classList.remove('diag-girando');
      controlarLoader('loaderDiagnosticos', false);
    }
  }

  function seleccionarDiagnostico(nuevaPrueba) {
    if (!API.CONFIG[nuevaPrueba] || nuevaPrueba === estado.pruebaActual || estado.cargando) {
      return;
    }

    // Limpiar búsquedas al cambiar de diagnóstico para mostrar su listado completo
    dom.inputBuscarPregunta.value = '';
    dom.filtroEstadoPregunta.value = 'todas';
    dom.filtroRecursoPregunta.value = 'todos';
    dom.inputBuscarTexto.value = '';
    dom.filtroEstadoTexto.value = 'todos';
    dom.mensajePrincipal.textContent = '';

    estado.pruebaActual = nuevaPrueba;

    [
      ['MATEMATICAS', dom.btnPruebaMatematicas],
      ['COMUNICACION', dom.btnPruebaComunicacion],
      ['LECTURA', dom.btnPruebaLectura]
    ].forEach(function (par) {
      const activo = par[0] === nuevaPrueba;
      par[1].classList.toggle('activo', activo);
      par[1].setAttribute('aria-selected', String(activo));
    });

    cargarDiagnosticoActual(false);
  }

  function cambiarVistaInterna(vista) {
    if (vista !== 'preguntas' && vista !== 'textos') return;
    estado.vistaActual = vista;

    const esPreguntas = vista === 'preguntas';
    dom.tabVistaPreguntas.classList.toggle('active', esPreguntas);
    dom.tabVistaTextos.classList.toggle('active', !esPreguntas);
    dom.vistaPreguntas.classList.toggle('hidden', !esPreguntas);
    dom.vistaTextos.classList.toggle('hidden', esPreguntas);
  }

  function actualizarEncabezadosYResumen() {
    const cfg = configActual();
    dom.tituloSeccionPreguntas.textContent = 'Preguntas de ' + cfg.titulo;
    dom.tituloSeccionTextos.textContent = 'Textos Compartidos de ' + cfg.titulo;

    const total = estado.preguntas.length;
    const activas = estado.preguntas.filter(function (p) { return !!p.activa; }).length;
    const conImagen = estado.preguntas.filter(function (p) { return !!(p.imagen && String(p.imagen).trim()); }).length;
    const totalTextos = estado.textos.length;

    dom.statTotalPreguntas.textContent = String(total);
    dom.statPreguntasActivas.textContent = String(activas);
    dom.statConImagen.textContent = String(conImagen);
    dom.statTextosCompartidos.textContent = String(totalTextos);

    // Actualizar contadores de cada diagnóstico en el selector superior
    const res = estado.resumenDiagnosticos || {};
    const actualizarBadge = function (codigo, el) {
      if (!el) return;
      if (codigo === estado.pruebaActual) {
        el.textContent = String(total);
      } else if (res[codigo] && typeof res[codigo].total === 'number') {
        el.textContent = String(res[codigo].total);
      }
    };
    actualizarBadge('MATEMATICAS', dom.countPruebaMatematicas);
    actualizarBadge('COMUNICACION', dom.countPruebaComunicacion);
    actualizarBadge('LECTURA', dom.countPruebaLectura);

    // Aviso si el diagnóstico no tiene preguntas activas
    if (activas === 0) {
      dom.textoAlertaSinActivas.textContent = total === 0
        ? 'Este diagnóstico todavía no tiene preguntas registradas. Añade al menos una pregunta activa para habilitar la presentación de la prueba.'
        : 'Todas las preguntas de este diagnóstico están marcadas como inactivas. Activa al menos una pregunta para que los estudiantes puedan presentar la prueba.';
      dom.alertaSinActivas.classList.remove('hidden');
    } else {
      dom.alertaSinActivas.classList.add('hidden');
    }
  }

  function renderizarEstadoErrorCarga(mensaje) {
    const html =
      '<div class="diag-empty-state">' +
        '<h3>No fue posible obtener la información</h3>' +
        '<p>' + escaparHTML(mensaje) + '</p>' +
        '<button type="button" class="btn diag-btn-primario" id="btnReintentarCarga">Reintentar conexión</button>' +
      '</div>';
    dom.contenedorListaPreguntas.innerHTML = html;
    dom.contenedorListaTextos.innerHTML = '';
    dom.contadorPreguntasFiltradas.textContent = 'Sin conexión con la base de datos';
    const btn = $('btnReintentarCarga');
    if (btn) {
      btn.addEventListener('click', function () { cargarDiagnosticoActual(false); });
    }
  }

  // =========================================================
  // 5. LISTADO Y FILTRADO DE PREGUNTAS
  // =========================================================

  function obtenerPreguntasFiltradas() {
    const termino = normalizarBusqueda(dom.inputBuscarPregunta.value);
    const estadoFiltro = dom.filtroEstadoPregunta.value;
    const recursoFiltro = dom.filtroRecursoPregunta.value;

    return estado.preguntas.filter(function (p) {
      if (estadoFiltro === 'activas' && !p.activa) return false;
      if (estadoFiltro === 'inactivas' && p.activa) return false;

      const tieneImagen = !!(p.imagen && String(p.imagen).trim());
      const tieneTexto = p.texto_id != null && estado.textosPorId.has(Number(p.texto_id));

      if (recursoFiltro === 'con_imagen' && !tieneImagen) return false;
      if (recursoFiltro === 'sin_imagen' && tieneImagen) return false;
      if (recursoFiltro === 'con_texto' && !tieneTexto) return false;
      if (recursoFiltro === 'sin_texto' && tieneTexto) return false;

      if (!termino) return true;

      const textoAsociado = tieneTexto ? estado.textosPorId.get(Number(p.texto_id)) : null;
      const opcionesConcat = extraerEntradasOpciones(p.opciones)
        .map(function (o) { return o.texto; })
        .join(' ');

      const bolsa = normalizarBusqueda(
        'pregunta ' + p.numero + ' #' + p.numero + ' ' +
        (p.enunciado || '') + ' ' +
        opcionesConcat + ' ' +
        (p.imagen || '') + ' ' +
        (textoAsociado ? (textoAsociado.titulo || '') + ' ' + (textoAsociado.contenido || '') : '')
      );
      return bolsa.indexOf(termino) !== -1;
    });
  }

  function hayFiltrosPreguntasActivos() {
    return (
      dom.inputBuscarPregunta.value.trim() !== '' ||
      dom.filtroEstadoPregunta.value !== 'todas' ||
      dom.filtroRecursoPregunta.value !== 'todos'
    );
  }

  function renderizarListaPreguntas() {
    const total = estado.preguntas.length;
    const filtradas = obtenerPreguntasFiltradas();
    const conFiltros = hayFiltrosPreguntasActivos();

    dom.btnLimpiarFiltrosPreguntas.classList.toggle('hidden', !conFiltros);

    if (total === 0) {
      dom.contadorPreguntasFiltradas.textContent = '0 preguntas registradas en ' + configActual().titulo;
      dom.contenedorListaPreguntas.innerHTML =
        '<div class="diag-empty-state">' +
          '<h3>Este diagnóstico aún no tiene preguntas</h3>' +
          '<p>Crea la primera pregunta de ' + escaparHTML(configActual().titulo) + ' con sus opciones de respuesta e imagen opcional.</p>' +
          '<button type="button" class="btn diag-btn-primario" data-accion="nueva-pregunta-vacio">+ Crear primera pregunta</button>' +
        '</div>';
      return;
    }

    dom.contadorPreguntasFiltradas.textContent = conFiltros
      ? 'Mostrando ' + filtradas.length + ' de ' + total + ' pregunta(s)'
      : 'Mostrando las ' + total + ' pregunta(s) del diagnóstico';

    if (filtradas.length === 0) {
      dom.contenedorListaPreguntas.innerHTML =
        '<div class="diag-empty-state">' +
          '<h3>Sin coincidencias con los filtros actuales</h3>' +
          '<p>Ninguna pregunta de ' + escaparHTML(configActual().titulo) + ' coincide con los criterios seleccionados.</p>' +
          '<button type="button" class="btn btn-secondary diag-btn-chico" data-accion="limpiar-filtros-preguntas">Mostrar todas las preguntas</button>' +
        '</div>';
      return;
    }

    const fragmento = document.createDocumentFragment();
    filtradas.forEach(function (pregunta) {
      fragmento.appendChild(construirTarjetaPregunta(pregunta));
    });
    dom.contenedorListaPreguntas.textContent = '';
    dom.contenedorListaPreguntas.appendChild(fragmento);
  }

  function construirTarjetaPregunta(pregunta) {
    const cfg = configActual();
    const card = document.createElement('article');
    card.className = 'diag-card' + (pregunta.activa ? '' : ' diag-card-inactiva');
    card.dataset.id = String(pregunta.id);

    const tieneImagen = !!(pregunta.imagen && String(pregunta.imagen).trim());
    const textoAsociado = pregunta.texto_id != null ? estado.textosPorId.get(Number(pregunta.texto_id)) : null;
    const totalRespuestas = Number(pregunta.total_respuestas) || 0;

    // 1. Cabecera de tarjeta
    const header = document.createElement('div');
    header.className = 'diag-card-header';

    const badges = document.createElement('div');
    badges.className = 'diag-badges';

    const numBadge = document.createElement('span');
    numBadge.className = 'diag-numero-badge';
    numBadge.textContent = 'Pregunta #' + pregunta.numero;
    badges.appendChild(numBadge);

    const estadoPill = document.createElement('span');
    estadoPill.className = 'diag-pill ' + (pregunta.activa ? 'diag-pill-activa' : 'diag-pill-inactiva');
    estadoPill.textContent = pregunta.activa ? 'Activa' : 'Inactiva';
    badges.appendChild(estadoPill);

    if (tieneImagen) {
      const imgPill = document.createElement('span');
      imgPill.className = 'diag-pill diag-pill-info';
      imgPill.textContent = 'Con imagen';
      badges.appendChild(imgPill);
    }

    if (textoAsociado) {
      const txtPill = document.createElement('span');
      txtPill.className = 'diag-pill diag-pill-info';
      txtPill.textContent = 'Texto compartido';
      badges.appendChild(txtPill);
    }

    if (totalRespuestas > 0) {
      const respPill = document.createElement('span');
      respPill.className = 'diag-pill diag-pill-respuestas';
      respPill.textContent = totalRespuestas + (totalRespuestas === 1 ? ' respuesta' : ' respuestas');
      badges.appendChild(respPill);
    }

    const acciones = document.createElement('div');
    acciones.className = 'diag-card-acciones';

    const btnEditar = document.createElement('button');
    btnEditar.type = 'button';
    btnEditar.className = 'diag-btn-accion diag-btn-accion-editar';
    btnEditar.dataset.accion = 'editar-pregunta';
    btnEditar.dataset.id = String(pregunta.id);
    btnEditar.textContent = 'Editar';

    const btnEstado = document.createElement('button');
    btnEstado.type = 'button';
    btnEstado.className = 'diag-btn-accion';
    btnEstado.dataset.accion = 'toggle-pregunta';
    btnEstado.dataset.id = String(pregunta.id);
    btnEstado.textContent = pregunta.activa ? 'Desactivar' : 'Activar';

    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.className = 'diag-btn-accion diag-btn-accion-eliminar';
    btnEliminar.dataset.accion = 'eliminar-pregunta';
    btnEliminar.dataset.id = String(pregunta.id);
    btnEliminar.textContent = 'Eliminar';

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEstado);
    acciones.appendChild(btnEliminar);

    header.appendChild(badges);
    header.appendChild(acciones);
    card.appendChild(header);

    // 2. Resumen del texto compartido si aplica
    if (textoAsociado) {
      const ctx = document.createElement('div');
      ctx.className = 'diag-contexto-resumen';
      const ctxTitulo = document.createElement('div');
      ctxTitulo.className = 'diag-contexto-resumen-titulo';
      ctxTitulo.textContent = 'Texto compartido: ' + (textoAsociado.titulo || ('Texto #' + textoAsociado.id)) +
        (textoAsociado.activo ? '' : ' (Inactivo)');
      const ctxExtracto = document.createElement('div');
      ctxExtracto.className = 'diag-contexto-resumen-extracto';
      ctxExtracto.textContent = textoAsociado.contenido || '';
      ctx.appendChild(ctxTitulo);
      ctx.appendChild(ctxExtracto);
      card.appendChild(ctx);
    }

    // 3. Cuerpo: Enunciado + Opciones + Miniatura de imagen
    const cuerpo = document.createElement('div');
    cuerpo.className = 'diag-card-cuerpo' + (tieneImagen ? ' con-imagen' : '');

    const colContenido = document.createElement('div');

    const enunciado = document.createElement('p');
    enunciado.className = 'diag-enunciado-texto';
    enunciado.textContent = pregunta.enunciado || '';
    colContenido.appendChild(enunciado);

    const gridOpciones = document.createElement('div');
    gridOpciones.className = 'diag-opciones-card';

    const entradasOpciones = extraerEntradasOpciones(pregunta.opciones, pregunta.respuesta_correcta);
    entradasOpciones.forEach(function (op, idx) {
      const esCorrecta = idx === 0;
      const itemOp = document.createElement('div');
      itemOp.className = 'diag-opcion-vista' + (esCorrecta ? ' es-correcta' : '');

      const textoOp = document.createElement('span');
      textoOp.className = 'diag-opcion-texto-vista';
      textoOp.textContent = op.texto;

      itemOp.appendChild(textoOp);
      gridOpciones.appendChild(itemOp);
    });

    colContenido.appendChild(gridOpciones);
    cuerpo.appendChild(colContenido);

    if (tieneImagen) {
      const nombreImg = String(pregunta.imagen).trim();
      const urlImg = U.obtenerUrlPublicaImagen(estado.pruebaActual, nombreImg, estado.bustCacheImagen);
      const rutaRel = 'IMG/' + cfg.carpetaStorage + '/' + nombreImg;
      cuerpo.appendChild(construirMiniaturaImagen(urlImg, nombreImg, 'Pregunta #' + pregunta.numero, rutaRel));
    }

    card.appendChild(cuerpo);
    return card;
  }

  function construirMiniaturaImagen(urlImg, nombreArchivo, tituloModal, rutaRelativa) {
    const figure = document.createElement('figure');
    figure.className = 'diag-thumb-figure';

    const btnZoom = document.createElement('button');
    btnZoom.type = 'button';
    btnZoom.className = 'diag-thumb-btn';
    btnZoom.title = 'Haz clic para ampliar la imagen';

    const img = document.createElement('img');
    img.src = urlImg;
    img.alt = tituloModal;
    img.loading = 'lazy';
    img.decoding = 'async';

    img.addEventListener('error', function () {
      btnZoom.replaceWith((function () {
        const aviso = document.createElement('div');
        aviso.className = 'diag-thumb-rota';
        aviso.textContent = 'Imagen no encontrada en Storage (' + nombreArchivo + ')';
        return aviso;
      })());
    });

    btnZoom.addEventListener('click', function () {
      abrirVistaImagen(urlImg, tituloModal + ' — ' + nombreArchivo, rutaRelativa);
    });

    btnZoom.appendChild(img);
    figure.appendChild(btnZoom);

    const caption = document.createElement('figcaption');
    caption.className = 'diag-thumb-caption';
    caption.textContent = nombreArchivo;
    figure.appendChild(caption);

    return figure;
  }

  // =========================================================
  // 6. EDITOR DE PREGUNTAS (CREAR / EDITAR)
  // =========================================================

  function poblarSelectTextosModal(valorSeleccionado) {
    const select = dom.pregTextoCompartido;
    select.innerHTML = '<option value="">Sin texto compartido (pregunta independiente)</option>';

    estado.textos.forEach(function (t) {
      const opt = document.createElement('option');
      opt.value = String(t.id);
      const etiquetaBase = t.titulo ? t.titulo : ('Texto #' + t.id);
      opt.textContent = etiquetaBase + (t.activo ? '' : ' (Inactivo)');
      if (valorSeleccionado != null && Number(valorSeleccionado) === Number(t.id)) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    actualizarPreviewTextoSeleccionado();
  }

  function actualizarPreviewTextoSeleccionado() {
    const val = dom.pregTextoCompartido.value;
    const caja = dom.previewTextoSeleccionado;
    if (!val) {
      caja.classList.add('hidden');
      caja.textContent = '';
      return;
    }
    const texto = estado.textosPorId.get(Number(val));
    if (!texto) {
      caja.classList.add('hidden');
      caja.textContent = '';
      return;
    }
    caja.textContent = (texto.titulo ? texto.titulo + '\n\n' : '') + (texto.contenido || '');
    caja.classList.remove('hidden');
  }

  function renderizarOpcionesEditor() {
    const contenedor = dom.listaOpcionesEditor;
    contenedor.textContent = '';

    const puedeEliminar = editorPregunta.opciones.length > MIN_OPCIONES;
    const puedeAgregar = editorPregunta.opciones.length < MAX_OPCIONES;

    dom.contadorOpcionesModal.textContent = editorPregunta.opciones.length + ' / ' + MAX_OPCIONES + ' opciones';
    dom.btnAgregarOpcion.disabled = !puedeAgregar;
    dom.btnAgregarOpcion.classList.toggle('hidden', !puedeAgregar);

    editorPregunta.opciones.forEach(function (op, idx) {
      const esCorrecta = idx === 0;
      const fila = document.createElement('div');
      fila.className = 'diag-opcion-fila' + (esCorrecta ? ' es-correcta' : '');

      const inputTexto = document.createElement('input');
      inputTexto.type = 'text';
      inputTexto.className = 'diag-opcion-input';
      inputTexto.placeholder = 'Escribe el texto de la opción...';
      inputTexto.value = op.texto;
      inputTexto.addEventListener('input', function () {
        editorPregunta.opciones[idx].texto = inputTexto.value;
      });

      const btnQuitar = document.createElement('button');
      btnQuitar.type = 'button';
      btnQuitar.className = 'diag-btn-quitar-opcion';
      btnQuitar.disabled = !puedeEliminar;
      btnQuitar.title = puedeEliminar ? 'Eliminar esta opción' : 'Cada pregunta requiere mínimo 2 opciones';
      btnQuitar.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="3 6 5 6 21 6"></polyline>' +
          '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
        '</svg>';

      btnQuitar.addEventListener('click', function () {
        if (editorPregunta.opciones.length <= MIN_OPCIONES) return;
        editorPregunta.opciones.splice(idx, 1);
        renderizarOpcionesEditor();
      });

      fila.appendChild(inputTexto);
      fila.appendChild(btnQuitar);
      contenedor.appendChild(fila);
    });
  }

  function actualizarRutaPreviewImagenPregunta() {
    const cfg = configActual();
    const ext = editorPregunta.extensionActual || 'png';
    const limpio = U.sanitizarNombreImagen(dom.pregNombreImagen.value);
    const archivo = limpio ? (limpio + '.' + ext) : '<escribe_el_nombre>.' + ext;
    dom.rutaStoragePreviewPregunta.textContent = 'IMG/' + cfg.carpetaStorage + '/' + archivo;
  }

  function mostrarEstadoImagenPregunta() {
    const tieneExistente = !!(
      editorPregunta.original &&
      editorPregunta.original.imagen &&
      !editorPregunta.quitarImagen
    );
    const tieneNueva = !!editorPregunta.archivoNuevo;
    const activa = tieneNueva || tieneExistente;

    dom.dropzoneImagenPregunta.classList.toggle('hidden', activa);
    dom.panelImagenPreguntaActiva.classList.toggle('hidden', !activa);
    dom.errorPreviewPregunta.classList.add('hidden');
    dom.imgPreviewPregunta.classList.remove('hidden');

    if (!activa) {
      dom.imgPreviewPregunta.src = '';
      return;
    }

    if (tieneNueva) {
      dom.imgPreviewPregunta.src = editorPregunta.previewBlobUrl || '';
    } else if (tieneExistente) {
      dom.imgPreviewPregunta.src = U.obtenerUrlPublicaImagen(
        estado.pruebaActual,
        editorPregunta.original.imagen,
        estado.bustCacheImagen
      );
    }

    actualizarRutaPreviewImagenPregunta();
  }

  function seleccionarArchivoImagenPregunta(archivo) {
    if (!archivo) return;
    const validacion = U.validarArchivoImagen(archivo);
    if (!validacion.valido) {
      mostrarMensaje('mensajeModalPregunta', validacion.mensaje, 'error');
      dom.inputArchivoImagenPregunta.value = '';
      return;
    }

    liberarBlobUrl(editorPregunta);
    editorPregunta.archivoNuevo = archivo;
    editorPregunta.previewBlobUrl = URL.createObjectURL(archivo);
    editorPregunta.quitarImagen = false;
    editorPregunta.extensionActual = validacion.extension;
    dom.mensajeModalPregunta.textContent = '';

    mostrarEstadoImagenPregunta();
    if (!dom.pregNombreImagen.value.trim()) {
      dom.pregNombreImagen.focus();
    }
  }

  function snapshotFormularioPregunta() {
    return JSON.stringify({
      numero: dom.pregNumero.value.trim(),
      activa: dom.pregEstado.value,
      textoId: dom.pregTextoCompartido.value,
      enunciado: dom.pregEnunciado.value.trim(),
      opciones: editorPregunta.opciones.map(function (o) {
        return { clave: o.clave, texto: o.texto.trim() };
      }),
      nombreImg: dom.pregNombreImagen.value.trim(),
      tieneNuevoArchivo: !!editorPregunta.archivoNuevo,
      quitarImg: editorPregunta.quitarImagen
    });
  }

  function abrirModalPregunta(preguntaEditar) {
    const cfg = configActual();
    liberarBlobUrl(editorPregunta);

    editorPregunta.abierto = true;
    editorPregunta.guardando = false;
    editorPregunta.original = preguntaEditar || null;
    editorPregunta.archivoNuevo = null;
    editorPregunta.quitarImagen = false;
    dom.inputArchivoImagenPregunta.value = '';
    dom.mensajeModalPregunta.textContent = '';

    dom.subtituloModalPregunta.textContent = 'Diagnóstico: ' + cfg.titulo;

    if (preguntaEditar) {
      dom.tituloModalPregunta.textContent = 'Editar Pregunta #' + preguntaEditar.numero;
      dom.pregNumero.value = String(preguntaEditar.numero);
      dom.pregEstado.value = preguntaEditar.activa ? 'true' : 'false';
      dom.pregEnunciado.value = preguntaEditar.enunciado || '';
      poblarSelectTextosModal(preguntaEditar.texto_id);

      const entradas = extraerEntradasOpciones(preguntaEditar.opciones, preguntaEditar.respuesta_correcta);
      editorPregunta.opciones = entradas.length >= MIN_OPCIONES
        ? entradas.map(function (o) { return { clave: o.clave, texto: o.texto }; })
        : [
            { clave: 'opcion_1', texto: '' },
            { clave: 'opcion_2', texto: '' }
          ];

      if (preguntaEditar.imagen) {
        editorPregunta.extensionActual = U.extraerExtensionImagen(preguntaEditar.imagen, '') || 'png';
        dom.pregNombreImagen.value = U.extraerBaseNombreImagen(preguntaEditar.imagen);
      } else {
        editorPregunta.extensionActual = '';
        dom.pregNombreImagen.value = '';
      }

      const respCount = Number(preguntaEditar.total_respuestas) || 0;
      if (respCount > 0) {
        dom.textoAvisoRespuestasEdicion.textContent =
          'Esta pregunta ya cuenta con ' + respCount + (respCount === 1 ? ' respuesta registrada' : ' respuestas registradas') +
          ' por estudiantes. Los cambios aplicarán únicamente para este registro sin alterar los demás diagnósticos.';
        dom.avisoRespuestasEdicion.classList.remove('hidden');
      } else {
        dom.avisoRespuestasEdicion.classList.add('hidden');
      }
    } else {
      dom.tituloModalPregunta.textContent = 'Nueva Pregunta';
      dom.pregNumero.value = String(siguienteNumeroPregunta());
      dom.pregEstado.value = 'true';
      dom.pregEnunciado.value = '';
      poblarSelectTextosModal(null);

      editorPregunta.opciones = [
        { clave: 'opcion_1', texto: '' },
        { clave: 'opcion_2', texto: '' },
        { clave: 'opcion_3', texto: '' },
        { clave: 'opcion_4', texto: '' }
      ];
      editorPregunta.extensionActual = '';
      dom.pregNombreImagen.value = '';
      dom.avisoRespuestasEdicion.classList.add('hidden');
    }

    renderizarOpcionesEditor();
    mostrarEstadoImagenPregunta();
    manejarEstadoBoton(dom.btnGuardarPregunta, false, '', 'Guardar Pregunta');
    formatearAsteriscosLabels();

    dom.modalPregunta.classList.remove('hidden');
    editorPregunta.snapshotInicial = snapshotFormularioPregunta();
    dom.pregEnunciado.focus();
  }

  function solicitarCerrarModalPregunta() {
    if (editorPregunta.guardando) return;
    if (snapshotFormularioPregunta() !== editorPregunta.snapshotInicial) {
      confirmarAccion({
        titulo: '¿Descartar cambios?',
        mensaje: 'Tienes cambios sin guardar en esta pregunta. Si sales ahora, se perderán.',
        textoConfirmar: 'Descartar cambios',
        textoCancelar: 'Seguir editando',
        peligro: true,
        alConfirmar: cerrarModalPreguntaInmediato
      });
      return;
    }
    cerrarModalPreguntaInmediato();
  }

  function cerrarModalPreguntaInmediato() {
    liberarBlobUrl(editorPregunta);
    editorPregunta.abierto = false;
    editorPregunta.original = null;
    editorPregunta.archivoNuevo = null;
    dom.modalPregunta.classList.add('hidden');
  }

  async function guardarPreguntaSubmit(evento) {
    evento.preventDefault();
    if (editorPregunta.guardando) return;

    const numeroVal = parseInt(dom.pregNumero.value, 10);
    const enunciadoVal = dom.pregEnunciado.value.trim();
    const activaVal = dom.pregEstado.value === 'true';
    const textoIdVal = dom.pregTextoCompartido.value ? Number(dom.pregTextoCompartido.value) : null;
    const idEditando = editorPregunta.original ? Number(editorPregunta.original.id) : null;

    // 1. Validar número y enunciado
    const numeroDuplicado = estado.preguntas.some(function (p) {
      return Number(p.numero) === numeroVal && (idEditando == null || Number(p.id) !== idEditando);
    });

    const validacionBasica = validarCamposRequeridos([
      {
        valido: function () { return Number.isInteger(numeroVal) && numeroVal >= 1; },
        mensaje: 'Ingresa un número de pregunta válido (entero mayor o igual a 1).',
        elemento: function () { return dom.pregNumero; }
      },
      {
        valido: function () { return !numeroDuplicado; },
        mensaje: 'Ya existe otra pregunta con el número ' + numeroVal + ' en ' + configActual().titulo + '.',
        elemento: function () { return dom.pregNumero; }
      },
      {
        valido: function () { return enunciadoVal.length > 0; },
        mensaje: 'El enunciado de la pregunta es obligatorio.',
        elemento: function () { return dom.pregEnunciado; }
      }
    ]);

    if (!validacionBasica.valido) {
      mostrarMensaje('mensajeModalPregunta', validacionBasica.mensaje, 'error');
      if (validacionBasica.elemento) scrollToError(validacionBasica.elemento);
      return;
    }

    // 2. Validar opciones (mínimo 2, máximo 4, ninguna vacía y sin duplicados exactos)
    if (editorPregunta.opciones.length < MIN_OPCIONES || editorPregunta.opciones.length > MAX_OPCIONES) {
      mostrarMensaje('mensajeModalPregunta', 'La pregunta debe tener entre 2 y 4 opciones de respuesta.', 'error');
      return;
    }

    const inputsOpcion = dom.listaOpcionesEditor.querySelectorAll('.diag-opcion-input');
    const textosVistos = new Set();
    const opcionesPayload = {};

    for (let i = 0; i < editorPregunta.opciones.length; i++) {
      const op = editorPregunta.opciones[i];
      const limpio = String(op.texto || '').trim();

      if (!limpio) {
        mostrarMensaje('mensajeModalPregunta', 'Hay una opción de respuesta vacía. Completa todas las opciones o elimina las que no necesites.', 'error');
        if (inputsOpcion[i]) scrollToError(inputsOpcion[i]);
        return;
      }

      const norm = limpio.toLowerCase();
      if (textosVistos.has(norm)) {
        mostrarMensaje('mensajeModalPregunta', 'No puede haber dos opciones de respuesta con el mismo texto en una misma pregunta.', 'error');
        if (inputsOpcion[i]) scrollToError(inputsOpcion[i]);
        return;
      }
      textosVistos.add(norm);
      const claveFinal = idEditando == null ? ('opcion_' + (i + 1)) : op.clave;
      opcionesPayload[claveFinal] = limpio;
    }

    const respuestaCorrectaFinal = idEditando == null
      ? 'opcion_1'
      : editorPregunta.opciones[0].clave;

    // 3. Validar imagen y generación del nombre desde el campo "Nombre de imagen"
    const tieneExistenteActiva = !!(
      editorPregunta.original &&
      editorPregunta.original.imagen &&
      !editorPregunta.quitarImagen
    );
    const tieneImagenFinal = !!editorPregunta.archivoNuevo || tieneExistenteActiva;
    let nombreArchivoFinal = null;

    if (tieneImagenFinal) {
      const imagenOriginalLimpia = tieneExistenteActiva ? String(editorPregunta.original.imagen).trim() : '';
      const sinCambioDeImagen =
        tieneExistenteActiva &&
        !editorPregunta.archivoNuevo &&
        dom.pregNombreImagen.value.trim() === U.extraerBaseNombreImagen(imagenOriginalLimpia) &&
        !/[/\\]|\.\./.test(imagenOriginalLimpia);

      if (sinCambioDeImagen) {
        nombreArchivoFinal = imagenOriginalLimpia;
      } else {
        const nombreLimpiado = U.sanitizarNombreImagen(dom.pregNombreImagen.value);
        if (!nombreLimpiado) {
          mostrarMensaje(
            'mensajeModalPregunta',
            'Ingresa un "Nombre de imagen" válido (con letras o números) para generar el nombre del archivo en Storage.',
            'error'
          );
          scrollToError(dom.pregNombreImagen);
          return;
        }

        nombreArchivoFinal = U.construirNombreArchivoImagen(nombreLimpiado, editorPregunta.extensionActual);
        if (!nombreArchivoFinal) {
          mostrarMensaje('mensajeModalPregunta', 'No se pudo generar un nombre de archivo válido para la imagen.', 'error');
          scrollToError(dom.pregNombreImagen);
          return;
        }
      }

      if (imagenUsadaPorOtroRegistro(nombreArchivoFinal, 'pregunta', idEditando)) {
        mostrarMensaje(
          'mensajeModalPregunta',
          'El archivo "' + nombreArchivoFinal + '" ya está asociado a otra pregunta o texto de este diagnóstico. Usa otro "Nombre de imagen" para no sobrescribirla.',
          'error'
        );
        scrollToError(dom.pregNombreImagen);
        return;
      }
    }

    // 4. Guardar de forma coordinada (Storage + BD con rollback automático ante fallos)
    editorPregunta.guardando = true;
    manejarEstadoBoton(dom.btnGuardarPregunta, true, 'Guardando...', 'Guardar Pregunta');
    mostrarCargando('mensajeModalPregunta', 'Guardando pregunta...');

    try {
      const respuesta = await API.guardarPregunta({
        prueba: estado.pruebaActual,
        imagenOriginal: editorPregunta.original ? editorPregunta.original.imagen : null,
        datos: {
          id: idEditando,
          numero: numeroVal,
          enunciado: enunciadoVal,
          opciones: opcionesPayload,
          respuesta_correcta: respuestaCorrectaFinal,
          activa: activaVal,
          texto_id: textoIdVal
        },
        estadoImagen: {
          archivoNuevo: editorPregunta.archivoNuevo,
          quitarImagen: editorPregunta.quitarImagen,
          nombreFinal: nombreArchivoFinal
        }
      });

      cerrarModalPreguntaInmediato();
      await cargarDiagnosticoActual(true);

      if (respuesta.advertenciaStorage) {
        mostrarMensaje('mensajePrincipal', respuesta.advertenciaStorage, 'warning');
      } else {
        mostrarMensaje(
          'mensajePrincipal',
          idEditando ? 'Pregunta actualizada correctamente.' : 'Pregunta creada correctamente.',
          'success'
        );
      }
    } catch (error) {
      console.error('[Admin Diagnósticos] Error guardando pregunta:', error);
      ocultarCargando('mensajeModalPregunta');
      mostrarMensaje(
        'mensajeModalPregunta',
        U.interpretarErrorDiagnostico(error, 'No se pudo guardar la pregunta'),
        'error'
      );
    } finally {
      editorPregunta.guardando = false;
      manejarEstadoBoton(dom.btnGuardarPregunta, false, '', 'Guardar Pregunta');
    }
  }

  // =========================================================
  // 7. ACTIVAR / DESACTIVAR Y ELIMINAR PREGUNTA
  // =========================================================

  function solicitarToggleEstadoPregunta(idPregunta) {
    if (estado.procesandoAccion) return;
    const pregunta = estado.preguntas.find(function (p) { return Number(p.id) === Number(idPregunta); });
    if (!pregunta) return;

    const nuevoEstado = !pregunta.activa;
    const totalActivas = estado.preguntas.filter(function (p) { return !!p.activa; }).length;

    const ejecutar = async function () {
      estado.procesandoAccion = true;
      controlarLoader('loaderDiagnosticos', true, 'Actualizando estado...');
      try {
        await API.cambiarEstadoPregunta(estado.pruebaActual, pregunta.id, nuevoEstado);
        await cargarDiagnosticoActual(true);
        mostrarMensaje(
          'mensajePrincipal',
          'La pregunta #' + pregunta.numero + ' ahora está ' + (nuevoEstado ? 'activa.' : 'inactiva.'),
          'success'
        );
      } catch (error) {
        mostrarMensaje(
          'mensajePrincipal',
          U.interpretarErrorDiagnostico(error, 'No se pudo cambiar el estado'),
          'error'
        );
      } finally {
        estado.procesandoAccion = false;
        controlarLoader('loaderDiagnosticos', false);
      }
    };

    if (!nuevoEstado && totalActivas <= 1) {
      confirmarAccion({
        titulo: '¿Desactivar la única pregunta activa?',
        mensaje:
          'Si desactivas la pregunta #' + pregunta.numero + ', el diagnóstico de ' +
          configActual().titulo + ' quedará sin preguntas activas y los estudiantes no podrán iniciar el examen.',
        textoConfirmar: 'Sí, desactivar',
        peligro: false,
        alConfirmar: ejecutar
      });
      return;
    }

    ejecutar();
  }

  function solicitarEliminarPregunta(idPregunta) {
    if (estado.procesandoAccion) return;
    const pregunta = estado.preguntas.find(function (p) { return Number(p.id) === Number(idPregunta); });
    if (!pregunta) return;

    const cfg = configActual();
    const respCount = Number(pregunta.total_respuestas) || 0;
    let detalle =
      'Se eliminará de forma permanente la Pregunta #' + pregunta.numero +
      ' del diagnóstico de ' + cfg.titulo + ', junto con sus opciones.';

    if (pregunta.imagen) {
      detalle += ' También se gestionará la eliminación de su imagen ("' + pregunta.imagen + '") en el Storage.';
    }
    if (respCount > 0) {
      detalle +=
        ' ATENCIÓN: Esta pregunta tiene ' + respCount +
        (respCount === 1 ? ' respuesta registrada' : ' respuestas registradas') +
        ' de estudiantes que ya presentaron este diagnóstico; dichas respuestas asociadas también se eliminarán (si prefieres conservar el historial, puedes marcarla como Inactiva).';
    }

    confirmarAccion({
      titulo: '¿Eliminar Pregunta #' + pregunta.numero + '?',
      mensaje: detalle,
      textoConfirmar: 'Sí, eliminar definitivamente',
      peligro: true,
      alConfirmar: async function () {
        estado.procesandoAccion = true;
        controlarLoader('loaderDiagnosticos', true, 'Eliminando pregunta...');
        try {
          const res = await API.eliminarPregunta(estado.pruebaActual, pregunta.id);
          await cargarDiagnosticoActual(true);
          if (res.advertenciaStorage) {
            mostrarMensaje('mensajePrincipal', res.advertenciaStorage, 'warning');
          } else {
            mostrarMensaje('mensajePrincipal', 'Pregunta #' + pregunta.numero + ' eliminada correctamente.', 'success');
          }
        } catch (error) {
          console.error('[Admin Diagnósticos] Error eliminando pregunta:', error);
          mostrarMensaje(
            'mensajePrincipal',
            U.interpretarErrorDiagnostico(error, 'No se pudo eliminar la pregunta'),
            'error'
          );
        } finally {
          estado.procesandoAccion = false;
          controlarLoader('loaderDiagnosticos', false);
        }
      }
    });
  }

  // =========================================================
  // 8. LISTADO Y EDITOR DE TEXTOS COMPARTIDOS
  // =========================================================

  function obtenerTextosFiltrados() {
    const termino = normalizarBusqueda(dom.inputBuscarTexto.value);
    const estadoFiltro = dom.filtroEstadoTexto.value;

    return estado.textos.filter(function (t) {
      if (estadoFiltro === 'activos' && !t.activo) return false;
      if (estadoFiltro === 'inactivos' && t.activo) return false;
      if (!termino) return true;

      const bolsa = normalizarBusqueda((t.titulo || '') + ' ' + (t.contenido || '') + ' ' + (t.imagen || ''));
      return bolsa.indexOf(termino) !== -1;
    });
  }

  function hayFiltrosTextosActivos() {
    return dom.inputBuscarTexto.value.trim() !== '' || dom.filtroEstadoTexto.value !== 'todos';
  }

  function renderizarListaTextos() {
    const total = estado.textos.length;
    const filtrados = obtenerTextosFiltrados();
    const conFiltros = hayFiltrosTextosActivos();

    dom.btnLimpiarFiltrosTextos.classList.toggle('hidden', !conFiltros);

    if (total === 0) {
      dom.contadorTextosFiltrados.textContent = '0 textos compartidos en ' + configActual().titulo;
      dom.contenedorListaTextos.innerHTML =
        '<div class="diag-empty-state">' +
          '<h3>No hay textos compartidos en este diagnóstico</h3>' +
          '<p>Crea un texto compartido si varias preguntas de ' + escaparHTML(configActual().titulo) + ' deben responderse a partir de una misma lectura o imagen de apoyo.</p>' +
          '<button type="button" class="btn diag-btn-primario" data-accion="nuevo-texto-vacio">+ Crear texto compartido</button>' +
        '</div>';
      return;
    }

    dom.contadorTextosFiltrados.textContent = conFiltros
      ? 'Mostrando ' + filtrados.length + ' de ' + total + ' texto(s) compartido(s)'
      : 'Mostrando los ' + total + ' texto(s) compartido(s) del diagnóstico';

    if (filtrados.length === 0) {
      dom.contenedorListaTextos.innerHTML =
        '<div class="diag-empty-state">' +
          '<h3>Sin coincidencias</h3>' +
          '<p>Ningún texto compartido coincide con la búsqueda actual.</p>' +
          '<button type="button" class="btn btn-secondary diag-btn-chico" data-accion="limpiar-filtros-textos">Mostrar todos los textos</button>' +
        '</div>';
      return;
    }

    const cfg = configActual();
    const fragmento = document.createDocumentFragment();

    filtrados.forEach(function (texto) {
      const card = document.createElement('article');
      card.className = 'diag-card' + (texto.activo ? '' : ' diag-card-inactiva');

      const tieneImagen = !!(texto.imagen && String(texto.imagen).trim());
      const usadas = Number(texto.total_preguntas) || 0;

      const header = document.createElement('div');
      header.className = 'diag-card-header';

      const badges = document.createElement('div');
      badges.className = 'diag-badges';

      const tituloBadge = document.createElement('span');
      tituloBadge.className = 'diag-numero-badge';
      tituloBadge.textContent = texto.titulo ? texto.titulo : ('Texto #' + texto.id);
      badges.appendChild(tituloBadge);

      const estadoPill = document.createElement('span');
      estadoPill.className = 'diag-pill ' + (texto.activo ? 'diag-pill-activa' : 'diag-pill-inactiva');
      estadoPill.textContent = texto.activo ? 'Activo' : 'Inactivo';
      badges.appendChild(estadoPill);

      const usoPill = document.createElement('span');
      usoPill.className = 'diag-pill diag-pill-info';
      usoPill.textContent = usadas + (usadas === 1 ? ' pregunta asociada' : ' preguntas asociadas');
      badges.appendChild(usoPill);

      const acciones = document.createElement('div');
      acciones.className = 'diag-card-acciones';

      const btnEditar = document.createElement('button');
      btnEditar.type = 'button';
      btnEditar.className = 'diag-btn-accion diag-btn-accion-editar';
      btnEditar.dataset.accion = 'editar-texto';
      btnEditar.dataset.id = String(texto.id);
      btnEditar.textContent = 'Editar';

      const btnEliminar = document.createElement('button');
      btnEliminar.type = 'button';
      btnEliminar.className = 'diag-btn-accion diag-btn-accion-eliminar';
      btnEliminar.dataset.accion = 'eliminar-texto';
      btnEliminar.dataset.id = String(texto.id);
      btnEliminar.textContent = 'Eliminar';

      acciones.appendChild(btnEditar);
      acciones.appendChild(btnEliminar);
      header.appendChild(badges);
      header.appendChild(acciones);
      card.appendChild(header);

      const cuerpo = document.createElement('div');
      cuerpo.className = 'diag-card-cuerpo' + (tieneImagen ? ' con-imagen' : '');

      const contenidoP = document.createElement('p');
      contenidoP.className = 'diag-enunciado-texto';
      contenidoP.style.marginBottom = '0';
      contenidoP.textContent = texto.contenido || '';
      cuerpo.appendChild(contenidoP);

      if (tieneImagen) {
        const nombreImg = String(texto.imagen).trim();
        const urlImg = U.obtenerUrlPublicaImagen(estado.pruebaActual, nombreImg, estado.bustCacheImagen);
        const rutaRel = 'IMG/' + cfg.carpetaStorage + '/' + nombreImg;
        cuerpo.appendChild(
          construirMiniaturaImagen(urlImg, nombreImg, texto.titulo || ('Texto #' + texto.id), rutaRel)
        );
      }

      card.appendChild(cuerpo);
      fragmento.appendChild(card);
    });

    dom.contenedorListaTextos.textContent = '';
    dom.contenedorListaTextos.appendChild(fragmento);
  }

  function actualizarRutaPreviewImagenTexto() {
    const cfg = configActual();
    const ext = editorTexto.extensionActual || 'png';
    const limpio = U.sanitizarNombreImagen(dom.txtNombreImagen.value);
    const archivo = limpio ? (limpio + '.' + ext) : '<escribe_el_nombre>.' + ext;
    dom.rutaStoragePreviewTexto.textContent = 'IMG/' + cfg.carpetaStorage + '/' + archivo;
  }

  function mostrarEstadoImagenTexto() {
    const tieneExistente = !!(
      editorTexto.original &&
      editorTexto.original.imagen &&
      !editorTexto.quitarImagen
    );
    const tieneNueva = !!editorTexto.archivoNuevo;
    const activa = tieneNueva || tieneExistente;

    dom.dropzoneImagenTexto.classList.toggle('hidden', activa);
    dom.panelImagenTextoActiva.classList.toggle('hidden', !activa);
    dom.errorPreviewTexto.classList.add('hidden');
    dom.imgPreviewTexto.classList.remove('hidden');

    if (!activa) {
      dom.imgPreviewTexto.src = '';
      return;
    }

    if (tieneNueva) {
      dom.imgPreviewTexto.src = editorTexto.previewBlobUrl || '';
    } else if (tieneExistente) {
      dom.imgPreviewTexto.src = U.obtenerUrlPublicaImagen(
        estado.pruebaActual,
        editorTexto.original.imagen,
        estado.bustCacheImagen
      );
    }

    actualizarRutaPreviewImagenTexto();
  }

  function seleccionarArchivoImagenTexto(archivo) {
    if (!archivo) return;
    const validacion = U.validarArchivoImagen(archivo);
    if (!validacion.valido) {
      mostrarMensaje('mensajeModalTexto', validacion.mensaje, 'error');
      dom.inputArchivoImagenTexto.value = '';
      return;
    }

    liberarBlobUrl(editorTexto);
    editorTexto.archivoNuevo = archivo;
    editorTexto.previewBlobUrl = URL.createObjectURL(archivo);
    editorTexto.quitarImagen = false;
    editorTexto.extensionActual = validacion.extension;
    dom.mensajeModalTexto.textContent = '';

    mostrarEstadoImagenTexto();
    if (!dom.txtNombreImagen.value.trim()) {
      dom.txtNombreImagen.focus();
    }
  }

  function snapshotFormularioTexto() {
    return JSON.stringify({
      titulo: dom.txtTitulo.value.trim(),
      activo: dom.txtEstado.value,
      contenido: dom.txtContenido.value.trim(),
      nombreImg: dom.txtNombreImagen.value.trim(),
      tieneNuevoArchivo: !!editorTexto.archivoNuevo,
      quitarImg: editorTexto.quitarImagen
    });
  }

  function abrirModalTexto(textoEditar) {
    const cfg = configActual();
    liberarBlobUrl(editorTexto);

    editorTexto.abierto = true;
    editorTexto.guardando = false;
    editorTexto.original = textoEditar || null;
    editorTexto.archivoNuevo = null;
    editorTexto.quitarImagen = false;
    dom.inputArchivoImagenTexto.value = '';
    dom.mensajeModalTexto.textContent = '';
    dom.subtituloModalTexto.textContent = 'Diagnóstico: ' + cfg.titulo;

    if (textoEditar) {
      dom.tituloModalTexto.textContent = 'Editar Texto Compartido';
      dom.txtTitulo.value = textoEditar.titulo || '';
      dom.txtEstado.value = textoEditar.activo ? 'true' : 'false';
      dom.txtContenido.value = textoEditar.contenido || '';
      if (textoEditar.imagen) {
        editorTexto.extensionActual = U.extraerExtensionImagen(textoEditar.imagen, '') || 'png';
        dom.txtNombreImagen.value = U.extraerBaseNombreImagen(textoEditar.imagen);
      } else {
        editorTexto.extensionActual = '';
        dom.txtNombreImagen.value = '';
      }
    } else {
      dom.tituloModalTexto.textContent = 'Nuevo Texto Compartido';
      dom.txtTitulo.value = '';
      dom.txtEstado.value = 'true';
      dom.txtContenido.value = '';
      editorTexto.extensionActual = '';
      dom.txtNombreImagen.value = '';
    }

    mostrarEstadoImagenTexto();
    manejarEstadoBoton(dom.btnGuardarTexto, false, '', 'Guardar Texto Compartido');
    formatearAsteriscosLabels();

    dom.modalTexto.classList.remove('hidden');
    editorTexto.snapshotInicial = snapshotFormularioTexto();
    dom.txtTitulo.focus();
  }

  function solicitarCerrarModalTexto() {
    if (editorTexto.guardando) return;
    if (snapshotFormularioTexto() !== editorTexto.snapshotInicial) {
      confirmarAccion({
        titulo: '¿Descartar cambios?',
        mensaje: 'Tienes cambios sin guardar en este texto compartido. Si sales ahora, se perderán.',
        textoConfirmar: 'Descartar cambios',
        textoCancelar: 'Seguir editando',
        peligro: true,
        alConfirmar: cerrarModalTextoInmediato
      });
      return;
    }
    cerrarModalTextoInmediato();
  }

  function cerrarModalTextoInmediato() {
    liberarBlobUrl(editorTexto);
    editorTexto.abierto = false;
    editorTexto.original = null;
    editorTexto.archivoNuevo = null;
    dom.modalTexto.classList.add('hidden');
  }

  async function guardarTextoSubmit(evento) {
    evento.preventDefault();
    if (editorTexto.guardando) return;

    const tituloVal = dom.txtTitulo.value.trim();
    const contenidoVal = dom.txtContenido.value.trim();
    const activoVal = dom.txtEstado.value === 'true';
    const idEditando = editorTexto.original ? Number(editorTexto.original.id) : null;

    if (!contenidoVal) {
      mostrarMensaje('mensajeModalTexto', 'El contenido del texto compartido es obligatorio.', 'error');
      scrollToError(dom.txtContenido);
      return;
    }

    const tieneExistenteActiva = !!(
      editorTexto.original &&
      editorTexto.original.imagen &&
      !editorTexto.quitarImagen
    );
    const tieneImagenFinal = !!editorTexto.archivoNuevo || tieneExistenteActiva;
    let nombreArchivoFinal = null;

    if (tieneImagenFinal) {
      const imagenOriginalLimpia = tieneExistenteActiva ? String(editorTexto.original.imagen).trim() : '';
      const sinCambioDeImagen =
        tieneExistenteActiva &&
        !editorTexto.archivoNuevo &&
        dom.txtNombreImagen.value.trim() === U.extraerBaseNombreImagen(imagenOriginalLimpia) &&
        !/[/\\]|\.\./.test(imagenOriginalLimpia);

      if (sinCambioDeImagen) {
        nombreArchivoFinal = imagenOriginalLimpia;
      } else {
        const nombreLimpiado = U.sanitizarNombreImagen(dom.txtNombreImagen.value);
        if (!nombreLimpiado) {
          mostrarMensaje(
            'mensajeModalTexto',
            'Ingresa un "Nombre de imagen" válido para generar el nombre del archivo en Storage.',
            'error'
          );
          scrollToError(dom.txtNombreImagen);
          return;
        }

        nombreArchivoFinal = U.construirNombreArchivoImagen(nombreLimpiado, editorTexto.extensionActual);
        if (!nombreArchivoFinal) {
          mostrarMensaje('mensajeModalTexto', 'No se pudo generar un nombre de archivo válido para la imagen.', 'error');
          scrollToError(dom.txtNombreImagen);
          return;
        }
      }

      if (imagenUsadaPorOtroRegistro(nombreArchivoFinal, 'texto', idEditando)) {
        mostrarMensaje(
          'mensajeModalTexto',
          'El archivo "' + nombreArchivoFinal + '" ya está asociado a otra pregunta o texto de este diagnóstico. Usa otro "Nombre de imagen".',
          'error'
        );
        scrollToError(dom.txtNombreImagen);
        return;
      }
    }

    editorTexto.guardando = true;
    manejarEstadoBoton(dom.btnGuardarTexto, true, 'Guardando...', 'Guardar Texto Compartido');
    mostrarCargando('mensajeModalTexto', 'Guardando texto compartido...');

    try {
      const respuesta = await API.guardarTexto({
        prueba: estado.pruebaActual,
        imagenOriginal: editorTexto.original ? editorTexto.original.imagen : null,
        datos: {
          id: idEditando,
          titulo: tituloVal,
          contenido: contenidoVal,
          activo: activoVal
        },
        estadoImagen: {
          archivoNuevo: editorTexto.archivoNuevo,
          quitarImagen: editorTexto.quitarImagen,
          nombreFinal: nombreArchivoFinal
        }
      });

      cerrarModalTextoInmediato();
      await cargarDiagnosticoActual(true);

      if (respuesta.advertenciaStorage) {
        mostrarMensaje('mensajePrincipal', respuesta.advertenciaStorage, 'warning');
      } else {
        mostrarMensaje(
          'mensajePrincipal',
          idEditando ? 'Texto compartido actualizado correctamente.' : 'Texto compartido creado correctamente.',
          'success'
        );
      }
    } catch (error) {
      console.error('[Admin Diagnósticos] Error guardando texto:', error);
      ocultarCargando('mensajeModalTexto');
      mostrarMensaje(
        'mensajeModalTexto',
        U.interpretarErrorDiagnostico(error, 'No se pudo guardar el texto compartido'),
        'error'
      );
    } finally {
      editorTexto.guardando = false;
      manejarEstadoBoton(dom.btnGuardarTexto, false, '', 'Guardar Texto Compartido');
    }
  }

  function solicitarEliminarTexto(idTexto) {
    if (estado.procesandoAccion) return;
    const texto = estado.textosPorId.get(Number(idTexto));
    if (!texto) return;

    const cfg = configActual();
    const usadas = Number(texto.total_preguntas) || 0;
    const nombreMostrar = texto.titulo ? '"' + texto.titulo + '"' : ('Texto #' + texto.id);

    let detalle = 'Se eliminará permanentemente el texto compartido ' + nombreMostrar + ' del diagnóstico de ' + cfg.titulo + '.';
    if (texto.imagen) {
      detalle += ' También se eliminará su imagen ("' + texto.imagen + '") del Storage.';
    }
    if (usadas > 0) {
      detalle += ' Las ' + usadas + (usadas === 1 ? ' pregunta asociada NO será eliminada' : ' preguntas asociadas NO serán eliminadas') +
        ', pero quedarán sin texto compartido vinculado.';
    }

    confirmarAccion({
      titulo: '¿Eliminar texto compartido?',
      mensaje: detalle,
      textoConfirmar: 'Sí, eliminar texto',
      peligro: true,
      alConfirmar: async function () {
        estado.procesandoAccion = true;
        controlarLoader('loaderDiagnosticos', true, 'Eliminando texto compartido...');
        try {
          const res = await API.eliminarTexto(estado.pruebaActual, texto.id);
          await cargarDiagnosticoActual(true);
          if (res.advertenciaStorage) {
            mostrarMensaje('mensajePrincipal', res.advertenciaStorage, 'warning');
          } else {
            mostrarMensaje('mensajePrincipal', 'Texto compartido eliminado correctamente.', 'success');
          }
        } catch (error) {
          mostrarMensaje(
            'mensajePrincipal',
            U.interpretarErrorDiagnostico(error, 'No se pudo eliminar el texto compartido'),
            'error'
          );
        } finally {
          estado.procesandoAccion = false;
          controlarLoader('loaderDiagnosticos', false);
        }
      }
    });
  }

  // =========================================================
  // 9. VINCULACIÓN DE EVENTOS E INICIALIZACIÓN
  // =========================================================

  function configurarDropzone(dropzoneEl, inputEl, alSeleccionarArchivo) {
    dropzoneEl.addEventListener('click', function () { inputEl.click(); });
    dropzoneEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputEl.click();
      }
    });
    dropzoneEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzoneEl.classList.add('dragover');
    });
    dropzoneEl.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dropzoneEl.classList.remove('dragover');
    });
    dropzoneEl.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzoneEl.classList.remove('dragover');
      const archivo = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (archivo) alSeleccionarArchivo(archivo);
    });
    inputEl.addEventListener('change', function (e) {
      const archivo = e.target && e.target.files && e.target.files[0];
      if (archivo) alSeleccionarArchivo(archivo);
    });
  }

  function registrarEventos() {
    // Selector superior de diagnóstico
    [dom.btnPruebaMatematicas, dom.btnPruebaComunicacion, dom.btnPruebaLectura].forEach(function (btn) {
      btn.addEventListener('click', function () {
        seleccionarDiagnostico(btn.dataset.prueba);
      });
    });

    dom.btnRecargarDiagnostico.addEventListener('click', function () {
      if (typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.invalidar === 'function') {
        ConsultasAdmin.invalidar(['admin:diagnosticos']);
      }
      cargarDiagnosticoActual(false, true);
    });

    // Pestañas Preguntas / Textos Compartidos
    dom.tabVistaPreguntas.addEventListener('click', function () { cambiarVistaInterna('preguntas'); });
    dom.tabVistaTextos.addEventListener('click', function () { cambiarVistaInterna('textos'); });

    // Filtros de preguntas
    dom.inputBuscarPregunta.addEventListener('input', renderizarListaPreguntas);
    dom.filtroEstadoPregunta.addEventListener('change', renderizarListaPreguntas);
    dom.filtroRecursoPregunta.addEventListener('change', renderizarListaPreguntas);
    dom.btnLimpiarFiltrosPreguntas.addEventListener('click', function () {
      dom.inputBuscarPregunta.value = '';
      dom.filtroEstadoPregunta.value = 'todas';
      dom.filtroRecursoPregunta.value = 'todos';
      renderizarListaPreguntas();
    });

    // Filtros de textos compartidos
    dom.inputBuscarTexto.addEventListener('input', renderizarListaTextos);
    dom.filtroEstadoTexto.addEventListener('change', renderizarListaTextos);
    dom.btnLimpiarFiltrosTextos.addEventListener('click', function () {
      dom.inputBuscarTexto.value = '';
      dom.filtroEstadoTexto.value = 'todos';
      renderizarListaTextos();
    });

    // Botones principales de creación
    dom.btnNuevaPregunta.addEventListener('click', function () { abrirModalPregunta(null); });
    dom.btnNuevoTexto.addEventListener('click', function () { abrirModalTexto(null); });

    // Delegación de eventos en lista de preguntas
    dom.contenedorListaPreguntas.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-accion]');
      if (!btn) return;
      const accion = btn.dataset.accion;
      const id = Number(btn.dataset.id);

      if (accion === 'nueva-pregunta-vacio') {
        abrirModalPregunta(null);
      } else if (accion === 'limpiar-filtros-preguntas') {
        dom.btnLimpiarFiltrosPreguntas.click();
      } else if (accion === 'editar-pregunta') {
        const pregunta = estado.preguntas.find(function (p) { return Number(p.id) === id; });
        if (pregunta) abrirModalPregunta(pregunta);
      } else if (accion === 'toggle-pregunta') {
        solicitarToggleEstadoPregunta(id);
      } else if (accion === 'eliminar-pregunta') {
        solicitarEliminarPregunta(id);
      }
    });

    // Delegación de eventos en lista de textos compartidos
    dom.contenedorListaTextos.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-accion]');
      if (!btn) return;
      const accion = btn.dataset.accion;
      const id = Number(btn.dataset.id);

      if (accion === 'nuevo-texto-vacio') {
        abrirModalTexto(null);
      } else if (accion === 'limpiar-filtros-textos') {
        dom.btnLimpiarFiltrosTextos.click();
      } else if (accion === 'editar-texto') {
        const texto = estado.textosPorId.get(id);
        if (texto) abrirModalTexto(texto);
      } else if (accion === 'eliminar-texto') {
        solicitarEliminarTexto(id);
      }
    });

    // Eventos del Modal de Pregunta
    dom.btnCerrarModalPregunta.addEventListener('click', solicitarCerrarModalPregunta);
    dom.btnCancelarModalPregunta.addEventListener('click', solicitarCerrarModalPregunta);
    dom.pregTextoCompartido.addEventListener('change', actualizarPreviewTextoSeleccionado);
    dom.btnIrATextosDesdeModal.addEventListener('click', function () {
      const ir = function () {
        cerrarModalPreguntaInmediato();
        cambiarVistaInterna('textos');
      };
      if (snapshotFormularioPregunta() !== editorPregunta.snapshotInicial) {
        confirmarAccion({
          titulo: '¿Ir a Textos Compartidos?',
          mensaje: 'Se cerrará el editor actual y se descartarán los cambios no guardados de esta pregunta.',
          textoConfirmar: 'Ir a Textos Compartidos',
          peligro: false,
          alConfirmar: ir
        });
      } else {
        ir();
      }
    });

    dom.btnAgregarOpcion.addEventListener('click', function () {
      if (editorPregunta.opciones.length >= MAX_OPCIONES) return;
      editorPregunta.opciones.push({
        clave: siguienteClaveOpcion(editorPregunta.opciones),
        texto: ''
      });
      renderizarOpcionesEditor();
      const inputs = dom.listaOpcionesEditor.querySelectorAll('.diag-opcion-input');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });

    configurarDropzone(dom.dropzoneImagenPregunta, dom.inputArchivoImagenPregunta, seleccionarArchivoImagenPregunta);
    dom.pregNombreImagen.addEventListener('input', actualizarRutaPreviewImagenPregunta);
    dom.btnReemplazarImagenPregunta.addEventListener('click', function () {
      dom.inputArchivoImagenPregunta.click();
    });
    dom.btnQuitarImagenPregunta.addEventListener('click', function () {
      liberarBlobUrl(editorPregunta);
      editorPregunta.archivoNuevo = null;
      editorPregunta.quitarImagen = true;
      editorPregunta.extensionActual = '';
      dom.inputArchivoImagenPregunta.value = '';
      dom.pregNombreImagen.value = '';
      mostrarEstadoImagenPregunta();
    });
    dom.imgPreviewPregunta.addEventListener('error', function () {
      if (!dom.panelImagenPreguntaActiva.classList.contains('hidden') && dom.imgPreviewPregunta.getAttribute('src')) {
        dom.imgPreviewPregunta.classList.add('hidden');
        dom.errorPreviewPregunta.classList.remove('hidden');
      }
    });
    dom.formPregunta.addEventListener('submit', guardarPreguntaSubmit);

    // Eventos del Modal de Texto Compartido
    dom.btnCerrarModalTexto.addEventListener('click', solicitarCerrarModalTexto);
    dom.btnCancelarModalTexto.addEventListener('click', solicitarCerrarModalTexto);
    configurarDropzone(dom.dropzoneImagenTexto, dom.inputArchivoImagenTexto, seleccionarArchivoImagenTexto);
    dom.txtNombreImagen.addEventListener('input', actualizarRutaPreviewImagenTexto);
    dom.btnReemplazarImagenTexto.addEventListener('click', function () {
      dom.inputArchivoImagenTexto.click();
    });
    dom.btnQuitarImagenTexto.addEventListener('click', function () {
      liberarBlobUrl(editorTexto);
      editorTexto.archivoNuevo = null;
      editorTexto.quitarImagen = true;
      editorTexto.extensionActual = '';
      dom.inputArchivoImagenTexto.value = '';
      dom.txtNombreImagen.value = '';
      mostrarEstadoImagenTexto();
    });
    dom.imgPreviewTexto.addEventListener('error', function () {
      if (!dom.panelImagenTextoActiva.classList.contains('hidden') && dom.imgPreviewTexto.getAttribute('src')) {
        dom.imgPreviewTexto.classList.add('hidden');
        dom.errorPreviewTexto.classList.remove('hidden');
      }
    });
    dom.formTexto.addEventListener('submit', guardarTextoSubmit);

    // Lightbox y tecla Escape
    dom.btnCerrarVistaImagen.addEventListener('click', cerrarVistaImagen);
    dom.modalVistaImagen.addEventListener('click', function (e) {
      if (e.target === dom.modalVistaImagen) cerrarVistaImagen();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!dom.modalVistaImagen.classList.contains('hidden')) {
        cerrarVistaImagen();
      } else if (!dom.modalConfirmacion.classList.contains('hidden')) {
        dom.btnCancelarModal.click();
      } else if (editorPregunta.abierto) {
        solicitarCerrarModalPregunta();
      } else if (editorTexto.abierto) {
        solicitarCerrarModalTexto();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    cachearDOM();
    const autorizado = await API.verificarAccesoAdmin();
    if (!autorizado) return;
    registrarEventos();
    await cargarDiagnosticoActual(false);
  });
})(window, document);
