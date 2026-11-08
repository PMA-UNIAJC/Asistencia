// ============================================================================
// MÓDULO: Importación CSV de Grupos para Supabase (diagnosticos.grupos)
// Ubicación: Admin/Panel/js/grupos.js
//
// FUNCIONAMIENTO (Misma lectura y validación que Admin/Panel/js/supabase.js):
//   1. Permite seleccionar o arrastrar un archivo CSV desde el equipo.
//   2. Valida estrictamente los 2 primeros encabezados obligatorios y su orden exacto:
//      sede, grupo
//      (si existen más columnas después de la segunda, se ignoran).
//   3. Analiza las filas localmente y detecta observaciones (filas vacías,
//      campos vacíos, sedes no válidas, grupos duplicados dentro de la misma sede,
//      caracteres mal codificados).
//   4. Confirmación expresa del administrador (checkbox + modal de confirmación).
//   5. Reemplazo total de la tabla diagnosticos.grupos con los datos del CSV.
// ============================================================================

const SUPABASE_GRUPOS_CONFIG = Object.freeze({
  esquema: 'diagnosticos',
  tabla: 'grupos',
  columnasObligatorias: Object.freeze([
    'sede',
    'grupo'
  ]),
  sedesPermitidas: Object.freeze([
    'NORTE',
    'SUR',
    'VIRTUAL',
    'LADERA',
    'NUEVO LATIR'
  ])
});

// Estado en memoria de la importación actual de grupos
const estadoImportacionGrupos = {
  archivo: null,
  delimitadorDetectado: ',',
  encabezadosEncontrados: [],
  encabezadosValidos: false,
  erroresEncabezado: [],
  totalFilasLeidas: 0,
  filasParseadas: [],
  registrosValidos: [],     // Objetos listos con la estructura exacta { sede, grupo }
  observaciones: [],        // Lista de observaciones agregadas { tipo, mensaje }
  reemplazando: false
};

// ── Inicialización de eventos Drag & Drop y Selector ────────────────────────

