// ============================================================================
// Global/reintentos.js — SISTEMA GLOBAL CENTRALIZADO DE REINTENTOS DE ENVÍO
// ============================================================================
// Responsabilidad única:
//   Centralizar en un único archivo toda la lógica, configuración, tiempos de
//   espera, clasificación de errores temporales y prevención de envíos
//   duplicados para TODOS los formularios y operaciones del proyecto PMA:
//     - PMA (Registro de estudiante y Formulario de asistencia a tutorías)
//     - PVU (Formulario de asistencia Preparación para la Vida Universitaria)
//     - AAA (Formulario de Activación de Acompañamiento Académico)
//     - Visitas (Registro de visita a grupo y marcación de visita no realizada)
//     - Diagnóstico (Registro de estudiante y Entrega de examen en Matemáticas,
//       Comunicación Escrita y Lectura Crítica)
//     - Motor de consultas (Global/consultas.js)
//
// Si en el futuro se requiere cambiar la cantidad máxima de intentos, los
// tiempos de espera entre reintentos o el comportamiento ante errores, basta
// con modificar el objeto CONFIG_REINTENTOS de este archivo.
// ============================================================================

(function (window, document) {
  'use strict';

  // ==========================================================================
  // 1. CONFIGURACIÓN ÚNICA GLOBAL DE REINTENTOS
  // ==========================================================================

  const CONFIG_REINTENTOS = {
    // Número máximo total de intentos por envío (1 intento inicial + hasta 2 reintentos automáticos)
    maxIntentos: 3,

    // Tiempos base de espera (en ms) antes de cada reintento sucesivo:
    //   - Antes del 2.° intento: 600 ms
    //   - Antes del 3.er intento: 1200 ms
    //   - Si se incrementa maxIntentos: 2400 ms, etc.
    tiemposEsperaMs: [600, 1200, 2400],

    // Base exponencial de respaldo si maxIntentos supera la longitud de tiemposEsperaMs
    baseBackoffMs: 600,

    // Variación aleatoria suave (en ms) para evitar colisiones de red simultáneas
    jitterMs: 220,

    // Límite máximo de espera entre intentos normales (en ms)
    maxEsperaMs: 6000,

    // Límite máximo de espera cuando el servidor envía cabecera Retry-After (en ms)
    maxEsperaRetryAfterMs: 8000,

    // Textos de interfaz durante los reintentos y al agotarse los intentos
    mensajes: {
      reintentandoLoader: function (intentoActual, maxIntentos) {
        return 'Problema de conexión. Reintentando envío (' + intentoActual + ' de ' + maxIntentos + ')...';
      },
      reintentandoBoton: function (intentoActual, maxIntentos) {
        return 'Reintentando (' + intentoActual + '/' + maxIntentos + ')...';
      },
      intentosAgotados: function (maxIntentos, contextoError) {
        const prefijo = contextoError
          ? String(contextoError).trim().replace(/\.$/, '')
          : 'No fue posible enviar el formulario';
        return (
          prefijo +
          ' tras ' + maxIntentos + ' intentos por problemas de conexión o comunicación con el servidor. ' +
          'Tus datos siguen en el formulario; verifica tu conexión a internet e inténtalo de nuevo.'
        );
      }
    }
  };

  // Códigos SQLSTATE / PostgREST deterministas que NUNCA se resuelven reintentando
  const CODIGOS_NO_REINTENTABLES = new Set([
    '23502', // not_null_violation
    '23503', // foreign_key_violation
    '23505', // unique_violation (se concilia mediante verificación anti-duplicados si aplica)
    '23514', // check_violation
    '22P02', // invalid_text_representation
    '22001', // string_data_right_truncation
    '42501', // insufficient_privilege (RLS)
    '42703', // undefined_column
    '42883', // undefined_function
    '42P01', // undefined_table
    'P0001'  // raise_exception (validaciones de negocio en RPC)
  ]);

  // Registro en memoria de envíos actualmente en ejecución (evita doble clic / envíos paralelos)
  const enviosEnCurso = new Set();

  // Registro en memoria de envíos cuyo resultado quedó incierto por caída de red/timeout
  // Permite evitar duplicados incluso si se agotan los 3 intentos y el usuario pulsa "Enviar" de nuevo
  const enviosInciertos = new Map();

  // ==========================================================================
  // 2. CLASIFICACIÓN DE ERRORES TEMPORALES E INCIERTOS
  // ==========================================================================

  /**
   * Determina si un error corresponde a una falla de red, desconexión o timeout.
   * @param {Error|Object} error
   * @returns {boolean}
   */
  function esErrorDeRedOTimeout(error) {
    if (!error) return false;
    if (error.red || error.timeout) return true;
    if (error.name === 'AbortError' && !error.cancelado) return true;

    const mensaje = String(error.message || '');
    return /Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed|ERR_NETWORK|ERR_INTERNET_DISCONNECTED|tiempo de espera|comunicarse con el servidor/i.test(mensaje);
  }

  /**
   * Determina si un error es temporal y amerita activar automáticamente el sistema de reintentos.
   * Nunca reintenta errores de validación (400, 422, P0001), permisos (401, 403, 42501)
   * ni restricciones de integridad (23502, 23503, 23505, 23514).
   *
   * @param {Error|Object} error
   * @param {Object} [opciones]
   * @returns {boolean}
   */
  function esErrorTemporalReintentable(error, opciones) {
    if (!error) return false;
    const op = opciones || {};

    if (error.cancelado || error.sesionExpirada) return false;

    const status = Number(error.status || error.statusCode || 0);
    if (status === 401 || error.codigo === 'SESION_EXPIRADA') return false;

    if (typeof op.esReintentable === 'function') {
      return !!op.esReintentable(error);
    }

    const codigo = String(error.codigo || error.code || '').trim();
    if (codigo && (CODIGOS_NO_REINTENTABLES.has(codigo) || codigo.startsWith('PGRST'))) {
      return false;
    }

    if (esErrorDeRedOTimeout(error) || error.temporal) {
      return true;
    }

    // Códigos HTTP temporales (Timeout, Too Early, Rate Limit, Errores 5xx de servidor/gateway)
    if (status === 408 || status === 425 || status === 429) {
      return true;
    }
    if (status === 500 || status === 502 || status === 503 || status === 504 || status >= 520) {
      return true;
    }

    // Cualquier otro código 4xx es determinista y no debe reintentarse
    return false;
  }

  /**
   * Determina si un error deja incertidumbre sobre si el servidor alcanzó a
   * recibir y guardar la solicitud antes de que se interrumpiera la respuesta.
   *
   * @param {Error|Object} error
   * @returns {boolean}
   */
  function esErrorInciertoServidor(error) {
    if (!error || error.cancelado || error.sesionExpirada) return false;

    const codigo = String(error.codigo || error.code || '').trim();
    if (codigo && (CODIGOS_NO_REINTENTABLES.has(codigo) || codigo.startsWith('PGRST'))) {
      return false;
    }

    if (esErrorDeRedOTimeout(error)) {
      return true;
    }

    const status = Number(error.status || error.statusCode || 0);
    // En 408 o 5xx (500, 502, 503, 504) la transacción pudo haberse confirmado antes de caer el proxy
    if (status === 408 || status === 500 || status === 502 || status === 503 || status === 504 || status >= 520) {
      return true;
    }

    return false;
  }

  // ==========================================================================
  // 3. CÁLCULO DE TIEMPOS DE ESPERA Y PAUSA ASÍNCRONA
  // ==========================================================================

  /**
   * Calcula el tiempo de espera en milisegundos antes del siguiente reintento.
   * Respeta la cabecera Retry-After si el servidor la proporciona y la tabla
   * configurada en CONFIG_REINTENTOS.tiemposEsperaMs.
   *
   * @param {number} indiceReintento - Índice base 0 del reintento (0 = antes del 2.° intento, 1 = antes del 3.er intento)
   * @param {string|number|null} [retryAfterHeader]
   * @param {Object} [opciones]
   * @returns {number} Milisegundos a esperar
   */
  function calcularEsperaReintento(indiceReintento, retryAfterHeader, opciones) {
    const op = opciones || {};
    const idx = Math.max(0, Number(indiceReintento) || 0);

    if (retryAfterHeader !== undefined && retryAfterHeader !== null && retryAfterHeader !== '') {
      const segundos = Number(retryAfterHeader);
      if (Number.isFinite(segundos) && segundos > 0) {
        return Math.min(segundos * 1000, CONFIG_REINTENTOS.maxEsperaRetryAfterMs);
      }
    }

    const listaTiempos = Array.isArray(op.tiemposEsperaMs) && op.tiemposEsperaMs.length > 0
      ? op.tiemposEsperaMs
      : CONFIG_REINTENTOS.tiemposEsperaMs;

    let baseMs;
    if (Array.isArray(listaTiempos) && idx < listaTiempos.length && Number(listaTiempos[idx]) >= 0) {
      baseMs = Number(listaTiempos[idx]);
    } else {
      const base = Number(op.baseBackoffMs) > 0 ? Number(op.baseBackoffMs) : CONFIG_REINTENTOS.baseBackoffMs;
      baseMs = base * Math.pow(2, idx);
    }

    const maxJitter = op.jitterMs !== undefined ? Number(op.jitterMs) : CONFIG_REINTENTOS.jitterMs;
    const jitter = maxJitter > 0 ? Math.floor(Math.random() * maxJitter) : 0;
    const tope = Number(op.maxEsperaMs) > 0 ? Number(op.maxEsperaMs) : CONFIG_REINTENTOS.maxEsperaMs;

    return Math.min(baseMs + jitter, tope);
  }

  /**
   * Pausa asíncrona cancelable mediante AbortSignal.
   *
   * @param {number} ms
   * @param {AbortSignal|null} [signalExterno]
   * @returns {Promise<void>}
   */
  function esperarReintento(ms, signalExterno) {
    return new Promise(function (resolve, reject) {
      if (signalExterno && signalExterno.aborted) {
        const errCancel = new Error('Solicitud cancelada.');
        errCancel.cancelado = true;
        reject(errCancel);
        return;
      }

      const timer = setTimeout(function () {
        if (signalExterno) signalExterno.removeEventListener('abort', alAbortar);
        resolve();
      }, Math.max(0, Number(ms) || 0));

      function alAbortar() {
        clearTimeout(timer);
        const errCancel = new Error('Solicitud cancelada.');
        errCancel.cancelado = true;
        reject(errCancel);
      }

      if (signalExterno) {
        signalExterno.addEventListener('abort', alAbortar, { once: true });
      }
    });
  }

  // ==========================================================================
  // 4. GESTIÓN DE ESTADO INCIERTO PARA EVITAR DUPLICADOS
  // ==========================================================================

  /**
   * Obtiene el registro de un intento incierto previo asociado a una clave de formulario.
   * @param {string} clave
   * @returns {Object|null}
   */
  function obtenerEnvioIncierto(clave) {
    if (!clave) return null;
    return enviosInciertos.get(String(clave)) || null;
  }

  /**
   * Limpia el estado de envío incierto asociado a una clave.
   * @param {string} clave
   */
  function limpiarEnvioIncierto(clave) {
    if (!clave) return;
    enviosInciertos.delete(String(clave));
  }

  /**
   * Registra manualmente un estado de envío incierto para una clave.
   * @param {string} clave
   * @param {Object} info
   */
  function registrarEnvioIncierto(clave, info) {
    if (!clave) return;
    enviosInciertos.set(String(clave), Object.assign({ timestamp: Date.now() }, info || {}));
  }

  /**
   * Obtiene o reutiliza la marca de tiempo ISO Colombia de un envío incierto previo
   * cuando el usuario reintenta enviar exactamente el mismo formulario tras un corte de red.
   * Esto garantiza que la verificación anti-duplicados pueda localizar el registro original.
   *
   * @param {string} claveFormulario - Identificador del formulario (ej: 'pma:formulario')
   * @param {string} huellaDatos - Cadena que identifica los datos clave del formulario actual
   * @param {Function} [generadorFecha] - Función para generar nueva fecha si no hay intento previo
   * @returns {string} Fecha ISO
   */
  function obtenerFechaEnvioIdempotente(claveFormulario, huellaDatos, generadorFecha) {
    const previo = obtenerEnvioIncierto(claveFormulario);
    if (previo && previo.fechaISO && (!huellaDatos || previo.huellaDatos === huellaDatos)) {
      return typeof window.obtenerFechaISOColombia === 'function'
        ? window.obtenerFechaISOColombia(previo.fechaISO)
        : previo.fechaISO;
    }
    if (typeof generadorFecha === 'function') {
      const fechaGenerada = generadorFecha();
      return typeof window.obtenerFechaISOColombia === 'function'
        ? window.obtenerFechaISOColombia(fechaGenerada)
        : fechaGenerada;
    }
    if (typeof window.obtenerFechaISOColombia === 'function') {
      return window.obtenerFechaISOColombia();
    }
    return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 19) + '-05:00';
  }

  // ==========================================================================
  // 5. UTILIDADES DE INTERFAZ Y MENSAJES DE ERROR
  // ==========================================================================

  function _resolverBoton(botonOrId) {
    if (!botonOrId) return null;
    if (botonOrId instanceof Element) return botonOrId;
    if (typeof botonOrId === 'string') return document.getElementById(botonOrId);
    return null;
  }

  function _cambiarEstadoBoton(boton, desactivar, texto, manejarBotonPersonalizado) {
    if (!boton) return;
    if (typeof manejarBotonPersonalizado === 'function') {
      manejarBotonPersonalizado(boton, desactivar, texto);
      return;
    }
    if (typeof window.manejarEstadoBoton === 'function') {
      window.manejarEstadoBoton(boton, desactivar, desactivar ? texto : '', !desactivar ? texto : '');
      return;
    }
    boton.disabled = !!desactivar;
    boton.style.opacity = desactivar ? '0.6' : '1';
    boton.style.cursor = desactivar ? 'not-allowed' : 'pointer';
    if (texto) boton.textContent = texto;
  }

  function _mostrarLoader(contenedorMensaje, texto, mostrarCargandoPersonalizado) {
    if (!contenedorMensaje) return;
    if (typeof mostrarCargandoPersonalizado === 'function') {
      mostrarCargandoPersonalizado(contenedorMensaje, texto);
      return;
    }
    if (typeof window.mostrarCargando === 'function') {
      window.mostrarCargando(contenedorMensaje, texto);
    }
  }

  function _actualizarTextoLoader(contenedorMensaje, texto, actualizarCargandoPersonalizado) {
    if (!contenedorMensaje) return;
    if (typeof actualizarCargandoPersonalizado === 'function') {
      actualizarCargandoPersonalizado(contenedorMensaje, texto);
      return;
    }
    if (typeof window.actualizarMensajeCargando === 'function') {
      window.actualizarMensajeCargando(contenedorMensaje, texto);
    }
  }

  function _mostrarMensajeError(contenedorMensaje, mensaje, mostrarMensajePersonalizado) {
    if (!contenedorMensaje) return;
    if (typeof mostrarMensajePersonalizado === 'function') {
      mostrarMensajePersonalizado(contenedorMensaje, mensaje, 'error');
      return;
    }
    if (typeof window.mostrarMensaje === 'function') {
      window.mostrarMensaje(contenedorMensaje, mensaje, 'error');
    }
  }

  /**
   * Construye un mensaje claro para el usuario cuando fallan los intentos.
   * Si el fallo fue por causas temporales y se agotaron todos los intentos,
   * informa claramente que se realizaron los 3 intentos y que sus datos siguen intactos.
   *
   * @param {Error|Object} error
   * @param {Object} meta
   * @returns {string}
   */
  function construirMensajeErrorEnvio(error, meta) {
    const m = meta || {};
    const intentosRealizados = Number(m.intentosRealizados) || 1;
    const maxIntentos = Number(m.maxIntentos) || CONFIG_REINTENTOS.maxIntentos;
    const contextoError = m.contextoError || 'No se pudo enviar el formulario';

    if (m.agotadosPorErrorTemporal && intentosRealizados >= maxIntentos) {
      return CONFIG_REINTENTOS.mensajes.intentosAgotados(maxIntentos, contextoError);
    }

    if (typeof m.interpretarError === 'function') {
      return m.interpretarError(error, contextoError);
    }

    if (window.ConsultasPublicas && typeof window.ConsultasPublicas.interpretarError === 'function') {
      return window.ConsultasPublicas.interpretarError(error, contextoError);
    }

    if (window.SupabaseMotor && typeof window.SupabaseMotor.interpretarError === 'function') {
      return window.SupabaseMotor.interpretarError(error, contextoError);
    }

    const msg = error && error.message ? String(error.message).trim() : '';
    return msg ? (contextoError + ': ' + msg) : (contextoError + '. Intenta nuevamente.');
  }

  // ==========================================================================
  // 6. EJECUTOR GLOBAL DE ENVÍO DE FORMULARIOS CON REINTENTOS
  // ==========================================================================

  /**
   * Ejecuta el envío de cualquier formulario del proyecto con soporte automático
   * de reintentos (máximo CONFIG_REINTENTOS.maxIntentos = 3 intentos), tiempos de
   * espera progresivos, preservación de los datos del formulario en caso de fallo
   * y prevención de envíos duplicados cuando el servidor procesó un intento previo
   * cuya respuesta no llegó al navegador.
   *
   * @param {Object} opciones
   * @param {Function} opciones.enviar - Función async `(ctx) => Promise<*>` que realiza el envío.
   * @param {string} [opciones.clave] - Identificador único del formulario para bloquear doble envío y rastrear intentos inciertos.
   * @param {Object} [opciones.datos] - Payload que se está enviando (útil para auditoría y verificación).
   * @param {string} [opciones.huellaDatos] - Huella opcional de los datos para asociar reintentos manuales.
   * @param {string} [opciones.fechaISO] - Marca de tiempo ISO asociada al envío.
   * @param {Function} [opciones.verificarYaRegistrado] - Función async `(ctx) => Promise<*|null|boolean>` que consulta en Supabase si un intento incierto anterior ya quedó guardado.
   * @param {Function} [opciones.conciliarError] - Función async `(error, ctx) => Promise<{exito: boolean, resultado?: *}|null>` para conciliar errores específicos.
   * @param {Element|string} [opciones.boton] - Botón de envío o su ID en el DOM.
   * @param {string} [opciones.textoBotonEnviando='Enviando...'] - Texto del botón durante el primer intento.
   * @param {string} [opciones.textoBotonOriginal] - Texto original del botón al restaurarlo tras error.
   * @param {boolean} [opciones.actualizarTextoBotonEnReintento=true] - Si debe mostrar "Reintentando (2/3)..." en el botón.
   * @param {Element|string} [opciones.contenedorMensaje] - Contenedor o ID donde mostrar el loader y los mensajes de error.
   * @param {string} [opciones.textoCargando] - Mensaje inicial del indicador de carga.
   * @param {boolean} [opciones.mostrarLoader=true] - Si debe invocar mostrarCargando automáticamente.
   * @param {boolean} [opciones.mostrarErrorAutomatico=true] - Si debe mostrar el mensaje de error automáticamente al fallar.
   * @param {string} [opciones.contextoError='No se pudo enviar el formulario'] - Prefijo descriptivo en caso de error.
   * @param {number} [opciones.maxIntentos] - Permite sobrescribir puntualmente el máximo de intentos (por defecto usa CONFIG_REINTENTOS.maxIntentos).
   * @param {boolean} [opciones.huboIntentoInciertoInicial=false] - Indica si ya existía incertidumbre antes de iniciar esta llamada.
   * @param {Function} [opciones.alReintentar] - Callback `({ intento, maxIntentos, esperaMs, error })` antes de cada espera.
   * @param {Function} [opciones.alExito] - Callback async `(resultado, meta)` ejecutado inmediatamente al tener éxito.
   * @param {Function} [opciones.alErrorFinal] - Callback async `(error, meta)` ejecutado si fracasan todos los intentos.
   * @param {boolean} [opciones.lanzarError=false] - Si es `true`, relanza la excepción tras agotar los intentos.
   * @returns {Promise<{exito: boolean, resultado?: *, error?: Error, mensaje?: string, intentos: number, recuperadoDeIntentoPrevio?: boolean, enCurso?: boolean}>}
   */
  async function ejecutarEnvioConReintentos(opciones) {
    const op = opciones || {};
    if (typeof op.enviar !== 'function') {
      throw new Error('ejecutarEnvioConReintentos requiere una función "enviar".');
    }

    const clave = op.clave ? String(op.clave).trim() : '';
    if (clave && enviosEnCurso.has(clave)) {
      return { exito: false, enCurso: true, intentos: 0 };
    }

    const maxIntentos = Math.max(
      1,
      Number(op.maxIntentos) > 0 ? Number(op.maxIntentos) : CONFIG_REINTENTOS.maxIntentos
    );

    const boton = _resolverBoton(op.boton);
    const textoBotonOriginal = op.textoBotonOriginal || (boton ? boton.textContent : '');
    const textoBotonEnviando = op.textoBotonEnviando || 'Enviando...';
    const contenedorMensaje = op.contenedorMensaje || null;

    const previoIncierto = clave ? obtenerEnvioIncierto(clave) : null;
    const mismaHuella = !op.huellaDatos || !previoIncierto || previoIncierto.huellaDatos === op.huellaDatos;
    let huboIntentoIncierto = !!op.huboIntentoInciertoInicial || !!(previoIncierto && mismaHuella);

    if (clave) {
      enviosEnCurso.add(clave);
    }

    _cambiarEstadoBoton(boton, true, textoBotonEnviando, op.manejarBotonFn);

    if (op.mostrarLoader !== false && contenedorMensaje) {
      _mostrarLoader(contenedorMensaje, op.textoCargando, op.mostrarCargandoFn);
    }

    let ultimoError = null;
    let intentosRealizados = 0;
    let agotadosPorErrorTemporal = false;

    try {
      for (let intento = 1; intento <= maxIntentos; intento++) {
        intentosRealizados = intento;

        const contextoIntento = {
          intento: intento,
          maxIntentos: maxIntentos,
          huboIntentoIncierto: huboIntentoIncierto,
          datos: op.datos,
          envioInciertoPrevio: previoIncierto
        };

        // ------------------------------------------------------------------
        // PASO A: Prevención de duplicados antes de reenviar
        // Si un intento anterior falló por caída de conexión/timeout, primero
        // verificamos en Supabase si el servidor sí alcanzó a guardar los datos.
        // ------------------------------------------------------------------
        if (huboIntentoIncierto && typeof op.verificarYaRegistrado === 'function') {
          try {
            const registroExistente = await op.verificarYaRegistrado(contextoIntento);
            if (registroExistente !== null && registroExistente !== undefined && registroExistente !== false) {
              if (clave) limpiarEnvioIncierto(clave);
              const metaRecuperado = {
                intento: intento,
                intentos: intento,
                maxIntentos: maxIntentos,
                recuperadoDeIntentoPrevio: true
              };
              if (typeof op.alExito === 'function') {
                await op.alExito(registroExistente, metaRecuperado);
              }
              return {
                exito: true,
                resultado: registroExistente,
                intentos: intento,
                recuperadoDeIntentoPrevio: true
              };
            }
          } catch (errVerificacionPrevia) {
            // Si la consulta de verificación también falla por red, continuamos
            // con el ciclo normal de reintentos sin perder el estado incierto.
            console.warn('[Reintentos] No fue posible verificar intento previo antes del intento ' + intento + ':', errVerificacionPrevia);
          }
        }

        // ------------------------------------------------------------------
        // PASO B: Proceso normal de envío
        // ------------------------------------------------------------------
        try {
          const resultado = await op.enviar(contextoIntento);

          if (clave) limpiarEnvioIncierto(clave);

          const metaExito = {
            intento: intento,
            intentos: intento,
            maxIntentos: maxIntentos,
            recuperadoDeIntentoPrevio: false
          };

          if (typeof op.alExito === 'function') {
            await op.alExito(resultado, metaExito);
          }

          return {
            exito: true,
            resultado: resultado,
            intentos: intento,
            recuperadoDeIntentoPrevio: false
          };
        } catch (errorIntento) {
          ultimoError = errorIntento;

          // 1. ¿El formulario define una conciliación específica de error?
          if (typeof op.conciliarError === 'function') {
            try {
              const conciliado = await op.conciliarError(errorIntento, contextoIntento);
              if (conciliado && conciliado.exito) {
                if (clave) limpiarEnvioIncierto(clave);
                const metaConciliado = {
                  intento: intento,
                  intentos: intento,
                  maxIntentos: maxIntentos,
                  recuperadoDeIntentoPrevio: true,
                  porConciliacion: true
                };
                if (typeof op.alExito === 'function') {
                  await op.alExito(conciliado.resultado, metaConciliado);
                }
                return {
                  exito: true,
                  resultado: conciliado.resultado,
                  intentos: intento,
                  recuperadoDeIntentoPrevio: true
                };
              }
            } catch (errConciliacion) {
              ultimoError = errConciliacion;
            }
          }

          // 2. Si ocurre conflicto único (23505) y tenemos verificador, comprobar si
          //    el registro ya está guardado en el servidor para no fallar ni duplicar.
          const codigoError = String((ultimoError && (ultimoError.codigo || ultimoError.code)) || '').trim();
          if (codigoError === '23505' && typeof op.verificarYaRegistrado === 'function') {
            try {
              const existentePorUnico = await op.verificarYaRegistrado(
                Object.assign({}, contextoIntento, { porConflictoUnico: true })
              );
              if (existentePorUnico !== null && existentePorUnico !== undefined && existentePorUnico !== false) {
                if (clave) limpiarEnvioIncierto(clave);
                const metaUnico = {
                  intento: intento,
                  intentos: intento,
                  maxIntentos: maxIntentos,
                  recuperadoDeIntentoPrevio: true,
                  porConflictoUnico: true
                };
                if (typeof op.alExito === 'function') {
                  await op.alExito(existentePorUnico, metaUnico);
                }
                return {
                  exito: true,
                  resultado: existentePorUnico,
                  intentos: intento,
                  recuperadoDeIntentoPrevio: true,
                  porConflictoUnico: true
                };
              }
            } catch (errVerifUnico) {
              console.warn('[Reintentos] Error verificando registro tras código 23505:', errVerifUnico);
            }
          }

          // 3. Registrar incertidumbre si el error fue de red/timeout/5xx
          if (esErrorInciertoServidor(ultimoError)) {
            huboIntentoIncierto = true;
            if (clave) {
              const fechaBruta = op.fechaISO || (op.datos && (op.datos.fecha || op.datos.fecha_hora || op.datos.fecha_realizacion)) || null;
              const fechaNormalizada = fechaBruta && typeof window.obtenerFechaISOColombia === 'function'
                ? window.obtenerFechaISOColombia(fechaBruta)
                : fechaBruta;
              registrarEnvioIncierto(clave, {
                datos: op.datos,
                huellaDatos: op.huellaDatos || null,
                fechaISO: fechaNormalizada,
                intentoFallido: intento
              });
            }
          }

          // 4. Evaluar si corresponde activar un nuevo reintento automático
          const esTemporal = esErrorTemporalReintentable(ultimoError, op);
          if (esTemporal && intento < maxIntentos) {
            const siguienteIntento = intento + 1;
            const esperaMs = calcularEsperaReintento(intento - 1, ultimoError && ultimoError.retryAfter, op);

            if (op.actualizarTextoBotonEnReintento !== false && boton) {
              _cambiarEstadoBoton(
                boton,
                true,
                CONFIG_REINTENTOS.mensajes.reintentandoBoton(siguienteIntento, maxIntentos),
                op.manejarBotonFn
              );
            }

            if (op.mostrarLoader !== false && contenedorMensaje) {
              const textoReintento = typeof op.mensajeReintento === 'function'
                ? op.mensajeReintento(siguienteIntento, maxIntentos)
                : CONFIG_REINTENTOS.mensajes.reintentandoLoader(siguienteIntento, maxIntentos);
              _actualizarTextoLoader(
                contenedorMensaje,
                textoReintento,
                op.actualizarCargandoFn
              );
            }

            if (typeof op.alReintentar === 'function') {
              try {
                op.alReintentar({
                  intento: siguienteIntento,
                  maxIntentos: maxIntentos,
                  esperaMs: esperaMs,
                  error: ultimoError
                });
              } catch (e) {}
            }

            await esperarReintento(esperaMs, op.signal);
            continue;
          }

          agotadosPorErrorTemporal = esTemporal && intento >= maxIntentos;
          break;
        }
      }

      // --------------------------------------------------------------------
      // PASO C: Verificación final de rescate si el último intento fue incierto
      // --------------------------------------------------------------------
      if (huboIntentoIncierto && typeof op.verificarYaRegistrado === 'function') {
        try {
          const recuperadoFinal = await op.verificarYaRegistrado({
            intento: intentosRealizados,
            maxIntentos: maxIntentos,
            huboIntentoIncierto: true,
            datos: op.datos,
            verificacionFinal: true
          });
          if (recuperadoFinal !== null && recuperadoFinal !== undefined && recuperadoFinal !== false) {
            if (clave) limpiarEnvioIncierto(clave);
            const metaFinal = {
              intento: intentosRealizados,
              intentos: intentosRealizados,
              maxIntentos: maxIntentos,
              recuperadoDeIntentoPrevio: true
            };
            if (typeof op.alExito === 'function') {
              await op.alExito(recuperadoFinal, metaFinal);
            }
            return {
              exito: true,
              resultado: recuperadoFinal,
              intentos: intentosRealizados,
              recuperadoDeIntentoPrevio: true
            };
          }
        } catch (errVerifFinal) {
          // Si sigue sin red al finalizar los 3 intentos, procedemos a informar al usuario
        }
      }

      // --------------------------------------------------------------------
      // PASO D: Restaurar botón, conservar formulario y mostrar mensaje claro
      // --------------------------------------------------------------------
      _cambiarEstadoBoton(boton, false, textoBotonOriginal, op.manejarBotonFn);

      const mensajeError = construirMensajeErrorEnvio(ultimoError, {
        intentosRealizados: intentosRealizados,
        maxIntentos: maxIntentos,
        agotadosPorErrorTemporal: agotadosPorErrorTemporal,
        contextoError: op.contextoError,
        interpretarError: op.interpretarError
      });

      if (op.mostrarErrorAutomatico !== false && contenedorMensaje) {
        _mostrarMensajeError(contenedorMensaje, mensajeError, op.mostrarMensajeFn);
      }

      const metaError = {
        intentos: intentosRealizados,
        intentosRealizados: intentosRealizados,
        maxIntentos: maxIntentos,
        agotadosPorErrorTemporal: agotadosPorErrorTemporal,
        huboIntentoIncierto: huboIntentoIncierto,
        mensaje: mensajeError
      };

      if (typeof op.alErrorFinal === 'function') {
        await op.alErrorFinal(ultimoError, metaError);
      }

      if (op.lanzarError && ultimoError) {
        ultimoError.mensajeUsuario = mensajeError;
        ultimoError.intentosRealizados = intentosRealizados;
        ultimoError.agotadosPorErrorTemporal = agotadosPorErrorTemporal;
        ultimoError.huboIntentoIncierto = huboIntentoIncierto;
        throw ultimoError;
      }

      return {
        exito: false,
        error: ultimoError,
        mensaje: mensajeError,
        intentos: intentosRealizados,
        agotadosPorErrorTemporal: agotadosPorErrorTemporal,
        huboIntentoIncierto: huboIntentoIncierto
      };
    } finally {
      if (clave) {
        enviosEnCurso.delete(clave);
      }
    }
  }

  // ==========================================================================
  // 7. CONFIGURACIÓN DINÁMICA Y API PÚBLICA GLOBAL
  // ==========================================================================

  /**
   * Permite actualizar en caliente la configuración global de reintentos.
   * @param {Object} nuevaConfig
   */
  function configurarReintentosGlobales(nuevaConfig) {
    if (!nuevaConfig || typeof nuevaConfig !== 'object') return obtenerConfiguracionReintentos();

    if (Number(nuevaConfig.maxIntentos) >= 1) {
      CONFIG_REINTENTOS.maxIntentos = Math.floor(Number(nuevaConfig.maxIntentos));
    }
    if (Array.isArray(nuevaConfig.tiemposEsperaMs) && nuevaConfig.tiemposEsperaMs.length > 0) {
      CONFIG_REINTENTOS.tiemposEsperaMs = nuevaConfig.tiemposEsperaMs.map(function (n) {
        return Math.max(0, Number(n) || 0);
      });
    }
    if (Number(nuevaConfig.baseBackoffMs) > 0) {
      CONFIG_REINTENTOS.baseBackoffMs = Number(nuevaConfig.baseBackoffMs);
    }
    if (nuevaConfig.jitterMs !== undefined && Number(nuevaConfig.jitterMs) >= 0) {
      CONFIG_REINTENTOS.jitterMs = Number(nuevaConfig.jitterMs);
    }
    if (Number(nuevaConfig.maxEsperaMs) > 0) {
      CONFIG_REINTENTOS.maxEsperaMs = Number(nuevaConfig.maxEsperaMs);
    }
    if (Number(nuevaConfig.maxEsperaRetryAfterMs) > 0) {
      CONFIG_REINTENTOS.maxEsperaRetryAfterMs = Number(nuevaConfig.maxEsperaRetryAfterMs);
    }
    if (nuevaConfig.mensajes && typeof nuevaConfig.mensajes === 'object') {
      Object.assign(CONFIG_REINTENTOS.mensajes, nuevaConfig.mensajes);
    }
    return obtenerConfiguracionReintentos();
  }

  function obtenerConfiguracionReintentos() {
    return {
      maxIntentos: CONFIG_REINTENTOS.maxIntentos,
      tiemposEsperaMs: CONFIG_REINTENTOS.tiemposEsperaMs.slice(),
      baseBackoffMs: CONFIG_REINTENTOS.baseBackoffMs,
      jitterMs: CONFIG_REINTENTOS.jitterMs,
      maxEsperaMs: CONFIG_REINTENTOS.maxEsperaMs,
      maxEsperaRetryAfterMs: CONFIG_REINTENTOS.maxEsperaRetryAfterMs
    };
  }

  function obtenerMaxIntentos() {
    return CONFIG_REINTENTOS.maxIntentos;
  }

  const ReintentosEnvio = Object.freeze({
    CONFIG: CONFIG_REINTENTOS,
    CODIGOS_NO_REINTENTABLES: CODIGOS_NO_REINTENTABLES,
    ejecutar: ejecutarEnvioConReintentos,
    ejecutarEnvioConReintentos: ejecutarEnvioConReintentos,
    esErrorTemporalReintentable: esErrorTemporalReintentable,
    esErrorInciertoServidor: esErrorInciertoServidor,
    esErrorDeRedOTimeout: esErrorDeRedOTimeout,
    calcularEsperaReintento: calcularEsperaReintento,
    esperarReintento: esperarReintento,
    construirMensajeErrorEnvio: construirMensajeErrorEnvio,
    obtenerEnvioIncierto: obtenerEnvioIncierto,
    registrarEnvioIncierto: registrarEnvioIncierto,
    limpiarEnvioIncierto: limpiarEnvioIncierto,
    obtenerFechaEnvioIdempotente: obtenerFechaEnvioIdempotente,
    obtenerConfiguracion: obtenerConfiguracionReintentos,
    obtenerMaxIntentos: obtenerMaxIntentos,
    configurar: configurarReintentosGlobales
  });

  // Exposición global para uso directo desde cualquier página del proyecto
  window.ReintentosEnvio = ReintentosEnvio;
  window.ejecutarEnvioConReintentos = ejecutarEnvioConReintentos;
  window.esErrorTemporalReintentable = esErrorTemporalReintentable;
  window.calcularEsperaReintento = calcularEsperaReintento;
  window.obtenerFechaEnvioIdempotente = obtenerFechaEnvioIdempotente;
  window.limpiarEnvioIncierto = limpiarEnvioIncierto;
  window.obtenerEnvioIncierto = obtenerEnvioIncierto;
  window.registrarEnvioIncierto = registrarEnvioIncierto;
  window.configurarReintentosGlobales = configurarReintentosGlobales;
})(window, document);
