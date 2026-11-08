// =========================================================
// Diagnostico/Comunicacion/script.js
// Configuración de la prueba diagnóstica de Comunicación.
// Toda la lógica (ingreso, registro, carga, aleatorización,
// paginación, validación y entrega) está en ../compartido/examen.js
// =========================================================

const BASE_IMAGENES_COMUNICACION =
  'https://hgppzklpukgslnrynvld.supabase.co/storage/v1/object/public/IMG/DIAGNOSTICOS/COMUNICACION/';

// pregunta.imagen viene directamente de la columna "imagen" de
// diagnosticos.preguntas_comunicacion (ver api.cargarPreguntas en examen.js).
function obtenerImagenPreguntaComunicacion(pregunta) {
  if (!pregunta.imagen) return null;
  return {
    url: BASE_IMAGENES_COMUNICACION + pregunta.imagen,
    alt: 'Imagen de apoyo para la pregunta ' + pregunta.numero
  };
}

function obtenerImagenTextoComunicacion(texto) {
  if (!texto || !texto.imagen) return null;
  return {
    url: BASE_IMAGENES_COMUNICACION + texto.imagen,
    alt: texto.titulo ? 'Imagen de apoyo para el texto: ' + texto.titulo : 'Imagen de apoyo del texto'
  };
}

iniciarExamenDiagnostico({
  prueba: 'COMUNICACION',                // valor exacto esperado por diagnosticos.enviar_prueba
  tablaPreguntas: 'preguntas_comunicacion',
  titulo: 'Comunicación Escrita',
  preguntasPorSeccion: 5,
  textosCompartidos: true,               // usa texto_id → textos_compartidos solo si alguna pregunta lo tiene
  obtenerImagenPregunta: obtenerImagenPreguntaComunicacion,
  obtenerImagenTexto: obtenerImagenTextoComunicacion
});
