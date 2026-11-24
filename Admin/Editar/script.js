// Estado interno
let documentoOriginal = null;   // Documento con el que se buscó
let datosOriginales    = null;   // Snapshot del registro al cargar

const CAMPOS_EDICION_ESTUDIANTE = [
  'edit_documento',
  'edit_nombre',
  'edit_facultad',
  'edit_programa',
  'edit_sede',
  'edit_semestre'
];
const elementosEdicionVinculados = new WeakSet();
let solicitudCargaEdicionId = 0;
let busquedaEstudianteEnCurso = false;

function verificarCambiosEdicion() {
  const btnGuardar = document.getElementById('btnGuardar');
  if (!btnGuardar || !datosOriginales) return;
  const hayCambios = obtenerCambios().length > 0;
  btnGuardar.disabled = !hayCambios;
  btnGuardar.style.opacity = hayCambios ? '1' : '0.5';
}

function registrarListenersFormularioEdicion() {
  CAMPOS_EDICION_ESTUDIANTE.forEach(id => {
    const campo = document.getElementById(id);
    if (!campo || elementosEdicionVinculados.has(campo)) return;
    campo.addEventListener('input', verificarCambiosEdicion);
    campo.addEventListener('change', verificarCambiosEdicion);
    elementosEdicionVinculados.add(campo);
  });
}

// ── Inicialización ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await AdminAuth.protegerPagina({ urlLogin: '../Panel/index.html' });
  if (!acceso.autorizado) return;
  registrarListenersFormularioEdicion();
});


function mostrarSeccion(seccion) {
  document.getElementById('seccionEstudiante').classList.add('hidden');
  document.getElementById('seccionTutor').classList.add('hidden');
  document.getElementById('seccionFacultades').classList.add('hidden');

  document.getElementById('navEstudiante').classList.remove('active');
  document.getElementById('navTutor').classList.remove('active');
  document.getElementById('navFacultades').classList.remove('active');

  if (seccion === 'estudiante') {
    document.getElementById('seccionEstudiante').classList.remove('hidden');
    document.getElementById('navEstudiante').classList.add('active');
  } else if (seccion === 'tutor') {
    document.getElementById('seccionTutor').classList.remove('hidden');
    document.getElementById('navTutor').classList.add('active');
  } else if (seccion === 'facultades') {
    document.getElementById('seccionFacultades').classList.remove('hidden');
    document.getElementById('navFacultades').classList.add('active');
    inicializarSeccionFacultades();
  }
}



// ── Buscar estudiante ────────────────────────────────────────────────────────

