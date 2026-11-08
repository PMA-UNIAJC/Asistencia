async function descargarDatos(event) {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;

  if (desde && !hasta) {
    alert('Si selecciona una Fecha Desde, también debe seleccionar una Fecha Hasta.');
    return;
  }

  if (desde && hasta && compararFechasColombia(desde, hasta) > 0) {
    alert('La fecha inicial no puede ser mayor que la fecha final');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const opcionesQuery = { order: 'fecha.asc' };

    if (!desde && hasta) {
      opcionesQuery.lte = { field: 'fecha', value: convertirFechaInputAISOColombia(hasta, '23:59:59') };
    } else if (desde && hasta) {
      opcionesQuery.gte = { field: 'fecha', value: convertirFechaInputAISOColombia(desde, '00:00:00') };
      opcionesQuery.lte = { field: 'fecha', value: convertirFechaInputAISOColombia(hasta, '23:59:59') };
    }

    const data = await ConsultasAdmin.obtenerFormularios(opcionesQuery);
    const datosTutores = data.filter(item => item.tipo_instructor === 'Tutor');

    if (datosTutores.length === 0) {
      alert('No hay registros de tutores para el período seleccionado');
      return;
    }

    generarExcelSimplificado(datosTutores, desde, hasta);
    alert(`${datosTutores.length} registros de tutores descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


async function descargarTodo(event) {
  if (!confirm('¿Descargar todos los registros?')) {
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga completa...';

  try {
    const data = await ConsultasAdmin.obtenerFormularios({ order: 'fecha.asc' });
    
    if (data.length === 0) {
      alert('No hay registros para descargar');
      return;
    }

    generarExcelCompleto(data, 'PMA_Completo');
    alert(`${data.length} registros descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


async function descargarDocentes(event) {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;

  if (desde && !hasta) {
    alert('Si selecciona una Fecha Desde, también debe seleccionar una Fecha Hasta.');
    return;
  }

  if (desde && hasta && compararFechasColombia(desde, hasta) > 0) {
    alert('La fecha inicial no puede ser mayor que la fecha final');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const opcionesQuery = { order: 'fecha.asc' };

    if (!desde && hasta) {
      opcionesQuery.lte = { field: 'fecha', value: convertirFechaInputAISOColombia(hasta, '23:59:59') };
    } else if (desde && hasta) {
      opcionesQuery.gte = { field: 'fecha', value: convertirFechaInputAISOColombia(desde, '00:00:00') };
      opcionesQuery.lte = { field: 'fecha', value: convertirFechaInputAISOColombia(hasta, '23:59:59') };
    }

    const data = await ConsultasAdmin.obtenerFormularios(opcionesQuery);
    const datosDocentes = data.filter(item => item.tipo_instructor === 'Profesor');

    if (datosDocentes.length === 0) {
      alert('No hay registros de docentes para el período seleccionado');
      return;
    }

    generarExcelDocentes(datosDocentes, desde, hasta);
    alert(`${datosDocentes.length} registros de docentes descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


async function descargarPorFacultad(event) {
  const checkboxes = document.querySelectorAll('.facultad-checkbox:checked');

  if (checkboxes.length === 0) {
    alert('Por favor seleccione al menos una facultad');
    return;
  }

  const nombresFacultadesBD = Array.from(checkboxes).map(cb => cb.value);

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const datosFinales = await ConsultasAdmin.obtenerFormularios({
      in: { field: 'facultad', values: nombresFacultadesBD },
      order: 'fecha.asc'
    });

    if (datosFinales.length === 0) {
      alert('No hay registros para las facultades seleccionadas');
      return;
    }

    generarExcelPorFacultad(datosFinales, nombresFacultadesBD);
    alert(`${datosFinales.length} registros descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function generarExcelPorFacultad(datos, facultadesSeleccionadas) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'FECHA': serialDate,
      'DOCUMENTO': parseInt(fila.documento),
      'NOMBRE': fila.nombre || '',
      'SEMESTRE': fila.semestre || '',
      'FACULTAD': fila.facultad || '',
      'PROGRAMA': fila.programa || '',
      'ASIGNATURA': fila.asignatura || '',
      'TEMA': fila.tema || ''
    };
  });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);
  
  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 1);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 35 },
    { wch: 10 }, { wch: 35 }, { wch: 35 }, { wch: 30 }, { wch: 30 }
  ];
  
  const nombresFacultades = facultadesSeleccionadas.join('_');
  XLSX.utils.book_append_sheet(wb, ws, "Por Facultad");
  
  const fechaHoy = obtenerFechaHoyColombia();
  XLSX.writeFile(wb, `PMA_PorFacultad_${nombresFacultades.replace(/\s+/g, '_')}_${fechaHoy}.xlsx`);
}