function inicializarSeccionGrupos() {
  const dropzone = document.getElementById('gruposDropzone');
  const inputArchivo = document.getElementById('inputArchivoCSVGrupos');

  if (!dropzone || dropzone.dataset.inicializado === 'true') return;
  dropzone.dataset.inicializado = 'true';

  dropzone.addEventListener('click', function (e) {
    if (e.target.closest('#btnQuitarArchivoGrupos')) {
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
      procesarArchivoSeleccionadoGrupos(archivos[0]);
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  inicializarSeccionGrupos();
});

// ── Manejo de Selección y Limpieza de Archivo ───────────────────────────────

function manejarCambioArchivoCSVGrupos(event) {
  if (estadoImportacionGrupos.reemplazando) return;
  const archivo = event.target?.files?.[0];
  if (!archivo) return;
  procesarArchivoSeleccionadoGrupos(archivo);
}

function limpiarImportacionGrupos(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (estadoImportacionGrupos.reemplazando) return;

  estadoImportacionGrupos.archivo = null;
  estadoImportacionGrupos.delimitadorDetectado = ',';
  estadoImportacionGrupos.encabezadosEncontrados = [];
  estadoImportacionGrupos.encabezadosValidos = false;
  estadoImportacionGrupos.erroresEncabezado = [];
  estadoImportacionGrupos.totalFilasLeidas = 0;
  estadoImportacionGrupos.filasParseadas = [];
  estadoImportacionGrupos.registrosValidos = [];
  estadoImportacionGrupos.observaciones = [];

  const inputArchivo = document.getElementById('inputArchivoCSVGrupos');
  if (inputArchivo) inputArchivo.value = '';

  const chkConfirmar = document.getElementById('chkConfirmarReemplazoGrupos');
  const lblConfirmar = document.getElementById('lblConfirmarReemplazoGrupos');
  const btnReemplazar = document.getElementById('btnEjecutarReemplazoGrupos');
  if (chkConfirmar) {
    chkConfirmar.checked = false;
    chkConfirmar.disabled = true;
  }
  if (lblConfirmar) {
    lblConfirmar.classList.remove('supabase-confirm-check-activo');
  }
  if (btnReemplazar) {
    btnReemplazar.disabled = true;
    btnReemplazar.textContent = 'Reemplazar registros en diagnosticos.grupos';
  }

  ocultarElementoGrupos('gruposArchivoInfo');
  ocultarElementoGrupos('gruposResultadoValidacion');
  ocultarElementoGrupos('gruposSeccionConfirmacion');
  mostrarMensajeEstadoGrupos('', '');
  mostrarMensajeReemplazoGrupos('', '');
  restaurarIndicadoresColumnasGrupos();
}

function procesarArchivoSeleccionadoGrupos(archivo) {
  if (estadoImportacionGrupos.reemplazando) return;
  limpiarImportacionGrupos();

  // 1. Validar extensión y tipo de archivo
  const nombreArchivo = archivo.name || '';
  const esExtensionCSV = /\.csv$/i.test(nombreArchivo);

  if (!esExtensionCSV) {
    mostrarMensajeEstadoGrupos(
      `El archivo seleccionado ("${nombreArchivo}") no es un archivo CSV válido. Por favor seleccione un archivo con extensión .csv.`,
      'error'
    );
    return;
  }

  if (archivo.size === 0) {
    mostrarMensajeEstadoGrupos(
      `El archivo "${nombreArchivo}" está vacío (0 bytes). Seleccione un archivo CSV que contenga los encabezados y registros de grupos.`,
      'error'
    );
    return;
  }

  estadoImportacionGrupos.archivo = archivo;
  mostrarInfoArchivoSeleccionadoGrupos(archivo, null);

  const lector = new FileReader();
  lector.onload = function (e) {
    const contenido = typeof e.target?.result === 'string' ? e.target.result : '';
    analizarYValidarContenidoCSVGrupos(contenido, archivo);
  };
  lector.onerror = function () {
    mostrarMensajeEstadoGrupos(
      'No fue posible leer el archivo seleccionado. Verifique que el archivo no esté dañado o bloqueado por otro programa.',
      'error'
    );
  };
  lector.readAsText(archivo, 'UTF-8');
}

// ── Parser CSV (Reutiliza parsearTextoCSV de Admin/Panel/js/supabase.js) ────

function parsearContenidoCSVGrupos(textoOriginal) {
  if (typeof parsearTextoCSV === 'function') {
    return parsearTextoCSV(textoOriginal);
  }

  // Respaldo idéntico en caso de que supabase.js no esté cargado
  const texto = String(textoOriginal ?? '').replace(/^\uFEFF/, '');
  const indiceSalto = texto.search(/\r?\n/);
  const primeraLinea = indiceSalto === -1 ? texto : texto.slice(0, indiceSalto);

  let dentroComillas = false;
  let conteoComas = 0;
  let conteoPuntoYComa = 0;
  for (let i = 0; i < primeraLinea.length; i++) {
    const char = primeraLinea[i];
    if (char === '"') {
      if (dentroComillas && primeraLinea[i + 1] === '"') i++;
      else dentroComillas = !dentroComillas;
    } else if (!dentroComillas) {
      if (char === ',') conteoComas++;
      else if (char === ';') conteoPuntoYComa++;
    }
  }
  const delimitador = conteoPuntoYComa > conteoComas ? ';' : ',';

  const filas = [];
  let filaActual = [];
  let celdaActual = '';
  let enComillas = false;
  let numeroLinea = 1;
  let inicioFilaLinea = 1;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const sig = texto[i + 1];

    if (char === '"') {
      if (enComillas && sig === '"') {
        celdaActual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (char === delimitador && !enComillas) {
      filaActual.push(celdaActual);
      celdaActual = '';
    } else if ((char === '\r' || char === '\n') && !enComillas) {
      if (char === '\r' && sig === '\n') i++;
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

  if (celdaActual.length > 0 || filaActual.length > 0) {
    filaActual.push(celdaActual);
    filas.push({ numeroFila: inicioFilaLinea, celdas: filaActual });
  }

  return { delimitador, filas };
}

// ── Validación de Encabezados y Filas ───────────────────────────────────────

function normalizarSedeCSVGrupos(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizarNombreGrupoCSV(valor) {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function validarEncabezadosCSVGrupos(encabezadosCrudos) {
  const esperadas = SUPABASE_GRUPOS_CONFIG.columnasObligatorias;
  // Tomar únicamente las primeras 2 columnas requeridas; cualquier columna después de la segunda se ignora
  const encontrados = encabezadosCrudos
    .slice(0, esperadas.length)
    .map(h => String(h ?? '').trim());
  const errores = [];

  // 1. Verificar columnas vacías dentro de las primeras 2 posiciones presentes
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

  // 3. Verificar nombres desconocidos dentro de las primeras 2 columnas
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

  // 5. Verificar orden exacto posición por posición en las 2 columnas requeridas
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

function analizarYValidarContenidoCSVGrupos(contenido, archivo) {
  if (!contenido || !contenido.trim()) {
    mostrarMensajeEstadoGrupos(
      'El archivo CSV no contiene datos legibles. Verifique que no esté en blanco.',
      'error'
    );
    return;
  }

  const { delimitador, filas } = parsearContenidoCSVGrupos(contenido);
  const totalColumnasRequeridas = SUPABASE_GRUPOS_CONFIG.columnasObligatorias.length;
  estadoImportacionGrupos.delimitadorDetectado = delimitador;
  mostrarInfoArchivoSeleccionadoGrupos(archivo, delimitador);

  // Filtrar líneas completamente vacías al final del archivo (evaluando las primeras 2 columnas)
  while (
    filas.length > 0 &&
    filas[filas.length - 1].celdas
      .slice(0, totalColumnasRequeridas)
      .every(c => String(c ?? '').trim() === '')
  ) {
    filas.pop();
  }

  if (filas.length === 0) {
    mostrarMensajeEstadoGrupos('El archivo CSV no contiene filas.', 'error');
    return;
  }

  // Validar primera fila (encabezados) tomando solo las primeras 2 columnas
  const filaEncabezados = filas[0];
  const resultadoEncabezados = validarEncabezadosCSVGrupos(filaEncabezados.celdas);
  estadoImportacionGrupos.encabezadosEncontrados = resultadoEncabezados.encontrados;
  estadoImportacionGrupos.encabezadosValidos = resultadoEncabezados.valido;
  estadoImportacionGrupos.erroresEncabezado = resultadoEncabezados.errores;

  actualizarIndicadoresColumnasGrupos(resultadoEncabezados.encontrados);

  if (!resultadoEncabezados.valido) {
    renderizarErrorEncabezadosGrupos(resultadoEncabezados);
    return;
  }

  // Verificar que existan filas de datos además del encabezado
  const filasDatos = filas.slice(1);
  if (filasDatos.length === 0) {
    mostrarMensajeEstadoGrupos(
      'Los encabezados del archivo son correctos, pero el CSV no contiene ningún registro de grupos debajo de la primera fila.',
      'error'
    );
    return;
  }

  // Analizar cada fila de datos (tomando únicamente las primeras 2 columnas)
  const filasParseadas = [];
  const registrosValidos = [];
  const observaciones = [];
  const mapaGruposVistos = new Map(); // "SEDE||GRUPO" -> primera fila donde apareció

  let conteoFilasVacias = 0;
  const conteoCamposVacios = {
    sede: 0,
    grupo: 0
  };
  let conteoSedesInvalidas = 0;
  let conteoGruposDuplicados = 0;
  let conteoFilasMalCodificadas = 0;

  filasDatos.forEach(itemFila => {
    const numFila = itemFila.numeroFila;
    const celdas = itemFila.celdas.slice(0, totalColumnasRequeridas);

    // Verificar si las primeras 2 columnas de la fila están en blanco en medio del archivo
    if (celdas.every(c => String(c ?? '').trim() === '')) {
      const msg = 'Fila completamente vacía dentro del archivo.';
      conteoFilasVacias++;
      filasParseadas.push({
        numeroFila: numFila,
        sede: '',
        grupo: '',
        esValida: false,
        erroresFila: [msg]
      });
      return;
    }

    const erroresFila = [];

    const sedeRaw = String(celdas[0] ?? '').trim();
    const grupoRaw = String(celdas[1] ?? '').trim();

    if (sedeRaw.includes('\uFFFD') || grupoRaw.includes('\uFFFD')) {
      conteoFilasMalCodificadas++;
    }

    // Validar campos obligatorios no vacíos
    const valoresPorColumna = {
      sede: sedeRaw,
      grupo: grupoRaw
    };

    SUPABASE_GRUPOS_CONFIG.columnasObligatorias.forEach(col => {
      if (!valoresPorColumna[col]) {
        conteoCamposVacios[col]++;
        erroresFila.push(`El campo obligatorio "${col}" está vacío.`);
      }
    });

    const sedeNorm = normalizarSedeCSVGrupos(sedeRaw);
    const grupoNorm = normalizarNombreGrupoCSV(grupoRaw);

    // Validar que la sede pertenezca al catálogo permitido
    if (sedeRaw && !SUPABASE_GRUPOS_CONFIG.sedesPermitidas.includes(sedeNorm)) {
      conteoSedesInvalidas++;
      erroresFila.push(
        `La sede "${sedeRaw}" no es válida (permitidas: ${SUPABASE_GRUPOS_CONFIG.sedesPermitidas.join(', ')}).`
      );
    }

    // Validar unicidad de (sede, grupo) dentro del CSV
    if (sedeNorm && grupoNorm && SUPABASE_GRUPOS_CONFIG.sedesPermitidas.includes(sedeNorm)) {
      const claveUnica = `${sedeNorm}||${grupoNorm}`;
      if (mapaGruposVistos.has(claveUnica)) {
        const filaPrevia = mapaGruposVistos.get(claveUnica);
        conteoGruposDuplicados++;
        erroresFila.push(
          `El grupo "${grupoNorm}" en la sede "${sedeNorm}" está duplicado en el CSV (ya fue registrado en la fila ${filaPrevia}).`
        );
      } else {
        mapaGruposVistos.set(claveUnica, numFila);
      }
    }

    const esValida = erroresFila.length === 0;

    if (esValida) {
      // Estructura exacta para la tabla diagnosticos.grupos (columnas sede y grupo; id se autogenera)
      registrosValidos.push({
        sede: sedeNorm,
        grupo: grupoNorm
      });
    }

    filasParseadas.push({
      numeroFila: numFila,
      sede: sedeNorm,
      grupo: grupoNorm,
      esValida,
      erroresFila
    });
  });

  if (conteoFilasMalCodificadas > 0) {
    observaciones.push({
      tipo: 'Advertencia UTF-8',
      mensaje: `Se detectaron caracteres especiales mal codificados (\uFFFD) en ${conteoFilasMalCodificadas} ${conteoFilasMalCodificadas === 1 ? 'fila' : 'filas'}. Se recomienda guardar el archivo como "CSV UTF-8 (delimitado por comas)" antes de importar.`
    });
  }

  if (conteoFilasVacias > 0) {
    observaciones.push({
      tipo: 'Fila vacía',
      mensaje: `Se encontraron ${conteoFilasVacias} ${conteoFilasVacias === 1 ? 'fila completamente vacía' : 'filas completamente vacías'} dentro del archivo.`
    });
  }

  SUPABASE_GRUPOS_CONFIG.columnasObligatorias.forEach(col => {
    const cantidad = conteoCamposVacios[col];
    if (cantidad > 0) {
      observaciones.push({
        tipo: 'Campo vacío',
        mensaje: `El campo obligatorio "${col}" está vacío en ${cantidad} ${cantidad === 1 ? 'fila' : 'filas'}.`
      });
    }
  });

  if (conteoSedesInvalidas > 0) {
    observaciones.push({
      tipo: 'Sede inválida',
      mensaje: `El campo "sede" contiene valores no admitidos en ${conteoSedesInvalidas} ${conteoSedesInvalidas === 1 ? 'fila' : 'filas'} (sedes válidas: ${SUPABASE_GRUPOS_CONFIG.sedesPermitidas.join(', ')}).`
    });
  }

  if (conteoGruposDuplicados > 0) {
    observaciones.push({
      tipo: 'Grupo duplicado',
      mensaje: `Se encontraron grupos duplicados dentro de una misma sede en ${conteoGruposDuplicados} ${conteoGruposDuplicados === 1 ? 'fila' : 'filas'}.`
    });
  }

  estadoImportacionGrupos.totalFilasLeidas = filasParseadas.length;
  estadoImportacionGrupos.filasParseadas = filasParseadas;
  estadoImportacionGrupos.registrosValidos = registrosValidos;
  estadoImportacionGrupos.observaciones = observaciones;

  renderizarResultadoExitosoValidacionGrupos();
}

// ── Renderizado de Interfaz ─────────────────────────────────────────────────

function mostrarInfoArchivoSeleccionadoGrupos(archivo, delimitador) {
  const contenedor = document.getElementById('gruposArchivoInfo');
  const nombreEl = document.getElementById('gruposArchivoNombre');
  const metaEl = document.getElementById('gruposArchivoMeta');

  if (!contenedor || !nombreEl || !metaEl) return;

  const tamanoKB = (archivo.size / 1024).toFixed(1);
  const textoDelimitador = delimitador
    ? ` • Delimitador detectado: "${delimitador === ';' ? '; (punto y coma)' : ', (coma)'}"`
    : '';

  nombreEl.textContent = archivo.name;
  metaEl.textContent = `${tamanoKB} KB${textoDelimitador}`;
  mostrarElementoGrupos('gruposArchivoInfo');
}

function restaurarIndicadoresColumnasGrupos() {
  const pills = document.querySelectorAll('#gruposColumnasPills .supabase-col-pill');
  pills.forEach(pill => {
    pill.classList.remove('col-ok', 'col-error');
  });
}

function actualizarIndicadoresColumnasGrupos(encontrados) {
  const esperadas = SUPABASE_GRUPOS_CONFIG.columnasObligatorias;
  const pills = document.querySelectorAll('#gruposColumnasPills .supabase-col-pill');

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

function renderizarErrorEncabezadosGrupos(resultadoEncabezados) {
  const encontradasTexto = resultadoEncabezados.encontrados.length > 0
    ? resultadoEncabezados.encontrados.map(c => c || '(vacío)').join(', ')
    : 'Ninguna columna detectada';

  const listaErroresHtml = resultadoEncabezados.errores
    .map(err => `<li>${escapeHtmlAdmin(err)}</li>`)
    .join('');

  const contenedorMsg = document.getElementById('gruposMensajeValidacion');
  if (contenedorMsg) {
    contenedorMsg.className = 'mensaje error supabase-mensaje-bloque';
    contenedorMsg.innerHTML = `
      <div class="supabase-error-header">
        <strong>El archivo CSV no cumple con la estructura de columnas obligatorias</strong>
      </div>
      <ul class="supabase-error-list">${listaErroresHtml}</ul>
      <div class="supabase-comparacion-columnas">
        <div><strong>Encabezados requeridos (en orden):</strong> <code>sede, grupo</code></div>
        <div style="margin-top:4px;"><strong>Encabezados encontrados en el archivo:</strong> <code>${escapeHtmlAdmin(encontradasTexto)}</code></div>
      </div>
    `;
    contenedorMsg.classList.remove('hidden');
  }

  ocultarElementoGrupos('gruposResultadoValidacion');
  ocultarElementoGrupos('gruposSeccionConfirmacion');
}

function renderizarResultadoExitosoValidacionGrupos() {
  const total = estadoImportacionGrupos.totalFilasLeidas;
  const validas = estadoImportacionGrupos.registrosValidos.length;
  const conError = total - validas;
  const totalObservaciones = estadoImportacionGrupos.observaciones.length;

  if (conError === 0 && totalObservaciones === 0) {
    mostrarMensajeEstadoGrupos(
      `Archivo CSV validado correctamente. Los 2 encabezados coinciden y las ${validas.toLocaleString('es-CO')} filas son válidas para la tabla diagnosticos.grupos.`,
      'success'
    );
  } else if (validas > 0) {
    mostrarMensajeEstadoGrupos(
      `Archivo CSV con encabezados válidos. Se identificaron ${validas.toLocaleString('es-CO')} filas válidas y ${totalObservaciones.toLocaleString('es-CO')} observación(es) que debe revisar antes de importar.`,
      'warning'
    );
  } else {
    mostrarMensajeEstadoGrupos(
      `Los encabezados son correctos, pero ninguna de las ${total.toLocaleString('es-CO')} filas cumplió las validaciones requeridas. Revise las observaciones detalladas.`,
      'error'
    );
  }

  // Actualizar tarjetas de resumen
  const elTotal = document.getElementById('statGruposTotalFilas');
  const elValidas = document.getElementById('statGruposFilasValidas');
  const elObservaciones = document.getElementById('statGruposObservaciones');

  if (elTotal) elTotal.textContent = total.toLocaleString('es-CO');
  if (elValidas) elValidas.textContent = validas.toLocaleString('es-CO');
  if (elObservaciones) elObservaciones.textContent = totalObservaciones.toLocaleString('es-CO');

  renderizarPanelObservacionesGrupos();

  mostrarElementoGrupos('gruposResultadoValidacion');
  mostrarElementoGrupos('gruposSeccionConfirmacion');

  const chkConfirmar = document.getElementById('chkConfirmarReemplazoGrupos');
  const lblConfirmar = document.getElementById('lblConfirmarReemplazoGrupos');
  const resumenReemplazo = document.getElementById('gruposResumenReemplazoTexto');
  const listoParaReemplazar = validas > 0 && totalObservaciones === 0;

  if (chkConfirmar) {
    chkConfirmar.checked = false;
    chkConfirmar.disabled = !listoParaReemplazar;
  }
  if (lblConfirmar) {
    lblConfirmar.classList.toggle('supabase-confirm-check-activo', listoParaReemplazar);
  }
  actualizarEstadoBotonReemplazoGrupos();

  if (resumenReemplazo) {
    const textoEstado = listoParaReemplazar
      ? `Se reemplazarán todos los registros de <code class="supabase-code-inline">diagnosticos.grupos</code> por los <strong>${validas.toLocaleString('es-CO')}</strong> grupos válidos del archivo <strong>${escapeHtmlAdmin(estadoImportacionGrupos.archivo?.name || 'archivo.csv')}</strong>.`
      : `Archivo cargado: <strong>${escapeHtmlAdmin(estadoImportacionGrupos.archivo?.name || 'archivo.csv')}</strong>. Corrija las observaciones detectadas en el CSV y vuelva a seleccionarlo para habilitar el reemplazo.`;
    resumenReemplazo.innerHTML = textoEstado;
  }
}

function renderizarPanelObservacionesGrupos() {
  const contenedor = document.getElementById('gruposContenedorObservaciones');
  const cuerpo = document.getElementById('gruposListaObservaciones');
  const contador = document.getElementById('gruposContadorObservaciones');

  if (!contenedor || !cuerpo) return;

  const observaciones = estadoImportacionGrupos.observaciones;
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

function actualizarEstadoBotonReemplazoGrupos() {
  const chkConfirmar = document.getElementById('chkConfirmarReemplazoGrupos');
  const btnReemplazar = document.getElementById('btnEjecutarReemplazoGrupos');
  if (!btnReemplazar) return;

  const habilitado =
    !estadoImportacionGrupos.reemplazando &&
    estadoImportacionGrupos.encabezadosValidos &&
    estadoImportacionGrupos.observaciones.length === 0 &&
    estadoImportacionGrupos.registrosValidos.length > 0 &&
    Boolean(chkConfirmar && chkConfirmar.checked);

  btnReemplazar.disabled = !habilitado;
}

// ── Utilidades de UI del Módulo ─────────────────────────────────────────────

function mostrarMensajeEstadoGrupos(texto, tipo) {
  const contenedor = document.getElementById('gruposMensajeValidacion');
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

function mostrarMensajeReemplazoGrupos(texto, tipo) {
  const contenedor = document.getElementById('gruposMensajeReemplazo');
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

function mostrarElementoGrupos(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function ocultarElementoGrupos(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// ============================================================================
// EJECUCIÓN DEL REEMPLAZO COMPLETO EN SUPABASE (diagnosticos.grupos)
// ============================================================================

function obtenerPayloadGruposParaSupabase() {
  if (!estadoImportacionGrupos.encabezadosValidos) {
    throw new Error('Los encabezados del archivo CSV no han sido validados.');
  }
  if (estadoImportacionGrupos.observaciones.length > 0) {
    throw new Error('El archivo CSV contiene observaciones pendientes de corregir.');
  }
  if (estadoImportacionGrupos.registrosValidos.length === 0) {
    throw new Error('No hay registros válidos para importar en diagnosticos.grupos.');
  }

  return estadoImportacionGrupos.registrosValidos.map(item => ({
    sede: String(item.sede).trim().toUpperCase(),
    grupo: String(item.grupo).trim().toUpperCase()
  }));
}

function solicitarReemplazoGruposSupabase() {
  if (estadoImportacionGrupos.reemplazando) return;

  const chkConfirmar = document.getElementById('chkConfirmarReemplazoGrupos');
  if (!chkConfirmar || !chkConfirmar.checked) return;

  let payload;
  try {
    payload = obtenerPayloadGruposParaSupabase();
  } catch (err) {
    mostrarMensajeReemplazoGrupos(err.message || 'El archivo CSV no está listo para importar.', 'error');
    return;
  }

  if (typeof mostrarModalConfirmacion === 'function') {
    mostrarModalConfirmacion(
      '¿Reemplazar toda la tabla diagnosticos.grupos?',
      `Se eliminarán todos los registros actuales de diagnosticos.grupos y se insertarán ${payload.length.toLocaleString('es-CO')} grupos desde el archivo CSV. Esta acción no se puede deshacer.`,
      function () {
        ejecutarReemplazoGruposEnSupabase(payload);
      }
    );
    return;
  }

  const modal = document.getElementById('modalConfirmacion');
  const titulo = document.getElementById('tituloConfirmacion');
  const mensaje = document.getElementById('mensajeConfirmacion');
  const btnConfirmar = document.getElementById('btnConfirmarModal');
  const btnCancelar = document.getElementById('btnCancelarModal');

  if (!modal || !btnConfirmar || !btnCancelar) {
    ejecutarReemplazoGruposEnSupabase(payload);
    return;
  }

  if (titulo) {
    titulo.textContent = '¿Reemplazar toda la tabla diagnosticos.grupos?';
  }
  if (mensaje) {
    mensaje.textContent = `Se eliminarán todos los registros actuales de diagnosticos.grupos y se insertarán ${payload.length.toLocaleString('es-CO')} grupos desde el archivo CSV. Esta acción no se puede deshacer.`;
  }

  const cerrarModal = function () {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  };

  btnConfirmar.onclick = function () {
    cerrarModal();
    ejecutarReemplazoGruposEnSupabase(payload);
  };
  btnCancelar.onclick = cerrarModal;

  modal.style.display = 'flex';
  modal.classList.remove('hidden');
}

async function ejecutarReemplazoGruposEnSupabase(payload) {
  if (estadoImportacionGrupos.reemplazando) return;

  const btnReemplazar = document.getElementById('btnEjecutarReemplazoGrupos');
  const chkConfirmar = document.getElementById('chkConfirmarReemplazoGrupos');
  const btnQuitar = document.getElementById('btnQuitarArchivoGrupos');
  const loader = typeof mostrarCargando === 'function' ? mostrarCargando(document.body) : null;

  estadoImportacionGrupos.reemplazando = true;
  mostrarMensajeReemplazoGrupos('', '');

  if (btnReemplazar) {
    btnReemplazar.disabled = true;
    btnReemplazar.textContent = 'Reemplazando registros en diagnosticos.grupos...';
  }
  if (chkConfirmar) chkConfirmar.disabled = true;
  if (btnQuitar) btnQuitar.disabled = true;

  try {
    const resultado = await ConsultasAdmin.reemplazarGruposDiagnosticos(payload);
    const insertados = Number(resultado?.insertados ?? payload.length) || payload.length;

    if (chkConfirmar) {
      chkConfirmar.checked = false;
      chkConfirmar.disabled = false;
    }

    mostrarMensajeReemplazoGrupos(
      `Reemplazo completado correctamente: la tabla diagnosticos.grupos fue actualizada con ${insertados.toLocaleString('es-CO')} grupos.`,
      'success'
    );
  } catch (error) {
    console.error('Error reemplazando diagnosticos.grupos:', error);
    if (chkConfirmar) chkConfirmar.disabled = false;

    const mensajeErr = (typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.interpretarError === 'function')
      ? ConsultasAdmin.interpretarError(error, 'No fue posible reemplazar diagnosticos.grupos')
      : (error?.message || 'Ocurrió un error al reemplazar los registros en Supabase.');

    mostrarMensajeReemplazoGrupos(mensajeErr, 'error');
  } finally {
    estadoImportacionGrupos.reemplazando = false;
    if (typeof ocultarCargando === 'function' && loader) {
      ocultarCargando(loader);
    }
    if (btnQuitar) btnQuitar.disabled = false;
    if (btnReemplazar) {
      btnReemplazar.textContent = 'Reemplazar registros en diagnosticos.grupos';
    }
    actualizarEstadoBotonReemplazoGrupos();
  }
}