async function buscarEstudiante() {
  if (busquedaEstudianteEnCurso) return;

  const inputEl  = document.getElementById('inputBuscarDocumento');
  const documento = inputEl.value.trim();

  if (!documento) {
    mostrarMensaje('mensajeBusqueda', 'Por favor ingrese un número de documento.', 'error');
    return;
  }

  const btnBuscar = document.getElementById('btnBuscar');
  const solicitudActual = ++solicitudCargaEdicionId;
  busquedaEstudianteEnCurso = true;
  btnBuscar.disabled = true;
  btnBuscar.textContent = 'Buscando...';
  mostrarCargando('mensajeBusqueda');

  try {
    const estudiante = await ConsultasAdmin.consultarUno('estudiantes', {
      eq: { field: 'documento', value: documento }
    });

    if (solicitudActual !== solicitudCargaEdicionId) return;

    if (!estudiante) {
      mostrarMensaje('mensajeBusqueda', `No se encontró ningún estudiante con este documento.`, 'error');
      return;
    }

    documentoOriginal = estudiante.documento;
    datosOriginales   = { ...estudiante };

    const cargado = await cargarFormularioEdicion(estudiante, solicitudActual);
    if (solicitudActual !== solicitudCargaEdicionId) return;
    if (!cargado) {
      documentoOriginal = null;
      datosOriginales   = null;
      mostrarMensaje('mensajeBusqueda', 'No se pudo cargar el catálogo de facultades y programas. Intente nuevamente.', 'error');
      return;
    }

    document.getElementById('mensajeBusqueda').textContent = '';

  } catch (err) {
    mostrarMensaje('mensajeBusqueda', ConsultasAdmin.interpretarError(err, 'Error consultando estudiante'), 'error');
    console.error(err);
  } finally {
    busquedaEstudianteEnCurso = false;
    btnBuscar.disabled = false;
    btnBuscar.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      Buscar`;
  }
}

// ── Cargar datos en el formulario ────────────────────────────────────────────

async function cargarFormularioEdicion(est, solicitudId = null) {
  const tokenCarga = solicitudId !== null ? solicitudId : ++solicitudCargaEdicionId;
  registrarListenersFormularioEdicion();

  const seccionEdicion = document.getElementById('seccionEdicion');
  const btnGuardar = document.getElementById('btnGuardar');

  // Ocultar secciones previas y mantener bloqueado Guardar mientras se sincronizan catálogos
  seccionEdicion.classList.add('hidden');
  document.getElementById('resumenCambios').classList.add('hidden');
  document.getElementById('mensajeGuardado').textContent = '';
  btnGuardar.disabled = true;
  btnGuardar.style.opacity = '0.5';

  document.getElementById('edit_documento').value = est.documento || '';
  document.getElementById('edit_nombre')   .value = est.nombre    || '';
  document.getElementById('edit_semestre') .value = est.semestre  || '';
  document.getElementById('edit_sede')     .value = (est.sede || '').trim().toUpperCase();

  // Badge doc original y alerta de sincronización
  document.getElementById('badgeDocOriginal').textContent = `Documento Original: ${documentoOriginal}`;
  document.getElementById('alertaSincronizacion').style.display = 'block';

  const { facultad, programa } = resolverProgramaYFacultad(est);
  const catalogosCargados = await cargarFacultadesEdicion(
    facultad || est.facultad || '',
    programa || est.programa || '',
    est,
    tokenCarga
  );

  if (!catalogosCargados || tokenCarga !== solicitudCargaEdicionId) {
    return false;
  }

  // Asegurar botón Guardar bloqueado tras finalizar el rellenado completo
  btnGuardar.disabled = true;
  btnGuardar.style.opacity = '0.5';

  // Mostrar sección edición únicamente cuando todas las dependencias estén listas
  seccionEdicion.classList.remove('hidden');
  seccionEdicion.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

// ── Guardar cambios ──────────────────────────────────────────────────────────

function guardarCambios() {
  const nuevoDocumento = document.getElementById('edit_documento').value.trim();
  if (!nuevoDocumento) {
    mostrarMensaje('mensajeGuardado', 'El campo Documento no puede estar vacío.', 'error');
    return;
  }
    if (!document.getElementById('edit_nombre').value.trim()) {
    mostrarMensaje('mensajeGuardado', 'El campo Nombre no puede estar vacío.', 'error');
    return;
  }


  // confirmación
  const cambios = obtenerCambios();
  if (cambios.length === 0) {
    mostrarMensaje('mensajeGuardado', 'No hay cambios pendientes para guardar.', 'error');
    return;
  }
  const msgConfirmacion = 'Se actualizarán los datos del estudiante únicamente en la tabla public.estudiantes.';

  mostrarModalConfirmacion(
    '¿Guardar cambios?',
    msgConfirmacion,
    ejecutarGuardado
  );
}

async function ejecutarGuardado() {
  const btnGuardar = document.getElementById('btnGuardar');
  const textoOriginal = btnGuardar.innerHTML;
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarCargando('mensajeGuardado');

  try {
    const nuevosDatos = leerFormulario();
    const cambios     = obtenerCambios();

    // Actualización exclusiva en public.estudiantes (sin modificar otras tablas)
    const resultado = await ConsultasAdmin.actualizarEstudiante(documentoOriginal, nuevosDatos);
    const filasActualizadas = Array.isArray(resultado && resultado.datos) ? resultado.datos : [];
    const registrosActualizados = typeof (resultado && resultado.totalActualizados) === 'number'
      ? resultado.totalActualizados
      : filasActualizadas.length;

    if (registrosActualizados <= 0 || filasActualizadas.length === 0) {
      mostrarMensaje(
        'mensajeGuardado',
        'No se encontró ningún registro con ese documento en public.estudiantes para actualizar.',
        'error'
      );
      return;
    }

    const registroGuardado = filasActualizadas[0] || nuevosDatos;
    mostrarMensaje('mensajeGuardado', 'Cambios guardados correctamente en public.estudiantes.', 'success');
    mostrarResumen(cambios, registrosActualizados);

    // Actualizar estado interno con los datos realmente guardados
    documentoOriginal = registroGuardado.documento || nuevosDatos.documento;
    datosOriginales   = { ...registroGuardado };
    document.getElementById('badgeDocOriginal').textContent = `Documento Original: ${documentoOriginal}`;

  } catch (err) {
    mostrarMensaje('mensajeGuardado', ConsultasAdmin.interpretarError(err, 'Error al guardar'), 'error');
    console.error(err);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function leerFormulario() {
  return {
    documento: document.getElementById('edit_documento').value.trim(),
    nombre   : normalizarNombre(document.getElementById('edit_nombre').value),
    facultad : document.getElementById('edit_facultad').value.trim(),
    programa : document.getElementById('edit_programa').value.trim(),
    sede     : document.getElementById('edit_sede').value.trim().toUpperCase(),
    semestre : document.getElementById('edit_semestre').value.trim()
  };
}

function obtenerCambios() {
  const nuevos = leerFormulario();
  const cambios = [];
    const etiquetas = {
    documento: 'Documento',
    nombre   : 'Nombre',
    facultad : 'Facultad',
    programa : 'Programa',
    sede     : 'Sede',
    semestre : 'Semestre'
  };

  Object.keys(nuevos).forEach(campo => {
    const antes  = (datosOriginales[campo] || '').toString().trim();
    const despues = (nuevos[campo] || '').toString().trim();
    if (antes !== despues) {
      cambios.push({ campo, etiqueta: etiquetas[campo], antes, despues });
    }
  });

  return cambios;
}

function mostrarResumen(cambios, registrosEstudiantes) {
  const contenedor = document.getElementById('contenidoResumen');
  const seccion    = document.getElementById('resumenCambios');

  // Ocultar sección de edición y búsqueda
  document.querySelector('.edicion-container').classList.add('hidden');
  document.getElementById('seccionBusqueda').classList.add('hidden');

  const fragmento = document.createDocumentFragment();

  if (!Array.isArray(cambios) || cambios.length === 0) {
    const avisoSinCambios = document.createElement('div');
    avisoSinCambios.className = 'resumen-sin-cambios';
    avisoSinCambios.textContent = 'No hubo cambios en los datos del estudiante.';
    fragmento.appendChild(avisoSinCambios);
  } else {
    cambios.forEach(c => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'flex-start';
      item.style.gap = '2px';

      const spanLabel = document.createElement('span');
      spanLabel.className = 'cambio-label';
      spanLabel.textContent = c.etiqueta || '';

      const spanAntes = document.createElement('span');
      spanAntes.className = 'cambio-antes';
      spanAntes.textContent = c.antes || '(vacío)';

      const spanDespues = document.createElement('span');
      spanDespues.className = 'cambio-despues';
      spanDespues.textContent = `→ ${c.despues || '(vacío)'}`;

      item.appendChild(spanLabel);
      item.appendChild(spanAntes);
      item.appendChild(spanDespues);
      fragmento.appendChild(item);
    });
  }

  const totalActualizados = Number(registrosEstudiantes) || 0;
  const bannerResultado = document.createElement('div');
  bannerResultado.className = 'resumen-formularios';
  bannerResultado.textContent =
    `Actualización exitosa en public.estudiantes: ${totalActualizados} ` +
    `${totalActualizados === 1 ? 'registro actualizado' : 'registros actualizados'}.`;
  fragmento.appendChild(bannerResultado);

  // Botón Aceptar que reinicia la página
  const btnAceptar = document.createElement('button');
  btnAceptar.type = 'button';
  btnAceptar.className = 'btn';
  btnAceptar.style.marginTop = '15px';
  btnAceptar.textContent = 'Aceptar';
  btnAceptar.addEventListener('click', () => location.reload());
  fragmento.appendChild(btnAceptar);

  contenedor.textContent = '';
  contenedor.appendChild(fragmento);

  seccion.classList.remove('hidden');
  seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ── Catálogo compartido de Facultades y Programas ────────────────────────────
function invalidarCacheFacultadesProgramas() {
  ConsultasAdmin.invalidar(['tabla:facultades', 'tabla:programas', 'grupo:catalogos']);
}

function asegurarOpcionSelectSiFalta(select, valor) {
  if (!select || !valor || select.value) return;
  const option = document.createElement('option');
  option.value = valor;
  option.textContent = valor;
  option.selected = true;
  select.appendChild(option);
  select.disabled = false;
}

async function cargarFacultadesEdicion(facultadActual, programaActual, estudianteRef = null, solicitudId = null) {
  const selectFacultad = document.getElementById('edit_facultad');
  const selectPrograma = document.getElementById('edit_programa');
  if (selectFacultad) selectFacultad.disabled = true;
  if (selectPrograma) selectPrograma.disabled = true;

  try {
    await ConsultasAdmin.asegurarCatalogoProgramasYFacultades();
    if (solicitudId !== null && solicitudId !== solicitudCargaEdicionId) {
      return false;
    }

    const { facultad, programa } = resolverProgramaYFacultad(
      estudianteRef || {
        facultad: facultadActual || '',
        programa: programaActual || ''
      }
    );
    const facultadResuelta = facultad || facultadActual || '';
    const programaResuelto = programa || programaActual || '';

    if (selectFacultad) selectFacultad.disabled = false;
    cargarFacultadesCascada('edit_facultad', 'edit_programa', {
      primeraOpcionFacultad: 'Seleccione una Facultad',
      primeraOpcionPrograma: 'Seleccione un programa',
      primeraOpcionSinFacultad: 'Primero seleccione una Facultad',
      facultadSeleccionada: facultadResuelta,
      programaSeleccionado: programaResuelto
    });

    asegurarOpcionSelectSiFalta(selectFacultad, facultadResuelta);
    if (programaResuelto && selectPrograma && !selectPrograma.value) {
      cargarProgramasEdicion(programaResuelto);
    }
    return true;
  } catch (err) {
    if (selectFacultad) selectFacultad.disabled = false;
    console.error('Error cargando facultades:', err);
    return false;
  }
}

function cargarProgramasEdicion(programaSeleccionado = null) {
  cargarProgramasCascada('edit_facultad', 'edit_programa', {
    primeraOpcionPrograma: 'Seleccione un programa',
    primeraOpcionSinFacultad: 'Primero seleccione una Facultad',
    programaSeleccionado: programaSeleccionado || ''
  });
  if (programaSeleccionado) {
    asegurarOpcionSelectSiFalta(document.getElementById('edit_programa'), programaSeleccionado);
  }
}


function limpiarEdicion() {
  solicitudCargaEdicionId++;
  documentoOriginal = null;
  datosOriginales   = null;

  document.getElementById('inputBuscarDocumento').value = '';
  document.getElementById('mensajeBusqueda').textContent = '';
  document.getElementById('seccionEdicion').classList.add('hidden');
  document.getElementById('resumenCambios').classList.add('hidden');

  document.getElementById('inputBuscarDocumento').focus();
  document.getElementById('seccionBusqueda').scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ── Tutor / Docente ───────────────────────────────────────────────────────────

function actualizarCamposTD() {
  const tipo = document.getElementById('td_tipo').value;

  const grupoSede     = document.getElementById('td_grupo_sede');
  const grupoFacultad = document.getElementById('td_grupo_facultad');
  const grupoArea     = document.getElementById('td_grupo_area');
  const grupoNombre   = document.getElementById('td_grupo_nombre');
  const btnGuardar    = document.getElementById('btnGuardarTD');
  const areaTutor     = document.getElementById('td_area_tutor');
  const areaDocente   = document.getElementById('td_area_docente');

  // Ocultar todo primero
  grupoSede.style.display     = 'none';
  grupoFacultad.style.display = 'none';
  grupoArea.style.display     = 'none';
  grupoNombre.style.display   = 'none';
  btnGuardar.style.display    = 'none';

  if (tipo === 'tutor') {
    grupoSede.style.display   = 'block';
    areaTutor.style.display   = 'block';
    areaDocente.style.display = 'none';
    grupoArea.style.display   = 'block';
    grupoNombre.style.display = 'block';
    btnGuardar.style.display  = 'block';
  } else if (tipo === 'docente') {
    grupoFacultad.style.display = 'block';
    areaTutor.style.display     = 'none';
    areaDocente.style.display   = 'block';
    grupoArea.style.display     = 'block';
    grupoNombre.style.display   = 'block';
    btnGuardar.style.display    = 'block';
    actualizarAreaDocente();
  }

document.getElementById('mensajeTD').textContent = '';
document.getElementById('td_sede').value = '';
document.getElementById('td_area_tutor').value = '';
document.getElementById('td_facultad').value = '';
document.getElementById('td_area_docente').value = '';
document.getElementById('td_nombres').value = '';
}

function actualizarAreaDocente() {
  const facultad = document.getElementById('td_facultad').value;
  document.getElementById('td_area_docente').value = facultad;
}

// normalizarNombre() — función global definida en ../PMA/script.js

function normalizarListaNombres(texto) {
  if (texto === null || texto === undefined) return '';
  const str = String(texto);
  if (!str.trim()) return '';

  const partes = str.split(/([;,\n][\s;,\n]*)/);
  const elementos = [];
  let separadorPendiente = '';

  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i];
    if (i % 2 === 1) {
      const sepExplicit = parte.match(/[;,]/);
      separadorPendiente = (sepExplicit ? sepExplicit[0] : ';') + '\n';
    } else {
      const nombreNorm = normalizarNombre(parte);
      if (nombreNorm) {
        if (elementos.length > 0) {
          elementos.push(separadorPendiente || ';\n');
        }
        elementos.push(nombreNorm);
        separadorPendiente = '';
      }
    }
  }

  return elementos.join('');
}

function obtenerListaNormalizada(texto) {
  return texto
    .split(/[;,\n]/)
    .map(n => normalizarNombre(n))
    .filter(n => n.length > 0);
}

function limpiarNombresTD(textarea = document.getElementById('td_nombres')) {
  if (!textarea) return;
  textarea.value = normalizarListaNombres(textarea.value);
}

async function guardarTutorDocente() {
  const tipo = document.getElementById('td_tipo').value;

  // Validaciones
  if (!tipo) {
    mostrarMensaje('mensajeTD', 'Seleccione un tipo.', 'error'); return;
  }
  if (tipo === 'tutor' && !document.getElementById('td_sede').value) {
    mostrarMensaje('mensajeTD', 'Seleccione una sede.', 'error'); return;
  }
  if (tipo === 'tutor' && !document.getElementById('td_area_tutor').value) {
    mostrarMensaje('mensajeTD', 'Seleccione un área.', 'error'); return;
  }
  if (tipo === 'docente' && !document.getElementById('td_facultad').value) {
    mostrarMensaje('mensajeTD', 'Seleccione una facultad.', 'error'); return;
  }

  const nombresRaw = document.getElementById('td_nombres').value;
  if (!nombresRaw.trim()) {
    mostrarMensaje('mensajeTD', 'Ingrese al menos un nombre.', 'error'); return;
  }

  const nombres = obtenerListaNormalizada(nombresRaw);

  if (nombres.length === 0) {
    mostrarMensaje('mensajeTD', 'No se encontraron nombres válidos.', 'error'); return;
  }

  // Determinar tabla y payload
  let tabla, area;

  if (tipo === 'tutor') {
    const sede = document.getElementById('td_sede').value;
    tabla = sede === 'NORTE' ? 'tutores_norte' : 'tutores_sur';
    area  = document.getElementById('td_area_tutor').value;
  } else {
    tabla = 'profesores';
    area  = document.getElementById('td_facultad').value;
  }

  const btnGuardar = document.getElementById('btnGuardarTD');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarCargando('mensajeTD');

  try {
    const registros = nombres.map(nombre => {
      if (tipo === 'tutor') {
        return { nombre, area };
      }
      return { nombre, facultad_departamento: area, area };
    });

    await ConsultasAdmin.insertar(tabla, registros, {
      esquema: 'public',
      retorno: 'minimal',
      etiquetasInvalidar: ['tabla:' + tabla, 'grupo:catalogos']
    });

    mostrarMensaje('mensajeTD',
      `${nombres.length} registro(s) guardado(s) correctamente en ${tabla}.`, 'success');
    document.getElementById('td_nombres').value = '';

  } catch (err) {
    mostrarMensaje('mensajeTD', ConsultasAdmin.interpretarError(err, 'Error al guardar'), 'error');
    console.error(err);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      Guardar Registro(s)`;
  }
}



