// ============================================================================
// MÓDULO: Importación CSV de Estudiantes para Supabase (public.estudiantes)
// Ubicación: Admin/Panel/js/importar/estudiantes.js
//
// CSV generado por Streamlit ("Estudiantes para Supabase"):
//   - Codificación UTF-8 con BOM, delimitador ',', encabezados exactos:
//     documento, nombre, facultad, programa, sede, semestre
//   - Python ya normaliza espacios, quita tildes en nombre, elimina '.0' de
//     documento, deduplica registros y mapea semestre (PRIMERO/SEGUNDO/TERCERO
//     -> 1/2/3). Este módulo conserva las validaciones de datos faltantes o
//     inconsistentes dependientes del archivo de entrada y normaliza la sede.
// ============================================================================

const importadorEstudiantes = ImportadorCSV.crearImportadorCSV({
  tablaDestino: 'public.estudiantes',
  columnas: ['documento', 'nombre', 'facultad', 'programa', 'sede', 'semestre'],
  insensibleEncabezados: false,
  ids: {
    dropzone: 'supabaseDropzone',
    input: 'inputArchivoCSVSupabase',
    btnQuitar: 'btnQuitarArchivoSupabase',
    archivoInfo: 'supabaseArchivoInfo',
    archivoNombre: 'supabaseArchivoNombre',
    archivoMeta: 'supabaseArchivoMeta',
    pills: 'supabaseColumnasPills',
    msgValidacion: 'supabaseMensajeValidacion',
    resultado: 'supabaseResultadoValidacion',
    statTotal: 'statSupabaseTotalFilas',
    statValidas: 'statSupabaseFilasValidas',
    statObs: 'statSupabaseObservaciones',
    contObs: 'supabaseContenedorObservaciones',
    listaObs: 'supabaseListaObservaciones',
    countObs: 'supabaseContadorObservaciones',
    seccionConfirm: 'supabaseSeccionConfirmacion',
    resumenConfirm: 'supabaseResumenReemplazoTexto',
    chkConfirm: 'chkConfirmarReemplazoSupabase',
    lblConfirm: 'lblConfirmarReemplazoSupabase',
    msgReemplazo: 'supabaseMensajeReemplazo',
    btnReemplazar: 'btnEjecutarReemplazoSupabase'
  },
  textoBotonDefecto: 'Reemplazar registros en public.estudiantes',
  textoBotonEnviando: 'Reemplazando registros en public.estudiantes...',

  crearEstadoValidacion: () => ({
    documentosVistos: new Set()
  }),

  procesarFila(celdas, _numFila, ctx) {
    const documento = ImportadorCSV.normalizarEspacios(celdas[0]);
    const nombre = ImportadorCSV.normalizarEspacios(celdas[1]);
    const facultad = ImportadorCSV.normalizarEspacios(celdas[2]);
    const programa = ImportadorCSV.normalizarEspacios(celdas[3]);
    const sedeRaw = celdas[4];
    const semestreRaw = celdas[5];

    const sede = ImportadorCSV.normalizarSinTildesMayusculas(sedeRaw);
    if (sedeRaw && !ImportadorCSV.SEDES_PERMITIDAS.includes(sede)) {
      ctx.registrarError(
        'sedeInvalida',
        n => `El campo "sede" contiene valores no admitidos en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')} (sedes válidas: ${ImportadorCSV.SEDES_PERMITIDAS.join(', ')}).`
      );
    }

    if (documento) {
      if (ctx.documentosVistos.has(documento)) {
        ctx.registrarError(
          'documentoDuplicado',
          n => `Se encontraron documentos duplicados en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')}.`
        );
      } else {
        ctx.documentosVistos.add(documento);
      }
    }

    let semestre = null;
    if (semestreRaw) {
      if (!/^\d+$/.test(semestreRaw)) {
        ctx.registrarError(
          'semestreNoNumerico',
          n => `El campo "semestre" no es un número entero válido en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')}.`
        );
      } else {
        semestre = parseInt(semestreRaw, 10);
        if (semestre < 1 || semestre > 20) {
          ctx.registrarError(
            'semestreFueraRango',
            n => `El valor de "semestre" está fuera del rango esperado (1 a 20) en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')}.`
          );
        }
      }
    }

    return { documento, nombre, facultad, programa, sede, semestre };
  },

  construirResumenConfirmacion({ listo, validas, nombreArchivo }) {
    return listo
      ? ImportadorCSV.crearFragmentoSeguro([
          'Se reemplazarán todos los registros de ',
          { tag: 'code', className: 'supabase-code-inline', text: 'public.estudiantes' },
          ' por los ',
          { tag: 'strong', text: validas.toLocaleString('es-CO') },
          ' estudiantes válidos del archivo ',
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
      titulo: '¿Reemplazar toda la tabla public.estudiantes?',
      mensaje: `Se reemplazarán los registros actuales de public.estudiantes por los ${cantidad.toLocaleString('es-CO')} estudiantes desde el archivo CSV. Esta acción no se puede deshacer.`
    };
  },

  async ejecutarReemplazo(registros) {
    const resultado = await ConsultasAdmin.reemplazarEstudiantesSupabase(registros);
    const insertados = Number(resultado?.insertados ?? registros.length) || registros.length;
    const conservados = Number(resultado?.con_formularios_conservados ?? 0) || 0;
    const detalleConservados = conservados > 0
      ? ` (se conservaron ${conservados.toLocaleString('es-CO')} estudiante(s) con registros asociados en public.formularios)`
      : '';

    return `Reemplazo completado correctamente: la tabla public.estudiantes fue actualizada con ${insertados.toLocaleString('es-CO')} estudiantes${detalleConservados}.`;
  }
});

function inicializarSeccionSupabase() {
  importadorEstudiantes.inicializar();
}

function manejarCambioArchivoCSVSupabase(event) {
  importadorEstudiantes.manejarCambioInput(event);
}

function limpiarImportacionSupabase(event) {
  importadorEstudiantes.limpiar(event);
}

function actualizarEstadoBotonReemplazoSupabase() {
  importadorEstudiantes.actualizarEstadoBoton();
}

function solicitarReemplazoEstudiantesSupabase() {
  importadorEstudiantes.solicitarReemplazo();
}

document.addEventListener('DOMContentLoaded', inicializarSeccionSupabase);
