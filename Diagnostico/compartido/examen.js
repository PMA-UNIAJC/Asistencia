/* =========================================================
   Diagnostico/compartido/examen.js
   Motor común de las pruebas diagnósticas
   (MATEMATICAS, COMUNICACION y LECTURA).

   Cada prueba solo debe llamar a:
     iniciarExamenDiagnostico({ prueba, tablaPreguntas, titulo, ... })

   Depende de ../../Global/global.js (debe cargarse antes):
     SUPABASE_URL, SUPABASE_KEY, TIMEZONE_COLOMBIA,
     validarCamposRequeridos(), scrollToError(), compararDocumentos(),
     limpiarEspacios(), normalizarNombreSinEspacios(), normalizarGrupo(),
     censurarNombre(), cargarProgramasListaPlana()

   Base de datos (esquema "diagnosticos"):
     estudiantes, grupos, presentaciones, preguntas_<prueba>, textos_compartidos
     y la RPC enviar_prueba(p_documento, p_prueba, p_respuestas),
     que valida, califica y registra la entrega en el servidor.
   ========================================================= */

(function (window, document) {
  'use strict';

  // =========================================================
  // 1. CONSTANTES
  // =========================================================
  const ESQUEMA_DIAGNOSTICOS = 'diagnosticos';
  const PRUEBAS_VALIDAS = ['MATEMATICAS', 'COMUNICACION', 'LECTURA'];
  const LETRAS_OPCIONES = 'ABCDEFGHIJ';
  const PREGUNTAS_POR_SECCION_DEFECTO = 5;
  const DOCUMENTO_MIN = 6;
  const DOCUMENTO_MAX = 10;
  const INTENTOS_CONSULTA = 3;

  // =========================================================
  // 2. LÓGICA PURA (sin DOM ni red)
  // =========================================================

  // Entero aleatorio uniforme en [0, maximo). Usa crypto si está disponible.
  function enteroAleatorio(maximo) {
    const cripto = window.crypto;
    if (cripto && typeof cripto.getRandomValues === 'function') {
      const limite = Math.floor(0x100000000 / maximo) * maximo;
      const buffer = new Uint32Array(1);
      do {
        cripto.getRandomValues(buffer);
      } while (buffer[0] >= limite);
      return buffer[0] % maximo;
    }
    return Math.floor(Math.random() * maximo);
  }

  // Fisher–Yates sobre una copia: nunca modifica la lista original.
  function mezclar(lista) {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = enteroAleatorio(i + 1);
      const temporal = copia[i];
      copia[i] = copia[j];
      copia[j] = temporal;
    }
    return copia;
  }

  // Convención del proyecto: el documento es solo numérico.
  function normalizarDocumento(valor) {
    return String(valor == null ? '' : valor).replace(/\D/g, '');
  }

    function documentoValido(documento) {
    if (documento.length < DOCUMENTO_MIN || documento.length > DOCUMENTO_MAX) return false;
    if (/^(\d)\1+$/.test(documento)) return false; 
    return true;
  }

  function normalizarCodigoGrupo(valor) {
    return String(valor == null ? '' : valor)
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  // Convierte las filas de la base de datos en preguntas listas para mostrar:
  //  - mezcla las opciones de cada pregunta de forma independiente,
  //  - conserva la clave ORIGINAL de cada opción (opcion_1, opcion_2...),
  //  - asigna la letra visible (A, B, C, D) según el orden obtenido,
  //  - mezcla el orden de las preguntas (las que comparten texto quedan juntas).
  function prepararPreguntas(filas, textosPorId) {
    if (!Array.isArray(filas)) {
      throw new Error('El formato de las preguntas no es válido.');
    }
    const textos = textosPorId && typeof textosPorId.get === 'function' ? textosPorId : new Map();
    const idsVistos = new Set();

    const preguntas = filas.map(function (fila) {
      const id = Number(fila && fila.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error('Se recibió una pregunta sin identificador válido.');
      }
      if (idsVistos.has(id)) {
        throw new Error('Se recibió una pregunta duplicada (' + id + ').');
      }
      idsVistos.add(id);

      const enunciado = typeof fila.enunciado === 'string' ? fila.enunciado.trim() : '';
      const opciones = fila.opciones && typeof fila.opciones === 'object' && !Array.isArray(fila.opciones)
        ? fila.opciones
        : null;
      const entradas = opciones
        ? Object.keys(opciones)
            .filter(function (clave) {
              return clave && typeof opciones[clave] === 'string' && opciones[clave].trim() !== '';
            })
            .map(function (clave) {
              return { clave: clave, texto: opciones[clave].trim() };
            })
        : [];

      if (!enunciado || entradas.length < 2 || entradas.length > LETRAS_OPCIONES.length) {
        throw new Error('La pregunta ' + id + ' no tiene un enunciado u opciones válidas.');
      }

      const textoId = fila.texto_id == null ? null : Number(fila.texto_id);

      const imagen = typeof fila.imagen === 'string' && fila.imagen.trim() !== '' ? fila.imagen.trim() : null;

      return {
        id: id,
        enunciado: enunciado,
        imagen: imagen,
        textoId: textoId,
        texto: textoId != null ? (textos.get(textoId) || null) : null,
        opciones: Object.freeze(
          mezclar(entradas).map(function (opcion, indice) {
            return Object.freeze({
              clave: opcion.clave,          // identificador estable (se envía a la RPC)
              texto: opcion.texto,          // texto visible
              letra: LETRAS_OPCIONES[indice] // etiqueta visual únicamente
            });
          })
        )
      };
    });

    // Bloques: cada pregunta sola, o todas las que comparten el mismo texto.
    const bloques = [];
    const bloquePorTexto = new Map();
    preguntas.forEach(function (pregunta) {
      if (pregunta.textoId == null) {
        bloques.push([pregunta]);
        return;
      }
      if (!bloquePorTexto.has(pregunta.textoId)) {
        const bloque = [];
        bloquePorTexto.set(pregunta.textoId, bloque);
        bloques.push(bloque);
      }
      bloquePorTexto.get(pregunta.textoId).push(pregunta);
    });

    const ordenadas = [];
    mezclar(bloques).forEach(function (bloque) {
      mezclar(bloque).forEach(function (pregunta) {
        ordenadas.push(pregunta);
      });
    });

    return ordenadas.map(function (pregunta, indice) {
      pregunta.numero = indice + 1; // número visible tras la aleatorización
      return Object.freeze(pregunta);
    });
  }

  // Paginación de la interfaz: [{ inicio, fin }] con "fin" exclusivo.
  function dividirEnSecciones(totalPreguntas, tamano) {
    const secciones = [];
    for (let inicio = 0; inicio < totalPreguntas; inicio += tamano) {
      secciones.push({ inicio: inicio, fin: Math.min(inicio + tamano, totalPreguntas) });
    }
    return secciones;
  }

  // Índices (en el orden mostrado) de las preguntas sin respuesta.
  function preguntasPendientes(preguntas, respuestas) {
    const pendientes = [];
    preguntas.forEach(function (pregunta, indice) {
      if (!respuestas.has(pregunta.id)) pendientes.push(indice);
    });
    return pendientes;
  }

  // Argumentos de la RPC enviar_prueba. Usa el id real de cada pregunta
  // y la clave original de la opción elegida (nunca la letra visible).
  function construirPayload(documento, prueba, preguntas, respuestas) {
    const pRespuestas = preguntas.map(function (pregunta) {
      const clave = respuestas.get(pregunta.id);
      const valida = pregunta.opciones.some(function (opcion) { return opcion.clave === clave; });
      if (!valida) {
        throw new Error('La pregunta ' + pregunta.numero + ' no tiene una respuesta válida.');
      }
      return { pregunta_id: pregunta.id, opcion_seleccionada: clave };
    });
    return { p_documento: documento, p_prueba: prueba, p_respuestas: pRespuestas };
  }

  // Resumen a partir de la respuesta de la RPC (solo cantidades, sin detalle por pregunta).
  function calcularResultado(respuestaRpc, totalLocal) {
    const datos = respuestaRpc || {};
    const correctas = Number(datos.correctas) || 0;
    const incorrectas = Number(datos.incorrectas) || 0;
    const total = Number(datos.total_respondidas) || (correctas + incorrectas) || Number(totalLocal) || 0;
    const resultadoServidor = datos.resultado !== undefined && datos.resultado !== null
      ? Number(datos.resultado)
      : NaN;
    const porcentaje = !Number.isNaN(resultadoServidor)
      ? resultadoServidor
      : (total > 0 ? Math.round((correctas / total) * 1000) / 10 : 0);
    return { correctas: correctas, incorrectas: incorrectas, total: total, porcentaje: porcentaje };
  }

  // Clasifica un error para decidir qué hacer:
  //  YA_PRESENTADA → la combinación documento + prueba ya existe.
  //  VALIDACION    → la RPC rechazó el envío (RAISE EXCEPTION); nada se guardó.
  //  RECHAZADO     → otro error 4xx (permisos, esquema...); nada se guardó.
  //  RED / DESCONOCIDO → no se sabe si el servidor alcanzó a guardar.
  function interpretarError(error) {
    if (!error) return { tipo: 'DESCONOCIDO', mensaje: '' };
    if (error.red) return { tipo: 'RED', mensaje: 'No fue posible comunicarse con el servidor.' };

    const codigo = String(error.codigo || '');
    const texto = String(error.message || '');

    if (codigo === '23505' || /duplicate key|presentaciones_documento_prueba/i.test(texto)) {
      return { tipo: 'YA_PRESENTADA', mensaje: 'Esta prueba ya fue entregada.' };
    }
    if (codigo === 'P0001') return { tipo: 'VALIDACION', mensaje: texto };
    if (!error.status || error.status >= 500) return { tipo: 'DESCONOCIDO', mensaje: texto };
    return { tipo: 'RECHAZADO', mensaje: texto };
  }

  // censurarNombre() — función global definida en ../../Global/global.js

  function formatearPorcentaje(valor) {
    return Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' %';
  }

  function formatearFecha(fechaIso) {
    if (!fechaIso) return '';
    if (typeof formatearFechaColombia === 'function') {
      return formatearFechaColombia(fechaIso, { formato: 'largo' });
    }
    return '';
  }

  // =========================================================
  // 3. ACCESO CENTRALIZADO A SUPABASE (window.ConsultasPublicas)
  // =========================================================
  const TTL_CACHE_BANCO_PREGUNTAS_MS = 10 * 60 * 1000;
  const TTL_CACHE_GRUPOS_MS = 5 * 60 * 1000;

  const api = {
    async buscarEstudiante(documento) {
      return await ConsultasPublicas.consultarUno('estudiantes', {
        select: 'documento,nombre,programa,sede,grupo',
        eq: { field: 'documento', value: documento }
      }, ESQUEMA_DIAGNOSTICOS);
    },

    async obtenerGruposPorSede(sede, opciones) {
      const sedeNorm = String(sede || '').trim().toUpperCase();
      if (!sedeNorm) return [];
      const forzar = Boolean(opciones && opciones.forzar);
      const filas = await ConsultasPublicas.consultarTodo('grupos', {
        select: 'id,sede,grupo',
        eq: { field: 'sede', value: sedeNorm },
        order: 'grupo.asc',
        cache: {
          clave: 'pub:diag_grupos:' + sedeNorm,
          ttl: TTL_CACHE_GRUPOS_MS,
          forzar: forzar,
          etiquetas: ['esquema:diagnosticos', 'tabla:grupos', 'tabla:diagnosticos.grupos']
        }
      }, ESQUEMA_DIAGNOSTICOS);
      return Array.isArray(filas) ? filas : [];
    },

    async buscarPresentacion(documento, prueba) {
      return await ConsultasPublicas.consultarUno('presentaciones', {
        select: 'id,fecha_presentacion',
        eq: [
          { field: 'documento', value: documento },
          { field: 'prueba', value: prueba }
        ]
      }, ESQUEMA_DIAGNOSTICOS);
    },

    // return=minimal: solo requiere permiso de INSERT (no de lectura posterior).
    registrarEstudiante(datos) {
      return ConsultasPublicas.insertar('estudiantes', datos, {
        esquema: ESQUEMA_DIAGNOSTICOS,
        retorno: 'minimal',
        intentos: 1
      });
    },

    // Obtiene y almacena en caché en memoria las preguntas activas y sus textos
    // compartidos (jamás se solicita respuesta_correcta).
    async obtenerBancoPreguntasBase(tabla, usarTextos) {
      const opcionesCachePreguntas = {
        clave: 'pub:diag_preguntas:' + tabla + ':' + (usarTextos ? 'txt' : 'notxt'),
        ttl: TTL_CACHE_BANCO_PREGUNTAS_MS,
        etiquetas: ['esquema:diagnosticos', 'tabla:' + tabla]
      };

      let filas;
      if (usarTextos) {
        try {
          filas = await ConsultasPublicas.consultarTodo(tabla, {
            select: 'id,enunciado,opciones,texto_id,imagen',
            eq: { field: 'activa', value: true },
            cache: opcionesCachePreguntas
          }, ESQUEMA_DIAGNOSTICOS);
        } catch (error) {
          if (error.codigo !== '42703') throw error; // 42703: columna texto_id no existe
          filas = await ConsultasPublicas.consultarTodo(tabla, {
            select: 'id,enunciado,opciones,imagen',
            eq: { field: 'activa', value: true },
            cache: opcionesCachePreguntas
          }, ESQUEMA_DIAGNOSTICOS);
        }
      } else {
        filas = await ConsultasPublicas.consultarTodo(tabla, {
          select: 'id,enunciado,opciones,imagen',
          eq: { field: 'activa', value: true },
          cache: opcionesCachePreguntas
        }, ESQUEMA_DIAGNOSTICOS);
      }

      if (!Array.isArray(filas)) filas = [];

      const idsTextos = Array.from(new Set(
        filas
          .map(function (fila) { return fila.texto_id == null ? null : Number(fila.texto_id); })
          .filter(function (id) { return Number.isSafeInteger(id) && id > 0; })
      ));

      let filasTextos = [];
      if (idsTextos.length > 0) {
        filasTextos = await ConsultasPublicas.consultarTodo('textos_compartidos', {
          select: 'id,titulo,contenido,imagen',
          eq: { field: 'activo', value: true },
          in: { field: 'id', values: idsTextos },
          cache: {
            clave: 'pub:diag_textos:' + tabla + ':' + idsTextos.slice().sort(function (a, b) { return a - b; }).join(','),
            ttl: TTL_CACHE_BANCO_PREGUNTAS_MS,
            etiquetas: ['esquema:diagnosticos', 'tabla:textos_compartidos']
          }
        }, ESQUEMA_DIAGNOSTICOS);
      }

      return { filas: filas, filasTextos: filasTextos || [] };
    },

    async cargarPreguntas(tabla, usarTextos) {
      const banco = await api.obtenerBancoPreguntasBase(tabla, usarTextos);
      const textos = new Map();
      banco.filasTextos.forEach(function (t) {
        textos.set(Number(t.id), {
          titulo: t.titulo || '',
          contenido: t.contenido || '',
          imagen: typeof t.imagen === 'string' && t.imagen.trim() !== '' ? t.imagen.trim() : null
        });
      });
      // Barajado independiente para cada estudiante en cada intento de carga
      return prepararPreguntas(banco.filas, textos);
    },

    // Sin reintentos automáticos: la RPC registra una única presentación.
    enviarPrueba(payload) {
      return ConsultasPublicas.rpc('enviar_prueba', payload, {
        esquema: ESQUEMA_DIAGNOSTICOS,
        intentos: 1
      });
    }
  };

  // =========================================================
  // 4. INTERFAZ DEL EXAMEN
  // =========================================================
  function iniciarExamenDiagnostico(configuracion) {
    const config = Object.assign({
  prueba: '',
  tablaPreguntas: '',
  titulo: '',
  preguntasPorSeccion: PREGUNTAS_POR_SECCION_DEFECTO,
  textosCompartidos: true,
  obtenerImagenPregunta: null,  // (pregunta) => { url, alt } | null — opcional, por prueba
  obtenerImagenTexto: null      // (texto) => { url, alt } | null — opcional, por prueba
}, configuracion || {});

    if (PRUEBAS_VALIDAS.indexOf(config.prueba) === -1) {
      throw new Error('Código de prueba no válido: ' + config.prueba);
    }
    if (!/^preguntas_[a-z_]+$/.test(config.tablaPreguntas)) {
      throw new Error('Tabla de preguntas no válida: ' + config.tablaPreguntas);
    }
    if (typeof ConsultasPublicas === 'undefined') {
      throw new Error('No se cargó ../../Global/supabase.js antes de examen.js.');
    }
    const tamanoSeccion = Math.max(1, parseInt(config.preguntasPorSeccion, 10) || PREGUNTAS_POR_SECCION_DEFECTO);

    // ---------- Estado ----------
    const estado = {
      estudiante: null,
      documentoRegistro: '',
      programasCargados: false,
      gruposSedeActual: [],
      sedeGruposCargada: '',
      cargandoGrupos: false,
      errorCargaGrupos: false,
      tokenCargaGrupos: 0,
      opcionesGrupoFiltradas: [],
      indiceGrupoActivo: -1,
      preguntas: [],
      secciones: [],
      seccionActual: 0,
      respuestas: new Map(), // pregunta_id → clave original (opcion_N)
      enCurso: false,
      enviando: false,
      entregado: false,
      envioIncierto: false,
      ocupado: false
    };

    // ---------- Referencias DOM ----------
    const $ = function (id) { return document.getElementById(id); };
    const r = {};
    [
      'pantallaBienvenida', 'contenidoFormulario', 'btnEmpezar',
      'mensajeLogin', 'formLogin', 'loginDocumento', 'btnLogin', 'btnVolverLogin',
      'mensajeRegistro', 'pasoDocumento', 'formVerificarDocumento', 'regDocumento',
      'regDocumentoConfirmar', 'btnVerificarDocumento', 'btnCancelarVerificacion',
      'formRegistro', 'regDocumentoMostrar', 'regPrimerNombre', 'regSegundoNombre',
      'regPrimerApellido', 'regSegundoApellido', 'regPrograma', 'regSede', 'regGrupo',
      'contenedorBuscadorGrupo', 'regGrupoBuscar', 'btnLimpiarGrupo', 'listaGruposDiagnostico',
      'confirmacionDatos', 'datosConfirmacion', 'btnContinuar', 'btnConfirmarRegistro',
      'btnCancelarRegistro',
      'nombreUsuarioInstrucciones', 'mensajeInstrucciones', 'btnIniciarExamen',
      'btnCancelarInstrucciones',
      'nombreUsuario', 'textoSeccion', 'textoRespondidas', 'barraProgreso', 'pistaProgreso',
      'mapaPreguntas', 'mensajeFormulario', 'formExamen', 'contenedorSeccion',
      'btnAnterior', 'btnSiguiente', 'btnEnviar', 'btnCancelarExamen',
      'textoResultado', 'cajaResultado', 'resumenResultado', 'btnFinalizar',
      'tituloAviso', 'textoAviso', 'btnVolverAviso',
      'modalConfirmacion', 'tituloConfirmacion', 'mensajeConfirmacion',
      'btnConfirmarModal', 'btnCancelarModal'
    ].forEach(function (id) { r[id] = $(id); });


    if (r.contenedorSeccion) {
      ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'].forEach(function (evt) {
        r.contenedorSeccion.addEventListener(evt, function (e) { e.preventDefault(); });
      });
    }

    document.querySelectorAll('[data-examen="titulo"]').forEach(function (el) {
      el.textContent = config.titulo;
    });

    // ---------- Utilidades de interfaz ----------
    const temporizadoresMensaje = {};

    function limpiarMensaje(idContenedor) {
      const t = temporizadoresMensaje[idContenedor];
      if (t) {
        clearTimeout(t.desplazar);
        clearTimeout(t.limpiar);
        delete temporizadoresMensaje[idContenedor];
      }
      const contenedor = $(idContenedor);
      if (contenedor) contenedor.textContent = '';
    }

    // Mismo comportamiento que mostrarMensaje() de PMA/script.js, con acción opcional.
    function mostrarMensaje(idContenedor, mensaje, tipo, opciones) {
      const op = opciones || {};
      const contenedor = $(idContenedor);
      if (!contenedor) return;
      limpiarMensaje(idContenedor);

      const div = document.createElement('div');
      div.className = 'mensaje ' + (tipo || 'error');
      div.setAttribute('role', tipo === 'success' ? 'status' : 'alert');
      const texto = document.createElement('span');
      texto.textContent = mensaje;
      div.appendChild(texto);

      if (op.accion) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'mensaje-accion';
        boton.textContent = op.accion.texto;
        boton.addEventListener('click', op.accion.alHacerClic);
        div.appendChild(boton);
      }
      contenedor.appendChild(div);

      if (typeof div.animate === 'function') {
        div.animate(
          [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 250, easing: 'ease-out' }
        );
      }

      temporizadoresMensaje[idContenedor] = {
        desplazar: setTimeout(function () {
          contenedor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100),
        limpiar: op.persistente ? null : setTimeout(function () {
          contenedor.textContent = '';
        }, 10000)
      };
    }

    // Indicador de carga con las clases globales .loader / .loader-barra.
    function mostrarCargando(idContenedor, texto) {
      const contenedor = $(idContenedor);
      if (!contenedor) return;
      limpiarMensaje(idContenedor);

      const loader = document.createElement('div');
      loader.className = 'loader';
      loader.setAttribute('role', 'status');
      const etiqueta = document.createElement('span');
      etiqueta.className = 'loader-texto';
      etiqueta.textContent = texto || 'Obteniendo datos...';
      const pista = document.createElement('div');
      pista.className = 'loader-pista';
      const barra = document.createElement('div');
      barra.className = 'loader-barra';
      pista.appendChild(barra);
      loader.appendChild(etiqueta);
      loader.appendChild(pista);
      contenedor.appendChild(loader);

      let progreso = 8;
      barra.style.width = progreso + '%';
      const intervalo = setInterval(function () {
        if (!loader.isConnected) {
          clearInterval(intervalo);
          return;
        }
        progreso = Math.min(progreso + Math.random() * (progreso < 60 ? 14 : 5) + 3, 92);
        barra.style.width = progreso + '%';
      }, 450);
    }

    function textoError(error, base) {
      console.error('[Examen ' + config.prueba + ']', error);
      if (error && error.red) {
        return base + ' Verifica tu conexión a internet e inténtalo de nuevo.';
      }
      const codigo = error && (error.codigo || error.status) ? ' (código ' + (error.codigo || error.status) + ')' : '';
      return base + codigo + ' Si el problema continúa, comunícate con el PMA.';
    }

    function estadoBoton(boton, deshabilitar, texto) {
      if (!boton) return;
      boton.disabled = !!deshabilitar;
      if (texto) boton.textContent = texto;
    }

    function resaltarError(validacion, idMensaje) {
      mostrarMensaje(idMensaje, validacion.mensaje, 'error');
      if (validacion.elemento) scrollToError(validacion.elemento);
    }

    // ---------- Navegación entre pantallas ----------
    function mostrarPantalla(id) {
      document.querySelectorAll('#contenidoFormulario > .container > div').forEach(function (div) {
        div.classList.add('hidden');
      });
      $(id).classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function volverInicio() {
      desactivarAvisoSalida();
      location.reload();
    }

    function mostrarLogin() {
      // Precarga paralela silenciosa del catálogo de programas y del banco activo de preguntas
      // para evitar esperas al registrarse o al iniciar la prueba diagnóstica.
      Promise.all([
        ConsultasPublicas.obtenerProgramasListaPlana(),
        api.obtenerBancoPreguntasBase(config.tablaPreguntas, config.textosCompartidos)
      ]).catch(function () {});

      document.body.classList.remove('welcome-active');
      r.pantallaBienvenida.style.transition = 'opacity 0.25s ease';
      r.pantallaBienvenida.style.opacity = '0';
      setTimeout(function () {
        r.pantallaBienvenida.style.display = 'none';
        r.contenidoFormulario.classList.remove('hidden');
        r.contenidoFormulario.style.opacity = '0';
        r.contenidoFormulario.style.transition = 'opacity 0.25s ease';
        setTimeout(function () {
          r.contenidoFormulario.style.opacity = '1';
          mostrarPantalla('pantallaLogin');
          registrarHistorial();
          r.loginDocumento.focus({ preventScroll: true });
        }, 20);
      }, 250);
    }

    function mostrarModalConfirmacion(titulo, mensaje, textoConfirmar, alConfirmar) {
      r.tituloConfirmacion.textContent = titulo;
      r.mensajeConfirmacion.textContent = mensaje;
      r.btnConfirmarModal.textContent = textoConfirmar || 'Sí, estoy seguro';
      r.modalConfirmacion.classList.remove('hidden');
      r.btnCancelarModal.focus({ preventScroll: true });

      const cerrar = function () { r.modalConfirmacion.classList.add('hidden'); };
      r.btnConfirmarModal.onclick = function () {
        cerrar();
        if (alConfirmar) alConfirmar();
      };
      r.btnCancelarModal.onclick = cerrar;
    }

    // ---------- Protección contra salida accidental ----------
    function avisoSalida(evento) {
      evento.preventDefault();
      evento.returnValue = '';
      return '';
    }
    function activarAvisoSalida() { window.addEventListener('beforeunload', avisoSalida); }
    function desactivarAvisoSalida() { window.removeEventListener('beforeunload', avisoSalida); }

    function registrarHistorial() {
      window.history.pushState({ examen: config.prueba }, '', window.location.href);
    }

    function confirmarSalidaExamen() {
      mostrarModalConfirmacion(
        '¿Salir del examen?',
        'Tu examen todavía no ha sido entregado. Si sales, se perderán las respuestas que has marcado.',
        'Sí, salir',
        volverInicio
      );
    }

    window.addEventListener('popstate', function () {
      if (estado.enCurso && !estado.entregado) {
        registrarHistorial();
        if (!estado.enviando) confirmarSalidaExamen();
        return;
      }
      volverInicio();
    });
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

    // ---------- Paso 1: documento ----------
    async function iniciarSesion(evento) {
      evento.preventDefault();
      if (estado.ocupado) return;

      limpiarEspacios(r.loginDocumento);
      const documento = normalizarDocumento(r.loginDocumento.value);
      r.loginDocumento.value = documento;

      const validacion = validarCamposRequeridos([
        {
          valido: function () { return documento.length > 0; },
          mensaje: 'Por favor ingrese su documento de identidad.',
          elemento: function () { return r.loginDocumento; }
        },
        {
          valido: function () { return documentoValido(documento); },
          mensaje: 'Documento no válido.',
          elemento: function () { return r.loginDocumento; }
        }
      ]);
      if (!validacion.valido) {
        resaltarError(validacion, 'mensajeLogin');
        return;
      }

      estado.ocupado = true;
      estadoBoton(r.btnLogin, true, 'Verificando...');
      mostrarCargando('mensajeLogin', 'Verificando documento...');
      try {
        const estudiante = await api.buscarEstudiante(documento);
        if (!estudiante) {
          limpiarMensaje('mensajeLogin');
          iniciarRegistro(documento);
          return;
        }
        await continuarConEstudiante(estudiante, 'mensajeLogin');
      } catch (error) {
        mostrarMensaje('mensajeLogin', textoError(error, 'No fue posible verificar el documento.'), 'error');
      } finally {
        estado.ocupado = false;
        estadoBoton(r.btnLogin, false, 'Continuar');
      }
    }

    // Comprobación independiente: ¿ya presentó esta prueba?
    async function continuarConEstudiante(estudiante, idMensaje) {
      const presentacion = await api.buscarPresentacion(estudiante.documento, config.prueba);
      limpiarMensaje(idMensaje);
      if (presentacion) {
        mostrarYaPresentada(presentacion.fecha_presentacion);
        return;
      }
      abrirInstrucciones(estudiante);
    }

    function mostrarYaPresentada(fecha) {
      const fechaTexto = formatearFecha(fecha).replace(/\.$/, ''); // evita "a. m.."
      r.tituloAviso.textContent = 'Prueba ya presentada';
      r.textoAviso.textContent =
        'Ya entregaste la prueba diagnóstica de ' + config.titulo +
        (fechaTexto ? ' el ' + fechaTexto : '');
      mostrarPantalla('pantallaAviso');
    }

    // ---------- Paso 2: registro (solo si el documento no existe) ----------
    function ocultarConfirmacionRegistro() {
      r.confirmacionDatos.classList.add('hidden');
      r.btnConfirmarRegistro.classList.add('hidden');
      r.btnContinuar.classList.remove('hidden');
    }

    // ---------- Selector con buscador de Grupo dependiente de Sede ----------
    function cerrarListaGrupos() {
      if (!r.listaGruposDiagnostico) return;
      r.listaGruposDiagnostico.classList.add('hidden');
      if (r.regGrupoBuscar) r.regGrupoBuscar.setAttribute('aria-expanded', 'false');
      estado.indiceGrupoActivo = -1;
    }

    function actualizarBotonLimpiarGrupo() {
      if (!r.btnLimpiarGrupo || !r.regGrupoBuscar) return;
      const mostrar = !r.regGrupoBuscar.disabled &&
        ((r.regGrupoBuscar.value || '').length > 0 || (r.regGrupo && r.regGrupo.value.length > 0));
      r.btnLimpiarGrupo.classList.toggle('hidden', !mostrar);
    }

    function limpiarSeleccionGrupo(opciones) {
      const op = opciones || {};
      if (r.regGrupo) r.regGrupo.value = '';
      if (!op.conservarTexto && r.regGrupoBuscar) r.regGrupoBuscar.value = '';
      if (r.contenedorBuscadorGrupo) r.contenedorBuscadorGrupo.classList.remove('grupo-seleccionado');
      actualizarBotonLimpiarGrupo();
      if (!r.confirmacionDatos.classList.contains('hidden') && !estado.ocupado) {
        ocultarConfirmacionRegistro();
      }
    }

    function reiniciarSelectorGrupo() {
      estado.gruposSedeActual = [];
      estado.sedeGruposCargada = '';
      estado.cargandoGrupos = false;
      estado.errorCargaGrupos = false;
      estado.tokenCargaGrupos += 1;
      estado.opcionesGrupoFiltradas = [];
      estado.indiceGrupoActivo = -1;
      if (r.regGrupo) r.regGrupo.value = '';
      if (r.regGrupoBuscar) {
        r.regGrupoBuscar.value = '';
        r.regGrupoBuscar.disabled = true;
        r.regGrupoBuscar.placeholder = 'Primero seleccione una sede';
      }
      if (r.contenedorBuscadorGrupo) r.contenedorBuscadorGrupo.classList.remove('grupo-seleccionado');
      if (r.btnLimpiarGrupo) r.btnLimpiarGrupo.classList.add('hidden');
      cerrarListaGrupos();
    }

    function seleccionarGrupo(grupo) {
      const valor = normalizarCodigoGrupo(grupo);
      if (!valor || estado.gruposSedeActual.indexOf(valor) === -1) return;
      if (r.regGrupo) r.regGrupo.value = valor;
      if (r.regGrupoBuscar) r.regGrupoBuscar.value = valor;
      if (r.contenedorBuscadorGrupo) r.contenedorBuscadorGrupo.classList.add('grupo-seleccionado');
      actualizarBotonLimpiarGrupo();
      cerrarListaGrupos();
      if (!r.confirmacionDatos.classList.contains('hidden') && !estado.ocupado) {
        ocultarConfirmacionRegistro();
      }
    }

    function filtrarGruposSede(terminoRaw) {
      const termino = normalizarCodigoGrupo(terminoRaw);
      if (!termino) return estado.gruposSedeActual.slice();

      const terminoCompacto = termino.replace(/[\s\-]/g, '');
      const empiezanCon = [];
      const contienen = [];
      const coincidenCompacto = [];

      estado.gruposSedeActual.forEach(function (grupo) {
        const pos = grupo.indexOf(termino);
        if (pos === 0) {
          empiezanCon.push(grupo);
        } else if (pos > 0) {
          contienen.push(grupo);
        } else if (terminoCompacto && grupo.replace(/[\s\-]/g, '').indexOf(terminoCompacto) !== -1) {
          coincidenCompacto.push(grupo);
        }
      });

      return empiezanCon.concat(contienen, coincidenCompacto);
    }

    function construirEtiquetaGrupoResaltada(contenedor, textoGrupo, termino) {
      if (!termino) {
        contenedor.textContent = textoGrupo;
        return;
      }
      const pos = textoGrupo.indexOf(termino);
      if (pos === -1) {
        contenedor.textContent = textoGrupo;
        return;
      }
      if (pos > 0) {
        contenedor.appendChild(document.createTextNode(textoGrupo.slice(0, pos)));
      }
      const marca = document.createElement('span');
      marca.className = 'grupo-coincidencia';
      marca.textContent = textoGrupo.slice(pos, pos + termino.length);
      contenedor.appendChild(marca);
      const resto = textoGrupo.slice(pos + termino.length);
      if (resto) {
        contenedor.appendChild(document.createTextNode(resto));
      }
    }

    function actualizarOpcionGrupoActiva(nuevoIndice) {
      if (!r.listaGruposDiagnostico) return;
      const botones = r.listaGruposDiagnostico.querySelectorAll('.grupo-buscador-opcion');
      if (!botones.length) {
        estado.indiceGrupoActivo = -1;
        return;
      }
      let indice = nuevoIndice;
      if (indice < 0) indice = botones.length - 1;
      if (indice >= botones.length) indice = 0;
      estado.indiceGrupoActivo = indice;

      botones.forEach(function (btn, i) {
        const activo = i === indice;
        btn.classList.toggle('activa', activo);
        if (activo && typeof btn.scrollIntoView === 'function') {
          btn.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    function renderizarListaGrupos(terminoRaw) {
      if (!r.listaGruposDiagnostico || !r.regGrupoBuscar) return;
      r.listaGruposDiagnostico.textContent = '';

      const sedeActual = (r.regSede.value || '').trim().toUpperCase();
      if (!sedeActual || estado.cargandoGrupos) {
        cerrarListaGrupos();
        return;
      }

      if (estado.errorCargaGrupos) {
        estado.opcionesGrupoFiltradas = [];
        estado.indiceGrupoActivo = -1;
        const avisoError = document.createElement('div');
        avisoError.className = 'grupo-buscador-vacio';
        avisoError.textContent = 'No fue posible consultar los grupos de ' + sedeActual + '. Verifique su conexión y vuelva a seleccionar la sede.';
        r.listaGruposDiagnostico.appendChild(avisoError);
        r.listaGruposDiagnostico.classList.remove('hidden');
        r.regGrupoBuscar.setAttribute('aria-expanded', 'true');
        return;
      }

      if (estado.gruposSedeActual.length === 0) {
        estado.opcionesGrupoFiltradas = [];
        estado.indiceGrupoActivo = -1;
        const sinGrupos = document.createElement('div');
        sinGrupos.className = 'grupo-buscador-vacio';
        sinGrupos.textContent = 'No hay grupos disponibles registrados para la sede ' + sedeActual + '.';
        r.listaGruposDiagnostico.appendChild(sinGrupos);
        r.listaGruposDiagnostico.classList.remove('hidden');
        r.regGrupoBuscar.setAttribute('aria-expanded', 'true');
        return;
      }

      const termino = normalizarCodigoGrupo(terminoRaw);
      const coincidencias = filtrarGruposSede(termino);
      estado.opcionesGrupoFiltradas = coincidencias;
      estado.indiceGrupoActivo = -1;

      if (coincidencias.length === 0) {
        const vacio = document.createElement('div');
        vacio.className = 'grupo-buscador-vacio';
        vacio.textContent = 'No se encontraron grupos que coincidan con "' + termino + '" en la sede ' + sedeActual + '.';
        r.listaGruposDiagnostico.appendChild(vacio);
      } else {
        const seleccionadoActual = r.regGrupo ? r.regGrupo.value : '';
        const fragmento = document.createDocumentFragment();
        coincidencias.forEach(function (grupo) {
          const opcion = document.createElement('button');
          opcion.type = 'button';
          opcion.className = 'grupo-buscador-opcion' + (grupo === seleccionadoActual ? ' seleccionada' : '');
          opcion.setAttribute('role', 'option');
          opcion.setAttribute('aria-selected', grupo === seleccionadoActual ? 'true' : 'false');
          opcion.dataset.grupo = grupo;

          const textoSpan = document.createElement('span');
          construirEtiquetaGrupoResaltada(textoSpan, grupo, termino);
          opcion.appendChild(textoSpan);

          fragmento.appendChild(opcion);
        });
        r.listaGruposDiagnostico.appendChild(fragmento);
      }

      r.listaGruposDiagnostico.classList.remove('hidden');
      r.regGrupoBuscar.setAttribute('aria-expanded', 'true');
    }

    async function cargarGruposDeSede(sedeRaw, opciones) {
      const op = opciones || {};
      const sede = String(sedeRaw || '').trim().toUpperCase();

      limpiarSeleccionGrupo();
      cerrarListaGrupos();

      if (!sede) {
        reiniciarSelectorGrupo();
        return;
      }

      const miToken = ++estado.tokenCargaGrupos;
      estado.cargandoGrupos = true;
      estado.errorCargaGrupos = false;
      estado.gruposSedeActual = [];
      estado.sedeGruposCargada = '';

      if (r.regGrupoBuscar) {
        r.regGrupoBuscar.disabled = true;
        r.regGrupoBuscar.placeholder = 'Cargando grupos de ' + sede + '...';
      }
      actualizarBotonLimpiarGrupo();

      try {
        const filas = await api.obtenerGruposPorSede(sede, { forzar: !!op.forzar });
        if (miToken !== estado.tokenCargaGrupos) return;

        const unicos = Array.from(new Set(
          filas
            .filter(function (f) {
              return f && String(f.sede || '').trim().toUpperCase() === sede;
            })
            .map(function (f) { return normalizarCodigoGrupo(f.grupo); })
            .filter(Boolean)
        )).sort(function (a, b) {
          return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
        });

        estado.gruposSedeActual = unicos;
        estado.sedeGruposCargada = sede;
        estado.cargandoGrupos = false;
        estado.errorCargaGrupos = false;

        if (r.regGrupoBuscar) {
          r.regGrupoBuscar.disabled = false;
          r.regGrupoBuscar.placeholder = unicos.length > 0
            ? 'Escriba para buscar su grupo (ej: ' + unicos[0] + ')'
            : 'No hay grupos disponibles para ' + sede;
        }
        actualizarBotonLimpiarGrupo();

        if (op.abrirAlTerminar && r.regGrupoBuscar) {
          r.regGrupoBuscar.focus({ preventScroll: true });
          renderizarListaGrupos(r.regGrupoBuscar.value);
        }
      } catch (error) {
        if (miToken !== estado.tokenCargaGrupos) return;
        estado.cargandoGrupos = false;
        estado.errorCargaGrupos = true;
        estado.gruposSedeActual = [];
        estado.sedeGruposCargada = '';
        if (r.regGrupoBuscar) {
          r.regGrupoBuscar.disabled = false;
          r.regGrupoBuscar.placeholder = 'Toque aquí para reintentar cargar los grupos';
        }
        mostrarMensaje('mensajeRegistro', textoError(error, 'No fue posible consultar los grupos de la sede seleccionada.'), 'error');
      }
    }

    function iniciarRegistro(documento) {
      limpiarMensaje('mensajeRegistro');
      r.formRegistro.reset();
      reiniciarSelectorGrupo();
      r.formRegistro.classList.add('hidden');
      ocultarConfirmacionRegistro();
      r.pasoDocumento.classList.remove('hidden');
      r.regDocumento.value = documento;
      r.regDocumentoConfirmar.value = '';
      mostrarPantalla('pantallaRegistro');
      r.regDocumentoConfirmar.focus({ preventScroll: true });
    }

    async function verificarDocumentoRegistro(evento) {
      evento.preventDefault();
      if (estado.ocupado) return;

      const documento = normalizarDocumento(r.regDocumento.value);
      const confirmacion = normalizarDocumento(r.regDocumentoConfirmar.value);
      const validacion = validarCamposRequeridos([
        {
          valido: function () { return documentoValido(documento); },
          mensaje: 'Por favor ingrese un documento válido (' + DOCUMENTO_MIN + ' a ' + DOCUMENTO_MAX + ' dígitos).',
          elemento: function () { return r.regDocumento; }
        },
        {
          valido: function () { return confirmacion.length > 0; },
          mensaje: 'Por favor confirme su documento de identidad.',
          elemento: function () { return r.regDocumentoConfirmar; }
        },
        {
          valido: function () { return compararDocumentos(documento, confirmacion); },
          mensaje: 'Los documentos no coinciden.',
          elemento: function () { return r.regDocumentoConfirmar; }
        }
      ]);
      if (!validacion.valido) {
        resaltarError(validacion, 'mensajeRegistro');
        return;
      }

      estado.ocupado = true;
      estadoBoton(r.btnVerificarDocumento, true, 'Verificando...');
      mostrarCargando('mensajeRegistro', 'Verificando documento...');
      try {
        // Por si corrigió el documento: se vuelve a consultar.
        const existente = await api.buscarEstudiante(documento);
        if (existente) {
          await continuarConEstudiante(existente, 'mensajeRegistro');
          return;
        }
        if (!estado.programasCargados) {
          await ConsultasPublicas.poblarSelectProgramasPlana('regPrograma');
          estado.programasCargados = r.regPrograma.options.length > 1;
        }
        limpiarMensaje('mensajeRegistro');
        estado.documentoRegistro = documento;
        r.regDocumentoMostrar.value = documento;
        r.pasoDocumento.classList.add('hidden');
        r.formRegistro.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        mostrarMensaje('mensajeRegistro', textoError(error, 'No fue posible verificar el documento.'), 'error');
      } finally {
        estado.ocupado = false;
        estadoBoton(r.btnVerificarDocumento, false, 'Continuar');
      }
    }

    function leerDatosRegistro() {
      const limpiar = function (input) { return normalizarNombreSinEspacios(input.value || ''); };
      const primerNombre = limpiar(r.regPrimerNombre);
      const segundoNombre = limpiar(r.regSegundoNombre);
      const primerApellido = limpiar(r.regPrimerApellido);
      const segundoApellido = limpiar(r.regSegundoApellido);
      return {
        documento: estado.documentoRegistro,
        // Mismo formato de nombre que PMA: APELLIDOS + NOMBRES
        nombre: [primerApellido, segundoApellido, primerNombre, segundoNombre].filter(Boolean).join(' '),
        programa: r.regPrograma.value,
        sede: (r.regSede.value || '').trim().toUpperCase(),
        grupo: normalizarCodigoGrupo(r.regGrupo.value || '')
      };
    }

    function validarRegistro() {
      if (r.regGrupo && !r.regGrupo.value && r.regGrupoBuscar) {
        const escrito = normalizarCodigoGrupo(r.regGrupoBuscar.value);
        if (escrito && estado.gruposSedeActual.indexOf(escrito) !== -1) {
          seleccionarGrupo(escrito);
        }
      }

      const lleno = function (input) { return normalizarNombreSinEspacios(input.value || '').length > 0; };
      const textoBusquedaGrupo = r.regGrupoBuscar ? normalizarCodigoGrupo(r.regGrupoBuscar.value) : '';

      return validarCamposRequeridos([
        { valido: function () { return documentoValido(estado.documentoRegistro); }, mensaje: 'El documento no es válido.', elemento: function () { return r.regDocumentoMostrar; } },
        { valido: function () { return lleno(r.regPrimerNombre); }, mensaje: 'Por favor ingrese su primer nombre.', elemento: function () { return r.regPrimerNombre; } },
        { valido: function () { return lleno(r.regPrimerApellido); }, mensaje: 'Por favor ingrese su primer apellido.', elemento: function () { return r.regPrimerApellido; } },
        { valido: function () { return lleno(r.regSegundoApellido); }, mensaje: 'Por favor ingrese su segundo apellido.', elemento: function () { return r.regSegundoApellido; } },
        { valido: function () { return !!r.regPrograma.value; }, mensaje: 'Por favor seleccione su programa académico.', elemento: function () { return r.regPrograma; } },
        { valido: function () { return !!r.regSede.value; }, mensaje: 'Por favor seleccione su sede.', elemento: function () { return r.regSede; } },
        {
          valido: function () {
            const grupoElegido = normalizarCodigoGrupo(r.regGrupo.value || '');
            return grupoElegido.length > 0 && estado.gruposSedeActual.indexOf(grupoElegido) !== -1;
          },
          mensaje: textoBusquedaGrupo.length > 0
            ? 'Por favor seleccione un grupo válido de la lista de coincidencias.'
            : 'Por favor busque y seleccione su grupo.',
          elemento: function () { return r.regGrupoBuscar || r.regGrupo; }
        }
      ]);
    }

    function mostrarConfirmacionRegistro() {
      const validacion = validarRegistro();
      if (!validacion.valido) {
        resaltarError(validacion, 'mensajeRegistro');
        return;
      }
      const datos = leerDatosRegistro();
      const filas = [
        ['Documento:', datos.documento],
        ['Nombre completo:', datos.nombre],
        ['Programa:', datos.programa],
        ['Sede:', r.regSede.options[r.regSede.selectedIndex].text],
        ['Grupo:', datos.grupo]
      ];
      r.datosConfirmacion.textContent = '';
      filas.forEach(function (fila) {
        const item = document.createElement('div');
        item.className = 'confirmation-item';
        const etiqueta = document.createElement('div');
        etiqueta.className = 'confirmation-label';
        etiqueta.textContent = fila[0];
        const valor = document.createElement('div');
        valor.className = 'confirmation-value';
        valor.textContent = fila[1];
        item.appendChild(etiqueta);
        item.appendChild(valor);
        r.datosConfirmacion.appendChild(item);
      });
      limpiarMensaje('mensajeRegistro');
      r.confirmacionDatos.classList.remove('hidden');
      r.btnConfirmarRegistro.classList.remove('hidden');
      r.btnContinuar.classList.add('hidden');
      setTimeout(function () {
        r.confirmacionDatos.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }

    async function registrarEstudiante() {
      if (estado.ocupado) return;
      const validacion = validarRegistro();
      if (!validacion.valido) {
        ocultarConfirmacionRegistro();
        resaltarError(validacion, 'mensajeRegistro');
        return;
      }
      const datos = leerDatosRegistro();

      estado.ocupado = true;
      estadoBoton(r.btnConfirmarRegistro, true, 'Registrando...');
      mostrarCargando('mensajeRegistro', 'Registrando datos...');
      try {
        await api.registrarEstudiante(datos);
        limpiarMensaje('mensajeRegistro');
        abrirInstrucciones(datos); // estudiante nuevo: no puede tener presentaciones
      } catch (error) {
        let errorFinal = error;
        if (error.codigo === '23505') {
          // Ya existía (registro paralelo o reintento): continuar con el registro existente.
          try {
            const existente = await api.buscarEstudiante(datos.documento);
            if (existente) {
              await continuarConEstudiante(existente, 'mensajeRegistro');
              return;
            }
          } catch (error2) {
            errorFinal = error2;
          }
        }
        if (error.codigo === '23503') {
          ocultarConfirmacionRegistro();
          cargarGruposDeSede(datos.sede, { forzar: true });
          mostrarMensaje(
            'mensajeRegistro',
            'El grupo seleccionado ya no se encuentra disponible para esta sede. Por favor busque y seleccione nuevamente su grupo.',
            'error'
          );
          return;
        }
        mostrarMensaje('mensajeRegistro', textoError(errorFinal, 'No fue posible completar el registro.'), 'error');
      } finally {
        estado.ocupado = false;
        estadoBoton(r.btnConfirmarRegistro, false, 'Confirmar y continuar');
      }
    }

    // ---------- Paso 3: instrucciones ----------
    function abrirInstrucciones(estudiante) {
      estado.estudiante = {
        documento: estudiante.documento,
        nombre: estudiante.nombre || '',
        programa: estudiante.programa || '',
        sede: estudiante.sede || '',
        grupo: estudiante.grupo || ''
      };
      r.nombreUsuarioInstrucciones.textContent = 'Bienvenido(a): ' + censurarNombre(estado.estudiante.nombre);
      limpiarMensaje('mensajeInstrucciones');
      mostrarPantalla('pantallaInstrucciones');
    }

    // ---------- Paso 4: examen ----------
    async function iniciarExamen() {
      if (estado.ocupado || !estado.estudiante) return;
      estado.ocupado = true;
      estadoBoton(r.btnIniciarExamen, true, 'Cargando preguntas...');
      mostrarCargando('mensajeInstrucciones', 'Cargando preguntas...');
      try {
        const preguntas = await api.cargarPreguntas(config.tablaPreguntas, config.textosCompartidos);
        if (preguntas.length === 0) {
          mostrarMensaje(
            'mensajeInstrucciones',
            'En este momento la prueba no tiene preguntas disponibles. Comunícate con el PMA e inténtalo más tarde.',
            'error',
            { persistente: true }
          );
          return;
        }
        estado.preguntas = preguntas;
        estado.secciones = dividirEnSecciones(preguntas.length, tamanoSeccion);
        estado.respuestas.clear();
        estado.enCurso = true;

        limpiarMensaje('mensajeInstrucciones');
        r.nombreUsuario.textContent = 'Estudiante: ' + censurarNombre(estado.estudiante.nombre);
        construirMapa();
        mostrarPantalla('pantallaFormulario');
        renderizarSeccion(0, { desplazar: false });
        activarAvisoSalida();
        registrarHistorial();
      } catch (error) {
        mostrarMensaje('mensajeInstrucciones', textoError(error, 'No fue posible cargar las preguntas.'), 'error');
      } finally {
        estado.ocupado = false;
        estadoBoton(r.btnIniciarExamen, false, 'Iniciar examen');
      }
    }

    function crearElemento(etiqueta, clase, texto) {
      const el = document.createElement(etiqueta);
      if (clase) el.className = clase;
      if (texto != null) el.textContent = texto;
      return el;
    }

    // Las claves originales nunca se escriben en el DOM: el valor del radio es
    // solo la posición visual y se traduce a la clave en memoria.
    function crearBloquePregunta(pregunta, indice, textoYaMostrado) {
      const total = estado.preguntas.length;
      const bloque = crearElemento('fieldset', 'pregunta-examen');
      bloque.id = 'pregunta-' + indice;

      const leyenda = crearElemento('legend', 'pregunta-encabezado', 'Pregunta ' + (indice + 1));
      bloque.appendChild(leyenda);

      if (pregunta.texto && !textoYaMostrado) {
  const contexto = crearElemento('div', 'pregunta-contexto');
  if (pregunta.texto.titulo) contexto.appendChild(crearElemento('p', 'pregunta-contexto-titulo', pregunta.texto.titulo));
  contexto.appendChild(crearElemento('p', 'pregunta-contexto-texto', pregunta.texto.contenido));

  if (typeof config.obtenerImagenTexto === 'function') {
    const infoImagenTexto = config.obtenerImagenTexto(pregunta.texto);
    if (infoImagenTexto && infoImagenTexto.url) {
      const figuraImagenTexto = crearElemento('figure', 'pregunta-imagen');
      const imgTexto = document.createElement('img');
      imgTexto.src = infoImagenTexto.url;
      imgTexto.alt = infoImagenTexto.alt || '';
      imgTexto.loading = 'lazy';
      imgTexto.decoding = 'async';
      imgTexto.addEventListener('error', function () {
        figuraImagenTexto.classList.add('pregunta-imagen-error-estado');
        const aviso = crearElemento('p', 'pregunta-imagen-error', 'No fue posible cargar la imagen de este texto.');
        figuraImagenTexto.appendChild(aviso);
        imgTexto.remove();
      });
      figuraImagenTexto.appendChild(imgTexto);
      contexto.appendChild(figuraImagenTexto);
    }
  }

  bloque.appendChild(contexto);
} else if (pregunta.texto && textoYaMostrado) {
        bloque.appendChild(crearElemento('p', 'pregunta-contexto-nota', 'Responde con base en el mismo texto de la pregunta anterior.'));
      }

            const enunciado = crearElemento('p', 'pregunta-enunciado', pregunta.enunciado);
      enunciado.id = 'enunciado-' + indice;
      bloque.setAttribute('aria-describedby', enunciado.id);
      bloque.appendChild(enunciado);

      if (typeof config.obtenerImagenPregunta === 'function') {
        const infoImagen = config.obtenerImagenPregunta(pregunta);
        if (infoImagen && infoImagen.url) {
          const figuraImagen = crearElemento('figure', 'pregunta-imagen');
          const img = document.createElement('img');
          img.src = infoImagen.url;
          img.alt = infoImagen.alt || '';
          img.loading = 'lazy';
          img.decoding = 'async';
          img.addEventListener('error', function () {
            figuraImagen.classList.add('pregunta-imagen-error-estado');
            const aviso = crearElemento('p', 'pregunta-imagen-error', 'No fue posible cargar la imagen de esta pregunta.');
            figuraImagen.appendChild(aviso);
            img.remove();
          });
          figuraImagen.appendChild(img);
          bloque.appendChild(figuraImagen);
        }
      }

      const grupo = crearElemento('div', 'pregunta-opciones');
      grupo.setAttribute('role', 'radiogroup');
      grupo.setAttribute('aria-labelledby', enunciado.id);
      const seleccion = estado.respuestas.get(pregunta.id);

      pregunta.opciones.forEach(function (opcion, posicion) {
        const etiqueta = crearElemento('label', 'opcion-examen');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'respuesta-' + indice;
        input.value = String(posicion);
        input.checked = opcion.clave === seleccion;
        input.disabled = estado.enviando || estado.entregado;
        if (input.checked) etiqueta.classList.add('seleccionada');

        etiqueta.appendChild(input);
        etiqueta.appendChild(crearElemento('span', 'opcion-letra', opcion.letra));
        etiqueta.appendChild(crearElemento('span', 'opcion-texto', opcion.texto));
        grupo.appendChild(etiqueta);
      });

      bloque.appendChild(grupo);
      return bloque;
    }

    function renderizarSeccion(indiceSeccion, opciones) {
      const op = opciones || {};
      const seccion = estado.secciones[indiceSeccion];
      if (!seccion) return;
      estado.seccionActual = indiceSeccion;

      const fragmento = document.createDocumentFragment();
      let textoAnterior = null;
      for (let i = seccion.inicio; i < seccion.fin; i++) {
        const pregunta = estado.preguntas[i];
        const repetido = pregunta.textoId != null && pregunta.textoId === textoAnterior;
        fragmento.appendChild(crearBloquePregunta(pregunta, i, repetido));
        textoAnterior = pregunta.textoId;
      }
      r.contenedorSeccion.textContent = '';
      r.contenedorSeccion.appendChild(fragmento);

      // Reinicia la animación global .pagina-formulario
      r.contenedorSeccion.classList.remove('pagina-formulario');
      void r.contenedorSeccion.offsetWidth;
      r.contenedorSeccion.classList.add('pagina-formulario');

      actualizarEstadoExamen();
      if (op.desplazar !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function construirMapa() {
      r.mapaPreguntas.textContent = '';
      estado.preguntas.forEach(function (pregunta, indice) {
        const boton = crearElemento('button', 'mapa-pregunta', String(indice + 1));
        boton.type = 'button';
        boton.dataset.indice = String(indice);
        r.mapaPreguntas.appendChild(boton);
      });
    }

    function actualizarEstadoExamen() {
      const total = estado.preguntas.length;
      const respondidas = estado.respuestas.size;
      const seccion = estado.secciones[estado.seccionActual];
      const esPrimera = estado.seccionActual === 0;
      const esUltima = estado.seccionActual === estado.secciones.length - 1;

      r.textoSeccion.textContent = 'Sección ' + (estado.seccionActual + 1) + ' de ' + estado.secciones.length;
      r.textoRespondidas.textContent = respondidas + ' de ' + total + ' respondidas';
      const porcentaje = total > 0 ? Math.round((respondidas / total) * 100) : 0;
      r.barraProgreso.style.width = porcentaje + '%';
      r.pistaProgreso.setAttribute('aria-valuenow', String(porcentaje));

      Array.prototype.forEach.call(r.mapaPreguntas.children, function (boton) {
        const indice = Number(boton.dataset.indice);
        const pregunta = estado.preguntas[indice];
        const respondida = estado.respuestas.has(pregunta.id);
        const enSeccion = seccion && indice >= seccion.inicio && indice < seccion.fin;
        boton.classList.toggle('respondida', respondida);
        boton.setAttribute('aria-label', 'Pregunta ' + (indice + 1) + (respondida ? ', respondida' : ', sin responder'));
        if (enSeccion) boton.setAttribute('aria-current', 'step'); else boton.removeAttribute('aria-current');
      });

      r.btnAnterior.classList.toggle('invisible', esPrimera);
      r.btnAnterior.disabled = esPrimera || estado.enviando;
      r.btnSiguiente.classList.toggle('hidden', esUltima);
      r.btnEnviar.classList.toggle('hidden', !esUltima);
    }

    function irAPregunta(indice, resaltar) {
      const indiceSeccion = Math.floor(indice / tamanoSeccion);
      if (indiceSeccion !== estado.seccionActual) renderizarSeccion(indiceSeccion, { desplazar: false });
      const bloque = $('pregunta-' + indice);
      if (!bloque) return;
            setTimeout(function () {
        const y = bloque.getBoundingClientRect().top + window.pageYOffset - 24;
        window.scrollTo({ top: y, behavior: 'smooth' });
        const primerInput = bloque.querySelector('input');
        if (primerInput) primerInput.focus({ preventScroll: true });
      }, 60);
      if (resaltar) scrollToError(bloque);
    }

    function alCambiarRespuesta(evento) {
      const input = evento.target;
      if (!input || input.type !== 'radio') return;
      if (estado.enviando || estado.entregado) return;

      const indice = Number(String(input.name).replace('respuesta-', ''));
      const pregunta = estado.preguntas[indice];
      const opcion = pregunta && pregunta.opciones[Number(input.value)];
      if (!opcion) return;

      estado.respuestas.set(pregunta.id, opcion.clave);
      const bloque = input.closest('.pregunta-examen');
      bloque.querySelectorAll('.opcion-examen').forEach(function (etiqueta) {
        etiqueta.classList.toggle('seleccionada', etiqueta.contains(input));
      });
      actualizarEstadoExamen();
    }

    function bloquearExamen(bloquear) {
      r.formExamen.classList.toggle('examen-bloqueado', bloquear);
      r.contenedorSeccion.querySelectorAll('input').forEach(function (input) { input.disabled = bloquear; });
      Array.prototype.forEach.call(r.mapaPreguntas.children, function (boton) { boton.disabled = bloquear; });
      r.btnSiguiente.disabled = bloquear;
      r.btnCancelarExamen.disabled = bloquear;
      r.btnEnviar.disabled = bloquear;
      r.btnAnterior.disabled = bloquear || estado.seccionActual === 0;
    }

    function informarPendientes(pendientes) {
      const cantidad = pendientes.length;
      const mensaje = cantidad === 1
        ? 'Falta 1 pregunta por responder (pregunta ' + (pendientes[0] + 1) + ').'
        : 'Faltan ' + cantidad + ' preguntas por responder.';
      mostrarMensaje('mensajeFormulario', mensaje, 'error', {
        persistente: true,
        accion: {
          texto: 'Ir a la pregunta ' + (pendientes[0] + 1),
          alHacerClic: function () {
            limpiarMensaje('mensajeFormulario');
            irAPregunta(pendientes[0], true);
          }
        }
      });
    }

    // ---------- Paso 5: entrega ----------
    function solicitarEntrega(evento) {
      if (evento) evento.preventDefault();
      if (estado.enviando || estado.entregado || !estado.enCurso) return;

      const pendientes = preguntasPendientes(estado.preguntas, estado.respuestas);
      if (pendientes.length > 0) {
        informarPendientes(pendientes);
        return;
      }
      mostrarModalConfirmacion(
        '¿Entregar el examen?',
        'Respondiste las ' + estado.preguntas.length + ' preguntas. Después de entregar no podrás modificar tus respuestas ni volver a presentar la prueba.',
        'Sí, entregar examen',
        enviarExamen
      );
    }

    async function enviarExamen() {
      if (estado.enviando || estado.entregado) return;

      // Segunda comprobación justo antes de enviar.
      const pendientes = preguntasPendientes(estado.preguntas, estado.respuestas);
      if (pendientes.length > 0) {
        informarPendientes(pendientes);
        return;
      }

      let payload;
      try {
        payload = construirPayload(estado.estudiante.documento, config.prueba, estado.preguntas, estado.respuestas);
      } catch (error) {
        mostrarMensaje('mensajeFormulario', error.message, 'error', { persistente: true });
        return;
      }

      estado.enviando = true;
      bloquearExamen(true);
      estadoBoton(r.btnEnviar, true, 'Entregando...');
      mostrarCargando('mensajeFormulario', 'Entregando examen...');

      try {
        // Si un intento anterior quedó sin respuesta, primero se verifica en el servidor.
        if (estado.envioIncierto) {
          const previa = await api.buscarPresentacion(estado.estudiante.documento, config.prueba);
          if (previa) {
            finalizarEntrega(null);
            return;
          }
        }
        const respuesta = await api.enviarPrueba(payload);
        finalizarEntrega(respuesta);
      } catch (error) {
        await manejarErrorEntrega(error);
      }
    }

    async function manejarErrorEntrega(error) {
      const info = interpretarError(error);
      console.error('[Examen ' + config.prueba + '] Error al entregar:', error);

      if (info.tipo === 'YA_PRESENTADA') {
        estado.entregado = true;
        estado.enCurso = false;
        estado.enviando = false;
        desactivarAvisoSalida();
        limpiarExamen();
        mostrarYaPresentada(null);
        return;
      }

      if (info.tipo === 'RED' || info.tipo === 'DESCONOCIDO') {
        // No se sabe si el servidor guardó: verificar antes de permitir otro intento.
        estado.envioIncierto = true;
        try {
          const previa = await api.buscarPresentacion(estado.estudiante.documento, config.prueba);
          if (previa) {
            finalizarEntrega(null);
            return;
          }
          liberarEntrega('Entregar examen');
          mostrarMensaje(
            'mensajeFormulario',
            'No fue posible entregar el examen por un problema de conexión. Comprobamos que todavía no ha sido registrado. Tus respuestas siguen marcadas: revisa tu conexión e inténtalo de nuevo.',
            'error',
            { persistente: true }
          );
        } catch (errorVerificacion) {
          console.error('[Examen ' + config.prueba + '] No se pudo verificar la entrega:', errorVerificacion);
          liberarEntrega('Verificar y reintentar');
          mostrarMensaje(
            'mensajeFormulario',
            'No pudimos confirmar si tu examen fue recibido. Tus respuestas siguen marcadas. Revisa tu conexión y pulsa "Verificar y reintentar": antes de reenviar comprobaremos si ya quedó registrado.',
            'error',
            { persistente: true }
          );
        }
        return;
      }

      // VALIDACION o RECHAZADO: el servidor respondió y no guardó nada.
      liberarEntrega('Entregar examen');
      let mensaje = 'El examen no fue entregado. ' + (info.mensaje || '');
      if (/incompleta|no existe o no está activa|opción inválida/i.test(info.mensaje)) {
        mensaje += ' Es posible que las preguntas de la prueba hayan cambiado mientras la presentabas; comunícate con el PMA.';
      } else if (info.tipo === 'RECHAZADO') {
        mensaje = textoError(error, 'El servidor rechazó la entrega y el examen no quedó registrado.');
      }
      mostrarMensaje('mensajeFormulario', mensaje.trim(), 'error', { persistente: true });
    }

    function liberarEntrega(textoBoton) {
      estado.enviando = false;
      bloquearExamen(false);
      estadoBoton(r.btnEnviar, false, textoBoton);
    }

    // Borra preguntas y respuestas de la memoria y del DOM.
    function limpiarExamen() {
      estado.preguntas = [];
      estado.secciones = [];
      estado.respuestas.clear();
      r.contenedorSeccion.textContent = '';
      r.mapaPreguntas.textContent = '';
      limpiarMensaje('mensajeFormulario');
    }

    function finalizarEntrega(respuestaRpc) {
      const totalLocal = estado.preguntas.length;
      estado.entregado = true;
      estado.enCurso = false;
      estado.enviando = false;
      estado.envioIncierto = false;
      desactivarAvisoSalida();
      limpiarExamen();

      if (respuestaRpc) {
        const resultado = calcularResultado(respuestaRpc, totalLocal);
        r.textoResultado.textContent =
          'Tu prueba diagnóstica de ' + config.titulo + ' quedó registrada correctamente.';
        r.resumenResultado.textContent = '';
        [
          ['Respuestas correctas:', String(resultado.correctas)],
          ['Respuestas incorrectas:', String(resultado.incorrectas)],
          ['Total de preguntas:', String(resultado.total)],
          ['Porcentaje obtenido:', formatearPorcentaje(resultado.porcentaje)]
        ].forEach(function (fila) {
          const item = crearElemento('div', 'confirmation-item');
          item.appendChild(crearElemento('div', 'confirmation-label', fila[0]));
          item.appendChild(crearElemento('div', 'confirmation-value', fila[1]));
          r.resumenResultado.appendChild(item);
        });
        r.cajaResultado.classList.remove('hidden');
      } else {
        // Entrega confirmada por verificación (la respuesta original se perdió).
        r.textoResultado.textContent =
          'Confirmamos que tu prueba diagnóstica de ' + config.titulo + ' quedó registrada correctamente. ' +
          'Por un problema de conexión no fue posible mostrar el resumen de resultados en este momento.';
        r.cajaResultado.classList.add('hidden');
      }
      mostrarPantalla('pantallaResultado');
    }

    // ---------- Eventos ----------
    r.btnEmpezar.addEventListener('click', mostrarLogin);
    r.formLogin.addEventListener('submit', iniciarSesion);
    r.btnVolverLogin.addEventListener('click', volverInicio);

    r.formVerificarDocumento.addEventListener('submit', verificarDocumentoRegistro);
    r.btnCancelarVerificacion.addEventListener('click', volverInicio);

    if (r.regSede) {
      r.regSede.addEventListener('change', function () {
        cargarGruposDeSede(r.regSede.value);
      });
    }

    if (r.regGrupoBuscar) {
      const abrirBuscadorGrupo = function () {
        if (r.regGrupoBuscar.disabled) return;
        if (estado.errorCargaGrupos && r.regSede && r.regSede.value) {
          cargarGruposDeSede(r.regSede.value, { abrirAlTerminar: true, forzar: true });
          return;
        }
        const terminoActual = normalizarCodigoGrupo(r.regGrupoBuscar.value);
        const yaSeleccionado = r.regGrupo && r.regGrupo.value && r.regGrupo.value === terminoActual;
        renderizarListaGrupos(yaSeleccionado ? '' : r.regGrupoBuscar.value);
      };

      r.regGrupoBuscar.addEventListener('focus', abrirBuscadorGrupo);
      r.regGrupoBuscar.addEventListener('click', abrirBuscadorGrupo);

      r.regGrupoBuscar.addEventListener('input', function () {
        const valorMayus = String(r.regGrupoBuscar.value || '').toUpperCase().replace(/^\s+/, '');
        if (r.regGrupoBuscar.value !== valorMayus) {
          r.regGrupoBuscar.value = valorMayus;
        }
        if (r.regGrupo && normalizarCodigoGrupo(valorMayus) !== r.regGrupo.value) {
          r.regGrupo.value = '';
          if (r.contenedorBuscadorGrupo) r.contenedorBuscadorGrupo.classList.remove('grupo-seleccionado');
        }
        actualizarBotonLimpiarGrupo();
        renderizarListaGrupos(valorMayus);
      });

      r.regGrupoBuscar.addEventListener('keydown', function (evento) {
        const listaAbierta = r.listaGruposDiagnostico && !r.listaGruposDiagnostico.classList.contains('hidden');
        if (evento.key === 'ArrowDown') {
          evento.preventDefault();
          if (!listaAbierta) {
            abrirBuscadorGrupo();
          }
          actualizarOpcionGrupoActiva(estado.indiceGrupoActivo + 1);
        } else if (evento.key === 'ArrowUp') {
          evento.preventDefault();
          if (!listaAbierta) {
            abrirBuscadorGrupo();
          }
          actualizarOpcionGrupoActiva(estado.indiceGrupoActivo - 1);
        } else if (evento.key === 'Enter' && listaAbierta) {
          evento.preventDefault();
          if (estado.indiceGrupoActivo >= 0 && estado.opcionesGrupoFiltradas[estado.indiceGrupoActivo]) {
            seleccionarGrupo(estado.opcionesGrupoFiltradas[estado.indiceGrupoActivo]);
          } else if (estado.opcionesGrupoFiltradas.length === 1) {
            seleccionarGrupo(estado.opcionesGrupoFiltradas[0]);
          } else {
            const exacto = normalizarCodigoGrupo(r.regGrupoBuscar.value);
            if (exacto && estado.gruposSedeActual.indexOf(exacto) !== -1) {
              seleccionarGrupo(exacto);
            }
          }
        } else if (evento.key === 'Escape' && listaAbierta) {
          evento.preventDefault();
          cerrarListaGrupos();
        }
      });
    }

    if (r.btnLimpiarGrupo) {
      r.btnLimpiarGrupo.addEventListener('click', function () {
        limpiarSeleccionGrupo();
        if (r.regGrupoBuscar && !r.regGrupoBuscar.disabled) {
          r.regGrupoBuscar.focus({ preventScroll: true });
          renderizarListaGrupos('');
        }
      });
    }

    if (r.listaGruposDiagnostico) {
      r.listaGruposDiagnostico.addEventListener('mousedown', function (evento) {
        if (evento.target.closest('.grupo-buscador-opcion')) {
          evento.preventDefault();
        }
      });
      r.listaGruposDiagnostico.addEventListener('click', function (evento) {
        const botonOpcion = evento.target.closest('.grupo-buscador-opcion');
        if (!botonOpcion) return;
        seleccionarGrupo(botonOpcion.dataset.grupo || '');
      });
    }

    document.addEventListener('click', function (evento) {
      if (!r.contenedorBuscadorGrupo || !r.listaGruposDiagnostico) return;
      if (r.listaGruposDiagnostico.classList.contains('hidden')) return;
      if (!r.contenedorBuscadorGrupo.contains(evento.target)) {
        if (r.regGrupo && !r.regGrupo.value && r.regGrupoBuscar) {
          const exacto = normalizarCodigoGrupo(r.regGrupoBuscar.value);
          if (exacto && estado.gruposSedeActual.indexOf(exacto) !== -1) {
            seleccionarGrupo(exacto);
            return;
          }
        }
        cerrarListaGrupos();
      }
    });

    r.formRegistro.addEventListener('submit', function (evento) {
      evento.preventDefault();
      if (r.btnConfirmarRegistro.classList.contains('hidden')) mostrarConfirmacionRegistro();
      else registrarEstudiante();
    });
    // Si cambia algún dato después de mostrar la confirmación, se vuelve a pedir.
    ['input', 'change'].forEach(function (tipo) {
      r.formRegistro.addEventListener(tipo, function () {
        if (!r.confirmacionDatos.classList.contains('hidden') && !estado.ocupado) ocultarConfirmacionRegistro();
      });
    });
    r.btnCancelarRegistro.addEventListener('click', volverInicio);

    r.btnIniciarExamen.addEventListener('click', iniciarExamen);
    r.btnCancelarInstrucciones.addEventListener('click', volverInicio);

    r.contenedorSeccion.addEventListener('change', alCambiarRespuesta);
    r.btnAnterior.addEventListener('click', function () {
      if (estado.seccionActual > 0 && !estado.enviando) renderizarSeccion(estado.seccionActual - 1);
    });
    r.btnSiguiente.addEventListener('click', function () {
      if (estado.seccionActual < estado.secciones.length - 1 && !estado.enviando) renderizarSeccion(estado.seccionActual + 1);
    });
    r.mapaPreguntas.addEventListener('click', function (evento) {
      const boton = evento.target.closest('.mapa-pregunta');
      if (!boton || estado.enviando) return;
      irAPregunta(Number(boton.dataset.indice), false);
    });
    r.formExamen.addEventListener('submit', solicitarEntrega);
    r.btnCancelarExamen.addEventListener('click', function () {
      if (!estado.enviando) confirmarSalidaExamen();
    });

    r.btnFinalizar.addEventListener('click', volverInicio);
    r.btnVolverAviso.addEventListener('click', volverInicio);

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && !r.modalConfirmacion.classList.contains('hidden')) {
        r.modalConfirmacion.classList.add('hidden');
      }
    });

    window.history.replaceState({ examen: config.prueba, inicio: true }, '', window.location.href);
  }

  // =========================================================
  // 5. API PÚBLICA
  // =========================================================
  window.iniciarExamenDiagnostico = iniciarExamenDiagnostico;
  window.ExamenDiagnostico = Object.freeze({
    iniciar: iniciarExamenDiagnostico,
    // Funciones puras expuestas para pruebas y para los otros exámenes.
    utilidades: Object.freeze({
      mezclar: mezclar,
      normalizarDocumento: normalizarDocumento,
      documentoValido: documentoValido,
      prepararPreguntas: prepararPreguntas,
      dividirEnSecciones: dividirEnSecciones,
      preguntasPendientes: preguntasPendientes,
      construirPayload: construirPayload,
      calcularResultado: calcularResultado,
      interpretarError: interpretarError,
      censurarNombre: censurarNombre
    })
  });
})(window, document);
