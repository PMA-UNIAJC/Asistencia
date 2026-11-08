// ============================================================================
// MÓDULO GLOBAL: Cruce y consulta de información con MATRICULADOS.xlsx
// Ubicación: Admin/Panel/js/matriculados.js
//
// Centraliza la lectura, validación, normalización y cruce de información
// del archivo Excel de matriculados para todas las secciones del Panel
// de Administración (PMA, PVU, Visitas, etc.).
// ============================================================================

const HOJAS_AREAS_MATRICULADOS = Object.freeze(['MATEMATICAS', 'COMUNICACION']);

const COLUMNAS_MATRICULADOS = Object.freeze({
  documento: 'DOCUMENTO',
  grupo: 'GRUPO',
  facultad: 'FACULTAD',
  programa: 'PROGRAMA',
  sede: 'SEDE',
  nombre: 'NOMBRE',
  celular: 'CELULAR',
  correo_inst: 'CORREO_INST',
  semestre: 'SEMESTRE'
});

/**
 * Normaliza el nombre de un encabezado de columna (sin espacios extremos,
 * en mayúsculas y sin tildes/diacríticos) para comparaciones flexibles.
 */
function normalizarEncabezadoMatriculados(encabezado) {
  return String(encabezado ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza un número de documento para usarlo como clave de cruce.
 */
function normalizarDocumentoMatriculados(documento) {
  return String(documento ?? '').trim();
}

/**
 * Normaliza el código de un grupo.
 */
function normalizarGrupoMatriculados(grupo, convertirMayusculas = true) {
  const texto = String(grupo ?? '').trim();
  return convertirMayusculas ? texto.toUpperCase() : texto;
}

/**
 * Busca en un arreglo de claves de encabezado aquella que coincida con el
 * nombre de columna esperado luego de normalizar.
 */
function buscarColumnaMatriculados(clavesEncabezado, nombreColumnaEsperado) {
  const objetivo = normalizarEncabezadoMatriculados(nombreColumnaEsperado);
  return clavesEncabezado.find(k => normalizarEncabezadoMatriculados(k) === objetivo);
}

/**
 * Resuelve un mapa de columnas disponibles en una hoja a partir de la primera fila.
 */
function resolverColumnasHojaMatriculados(filas, definicionColumnas = COLUMNAS_MATRICULADOS) {
  if (!Array.isArray(filas) || filas.length === 0) {
    return { keys: [], columnas: {} };
  }

  const keys = Object.keys(filas[0]);
  const columnas = {};

  Object.entries(definicionColumnas).forEach(([clavePropiedad, nombreEncabezado]) => {
    columnas[clavePropiedad] = buscarColumnaMatriculados(keys, nombreEncabezado);
  });

  return { keys, columnas };
}

/**
 * Lee un archivo Excel (.xlsx / .xls) desde un objeto File y devuelve el Workbook de SheetJS.
 */
function cargarLibroMatriculados(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo) {
      reject(new Error('No se proporcionó el archivo de matriculados.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        resolve(wb);
      } catch (err) {
        reject(new Error('Error leyendo el archivo Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsArrayBuffer(archivo);
  });
}

/**
 * Extrae las filas de una hoja del libro de matriculados como objetos JSON.
 */
function extraerFilasHojaMatriculados(wb, nombreHoja) {
  const ws = wb?.Sheets?.[nombreHoja];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

/**
 * Lee los grupos de estudiantes filtrando por uno o varios códigos de grupo
 * sobre las hojas de áreas del archivo de matriculados (por defecto MATEMATICAS y COMUNICACION).
 * Retorna un Map<documento, grupo>.
 */
async function leerGruposMatriculadosPorFiltro(archivo, gruposFiltro, hojasObjetivo = HOJAS_AREAS_MATRICULADOS) {
  const wb = await cargarLibroMatriculados(archivo);

  try {
    const gruposNormalizados = (gruposFiltro || [])
      .map(g => normalizarGrupoMatriculados(g, true))
      .filter(Boolean);

    const mapaGruposPorDocumento = new Map();

    hojasObjetivo.forEach(nombreHoja => {
      const filas = extraerFilasHojaMatriculados(wb, nombreHoja);
      if (!filas || filas.length === 0) return;

      const { keys, columnas } = resolverColumnasHojaMatriculados(filas, {
        documento: COLUMNAS_MATRICULADOS.documento,
        grupo: COLUMNAS_MATRICULADOS.grupo
      });

      if (!columnas.documento || !columnas.grupo) {
        console.warn(`Hoja "${nombreHoja}" no tiene columnas DOCUMENTO y GRUPO. Columnas: ${keys.join(', ')}`);
        return;
      }

      filas.forEach(fila => {
        const doc = normalizarDocumentoMatriculados(fila[columnas.documento]);
        const grupo = normalizarGrupoMatriculados(fila[columnas.grupo], true);
        if (gruposNormalizados.includes(grupo) && doc && !mapaGruposPorDocumento.has(doc)) {
          mapaGruposPorDocumento.set(doc, grupo);
        }
      });
    });

    if (mapaGruposPorDocumento.size === 0) {
      return mapaGruposPorDocumento;
    }

    return mapaGruposPorDocumento;
  } catch (err) {
    if (err.message && err.message.startsWith('No se encontraron estudiantes')) {
      throw err;
    }
    throw new Error('Error leyendo el archivo Excel: ' + err.message);
  }
}

/**
 * Lee el mapa de grupos (Map<documento, grupo>) de una hoja específica del archivo de matriculados.
 */
async function leerGruposMatriculadosPorHoja(archivo, nombreHoja) {
  const wb = await cargarLibroMatriculados(archivo);

  try {
    const filas = extraerFilasHojaMatriculados(wb, nombreHoja);

    if (!filas) {
      const hojasEncontradas = wb.SheetNames.join(', ');
      throw new Error(`No se encontró la hoja "${nombreHoja}". Hojas en el archivo: ${hojasEncontradas}`);
    }

    if (filas.length === 0) {
      return new Map();
    }

    const { keys, columnas } = resolverColumnasHojaMatriculados(filas, {
      documento: COLUMNAS_MATRICULADOS.documento,
      grupo: COLUMNAS_MATRICULADOS.grupo
    });

    if (!columnas.documento || !columnas.grupo) {
      throw new Error(`La hoja "${nombreHoja}" no tiene columnas DOCUMENTO y GRUPO. Columnas encontradas: ${keys.join(', ')}`);
    }

    const mapaGruposPorDocumento = new Map();
    filas.forEach(fila => {
      const doc = normalizarDocumentoMatriculados(fila[columnas.documento]);
      const grupo = normalizarGrupoMatriculados(fila[columnas.grupo], false);
      if (doc && !mapaGruposPorDocumento.has(doc)) {
        mapaGruposPorDocumento.set(doc, grupo);
      }
    });

    return mapaGruposPorDocumento;
  } catch (err) {
    if (
      err.message.startsWith('No se encontró la hoja') ||
      err.message.startsWith('La hoja "')
    ) {
      throw err;
    }
    throw new Error('Error leyendo el archivo Excel: ' + err.message);
  }
}

/**
 * Lee los datos generales de los estudiantes matriculados desde la hoja principal
 * (o la hoja indicada) y los indexa por documento (Map<documento, datosEstudiante>).
 * Reutilizable en PVU, Visitas y cualquier otra sección del panel que cruce por documento.
 */
async function leerDatosMatriculadosPorDocumento(archivo, opciones = {}) {
  const wb = await cargarLibroMatriculados(archivo);

  try {
    const nombreHoja = opciones.nombreHoja || wb.SheetNames[0];
    const ws = nombreHoja ? wb.Sheets[nombreHoja] : null;
    const mapaMatriculados = new Map();

    if (!ws) {
      throw new Error('El archivo Matriculados no contiene hojas.');
    }

    const filas = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (filas.length === 0) {
      throw new Error(`La hoja "${nombreHoja}" del archivo Matriculados está vacía.`);
    }

    const { keys, columnas } = resolverColumnasHojaMatriculados(filas);
    const tieneColumnaDatos =
      columnas.facultad ||
      columnas.programa ||
      columnas.sede ||
      columnas.nombre ||
      columnas.celular ||
      columnas.correo_inst ||
      columnas.semestre;

    if (!columnas.documento || !tieneColumnaDatos) {
      throw new Error(`La hoja "${nombreHoja}" no tiene columnas DOCUMENTO/FACULTAD/PROGRAMA/SEDE/NOMBRE utilizables. Columnas encontradas: ${keys.join(', ')}`);
    }

    filas.forEach(fila => {
      const doc = normalizarDocumentoMatriculados(fila[columnas.documento]);
      if (!doc || mapaMatriculados.has(doc)) return; // Se conserva la primera coincidencia

      mapaMatriculados.set(doc, {
        facultad: columnas.facultad ? String(fila[columnas.facultad]).trim() : '',
        programa: columnas.programa ? String(fila[columnas.programa]).trim() : '',
        sede: columnas.sede ? String(fila[columnas.sede]).trim() : '',
        nombre: columnas.nombre ? String(fila[columnas.nombre]).trim() : '',
        celular: columnas.celular ? String(fila[columnas.celular]).trim() : '',
        correo_inst: columnas.correo_inst ? String(fila[columnas.correo_inst]).trim() : '',
        semestre: columnas.semestre ? String(fila[columnas.semestre]).trim() : '',
        grupo: columnas.grupo ? String(fila[columnas.grupo]).trim() : ''
      });
    });

    if (mapaMatriculados.size === 0) {
      throw new Error('No se encontraron documentos válidos en la hoja del archivo Matriculados.');
    }

    return mapaMatriculados;
  } catch (err) {
    if (
      err.message.startsWith('El archivo Matriculados') ||
      err.message.startsWith('La hoja "') ||
      err.message.startsWith('No se encontraron documentos')
    ) {
      throw err;
    }
    throw new Error('Error leyendo el archivo Excel: ' + err.message);
  }
}

/**
 * Obtiene la información de un estudiante desde el mapa de matriculados a partir de su documento.
 */
function obtenerDatosMatriculado(mapaMatriculados, documento) {
  if (!(mapaMatriculados instanceof Map)) return null;
  const doc = normalizarDocumentoMatriculados(documento);
  if (!doc) return null;
  return mapaMatriculados.get(doc) || null;
}

/**
 * Obtiene el grupo asociado a un documento desde un mapa de grupos de matriculados.
 */
function obtenerGrupoMatriculado(mapaGrupos, documento, grupoPorDefecto = '') {
  if (!(mapaGrupos instanceof Map)) return grupoPorDefecto;
  const doc = normalizarDocumentoMatriculados(documento);
  if (!doc) return grupoPorDefecto;
  return mapaGrupos.get(doc) || grupoPorDefecto;
}

/**
 * Filtra una lista de registros conservando únicamente aquellos cuyo documento
 * exista dentro del mapa de matriculados proporcionado.
 */
function filtrarRegistrosPorMatriculados(registros, mapaMatriculados, campoDocumento = 'documento') {
  if (!Array.isArray(registros) || !(mapaMatriculados instanceof Map)) return [];
  return registros.filter(fila => {
    const doc = normalizarDocumentoMatriculados(fila?.[campoDocumento]);
    return doc && mapaMatriculados.has(doc);
  });
}

window.Matriculados = Object.freeze({
  HOJAS_AREAS_MATRICULADOS,
  COLUMNAS_MATRICULADOS,
  normalizarEncabezadoMatriculados,
  normalizarDocumentoMatriculados,
  normalizarGrupoMatriculados,
  buscarColumnaMatriculados,
  resolverColumnasHojaMatriculados,
  cargarLibroMatriculados,
  extraerFilasHojaMatriculados,
  leerGruposMatriculadosPorFiltro,
  leerGruposMatriculadosPorHoja,
  leerDatosMatriculadosPorDocumento,
  obtenerDatosMatriculado,
  obtenerGrupoMatriculado,
  filtrarRegistrosPorMatriculados
});
