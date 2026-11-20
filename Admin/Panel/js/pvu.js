// ── MÓDULO DE PVU (NAVEGACIÓN Y ESTADÍSTICAS) ───────────────────────────────

function resetearTabsPVU() {
  const primerTabPVU = document.querySelector('#contenidoPVU .admin-tabs-secundario .admin-tab');
  if (primerTabPVU) {
    document.querySelectorAll('#contenidoPVU .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
    primerTabPVU.classList.add('active');
    document.getElementById('tabEstadisticasPVU').classList.add('hidden');
    document.getElementById('tabDescargasPVU').classList.remove('hidden');
  }
}

async function cambiarTabPVU(event, tab) {
  document.querySelectorAll('#contenidoPVU .admin-tabs-secundario .admin-tab').forEach(t => t.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else if (event && event.target) {
    event.target.classList.add('active');
  }
  
  document.getElementById('tabEstadisticasPVU').classList.add('hidden');
  document.getElementById('tabDescargasPVU').classList.add('hidden');
  
  if (tab === 'descargas') {
    document.getElementById('tabDescargasPVU').classList.remove('hidden');
  } else if (tab === 'estadisticas') {
    document.getElementById('tabEstadisticasPVU').classList.remove('hidden');
    if (!window.datosPVUGlobal) {
      await cargarEstadisticasPVU();
    } else {
      mostrarEstadisticasPVU();
    }
  }
}

async function actualizarEstadisticasPVU() {
  ConsultasAdmin.invalidar(['tabla:pvu']);
  window.datosPVUGlobal = null;
  await cargarEstadisticasPVU({ forzar: true });
}

async function cargarEstadisticasPVU(opciones) {
  const statsGridPVU = document.getElementById('statsGridPVU');
  const detallesStatsPVU = document.getElementById('detallesStatsPVU');
  if (statsGridPVU) {
    mostrarCargando(statsGridPVU);
  }
  if (detallesStatsPVU) {
    detallesStatsPVU.textContent = '';
  }
  
  try {
    const totalRegistros = await ConsultasAdmin.obtenerConteoPVU({
      forzar: Boolean(opciones && opciones.forzar)
    });

    if (totalRegistros === 0) {
      window.datosPVUGlobal = { totalRegistros: 0 };
      if (statsGridPVU) {
        statsGridPVU.textContent = '';
        const p = document.createElement('p');
        p.style.textAlign = 'center';
        p.style.color = '#666';
        p.textContent = 'No hay datos disponibles aún.';
        statsGridPVU.appendChild(p);
      }
      return;
    }
    window.datosPVUGlobal = { totalRegistros: totalRegistros };
    mostrarEstadisticasPVU();
    
  } catch (error) {
    console.error('Error cargando estadísticas PVU:', error);
    if (statsGridPVU) {
      statsGridPVU.textContent = '';
      const p = document.createElement('p');
      p.style.textAlign = 'center';
      p.style.color = '#dc3545';
      p.textContent = 'Error al cargar estadísticas. Por favor intenta de nuevo.';
      statsGridPVU.appendChild(p);
    }
  }
}

function mostrarEstadisticasPVU() {
  const data = window.datosPVUGlobal;
  const statsGridPVU = document.getElementById('statsGridPVU');
  const detallesStatsPVU = document.getElementById('detallesStatsPVU');
  const totalRegistros = Array.isArray(data)
    ? data.length
    : (data && typeof data.totalRegistros === 'number' ? data.totalRegistros : 0);
  
  if (!data || totalRegistros === 0) {
    if (statsGridPVU) {
      statsGridPVU.textContent = '';
      const p = document.createElement('p');
      p.style.textAlign = 'center';
      p.style.color = '#666';
      p.textContent = 'No hay datos disponibles aún.';
      statsGridPVU.appendChild(p);
    }
    return;
  }
  if (statsGridPVU) {
    statsGridPVU.textContent = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-grid';

    const card = document.createElement('div');
    card.className = 'stat-card';

    const h3 = document.createElement('h3');
    h3.textContent = String(totalRegistros);

    const p = document.createElement('p');
    p.textContent = 'Total de Registros';

    card.appendChild(h3);
    card.appendChild(p);
    wrapper.appendChild(card);
    statsGridPVU.appendChild(wrapper);
  }
  
  if (detallesStatsPVU) {
    detallesStatsPVU.textContent = '';
  }
}

// ── SINCRONIZACIÓN DE CACHÉ LOCAL DE PVU ANTE MUTACIONES ───────────────────
if (typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.alInvalidar === 'function') {
  ConsultasAdmin.alInvalidar(function (etiquetas) {
    if (!Array.isArray(etiquetas) || etiquetas.length === 0) return;
    const set = new Set(etiquetas);
    const todo = set.has('*');

    if (todo || set.has('tabla:pvu') || set.has('tabla:public.pvu')) {
      window.datosPVUGlobal = null;
    }
  });
}
