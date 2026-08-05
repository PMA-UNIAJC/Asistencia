'use strict';

/* =======================================================================
   PANEL PÚBLICO — módulo de integración para la Pantalla Principal
   =======================================================================
   Cómo instalarlo (sin tocar tu script.js existente):

   1) En Inicio/index.html agrega, DESPUÉS del <script> de supabase-js
      y ANTES de tu script.js:

        <link rel="stylesheet" href="../Publico/panel-publico.css" />
        <script src="../Publico/panel-publico.js"></script>

   2) En algún lugar del HTML de Inicio (donde quieras que aparezca el
      resultado, por ejemplo cerca de las 4 opciones) agrega un
      contenedor vacío:

        <div id="panel-publico-stats"></div>

      Este módulo nunca toca el resto de tu DOM ni tus estilos.

   3) Desde tu script.js (SIN modificar su lógica interna), llama estas
      funciones en los 3 momentos que ya existen en tu juego:

      a) Cuando arranca una partida nueva:
           await PanelPublico.nuevaPartida();

      b) Cuando se muestra una pregunta nueva al concursante
         (tienes el texto y las 4 opciones en ese punto):
           await PanelPublico.abrirPregunta(numeroDePregunta, textoPregunta, {
             a: opcionA, b: opcionB, c: opcionC, d: opcionD,
           });

      c) Cuando el concursante ya respondió y quieres mostrar el resultado
         del público (estilo "Preguntar al público"):
           const resultado = await PanelPublico.cerrarPreguntaYMostrar(numeroDePregunta);
           // resultado = { total_participantes, votos_a..d, porcentaje_a..d }

      d) (Opcional) Si quieres mostrar el conteo EN VIVO mientras la
         pregunta sigue abierta —por ejemplo, al usar un comodín tipo
         "Preguntar al público" antes de que el concursante responda—,
         sin cerrar la votación ni impedir que el público siga votando:
           PanelPublico.mostrarConteoEnVivo(numeroDePregunta, 3000);
         Se actualiza solo cada "intervaloMs" (3000 = cada 3 segundos).
         Cuando llames cerrarPreguntaYMostrar() más adelante, el conteo
         en vivo se detiene automáticamente y se pinta el resultado final.

   Ninguna de estas llamadas requiere que conozcas ni cambies tus
   variables o funciones internas: solo les pasas los datos que tu
   juego ya tiene en esos momentos.
   ===================================================================== */

