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
      { header: 'Programa',     key: 'programa',            w: 0.12 },
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
        } else if (col.key === 'programa') {
          valor = resolverProgramaYFacultad(fila).programa;
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
      if (!Array.isArray(items) || items.length === 0) {
        checkY(8);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(120, 120, 120);
        pdf.text('No hay datos disponibles', margin, y);
        pdf.setTextColor(0, 0, 0);
        y += 8;
        return;
      }

      items.forEach(([nombre, cantidad]) => {
        checkY(8);
        const pct = calcularPorcentajePMA(cantidad, total);
        const pctNum = parseFloat(pct) || 0;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        const textoNombre = String(nombre || 'Sin especificar');
        const nombreCorto = textoNombre.length > 55 ? textoNombre.substring(0, 52) + '...' : textoNombre;
        pdf.text(nombreCorto, margin, y);
        const barX = margin + 120;
        const barW = 40;
        const barH = 4;
        pdf.setFillColor(230, 236, 245);
        pdf.rect(barX, y - 4, barW, barH, 'F');
        pdf.setFillColor(30, 60, 114);
        const fillW = pctNum > 0 ? Math.max(0.5, (pctNum / 100) * barW) : 0;
        if (fillW > 0) {
          pdf.rect(barX, y - 4, fillW, barH, 'F');
        }
        pdf.setTextColor(30, 60, 114);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${cantidad} (${pct}%)`, barX + barW + 3, y);
        pdf.setTextColor(0, 0, 0);
        y += 7;
      });
      y += 3;
    }

    function dibujarTabla(headers, filas, colWidths) {
  if (!Array.isArray(filas) || filas.length === 0) {
    checkY(8);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    pdf.text('No hay registros disponibles', margin, y);
    pdf.setTextColor(0, 0, 0);
    y += 8;
    return;
  }

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
      const serie = calcularSerieMensualTutoriasPMA(datos);
      const labels = serie.labels.length > 0 ? serie.labels : ['Sin datos'];
      const valores = serie.valores.length > 0 ? serie.valores : [0];

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

    function dibujarPesosRanking(ranking) {
      checkY(18);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`${ranking.pesoT}% Cantidad de Tutorías`, margin, y); y += 5;
      pdf.text(`${ranking.pesoB}% Cantidad de Beneficiados`, margin, y); y += 5;
      pdf.text(`${ranking.pesoC}% Calificación`, margin, y); y += 8;
      pdf.setTextColor(0, 0, 0);
    }

    // ── OBTENER CÁLCULOS CENTRALIZADOS DESDE pma.js
    const stGeneral = calcularEstadisticasPMA(dataFormularios, 'general');
    const stTutores = calcularEstadisticasPMA(dataFormularios, 'tutores');
    const stProfesores = calcularEstadisticasPMA(dataFormularios, 'profesores');
    const datosTutores = stTutores.datosFiltrados;
    const datosProfesores = stProfesores.datosFiltrados;

    const pesosRanking = obtenerPesosRankingPMA();
    const ranking = calcularRankingTutoresPMA(datosTutores, {
      statsTutores: stTutores,
      pesoT: pesosRanking.pesoT,
      pesoB: pesosRanking.pesoB,
      pesoC: pesosRanking.pesoC
    });


    // SECCIÓN 1 — ESTADÍSTICAS GENERALES

    dibujarSeccion('ESTADÍSTICAS GENERALES');

    dibujarTarjetas([
      { valor: stGeneral.stats.total, etiqueta: 'Total de Registros' },
      { valor: stGeneral.cantidadBeneficiados, etiqueta: 'Beneficiados' },
      { valor: stGeneral.promedioCalificacionPMA, etiqueta: 'Calificación PMA' }
    ]);

    dibujarSubtitulo('Top 5 Materias con Más Tutorías');
    dibujarListaBarras(stGeneral.top5Materias, stGeneral.stats.total);
    dibujarSubtitulo('Top 5 Semestres con Más Tutorías');
    dibujarListaBarras(
      stGeneral.top5Semestres.map(([s, c]) => [s === 'Sin especificar' ? s : `Semestre ${s}`, c]),
      stGeneral.stats.total
    );
    dibujarSubtitulo('Facultades con Más Tutorías');
    dibujarListaBarras(stGeneral.todasFacultades, stGeneral.stats.total);
    dibujarSubtitulo('Top 5 Programas con Más Tutorías');
    dibujarListaBarras(stGeneral.top5Programas, stGeneral.stats.total);
    dibujarSubtitulo('Motivos de Consulta');
    dibujarListaBarras(stGeneral.todosMotivos, stGeneral.stats.total);

  
    // SECCIÓN 2 — ESTADÍSTICAS DE TUTORES

    pdf.addPage(); y = margin;
    dibujarSeccion('ESTADÍSTICAS DE TUTORES');

    dibujarTarjetas([
      { valor: stTutores.stats.total, etiqueta: 'Total Tutorías' },
      { valor: stTutores.promedioCalificacion, etiqueta: 'Calificación Promedio' }
    ]);

    dibujarSubtitulo('Cantidad de Tutorías por Sede');
    dibujarTabla(
      ['Sede', 'Cantidad', '%'],
      stTutores.sedesOrdenadas.map(([sede, cant]) => [
        sede, cant, calcularPorcentajePMA(cant, stTutores.stats.total) + '%'
      ]),
      [contentW * 0.5, contentW * 0.25, contentW * 0.25]
    );

    dibujarSubtitulo('Tutores de Sede Norte');
    dibujarTabla(
      ['Nombre del Tutor', 'Tutorías', 'Beneficiados', 'Calificación'],
      stTutores.instructoresNorte.map(([inst, cant]) => [
        inst, cant,
        stTutores.documentosPorInstructor[inst]?.size || 0,
        stTutores.promediosPorInstructor[inst] || 'N/A'
      ]),
      [contentW * 0.55, contentW * 0.15, contentW * 0.15, contentW * 0.15]
    );

    pdf.addPage(); y = margin;
    dibujarSubtitulo('Tutores de Sede Sur');
    dibujarTabla(
      ['Nombre del Tutor', 'Tutorías', 'Beneficiados', 'Calificación'],
      stTutores.instructoresSur.map(([inst, cant]) => [
        inst, cant,
        stTutores.documentosPorInstructor[inst]?.size || 0,
        stTutores.promediosPorInstructor[inst] || 'N/A'
      ]),
      [contentW * 0.55, contentW * 0.15, contentW * 0.15, contentW * 0.15]
    );

    pdf.addPage(); y = margin;
    dibujarSubtitulo('Ranking Mejor Tutor');
    dibujarPesosRanking(ranking);

    dibujarSubtitulo('Sede Norte');
    dibujarTabla(
      ['#', 'Tutor', 'Puntaje'],
      ranking.norte.map((d, i) => [i + 1, d.nombre, d.puntaje.toFixed(2) + '%']),
      [contentW * 0.08, contentW * 0.72, contentW * 0.20]
    );

    pdf.addPage(); y = margin;
    dibujarSubtitulo('Ranking Mejor Tutor');
    dibujarPesosRanking(ranking);

    dibujarSubtitulo('Sede Sur');
    dibujarTabla(
      ['#', 'Tutor', 'Puntaje'],
      ranking.sur.map((d, i) => [i + 1, d.nombre, d.puntaje.toFixed(2) + '%']),
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
      { valor: stProfesores.promedioCalificacion, etiqueta: 'Calificación Promedio' }
    ]);

    dibujarSubtitulo('Cantidad de Tutorías por Facultad/Departamento');
    dibujarTabla(['Facultad/Departamento', 'Cantidad', '%'],
      stProfesores.facultadesOrdenadas.map(([fac, cant]) => [
        obtenerNombreFacultad(fac), cant, calcularPorcentajePMA(cant, stProfesores.stats.total) + '%'
      ])
    );

    stProfesores.facultadesConProfesores.forEach(fac => {
      dibujarSubtitulo('Tutorías — ' + obtenerNombreFacultad(fac));
      dibujarTabla(['Nombre del Profesor', 'Tutorías', 'Beneficiados', 'Calificación'],
        Object.entries(stProfesores.profesoresPorFacultad[fac]).sort((a, b) => b[1] - a[1]).map(([prof, cant]) => [
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
