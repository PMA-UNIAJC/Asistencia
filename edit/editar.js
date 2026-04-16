/* ===========================================
   editar.js — lógica para editar estudiante
   Depende de: script.js (SUPABASE_URL, SUPABASE_KEY,
   mostrarMensaje, mostrarCargando, mostrarModalConfirmacion)
   =========================================== */

// Estado interno
let documentoOriginal = null;   // Documento con el que se buscó
let datosOriginales    = null;   // Snapshot del registro al cargar

// ── Inicialización ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  if (!sessionStorage.getItem('adminAuth')) {
    alert('Debe iniciar sesión como administrador para acceder a esta página.');
    window.location.href = '../import/admin.html';
  }
});

// ── Buscar estudiante ────────────────────────────────────────────────────────

async function buscarEstudiante() {
  const inputEl  = document.getElementById('inputBuscarDocumento');
  const documento = inputEl.value.trim();

  if (!documento) {
    mostrarMensaje('mensajeBusqueda', 'Por favor ingrese un número de documento.', 'error');
    return;
  }

  const btnBuscar = document.getElementById('btnBuscar');
  btnBuscar.disabled = true;
  btnBuscar.textContent = 'Buscando...';
  mostrarCargando('mensajeBusqueda');

  try {
    const url = `${SUPABASE_URL}/rest/v1/estudiantes?documento=eq.${encodeURIComponent(documento)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error consultando la base de datos');

    const data = await response.json();

    if (!data || data.length === 0) {
      mostrarMensaje('mensajeBusqueda', `No se encontró ningún estudiante con este documento.`, 'error');
      return;
    }

    const estudiante = data[0];
    documentoOriginal = estudiante.documento;
    datosOriginales   = { ...estudiante };

    cargarFormularioEdicion(estudiante);
    document.getElementById('mensajeBusqueda').textContent = '';

  } catch (err) {
    mostrarMensaje('mensajeBusqueda', 'Error de conexión: ' + err.message, 'error');
    console.error(err);
  } finally {
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

function cargarFormularioEdicion(est) {
  document.getElementById('edit_documento')       .value = est.documento       || '';
  document.getElementById('edit_primer_nombre')   .value = est.primer_nombre   || '';
  document.getElementById('edit_segundo_nombre')  .value = est.segundo_nombre  || '';
  document.getElementById('edit_primer_apellido') .value = est.primer_apellido || '';
  document.getElementById('edit_segundo_apellido').value = est.segundo_apellido || '';
  cargarFacultadesEdicion(est.facultad || '', est.programa || '');
  document.getElementById('edit_semestre')        .value = est.semestre        || '';

  // Sede: select — setTimeout
  setTimeout(() => {
    document.getElementById('edit_sede').value = (est.sede || '').trim().toUpperCase();
}, 0);

  // Badge doc original
  document.getElementById('badgeDocOriginal').textContent = `Doc. original: ${documentoOriginal}`;

  // Mostrar alerta de sincronización
  document.getElementById('alertaSincronizacion').style.display = 'block';

  // Ocultar resumen previo
  document.getElementById('resumenCambios').classList.add('hidden');
  document.getElementById('mensajeGuardado').textContent = '';

  // Mostrar sección edición
  document.getElementById('seccionEdicion').classList.remove('hidden');
  document.getElementById('seccionEdicion').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Deshabilitar botón guardar hasta que haya cambios
  const btnGuardar = document.getElementById('btnGuardar');
  btnGuardar.disabled = true;
  btnGuardar.style.opacity = '0.5';

  const campos = ['edit_documento','edit_primer_nombre','edit_segundo_nombre',
    'edit_primer_apellido','edit_segundo_apellido','edit_facultad',
    'edit_programa','edit_sede','edit_semestre'];

  campos.forEach(id => {
    document.getElementById(id).addEventListener('input', verificarCambios);
    document.getElementById(id).addEventListener('change', verificarCambios);
  });

  function verificarCambios() {
    const hayCambios = obtenerCambios().length > 0;
    btnGuardar.disabled = !hayCambios;
    btnGuardar.style.opacity = hayCambios ? '1' : '0.5';
  }
}

// ── Guardar cambios ──────────────────────────────────────────────────────────

function guardarCambios() {
  const nuevoDocumento = document.getElementById('edit_documento').value.trim();
  if (!nuevoDocumento) {
    mostrarMensaje('mensajeGuardado', 'El campo Documento no puede estar vacío.', 'error');
    return;
  }
  if (!document.getElementById('edit_primer_nombre').value.trim()) {
    mostrarMensaje('mensajeGuardado', 'El campo Primer Nombre no puede estar vacío.', 'error');
    return;
  }
  if (!document.getElementById('edit_primer_apellido').value.trim()) {
    mostrarMensaje('mensajeGuardado', 'El campo Primer Apellido no puede estar vacío.', 'error');
    return;
  }


  // confirmación
const cambios = obtenerCambios();
const msgConfirmacion = 'Se actualizarán los datos del estudiante en todos los registros.';

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

    // 1. Actualizar tabla estudiantes
    const urlEst = `${SUPABASE_URL}/rest/v1/estudiantes?documento=eq.${encodeURIComponent(documentoOriginal)}`;
    const respEst = await fetch(urlEst, {
      method: 'PATCH',
      headers: {
        'apikey'      : SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer'      : 'return=minimal'
      },
      body: JSON.stringify(nuevosDatos)
    });

    if (!respEst.ok) {
      const err = await respEst.text();
      throw new Error('Error actualizando estudiante: ' + err);
    }

    // 2. Actualizar tabla formularios donde documento = documentoOriginal
    //    Mapeamos columnas de estudiantes → columnas de formularios
    const payloadFormularios = construirPayloadFormularios(nuevosDatos);
    let registrosActualizados = 0;

    if (Object.keys(payloadFormularios).length > 0) {
      const urlForm = `${SUPABASE_URL}/rest/v1/formularios?documento=eq.${encodeURIComponent(documentoOriginal)}`;
      const respForm = await fetch(urlForm, {
        method: 'PATCH',
        headers: {
          'apikey'      : SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer'      : 'return=representation',
          'Accept'      : 'application/json'
        },
        body: JSON.stringify(payloadFormularios)
      });

      if (!respForm.ok) {
        const err = await respForm.text();
        throw new Error('Error actualizando formularios: ' + err);
      }

      const dataForm = await respForm.json();
      registrosActualizados = Array.isArray(dataForm) ? dataForm.length : 0;
    }

    // 3. Éxito
    mostrarMensaje('mensajeGuardado', 'Cambios guardados correctamente.', 'success');
    mostrarResumen(cambios, registrosActualizados);

    // Actualizar estado interno con los nuevos datos
    documentoOriginal = nuevosDatos.documento;
    datosOriginales   = { ...nuevosDatos };
    document.getElementById('badgeDocOriginal').textContent = `Doc. original: ${documentoOriginal}`;

  } catch (err) {
    mostrarMensaje('mensajeGuardado', 'Error al guardar: ' + err.message, 'error');
    console.error(err);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function leerFormulario() {
  return {
    documento       : document.getElementById('edit_documento')       .value.trim(),
    primer_nombre   : document.getElementById('edit_primer_nombre')   .value.trim(),
    segundo_nombre  : document.getElementById('edit_segundo_nombre')  .value.trim(),
    primer_apellido : document.getElementById('edit_primer_apellido') .value.trim(),
    segundo_apellido: document.getElementById('edit_segundo_apellido').value.trim(),
    facultad        : document.getElementById('edit_facultad')        .value.trim(),
    programa        : document.getElementById('edit_programa')        .value.trim(),
    sede            : document.getElementById('edit_sede')            .value,
    semestre        : document.getElementById('edit_semestre')        .value.trim()
  };
}

function obtenerCambios() {
  const nuevos = leerFormulario();
  const cambios = [];
  const etiquetas = {
    documento       : 'Documento',
    primer_nombre   : 'Primer Nombre',
    segundo_nombre  : 'Segundo Nombre',
    primer_apellido : 'Primer Apellido',
    segundo_apellido: 'Segundo Apellido',
    facultad        : 'Facultad',
    programa        : 'Programa',
    sede            : 'Sede',
    semestre        : 'Semestre'
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

/**
 * Mapea los campos de "estudiantes" a las columnas equivalentes en "formularios".
 * Solo incluye los campos que existen en formularios.
 */
function construirPayloadFormularios(nuevosDatos) {
  const payload = {};

  // documento → documento
  if (nuevosDatos.documento !== undefined) {
    payload.documento = nuevosDatos.documento;
  }

  // nombres en formularios = primer_nombre + ' ' + segundo_nombre (columna "nombres")
  const primerNombre   = nuevosDatos.primer_nombre   || '';
  const segundoNombre  = nuevosDatos.segundo_nombre  || '';
  const nombreCompleto = [primerNombre, segundoNombre].filter(Boolean).join(' ').trim();
  if (nombreCompleto) payload.nombres = nombreCompleto;

  // apellidos en formularios = primer_apellido + ' ' + segundo_apellido (columna "apellidos")
  const primerApellido  = nuevosDatos.primer_apellido  || '';
  const segundoApellido = nuevosDatos.segundo_apellido || '';
  const apellidoCompleto = [primerApellido, segundoApellido].filter(Boolean).join(' ').trim();
  if (apellidoCompleto) payload.apellidos = apellidoCompleto;

  // facultad → facultad
  if (nuevosDatos.facultad !== undefined) payload.facultad = nuevosDatos.facultad;

  // programa → programa
  if (nuevosDatos.programa !== undefined) payload.programa = nuevosDatos.programa;

  // sede → sede_estudiante
  if (nuevosDatos.sede !== undefined) payload.sede_estudiante = nuevosDatos.sede;

  // semestre → semestre
  if (nuevosDatos.semestre !== undefined) payload.semestre = nuevosDatos.semestre;

  return payload;
}

function mostrarResumen(cambios, registrosFormularios) {
  const contenedor = document.getElementById('contenidoResumen');
  const seccion    = document.getElementById('resumenCambios');

// Ocultar sección de edición y búsqueda
document.querySelector('.edicion-container').classList.add('hidden');
document.getElementById('seccionBusqueda').classList.add('hidden');

  if (cambios.length === 0) {
    contenedor.innerHTML = `<div class="resumen-sin-cambios">No hubo cambios en los datos del estudiante.</div>`;
  } else {
    let html = '';
    cambios.forEach(c => {
      html += `
        <div class="list-item" style="flex-direction:column;align-items:flex-start;gap:2px;">
          <span class="cambio-label">${c.etiqueta}</span>
          <span class="cambio-antes">${c.antes || '(vacío)'}</span>
          <span class="cambio-despues">→ ${c.despues || '(vacío)'}</span>
        </div>`;
    });
    contenedor.innerHTML = html;
  }

  if (registrosFormularios > 0) {
    contenedor.innerHTML += `
      <div class="resumen-formularios">
        ${registrosFormularios} registro(s) de asistencia actualizados en <strong>formularios</strong>.
      </div>`;
  } else {
    contenedor.innerHTML += `
      <div class="resumen-sin-cambios">
        No se encontraron registros de asistencia para este documento en <strong>formularios</strong>.
      </div>`;
  }

  // Botón Aceptar que reinicia la página
  contenedor.innerHTML += `
    <button class="btn" style="margin-top:15px;" onclick="location.reload()">Aceptar</button>`;

  seccion.classList.remove('hidden');
  seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


async function cargarFacultadesEdicion(facultadActual, programaActual) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/facultades_carreras`;
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    });
    const data = await response.json();

    // Construir objeto facultad → programas
    const facultadesMap = {};
    data.forEach(item => {
      if (!facultadesMap[item.facultad]) facultadesMap[item.facultad] = [];
      facultadesMap[item.facultad].push(item.programa);
    });

    // Guardar en window para reutilizar en cargarProgramasEdicion
    window._facultadesEdicionMap = facultadesMap;

    // Poblar select de facultades
    const selectFacultad = document.getElementById('edit_facultad');
    selectFacultad.innerHTML = '<option value="">Seleccione una facultad</option>';
    Object.keys(facultadesMap).sort().forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      if (f === facultadActual) opt.selected = true;
      selectFacultad.appendChild(opt);
    });

    // Cargar programas de la facultad actual
    cargarProgramasEdicion(programaActual);

  } catch (err) {
    console.error('Error cargando facultades:', err);
  }
}

function cargarProgramasEdicion(programaSeleccionado = null) {
  const facultad = document.getElementById('edit_facultad').value;
  const selectPrograma = document.getElementById('edit_programa');

  if (!facultad || !window._facultadesEdicionMap) {
    selectPrograma.innerHTML = '<option value="">Primero seleccione una facultad</option>';
    selectPrograma.disabled = true;
    return;
  }

  const programas = (window._facultadesEdicionMap[facultad] || []).sort();
  selectPrograma.innerHTML = '<option value="">Seleccione un programa</option>';
  programas.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (p === (programaSeleccionado || '')) opt.selected = true;
    selectPrograma.appendChild(opt);
  });
  selectPrograma.disabled = false;
}


function limpiarEdicion() {
  documentoOriginal = null;
  datosOriginales   = null;

  document.getElementById('inputBuscarDocumento').value = '';
  document.getElementById('mensajeBusqueda').textContent = '';
  document.getElementById('seccionEdicion').classList.add('hidden');
  document.getElementById('resumenCambios').classList.add('hidden');

  document.getElementById('inputBuscarDocumento').focus();
  document.getElementById('seccionBusqueda').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
