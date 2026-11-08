async function descargarPDFAAA() {
  const btn = document.getElementById('btnDescargarPDFAAA');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generando PDF...';

  try {
    const data = await ConsultasAdmin.obtenerAcompanamiento({ orden: 'asc' });

    if (!data || data.length === 0) {
      alert('No hay registros de AAA para descargar');
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentW = pageW - margin * 2;
    let y = margin;

    // Encabezado
    pdf.setFillColor(30, 60, 114);
    pdf.rect(0, 0, pageW, 18, 'F');
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('Remisiones - Activación Acompañamiento Académico', pageW / 2, 12, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    y = 24;

    const fechaHoy = formatearFechaColombia(new Date(), { formato: 'fecha' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Total de registros: ${data.length}   |   Generado: ${fechaHoy}`, margin, y);
    pdf.setTextColor(0, 0, 0);
    y += 8;

    // Columnas
    const cols = [
      { header: 'Fecha',        key: 'fecha_hora',          w: 0.07 },
      { header: 'Tipo',         key: 'tipo_acompanamiento', w: 0.09 },
      { header: 'Nombres y Apellidos', key: 'nombres_y_apellidos', w: 0.14 },
      { header: 'Grupo',        key: 'grupo',               w: 0.05 },
      { header: 'Programa',     key: 'programa_estudiante', w: 0.12 },
      { header: 'Profesor',     key: 'profesor',            w: 0.10 },
      { header: 'Asignatura',   key: 'asignatura',          w: 0.10 },
      { header: 'Motivo',       key: 'motivo',              w: 0.09 },
      { header: 'Codigo',       key: 'codigo_remision',     w: 0.06 },
      { header: 'Estado',       key: 'estado_remision',     w: 0.07 },
      { header: 'Informacion',  key: 'informacion',         w: 0.08 },
    ];
    const widths = cols.map(c => c.w * contentW);
    const rowH = 7;
    const headerH = 8;

    function checkY(h) {
      if (y + h > pageH - 12) {
        // Pie de página
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Registros AAA — ${fechaHoy}`, margin, pageH - 4);
        pdf.addPage();
        y = margin;
        dibujarHeaderTabla();
      }
    }

    function dibujarHeaderTabla() {
      pdf.setFillColor(30, 60, 114);
      pdf.rect(margin, y, contentW, headerH, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      let xPos = margin;
      cols.forEach((col, i) => {
        pdf.text(col.header, xPos + 2, y + 5.5);
        xPos += widths[i];
      });
      pdf.setTextColor(0, 0, 0);
      y += headerH;
    }

    dibujarHeaderTabla();

    data.forEach((fila, idx) => {
      checkY(rowH);

      // Fondo alternado
      if (idx % 2 === 0) {
        pdf.setFillColor(245, 247, 252);
        pdf.rect(margin, y, contentW, rowH, 'F');
      }

      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);

      let xPos = margin;
      cols.forEach((col, i) => {
        let valor = '';
        if (col.key === 'fecha_hora' && fila.fecha_hora) {
          valor = formatearFechaColombia(fila.fecha_hora, { formato: 'fecha' });
        } else if (col.key === 'nombres_y_apellidos') {
          valor = String(fila.nombres_y_apellidos || fila.nombre || '');
        } else {
          valor = String(fila[col.key] || '');
        }
        const maxChars = Math.floor(widths[i] / 1.8);
        const textoCorto = valor.length > maxChars ? valor.substring(0, maxChars - 1) + '…' : valor;
        pdf.text(textoCorto, xPos + 2, y + 4.8);
        xPos += widths[i];
      });

      // Línea separadora
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, y + rowH, margin + contentW, y + rowH);

      y += rowH;
    });

    // Números de página
    const totalPaginas = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Página ${i} de ${totalPaginas}`, pageW - margin, pageH - 4, { align: 'right' });
    }

    const fechaArchivo = obtenerFechaHoyColombia();
    pdf.save(`AAA_${fechaArchivo}.pdf`);

  } catch (error) {
    alert('Error al generar el PDF: ' + error.message);
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}


//INFORME FINAL DE SEMESTRE


async function descargarPDF() {
  const btn = document.querySelector('[onclick="descargarPDF()"]');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generando PDF...';

  try {
    await precargarDatosEstadisticas();
    const datosAnteriores = window.datosFormulariosGlobal;
    const dataFormularios = await ConsultasAdmin.obtenerFormularios();
    window.datosFormulariosGlobal = dataFormularios;
    if (!datosAnteriores || datosAnteriores.length !== dataFormularios.length) {
      invalidarCacheEstadisticas();
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    function checkY(espacioNecesario) {
      if (y + espacioNecesario > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
    }

    function dibujarSeccion(titulo) {
  if (y + 28 > pageH - margin) {
    pdf.addPage();
    y = margin;
  }
  y += 6;
  pdf.setFillColor(30, 60, 114);
  pdf.rect(margin, y, contentW, 10, 'F');
  pdf.setFontSize(13);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(titulo, margin + 4, y + 7);
  pdf.setTextColor(0, 0, 0);
  y += 16;
}

    function dibujarSubtitulo(texto) {
  if (y + 20 > pageH - margin) {
    pdf.addPage();
    y = margin;
  }
  y += 8;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 60, 114);
  pdf.text(texto, margin, y);
  pdf.setTextColor(0, 0, 0);
  y += 8;
}

    function dibujarTarjetas(tarjetas) {
      checkY(22);
      const tw = contentW / tarjetas.length;
      tarjetas.forEach((t, i) => {
        const x = margin + tw * i;
        pdf.setFillColor(240, 244, 255);
        pdf.setDrawColor(197, 208, 232);
        pdf.roundedRect(x + 2, y, tw - 4, 18, 2, 2, 'FD');
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 60, 114);
        pdf.text(String(t.valor), x + tw / 2, y + 8, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text(t.etiqueta, x + tw / 2, y + 14, { align: 'center' });
      });
      pdf.setTextColor(0, 0, 0);
      y += 24;
    }

    function dibujarListaBarras(items, total) {
      items.forEach(([nombre, cantidad]) => {
        checkY(8);
        const pct = ((cantidad / total) * 100).toFixed(1);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        const nombreCorto = nombre.length > 55 ? nombre.substring(0, 52) + '...' : nombre;
        pdf.text(nombreCorto, margin, y);
        const barX = margin + 120;
        const barW = 40;
        const barH = 4;
        pdf.setFillColor(230, 236, 245);
        pdf.rect(barX, y - 4, barW, barH, 'F');
        pdf.setFillColor(30, 60, 114);
        pdf.rect(barX, y - 4, Math.max(0.5, (parseFloat(pct) / 100) * barW), barH, 'F');
        pdf.setTextColor(30, 60, 114);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${cantidad} (${pct}%)`, barX + barW + 3, y);
        pdf.setTextColor(0, 0, 0);
        y += 7;
      });
      y += 3;
    }

    function dibujarTabla(headers, filas, colWidths) {
  const rowH = 7;
  const headerH = 8;
  const totalW = contentW;
  const widths = colWidths || headers.map(() => totalW / headers.length);

  // Detectar si hay columna "Tutor" para forzar alineación izquierda
  const indicesTutor = headers.map((h, i) => h === 'Tutor' ? i : -1).filter(i => i !== -1);

  function dibujarHeader() {
    pdf.setFillColor(30, 60, 114);
    pdf.rect(margin, y, totalW, headerH, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    let xPos = margin;
    headers.forEach((h, i) => {
      const align = (i === 0 || indicesTutor.includes(i)) ? 'left' : 'center';
      const x = align === 'left' ? xPos + 3 : xPos + widths[i] / 2;
      pdf.text(h, x, y + 5.5, { align });
      xPos += widths[i];
    });
    y += headerH;
  }

  const espacioHeader = headerH + rowH;
  if (y + espacioHeader > pageH - margin) {
    pdf.addPage(); y = margin;
  }
  dibujarHeader();

  filas.forEach((fila, ri) => {
    if (y + rowH > pageH - margin) {
      pdf.addPage(); y = margin;
      dibujarHeader();
    }
    const bg = ri % 2 === 0 ? [248, 249, 255] : [255, 255, 255];
    pdf.setFillColor(...bg);
    pdf.rect(margin, y, totalW, rowH, 'F');
    pdf.setDrawColor(224, 224, 224);
    pdf.line(margin, y + rowH, margin + totalW, y + rowH);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);
    let xPos = margin;
    fila.forEach((celda, i) => {
      const align = (i === 0 || indicesTutor.includes(i)) ? 'left' : 'center';
      const x = align === 'left' ? xPos + 3 : xPos + widths[i] / 2;
      const texto = String(celda);
      const textoCorto = texto.length > 45 ? texto.substring(0, 42) + '...' : texto;
      pdf.text(textoCorto, x, y + 5, { align });
      xPos += widths[i];
    });
    y += rowH;
  });

  pdf.setDrawColor(0, 0, 0);
  y += 6;
}

    function generarGraficaCanvas(datos, titulo) {
      const meses = new Map();
      const nombresMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      datos.forEach(item => {
        const fecha = convertirFechaAColombia(item.fecha);
        const mes = fecha.getMonth();
        const año = fecha.getFullYear();
        const key = `${año}-${String(mes+1).padStart(2,'0')}`;
        if (!meses.has(key)) meses.set(key, { label: `${nombresMeses[mes]} ${año}`, cantidad: 0 });
        meses.get(key).cantidad++;
      });
      const ordenadas = [...meses.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const labels = ordenadas.map(([, v]) => v.label);
      const valores = ordenadas.map(([, v]) => v.cantidad);

      const canvas = document.createElement('canvas');
      canvas.width = 820; canvas.height = 300;
      const ctx = canvas.getContext('2d');
      const padL = 50, padR = 20, padT = 40, padB = 70;
      const w = canvas.width - padL - padR;
      const h = canvas.height - padT - padB;
      const maxVal = Math.max(...valores, 1);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e3c72';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(titulo, canvas.width / 2, 22);

      const pasos = 5;
      for (let i = 0; i <= pasos; i++) {
        const yG = padT + h - (i / pasos) * h;
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, yG); ctx.lineTo(padL + w, yG); ctx.stroke();
        ctx.fillStyle = '#888'; ctx.font = '10px Arial'; ctx.textAlign = 'right';
        ctx.fillText(Math.round((maxVal / pasos) * i), padL - 6, yG + 4);
      }

      const gap = w / Math.max(labels.length, 1);
      const barW = Math.min(40, gap * 0.6);
      valores.forEach((val, i) => {
        const x = padL + gap * i + gap / 2 - barW / 2;
        const barH = (val / maxVal) * h;
        const yB = padT + h - barH;
        ctx.fillStyle = 'rgba(30,60,114,0.8)';
        ctx.fillRect(x, yB, barW, barH);
        ctx.fillStyle = '#1e3c72'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(val, x + barW / 2, yB - 5);
      });

      ctx.fillStyle = '#555'; ctx.font = '9px Arial';
      labels.forEach((lbl, i) => {
        const x = padL + gap * i + gap / 2;
        ctx.save(); ctx.translate(x, padT + h + 12);
        ctx.rotate(-Math.PI / 4); ctx.textAlign = 'right';
        ctx.fillText(lbl, 0, 0); ctx.restore();
      });

      return canvas;
    }

    function agregarGraficaPDF(canvasGrafica) {
      pdf.addPage();
      y = margin;
      const gW = contentW;
      const gH = (canvasGrafica.height * gW) / canvasGrafica.width;
      pdf.addImage(canvasGrafica.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, gW, gH);
      y += gH + 8;
    }

    // ── CALCULAR DATOS
    const datosTodos = dataFormularios;
    const datosTutores = datosTodos.filter(i => i.tipo_instructor === 'Tutor');
    const datosProfesores = datosTodos.filter(i => i.tipo_instructor === 'Profesor');

    function calcularStats(datos, tipo) {
      const stats = { total: datos.length, sedesTutorias: {}, calificacionesPorInstructor: {}, facultadDepartamento: {}, sumaCalificacionesTotal: 0, sumaCalificacionesPMA: 0 };
      const estudiantesUnicos = new Set();
      const materiasCuenta = {}, semestresCuenta = {}, programasCuenta = {}, facultadesCuenta = {}, motivosCuenta = {};
      const tutoriasPorInstructor = {}, documentosPorInstructor = {};
      const profesoresPorFacultad = {}, documentosPorFacultadProfesor = {};

      datos.forEach(item => {
        const instructor = item.instructor;
        const sede = String(item.sede_tutoria || '').trim().toUpperCase() || 'SIN ESPECIFICAR';
        stats.sedesTutorias[sede] = (stats.sedesTutorias[sede] || 0) + 1;
        const cal = item.calificacion || 0, dud = item.dudas_resueltas || 0, dom = item.dominio_tema || 0;
        const amb = item.ambiente || 0, rec = item.recomienda_pma || 0;
        const promT = (cal + dud + dom) / 3;
        const promPMA = (cal + dud + dom + amb + rec) / 5;
        if (!stats.calificacionesPorInstructor[instructor]) stats.calificacionesPorInstructor[instructor] = { suma: 0, cantidad: 0 };
        stats.calificacionesPorInstructor[instructor].suma += promT;
        stats.calificacionesPorInstructor[instructor].cantidad += 1;
        stats.sumaCalificacionesTotal += promT;
        stats.sumaCalificacionesPMA += promPMA;

        if (tipo === 'general') {
          estudiantesUnicos.add(item.documento);
          materiasCuenta[item.asignatura || 'Sin especificar'] = (materiasCuenta[item.asignatura || 'Sin especificar'] || 0) + 1;
          semestresCuenta[item.semestre || 'Sin especificar'] = (semestresCuenta[item.semestre || 'Sin especificar'] || 0) + 1;
          programasCuenta[item.programa || 'Sin especificar'] = (programasCuenta[item.programa || 'Sin especificar'] || 0) + 1;
          facultadesCuenta[item.facultad || 'Sin especificar'] = (facultadesCuenta[item.facultad || 'Sin especificar'] || 0) + 1;
          motivosCuenta[item.motivo_consulta || 'Sin especificar'] = (motivosCuenta[item.motivo_consulta || 'Sin especificar'] || 0) + 1;
        }
        if (tipo === 'tutores' && instructor) {
          tutoriasPorInstructor[instructor] = (tutoriasPorInstructor[instructor] || 0) + 1;
          if (!documentosPorInstructor[instructor]) documentosPorInstructor[instructor] = new Set();
          const doc = item.documento != null ? String(item.documento).trim() : '';
          if (doc) documentosPorInstructor[instructor].add(doc);
        }
        if (tipo === 'profesores') {
          if (item.facultad_departamento) stats.facultadDepartamento[item.facultad_departamento] = (stats.facultadDepartamento[item.facultad_departamento] || 0) + 1;
          const fac = item.facultad_departamento || 'Sin Facultad';
          if (instructor) {
            if (!profesoresPorFacultad[fac]) profesoresPorFacultad[fac] = {};
            profesoresPorFacultad[fac][instructor] = (profesoresPorFacultad[fac][instructor] || 0) + 1;
            if (!documentosPorFacultadProfesor[fac]) documentosPorFacultadProfesor[fac] = {};
            if (!documentosPorFacultadProfesor[fac][instructor]) documentosPorFacultadProfesor[fac][instructor] = new Set();
            const doc = item.documento != null ? String(item.documento).trim() : '';
            if (doc) documentosPorFacultadProfesor[fac][instructor].add(doc);
          }
        }
      });

      const promediosPorInstructor = {};
      Object.keys(stats.calificacionesPorInstructor).forEach(inst => {
        const info = stats.calificacionesPorInstructor[inst];
        promediosPorInstructor[inst] = (info.suma / info.cantidad).toFixed(2);
      });

      return { stats, estudiantesUnicos, materiasCuenta, semestresCuenta, programasCuenta, facultadesCuenta, motivosCuenta, tutoriasPorInstructor, documentosPorInstructor, profesoresPorFacultad, documentosPorFacultadProfesor, promediosPorInstructor };
    }

    function calcularRankingPDF(datosFiltrados, promediosPorInstructor) {
      const wT = 0.35, wB = 0.45, wC = 0.20;
      const tutoriasPorInst = {}, docsPorInst = {};
      datosFiltrados.forEach(item => {
        const inst = item.instructor; if (!inst) return;
        tutoriasPorInst[inst] = (tutoriasPorInst[inst] || 0) + 1;
        if (!docsPorInst[inst]) docsPorInst[inst] = new Set();
        const doc = item.documento != null ? String(item.documento).trim() : '';
        if (doc) docsPorInst[inst].add(doc);
      });
      const datos = Object.keys(tutoriasPorInst).map(nombre => ({
        nombre, tutorias: tutoriasPorInst[nombre], beneficiados: docsPorInst[nombre]?.size || 0, calificacion: parseFloat(promediosPorInstructor[nombre] || 0)
      }));
      function rankGrupo(grupo) {
        if (!grupo.length) return [];
        const maxT = Math.max(...grupo.map(d => d.tutorias));
        const maxB = Math.max(...grupo.map(d => d.beneficiados));
        const maxC = Math.max(...grupo.map(d => d.calificacion));
        return grupo.map(d => ({
          ...d,
          puntaje: ((maxT > 0 ? (d.tutorias/maxT)*100 : 0) * wT) + ((maxB > 0 ? (d.beneficiados/maxB)*100 : 0) * wB) + ((maxC > 0 ? (d.calificacion/maxC)*100 : 0) * wC)
        })).sort((a, b) => b.puntaje - a.puntaje);
      }
      return {
        norte: rankGrupo(datos.filter(d => datosCache.tutoresNorte.some(t => t.nombre === d.nombre))),
        sur: rankGrupo(datos.filter(d => datosCache.tutoresSur.some(t => t.nombre === d.nombre)))
      };
    }

    const stGeneral = calcularStats(datosTodos, 'general');
    const stTutores = calcularStats(datosTutores, 'tutores');
    const stProfesores = calcularStats(datosProfesores, 'profesores');


    // SECCIÓN 1 — ESTADÍSTICAS GENERALES

    dibujarSeccion('ESTADÍSTICAS GENERALES');

    dibujarTarjetas([
      { valor: stGeneral.stats.total, etiqueta: 'Total de Registros' },
      { valor: stGeneral.estudiantesUnicos.size, etiqueta: 'Beneficiados' },
      { valor: (stGeneral.stats.sumaCalificacionesPMA / stGeneral.stats.total).toFixed(2), etiqueta: 'Calificación PMA' }
    ]);

    const top5Mat = Object.entries(stGeneral.materiasCuenta).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const top5Sem = Object.entries(stGeneral.semestresCuenta).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const top5Prog = Object.entries(stGeneral.programasCuenta).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const todasFac = Object.entries(stGeneral.facultadesCuenta).sort((a,b)=>b[1]-a[1]);
    const todosMotivos = Object.entries(stGeneral.motivosCuenta).sort((a,b)=>b[1]-a[1]);

    dibujarSubtitulo('Top 5 Materias con Más Tutorías');
    dibujarListaBarras(top5Mat, stGeneral.stats.total);
    dibujarSubtitulo('Top 5 Semestres con Más Tutorías');
    dibujarListaBarras(top5Sem.map(([s,c]) => [s === 'Sin especificar' ? s : `Semestre ${s}`, c]), stGeneral.stats.total);
    dibujarSubtitulo('Facultades con Más Tutorías');
    dibujarListaBarras(todasFac, stGeneral.stats.total);
    dibujarSubtitulo('Top 5 Programas con Más Tutorías');
    dibujarListaBarras(top5Prog, stGeneral.stats.total);
    dibujarSubtitulo('Motivos de Consulta');
    dibujarListaBarras(todosMotivos, stGeneral.stats.total);

  
    // SECCIÓN 2 — ESTADÍSTICAS DE TUTORES

    pdf.addPage(); y = margin;
    dibujarSeccion('ESTADÍSTICAS DE TUTORES');

    dibujarTarjetas([
      { valor: stTutores.stats.total, etiqueta: 'Total Tutorías' },
      { valor: (stTutores.stats.sumaCalificacionesTotal / stTutores.stats.total).toFixed(2), etiqueta: 'Calificación Promedio' }
    ]);

    dibujarSubtitulo('Cantidad de Tutorías por Sede');
    dibujarTabla(
      ['Sede', 'Cantidad', '%'],
      Object.entries(stTutores.stats.sedesTutorias).sort((a,b)=>b[1]-a[1]).map(([sede, cant]) => [
        sede, cant, ((cant / stTutores.stats.total) * 100).toFixed(1) + '%'
      ]),
      [contentW * 0.5, contentW * 0.25, contentW * 0.25]
    );

    dibujarSubtitulo('Tutores de Sede Norte');
    const tutoresNorteData = Object.entries(stTutores.tutoriasPorInstructor)
      .filter(([inst]) => datosCache.tutoresNorte.some(t => t.nombre === inst))
      .sort((a,b) => b[1]-a[1]);
    dibujarTabla(
      ['Nombre del Tutor', 'Tutorías', 'Beneficiados', 'Calificación'],
      tutoresNorteData.map(([inst, cant]) => [
        inst, cant,
        stTutores.documentosPorInstructor[inst]?.size || 0,
        stTutores.promediosPorInstructor[inst] || 'N/A'
      ]),
      [contentW * 0.55, contentW * 0.15, contentW * 0.15, contentW * 0.15]
    );

    pdf.addPage(); y = margin;
    dibujarSubtitulo('Tutores de Sede Sur');
    const tutoresSurData = Object.entries(stTutores.tutoriasPorInstructor)
      .filter(([inst]) => datosCache.tutoresSur.some(t => t.nombre === inst))
      .sort((a,b) => b[1]-a[1]);
    dibujarTabla(
      ['Nombre del Tutor', 'Tutorías', 'Beneficiados', 'Calificación'],
      tutoresSurData.map(([inst, cant]) => [
        inst, cant,
        stTutores.documentosPorInstructor[inst]?.size || 0,
        stTutores.promediosPorInstructor[inst] || 'N/A'
      ]),
      [contentW * 0.55, contentW * 0.15, contentW * 0.15, contentW * 0.15]
    );

    const ranking = calcularRankingPDF(datosTutores, stTutores.promediosPorInstructor);
    pdf.addPage(); y = margin;
    dibujarSubtitulo('Ranking Mejor Tutor');
    checkY(8);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(`${ranking.pesoT !== undefined ? ranking.pesoT : 35}% Cantidad de Tutorías`, margin, y); y += 5;
    pdf.text(`${ranking.pesoB !== undefined ? ranking.pesoB : 45}% Cantidad de Beneficiados`, margin, y); y += 5;
    pdf.text(`${ranking.pesoC !== undefined ? ranking.pesoC : 20}% Calificación`, margin, y); y += 8;
    pdf.setTextColor(0, 0, 0);

    dibujarSubtitulo('Sede Norte');
    dibujarTabla(
      ['#', 'Tutor', 'Puntaje'],
      ranking.norte.map((d, i) => [i+1, d.nombre, d.puntaje.toFixed(2) + '%']),
      [contentW * 0.08, contentW * 0.72, contentW * 0.20]
    );

    pdf.addPage(); y = margin;
    dibujarSubtitulo('Ranking Mejor Tutor');
    checkY(8);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('35% Cantidad de Tutorías', margin, y); y += 5;
    pdf.text('45% Cantidad de Beneficiados', margin, y); y += 5;
    pdf.text('20% Calificación', margin, y); y += 8;
    pdf.setTextColor(0, 0, 0);

    dibujarSubtitulo('Sede Sur');
    dibujarTabla(
      ['#', 'Tutor', 'Puntaje'],
      ranking.sur.map((d, i) => [i+1, d.nombre, d.puntaje.toFixed(2) + '%']),
      [contentW * 0.08, contentW * 0.72, contentW * 0.20]
    );

    pdf.addPage(); y = margin;
    const graficaNorte = generarGraficaCanvas(
      datosTutores.filter(i => String(i.sede_tutoria || '').trim().toUpperCase() === 'NORTE'),
      'Tutorías por Mes — Sede Norte'
    );
    const graficaSur = generarGraficaCanvas(
      datosTutores.filter(i => String(i.sede_tutoria || '').trim().toUpperCase() === 'SUR'),
      'Tutorías por Mes — Sede Sur'
    );
    const gW = contentW;
    const gH = (graficaNorte.height * gW) / graficaNorte.width;
    pdf.addImage(graficaNorte.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, gW, gH);
    y += gH + 6;
    pdf.addImage(graficaSur.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, gW, gH);
    y += gH + 6;




    // SECCIÓN 3 — ESTADÍSTICAS DE PROFESORES

    pdf.addPage(); y = margin;
    dibujarSeccion('ESTADÍSTICAS DE PROFESORES');

    dibujarTarjetas([
      { valor: stProfesores.stats.total, etiqueta: 'Total Tutorías' },
      { valor: (stProfesores.stats.sumaCalificacionesTotal / stProfesores.stats.total).toFixed(2), etiqueta: 'Calificación Promedio' }
    ]);

    dibujarSubtitulo('Cantidad de Tutorías por Facultad/Departamento');
    dibujarTabla(['Facultad/Departamento', 'Cantidad', '%'],
      Object.entries(stProfesores.stats.facultadDepartamento).sort((a,b)=>b[1]-a[1]).map(([fac, cant]) => [
        obtenerNombreFacultad(fac), cant, ((cant / stProfesores.stats.total) * 100).toFixed(1) + '%'
      ])
    );

    Object.keys(stProfesores.profesoresPorFacultad).sort().forEach(fac => {
      dibujarSubtitulo('Tutorías — ' + obtenerNombreFacultad(fac));
      dibujarTabla(['Nombre del Profesor', 'Tutorías', 'Beneficiados', 'Calificación'],
        Object.entries(stProfesores.profesoresPorFacultad[fac]).sort((a,b)=>b[1]-a[1]).map(([prof, cant]) => [
          prof, cant,
          stProfesores.documentosPorFacultadProfesor[fac]?.[prof]?.size || 0,
          stProfesores.promediosPorInstructor[prof] || 'N/A'
        ])
      );
    });

    agregarGraficaPDF(generarGraficaCanvas(datosProfesores, 'Tutorías por Mes — Profesores'));


    // ── NÚMEROS DE PÁGINA 
    const totalPaginas = pdf.internal.getNumberOfPages();
    const fechaHoy = obtenerFechaHoyColombia();
    for (let i = 1; i <= totalPaginas; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Página ${i} de ${totalPaginas}`, pageW - margin, pageH - 6, { align: 'right' });
      pdf.text(`Estadísticas PMA — ${fechaHoy}`, margin, pageH - 6);
    }

    pdf.save(`Estadisticas_PMA_${fechaHoy}.pdf`);

  } catch (error) {
    alert('Error al generar el PDF: ' + error.message);
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}