// ── Pestañas Tutor/Docente ────────────────────────────────────────────────────

function cambiarPestanaTD(pestana) {
  document.getElementById('panelAgregar').style.display  = pestana === 'agregar'  ? 'block' : 'none';
  document.getElementById('panelEliminar').style.display = pestana === 'eliminar' ? 'block' : 'none';
  document.getElementById('tabAgregar').classList.toggle('active',  pestana === 'agregar');
  document.getElementById('tabEliminar').classList.toggle('active', pestana === 'eliminar');
}

// ── Eliminar ─────────────────────────────────────────────────────────────────

function actualizarCamposEL() {
  const tipo = document.getElementById('el_tipo').value;

  document.getElementById('el_grupo_sede').style.display    = 'none';
  document.getElementById('el_grupo_facultad').style.display = 'none';
  document.getElementById('el_grupo_area').style.display    = 'none';
  document.getElementById('btnCargarLista').style.display   = 'none';
  document.getElementById('listaEliminar').style.display    = 'none';
  document.getElementById('mensajeEL').textContent          = '';
  document.getElementById('itemsLista').innerHTML           = '';

  document.getElementById('el_sede').value    = '';
  document.getElementById('el_facultad').value = '';
  document.getElementById('el_area').value    = '';

  if (tipo === 'tutor') {
    document.getElementById('el_grupo_sede').style.display = 'block';
    document.getElementById('el_grupo_area').style.display = 'block';
    document.getElementById('btnCargarLista').style.display = 'block';
  } else if (tipo === 'docente') {
    document.getElementById('el_grupo_facultad').style.display = 'block';
    document.getElementById('btnCargarLista').style.display = 'block';
  }
}

