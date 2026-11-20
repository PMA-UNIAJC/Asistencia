// ── MÓDULO DE AAA (NAVEGACIÓN Y REMISIONES) ─────────────────────────────────

let remisionesAAACache = [];

function resetearTabsAAA() {
  const primerTabAAA = document.querySelector('#contenidoAAA .admin-tabs-secundario .admin-tab');
  if (primerTabAAA) {
    document.querySelectorAll('#contenidoAAA .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
    primerTabAAA.classList.add('active');
    document.getElementById('tabRemisionesAAA').classList.add('hidden');
    document.getElementById('tabDescargasAAA').classList.remove('hidden');
  }
}

function cambiarTabAAA(event, tab) {
  document.querySelectorAll('#contenidoAAA .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else if (event && event.target) {
    event.target.classList.add('active');
  }
  document.getElementById('tabDescargasAAA').classList.add('hidden');
  document.getElementById('tabRemisionesAAA').classList.add('hidden');

  if (tab === 'descargas') {
    document.getElementById('tabDescargasAAA').classList.remove('hidden');
  } else if (tab === 'remisiones') {
    document.getElementById('tabRemisionesAAA').classList.remove('hidden');
    if (remisionesAAACache.length === 0) {
      cargarRemisionesAAA();
    }
  }
}

async function actualizarEstadisticasAAA() {
  ConsultasAdmin.invalidar(['tabla:acompanamiento']);
  remisionesAAACache = [];
  await cargarRemisionesAAA({ forzar: true });
}

function crearFilaEstadoRemisiones(texto, color) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 9;
  td.style.cssText = `text-align:center; padding:20px; color:${color};`;
  td.textContent = texto;
  tr.appendChild(td);
  return tr;
}

async function cargarRemisionesAAA(opciones) {
  const tbody = document.getElementById('cuerpoRemisionesAAA');
  const mensaje = document.getElementById('mensajeRemisionesAAA');
  const loader = mostrarCargando(document.body);
  tbody.textContent = '';
  mensaje.textContent = '';

  try {
    const data = await ConsultasAdmin.obtenerAcompanamiento({
      orden: 'desc',
      forzar: Boolean(opciones && opciones.forzar)
    });
    remisionesAAACache = data;
    filtrarRemisiones();
  } catch (err) {
    tbody.textContent = '';
    tbody.appendChild(crearFilaEstadoRemisiones('Error al cargar los registros.', '#dc3545'));
    console.error(err);
  } finally {
    ocultarCargando(loader);
  }
}

function filtrarRemisiones() {
  const textoBusqueda = (document.getElementById('buscadorCodigoRemision')?.value || '').trim().toUpperCase();
  const estadoFiltro = document.getElementById('filtroEstadoRemision')?.value || '';

  let filtrados = remisionesAAACache;

  if (textoBusqueda) {
    filtrados = filtrados.filter(r => (r.codigo_remision || '').toUpperCase().includes(textoBusqueda));
  }
  if (estadoFiltro) {
    filtrados = filtrados.filter(r => (r.estado_remision || '') === estadoFiltro);
  }

  renderTablaRemisiones(filtrados);
}