const PanelPublico = (function () {
  const SUPABASE_URL = `https://hgppzklpukgslnrynvld.supabase.co`;
  const SUPABASE_ANON_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30.gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs`;
  const SCHEMA = 'millonario';

  let client = null;
  try {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('PanelPublico: no se pudo inicializar Supabase.', err);
  }

  let partidaActualId = null;
  let intervaloConteoId = null;

  const contenedorStats = () => document.getElementById('panel-publico-stats');

  /* --- 1. Nueva partida ------------------------------------------------ */
  async function nuevaPartida() {
    const { data, error } = await client.schema(SCHEMA).rpc('crear_partida');
    if (error) throw error;
    partidaActualId = data;
    ocultarPanelStats();
    return partidaActualId;
  }

  /* --- 2. Abrir pregunta ------------------------------------------------ */
  async function abrirPregunta(numeroPregunta, textoPregunta, opciones) {
    if (!partidaActualId) {
      throw new Error('PanelPublico: no hay partida activa. Llama primero a PanelPublico.nuevaPartida().');
    }
    ocultarPanelStats();
    const { error } = await client.schema(SCHEMA).rpc('abrir_pregunta', {
      p_numero_pregunta: numeroPregunta,
      p_texto: textoPregunta,
      p_opcion_a: opciones.a,
      p_opcion_b: opciones.b,
      p_opcion_c: opciones.c,
      p_opcion_d: opciones.d,
    });
    if (error) throw error;
  }

  /* --- 3. (Opcional) conteo en vivo mientras la pregunta está abierta --- */
  function iniciarConteoEnVivo(numeroPregunta, callback, intervaloMs = 1500) {
    detenerConteoEnVivo();
    intervaloConteoId = setInterval(async () => {
      if (!partidaActualId) return;
      const { data, error } = await client.schema(SCHEMA).rpc('obtener_conteo_votos', {
        p_partida_id: partidaActualId,
        p_numero_pregunta: numeroPregunta,
      });
      if (!error) callback(formatearConteo(data));
    }, intervaloMs);
  }

  function detenerConteoEnVivo() {
    if (intervaloConteoId) clearInterval(intervaloConteoId);
    intervaloConteoId = null;
  }

  function formatearConteo(filas) {
    const conteo = { A: 0, B: 0, C: 0, D: 0 };
    (filas || []).forEach((f) => { conteo[f.opcion] = Number(f.total); });
    return conteo;
  }

  /* --- 3b. Vista EN VIVO para el comodín "Público" -----------------------
     A diferencia de cerrarPreguntaYMostrar(), esta función NO cierra la
     pregunta ni impide que el público siga votando: solo consulta y
     pinta el conteo actual, refrescándolo cada "intervaloMs" (por
     defecto 3 segundos) reutilizando iniciarConteoEnVivo() de arriba,
     que ya existía y no se modifica. Se usa cuando el concursante activa
     el comodín "Público" mientras la pregunta sigue abierta.
     ----------------------------------------------------------------------- */
  async function mostrarConteoEnVivo(numeroPregunta, intervaloMs = 3000) {
    const cont = contenedorStats();
    if (cont) {
      cont.innerHTML = `
        <div class="panel-publico-stats__titulo">Preguntar al público · en vivo</div>
        <p class="panel-publico-stats__cargando">Esperando los primeros votos…</p>
      `;
      cont.classList.remove('hidden');
    }

    // Primer pintado inmediato (no espera al primer intervalo) para que
    // el modal no se sienta vacío al abrirse.
    await refrescarConteoUnaVez(numeroPregunta);

    iniciarConteoEnVivo(numeroPregunta, pintarConteoEnVivo, intervaloMs);
  }

  async function refrescarConteoUnaVez(numeroPregunta) {
    if (!partidaActualId) return;
    try {
      const { data, error } = await client.schema(SCHEMA).rpc('obtener_conteo_votos', {
        p_partida_id: partidaActualId,
        p_numero_pregunta: numeroPregunta,
      });
      if (!error) pintarConteoEnVivo(formatearConteo(data));
    } catch (err) {
      console.warn('PanelPublico: no se pudo refrescar el conteo en vivo.', err);
    }
  }

  /** Pinta el conteo en vivo (votos crudos, sin cerrar la pregunta). */
  function pintarConteoEnVivo(conteo) {
    const cont = contenedorStats();
    if (!cont) return;

    const letras = ['A', 'B', 'C', 'D'];
    const total = letras.reduce((suma, letra) => suma + (conteo[letra] || 0), 0);

    const barras = letras.map((letra) => {
      const votos = conteo[letra] || 0;
      const pct = total > 0 ? Math.round((votos / total) * 100) : 0;
      return { letra, votos, pct };
    });

    cont.innerHTML = `
      <div class="panel-publico-stats__titulo">
        Preguntar al público · en vivo (${total} voto${total === 1 ? '' : 's'})
      </div>
      <div class="panel-publico-stats__barras">
        ${barras.map((b) => `
          <div class="panel-publico-stats__fila">
            <span class="panel-publico-stats__letra">${b.letra}</span>
            <div class="panel-publico-stats__pista">
              <div class="panel-publico-stats__relleno" style="width:${b.pct}%"></div>
            </div>
            <span class="panel-publico-stats__pct">${b.pct}%</span>
          </div>
        `).join('')}
      </div>
    `;
    cont.classList.remove('hidden');
  }

  /* --- 4. Cerrar pregunta y pintar el panel de resultados --------------- */
  async function cerrarPreguntaYMostrar(numeroPregunta) {
    detenerConteoEnVivo();
    if (!partidaActualId) {
      throw new Error('PanelPublico: no hay partida activa.');
    }
    const { data, error } = await client.schema(SCHEMA).rpc('cerrar_pregunta', {
      p_partida_id: partidaActualId,
      p_numero_pregunta: numeroPregunta,
    });
    if (error) throw error;

    const resultado = data && data[0];
    if (resultado) pintarPanelStats(resultado);
    return resultado;
  }

  /* --- Render del panel tipo "Preguntar al público" ---------------------- */
  function pintarPanelStats(resultado) {
    const cont = contenedorStats();
    if (!cont) return; // el HTML de Inicio no tiene el contenedor: no falla nada, solo no se muestra

    const barras = [
      { letra: 'A', pct: resultado.porcentaje_a, votos: resultado.votos_a },
      { letra: 'B', pct: resultado.porcentaje_b, votos: resultado.votos_b },
      { letra: 'C', pct: resultado.porcentaje_c, votos: resultado.votos_c },
      { letra: 'D', pct: resultado.porcentaje_d, votos: resultado.votos_d },
    ];

    cont.innerHTML = `
      <div class="panel-publico-stats__titulo">
        Preguntar al público · ${resultado.total_participantes} participante${resultado.total_participantes === 1 ? '' : 's'}
      </div>
      <div class="panel-publico-stats__barras">
        ${barras.map((b) => `
          <div class="panel-publico-stats__fila">
            <span class="panel-publico-stats__letra">${b.letra}</span>
            <div class="panel-publico-stats__pista">
              <div class="panel-publico-stats__relleno" style="width:${b.pct}%"></div>
            </div>
            <span class="panel-publico-stats__pct">${b.pct}%</span>
          </div>
        `).join('')}
      </div>
    `;
    cont.classList.remove('hidden');
  }

  function ocultarPanelStats() {
    const cont = contenedorStats();
    if (cont) {
      cont.innerHTML = '';
      cont.classList.add('hidden');
    }
  }

  function obtenerPartidaActual() {
    return partidaActualId;
  }

  return {
    nuevaPartida,
    abrirPregunta,
    iniciarConteoEnVivo,
    detenerConteoEnVivo,
    mostrarConteoEnVivo,
    cerrarPreguntaYMostrar,
    obtenerPartidaActual,
  };
})();