async function cargarListaEliminar() {
  const tipo = document.getElementById('el_tipo').value;

  if (tipo === 'tutor' && !document.getElementById('el_sede').value) {
    mostrarMensaje('mensajeEL', 'Seleccione una sede.', 'error'); return;
  }
  if (tipo === 'docente' && !document.getElementById('el_facultad').value) {
    mostrarMensaje('mensajeEL', 'Seleccione una Facultad.', 'error'); return;
  }

  let tabla;
  const opcionesConsulta = {
    select: 'id,nombre,area',
    order: 'nombre.asc'
  };

  if (tipo === 'tutor') {
    const sede = document.getElementById('el_sede').value;
    const area = document.getElementById('el_area').value;
    tabla = sede === 'NORTE' ? 'tutores_norte' : 'tutores_sur';
    if (area) {
      opcionesConsulta.eq = { field: 'area', value: area };
    }
  } else {
    const facultad = document.getElementById('el_facultad').value;
    tabla = 'profesores';
    opcionesConsulta.eq = { field: 'facultad_departamento', value: facultad };
  }

  const btnCargar = document.getElementById('btnCargarLista');
  btnCargar.disabled = true;
  btnCargar.textContent = 'Cargando...';
  mostrarCargando('mensajeEL');

  try {
    const data = await ConsultasAdmin.consultarTodo(tabla, opcionesConsulta, 'public');

    document.getElementById('mensajeEL').textContent = '';
    document.getElementById('listaEliminar').style.display = 'block';
    document.getElementById('contadorLista').textContent = `${data.length} registro(s) encontrado(s)`;
    document.getElementById('btnEliminarSeleccionados').style.display = 'none';
    document.getElementById('chkSeleccionarTodos').checked = false;

    const contenedor = document.getElementById('itemsLista');

    if (data.length === 0) {
      contenedor.innerHTML = '<div class="resumen-sin-cambios">No se encontraron registros con esos filtros.</div>';
      return;
    }

    const fragmento = document.createDocumentFragment();
    data.forEach(item => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.style.gap = '10px';

      const idStr = String(item.id ?? '');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `chk_${idStr}`;
      checkbox.value = idStr;
      checkbox.style.cssText = 'width:18px; height:18px; flex-shrink:0; cursor:pointer;';
      checkbox.addEventListener('change', actualizarBotonEliminar);

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.style.cssText = 'margin:0; font-weight:400; cursor:pointer; flex:1; display:flex; justify-content:space-between; align-items:center;';

      const spanNombre = document.createElement('span');
      spanNombre.textContent = item.nombre || '';

      const spanArea = document.createElement('span');
      spanArea.style.cssText = 'font-size:11px; color:#888; margin-left:6px;';
      spanArea.textContent = item.area || '';

      label.appendChild(spanNombre);
      label.appendChild(spanArea);
      row.appendChild(checkbox);
      row.appendChild(label);
      fragmento.appendChild(row);
    });
    contenedor.textContent = '';
    contenedor.appendChild(fragmento);

    // Guardar referencia a la tabla actual
    window._tablaEliminar = tabla;

  } catch (err) {
    mostrarMensaje('mensajeEL', 'Error de conexión: ' + err.message, 'error');
    console.error(err);
  } finally {
    btnCargar.disabled = false;
    btnCargar.textContent = 'Cargar lista';
  }
}

