// ============================================================================
// MÓDULO: Importación CSV de Catálogo de Visitas por Sede
// Ubicación: Admin/Panel/js/importar/visitas.js
//
// CSV obtenido al exportar manualmente la hoja VISITAS del Excel generado por
// Streamlit ("Visitas a Grupos"):
//   - Columnas esperadas: DIA, HORARIO, SALON, GRUPO, SEMESTRE, JORNADA
//     (se aceptan en mayúsculas o minúsculas).
//   - Python ya asigna DIA (LUNES-SABADO), SEMESTRE (PRIMERO-TERCERO) y
//     JORNADA (MAÑANA/TARDE/NOCHE), y formatea HORARIO como "HHMM - HHMM".
//     Cuando un horario es inválido en el origen, Python resalta la fila y deja
//     JORNADA vacía: este módulo valida campos vacíos, formato de horario,
//     valores permitidos, conflicto de sede en el nombre del archivo y duplicados.
// ============================================================================

const VISITAS_CONFIG = Object.freeze({
  tablasPorSede: Object.freeze({ norte: 'visitas_norte', sur: 'visitas_sur' }),
  etiquetasSede: Object.freeze({ norte: 'SEDE NORTE', sur: 'SEDE SUR' }),
  diasPermitidos: Object.freeze(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']),
  semestresPermitidos: Object.freeze(['PRIMERO', 'SEGUNDO', 'TERCERO']),
  jornadasPermitidas: Object.freeze(['MAÑANA', 'TARDE', 'NOCHE'])
});

const PATRON_HORA_VISITAS = /^(\d{3,4}|\d{1,2}[:.]\d{2})$/;

function obtenerSedeSeleccionadaVisitas() {
  const select = document.getElementById('selectSedeVisitasCSV');
  const valor = String(select?.value || '').trim().toLowerCase();
  return valor === 'norte' || valor === 'sur' ? valor : '';
}

function obtenerTablaCompletaVisitas(sede) {
  const tabla = VISITAS_CONFIG.tablasPorSede[sede];
  return tabla ? `visitas.${tabla}` : 'visitas.visitas_{sede}';
}

function obtenerEtiquetaSedeVisitas(sede) {
  return VISITAS_CONFIG.etiquetasSede[sede] || 'SIN SEDE SELECCIONADA';
}

function normalizarHorarioVisitas(valor) {
  const texto = ImportadorCSV.normalizarEspacios(valor);
  if (!texto) return '';
  const partes = texto.split(/\s*-\s*/);
  return partes.length === 2 && partes[0] && partes[1]
    ? `${partes[0]} - ${partes[1]}`
    : texto;
}

function esHorarioValidoVisitas(horarioNorm) {
  const partes = horarioNorm.split(' - ');
  return partes.length === 2 && PATRON_HORA_VISITAS.test(partes[0]) && PATRON_HORA_VISITAS.test(partes[1]);
}

function normalizarJornadaVisitas(valor) {
  const norm = ImportadorCSV.normalizarSinTildesMayusculas(valor);
  return norm === 'MANANA' ? 'MAÑANA' : norm;
}

function actualizarIndicadorSedeDestinoVisitas() {
  const sede = obtenerSedeSeleccionadaVisitas();
  const banner = document.getElementById('visitasSedeDestinoBanner');
  const codigoTablaConfirm = document.getElementById('visitasCodigoTablaConfirmacion');
  const textoConfirmCheck = document.getElementById('textoConfirmarReemplazoVisitas');
  const btnReemplazar = document.getElementById('btnEjecutarReemplazoVisitas');
  const reemplazando = typeof importadorVisitas !== 'undefined' && importadorVisitas.estaReemplazando();

  if (!sede) {
    if (banner) {
      banner.className = 'alert-box';
      banner.style.marginBottom = '18px';
      banner.textContent = '';
      banner.appendChild(ImportadorCSV.crearFragmentoSeguro([
        { tag: 'strong', text: 'Paso 1 obligatorio: Seleccione la sede destino' },
        ' Elija Sede Norte o Sede Sur antes de seleccionar el archivo CSV.'
      ]));
    }
    if (codigoTablaConfirm) codigoTablaConfirm.textContent = 'visitas.visitas_{sede}';
    if (textoConfirmCheck) {
      textoConfirmCheck.textContent = 'Confirmo que deseo reemplazar todos los registros actuales de la sede seleccionada por los registros válidos de este archivo CSV.';
    }
    if (btnReemplazar && !reemplazando) {
      btnReemplazar.textContent = 'Reemplazar registros de visitas';
    }
    return;
  }

  const tablaCompleta = obtenerTablaCompletaVisitas(sede);
  const etiquetaSede = obtenerEtiquetaSedeVisitas(sede);

  if (banner) {
    banner.className = 'alert-box';
    banner.style.marginBottom = '18px';
    banner.textContent = '';
    banner.appendChild(ImportadorCSV.crearFragmentoSeguro([
      { tag: 'strong', text: `Destino: ${etiquetaSede}` }
    ]));
  }
  if (codigoTablaConfirm) codigoTablaConfirm.textContent = tablaCompleta;
  if (textoConfirmCheck) {
    textoConfirmCheck.textContent = '';
    textoConfirmCheck.appendChild(ImportadorCSV.crearFragmentoSeguro([
      'Confirmo que este archivo corresponde a la ',
      { tag: 'strong', text: etiquetaSede },
      ' y deseo reemplazar todos los registros actuales de ',
      { tag: 'code', text: tablaCompleta },
      ' por los registros válidos de este archivo CSV.'
    ]));
  }
  if (btnReemplazar && !reemplazando) {
    btnReemplazar.textContent = `Reemplazar registros en ${tablaCompleta} (${etiquetaSede})`;
  }
}

const importadorVisitas = ImportadorCSV.crearImportadorCSV({
  tablaDestino: ctx => obtenerTablaCompletaVisitas(ctx?.sede),
  columnas: ['dia', 'horario', 'salon', 'grupo', 'semestre', 'jornada'],
  insensibleEncabezados: true,
  ids: {
    dropzone: 'visitasDropzone',
    input: 'inputArchivoCSVVisitas',
    btnQuitar: 'btnQuitarArchivoVisitas',
    archivoInfo: 'visitasArchivoInfo',
    archivoNombre: 'visitasArchivoNombre',
    archivoMeta: 'visitasArchivoMeta',
    pills: 'visitasColumnasPills',
    msgValidacion: 'visitasMensajeValidacion',
    resultado: 'visitasResultadoValidacion',
    statTotal: 'statVisitasTotalFilas',
    statValidas: 'statVisitasFilasValidas',
    statObs: 'statVisitasObservaciones',
    contObs: 'visitasContenedorObservaciones',
    listaObs: 'visitasListaObservaciones',
    countObs: 'visitasContadorObservaciones',
    seccionConfirm: 'visitasSeccionConfirmacion',
    resumenConfirm: 'visitasResumenReemplazoTexto',
    chkConfirm: 'chkConfirmarReemplazoVisitas',
    lblConfirm: 'lblConfirmarReemplazoVisitas',
    msgReemplazo: 'visitasMensajeReemplazo',
    btnReemplazar: 'btnEjecutarReemplazoVisitas'
  },
  textoBotonDefecto() {
    const sede = obtenerSedeSeleccionadaVisitas();
    return sede
      ? `Reemplazar registros en ${obtenerTablaCompletaVisitas(sede)} (${obtenerEtiquetaSedeVisitas(sede)})`
      : 'Reemplazar registros de visitas';
  },
  textoBotonEnviando: ctx => `Reemplazando registros en ${obtenerTablaCompletaVisitas(ctx?.sede)}...`,

  antesDeSeleccionar() {
    if (obtenerSedeSeleccionadaVisitas()) return true;
    ImportadorCSV.mostrarMensajeBloque(
      'visitasMensajeValidacion',
      'Por favor seleccione primero la sede (Norte o Sur) a la que corresponde el archivo CSV antes de cargarlo.',
      'error'
    );
    document.getElementById('selectSedeVisitasCSV')?.focus();
    return false;
  },

  obtenerContexto() {
    const sede = obtenerSedeSeleccionadaVisitas();
    if (!sede) {
      ImportadorCSV.mostrarMensajeBloque(
        'visitasMensajeValidacion',
        'Seleccione primero la sede (Norte o Sur) antes de validar el archivo CSV.',
        'error'
      );
      return null;
    }
    return { sede };
  },

  contextoValido: ctx => Boolean(ctx?.sede) && ctx.sede === obtenerSedeSeleccionadaVisitas(),

  formatearMetaExtra: ctx => ctx?.sede
    ? ` • Destino: ${obtenerEtiquetaSedeVisitas(ctx.sede)} (${obtenerTablaCompletaVisitas(ctx.sede)})`
    : '',

  validarArchivo(archivo, ctx) {
    const sedeEsperada = ctx.sede === 'norte' ? 'NORTE' : 'SUR';
    const sedeContraria = ctx.sede === 'norte' ? 'SUR' : 'NORTE';
    const nombreUpper = ImportadorCSV.normalizarSinTildesMayusculas(archivo?.name || '');
    const tieneContraria = new RegExp(`(^|[^A-Z])${sedeContraria}([^A-Z]|$)`).test(nombreUpper);
    const tieneEsperada = new RegExp(`(^|[^A-Z])${sedeEsperada}([^A-Z]|$)`).test(nombreUpper);

    if (tieneContraria && !tieneEsperada) {
      return [
        `El nombre del archivo ("${archivo.name}") hace referencia a la sede ${sedeContraria}, pero usted seleccionó ${obtenerEtiquetaSedeVisitas(ctx.sede)}. Verifique que no esté cargando el archivo de la otra sede.`
      ];
    }
    return [];
  },

  crearEstadoValidacion: () => ({
    clasesVistas: new Set()
  }),

  procesarFila(celdas, _numFila, ctx) {
    const diaRaw = celdas[0];
    const horarioRaw = celdas[1];
    const salonRaw = celdas[2];
    const grupoRaw = celdas[3];
    const semestreRaw = celdas[4];
    const jornadaRaw = celdas[5];

    const dia = ImportadorCSV.normalizarSinTildesMayusculas(diaRaw);
    const horario = normalizarHorarioVisitas(horarioRaw);
    const salon = ImportadorCSV.normalizarEspacios(salonRaw).toUpperCase();
    const grupo = ImportadorCSV.normalizarEspacios(grupoRaw).toUpperCase();
    const semestre = ImportadorCSV.normalizarSinTildesMayusculas(semestreRaw);
    const jornada = normalizarJornadaVisitas(jornadaRaw);

    if (diaRaw && !VISITAS_CONFIG.diasPermitidos.includes(dia)) {
      ctx.registrarError(
        'diaInvalido',
        n => `El campo "dia" contiene valores no permitidos en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')} (permitidos: ${VISITAS_CONFIG.diasPermitidos.join(', ')}).`
      );
    }

    if (horarioRaw && !esHorarioValidoVisitas(horario)) {
      ctx.registrarError(
        'horarioInvalido',
        n => `El campo "horario" tiene un formato inválido en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')} (formato esperado: "0700 - 0915").`
      );
    }

    if (semestreRaw && !VISITAS_CONFIG.semestresPermitidos.includes(semestre)) {
      ctx.registrarError(
        'semestreInvalido',
        n => `El campo "semestre" contiene valores no permitidos en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')} (permitidos: ${VISITAS_CONFIG.semestresPermitidos.join(', ')}).`
      );
    }

    if (jornadaRaw && !VISITAS_CONFIG.jornadasPermitidas.includes(jornada)) {
      ctx.registrarError(
        'jornadaInvalida',
        n => `El campo "jornada" contiene valores no permitidos en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')} (permitidas: ${VISITAS_CONFIG.jornadasPermitidas.join(', ')}).`
      );
    }

    if (dia && horario && grupo) {
      const clave = `${dia}||${horario}||${grupo}`;
      if (ctx.clasesVistas.has(clave)) {
        ctx.registrarError(
          'claseDuplicada',
          n => `Se encontraron combinaciones duplicadas de (día, horario, grupo) en ${ImportadorCSV.formatearPlural(n, 'fila', 'filas')}.`
        );
      } else {
        ctx.clasesVistas.add(clave);
      }
    }

    return { dia, horario, salon, grupo, semestre, jornada };
  },

  alLimpiar() {
    actualizarIndicadorSedeDestinoVisitas();
  },

  alCambiarEstadoEnvio(reemplazando) {
    const selectSede = document.getElementById('selectSedeVisitasCSV');
    if (selectSede) selectSede.disabled = reemplazando;
    if (!reemplazando) actualizarIndicadorSedeDestinoVisitas();
  },

  construirResumenConfirmacion({ listo, validas, nombreArchivo, tabla, contexto }) {
    const etiqueta = obtenerEtiquetaSedeVisitas(contexto?.sede);
    return listo
      ? ImportadorCSV.crearFragmentoSeguro([
          'Sede seleccionada: ',
          { tag: 'strong', text: etiqueta },
          '. Se reemplazarán los registros de ',
          { tag: 'code', className: 'supabase-code-inline', text: tabla },
          ' por las ',
          { tag: 'strong', text: validas.toLocaleString('es-CO') },
          ' clases programadas del archivo ',
          { tag: 'strong', text: nombreArchivo },
          '.'
        ])
      : ImportadorCSV.crearFragmentoSeguro([
          'Archivo cargado: ',
          { tag: 'strong', text: nombreArchivo },
          ` (${etiqueta}). Corrija las observaciones detectadas para habilitar el reemplazo en `,
          { tag: 'code', className: 'supabase-code-inline', text: tabla },
          '.'
        ]);
  },

  construirModalConfirmacion({ cantidad, nombreArchivo, contexto }) {
    const tabla = obtenerTablaCompletaVisitas(contexto.sede);
    const etiqueta = obtenerEtiquetaSedeVisitas(contexto.sede);
    return {
      titulo: `¿Reemplazar ${tabla} (${etiqueta})?`,
      mensaje: `Se actualizará exclusivamente la tabla ${tabla} (${etiqueta}) con las ${cantidad.toLocaleString('es-CO')} clases programadas del archivo "${nombreArchivo}". La otra sede no será modificada. ¿Desea continuar?`
    };
  },

  async ejecutarReemplazo(registros, contexto) {
    const sede = contexto.sede;
    const tabla = obtenerTablaCompletaVisitas(sede);
    const etiqueta = obtenerEtiquetaSedeVisitas(sede);
    const resultado = await ConsultasAdmin.reemplazarCatalogoVisitas(sede, registros);
    const insertados = Number(resultado?.insertados ?? registros.length) || registros.length;
    const conservados = Number(resultado?.con_registros_conservados ?? 0) || 0;
    const detalleConservados = conservados > 0
      ? ` (se conservaron ${conservados.toLocaleString('es-CO')} registro(s) previos con visitas asignadas/realizadas asociadas)`
      : '';

    return `Reemplazo completado correctamente en ${etiqueta}: la tabla ${tabla} fue actualizada con ${insertados.toLocaleString('es-CO')} registros${detalleConservados}.`;
  }
});

let ultimaSedeVisitas = '';

function cambiarTabVisitas(event, tab) {
  if (event?.currentTarget) {
    document.querySelectorAll('#tabVisitas .admin-tabs-terciario .admin-tab').forEach(btn => {
      btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
  }

  document.getElementById('tabDescargasVisitas')?.classList.toggle('hidden', tab !== 'descargas');
  document.getElementById('tabImportarVisitas')?.classList.toggle('hidden', tab !== 'importar');

  if (tab === 'importar') {
    inicializarSeccionVisitasCSV();
  }
}

function inicializarSeccionVisitasCSV() {
  actualizarIndicadorSedeDestinoVisitas();
  importadorVisitas.inicializar();
}

function manejarCambioSedeVisitasCSV(event) {
  if (importadorVisitas.estaReemplazando()) {
    if (event?.target) event.target.value = ultimaSedeVisitas;
    return;
  }

  const nuevaSede = obtenerSedeSeleccionadaVisitas();
  ultimaSedeVisitas = nuevaSede;
  actualizarIndicadorSedeDestinoVisitas();

  if (!nuevaSede) {
    importadorVisitas.limpiar();
    return;
  }

  if (!importadorVisitas.revalidar()) {
    ImportadorCSV.mostrarMensajeBloque('visitasMensajeValidacion', '', '');
    ImportadorCSV.mostrarMensajeBloque('visitasMensajeReemplazo', '', '');
  }
}

function manejarCambioArchivoCSVVisitas(event) {
  importadorVisitas.manejarCambioInput(event);
}

function limpiarImportacionVisitas(event) {
  importadorVisitas.limpiar(event);
}

function actualizarEstadoBotonReemplazoVisitas() {
  importadorVisitas.actualizarEstadoBoton();
}

function solicitarReemplazoVisitasSupabase() {
  importadorVisitas.solicitarReemplazo();
}

document.addEventListener('DOMContentLoaded', inicializarSeccionVisitasCSV);
