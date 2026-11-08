// ============================================================================
// MÓDULO: Importación CSV de Estudiantes para Supabase (public.estudiantes)
// Ubicación: Admin/Panel/js/supabase.js
//
// ETAPA ACTUAL (Etapa 1 - Preparación y Validación Local):
//   - Permite seleccionar/arrastrar un archivo CSV desde el equipo.
//   - Valida estrictamente los 6 primeros encabezados obligatorios y su orden exacto:
//     documento, nombre, facultad, programa, sede, semestre
//     (si existen más columnas después de la sexta, se ignoran).
//   - Analiza las filas localmente y detecta observaciones (campos vacíos,
//     documentos duplicados en el CSV, semestre no numérico).
//   - NO ejecuta ninguna operación de lectura/escritura/borrado en Supabase.
//
// ETAPA FUTURA PREVISTA (Reemplazo completo en public.estudiantes):
//   1. Carga de CSV con las 6 columnas requeridas.
//   2. Validación del archivo.
//   3. Confirmación expresa del administrador.
//   4. Eliminación de todos los registros actuales de public.estudiantes.
//   5. Inserción por lotes de los estudiantes contenidos en el CSV.
//   6. Notificación del resultado final de la operación.
// ============================================================================

const SUPABASE_ESTUDIANTES_CONFIG = Object.freeze({
  esquema: 'public',
  tabla: 'estudiantes',
  columnasObligatorias: Object.freeze([
    'documento',
    'nombre',
    'facultad',
    'programa',
    'sede',
    'semestre'
  ]),
  escrituraHabilitadaEnEstaEtapa: false // Seguridad Etapa 1: desactiva toda operación en BD
});

// Estado en memoria de la importación actual
const estadoImportacionSupabase = {
  archivo: null,
  delimitadorDetectado: ',',
  encabezadosEncontrados: [],
  encabezadosValidos: false,
  erroresEncabezado: [],
  totalFilasLeidas: 0,
  filasParseadas: [],
  registrosValidos: [],     // Objetos listos con la estructura exacta de public.estudiantes
  observaciones: []         // Lista de observaciones { fila, documento, tipo, mensaje }
};

// ── Inicialización de eventos Drag & Drop y Selector ────────────────────────

function inicializarSeccionSupabase() {
  const dropzone = document.getElementById('supabaseDropzone');
  const inputArchivo = document.getElementById('inputArchivoCSVSupabase');

  if (!dropzone || dropzone.dataset.inicializado === 'true') return;
  dropzone.dataset.inicializado = 'true';

  dropzone.addEventListener('click', function (e) {
    if (e.target.closest('#btnQuitarArchivoSupabase')) {
      return;
    }
    if (inputArchivo) inputArchivo.click();
  });

  dropzone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');

    const archivos = e.dataTransfer?.files;
    if (archivos && archivos.length > 0) {
      procesarArchivoSeleccionadoSupabase(archivos[0]);
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  inicializarSeccionSupabase();
});

// ── Manejo de Selección y Limpieza de Archivo ───────────────────────────────

function manejarCambioArchivoCSVSupabase(event) {
  const archivo = event.target?.files?.[0];
  if (!archivo) return;
  procesarArchivoSeleccionadoSupabase(archivo);
}

function limpiarImportacionSupabase(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  estadoImportacionSupabase.archivo = null;
  estadoImportacionSupabase.delimitadorDetectado = ',';
  estadoImportacionSupabase.encabezadosEncontrados = [];
  estadoImportacionSupabase.encabezadosValidos = false;
  estadoImportacionSupabase.erroresEncabezado = [];
  estadoImportacionSupabase.totalFilasLeidas = 0;
  estadoImportacionSupabase.filasParseadas = [];
  estadoImportacionSupabase.registrosValidos = [];
  estadoImportacionSupabase.observaciones = [];

  const inputArchivo = document.getElementById('inputArchivoCSVSupabase');
  if (inputArchivo) inputArchivo.value = '';

  const chkConfirmar = document.getElementById('chkConfirmarReemplazoSupabase');
  if (chkConfirmar) {
    chkConfirmar.checked = false;
    chkConfirmar.disabled = true;
  }

  ocultarElementoSupabase('supabaseArchivoInfo');
  ocultarElementoSupabase('supabaseResultadoValidacion');
  ocultarElementoSupabase('supabaseSeccionConfirmacion');
  mostrarMensajeEstadoSupabase('', '');
  restaurarIndicadoresColumnasEsperadas();
}