function seleccionarTodosEL(marcar) {
  document.querySelectorAll('#itemsLista input[type="checkbox"]').forEach(chk => {
    chk.checked = marcar;
  });
  document.getElementById('chkSeleccionarTodos').checked = marcar;
  actualizarBotonEliminar();
}

function actualizarBotonEliminar() {
  const checkboxes = document.querySelectorAll('#itemsLista input[type="checkbox"]');
  const seleccionados = document.querySelectorAll('#itemsLista input[type="checkbox"]:checked').length;
  const btn = document.getElementById('btnEliminarSeleccionados');
  btn.style.display = seleccionados > 0 ? 'block' : 'none';
  btn.textContent = `Eliminar ${seleccionados} registro(s)`;

  // El check maestro solo queda activo si TODOS los ítems están seleccionados
  document.getElementById('chkSeleccionarTodos').checked =
    checkboxes.length > 0 && seleccionados === checkboxes.length;
}

async function eliminarSeleccionados() {
  const checkboxes = document.querySelectorAll('#itemsLista input[type="checkbox"]:checked');
  const ids = Array.from(checkboxes).map(chk => chk.value);

  if (ids.length === 0) return;

  const tabla = window._tablaEliminar;

  mostrarModalConfirmacion(
    '¿Eliminar registros?',
    `Se eliminarán ${ids.length} registro(s) de forma permanente.`,
    async () => {
      const btn = document.getElementById('btnEliminarSeleccionados');
      btn.disabled = true;
      btn.textContent = 'Eliminando...';
      mostrarCargando('mensajeEL');

      try {
        await ConsultasAdmin.eliminar(tabla, ids, {
          esquema: 'public',
          etiquetasInvalidar: ['tabla:' + tabla, 'grupo:catalogos']
        });

        mostrarMensaje('mensajeEL', `${ids.length} registro(s) eliminado(s) correctamente.`, 'success');

        // Recargar lista
        cargarListaEliminar();

      } catch (err) {
        mostrarMensaje('mensajeEL', ConsultasAdmin.interpretarError(err, 'Error al eliminar'), 'error');
        console.error(err);
      } finally {
        btn.disabled = false;
btn.innerHTML = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path><path d="M14 11v6"></path>
    <path d="M9 6V4h6v2"></path>
  </svg>
  Eliminar seleccionados`;
      }
    }
  );
}



// ── Facultades / Programas ────────────────────────────────────────────────────

async function inicializarSeccionFacultades() {
  try {
    await ConsultasAdmin.asegurarCatalogoProgramasYFacultades();
    poblarSelectFacultadFP(document.getElementById('fp_facultad'), true);
    poblarSelectFacultadFP(document.getElementById('elfp_facultad'), false);
  } catch (err) {
    console.error('Error cargando facultades:', err);
  }
}

function poblarSelectFacultadFP(select, incluirOpcionNueva) {
  select.innerHTML = '<option value="">Seleccione una Facultad</option>';
  obtenerFacultadesCatalogo().forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.nombre;
    opt.textContent = f.nombre;
    select.appendChild(opt);
  });
  if (incluirOpcionNueva) {
    const optNueva = document.createElement('option');
    optNueva.value = '__nueva__';
    optNueva.textContent = '+ Nueva Facultad';
    select.appendChild(optNueva);
  }
}

function cambiarPestanaFP(pestana) {
  document.getElementById('panelFacAgregar').style.display  = pestana === 'agregar'  ? 'block' : 'none';
  document.getElementById('panelFacEliminar').style.display = pestana === 'eliminar' ? 'block' : 'none';
  document.getElementById('tabFacAgregar').classList.toggle('active',  pestana === 'agregar');
  document.getElementById('tabFacEliminar').classList.toggle('active', pestana === 'eliminar');
}

function actualizarCamposFP() {
  const facultad = document.getElementById('fp_facultad').value;
  const grupoNueva = document.getElementById('fp_grupo_nueva_facultad');
  const grupoProgramas = document.getElementById('fp_grupo_programas');
  const btnGuardar = document.getElementById('btnGuardarFP');

  grupoNueva.style.display = facultad === '__nueva__' ? 'block' : 'none';
  grupoProgramas.style.display = facultad ? 'block' : 'none';
  btnGuardar.style.display = facultad ? 'block' : 'none';

  document.getElementById('mensajeFP').textContent = '';
  document.getElementById('fp_nueva_facultad').value = '';
  document.getElementById('fp_programas').value = '';
}

async function guardarFacultadPrograma() {
  const facultadSeleccionada = document.getElementById('fp_facultad').value;

  if (!facultadSeleccionada) {
    mostrarMensaje('mensajeFP', 'Seleccione una Facultad.', 'error'); return;
  }

  let facultad = facultadSeleccionada;
  if (facultadSeleccionada === '__nueva__') {
    facultad = normalizarNombre(document.getElementById('fp_nueva_facultad').value);
    if (!facultad) {
      mostrarMensaje('mensajeFP', 'Ingrese el nombre de la nueva facultad.', 'error'); return;
    }
  }

  const programasRaw = document.getElementById('fp_programas').value;
  if (!programasRaw.trim()) {
    mostrarMensaje('mensajeFP', 'Ingrese al menos un programa.', 'error'); return;
  }

  const programas = obtenerListaNormalizada(programasRaw);

  if (programas.length === 0) {
    mostrarMensaje('mensajeFP', 'No se encontraron programas válidos.', 'error'); return;
  }

  const btnGuardar = document.getElementById('btnGuardarFP');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarCargando('mensajeFP');

  try {
    await ConsultasAdmin.asegurarCatalogoProgramasYFacultades();

    const facExistente = obtenerFacultadCatalogoPorNombre(facultad);
    let facultadId = facExistente ? facExistente.id : null;

    if (!facultadId) {
      try {
        const facCreada = await ConsultasAdmin.insertar(
          'facultades',
          { nombre: facultad },
          {
            esquema: 'public',
            retorno: 'representation',
            etiquetasInvalidar: ['tabla:facultades', 'grupo:catalogos']
          }
        );
        facultadId = Array.isArray(facCreada) ? facCreada[0]?.id : facCreada?.id;
      } catch (errFac) {
        if (Number(errFac && errFac.status) === 409 || String(errFac && errFac.codigo) === '23505') {
          const existente = await ConsultasAdmin.consultarUno(
            'facultades',
            { select: 'id', eq: { field: 'nombre', value: facultad } },
            'public'
          );
          facultadId = existente ? existente.id : null;
        } else {
          throw errFac;
        }
      }

      if (!facultadId) {
        throw new Error('No se pudo obtener o crear la facultad');
      }
    }

    const registrosProgramas = programas.map(programa => ({
      facultad_id: facultadId,
      nombre: programa
    }));

    await ConsultasAdmin.insertar('programas', registrosProgramas, {
      esquema: 'public',
      retorno: 'minimal',
      etiquetasInvalidar: ['tabla:programas', 'tabla:facultades', 'grupo:catalogos']
    });

    invalidarCacheFacultadesProgramas();
    await ConsultasAdmin.obtenerFacultadesProgramas({ forzar: true });
    poblarSelectFacultadFP(document.getElementById('fp_facultad'), true);
    poblarSelectFacultadFP(document.getElementById('elfp_facultad'), false);

    const facSeleccionada = obtenerFacultadCatalogoPorNombre(facultad)?.nombre || facultad;
    mostrarMensaje('mensajeFP', `${programas.length} programa(s) guardado(s) correctamente en "${facSeleccionada}".`, 'success');
    document.getElementById('fp_facultad').value = facSeleccionada;
    actualizarCamposFP();

  } catch (err) {
    mostrarMensaje('mensajeFP', ConsultasAdmin.interpretarError(err, 'Error al guardar'), 'error');
    console.error(err);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      Guardar Registro(s)`;
  }
}

// ── Eliminar programas ────────────────────────────────────────────────────────

async function cargarListaEliminarFP() {
  const facultad = document.getElementById('elfp_facultad').value;

  if (!facultad) {
    mostrarMensaje('mensajeELFP', 'Seleccione una Facultad.', 'error'); return;
  }

  const btnCargar = document.getElementById('btnCargarListaFP');
  btnCargar.disabled = true;
  btnCargar.textContent = 'Cargando...';
  mostrarCargando('mensajeELFP');

  try {
    const data = await ConsultasAdmin.consultarTodo(
      'programas',
      {
        select: 'id,nombre,facultades!inner(id,nombre)',
        eq: { field: 'facultades.nombre', value: facultad },
        order: 'nombre.asc'
      },
      'public'
    );

    document.getElementById('mensajeELFP').textContent = '';
    document.getElementById('listaEliminarFP').style.display = 'block';
    document.getElementById('contadorListaFP').textContent = `${data.length} programa(s) encontrado(s)`;
    document.getElementById('btnEliminarSeleccionadosFP').style.display = 'none';
    document.getElementById('chkSeleccionarTodosFP').checked = false;

    const contenedor = document.getElementById('itemsListaFP');

    if (data.length === 0) {
      contenedor.innerHTML = '<div class="resumen-sin-cambios">No se encontraron programas para esta facultad.</div>';
      return;
    }

    const fragmento = document.createDocumentFragment();
    data.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.style.gap = '10px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `chkfp_${i}`;
      checkbox.value = encodeURIComponent(item.id);
      checkbox.dataset.nombre = encodeURIComponent(item.nombre || '');
      checkbox.style.cssText = 'width:18px; height:18px; flex-shrink:0; cursor:pointer;';
      checkbox.addEventListener('change', actualizarBotonEliminarFP);

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.style.cssText = 'margin:0; font-weight:400; cursor:pointer; flex:1;';
      label.textContent = item.nombre || '';

      row.appendChild(checkbox);
      row.appendChild(label);
      fragmento.appendChild(row);
    });
    contenedor.textContent = '';
    contenedor.appendChild(fragmento);

    // Guardar referencia a la facultad de la lista actual
    window._facultadEliminarFP = facultad;

  } catch (err) {
    mostrarMensaje('mensajeELFP', 'Error de conexión: ' + err.message, 'error');
    console.error(err);
  } finally {
    btnCargar.disabled = false;
    btnCargar.textContent = 'Cargar lista';
  }
}

