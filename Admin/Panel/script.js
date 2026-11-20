function cambiarTabPrincipal(event, seccion) {
  document.querySelectorAll('.admin-tabs-principal .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('contenidoPMA').classList.add('hidden');
  document.getElementById('contenidoPVU').classList.add('hidden');
  document.getElementById('contenidoAAA').classList.add('hidden');
  document.getElementById('contenidoDiagnosticos').classList.add('hidden');
  
  if (seccion === 'pma') {
    document.getElementById('contenidoPMA').classList.remove('hidden');
    if (typeof resetearTabsPMA === 'function') {
      resetearTabsPMA();
    }

  } else if (seccion === 'pvu') {
    document.getElementById('contenidoPVU').classList.remove('hidden');
    if (typeof resetearTabsPVU === 'function') {
      resetearTabsPVU();
    }
  } else if (seccion === 'aaa') {
    document.getElementById('contenidoAAA').classList.remove('hidden');
    if (typeof resetearTabsAAA === 'function') {
      resetearTabsAAA();
    }
  } else if (seccion === 'diagnosticos') {
    document.getElementById('contenidoDiagnosticos').classList.remove('hidden');
    if (typeof resetearTabsDiagnosticos === 'function') {
      resetearTabsDiagnosticos();
    }
  }
}


async function actualizarEstadisticas() {
  const btnActualizar = document.getElementById('btnActualizar');
  const iconActualizar = document.getElementById('iconActualizar');
  btnActualizar.disabled = true;
  btnActualizar.style.opacity = '0.6';
  iconActualizar.style.animation = 'spin 1s linear infinite';
  try {
    const contenidoPMA = document.getElementById('contenidoPMA');
    const contenidoPVU = document.getElementById('contenidoPVU');
    const contenidoAAA = document.getElementById('contenidoAAA');
    const contenidoDiagnosticos = document.getElementById('contenidoDiagnosticos');
    
    if (!contenidoPMA.classList.contains('hidden')) {
      if (typeof actualizarEstadisticasPMA === 'function') {
        await actualizarEstadisticasPMA();
      }
    } else if (!contenidoPVU.classList.contains('hidden')) {
      if (typeof actualizarEstadisticasPVU === 'function') {
        await actualizarEstadisticasPVU();
      }
    } else if (!contenidoAAA.classList.contains('hidden')) {
      if (typeof actualizarEstadisticasAAA === 'function') {
        await actualizarEstadisticasAAA();
      }
    } else if (!contenidoDiagnosticos.classList.contains('hidden')) {
      if (typeof actualizarDatosDiagnosticos === 'function') {
        await actualizarDatosDiagnosticos();
      }
    }


    iconActualizar.style.animation = 'none';
    iconActualizar.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    iconActualizar.style.color = '#28a745';
    
    setTimeout(() => {
      iconActualizar.innerHTML = '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>';
      iconActualizar.style.color = 'currentColor';
    }, 1500);
    
  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    iconActualizar.style.animation = 'none';
    iconActualizar.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
    iconActualizar.style.color = '#dc3545';
    
    setTimeout(() => {
      iconActualizar.innerHTML = '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>';
      iconActualizar.style.color = 'currentColor';
    }, 1500);
  } finally {
    btnActualizar.disabled = false;
    btnActualizar.style.opacity = '1';
  }
}