function procesarArchivoSeleccionadoSupabase(archivo) {
  limpiarImportacionSupabase();

  // 1. Validar extensión y tipo de archivo
  const nombreArchivo = archivo.name || '';
  const esExtensionCSV = /\.csv$/i.test(nombreArchivo);

  if (!esExtensionCSV) {
    mostrarMensajeEstadoSupabase(
      `El archivo seleccionado ("${nombreArchivo}") no es un archivo CSV válido. Por favor seleccione un archivo con extensión .csv.`,
      'error'
    );
    return;
  }

  if (archivo.size === 0) {
    mostrarMensajeEstadoSupabase(
      `El archivo "${nombreArchivo}" está vacío (0 bytes). Seleccione un archivo CSV que contenga los encabezados y registros de estudiantes.`,
      'error'
    );
    return;
  }

  estadoImportacionSupabase.archivo = archivo;
  mostrarInfoArchivoSeleccionado(archivo, null);

  const lector = new FileReader();
  lector.onload = function (e) {
    const contenido = typeof e.target?.result === 'string' ? e.target.result : '';
    analizarYValidarContenidoCSV(contenido, archivo);
  };
  lector.onerror = function () {
    mostrarMensajeEstadoSupabase(
      'No fue posible leer el archivo seleccionado. Verifique que el archivo no esté dañado o bloqueado por otro programa.',
      'error'
    );
  };
  lector.readAsText(archivo, 'UTF-8');
}

// ── Parser CSV (RFC 4180 + detección automática de delimitador , / ;) ───────

function detectarDelimitadorCSV(primeraLinea) {
  let dentroComillas = false;
  let conteoComas = 0;
  let conteoPuntoYComa = 0;

  for (let i = 0; i < primeraLinea.length; i++) {
    const char = primeraLinea[i];
    if (char === '"') {
      if (dentroComillas && primeraLinea[i + 1] === '"') {
        i++;
      } else {
        dentroComillas = !dentroComillas;
      }
    } else if (!dentroComillas) {
      if (char === ',') conteoComas++;
      else if (char === ';') conteoPuntoYComa++;
    }
  }

  if (conteoPuntoYComa > conteoComas) return ';';
  return ',';
}

function parsearTextoCSV(textoOriginal) {
  // Eliminar BOM UTF-8 si existe al inicio
  const texto = textoOriginal.replace(/^\uFEFF/, '');

  // Extraer primera línea para detectar delimitador
  const indiceSalto = texto.search(/\r?\n/);
  const primeraLinea = indiceSalto === -1 ? texto : texto.slice(0, indiceSalto);
  const delimitador = detectarDelimitadorCSV(primeraLinea);

  const filas = [];
  let filaActual = [];
  let celdaActual = '';
  let dentroComillas = false;
  let numeroLinea = 1;
  let inicioFilaLinea = 1;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const sig = texto[i + 1];

    if (char === '"') {
      if (dentroComillas && sig === '"') {
        celdaActual += '"';
        i++;
      } else {
        dentroComillas = !dentroComillas;
      }
    } else if (char === delimitador && !dentroComillas) {
      filaActual.push(celdaActual);
      celdaActual = '';
    } else if ((char === '\r' || char === '\n') && !dentroComillas) {
      if (char === '\r' && sig === '\n') {
        i++;
      }
      filaActual.push(celdaActual);
      filas.push({ numeroFila: inicioFilaLinea, celdas: filaActual });
      filaActual = [];
      celdaActual = '';
      numeroLinea++;
      inicioFilaLinea = numeroLinea;
    } else {
      if (char === '\n') numeroLinea++;
      celdaActual += char;
    }
  }

  // Última fila si no termina en salto de línea
  if (celdaActual.length > 0 || filaActual.length > 0) {
    filaActual.push(celdaActual);
    filas.push({ numeroFila: inicioFilaLinea, celdas: filaActual });
  }

  return { delimitador, filas };
}

// ── Validación de Encabezados y Filas ───────────────────────────────────────

