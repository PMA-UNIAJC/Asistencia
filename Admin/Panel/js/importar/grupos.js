// ============================================================================
// MÓDULO: Importación CSV de Grupos para Supabase (diagnosticos.grupos)
// Ubicación: Admin/Panel/js/importar/grupos.js
//
// Recibe un archivo CSV con encabezados exactos (sede, grupo), valida las sedes
// permitidas y duplicados antes de enviar a diagnosticos.admin_reemplazar_grupos.
// ============================================================================

const importadorGrupos = ImportadorCSV.crearImportadorCSV({
  tablaDestino: 'diagnosticos.grupos',
  columnas: ['sede', 'grupo'],
  insensibleEncabezados: false,
  ids: {
    dropzone: 'gruposDropzone',
    input: 'inputArchivoCSVGrupos',
    btnQuitar: 'btnQuitarArchivoGrupos',
    archivoInfo: 'gruposArchivoInfo',
    archivoNombre: 'gruposArchivoNombre',
    archivoMeta: 'gruposArchivoMeta',
    pills: 'gruposColumnasPills',
    msgValidacion: 'gruposMensajeValidacion',
    resultado: 'gruposResultadoValidacion',
    statTotal: 'statGruposTotalFilas',
    statValidas: 'statGruposFilasValidas',
    statObs: 'statGruposObservaciones',
    contObs: 'gruposContenedorObservaciones',
    listaObs: 'gruposListaObservaciones',
    countObs: 'gruposContadorObservaciones',
    seccionConfirm: 'gruposSeccionConfirmacion',
    resumenConfirm: 'gruposResumenReemplazoTexto',
    chkConfirm: 'chkConfirmarReemplazoGrupos',
    lblConfirm: 'lblConfirmarReemplazoGrupos',
    msgReemplazo: 'gruposMensajeReemplazo',
    btnReemplazar: 'btnEjecutarReemplazoGrupos'
  },
  textoBotonDefecto: 'Reemplazar registros en diagnosticos.grupos',
  textoBotonEnviando: 'Reemplazando registros en diagnosticos.grupos...',

  crearEstadoValidacion: () => ({
    gruposVistos: new Set()
  }),

  procesarFila(celdas, _numFila, ctx) {
    const sedeRaw = celdas[0];
    const sede = ImportadorCSV.normalizarSinTildesMayusculas(sedeRaw);
    const grupo = ImportadorCSV.normalizarEspacios(celdas[1]).toUpperCase();

    const sedeValida = !sedeRaw || ImportadorCSV.SEDES_PERMITIDAS.includes(sede);
    if (!sedeValida) {
      ctx.registrarError(
        'sedeInvalida',
        n => `El campo "sede" contiene valores no admitidos en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')} (sedes válidas: ${ImportadorCSV.SEDES_PERMITIDAS.join(', ')}).`
      );
    }

    if (sede && grupo && sedeValida) {
      const clave = `${sede}||${grupo}`;
      if (ctx.gruposVistos.has(clave)) {
        ctx.registrarError(
          'grupoDuplicado',
          n => `Se encontraron grupos duplicados dentro de una misma sede en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')}.`
        );
      } else {
        ctx.gruposVistos.add(clave);
      }
    }

    return { sede, grupo };
  },

  construirResumenConfirmacion({ listo, validas, nombreArchivo }) {
    return listo
      ? ImportadorCSV.crearFragmentoSeguro([
          'Se reemplazarán todos los registros de ',
          { tag: 'code', className: 'supabase-code-inline', text: 'diagnosticos.grupos' },
          ' por los ',
          { tag: 'strong', text: validas.toLocaleString('es-CO') },
          ' grupos válidos del archivo ',
          { tag: 'strong', text: nombreArchivo },
          '.'
        ])
      : ImportadorCSV.crearFragmentoSeguro([
          'Archivo cargado: ',
          { tag: 'strong', text: nombreArchivo },
          '. Corrija las observaciones detectadas en el CSV y vuelva a seleccionarlo para habilitar el reemplazo.'
        ]);
  },

  construirModalConfirmacion({ cantidad }) {
    return {
      titulo: '¿Reemplazar toda la tabla diagnosticos.grupos?',
      mensaje: `Se eliminarán todos los registros actuales de diagnosticos.grupos y se insertarán ${cantidad.toLocaleString('es-CO')} grupos desde el archivo CSV. Esta acción no se puede deshacer.`
    };
  },

  async ejecutarReemplazo(registros) {
    const resultado = await ConsultasAdmin.reemplazarGruposDiagnosticos(registros);
    const totalActual = Number(resultado?.total_actual ?? registros.length) || registros.length;
    const insertados = Number(resultado?.insertados ?? 0) || 0;
    const eliminados = Number(resultado?.eliminados ?? 0) || 0;
    const conservados = Number(resultado?.con_estudiantes_conservados ?? 0) || 0;

    const detalles = [
      `${insertados.toLocaleString('es-CO')} nuevo(s)`,
      `${eliminados.toLocaleString('es-CO')} eliminado(s)`
    ];
    if (conservados > 0) {
      detalles.push(`${conservados.toLocaleString('es-CO')} conservado(s) con estudiantes`);
    }

    return `Reemplazo completado correctamente: diagnosticos.grupos cuenta ahora con ${totalActual.toLocaleString('es-CO')} grupos (${detalles.join(', ')}).`;
  }
});

function inicializarSeccionGrupos() {
  importadorGrupos.inicializar();
}

function manejarCambioArchivoCSVGrupos(event) {
  importadorGrupos.manejarCambioInput(event);
}

function limpiarImportacionGrupos(event) {
  importadorGrupos.limpiar(event);
}

function actualizarEstadoBotonReemplazoGrupos() {
  importadorGrupos.actualizarEstadoBoton();
}

function solicitarReemplazoGruposSupabase() {
  importadorGrupos.solicitarReemplazo();
}

document.addEventListener('DOMContentLoaded', inicializarSeccionGrupos);
