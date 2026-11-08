// =========================================================
// Diagnostico/Lectura/script.js
// Configuración de la prueba diagnóstica de Lectura.
// Toda la lógica (ingreso, registro, carga, aleatorización,
// paginación, validación y entrega) está en ../compartido/examen.js
// =========================================================

const BASE_IMAGENES_LECTURA =
  'https://hgppzklpukgslnrynvld.supabase.co/storage/v1/object/public/IMG/DIAGNOSTICOS/LECTURA/';

// pregunta.imagen viene directamente de la columna "imagen" de
// diagnosticos.preguntas_lectura (ver api.cargarPreguntas en examen.js).
function obtenerImagenPreguntaLectura(pregunta) {
  if (!pregunta.imagen) return null;
  return {
    url: BASE_IMAGENES_LECTURA + pregunta.imagen,
    alt: 'Imagen de apoyo para la pregunta ' + pregunta.numero
  };
}

function obtenerImagenTextoLectura(texto) {
  if (!texto || !texto.imagen) return null;
  return {
    url: BASE_IMAGENES_LECTURA + texto.imagen,
    alt: texto.titulo ? 'Imagen de apoyo para el texto: ' + texto.titulo : 'Imagen de apoyo del texto'
  };
}

iniciarExamenDiagnostico({
  prueba: 'LECTURA',                     // valor exacto esperado por diagnosticos.enviar_prueba
  tablaPreguntas: 'preguntas_lectura',
  titulo: 'Lectura Crítica',
  preguntasPorSeccion: 5,
  textosCompartidos: true,               // usa texto_id → textos_compartidos (frecuente en lectura: varias preguntas por texto)
  obtenerImagenPregunta: obtenerImagenPreguntaLectura,
  obtenerImagenTexto: obtenerImagenTextoLectura
});