function validarEncabezadosCSV(encabezadosCrudos) {
  const esperadas = SUPABASE_ESTUDIANTES_CONFIG.columnasObligatorias;
  // Tomar únicamente las primeras 6 columnas requeridas; cualquier columna después de la sexta se ignora
  const encontrados = encabezadosCrudos
    .slice(0, esperadas.length)
    .map(h => String(h ?? '').trim());
  const errores = [];

  // 1. Verificar columnas vacías dentro de las primeras 6 posiciones presentes
  const indicesVacios = [];
  encontrados.forEach((col, idx) => {
    if (!col) indicesVacios.push(idx + 1);
  });
  if (indicesVacios.length > 0) {
    errores.push(`La fila de encabezados contiene columnas sin nombre en la posición: ${indicesVacios.join(', ')}.`);
  }

  // 2. Verificar columnas faltantes (insensible a mayúsculas para diagnóstico, luego estricto)
  const encontradosLower = encontrados.map(c => c.toLowerCase());
  const faltantes = esperadas.filter(col => !encontradosLower.includes(col));
  if (faltantes.length > 0) {
    errores.push(`Faltan columnas obligatorias: ${faltantes.map(c => `"${c}"`).join(', ')}.`);
  }

  // 3. Verificar nombres desconocidos dentro de las primeras 6 columnas
  const desconocidas = encontrados.filter(col => col !== '' && !esperadas.includes(col.toLowerCase()));
  if (desconocidas.length > 0) {
    errores.push(`Se encontraron columnas con nombres no permitidos: ${desconocidas.map(c => `"${c}"`).join(', ')}.`);
  }

  // 4. Verificar diferencias de mayúsculas/minúsculas en nombres conocidos
  const erroresMayusculas = encontrados.filter(col =>
    esperadas.includes(col.toLowerCase()) && !esperadas.includes(col)
  );
  if (erroresMayusculas.length > 0) {
    errores.push(
      `Los nombres de las columnas deben estar exactamente en minúsculas: ${erroresMayusculas.map(c => `"${c}" → "${c.toLowerCase()}"`).join(', ')}.`
    );
  }

  // 5. Verificar orden exacto posición por posición en las 6 columnas requeridas
  const coincideExactamente =
    encontrados.length === esperadas.length &&
    esperadas.every((col, idx) => encontrados[idx] === col);

  if (!coincideExactamente && errores.length === 0) {
    const desordenadas = [];
    esperadas.forEach((colEsperada, idx) => {
      if (encontrados[idx] !== colEsperada) {
        desordenadas.push(`Posición ${idx + 1}: se encontró "${encontrados[idx] || '(vacío)'}" pero se esperaba "${colEsperada}"`);
      }
    });
    errores.push(`El orden de las columnas no es el requerido (${desordenadas.join('; ')}).`);
  }

  return {
    valido: coincideExactamente && errores.length === 0,
    encontrados,
    errores
  };
}