async function descargarPorGrupo(event) {
  const archivoInput = document.getElementById('archivoMatriculados');
  const inputBuscador = document.getElementById('buscadorGrupo');

  if (inputBuscador) {
    inputBuscador.value = normalizarGrupos(inputBuscador.value);
    if (typeof limpiarEspacios === 'function') {
      limpiarEspacios(inputBuscador);
    }
  }

  if (!archivoInput.files || archivoInput.files.length === 0) {
    alert('Por favor selecciona el archivo MATRICULADOS.');
    return;
  }

  const grupoRaw = inputBuscador ? inputBuscador.value.trim() : '';
  if (!grupoRaw) {
    alert('Por favor ingresa al menos un grupo.');
    return;
  }

  const gruposFiltro = extraerListaGrupos(grupoRaw);

  if (gruposFiltro.length === 0) {
    alert('No se encontraron grupos válidos.');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Procesando...';

  try {
    const mapaGrupos = await leerGruposMatriculadosPorFiltro(archivoInput.files[0], gruposFiltro);

    // Escenario C. Ninguno de los grupos existe en el Excel de MATRICULADOS
    if (!mapaGrupos || mapaGrupos.size === 0) {
      alert('No se encuentran estudiantes con los grupos indicados en el archivo Matriculados');
      return;
    }

    const gruposEnMatriculados = new Set(mapaGrupos.values());
    const gruposNoEnMatriculados = gruposFiltro.filter(g => !gruposEnMatriculados.has(g));

    btnDescarga.textContent = 'Descargando de la BD...';
    const data = await ConsultasAdmin.obtenerFormularios({ order: 'fecha.asc' });

    const datosFiltrados = (!data || data.length === 0)
      ? []
      : filtrarRegistrosPorMatriculados(data, mapaGrupos, 'documento');

    // Escenario A. Ningún grupo tiene registros
    if (datosFiltrados.length === 0) {
      alert('No hay registros');
      return;
    }

    generarExcelPorGrupoMatriculados(datosFiltrados, mapaGrupos, gruposFiltro.join('_'));

    const gruposConRegistros = new Set();
    datosFiltrados.forEach(fila => {
      const doc = normalizarDocumentoMatriculados(fila.documento);
      const grupoDoc = mapaGrupos.get(doc);
      if (grupoDoc) {
        gruposConRegistros.add(grupoDoc);
      }
    });

    const gruposSinRegistros = gruposFiltro.filter(
      g => gruposEnMatriculados.has(g) && !gruposConRegistros.has(g)
    );

    // Si todos los grupos tienen registros
    if (gruposSinRegistros.length === 0 && gruposNoEnMatriculados.length === 0) {
      alert(`${datosFiltrados.length} registros descargados exitosamente para los grupos: ${gruposFiltro.join(', ')}.`);
    } else {
      // Escenario B. Algunos grupos tienen registros y otros no
      const partesMensaje = [`${datosFiltrados.length} registros descargados.`];

      if (gruposSinRegistros.length > 0) {
        partesMensaje.push(`No hay registros de los grupos: ${gruposSinRegistros.join(', ')}.`);
      }

      if (gruposNoEnMatriculados.length > 0) {
        partesMensaje.push(`No se encuentran en el archivo Matriculados los grupos: ${gruposNoEnMatriculados.join(', ')}.`);
      }

      alert(partesMensaje.join(' '));
    }

  } catch (error) {
    if (error.message && error.message.includes('No se encuentran estudiantes')) {
      alert('No se encuentran estudiantes con los grupos indicados en el archivo Matriculados');
      return;
    }
    alert('Error: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


function generarExcelPorGrupoMatriculados(datos, mapaGrupos, grupoFiltro) {
  const datosExcel = datos.map(fila => {
    const grupoReal = obtenerGrupoMatriculado(mapaGrupos, fila.documento, grupoFiltro);
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);

    return {
      'FECHA': serialDate,
      'HORA': horaFormateada,
      'DOCUMENTO': parseInt(fila.documento) || '',
      'NOMBRE': fila.nombre || '',
      'FACULTAD': fila.facultad || '',
      'PROGRAMA': fila.programa || '',
      'GRUPO': grupoReal,
      'ASIGNATURA': fila.asignatura || '',
      'TEMA': fila.tema || '',
      'MOTIVO DE CONSULTA': fila.motivo_consulta || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

const range = XLSX.utils.decode_range(ws['!ref']);
aplicarFormatoExcel(ws, range, 0, 2);
for (let row = 1; row <= range.e.r; row++) {
  const docCell = XLSX.utils.encode_cell({ r: row, c: 2 });
  if (ws[docCell]) { ws[docCell].t = 'n'; ws[docCell].z = '0'; }
}

  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
ws['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 40 },
    { wch: 35 }, { wch: 35 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Por Grupo');

  const fechaHoy = obtenerFechaHoyColombia();
  XLSX.writeFile(wb, `PMA_PorGrupo_${grupoFiltro.replace(/\s+/g, '_')}_${fechaHoy}.xlsx`);
}


async function descargarPorDocumento(event) {
  const inputRaw = document.getElementById('inputDocumentos').value.trim();
  const archivoInput = document.getElementById('archivoMatriculadosDoc');
  const areaSeleccionada = document.querySelector('input[name="areaDoc"]:checked');

  if (!inputRaw) {
    alert('Por favor ingrese al menos un número de documento.');
    return;
  }

  const documentos = inputRaw
    .split(';')
    .map(d => d.trim())
    .filter(d => d.length > 0);

  if (documentos.length === 0) {
    alert('No se encontraron documentos válidos.');
    return;
  }

  const tieneArchivo = archivoInput.files && archivoInput.files.length > 0;

  if (tieneArchivo && !areaSeleccionada) {
    alert('Por favor selecciona un área (Matemáticas o Comunicación) para buscar el grupo.');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Buscando y preparando descarga...';

  try {
    let mapaGrupos = null;

    if (tieneArchivo) {
      mapaGrupos = await leerGruposMatriculadosPorHoja(archivoInput.files[0], areaSeleccionada.value);
    }

    const data = await ConsultasAdmin.obtenerFormularios({
      in: { field: 'documento', values: documentos },
      order: 'fecha.asc'
    });

    if (!data || data.length === 0) {
      alert('No se encontraron registros para los documentos ingresados.');
      return;
    }

    generarExcelPorDocumento(data, documentos, mapaGrupos);
    alert(`${data.length} registros descargados exitosamente.`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


function generarExcelPorDocumento(datos, documentos, mapaGrupos) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    const grupo = obtenerGrupoMatriculado(mapaGrupos, fila.documento);

    return {
      'FECHA': serialDate,
      'DOCUMENTO': parseInt(fila.documento) || '',
      'NOMBRE': fila.nombre || '',
      'GRUPO': grupo,
      'PROGRAMA': fila.programa || '',
      'ASIGNATURA': fila.asignatura || '',
      'TEMA': fila.tema || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 1);
  for (let row = 1; row <= range.e.r; row++) {
    const docCell = XLSX.utils.encode_cell({ r: row, c: 1 });
    if (ws[docCell]) { ws[docCell].t = 'n'; ws[docCell].z = '0'; }
  }

  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  ws['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 40 },
    { wch: 12 },
    { wch: 35 },
    { wch: 30 },
    { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Por Documento');

  const fechaHoy = obtenerFechaHoyColombia();
  XLSX.writeFile(wb, `PMA_PorDocumento_${fechaHoy}.xlsx`);
}


function generarExcelSimplificado(datos, desde, hasta) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    return {
      'FECHA': serialDate,
      'HORA': horaFormateada,
      'DOCUMENTO': parseInt(fila.documento),
      ';': ';',
      'NOMBRE': fila.nombre,
      'PROGRAMA': fila.programa,
      'INSTRUCTOR': fila.instructor,
      'ASIGNATURA': fila.asignatura,
      'TEMA': fila.tema
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 2);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 5 }, { wch: 35 },
    { wch: 35 }, { wch: 25 }, { wch: 30 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Tutores");

const mesesCortos = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
let sufijo = 'COMPLETO';
if (!desde && hasta) {
  const [, mesH, diaH] = hasta.split('-');
  sufijo = `HASTA_${mesesCortos[parseInt(mesH) - 1]}_${diaH}`;
} else if (desde && hasta) {
  const [, mesD, diaD] = desde.split('-');
  const [, mesH, diaH] = hasta.split('-');
  sufijo = `${mesesCortos[parseInt(mesD)-1]} ${diaD} - ${mesesCortos[parseInt(mesH)-1]} ${diaH}`;
}
XLSX.writeFile(wb, `TUTORES_${sufijo}.xlsx`);
}


function generarExcelCompleto(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'FECHA': serialDate,
      'HORA': horaFormateada,
      'DOCUMENTO': parseInt(fila.documento),
      'NOMBRE': fila.nombre,
      'FACULTAD': fila.facultad,
      'PROGRAMA': fila.programa,
      'SEMESTRE': fila.semestre,
      'TIPO ACOMPAÑAMIENTO': fila.tipo_acompanamiento,
      'TÍTULO CURSO': fila.titulo_curso || '',
      'SEDE ESTUDIANTE': fila.sede_estudiante || '',
      'SEDE TUTORÍA': fila.sede_tutoria,
      'TIPO INSTRUCTOR': fila.tipo_instructor,
      'FACULTAD/DEPARTAMENTO': fila.facultad_departamento || '',
      'INSTRUCTOR': fila.instructor,
      'ASIGNATURA': fila.asignatura,
      'TEMA': fila.tema,
      'MOTIVO DE CONSULTA': fila.motivo_consulta || '',
      'CALIFICACIÓN': fila.calificacion,
      'DUDAS RESUELTAS': fila.dudas_resueltas || '',
      'DOMINIO DEL TEMA': fila.dominio_tema || '',
      'AMBIENTE': fila.ambiente || '',
      'RECOMIENDA PMA': fila.recomienda_pma || '',
      'SUGERENCIAS': fila.sugerencias || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 2);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

ws['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 35 },
    { wch: 35 }, { wch: 35 }, { wch: 10 }, { wch: 20 },
    { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 },
    { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Registros Completos");

    const fechaHoy = obtenerFechaHoyColombia();
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}


function generarExcelDocentes(datos, desde, hasta) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'FECHA': serialDate,
      'HORA': horaFormateada,
      'DOCUMENTO': parseInt(fila.documento),
      ';': ';',
      'NOMBRE': fila.nombre,
      'PROGRAMA': fila.programa,
      'FACULTAD/DEPARTAMENTO': fila.facultad_departamento || '',
      'INSTRUCTOR': fila.instructor,
      'ASIGNATURA': fila.asignatura,
      'TEMA': fila.tema
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 2);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 }, // FECHA
    { wch: 8 },  // HORA
    { wch: 12 }, // DOCUMENTO
    { wch: 5 },  // ;
    { wch: 35 }, // NOMBRE
    { wch: 35 }, // PROGRAMA
    { wch: 20 }, // FACULTAD/DEPARTAMENTO
    { wch: 25 }, // INSTRUCTOR
    { wch: 30 }, // ASIGNATURA
    { wch: 30 }  // TEMA
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Docentes");

const mesesCortos = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
let sufijo = 'COMPLETO';
if (!desde && hasta) {
  const [, mesH, diaH] = hasta.split('-');
  sufijo = `HASTA_${mesesCortos[parseInt(mesH) - 1]}_${diaH}`;
} else if (desde && hasta) {
  const [, mesD, diaD] = desde.split('-');
  const [, mesH, diaH] = hasta.split('-');
  sufijo = `${mesesCortos[parseInt(mesD)-1]} ${diaD} - ${mesesCortos[parseInt(mesH)-1]} ${diaH}`;
}
XLSX.writeFile(wb, `DOCENTES_${sufijo}.xlsx`);
}


async function descargarAAATodo() {
  const btn = document.getElementById('btnDescargarAAATodo');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Descargando...';

  try {
    const data = await ConsultasAdmin.obtenerAcompanamiento({ orden: 'asc' });

    if (!data || data.length === 0) {
      alert('No hay registros de AAA para descargar');
      return;
    }

    generarExcelAAACompleto(data, 'AAA_');
    alert(`${data.length} registros de AAA descargados exitosamente`);
  } catch (error) {
    alert('Error al cargar datos: ' + error.message);
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}


function generarExcelAAACompleto(datos, nombreArchivo) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha_hora);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    
    return {
      'FECHA': serialDate,
      'HORA': horaFormateada,
      'CODIGO': fila.codigo_remision || '',
      'TIPO ACOMPAÑAMIENTO': fila.tipo_acompanamiento || '',
      'DOCUMENTO': fila.documento ? parseInt(fila.documento) : '',
      'NOMBRES Y APELLIDOS': fila.nombres_y_apellidos || fila.nombre || '',
      'CONTACTO': fila.contacto || '',
      'CORREO ESTUDIANTE': fila.correo_estudiante || '',
      'GRUPO': fila.grupo || '',
      'SEDE': fila.sede || '',
      'FACULTAD': fila.facultad_estudiante || '',
      'PROGRAMA': fila.programa_estudiante || '',
      'SEMESTRE': fila.semestre || '',
      'ENTERADO': fila.enterado || '',
      'PROFESOR': fila.profesor || '',
      'CARGO': fila.cargo || '',
      'DEPENDENCIA': fila.dependencia || '',
      'CORREO PROFESOR': fila.correo_profesor || '',
      'ASIGNATURA': fila.asignatura || '',
      'MOTIVO': fila.motivo || '',
      'COMENTARIOS': fila.comentarios || '',
      'ESTADO': fila.estado_remision || '',
      'INFORMACION': fila.informacion || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 4);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 },  // Fecha
    { wch: 8 },   // Hora
    { wch: 15 },  // Codigo
    { wch: 18 },  // Tipo Acompañamiento
    { wch: 12 },  // Documento
    { wch: 30 },  // Nombres y Apellidos
    { wch: 15 },  // Contacto
    { wch: 35 },  // Correo Estudiante
    { wch: 12 },  // Grupo
    { wch: 10 },  // Sede
    { wch: 40 },  // Facultad
    { wch: 35 },  // Programa
    { wch: 10 },  // Semestre
    { wch: 10 },  // Enterado
    { wch: 30 },  // Profesor
    { wch: 30 },  // Cargo
    { wch: 35 },  // Dependencia
    { wch: 35 },  // Correo Profesor
    { wch: 40 },  // Asignatura
    { wch: 50 },  // Motivo
    { wch: 50 },  // Comentarios
    { wch: 18 },  // Estado
    { wch: 50 }   // Informacion
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Todos");

  const fechaHoy = obtenerFechaHoyColombia();
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}


async function descargarPVU() {
  const btnDescarga = document.getElementById('btnDescargarPVU');
  const archivoInput = document.getElementById('archivoMatriculadosPVU');
  const textoOriginal = btnDescarga.textContent;

  // No se permite descargar sin antes cargar el archivo Matriculados
  if (!archivoInput || !archivoInput.files || archivoInput.files.length === 0) {
    alert('Por favor selecciona el archivo Matriculados (Excel) antes de descargar.');
    return;
  }

  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Procesando archivo Matriculados...';

  try {
    // 1) Procesar el archivo Matriculados (datos de estudiantes por Documento)
    const mapaMatriculados = await leerDatosMatriculadosPorDocumento(archivoInput.files[0]);

    // 2) Solo si el procesamiento fue exitoso, se consulta la BD y se genera la descarga
    btnDescarga.textContent = 'Descargando de la BD...';
    const data = await ConsultasAdmin.obtenerPVU();

    if (!data || data.length === 0) {
      alert('No hay registros de PVU para descargar');
      return;
    }

    generarExcelPVU(data, 'PVU_Registros', mapaMatriculados);
    alert(`${data.length} registros de PVU descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function generarExcelPVU(datos, nombreArchivo, mapaMatriculados) {
  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const horaFormateada = formatearHora(fechaColombia);
    const serialDate = convertirFechaASerialExcel(fechaColombia);

    // Cruce por DOCUMENTO (tipo BUSCARV) contra el archivo Matriculados.
    // Si no hay coincidencia, se dejan Facultad y Programa vacíos.
    const infoMatriculado = obtenerDatosMatriculado(mapaMatriculados, fila.documento);

    return {
      'FECHA': serialDate,
      'HORA': horaFormateada,
      'FECHA DE ASISTENCIA': fila.fecha_asistencia || '',
      'DOCUMENTO': parseInt(fila.documento) || '',
      'NOMBRE': (infoMatriculado && infoMatriculado.nombre) ? infoMatriculado.nombre : (fila.nombre || ''),
      'FACULTAD': infoMatriculado ? infoMatriculado.facultad : '',
      'PROGRAMA': (infoMatriculado && infoMatriculado.programa) ? infoMatriculado.programa : (fila.programa || ''),
      'SEDE': infoMatriculado ? infoMatriculado.sede : '',
      'JORNADA': fila.jornada || '',
      'SATISFACCION': fila.satisfaccion || '',
      'COMENTARIO': fila.comentario || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 3);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 },  // Fecha
    { wch: 8 },   // Hora
    { wch: 18 },  // Fecha de Asistencia
    { wch: 12 },  // Documento
    { wch: 35 },  // Nombre
    { wch: 40 },  // Facultad
    { wch: 45 },  // Programa
    { wch: 10 },  // Sede
    { wch: 12 },  // Jornada
    { wch: 12 },  // Satisfaccion
    { wch: 40 }   // Comentario
  ];

  XLSX.utils.book_append_sheet(wb, ws, "PVU");

  const fechaHoy = obtenerFechaHoyColombia();
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}


async function descargarInforme(event) {
  const desde = document.getElementById('fechaDesdeInforme').value;
  const hasta = document.getElementById('fechaHastaInforme').value;

  if (desde && !hasta) {
    alert('Si selecciona una Fecha Desde, también debe seleccionar una Fecha Hasta.');
    return;
  }

  if (desde && hasta && compararFechasColombia(desde, hasta) > 0) {
    alert('La fecha inicial no puede ser mayor que la fecha final.');
    return;
  }

  const btnDescarga = event.target;
  const textoOriginal = btnDescarga.textContent;
  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Preparando descarga...';

  try {
    const { tutoresNorte, tutoresSur } = await ConsultasAdmin.obtenerCatalogosEstadisticas();

    const areasPorInstructor = {};
    [...tutoresNorte, ...tutoresSur].forEach(t => {
      if (t.nombre && t.area) {
        areasPorInstructor[t.nombre.trim()] = t.area.trim().toUpperCase();
      }
    });

    const AREAS_PERMITIDAS = new Set(['M', 'C']);

    const opcionesQuery = { order: 'fecha.asc' };

    if (!desde && hasta) {
      opcionesQuery.lte = {
        field: 'fecha',
        value: convertirFechaInputAISOColombia(hasta, '23:59:59')
      };
    } else if (desde && hasta) {
      opcionesQuery.gte = {
        field: 'fecha',
        value: convertirFechaInputAISOColombia(desde, '00:00:00')
      };
      opcionesQuery.lte = {
        field: 'fecha',
        value: convertirFechaInputAISOColombia(hasta, '23:59:59')
      };
    }

    const data = await ConsultasAdmin.obtenerFormularios(opcionesQuery);

    if (!data || data.length === 0) {
      alert('No hay registros para el período seleccionado.');
      return;
    }

    const datosFiltrados = data.filter(fila => {
      const instructor = (fila.instructor || '').trim();
      const area = areasPorInstructor[instructor];
      const esDCB = (fila.facultad_departamento || '').trim().toUpperCase() === 'DCB';
      return esDCB || (area && AREAS_PERMITIDAS.has(area));
    });

    if (datosFiltrados.length === 0) {
      alert('No hay registros con instructores de las áreas M, C o DCB en el período seleccionado.');
      return;
    }

    generarExcelInforme(datosFiltrados, areasPorInstructor, desde, hasta);
    alert(`${datosFiltrados.length} registros descargados exitosamente.`);

  } catch (error) {
    alert('Error al descargar el informe: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}

function generarExcelInforme(datos, areasPorInstructor, desde, hasta) {

  const acentos = {
    'ADMINISTRACION': 'ADMINISTRACIÓN',
    'ALGEBRA': 'ÁLGEBRA',
    'ANATOMIA': 'ANATOMÍA',
    'AUDITORIA': 'AUDITORÍA',
    'BASICAS': 'BÁSICAS',
    'BIOLOGIA': 'BIOLOGÍA',
    'CALCULO': 'CÁLCULO',
    'CIUDADANIA': 'CIUDADANÍA',
    'COMUNICACION': 'COMUNICACIÓN',
    'CONSTITUCION': 'CONSTITUCIÓN',
    'CONTADURIA': 'CONTADURÍA',
    'ECONOMIA': 'ECONOMÍA',
    'ECOLOGIA': 'ECOLOGÍA',
    'EDUCACION': 'EDUCACIÓN',
    'ELECTRONICA': 'ELECTRÓNICA',
    'ESTADISTICA': 'ESTADÍSTICA',
    'ETICA': 'ÉTICA',
    'FISICA': 'FÍSICA',
    'FISIOLOGIA': 'FISIOLOGÍA',
    'GESTION': 'GESTIÓN',
    'INFORMACION': 'INFORMACIÓN',
    'INGENIERIA': 'INGENIERÍA',
    'INGENIERIAS': 'INGENIERÍA',
    'LEGISLACION': 'LEGISLACIÓN',
    'LOGICA': 'LÓGICA',
    'MATEMATICA': 'MATEMÁTICA',
    'MATEMATICAS': 'MATEMÁTICAS',
    'MECATRONICA': 'MECATRÓNICA',
    'ORGANIZACION': 'ORGANIZACIÓN',
    'PLANEACION': 'PLANEACIÓN',
    'POLITICA': 'POLÍTICA',
    'PRODUCCION': 'PRODUCCIÓN',
    'QUIMICA': 'QUÍMICA',
    'SOCIOLOGIA': 'SOCIOLOGÍA',
    'EVALUACION': 'EVALUACIÓN',
    'TECNOLOGIA': 'TECNOLOGÍA',
    'TEORIA': 'TEORÍA'
  };

  function corregirAcentos(texto) {
    if (!texto) return '';
    return texto
      .split(' ')
      .map(palabra => acentos[palabra.toUpperCase()] || palabra)
      .join(' ');
  }

  const datosExcel = datos.map(fila => {
    const fechaColombia = convertirFechaAColombia(fila.fecha);
    const serialDate = convertirFechaASerialExcel(fechaColombia);
    const instructor = (fila.instructor || '').trim();
    const area = areasPorInstructor[instructor] ||
      ((fila.facultad_departamento || '').trim().toUpperCase() === 'DCB' ? 'DCB' : '');

    return {
      'FECHA': serialDate,
      'DOCUMENTO': parseInt(fila.documento) || '',
      'NOMBRE': fila.nombre || '',
      'FACULTAD': corregirAcentos(fila.facultad || ''),
      'PROGRAMA': corregirAcentos(fila.programa || ''),
      'SEDE ESTUDIANTE': fila.sede_estudiante || '',
      'AREA': area,
      'TEMA': corregirAcentos(fila.tema || ''),
      'MOTIVO DE CONSULTA': fila.motivo_consulta || '',
      'CALIFICACION': fila.calificacion || '',
      'DUDAS RESUELTAS': fila.dudas_resueltas || '',
      'DOMINIO TEMA': fila.dominio_tema || '',
      'AMBIENTE': fila.ambiente || '',
      'RECOMIENDA PMA': fila.recomienda_pma || '',
      'SUGERENCIAS': fila.sugerencias || ''
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel);

  const range = XLSX.utils.decode_range(ws['!ref']);
  aplicarFormatoExcel(ws, range, 0, 1);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  ws['!cols'] = [
    { wch: 12 },  // FECHA
    { wch: 12 },  // DOCUMENTO
    { wch: 35 },  // NOMBRE
    { wch: 35 },  // FACULTAD
    { wch: 35 },  // PROGRAMA
    { wch: 15 },  // SEDE ESTUDIANTE
    { wch: 8 },   // ÁREA
    { wch: 30 },  // TEMA
    { wch: 25 },  // MOTIVO DE CONSULTA
    { wch: 13 },  // CALIFICACIÓN
    { wch: 16 },  // DUDAS RESUELTAS
    { wch: 14 },  // DOMINIO TEMA
    { wch: 12 },  // AMBIENTE
    { wch: 15 },  // RECOMIENDA PMA
    { wch: 40 }   // SUGERENCIAS
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'INFORME');

  const mesesCortos = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  let sufijo = 'COMPLETO';
  if (!desde && hasta) {
    const [, mesH, diaH] = hasta.split('-');
    sufijo = `HASTA_${mesesCortos[parseInt(mesH) - 1]}_${diaH}`;
  } else if (desde && hasta) {
    const [, mesD, diaD] = desde.split('-');
    const [, mesH, diaH] = hasta.split('-');
    sufijo = `${mesesCortos[parseInt(mesD) - 1]} ${diaD} - ${mesesCortos[parseInt(mesH) - 1]} ${diaH}`;
  }

  XLSX.writeFile(wb, `INFORME_${sufijo}.xlsx`);
}


const ENCABEZADOS_EXCEL_VISITAS = [
  'FECHA',
  'VISITA',
  'GRUPO',
  'DOCUMENTO',
  'NOMBRE',
  'CELULAR',
  'CORREO_INST',
  'SEMESTRE',
  'FACULTAD',
  'PROGRAMA'
];

function construirHojaVisitas(datosSede, mapaMatriculados) {
  const datosExcel = (datosSede || []).map(fila => {
    const fechaColombia = fila.fecha_realizacion ? convertirFechaAColombia(fila.fecha_realizacion) : null;
    const serialDate = fechaColombia ? convertirFechaASerialExcel(fechaColombia) : '';
    const doc = normalizarDocumentoMatriculados(fila.documento_vocero);
    const infoMatriculado = obtenerDatosMatriculado(mapaMatriculados, doc);
    const docNumerico = parseInt(doc, 10);

    return {
      'FECHA': serialDate,
      'VISITA': fila.numero_visita ?? '',
      'GRUPO': fila.grupo || '',
      'DOCUMENTO': !isNaN(docNumerico) ? docNumerico : doc,
      'NOMBRE': infoMatriculado ? (infoMatriculado.nombre || '') : '',
      'CELULAR': infoMatriculado ? (infoMatriculado.celular || '') : '',
      'CORREO_INST': infoMatriculado ? (infoMatriculado.correo_inst || '') : '',
      'SEMESTRE': infoMatriculado ? (infoMatriculado.semestre || '') : '',
      'FACULTAD': infoMatriculado ? (infoMatriculado.facultad || '') : '',
      'PROGRAMA': infoMatriculado ? (infoMatriculado.programa || '') : ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(datosExcel, { header: ENCABEZADOS_EXCEL_VISITAS });
  const range = XLSX.utils.decode_range(ws['!ref']);

  if (datosExcel.length > 0) {
    aplicarFormatoExcel(ws, range, 0, 3);
  }

  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  ws['!cols'] = [
    { wch: 12 }, // FECHA
    { wch: 8 },  // VISITA
    { wch: 12 }, // GRUPO
    { wch: 14 }, // DOCUMENTO
    { wch: 35 }, // NOMBRE
    { wch: 15 }, // CELULAR
    { wch: 35 }, // CORREO_INST
    { wch: 12 }, // SEMESTRE
    { wch: 35 }, // FACULTAD
    { wch: 40 }  // PROGRAMA
  ];

  return ws;
}

function generarExcelVisitas(datosNorte, datosSur, nombreArchivo, mapaMatriculados) {
  const wb = XLSX.utils.book_new();

  const wsNorte = construirHojaVisitas(datosNorte, mapaMatriculados);
  const wsSur = construirHojaVisitas(datosSur, mapaMatriculados);

  XLSX.utils.book_append_sheet(wb, wsNorte, 'NORTE');
  XLSX.utils.book_append_sheet(wb, wsSur, 'SUR');

  const fechaHoy = obtenerFechaHoyColombia();
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}

async function obtenerVisitasRealizadasPorSede(sede) {
  const registros = await ConsultasAdmin.obtenerRegistrosVisitas(sede, { orden: 'fecha_realizacion.asc' });
  if (!Array.isArray(registros)) return [];
  return registros.filter(r => r && String(r.estado || '').trim() === 'Realizada');
}

async function descargarVisitas() {
  const btnDescarga = document.getElementById('btnDescargarVisitas');
  const archivoInput = document.getElementById('archivoMatriculadosVisitas');
  const textoOriginal = btnDescarga.textContent;

  if (!archivoInput || !archivoInput.files || archivoInput.files.length === 0) {
    alert('Por favor selecciona el archivo Matriculados (Excel) antes de descargar.');
    return;
  }

  btnDescarga.disabled = true;
  btnDescarga.textContent = 'Procesando archivo Matriculados...';

  try {
    const mapaMatriculados = await leerDatosMatriculadosPorDocumento(archivoInput.files[0]);

    btnDescarga.textContent = 'Descargando de la BD...';
    const [realizadasNorte, realizadasSur] = await Promise.all([
      obtenerVisitasRealizadasPorSede('norte'),
      obtenerVisitasRealizadasPorSede('sur')
    ]);

    if (realizadasNorte.length === 0 && realizadasSur.length === 0) {
      alert('No hay registros de visitas realizadas para descargar');
      return;
    }

    if (realizadasNorte.length === 0) {
      alert('No hay registros de visitas realizadas para la Sede Norte');
    } else if (realizadasSur.length === 0) {
      alert('No hay registros de visitas realizadas para la Sede Sur');
    }

    generarExcelVisitas(realizadasNorte, realizadasSur, 'Visitas_Realizadas', mapaMatriculados);
    const totalDescargados = realizadasNorte.length + realizadasSur.length;
    alert(`${totalDescargados} registros de visitas descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    btnDescarga.disabled = false;
    btnDescarga.textContent = textoOriginal;
  }
}


const ENCABEZADOS_EXCEL_DIAGNOSTICOS = [
  'DOCUMENTO',
  'NOMBRE',
  'FACULTAD',
  'PROGRAMA',
  'SEDE',
  'GRUPO',
  'PRUEBA',
  'INCORRECTAS',
  'CORRECTAS',
  'RESULTADO'
];

function generarExcelDiagnosticos(datos, nombreArchivo) {
  const datosExcel = (datos || []).map(fila => {
    const est = Array.isArray(fila.estudiantes)
      ? (fila.estudiantes[0] || {})
      : (fila.estudiantes || {});
    const docTexto = String(fila.documento ?? '').trim();
    const docNumerico = /^\d+$/.test(docTexto) ? parseInt(docTexto, 10) : docTexto;

    const incorrectasNum = fila.incorrectas != null && fila.incorrectas !== ''
      ? Number(fila.incorrectas)
      : 0;
    const correctasNum = fila.correctas != null && fila.correctas !== ''
      ? Number(fila.correctas)
      : 0;
    const resultadoNum = fila.resultado != null && fila.resultado !== ''
      ? Number(fila.resultado)
      : 0;

    return {
      'DOCUMENTO': !Number.isNaN(docNumerico) ? docNumerico : docTexto,
      'NOMBRE': est.nombre || '',
      'FACULTAD': '',
      'PROGRAMA': est.programa || '',
      'SEDE': est.sede ? String(est.sede).trim().toUpperCase() : '',
      'GRUPO': est.grupo || '',
      'PRUEBA': fila.prueba || '',
      'INCORRECTAS': !Number.isNaN(incorrectasNum) ? incorrectasNum : 0,
      'CORRECTAS': !Number.isNaN(correctasNum) ? correctasNum : 0,
      'RESULTADO': !Number.isNaN(resultadoNum) ? resultadoNum : 0
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datosExcel, { header: ENCABEZADOS_EXCEL_DIAGNOSTICOS });
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let row = 1; row <= range.e.r; row++) {
    const docCell = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (ws[docCell] && typeof ws[docCell].v === 'number') {
      ws[docCell].t = 'n';
      ws[docCell].z = '0';
    }

    const incCell = XLSX.utils.encode_cell({ r: row, c: 7 });
    if (ws[incCell] && typeof ws[incCell].v === 'number') {
      ws[incCell].t = 'n';
      ws[incCell].z = '0';
    }

    const corCell = XLSX.utils.encode_cell({ r: row, c: 8 });
    if (ws[corCell] && typeof ws[corCell].v === 'number') {
      ws[corCell].t = 'n';
      ws[corCell].z = '0';
    }

    const resCell = XLSX.utils.encode_cell({ r: row, c: 9 });
    if (ws[resCell] && typeof ws[resCell].v === 'number') {
      ws[resCell].t = 'n';
    }
  }

  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  ws['!cols'] = [
    { wch: 14 }, // DOCUMENTO
    { wch: 35 }, // NOMBRE
    { wch: 30 }, // FACULTAD
    { wch: 38 }, // PROGRAMA
    { wch: 15 }, // SEDE
    { wch: 12 }, // GRUPO
    { wch: 16 }, // PRUEBA
    { wch: 14 }, // INCORRECTAS
    { wch: 12 }, // CORRECTAS
    { wch: 13 }  // RESULTADO
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'RESULTADOS DIAGNOSTICOS');

  const fechaHoy = obtenerFechaHoyColombia();
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}

async function descargarDiagnosticos(event) {
  const btnDescarga = (event && event.currentTarget) || document.getElementById('btnDescargarDiagnosticos');
  const textoOriginal = btnDescarga ? btnDescarga.textContent : 'Descargar';

  if (btnDescarga) {
    btnDescarga.disabled = true;
    btnDescarga.textContent = 'Descargando...';
  }

  try {
    const data = await ConsultasAdmin.obtenerResultadosDiagnosticos();

    if (!data || data.length === 0) {
      alert('No hay resultados de diagnósticos para descargar');
      return;
    }

    generarExcelDiagnosticos(data, 'Resultados_Diagnosticos');
    alert(`${data.length} registros de diagnósticos descargados exitosamente`);
  } catch (error) {
    alert('Error al descargar datos: ' + error.message);
    console.error(error);
  } finally {
    if (btnDescarga) {
      btnDescarga.disabled = false;
      btnDescarga.textContent = textoOriginal;
    }
  }
}
