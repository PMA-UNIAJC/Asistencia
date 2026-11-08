// ============================================================================
// Admin/Diagnosticos/supabase.js
// Capa de datos, RPCs administrativas y gestión segura de imágenes en Storage
// para el esquema "diagnosticos" y el bucket público "IMG".
//
// Delega todas las consultas y RPCs de base de datos en window.ConsultasAdmin
// y utiliza AdminAuth.obtenerClienteAuth() exclusivamente para operaciones
// binarias autenticadas en Supabase Storage.
// ============================================================================

(function (window) {
  'use strict';

  const ESQUEMA_DIAGNOSTICOS = 'diagnosticos';
  const BUCKET_IMAGENES = 'IMG';
  const CARPETA_BASE_STORAGE = 'DIAGNOSTICOS';
  const TAMANO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024; // 5 MB

  // Misma organización exacta que Diagnostico/{Matematicas,Comunicacion,Lectura}/script.js
  const DIAGNOSTICOS_CONFIG = Object.freeze({
    MATEMATICAS: Object.freeze({
      codigo: 'MATEMATICAS',
      titulo: 'Matemáticas',
      tablaPreguntas: 'preguntas_matematicas',
      carpetaStorage: 'DIAGNOSTICOS/MATEMATICAS',
      baseUrlImagenes: SUPABASE_URL + '/storage/v1/object/public/IMG/DIAGNOSTICOS/MATEMATICAS/'
    }),
    COMUNICACION: Object.freeze({
      codigo: 'COMUNICACION',
      titulo: 'Comunicación Escrita',
      tablaPreguntas: 'preguntas_comunicacion',
      carpetaStorage: 'DIAGNOSTICOS/COMUNICACION',
      baseUrlImagenes: SUPABASE_URL + '/storage/v1/object/public/IMG/DIAGNOSTICOS/COMUNICACION/'
    }),
    LECTURA: Object.freeze({
      codigo: 'LECTURA',
      titulo: 'Lectura Crítica',
      tablaPreguntas: 'preguntas_lectura',
      carpetaStorage: 'DIAGNOSTICOS/LECTURA',
      baseUrlImagenes: SUPABASE_URL + '/storage/v1/object/public/IMG/DIAGNOSTICOS/LECTURA/'
    })
  });

  const MIME_A_EXTENSION = Object.freeze({
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png'
  });

  const EXTENSIONES_VALIDAS = Object.freeze(['jpg', 'jpeg', 'png']);

  // Cliente autenticado compartido con el resto del módulo Admin (AdminAuth)
  const clienteAuth = AdminAuth.obtenerClienteAuth();

  // =========================================================
  // 1. UTILIDADES DE NOMBRES DE ARCHIVO Y VALIDACIÓN DE IMAGEN
  // =========================================================

  function extraerExtensionImagen(nombreArchivo, mimeType) {
    const limpio = String(nombreArchivo || '').trim();
    const punto = limpio.lastIndexOf('.');
    if (punto > 0 && punto < limpio.length - 1) {
      const ext = limpio.slice(punto + 1).toLowerCase();
      if (EXTENSIONES_VALIDAS.indexOf(ext) !== -1) {
        return ext;
      }
      return '';
    }
    const mime = String(mimeType || '').toLowerCase();
    return MIME_A_EXTENSION[mime] || '';
  }

  function extraerBaseNombreImagen(nombreArchivo) {
    const limpio = String(nombreArchivo || '').trim();
    if (!limpio) return '';
    const punto = limpio.lastIndexOf('.');
    if (punto > 0) {
      const posibleExt = limpio.slice(punto + 1).toLowerCase();
      if (EXTENSIONES_VALIDAS.indexOf(posibleExt) !== -1) {
        return limpio.slice(0, punto);
      }
    }
    return limpio;
  }

  // Convierte el campo "Nombre de imagen" en un nombre de archivo seguro y válido
  // (sin tildes, espacios, caracteres especiales ni rutas relativas).
  function sanitizarNombreImagen(valor) {
    const sinExtension = extraerBaseNombreImagen(valor);
    return sinExtension
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_-]+|[_-]+$/g, '')
      .slice(0, 80);
  }

  function construirNombreArchivoImagen(nombreBaseUsuario, extension) {
    const base = sanitizarNombreImagen(nombreBaseUsuario);
    const ext = String(extension || '').toLowerCase().replace(/^\./, '');
    if (!base || EXTENSIONES_VALIDAS.indexOf(ext) === -1) return '';
    return base + '.' + ext;
  }

  function validarArchivoImagen(archivo) {
    if (!archivo) {
      return { valido: false, mensaje: 'No se seleccionó ningún archivo de imagen.' };
    }
    const ext = extraerExtensionImagen(archivo.name, archivo.type);
    const mime = String(archivo.type || '').toLowerCase();
    const mimeCompatible =
      !mime ||
      ((ext === 'jpg' || ext === 'jpeg') && (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/pjpeg')) ||
      (ext === 'png' && (mime === 'image/png' || mime === 'image/x-png'));

    if (!ext || !mimeCompatible) {
      return {
        valido: false,
        mensaje: 'Formato de imagen no permitido. Solo se aceptan imágenes JPG, JPEG o PNG.'
      };
    }
    if (archivo.size <= 0) {
      return { valido: false, mensaje: 'El archivo seleccionado está vacío (0 bytes).' };
    }
    if (archivo.size > TAMANO_MAXIMO_IMAGEN_BYTES) {
      const mb = (archivo.size / (1024 * 1024)).toFixed(1);
      return {
        valido: false,
        mensaje: 'La imagen pesa ' + mb + ' MB y supera el límite máximo permitido de 5 MB.'
      };
    }
    return { valido: true, extension: ext };
  }

  function obtenerRutaStorage(prueba, nombreArchivo) {
    const cfg = DIAGNOSTICOS_CONFIG[prueba];
    if (!cfg) throw new Error('Diagnóstico no válido: ' + prueba);
    const limpio = String(nombreArchivo || '').trim();
    if (!limpio || /[/\\]|\.\./.test(limpio)) {
      throw new Error('Nombre de archivo de imagen no válido.');
    }
    return cfg.carpetaStorage + '/' + limpio;
  }

  function obtenerUrlPublicaImagen(prueba, nombreArchivo, bustCache) {
    const cfg = DIAGNOSTICOS_CONFIG[prueba];
    const limpio = String(nombreArchivo || '').trim();
    if (!cfg || !limpio) return '';
    const url = cfg.baseUrlImagenes + encodeURIComponent(limpio);
    return bustCache ? url + '?v=' + bustCache : url;
  }

  // =========================================================
  // 2. MANEJO DE ERRORES Y SESIÓN AUTENTICADA
  // =========================================================

  class ErrorDiagnosticoAdmin extends Error {
    constructor(mensaje, opciones) {
      super(mensaje);
      const op = opciones || {};
      this.name = 'ErrorDiagnosticoAdmin';
      this.codigo = op.codigo || '';
      this.status = op.status || 0;
      this.red = !!op.red;
      this.origen = op.origen || 'bd';
    }
  }

  const TTL_CACHE_DIAGNOSTICO_ADMIN_MS = 5 * 60 * 1000;

  function interpretarErrorDiagnostico(error, contexto) {
    const prefijo = contexto ? contexto + ': ' : '';
    if (!error) return prefijo + 'Ocurrió un error inesperado.';

    if (error.timeout) {
      return prefijo + 'El servidor tardó demasiado en responder. Verifica tu conexión a internet e inténtalo de nuevo.';
    }

    if (error.red || /Failed to fetch|NetworkError|Load failed/i.test(String(error.message || ''))) {
      return prefijo + 'No fue posible conectar con Supabase. Verifica tu conexión a internet e inténtalo de nuevo.';
    }

    const codigo = String(error.codigo || error.code || '');
    const status = Number(error.status || error.statusCode || 0);
    const msg = String(error.message || '');

    if (error.sesionExpirada || codigo === 'SESION_EXPIRADA' || status === 401) {
      return 'Tu sesión de administrador expiró. Vuelve a iniciar sesión desde el Panel de Administración.';
    }
    if (codigo === 'PGRST202' || codigo === '42883') {
      return (
        'Las funciones RPC administrativas aún no existen en la base de datos. ' +
        'Ejecuta primero el script SQL de administración de diagnósticos en el SQL Editor de Supabase y recarga esta página.'
      );
    }
    if (error.origen === 'storage') {
      if (status === 409 || /Duplicate|already exists/i.test(msg)) {
        return (
          'Ya existe un archivo con ese nombre en la carpeta de Storage de este diagnóstico. ' +
          'Cambia el "Nombre de imagen" para evitar sobrescribir otra imagen.'
        );
      }
      if (status === 403 || /row-level security|new row violates/i.test(msg)) {
        return (
          'Supabase Storage rechazó la operación por permisos (RLS). ' +
          'Asegúrate de haber ejecutado las políticas de Storage para administradores en el bucket IMG.'
        );
      }
      return prefijo + (msg || 'Error al gestionar el archivo en Supabase Storage.');
    }

    if (codigo === '23505') {
      return prefijo + 'Ya existe una pregunta con ese mismo número en este diagnóstico. Elige otro número.';
    }
    if (codigo === '23503') {
      return prefijo + 'No se puede completar la operación porque existen registros relacionados en la base de datos.';
    }
    if (codigo === 'P0001') {
      return msg;
    }

    return prefijo + (msg || 'Error del servidor al procesar la solicitud.');
  }

  async function obtenerTokenAdmin() {
    try {
      return await AdminAuth.obtenerToken();
    } catch (e) {
      throw new ErrorDiagnosticoAdmin('Sesión de administrador no activa.', {
        codigo: 'SESION_EXPIRADA',
        status: 401
      });
    }
  }

  async function llamarRpcDiagnosticos(nombreRpc, parametros, opcionesRpc) {
    const op = opcionesRpc || {};
    return await ConsultasAdmin.rpc(
      nombreRpc,
      parametros || {},
      Object.assign({ esquema: ESQUEMA_DIAGNOSTICOS }, op)
    );
  }

  // =========================================================
  // 3. OPERACIONES EN SUPABASE STORAGE (BUCKET "IMG")
  // =========================================================

  async function subirImagenStorage(prueba, nombreArchivo, archivo, sobrescribir) {
    await obtenerTokenAdmin();
    const ruta = obtenerRutaStorage(prueba, nombreArchivo);
    const { error } = await clienteAuth.storage.from(BUCKET_IMAGENES).upload(ruta, archivo, {
      cacheControl: '60',
      upsert: !!sobrescribir,
      contentType: archivo.type || undefined
    });
    if (error) {
      throw new ErrorDiagnosticoAdmin(error.message || 'No fue posible subir la imagen al Storage.', {
        status: error.statusCode || error.status || 400,
        codigo: error.error || '',
        origen: 'storage'
      });
    }
    return ruta;
  }

  async function copiarImagenStorage(prueba, nombreOrigen, nombreDestino) {
    await obtenerTokenAdmin();
    const rutaOrigen = obtenerRutaStorage(prueba, nombreOrigen);
    const rutaDestino = obtenerRutaStorage(prueba, nombreDestino);
    const { error } = await clienteAuth.storage.from(BUCKET_IMAGENES).copy(rutaOrigen, rutaDestino);
    if (error) {
      throw new ErrorDiagnosticoAdmin(error.message || 'No fue posible renombrar la imagen en el Storage.', {
        status: error.statusCode || error.status || 400,
        codigo: error.error || '',
        origen: 'storage'
      });
    }
    return rutaDestino;
  }

  async function eliminarImagenStorage(prueba, nombreArchivo) {
    if (!nombreArchivo) return { ok: true };
    try {
      await obtenerTokenAdmin();
      const ruta = obtenerRutaStorage(prueba, nombreArchivo);
      const { error } = await clienteAuth.storage.from(BUCKET_IMAGENES).remove([ruta]);
      if (error) {
        console.warn('[Storage] No se pudo eliminar el archivo anterior:', ruta, error);
        return { ok: false, mensaje: error.message || 'No se pudo eliminar el archivo anterior en Storage.' };
      }
      return { ok: true };
    } catch (err) {
      console.warn('[Storage] Excepción limpiando archivo anterior:', err);
      return { ok: false, mensaje: err.message || 'Error al limpiar archivo anterior en Storage.' };
    }
  }

  // =========================================================
  // 4. COORDINACIÓN SEGURA: STORAGE + BASE DE DATOS (CON ROLLBACK)
  // =========================================================
  // Garantiza que nunca queden referencias rotas en la BD ni archivos
  // huérfanos en Storage cuando falla cualquiera de los pasos.
  async function ejecutarGuardadoConImagen(opciones) {
    const prueba = opciones.prueba;
    const imagenOriginal = opciones.imagenOriginal ? String(opciones.imagenOriginal).trim() : null;
    const estadoImagen = opciones.estadoImagen || {}; // { archivoNuevo, quitarImagen, nombreFinal }
    const guardarEnBD = opciones.guardarEnBD;         // async (nombreImagenFinal) => resultadoRpc

    const archivoNuevo = estadoImagen.archivoNuevo || null;
    const quitarImagen = !!estadoImagen.quitarImagen;
    const nombreFinal = quitarImagen ? null : (estadoImagen.nombreFinal || null);

    // Caso 1: Se seleccionó un nuevo archivo y su nombre es distinto al original (o no había imagen previa).
    // Orden seguro: 1) Subir nuevo archivo (upsert:false) → 2) Guardar en BD (si falla, borrar archivo recién subido) → 3) Borrar anterior si quedó libre.
    if (archivoNuevo && nombreFinal && nombreFinal !== imagenOriginal) {
      await subirImagenStorage(prueba, nombreFinal, archivoNuevo, false);
      let resultadoBD;
      try {
        resultadoBD = await guardarEnBD(nombreFinal);
      } catch (errorBD) {
        await eliminarImagenStorage(prueba, nombreFinal);
        throw errorBD;
      }

      let advertenciaStorage = null;
      if (resultadoBD && resultadoBD.imagen_eliminar) {
        const limpieza = await eliminarImagenStorage(prueba, resultadoBD.imagen_eliminar);
        if (!limpieza.ok) {
          advertenciaStorage =
            'El registro se guardó, pero no se pudo eliminar la imagen anterior ("' +
            resultadoBD.imagen_eliminar + '") del Storage.';
        }
      }
      return { resultado: resultadoBD, advertenciaStorage: advertenciaStorage };
    }

    // Caso 2: Se seleccionó un nuevo archivo conservando exactamente el mismo nombre que ya tenía este registro.
    // Orden seguro: 1) Validar y guardar cambios en BD primero → 2) Reemplazar archivo en Storage (upsert:true).
    if (archivoNuevo && nombreFinal && nombreFinal === imagenOriginal) {
      const resultadoBD = await guardarEnBD(nombreFinal);
      await subirImagenStorage(prueba, nombreFinal, archivoNuevo, true);
      return { resultado: resultadoBD, advertenciaStorage: null };
    }

    // Caso 3: No se seleccionó archivo nuevo, pero se cambió el "Nombre de imagen" de una imagen ya existente.
    // Orden seguro: 1) Copiar imagen al nuevo nombre en Storage → 2) Actualizar BD (si falla, borrar copia) → 3) Borrar anterior si quedó libre.
    if (!archivoNuevo && !quitarImagen && imagenOriginal && nombreFinal && nombreFinal !== imagenOriginal) {
      await copiarImagenStorage(prueba, imagenOriginal, nombreFinal);
      let resultadoBD;
      try {
        resultadoBD = await guardarEnBD(nombreFinal);
      } catch (errorBD) {
        await eliminarImagenStorage(prueba, nombreFinal);
        throw errorBD;
      }

      let advertenciaStorage = null;
      if (resultadoBD && resultadoBD.imagen_eliminar) {
        const limpieza = await eliminarImagenStorage(prueba, resultadoBD.imagen_eliminar);
        if (!limpieza.ok) {
          advertenciaStorage =
            'El nuevo nombre se guardó, pero no se pudo eliminar el archivo antiguo ("' +
            resultadoBD.imagen_eliminar + '") del Storage.';
        }
      }
      return { resultado: resultadoBD, advertenciaStorage: advertenciaStorage };
    }

    // Caso 4: Sin cambios de archivo (o se quitó la imagen existente).
    // Orden seguro: 1) Guardar en BD → 2) Si se quitó imagen y ya nadie más la usa, borrarla del Storage.
    const resultadoBD = await guardarEnBD(quitarImagen ? null : nombreFinal);
    let advertenciaStorage = null;
    if (resultadoBD && resultadoBD.imagen_eliminar) {
      const limpieza = await eliminarImagenStorage(prueba, resultadoBD.imagen_eliminar);
      if (!limpieza.ok) {
        advertenciaStorage =
          'Los cambios se guardaron, pero no se pudo eliminar el archivo "' +
          resultadoBD.imagen_eliminar + '" del Storage.';
      }
    }
    return { resultado: resultadoBD, advertenciaStorage: advertenciaStorage };
  }

  // =========================================================
  // 5. API PÚBLICA DEL MÓDULO DE DIAGNÓSTICOS
  // =========================================================

  const DiagnosticosAPI = Object.freeze({
    CONFIG: DIAGNOSTICOS_CONFIG,
    TAMANO_MAXIMO_IMAGEN_BYTES: TAMANO_MAXIMO_IMAGEN_BYTES,

    utilidades: Object.freeze({
      extraerExtensionImagen: extraerExtensionImagen,
      extraerBaseNombreImagen: extraerBaseNombreImagen,
      sanitizarNombreImagen: sanitizarNombreImagen,
      construirNombreArchivoImagen: construirNombreArchivoImagen,
      validarArchivoImagen: validarArchivoImagen,
      obtenerUrlPublicaImagen: obtenerUrlPublicaImagen,
      interpretarErrorDiagnostico: interpretarErrorDiagnostico
    }),

    async verificarAccesoAdmin() {
      const acceso = await AdminAuth.protegerPagina({ urlLogin: '../Panel/index.html' });
      return !!acceso.autorizado;
    },

    async obtenerDiagnostico(prueba, opciones) {
      const forzar = Boolean(opciones && opciones.forzar);
      const cfg = DIAGNOSTICOS_CONFIG[prueba];
      const etiquetas = ['esquema:diagnosticos', 'admin:diagnosticos'];
      if (cfg && cfg.tablaPreguntas) {
        etiquetas.push('tabla:' + cfg.tablaPreguntas);
      }
      return await llamarRpcDiagnosticos(
        'admin_obtener_diagnostico',
        { p_prueba: prueba },
        {
          soloLectura: true,
          cache: {
            clave: 'admin:diag:' + prueba,
            ttl: TTL_CACHE_DIAGNOSTICO_ADMIN_MS,
            forzar: forzar,
            etiquetas: etiquetas
          }
        }
      );
    },

    async guardarPregunta(parametros) {
      const prueba = parametros.prueba;
      const datos = parametros.datos;
      const cfg = DIAGNOSTICOS_CONFIG[prueba];
      const etiquetasInv = ['esquema:diagnosticos', 'admin:diagnosticos'];
      if (cfg && cfg.tablaPreguntas) etiquetasInv.push('tabla:' + cfg.tablaPreguntas);

      return await ejecutarGuardadoConImagen({
        prueba: prueba,
        imagenOriginal: parametros.imagenOriginal,
        estadoImagen: parametros.estadoImagen,
        guardarEnBD: function (nombreImagenFinal) {
          return llamarRpcDiagnosticos(
            'admin_guardar_pregunta',
            {
              p_prueba: prueba,
              p_id: datos.id == null ? null : Number(datos.id),
              p_numero: Number(datos.numero),
              p_enunciado: datos.enunciado,
              p_opciones: datos.opciones,
              p_respuesta_correcta: datos.respuesta_correcta,
              p_activa: !!datos.activa,
              p_texto_id: datos.texto_id == null ? null : Number(datos.texto_id),
              p_imagen: nombreImagenFinal
            },
            { etiquetasInvalidar: etiquetasInv }
          );
        }
      });
    },

    async cambiarEstadoPregunta(prueba, idPregunta, activa) {
      const cfg = DIAGNOSTICOS_CONFIG[prueba];
      const etiquetasInv = ['esquema:diagnosticos', 'admin:diagnosticos'];
      if (cfg && cfg.tablaPreguntas) etiquetasInv.push('tabla:' + cfg.tablaPreguntas);

      return await llamarRpcDiagnosticos(
        'admin_cambiar_estado_pregunta',
        {
          p_prueba: prueba,
          p_id: Number(idPregunta),
          p_activa: !!activa
        },
        { etiquetasInvalidar: etiquetasInv }
      );
    },

    async eliminarPregunta(prueba, idPregunta) {
      const cfg = DIAGNOSTICOS_CONFIG[prueba];
      const etiquetasInv = ['esquema:diagnosticos', 'admin:diagnosticos'];
      if (cfg && cfg.tablaPreguntas) etiquetasInv.push('tabla:' + cfg.tablaPreguntas);

      const resultado = await llamarRpcDiagnosticos(
        'admin_eliminar_pregunta',
        {
          p_prueba: prueba,
          p_id: Number(idPregunta)
        },
        { etiquetasInvalidar: etiquetasInv }
      );
      let advertenciaStorage = null;
      if (resultado && resultado.imagen_eliminar) {
        const limpieza = await eliminarImagenStorage(prueba, resultado.imagen_eliminar);
        if (!limpieza.ok) {
          advertenciaStorage =
            'La pregunta fue eliminada, pero no se pudo borrar su imagen ("' +
            resultado.imagen_eliminar + '") del Storage.';
        }
      }
      return { resultado: resultado, advertenciaStorage: advertenciaStorage };
    },

    async guardarTexto(parametros) {
      const prueba = parametros.prueba;
      const datos = parametros.datos;
      const cfg = DIAGNOSTICOS_CONFIG[prueba];
      const etiquetasInv = ['esquema:diagnosticos', 'admin:diagnosticos', 'tabla:textos_compartidos'];
      if (cfg && cfg.tablaPreguntas) etiquetasInv.push('tabla:' + cfg.tablaPreguntas);

      return await ejecutarGuardadoConImagen({
        prueba: prueba,
        imagenOriginal: parametros.imagenOriginal,
        estadoImagen: parametros.estadoImagen,
        guardarEnBD: function (nombreImagenFinal) {
          return llamarRpcDiagnosticos(
            'admin_guardar_texto',
            {
              p_prueba: prueba,
              p_id: datos.id == null ? null : Number(datos.id),
              p_titulo: datos.titulo || null,
              p_contenido: datos.contenido,
              p_activo: !!datos.activo,
              p_imagen: nombreImagenFinal
            },
            { etiquetasInvalidar: etiquetasInv }
          );
        }
      });
    },

    async eliminarTexto(prueba, idTexto) {
      const cfg = DIAGNOSTICOS_CONFIG[prueba];
      const etiquetasInv = ['esquema:diagnosticos', 'admin:diagnosticos', 'tabla:textos_compartidos'];
      if (cfg && cfg.tablaPreguntas) etiquetasInv.push('tabla:' + cfg.tablaPreguntas);

      const resultado = await llamarRpcDiagnosticos(
        'admin_eliminar_texto',
        {
          p_prueba: prueba,
          p_id: Number(idTexto)
        },
        { etiquetasInvalidar: etiquetasInv }
      );
      let advertenciaStorage = null;
      if (resultado && resultado.imagen_eliminar) {
        const limpieza = await eliminarImagenStorage(prueba, resultado.imagen_eliminar);
        if (!limpieza.ok) {
          advertenciaStorage =
            'El texto compartido fue eliminado, pero no se pudo borrar su imagen ("' +
            resultado.imagen_eliminar + '") del Storage.';
        }
      }
      return { resultado: resultado, advertenciaStorage: advertenciaStorage };
    }
  });

  window.DiagnosticosAPI = DiagnosticosAPI;
})(window);