function analizarYValidarContenidoCSV(contenido, archivo) {
  if (!contenido || !contenido.trim()) {
    mostrarMensajeEstadoSupabase(
      'El archivo CSV no contiene datos legibles. Verifique que no esté en blanco.',
      'error'
    );
    return;
  }

  const { delimitador, filas } = parsearTextoCSV(contenido);
  const totalColumnasRequeridas = SUPABASE_ESTUDIANTES_CONFIG.columnasObligatorias.length;
  estadoImportacionSupabase.delimitadorDetectado = delimitador;
  mostrarInfoArchivoSeleccionado(archivo, delimitador);

  // Filtrar líneas completamente vacías al final del archivo (evaluando las primeras 6 columnas)
  while (
    filas.length > 0 &&
    filas[filas.length - 1].celdas
      .slice(0, totalColumnasRequeridas)
      .every(c => String(c ?? '').trim() === '')
  ) {
    filas.pop();
  }

  if (filas.length === 0) {
    mostrarMensajeEstadoSupabase('El archivo CSV no contiene filas.', 'error');
    return;
  }

  // Validar primera fila (encabezados) tomando solo las primeras 6 columnas
  const filaEncabezados = filas[0];
  const resultadoEncabezados = validarEncabezadosCSV(filaEncabezados.celdas);
  estadoImportacionSupabase.encabezadosEncontrados = resultadoEncabezados.encontrados;
  estadoImportacionSupabase.encabezadosValidos = resultadoEncabezados.valido;
  estadoImportacionSupabase.erroresEncabezado = resultadoEncabezados.errores;

  actualizarIndicadoresColumnasEsperadas(resultadoEncabezados.encontrados);

  if (!resultadoEncabezados.valido) {
    renderizarErrorEncabezadosSupabase(resultadoEncabezados);
    return;
  }

  // Verificar que existan filas de datos además del encabezado
  const filasDatos = filas.slice(1);
  if (filasDatos.length === 0) {
    mostrarMensajeEstadoSupabase(
      'Los encabezados del archivo son correctos, pero el CSV no contiene ningún registro de estudiantes debajo de la primera fila.',
      'error'
    );
    return;
  }

  // Analizar cada fila de datos (tomando únicamente las primeras 6 columnas)
  const filasParseadas = [];
  const registrosValidos = [];
  const observaciones = [];
  const mapaDocumentosVistos = new Map(); // documento -> primera fila donde apareció

  let conteoFilasVacias = 0;
  const conteoCamposVacios = {
    documento: 0,
    nombre: 0,
    facultad: 0,
    programa: 0,
    sede: 0,
    semestre: 0
  };
  let conteoDocumentosDuplicados = 0;
  let conteoSemestreNoNumerico = 0;
  let conteoSemestreFueraRango = 0;
  let conteoFilasMalCodificadas = 0;

  filasDatos.forEach(itemFila => {
    const numFila = itemFila.numeroFila;
    const celdas = itemFila.celdas.slice(0, totalColumnasRequeridas);

    // Verificar si las primeras 6 columnas de la fila están en blanco en medio del archivo
    if (celdas.every(c => String(c ?? '').trim() === '')) {
      const msg = 'Fila completamente vacía dentro del archivo.';
      conteoFilasVacias++;
      filasParseadas.push({
        numeroFila: numFila,
        documento: '',
        nombre: '',
        facultad: '',
        programa: '',
        sede: '',
        semestre: '',
        esValida: false,
        erroresFila: [msg]
      });
      return;
    }

    const erroresFila = [];

    const documento = String(celdas[0] ?? '').trim();
    const nombre = String(celdas[1] ?? '').trim();
    const facultad = String(celdas[2] ?? '').trim();
    const programa = String(celdas[3] ?? '').trim();
    const sede = String(celdas[4] ?? '').trim();
    const semestreRaw = String(celdas[5] ?? '').trim();

    if (
      nombre.includes('\uFFFD') ||
      facultad.includes('\uFFFD') ||
      programa.includes('\uFFFD') ||
      sede.includes('\uFFFD')
    ) {
      conteoFilasMalCodificadas++;
    }

    // Validar campos obligatorios no vacíos
    const valoresPorColumna = {
      documento,
      nombre,
      facultad,
      programa,
      sede,
      semestre: semestreRaw
    };

    SUPABASE_ESTUDIANTES_CONFIG.columnasObligatorias.forEach(col => {
      if (!valoresPorColumna[col]) {
        conteoCamposVacios[col]++;
        erroresFila.push(`El campo obligatorio "${col}" está vacío.`);
      }
    });

    // Validar unicidad de documento dentro del CSV
    if (documento) {
      if (mapaDocumentosVistos.has(documento)) {
        const filaPrevia = mapaDocumentosVistos.get(documento);
        conteoDocumentosDuplicados++;
        erroresFila.push(
          `Documento "${documento}" duplicado en el CSV (ya fue registrado en la fila ${filaPrevia}).`
        );
      } else {
        mapaDocumentosVistos.set(documento, numFila);
      }
    }

    // Validar que semestre sea un entero positivo válido
    let semestreNumero = null;
    if (semestreRaw) {
      if (!/^\d+$/.test(semestreRaw)) {
        conteoSemestreNoNumerico++;
        erroresFila.push(
          `El campo "semestre" debe ser un número entero válido (se encontró "${semestreRaw}").`
        );
      } else {
        semestreNumero = parseInt(semestreRaw, 10);
        if (semestreNumero < 1 || semestreNumero > 20) {
          conteoSemestreFueraRango++;
          erroresFila.push(
            `El valor de "semestre" (${semestreNumero}) está fuera del rango esperado (1 a 20).`
          );
        }
      }
    }

    const esValida = erroresFila.length === 0;

    if (esValida) {
      // Estructura exacta para la tabla public.estudiantes
      registrosValidos.push({
        documento: documento,
        nombre: nombre,
        facultad: facultad,
        programa: programa,
        sede: sede,
        semestre: semestreNumero
      });
    }

    filasParseadas.push({
      numeroFila: numFila,
      documento,
      nombre,
      facultad,
      programa,
      sede,
      semestre: semestreRaw,
      esValida,
      erroresFila
    });
  });

  if (conteoFilasMalCodificadas > 0) {
    observaciones.push({
      tipo: 'Advertencia UTF-8',
      mensaje: `Se detectaron caracteres especiales mal codificados () en ${conteoFilasMalCodificadas} ${conteoFilasMalCodificadas === 1 ? 'fila' : 'filas'}. Se recomienda guardar el archivo como "CSV UTF-8 (delimitado por comas)" antes de importar.`
    });
  }

  if (conteoFilasVacias > 0) {
    observaciones.push({
      tipo: 'Fila vacía',
      mensaje: `Se encontraron ${conteoFilasVacias} ${conteoFilasVacias === 1 ? 'fila completamente vacía' : 'filas completamente vacías'} dentro del archivo.`
    });
  }

  SUPABASE_ESTUDIANTES_CONFIG.columnasObligatorias.forEach(col => {
    const cantidad = conteoCamposVacios[col];
    if (cantidad > 0) {
      observaciones.push({
        tipo: 'Campo vacío',
        mensaje: `El campo obligatorio "${col}" está vacío en ${cantidad} ${cantidad === 1 ? 'fila' : 'filas'}.`
      });
    }
  });

  if (conteoDocumentosDuplicados > 0) {
    observaciones.push({
      tipo: 'Documento duplicado',
      mensaje: `Se encontraron documentos duplicados en ${conteoDocumentosDuplicados} ${conteoDocumentosDuplicados === 1 ? 'fila' : 'filas'}.`
    });
  }

  if (conteoSemestreNoNumerico > 0) {
    observaciones.push({
      tipo: 'Semestre inválido',
      mensaje: `El campo "semestre" no es un número entero válido en ${conteoSemestreNoNumerico} ${conteoSemestreNoNumerico === 1 ? 'fila' : 'filas'}.`
    });
  }

  if (conteoSemestreFueraRango > 0) {
    observaciones.push({
      tipo: 'Semestre fuera de rango',
      mensaje: `El valor de "semestre" está fuera del rango esperado (1 a 20) en ${conteoSemestreFueraRango} ${conteoSemestreFueraRango === 1 ? 'fila' : 'filas'}.`
    });
  }

  estadoImportacionSupabase.totalFilasLeidas = filasParseadas.length;
  estadoImportacionSupabase.filasParseadas = filasParseadas;
  estadoImportacionSupabase.registrosValidos = registrosValidos;
  estadoImportacionSupabase.observaciones = observaciones;

  renderizarResultadoExitosoValidacion();
}

