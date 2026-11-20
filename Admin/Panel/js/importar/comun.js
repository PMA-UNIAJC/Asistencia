// ============================================================================
// MÓDULO COMPARTIDO: Motor de Importación CSV para Supabase
// Ubicación: Admin/Panel/js/importar/comun.js
//
// Centraliza la lectura de archivos .csv, el parser RFC 4180 (, / ;),
// la validación estructural de encabezados y filas, el manejo de UI
// compartida y la confirmación de reemplazo en Supabase.
// ============================================================================

(function (window) {
  'use strict';

  const SEDES_PERMITIDAS = Object.freeze([
    'NORTE',
    'SUR',
    'VIRTUAL',
    'LADERA',
    'NUEVO LATIR'
  ]);

  function normalizarEspacios(valor) {
    return String(valor ?? '').replace(/\s+/g, ' ').trim();
  }

  function normalizarSinTildesMayusculas(valor) {
    return normalizarEspacios(valor)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  // ── Parser CSV RFC 4180 (soporta BOM UTF-8 y delimitador ',' o ';') ───────

  function detectarDelimitador(texto) {
    let enComillas = false;
    let comas = 0;
    let puntoYComas = 0;

    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (ch === '"') {
        if (enComillas && texto[i + 1] === '"') {
          i++;
        } else {
          enComillas = !enComillas;
        }
      } else if (!enComillas) {
        if (ch === '\r' || ch === '\n') break;
        if (ch === ',') comas++;
        else if (ch === ';') puntoYComas++;
      }
    }

    return puntoYComas > comas ? ';' : ',';
  }

  function parsearTextoCSV(textoOriginal) {
    const texto = String(textoOriginal ?? '').replace(/^\uFEFF/, '');
    const delimitador = detectarDelimitador(texto);

    const filas = [];
    let filaActual = [];
    let celdaActual = '';
    let enComillas = false;
    let numeroLinea = 1;
    let inicioFilaLinea = 1;

    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      const sig = texto[i + 1];

      if (enComillas) {
        if (ch === '"') {
          if (sig === '"') {
            celdaActual += '"';
            i++;
          } else {
            enComillas = false;
          }
        } else {
          if (ch === '\n') numeroLinea++;
          celdaActual += ch;
        }
      } else if (ch === '"') {
        enComillas = true;
      } else if (ch === delimitador) {
        filaActual.push(celdaActual);
        celdaActual = '';
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && sig === '\n') i++;
        filaActual.push(celdaActual);
        filas.push({ numeroFila: inicioFilaLinea, celdas: filaActual });
        filaActual = [];
        celdaActual = '';
        numeroLinea++;
        inicioFilaLinea = numeroLinea;
      } else {
        celdaActual += ch;
      }
    }

    if (celdaActual.length > 0 || filaActual.length > 0) {
      filaActual.push(celdaActual);
      filas.push({ numeroFila: inicioFilaLinea, celdas: filaActual });
    }

    return { delimitador, filas };
  }

  // ── Validación de Encabezados ─────────────────────────────────────────────

  function validarEncabezados(encabezadosCrudos, esperadas, insensible) {
    const encontradosOriginales = encabezadosCrudos
      .slice(0, esperadas.length)
      .map(h => String(h ?? '').trim());

    const encontrados = encontradosOriginales.map(h =>
      insensible ? normalizarSinTildesMayusculas(h).toLowerCase() : h
    );

    const errores = [];
    esperadas.forEach((colEsperada, idx) => {
      const valorOrig = encontradosOriginales[idx] ?? '';
      const valorComp = encontrados[idx] ?? '';

      if (!valorOrig) {
        errores.push(`Falta la columna "${colEsperada}" en la posición ${idx + 1}.`);
      } else if (valorComp !== colEsperada) {
        if (!insensible && valorOrig.toLowerCase() === colEsperada) {
          errores.push(
            `La columna "${valorOrig}" en la posición ${idx + 1} debe estar en minúsculas ("${colEsperada}").`
          );
        } else {
          errores.push(
            `Posición ${idx + 1}: se encontró "${valorOrig}" pero se esperaba "${colEsperada}".`
          );
        }
      }
    });

    return {
      valido: errores.length === 0,
      encontrados,
      encontradosOriginales,
      errores
    };
  }

  // ── Utilidades DOM ────────────────────────────────────────────────────────

  function setVisible(id, visible) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !visible);
  }

  function mostrarMensajeBloque(id, texto, tipo) {
    const contenedor = document.getElementById(id);
    if (!contenedor) return;

    if (!texto) {
      contenedor.className = 'mensaje hidden';
      contenedor.textContent = '';
      return;
    }

    const claseTipo = tipo === 'error' ? 'error' : tipo === 'warning' ? 'warning' : 'success';
    contenedor.className = `mensaje ${claseTipo} supabase-mensaje-bloque`;
    contenedor.textContent = texto;
    contenedor.classList.remove('hidden');
  }

  function crearFragmentoSeguro(partes) {
    const frag = document.createDocumentFragment();
    (Array.isArray(partes) ? partes : []).forEach(parte => {
      if (typeof parte === 'string') {
        frag.appendChild(document.createTextNode(parte));
      } else if (parte && typeof parte === 'object' && parte.tag) {
        const el = document.createElement(parte.tag);
        if (parte.className) el.className = parte.className;
        el.textContent = String(parte.text ?? '');
        frag.appendChild(el);
      }
    });
    return frag;
  }

  function formatearPlural(cantidad, singular, plural) {
    return `${cantidad.toLocaleString('es-CO')} ${cantidad === 1 ? singular : plural}`;
  }

  // ── Fábrica de Importadores CSV ───────────────────────────────────────────

  function crearImportadorCSV(config) {
    const {
      tablaDestino,
      columnas,
      insensibleEncabezados = false,
      ids,
      textoBotonDefecto,
      antesDeSeleccionar,
      obtenerContexto,
      contextoValido,
      formatearMetaExtra,
      validarArchivo,
      crearEstadoValidacion,
      procesarFila,
      alLimpiar,
      alCambiarEstadoEnvio,
      ejecutarReemplazo,
      construirResumenConfirmacion,
      construirModalConfirmacion,
      textoBotonEnviando
    } = config;

    const estado = {
      archivo: null,
      textoCrudo: '',
      contexto: null,
      encabezadosValidos: false,
      totalFilas: 0,
      registrosValidos: [],
      observaciones: [],
      reemplazando: false
    };

    function obtenerTextoBoton() {
      return typeof textoBotonDefecto === 'function'
        ? textoBotonDefecto()
        : textoBotonDefecto;
    }

    function restaurarPills() {
      document.querySelectorAll(`#${ids.pills} .supabase-col-pill`).forEach(pill => {
        pill.classList.remove('col-ok', 'col-error');
      });
    }

    function actualizarPills(encontrados) {
      const pills = document.querySelectorAll(`#${ids.pills} .supabase-col-pill`);
      pills.forEach((pill, idx) => {
        pill.classList.remove('col-ok', 'col-error');
        pill.classList.add(encontrados[idx] === columnas[idx] ? 'col-ok' : 'col-error');
      });
    }

    function actualizarEstadoBoton() {
      const chk = document.getElementById(ids.chkConfirm);
      const btn = document.getElementById(ids.btnReemplazar);
      if (!btn) return;

      const ctxOk = !contextoValido || contextoValido(estado.contexto);
      btn.disabled = !(
        !estado.reemplazando &&
        ctxOk &&
        estado.encabezadosValidos &&
        estado.observaciones.length === 0 &&
        estado.registrosValidos.length > 0 &&
        Boolean(chk && chk.checked)
      );
    }

    function limpiar(event, opciones) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (estado.reemplazando) return;

      estado.archivo = null;
      estado.textoCrudo = '';
      estado.contexto = null;
      estado.encabezadosValidos = false;
      estado.totalFilas = 0;
      estado.registrosValidos = [];
      estado.observaciones = [];

      const input = document.getElementById(ids.input);
      if (input) input.value = '';

      const chk = document.getElementById(ids.chkConfirm);
      const lbl = document.getElementById(ids.lblConfirm);
      const btn = document.getElementById(ids.btnReemplazar);
      if (chk) {
        chk.checked = false;
        chk.disabled = true;
      }
      if (lbl) lbl.classList.remove('supabase-confirm-check-activo');
      if (btn) {
        btn.disabled = true;
        btn.textContent = obtenerTextoBoton();
      }

      setVisible(ids.archivoInfo, false);
      setVisible(ids.resultado, false);
      setVisible(ids.seccionConfirm, false);
      mostrarMensajeBloque(ids.msgValidacion, '', '');
      mostrarMensajeBloque(ids.msgReemplazo, '', '');
      restaurarPills();

      if (alLimpiar) alLimpiar(opciones || {});
    }

    function mostrarInfoArchivo(archivo, delimitador, contexto) {
      const nombreEl = document.getElementById(ids.archivoNombre);
      const metaEl = document.getElementById(ids.archivoMeta);
      if (!nombreEl || !metaEl) return;

      const tamanoKB = (archivo.size / 1024).toFixed(1);
      const txtDelim = delimitador
        ? ` • Delimitador detectado: "${delimitador === ';' ? '; (punto y coma)' : ', (coma)'}"`
        : '';
      const txtExtra = formatearMetaExtra ? formatearMetaExtra(contexto) : '';

      nombreEl.textContent = archivo.name;
      metaEl.textContent = `${tamanoKB} KB${txtDelim}${txtExtra}`;
      setVisible(ids.archivoInfo, true);
    }

    function renderizarErrorEncabezados(resultado) {
      const listaMostrar = resultado.encontradosOriginales || [];
      const encontradasTexto = listaMostrar.length > 0
        ? listaMostrar.map(c => c || '(vacío)').join(', ')
        : 'Ninguna columna detectada';

      const contenedor = document.getElementById(ids.msgValidacion);
      if (contenedor) {
        contenedor.className = 'mensaje error supabase-mensaje-bloque';
        contenedor.textContent = '';

        const header = document.createElement('div');
        header.className = 'supabase-error-header';
        const strongHeader = document.createElement('strong');
        strongHeader.textContent = 'El archivo CSV no cumple con la estructura de columnas obligatorias';
        header.appendChild(strongHeader);
        contenedor.appendChild(header);

        const ul = document.createElement('ul');
        ul.className = 'supabase-error-list';
        resultado.errores.forEach(err => {
          const li = document.createElement('li');
          li.textContent = err;
          ul.appendChild(li);
        });
        contenedor.appendChild(ul);

        const comp = document.createElement('div');
        comp.className = 'supabase-comparacion-columnas';

        const rowReq = document.createElement('div');
        rowReq.appendChild(crearFragmentoSeguro([
          { tag: 'strong', text: 'Encabezados requeridos (en orden):' },
          ' ',
          { tag: 'code', text: columnas.join(', ') }
        ]));
        comp.appendChild(rowReq);

        const rowEnc = document.createElement('div');
        rowEnc.style.marginTop = '4px';
        rowEnc.appendChild(crearFragmentoSeguro([
          { tag: 'strong', text: 'Encabezados encontrados en el archivo:' },
          ' ',
          { tag: 'code', text: encontradasTexto }
        ]));
        comp.appendChild(rowEnc);

        contenedor.appendChild(comp);
        contenedor.classList.remove('hidden');
      }

      setVisible(ids.resultado, false);
      setVisible(ids.seccionConfirm, false);
    }

    function renderizarObservaciones() {
      const cont = document.getElementById(ids.contObs);
      const lista = document.getElementById(ids.listaObs);
      const contador = document.getElementById(ids.countObs);
      if (!cont || !lista) return;

      const obs = estado.observaciones;
      if (obs.length === 0) {
        cont.classList.add('hidden');
        lista.textContent = '';
        return;
      }

      if (contador) {
        contador.textContent = `${obs.length} observación${obs.length === 1 ? '' : 'es'} encontrada${obs.length === 1 ? '' : 's'}`;
      }

      lista.textContent = '';
      const frag = document.createDocumentFragment();
      obs.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'supabase-obs-item';
        const span = document.createElement('span');
        span.className = 'supabase-obs-msg';
        span.textContent = msg;
        item.appendChild(span);
        frag.appendChild(item);
      });
      lista.appendChild(frag);
      cont.classList.remove('hidden');
    }

    function renderizarResumenValidacion(contexto) {
      const total = estado.totalFilas;
      const validas = estado.registrosValidos.length;
      const totalObs = estado.observaciones.length;
      const tabla = typeof tablaDestino === 'function' ? tablaDestino(contexto) : tablaDestino;

      if (validas === total && totalObs === 0) {
        mostrarMensajeBloque(
          ids.msgValidacion,
          `Archivo CSV validado correctamente. Los ${columnas.length} encabezados coinciden y las ${validas.toLocaleString('es-CO')} filas son válidas para la tabla ${tabla}.`,
          'success'
        );
      } else if (validas > 0) {
        mostrarMensajeBloque(
          ids.msgValidacion,
          `Archivo CSV con encabezados válidos. Se identificaron ${validas.toLocaleString('es-CO')} filas válidas y ${totalObs.toLocaleString('es-CO')} observación(es) que debe corregir antes de importar en ${tabla}.`,
          'warning'
        );
      } else {
        mostrarMensajeBloque(
          ids.msgValidacion,
          `Los encabezados son correctos, pero ninguna de las ${total.toLocaleString('es-CO')} filas cumplió las validaciones requeridas. Revise las observaciones detalladas.`,
          'error'
        );
      }

      const elTotal = document.getElementById(ids.statTotal);
      const elValidas = document.getElementById(ids.statValidas);
      const elObs = document.getElementById(ids.statObs);
      if (elTotal) elTotal.textContent = total.toLocaleString('es-CO');
      if (elValidas) elValidas.textContent = validas.toLocaleString('es-CO');
      if (elObs) elObs.textContent = totalObs.toLocaleString('es-CO');

      renderizarObservaciones();
      setVisible(ids.resultado, true);
      setVisible(ids.seccionConfirm, true);

      const ctxOk = !contextoValido || contextoValido(contexto);
      const listo = ctxOk && validas > 0 && totalObs === 0;
      const chk = document.getElementById(ids.chkConfirm);
      const lbl = document.getElementById(ids.lblConfirm);
      const resumenEl = document.getElementById(ids.resumenConfirm);

      if (chk) {
        chk.checked = false;
        chk.disabled = !listo;
      }
      if (lbl) lbl.classList.toggle('supabase-confirm-check-activo', listo);
      actualizarEstadoBoton();

      if (resumenEl) {
        const nombreArchivo = estado.archivo?.name || 'archivo.csv';
        const resumen = construirResumenConfirmacion({
          listo,
          validas,
          nombreArchivo,
          tabla,
          contexto
        });
        resumenEl.textContent = '';
        if (resumen instanceof Node) {
          resumenEl.appendChild(resumen);
        } else {
          resumenEl.textContent = String(resumen ?? '');
        }
      }
    }

    function analizarContenido(contenido, archivo) {
      const contexto = obtenerContexto ? obtenerContexto() : null;
      if (obtenerContexto && !contexto) return;

      if (!contenido || !contenido.trim()) {
        mostrarMensajeBloque(
          ids.msgValidacion,
          'El archivo CSV no contiene datos legibles. Verifique que no esté en blanco.',
          'error'
        );
        return;
      }

      const { delimitador, filas } = parsearTextoCSV(contenido);
      estado.contexto = contexto;
      mostrarInfoArchivo(archivo, delimitador, contexto);

      while (
        filas.length > 0 &&
        filas[filas.length - 1].celdas
          .slice(0, columnas.length)
          .every(c => String(c ?? '').trim() === '')
      ) {
        filas.pop();
      }

      if (filas.length === 0) {
        mostrarMensajeBloque(ids.msgValidacion, 'El archivo CSV no contiene filas.', 'error');
        return;
      }

      const filaEncabezados = filas[0];
      const resultadoEncabezados = validarEncabezados(
        filaEncabezados.celdas,
        columnas,
        insensibleEncabezados
      );
      estado.encabezadosValidos = resultadoEncabezados.valido;
      actualizarPills(resultadoEncabezados.encontrados);

      if (!resultadoEncabezados.valido) {
        renderizarErrorEncabezados(resultadoEncabezados);
        return;
      }

      const filasDatos = filas.slice(1);
      if (filasDatos.length === 0) {
        mostrarMensajeBloque(
          ids.msgValidacion,
          'Los encabezados del archivo son correctos, pero el CSV no contiene ningún registro debajo de la primera fila.',
          'error'
        );
        return;
      }

      const observaciones = [];
      if (validarArchivo) {
        observaciones.push(...validarArchivo(archivo, contexto));
      }

      let conteoMalCodificadas = 0;
      let conteoFilasVacias = 0;
      const conteoVacios = Object.fromEntries(columnas.map(c => [c, 0]));
      const erroresDominio = new Map();
      const estadoDominio = crearEstadoValidacion ? crearEstadoValidacion(contexto) : {};
      const registrosValidos = [];

      const ctxFila = Object.assign(estadoDominio, {
        registrarError(clave, construirMensaje) {
          const actual = erroresDominio.get(clave);
          if (actual) {
            actual.count += 1;
          } else {
            erroresDominio.set(clave, { count: 1, construirMensaje });
          }
          ctxFila._filaConError = true;
        }
      });

      filasDatos.forEach(itemFila => {
        const valoresRaw = columnas.map((_, idx) => String(itemFila.celdas[idx] ?? '').trim());

        if (valoresRaw.every(v => v === '')) {
          conteoFilasVacias++;
          return;
        }

        if (valoresRaw.some(v => v.includes('\uFFFD'))) {
          conteoMalCodificadas++;
        }

        let tieneCampoVacio = false;
        columnas.forEach((col, idx) => {
          if (!valoresRaw[idx]) {
            conteoVacios[col]++;
            tieneCampoVacio = true;
          }
        });

        ctxFila._filaConError = false;
        const registro = procesarFila(valoresRaw, itemFila.numeroFila, ctxFila);
        if (!tieneCampoVacio && !ctxFila._filaConError && registro) {
          registrosValidos.push(registro);
        }
      });

      if (conteoMalCodificadas > 0) {
        observaciones.push(
          `Se detectaron caracteres especiales mal codificados (\uFFFD) en ${formatearPlural(conteoMalCodificadas, 'fila', 'filas')}. Se recomienda guardar el archivo como "CSV UTF-8 (delimitado por comas)" antes de importar.`
        );
      }

      if (conteoFilasVacias > 0) {
        observaciones.push(
          `Se encontraron ${formatearPlural(conteoFilasVacias, 'fila completamente vacía', 'filas completamente vacías')} dentro del archivo.`
        );
      }

      columnas.forEach(col => {
        if (conteoVacios[col] > 0) {
          observaciones.push(
            `El campo obligatorio "${col}" está vacío en ${formatearPlural(conteoVacios[col], 'fila', 'filas')}.`
          );
        }
      });

      erroresDominio.forEach(item => {
        observaciones.push(item.construirMensaje(item.count));
      });

      estado.totalFilas = filasDatos.length;
      estado.registrosValidos = registrosValidos;
      estado.observaciones = observaciones;

      renderizarResumenValidacion(contexto);
    }

    function procesarArchivo(archivo) {
      if (estado.reemplazando) return;
      if (antesDeSeleccionar && !antesDeSeleccionar()) return;

      limpiar(null, { conservarContexto: true });

      const nombre = archivo.name || '';
      if (!/\.csv$/i.test(nombre)) {
        mostrarMensajeBloque(
          ids.msgValidacion,
          `El archivo seleccionado ("${nombre}") no es un archivo CSV válido. Por favor seleccione un archivo con extensión .csv.`,
          'error'
        );
        return;
      }

      if (archivo.size === 0) {
        mostrarMensajeBloque(
          ids.msgValidacion,
          `El archivo "${nombre}" está vacío (0 bytes). Seleccione un archivo CSV que contenga los encabezados y registros.`,
          'error'
        );
        return;
      }

      estado.archivo = archivo;
      mostrarInfoArchivo(archivo, null, obtenerContexto ? obtenerContexto() : null);

      const lector = new FileReader();
      lector.onload = function (e) {
        const contenido = typeof e.target?.result === 'string' ? e.target.result : '';
        estado.textoCrudo = contenido;
        analizarContenido(contenido, archivo);
      };
      lector.onerror = function () {
        mostrarMensajeBloque(
          ids.msgValidacion,
          'No fue posible leer el archivo seleccionado. Verifique que no esté dañado o bloqueado por otro programa.',
          'error'
        );
      };
      lector.readAsText(archivo, 'UTF-8');
    }

    function inicializar() {
      const dropzone = document.getElementById(ids.dropzone);
      const input = document.getElementById(ids.input);
      if (!dropzone || dropzone.dataset.inicializado === 'true') return;
      dropzone.dataset.inicializado = 'true';

      dropzone.addEventListener('click', function (e) {
        if (e.target.closest(`#${ids.btnQuitar}`) || estado.reemplazando) return;
        if (antesDeSeleccionar && !antesDeSeleccionar()) return;
        if (input) input.click();
      });

      dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!estado.reemplazando) dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        if (estado.reemplazando) return;
        const archivo = e.dataTransfer?.files?.[0];
        if (archivo) procesarArchivo(archivo);
      });
    }

    function manejarCambioInput(event) {
      if (estado.reemplazando) return;
      const archivo = event.target?.files?.[0];
      if (!archivo) return;
      if (antesDeSeleccionar && !antesDeSeleccionar()) {
        event.target.value = '';
        return;
      }
      procesarArchivo(archivo);
    }

    async function ejecutarEnvio() {
      if (estado.reemplazando) return;

      const btn = document.getElementById(ids.btnReemplazar);
      const chk = document.getElementById(ids.chkConfirm);
      const btnQuitar = document.getElementById(ids.btnQuitar);
      const loader = typeof mostrarCargando === 'function' ? mostrarCargando(document.body) : null;
      const tabla = typeof tablaDestino === 'function' ? tablaDestino(estado.contexto) : tablaDestino;

      estado.reemplazando = true;
      mostrarMensajeBloque(ids.msgReemplazo, '', '');

      if (btn) {
        btn.disabled = true;
        btn.textContent = typeof textoBotonEnviando === 'function'
          ? textoBotonEnviando(estado.contexto)
          : (textoBotonEnviando || `Reemplazando registros en ${tabla}...`);
      }
      if (chk) chk.disabled = true;
      if (btnQuitar) btnQuitar.disabled = true;
      if (alCambiarEstadoEnvio) alCambiarEstadoEnvio(true);

      try {
        const mensajeExito = await ejecutarReemplazo(estado.registrosValidos, estado.contexto);
        if (chk) {
          chk.checked = false;
          chk.disabled = false;
        }
        mostrarMensajeBloque(ids.msgReemplazo, mensajeExito, 'success');
      } catch (error) {
        console.error(`Error reemplazando ${tabla}:`, error);
        if (chk) chk.disabled = false;

        const mensajeErr = (typeof ConsultasAdmin !== 'undefined' && typeof ConsultasAdmin.interpretarError === 'function')
          ? ConsultasAdmin.interpretarError(error, `No fue posible reemplazar ${tabla}`)
          : (error?.message || `Ocurrió un error al reemplazar los registros en ${tabla}.`);
        mostrarMensajeBloque(ids.msgReemplazo, mensajeErr, 'error');
      } finally {
        estado.reemplazando = false;
        if (typeof ocultarCargando === 'function' && loader) {
          ocultarCargando(loader);
        }
        if (btnQuitar) btnQuitar.disabled = false;
        if (btn) btn.textContent = obtenerTextoBoton();
        if (alCambiarEstadoEnvio) alCambiarEstadoEnvio(false);
        actualizarEstadoBoton();
      }
    }

    function solicitarReemplazo() {
      if (estado.reemplazando) return;

      const chk = document.getElementById(ids.chkConfirm);
      if (!chk || !chk.checked) return;

      if (
        (contextoValido && !contextoValido(estado.contexto)) ||
        !estado.encabezadosValidos ||
        estado.observaciones.length > 0 ||
        estado.registrosValidos.length === 0
      ) {
        mostrarMensajeBloque(ids.msgReemplazo, 'El archivo CSV no está listo para importar.', 'error');
        return;
      }

      const modal = construirModalConfirmacion({
        cantidad: estado.registrosValidos.length,
        nombreArchivo: estado.archivo?.name || 'archivo.csv',
        contexto: estado.contexto
      });

      mostrarModalConfirmacion(modal.titulo, modal.mensaje, ejecutarEnvio);
    }

    return {
      inicializar,
      limpiar,
      manejarCambioInput,
      actualizarEstadoBoton,
      solicitarReemplazo,
      revalidar() {
        if (estado.archivo && estado.textoCrudo) {
          mostrarMensajeBloque(ids.msgReemplazo, '', '');
          analizarContenido(estado.textoCrudo, estado.archivo);
          return true;
        }
        return false;
      },
      estaReemplazando: () => estado.reemplazando
    };
  }

  window.ImportadorCSV = Object.freeze({
    SEDES_PERMITIDAS,
    normalizarEspacios,
    normalizarSinTildesMayusculas,
    parsearTextoCSV,
    formatearPlural,
    crearFragmentoSeguro,
    mostrarMensajeBloque,
    crearImportadorCSV
  });
})(window);