function renderTablaRemisiones(datos) {
  const tbody = document.getElementById('cuerpoRemisionesAAA');
  const mensaje = document.getElementById('mensajeRemisionesAAA');
  tbody.textContent = '';

  if (!datos || datos.length === 0) {
    tbody.appendChild(crearFilaEstadoRemisiones('No se encontraron registros.', '#666'));
    mensaje.textContent = '';
    return;
  }

  mensaje.textContent = `Mostrando ${datos.length} registro${datos.length !== 1 ? 's' : ''}.`;

  const ESTADOS = ['Enviado', 'Recibido', 'En atención', 'Finalizado'];
  const fragmento = document.createDocumentFragment();

  datos.forEach(fila => {
    const codigo = fila.codigo_remision || '';
    const fechaStr = formatearFechaColombia(fila.fecha_hora, { formato: 'fecha' }) || '—';
    const estadoActual = fila.estado_remision || 'Enviado';

    const tr = document.createElement('tr');
    tr.dataset.codigo = codigo;

    const crearCelda = (clase, texto, cssExtra) => {
      const td = document.createElement('td');
      if (clase) td.className = clase;
      if (cssExtra) td.style.cssText = cssExtra;
      td.textContent = texto;
      return td;
    };

    const { programa: nombrePrograma } = resolverProgramaYFacultad(fila);

    tr.appendChild(crearCelda('tabla-tutor-num', codigo || '—', 'font-weight:700; color:#1e3c72; white-space:nowrap;'));
    tr.appendChild(crearCelda('tabla-tutor-num', fechaStr, 'white-space:nowrap;'));
    tr.appendChild(crearCelda('tabla-tutor-num', fila.tipo_acompanamiento || '—', 'white-space:nowrap;'));
    tr.appendChild(crearCelda('tabla-tutor-nombre', fila.nombres_y_apellidos || fila.nombre || '—'));
    tr.appendChild(crearCelda('tabla-tutor-num', fila.grupo || '—'));
    tr.appendChild(crearCelda('tabla-tutor-nombre', nombrePrograma || '—'));
    tr.appendChild(crearCelda('tabla-tutor-nombre', fila.profesor || '—'));
    tr.appendChild(crearCelda('tabla-tutor-nombre', fila.asignatura || '—'));

    const tdAcciones = document.createElement('td');
    tdAcciones.style.cssText = 'text-align:center; white-space:nowrap;';

    const wrapAcciones = document.createElement('div');
    wrapAcciones.className = 'remision-acciones';

    const selectEstado = document.createElement('select');
    selectEstado.className = 'remision-estado-select';
    selectEstado.dataset.codigo = codigo;
    ESTADOS.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e;
      opt.textContent = e;
      opt.selected = e === estadoActual;
      selectEstado.appendChild(opt);
    });
    selectEstado.addEventListener('change', function () {
      guardarEstadoRemision(this);
    });
    wrapAcciones.appendChild(selectEstado);

    const wrapBotones = document.createElement('div');
    wrapBotones.className = 'remision-botones';

    const btnComentario = document.createElement('button');
    btnComentario.type = 'button';
    btnComentario.className = 'remision-btn';
    btnComentario.title = 'Ver comentarios';
    btnComentario.textContent = '💬';
    btnComentario.addEventListener('click', function () {
      abrirComentarioAAA(codigo);
    });

    const btnInfo = document.createElement('button');
    btnInfo.type = 'button';
    btnInfo.className = 'remision-btn';
    btnInfo.title = 'Ver/editar información';
    btnInfo.textContent = '📝';
    btnInfo.addEventListener('click', function () {
      abrirInformacionAAA(codigo);
    });

    wrapBotones.appendChild(btnComentario);
    wrapBotones.appendChild(btnInfo);
    wrapAcciones.appendChild(wrapBotones);
    tdAcciones.appendChild(wrapAcciones);
    tr.appendChild(tdAcciones);

    fragmento.appendChild(tr);
  });

  tbody.appendChild(fragmento);
}

function abrirComentarioAAA(codigo) {
  const registro = remisionesAAACache.find(r => r.codigo_remision === codigo);
  const comentario = registro?.comentarios?.trim() || 'No hay comentarios.';
  document.getElementById('contenidoComentarioAAA').textContent = comentario;
  document.getElementById('modalComentarioAAA').classList.remove('hidden');
}

function cerrarModalComentarioAAA() {
  document.getElementById('modalComentarioAAA').classList.add('hidden');
}

function abrirInformacionAAA(codigo) {
  const registro = remisionesAAACache.find(r => r.codigo_remision === codigo);
  document.getElementById('modalInfoCodigoAAA').value = codigo;
  document.getElementById('contenidoInformacionAAA').value = registro?.informacion || '';
  document.getElementById('mensajeGuardadoInfo').textContent = '';

  const fechaEl = document.getElementById('fechaActualizacionInfo');
  if (registro?.fecha_actualizacion_info) {
    const fechaFormateada = formatearFechaColombia(registro.fecha_actualizacion_info, { formato: 'fechaHoraLocal' });
    fechaEl.textContent = `Última actualización: ${fechaFormateada}`;
  } else {
    fechaEl.textContent = 'Sin actualizaciones registradas.';
  }

  document.getElementById('modalInformacionAAA').classList.remove('hidden');
}