// ── Renderizado de Interfaz ─────────────────────────────────────────────────

function mostrarInfoArchivoSeleccionado(archivo, delimitador) {
  const contenedor = document.getElementById('supabaseArchivoInfo');
  const nombreEl = document.getElementById('supabaseArchivoNombre');
  const metaEl = document.getElementById('supabaseArchivoMeta');

  if (!contenedor || !nombreEl || !metaEl) return;

  const tamanoKB = (archivo.size / 1024).toFixed(1);
  const textoDelimitador = delimitador
    ? ` • Delimitador detectado: "${delimitador === ';' ? '; (punto y coma)' : ', (coma)'}"`
    : '';

  nombreEl.textContent = archivo.name;
  metaEl.textContent = `${tamanoKB} KB${textoDelimitador}`;
  mostrarElementoSupabase('supabaseArchivoInfo');
}

function restaurarIndicadoresColumnasEsperadas() {
  const pills = document.querySelectorAll('#supabaseColumnasPills .supabase-col-pill');
  pills.forEach(pill => {
    pill.classList.remove('col-ok', 'col-error');
  });
}

function actualizarIndicadoresColumnasEsperadas(encontrados) {
  const esperadas = SUPABASE_ESTUDIANTES_CONFIG.columnasObligatorias;
  const pills = document.querySelectorAll('#supabaseColumnasPills .supabase-col-pill');

  pills.forEach((pill, idx) => {
    pill.classList.remove('col-ok', 'col-error');
    const colEsperada = esperadas[idx];
    const colEncontrada = encontrados[idx];

    if (colEncontrada === colEsperada) {
      pill.classList.add('col-ok');
    } else {
      pill.classList.add('col-error');
    }
  });
}