function seleccionarTodosFP(marcar) {
  document.querySelectorAll('#itemsListaFP input[type="checkbox"]').forEach(chk => {
    chk.checked = marcar;
  });
  document.getElementById('chkSeleccionarTodosFP').checked = marcar;
  actualizarBotonEliminarFP();
}

function actualizarBotonEliminarFP() {
  const checkboxes = document.querySelectorAll('#itemsListaFP input[type="checkbox"]');
  const seleccionados = document.querySelectorAll('#itemsListaFP input[type="checkbox"]:checked').length;
  const btn = document.getElementById('btnEliminarSeleccionadosFP');
  btn.style.display = seleccionados > 0 ? 'block' : 'none';
  btn.textContent = `Eliminar ${seleccionados} programa(s)`;

  document.getElementById('chkSeleccionarTodosFP').checked =
    checkboxes.length > 0 && seleccionados === checkboxes.length;
}

async function eliminarSeleccionadosFP() {
  const checkboxes = document.querySelectorAll('#itemsListaFP input[type="checkbox"]:checked');
  const idsProgramas = Array.from(checkboxes).map(chk => decodeURIComponent(chk.value));

  if (idsProgramas.length === 0) return;

  const facultad = window._facultadEliminarFP;

  mostrarModalConfirmacion(
    '¿Eliminar programas?',
    `Se eliminarán ${idsProgramas.length} programa(s) de forma permanente.`,
    async () => {
      const btn = document.getElementById('btnEliminarSeleccionadosFP');
      btn.disabled = true;
      btn.textContent = 'Eliminando...';
      mostrarCargando('mensajeELFP');

      try {
        await ConsultasAdmin.eliminar('programas', idsProgramas, {
          esquema: 'public',
          etiquetasInvalidar: ['tabla:programas', 'tabla:facultades', 'grupo:catalogos']
        });

        invalidarCacheFacultadesProgramas();

        mostrarMensaje('mensajeELFP', `${idsProgramas.length} programa(s) eliminado(s) correctamente.`, 'success');

        cargarListaEliminarFP();

        await ConsultasAdmin.obtenerFacultadesProgramas({ forzar: true });
        poblarSelectFacultadFP(document.getElementById('fp_facultad'), true);
        poblarSelectFacultadFP(document.getElementById('elfp_facultad'), false);
        document.getElementById('elfp_facultad').value = obtenerFacultadCatalogoPorNombre(facultad)?.nombre || facultad;

      } catch (err) {
        mostrarMensaje('mensajeELFP', ConsultasAdmin.interpretarError(err, 'Error al eliminar'), 'error');
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path><path d="M14 11v6"></path>
            <path d="M9 6V4h6v2"></path>
          </svg>
          Eliminar seleccionados`;
      }
    }
  );
}
