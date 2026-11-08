// =========================================================
// Diagnostico/Matematicas/script.js
// Configuración de la prueba diagnóstica de Matemáticas.
// Toda la lógica (ingreso, registro, carga, aleatorización,
// paginación, validación y entrega) está en ../compartido/examen.js
// =========================================================

const BASE_IMAGENES_MATEMATICAS =
  'https://hgppzklpukgslnrynvld.supabase.co/storage/v1/object/public/IMG/DIAGNOSTICOS/MATEMATICAS/';

// pregunta.imagen viene directamente de la columna "imagen" de
// diagnosticos.preguntas_matematicas (ver api.cargarPreguntas en examen.js).
function obtenerImagenPreguntaMatematicas(pregunta) {
  if (!pregunta.imagen) return null;
  return {
    url: BASE_IMAGENES_MATEMATICAS + pregunta.imagen,
    alt: 'Imagen de apoyo para la pregunta ' + pregunta.numero
  };
}

function obtenerImagenTextoMatematicas(texto) {
  if (!texto || !texto.imagen) return null;
  return {
    url: BASE_IMAGENES_MATEMATICAS + texto.imagen,
    alt: texto.titulo ? 'Imagen de apoyo para el texto: ' + texto.titulo : 'Imagen de apoyo del texto'
  };
}

iniciarExamenDiagnostico({
  prueba: 'MATEMATICAS',                 // valor exacto esperado por diagnosticos.enviar_prueba
  tablaPreguntas: 'preguntas_matematicas',
  titulo: 'Matemáticas',
  preguntasPorSeccion: 5,
  textosCompartidos: true,               // usa texto_id → textos_compartidos solo si alguna pregunta lo tiene
  obtenerImagenPregunta: obtenerImagenPreguntaMatematicas,
  obtenerImagenTexto: obtenerImagenTextoMatematicas
});