function renderizarErrorEncabezadosSupabase(resultadoEncabezados) {
  const encontradasTexto = resultadoEncabezados.encontrados.length > 0
    ? resultadoEncabezados.encontrados.map(c => c || '(vacío)').join(', ')
    : 'Ninguna columna detectada';

  const listaErroresHtml = resultadoEncabezados.errores
    .map(err => `<li>${escapeHtmlAdmin(err)}</li>`)
    .join('');

  const contenedorMsg = document.getElementById('supabaseMensajeValidacion');
  if (contenedorMsg) {
    contenedorMsg.className = 'mensaje error supabase-mensaje-bloque';
    contenedorMsg.innerHTML = `
      <div class="supabase-error-header">
        <strong>El archivo CSV no cumple con la estructura de columnas obligatorias</strong>
      </div>
      <ul class="supabase-error-list">${listaErroresHtml}</ul>
      <div class="supabase-comparacion-columnas">
        <div><strong>Encabezados requeridos (en orden):</strong> <code>documento, nombre, facultad, programa, sede, semestre</code></div>
        <div style="margin-top:4px;"><strong>Encabezados encontrados en el archivo:</strong> <code>${escapeHtmlAdmin(encontradasTexto)}</code></div>
      </div>
    `;
    contenedorMsg.classList.remove('hidden');
  }

  ocultarElementoSupabase('supabaseResultadoValidacion');
  ocultarElementoSupabase('supabaseSeccionConfirmacion');
}

function renderizarResultadoExitosoValidacion() {
  const total = estadoImportacionSupabase.totalFilasLeidas;
  const validas = estadoImportacionSupabase.registrosValidos.length;
  const conError = total - validas;
  const totalObservaciones = estadoImportacionSupabase.observaciones.length;

  if (conError === 0 && totalObservaciones === 0) {
    mostrarMensajeEstadoSupabase(
      `Archivo CSV validado correctamente. Los 6 encabezados coinciden y las ${validas.toLocaleString('es-CO')} filas son válidas para la tabla public.estudiantes.`,
      'success'
    );
  } else if (validas > 0) {
    mostrarMensajeEstadoSupabase(
      `Archivo CSV con encabezados válidos. Se identificaron ${validas.toLocaleString('es-CO')} filas válidas y ${totalObservaciones.toLocaleString('es-CO')} observación(es) que debe revisar antes de una futura importación.`,
      'warning'
    );
  } else {
    mostrarMensajeEstadoSupabase(
      `Los encabezados son correctos, pero ninguna de las ${total.toLocaleString('es-CO')} filas cumplió las validaciones requeridas. Revise las observaciones detalladas.`,
      'error'
    );
  }

  // Actualizar tarjetas de resumen
  const elTotal = document.getElementById('statSupabaseTotalFilas');
  const elValidas = document.getElementById('statSupabaseFilasValidas');
  const elObservaciones = document.getElementById('statSupabaseObservaciones');

  if (elTotal) elTotal.textContent = total.toLocaleString('es-CO');
  if (elValidas) elValidas.textContent = validas.toLocaleString('es-CO');
  if (elObservaciones) elObservaciones.textContent = totalObservaciones.toLocaleString('es-CO');

  renderizarPanelObservacionesSupabase();

  mostrarElementoSupabase('supabaseResultadoValidacion');
  mostrarElementoSupabase('supabaseSeccionConfirmacion');

  // Preparación sección de confirmación futura
  const resumenReemplazo = document.getElementById('supabaseResumenReemplazoTexto');
  if (resumenReemplazo) {
    resumenReemplazo.innerHTML = `
      Archivo preparado: <strong>${escapeHtmlAdmin(estadoImportacionSupabase.archivo?.name || 'archivo.csv')}</strong>
    `;
  }
}

