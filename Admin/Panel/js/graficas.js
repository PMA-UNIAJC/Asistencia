function actualizarGrafica() {
  const periodo = document.getElementById('filtroGraficaPeriodo').value;
  const tipoInstructor = document.getElementById('filtroGraficaTipo').value;
  
  const data = window.datosFormulariosGlobal;
  if (!data || data.length === 0) return;

  let datosFiltrados = tipoInstructor !== 'todos'
  ? data.filter(item => item.tipo_instructor === tipoInstructor)
  : data;

const filtroSedeWrapper = document.getElementById('filtroSedeWrapper');
const sede = document.getElementById('filtroGraficaSede').value;

if (tipoInstructor === 'Profesor') {
  filtroSedeWrapper.style.display = 'none';
} else {
  filtroSedeWrapper.style.display = '';
  if (sede !== 'todas') {
    const sedeFiltroUpper = sede.trim().toUpperCase();
    datosFiltrados = datosFiltrados.filter(
      item => String(item.sede_tutoria || '').trim().toUpperCase() === sedeFiltroUpper
    );
  }
}

  if (datosFiltrados.length === 0) {
    renderGrafica(['Sin datos'], [0]);
    return;
  }

  const itemsConFecha = datosFiltrados.map(item => ({
    fecha: convertirFechaAColombia(item.fecha)
  }));

  let labels = [];
  let valores = [];

  if (periodo === 'semanal') {
    function obtenerLunes(fecha) {
      const dia = fecha.getDay();
      const diff = dia === 0 ? -6 : 1 - dia;
      const lunes = new Date(fecha);
      lunes.setDate(fecha.getDate() + diff);
      lunes.setHours(0, 0, 0, 0);
      return lunes;
    }

    const semanas = new Map(); 

    itemsConFecha.forEach(({ fecha }) => {
      const lunes = obtenerLunes(fecha);
      const key = lunes.getTime();
      if (!semanas.has(key)) {
        const domingo = new Date(lunes);
        domingo.setDate(domingo.getDate() + 6);
        const fmt = d =>
          `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
        semanas.set(key, { label: `${fmt(lunes)} - ${fmt(domingo)}`, cantidad: 0 });
      }
      semanas.get(key).cantidad++;
    });

    const ordenadas = [...semanas.entries()].sort((a, b) => a[0] - b[0]);
    labels = ordenadas.map(([, v]) => v.label);
    valores = ordenadas.map(([, v]) => v.cantidad);

  } else if (periodo === 'mensual') {
    const meses = new Map();
    const nombresMesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    itemsConFecha.forEach(({ fecha }) => {
      const mes = fecha.getMonth();
      const año = fecha.getFullYear();
      const key = `${año}-${String(mes + 1).padStart(2, '0')}`;
      if (!meses.has(key)) {
        meses.set(key, { label: `${nombresMesesCortos[mes]} ${año}`, cantidad: 0 });
      }
      meses.get(key).cantidad++;
    });

    const ordenadas = [...meses.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    labels = ordenadas.map(([, v]) => v.label);
    valores = ordenadas.map(([, v]) => v.cantidad);
  }

  renderGrafica(labels, valores);
}

function renderGrafica(labels, valores) {
  if (graficoTutorias) graficoTutorias.destroy();

  const ctx = document.getElementById('graficaTutorias').getContext('2d');
  graficoTutorias = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Cantidad de tutorías',
        data: valores,
        backgroundColor: 'rgba(30, 60, 114, 0.7)',
        borderColor: 'rgba(30, 60, 114, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.parsed.y + ' tutoría' + (ctx.parsed.y !== 1 ? 's' : '')
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: 45, minRotation: 45 } }
      }
    }
  });
}