function cerrarModalInformacionAAA() {
  document.getElementById('modalInformacionAAA').classList.add('hidden');
}

async function guardarInformacionAAA() {
  const codigo = document.getElementById('modalInfoCodigoAAA').value;
  const informacion = document.getElementById('contenidoInformacionAAA').value.trim();
  const msgEl = document.getElementById('mensajeGuardadoInfo');
  msgEl.style.color = '#666';
  msgEl.textContent = 'Guardando...';

  const ahora = obtenerFechaISOColombia();

  try {
    await ConsultasAdmin.actualizar(
      'acompanamiento',
      { codigo_remision: codigo },
      {
        informacion: informacion || null,
        fecha_actualizacion_info: ahora
      },
      {
        esquema: 'public',
        retorno: 'minimal',
        etiquetasInvalidar: ['tabla:acompanamiento']
      }
    );

    const idx = remisionesAAACache.findIndex(r => r.codigo_remision === codigo);
    if (idx !== -1) {
      remisionesAAACache[idx].informacion = informacion || null;
      remisionesAAACache[idx].fecha_actualizacion_info = ahora;
    }

    const fechaFormateada = formatearFechaColombia(ahora, { formato: 'fechaHoraLocal' });
    document.getElementById('fechaActualizacionInfo').textContent = `Última actualización: ${fechaFormateada}`;

    msgEl.style.color = '#155724';
    msgEl.textContent = '✓ Información guardada correctamente.';
    setTimeout(() => cerrarModalInformacionAAA(), 1500);
  } catch (err) {
    msgEl.style.color = '#dc3545';
    msgEl.textContent = 'No fue posible guardar los cambios.';
    console.error(err);
  }
}

async function guardarEstadoRemision(selectEl) {
  const codigo = selectEl.dataset.codigo;
  const nuevoEstado = selectEl.value;

  selectEl.disabled = true;

  const ahora = obtenerFechaISOColombia();

  try {
    await ConsultasAdmin.actualizar(
      'acompanamiento',
      { codigo_remision: codigo },
      {
        estado_remision: nuevoEstado,
        fecha_actualizacion_info: ahora
      },
      {
        esquema: 'public',
        retorno: 'minimal',
        etiquetasInvalidar: ['tabla:acompanamiento']
      }
    );

    const idx = remisionesAAACache.findIndex(r => r.codigo_remision === codigo);
    if (idx !== -1) {
      remisionesAAACache[idx].estado_remision = nuevoEstado;
      remisionesAAACache[idx].fecha_actualizacion_info = ahora;
    }

    selectEl.style.borderColor = '#28a745';
    setTimeout(() => { selectEl.style.borderColor = ''; }, 1500);

  } catch (err) {
    selectEl.style.borderColor = '#dc3545';
    setTimeout(() => { selectEl.style.borderColor = ''; }, 1500);
    console.error(err);
  } finally {
    selectEl.disabled = false;
  }
}

// ── SINCRONIZACIÓN DE CACHÉ LOCAL DE AAA ANTE MUTACIONES ───────────────────
if (typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.alInvalidar === 'function') {
  ConsultasAdmin.alInvalidar(function (etiquetas, esRemoto) {
    if (!Array.isArray(etiquetas) || etiquetas.length === 0) return;
    const set = new Set(etiquetas);
    const todo = set.has('*');
    const cambioCatalogo = set.has('tabla:programas') || set.has('tabla:facultades') || set.has('grupo:catalogos');

    if (todo || cambioCatalogo || (esRemoto && (set.has('tabla:acompanamiento') || set.has('tabla:public.acompanamiento')))) {
      remisionesAAACache = [];
    }
  });
}