function renderizarPanelObservacionesSupabase() {
  const contenedor = document.getElementById('supabaseContenedorObservaciones');
  const cuerpo = document.getElementById('supabaseListaObservaciones');
  const contador = document.getElementById('supabaseContadorObservaciones');

  if (!contenedor || !cuerpo) return;

  const observaciones = estadoImportacionSupabase.observaciones;
  if (!observaciones || observaciones.length === 0) {
    contenedor.classList.add('hidden');
    cuerpo.innerHTML = '';
    return;
  }

  if (contador) {
    contador.textContent = `${observaciones.length} observación${observaciones.length === 1 ? '' : 'es'} encontrada${observaciones.length === 1 ? '' : 's'}`;
  }

  const items = observaciones.map(obs => `
    <div class="supabase-obs-item">
      <span class="supabase-obs-msg">${escapeHtmlAdmin(obs.mensaje)}</span>
    </div>
  `).join('');

  cuerpo.innerHTML = items;
  contenedor.classList.remove('hidden');
}

// ── Utilidades de UI del Módulo ─────────────────────────────────────────────

function mostrarMensajeEstadoSupabase(texto, tipo) {
  const contenedor = document.getElementById('supabaseMensajeValidacion');
  if (!contenedor) return;

  if (!texto) {
    contenedor.className = 'mensaje hidden';
    contenedor.innerHTML = '';
    return;
  }

  const claseTipo = tipo === 'error' ? 'error' : tipo === 'warning' ? 'warning' : 'success';
  contenedor.className = `mensaje ${claseTipo} supabase-mensaje-bloque`;
  contenedor.textContent = texto;
  contenedor.classList.remove('hidden');
}

function mostrarElementoSupabase(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function ocultarElementoSupabase(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// ============================================================================
// ESTRUCTURA PREPARADA PARA LA FUTURA OPERACIÓN EN SUPABASE (DESACTIVADA)
// ============================================================================
// Importante: En esta primera etapa NO se debe eliminar, insertar, actualizar
// ni modificar ningún registro en `public.estudiantes`.
// El siguiente bloque conserva el diseño arquitectónico previsto para cuando
// se habilite la etapa de reemplazo en base de datos.
// ============================================================================

function obtenerPayloadEstudiantesParaSupabase() {
  if (!estadoImportacionSupabase.encabezadosValidos) {
    throw new Error('Los encabezados del archivo CSV no han sido validados.');
  }
  if (estadoImportacionSupabase.observaciones.length > 0) {
    throw new Error('El archivo CSV contiene observaciones pendientes de corregir.');
  }
  if (estadoImportacionSupabase.registrosValidos.length === 0) {
    throw new Error('No hay registros válidos para importar en public.estudiantes.');
  }

  // Retorna copia inmutable con las 6 columnas exactas de public.estudiantes
  return estadoImportacionSupabase.registrosValidos.map(est => ({
    documento: String(est.documento).trim(),
    nombre: String(est.nombre).trim(),
    facultad: String(est.facultad).trim(),
    programa: String(est.programa).trim(),
    sede: String(est.sede).trim(),
    semestre: Number(est.semestre)
  }));
}

async function solicitarReemplazoEstudiantesSupabase() {
  // Guardia de seguridad de Etapa 1: impide cualquier ejecución sobre la base de datos.
  if (!SUPABASE_ESTUDIANTES_CONFIG.escrituraHabilitadaEnEstaEtapa) {
    alert('Etapa de preparación: La escritura y reemplazo de datos en Supabase se encuentra desactivada en esta versión.');
    return;
  }

  /*
   * ESPECIFICACIÓN PARA IMPLEMENTACIÓN FUTURA:
   * ------------------------------------------
   * 1. Verificar que `estadoImportacionSupabase.encabezadosValidos === true`,
   *    que no existan errores en filas y que el checkbox de confirmación
   *    expresa (`#chkConfirmarReemplazoSupabase`) esté marcado.
   * 2. Abrir `mostrarModalConfirmacion(...)` solicitando confirmación final
   *    al administrador antes de ejecutar la operación destructiva.
   * 3. Ejecutar `ejecutarReemplazoEstudiantesEnSupabase(payload)`:
   *    a) Eliminar todos los registros actuales de `public.estudiantes`.
   *    b) Insertar por lotes los registros de `payload` en `public.estudiantes`.
   *    c) Informar en pantalla si la operación finalizó correctamente o si
   *       se produjo algún error.
   */
}
