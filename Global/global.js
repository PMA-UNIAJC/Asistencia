// ============================================================================
// Global/global.js — LÓGICA Y UTILIDADES JAVASCRIPT COMPARTIDAS DEL PROYECTO
// ============================================================================

// ===================================
// 1. CONFIGURACIÓN Y CONSTANTES GLOBALES
// ===================================
const TIMEZONE_COLOMBIA = 'America/Bogota';
const OFFSET_COLOMBIA = '-05:00'; // Colombia (UTC-5 permanente, sin horario de verano)

// Caché de datos de catálogos compartido entre módulos (PMA, AAA, Panel Admin)
const datosCache = {
  facultadesCarreras: [],
  tutoresNorte: [],
  tutoresSur: [],
  profesores: [],
  materias: [],
  temas: []
};

// Caché de elementos DOM frecuentemente accedidos
const elementosDOM = {
  // Mensajes
  mensajeLogin: null,
  mensajeRegistro: null,
  mensajeFormulario: null,
  mensajeAdminLogin: null,
  mensajeActualizacion: null,
  // Pantallas
  pantallaBienvenida: null,
  contenidoFormulario: null,
  pantallaLogin: null,
  pantallaRegistro: null,
  pantallaAdmin: null,
  // Formularios
  formRegistro: null,
  formLogin: null,
  formTutoria: null,
  formAdminLogin: null,
  formVerificarDocumento: null,
  // Confirmación y botones
  confirmacionDatos: null,
  datosConfirmacion: null,
  btnConfirmarRegistro: null,
  btnContinuar: null,
  btnEnviar: null,
  // Estadísticas
  statsGrid: null,
  detallesStats: null,
  contenidoEstadisticas: null,
  // Búsqueda
  resultadoBusqueda: null,
  // Inputs del formulario de registro
  regDocumento: null,
  regPrimerNombre: null,
  regSegundoNombre: null,
  regPrimerApellido: null,
  regSegundoApellido: null,
  regFacultad: null,
  regPrograma: null,
  regSede: null,
  regSemestre: null,
  regDocumentoMostrar: null,
  // Inputs del formulario de login
  loginDocumento: null,
  // Inputs del formulario de tutoría
  sedeTutoria: null,
  tipoInstructor: null,
  facultadDepartamento: null,
  instructor: null,
  asignatura: null,
  // Otros
  pasoDocumento: null,
  grupoFacultad: null,
  grupoInstructor: null,
  grupoMateria: null,
  otraAsignaturaContainer: null,
  labelInstructor: null,
  nombreUsuario: null,
  nombreAdmin: null,
  iconActualizar: null
};

function inicializarCacheDOM() {
  elementosDOM.mensajeLogin = document.getElementById('mensajeLogin');
  elementosDOM.mensajeRegistro = document.getElementById('mensajeRegistro');
  elementosDOM.mensajeFormulario = document.getElementById('mensajeFormulario');
  elementosDOM.mensajeAdminLogin = document.getElementById('mensajeAdminLogin');
  elementosDOM.mensajeActualizacion = document.getElementById('mensajeActualizacion');

  elementosDOM.pantallaBienvenida = document.getElementById('pantallaBienvenida');
  elementosDOM.contenidoFormulario = document.getElementById('contenidoFormulario');
  elementosDOM.pantallaLogin = document.getElementById('pantallaLogin');
  elementosDOM.pantallaRegistro = document.getElementById('pantallaRegistro');
  elementosDOM.pantallaAdmin = document.getElementById('pantallaAdmin');

  elementosDOM.formRegistro = document.getElementById('formRegistro');
  elementosDOM.formLogin = document.getElementById('formLogin');
  elementosDOM.formTutoria = document.getElementById('formTutoria');
  elementosDOM.formAdminLogin = document.getElementById('formAdminLogin');
  elementosDOM.formVerificarDocumento = document.getElementById('formVerificarDocumento');

  elementosDOM.confirmacionDatos = document.getElementById('confirmacionDatos');
  elementosDOM.datosConfirmacion = document.getElementById('datosConfirmacion');
  elementosDOM.btnConfirmarRegistro = document.getElementById('btnConfirmarRegistro');
  elementosDOM.btnContinuar = document.getElementById('btnContinuar');
  elementosDOM.btnEnviar = document.getElementById('btnEnviar');

  elementosDOM.statsGrid = document.getElementById('statsGrid');
  elementosDOM.detallesStats = document.getElementById('detallesStats');
  elementosDOM.contenidoEstadisticas = document.getElementById('contenidoEstadisticas');

  elementosDOM.resultadoBusqueda = document.getElementById('resultadoBusqueda');

  elementosDOM.regDocumento = document.getElementById('regDocumento');
  elementosDOM.regPrimerNombre = document.getElementById('regPrimerNombre');
  elementosDOM.regSegundoNombre = document.getElementById('regSegundoNombre');
  elementosDOM.regPrimerApellido = document.getElementById('regPrimerApellido');
  elementosDOM.regSegundoApellido = document.getElementById('regSegundoApellido');
  elementosDOM.regFacultad = document.getElementById('regFacultad');
  elementosDOM.regPrograma = document.getElementById('regPrograma');
  elementosDOM.regSede = document.getElementById('regSede');
  elementosDOM.regSemestre = document.getElementById('regSemestre');
  elementosDOM.regDocumentoMostrar = document.getElementById('regDocumentoMostrar');

  elementosDOM.loginDocumento = document.getElementById('loginDocumento');

  elementosDOM.sedeTutoria = document.getElementById('sedeTutoria');
  elementosDOM.tipoInstructor = document.getElementById('tipoInstructor');
  elementosDOM.facultadDepartamento = document.getElementById('facultadDepartamento');
  elementosDOM.instructor = document.getElementById('instructor');
  elementosDOM.asignatura = document.getElementById('asignatura');

  elementosDOM.pasoDocumento = document.getElementById('pasoDocumento');
  elementosDOM.grupoFacultad = document.getElementById('grupoFacultadDepartamento');
  elementosDOM.grupoInstructor = document.getElementById('grupoInstructor');
  elementosDOM.grupoMateria = document.getElementById('grupoMateria');
  elementosDOM.otraAsignaturaContainer = document.getElementById('otraAsignaturaContainer');
  elementosDOM.labelInstructor = document.getElementById('labelInstructor');
  elementosDOM.nombreUsuario = document.getElementById('nombreUsuario');
  elementosDOM.nombreAdmin = document.getElementById('nombreAdmin');
  elementosDOM.iconActualizar = document.getElementById('iconActualizar');
}

// ===================================
// 2. NORMALIZACIÓN Y FORMATO DE TEXTO
// ===================================
function normalizarNombre(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizarNombreSinEspacios(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .trim()
    .toUpperCase();
}

function normalizarAsignatura(str) {
  return String(str ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/\bLLL\b/g, 'III')
    .replace(/\bLL\b/g, 'II')
    .replace(/\bL\b/g, 'I')
    .replace(/\b5\b/g, 'V')
    .replace(/\b4\b/g, 'IV')
    .replace(/\b3\b/g, 'III')
    .replace(/\b2\b/g, 'II')
    .replace(/\b1\b/g, 'I')
    .toUpperCase();
}

function normalizarGrupo(str) {
  return String(str ?? '')
    .replace(/[^A-Za-z0-9\-]/g, '')
    .toUpperCase();
}

function normalizarGrupos(str) {
  if (str === null || str === undefined) return '';
  const texto = String(str);
  if (!texto.trim()) return '';

  const partes = texto.split(/([;,][\s;,]*)/);
  const elementos = [];
  let separadorPendiente = '';

  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i];
    if (i % 2 === 1) {
      const primerSeparador = parte.match(/[;,]/);
      if (primerSeparador) {
        separadorPendiente = primerSeparador[0];
      }
    } else {
      const grupoNorm = normalizarGrupo(parte);
      if (grupoNorm) {
        if (elementos.length > 0) {
          elementos.push((separadorPendiente || ';') + ' ');
        }
        elementos.push(grupoNorm);
        separadorPendiente = '';
      }
    }
  }

  return elementos.join('');
}

function extraerListaGrupos(str) {
  const norm = normalizarGrupos(str);
  if (!norm) return [];
  const grupos = norm.split(/[;,]\s*/).filter(Boolean);
  return [...new Set(grupos)];
}

function limpiarEspacios(input) {
  if (!input || typeof input.value !== 'string') return;
  const valorOriginal = input.value;

  let valor = input.value.trim();
  valor = valor.replace(/\s+/g, ' ');

  if (valorOriginal !== valor) {
    input.value = valor;
    input.style.backgroundColor = '#e8f4fd';
    setTimeout(() => {
      input.style.backgroundColor = '';
    }, 300);
  }
}

function censurarNombre(nombreCompleto) {
  return String(nombreCompleto || '')
    .split(' ')
    .filter(Boolean)
    .map(parte => {
      if (parte.length <= 2) return parte;
      return parte.substring(0, 2) + '*'.repeat(parte.length - 2);
    })
    .join(' ');
}

function escaparHTML(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const escapeHtmlAdmin = escaparHTML;

// ===================================
// 3. VALIDACIÓN DE DOCUMENTOS Y FORMULARIOS
// ===================================
function validarDocumentoInput(input) {
  const len = input.value.length;
  if (len > 0 && (len < 6 || len > 10)) {
    input.setCustomValidity('Escriba correctamente su documento');
  } else {
    input.setCustomValidity('');
  }
}

function validarDocumento(documento) {
  const doc = String(documento ?? '').trim();
  if (doc.length < 6 || doc.length > 10) {
    return {
      valido: false,
      mensaje: 'Documento no válido'
    };
  }
  return { valido: true };
}

function compararDocumentos(doc1, doc2) {
  return String(doc1 ?? '').trim() === String(doc2 ?? '').trim();
}

const limpiadoresResaltado = new WeakMap();

function scrollToError(elemento) {
  if (!elemento) return;

  const limpiadorPrevio = limpiadoresResaltado.get(elemento);
  if (limpiadorPrevio) limpiadorPrevio();

  elemento.style.transition = 'box-shadow 0.3s ease';
  elemento.style.boxShadow = '0 0 0 4px rgba(220, 53, 69, 0.3)';

  const quitarResaltado = () => {
    elemento.style.boxShadow = '';
    elemento.removeEventListener('focus', quitarResaltado);
    elemento.removeEventListener('input', quitarResaltado);
    elemento.removeEventListener('change', quitarResaltado);
    elemento.removeEventListener('click', quitarResaltado);
    limpiadoresResaltado.delete(elemento);
  };

  elemento.addEventListener('focus', quitarResaltado);
  elemento.addEventListener('input', quitarResaltado);
  elemento.addEventListener('change', quitarResaltado);
  elemento.addEventListener('click', quitarResaltado);

  limpiadoresResaltado.set(elemento, quitarResaltado);
}

function validarCamposRequeridos(reglas) {
  for (const regla of reglas) {
    if (!regla.valido()) {
      return {
        valido: false,
        mensaje: regla.mensaje,
        elemento: regla.elemento ? regla.elemento() : null
      };
    }
  }
  return { valido: true };
}

// ===================================
// 4. FECHAS Y HORAS (ZONA HORARIA COLOMBIA — America/Bogota)
// ===================================
const _fmtPartesColombia = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_COLOMBIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

const _fmtDiaSemanaColombia = new Intl.DateTimeFormat('es-CO', {
  timeZone: TIMEZONE_COLOMBIA,
  weekday: 'long'
});

const _fmtFechaHoraLocalColombia = new Intl.DateTimeFormat('es-CO', {
  timeZone: TIMEZONE_COLOMBIA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const _fmtFechaLargaHoraCortaColombia = new Intl.DateTimeFormat('es-CO', {
  timeZone: TIMEZONE_COLOMBIA,
  dateStyle: 'long',
  timeStyle: 'short'
});

const _fmtEncabezadoColombia = new Intl.DateTimeFormat('es-CO', {
  timeZone: TIMEZONE_COLOMBIA,
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

/**
 * Interpreta cualquier valor de fecha/hora (string ISO con o sin zona horaria,
 * string YYYY-MM-DD, timestamp numérico o instancia Date) asegurando que las
 * cadenas sin zona horaria se interpreten siempre en horario de Bogotá (-05:00)
 * y nunca en la zona horaria local del dispositivo.
 *
 * @param {Date|string|number} entrada
 * @returns {Date|null} Instante real válido o null si la entrada no es válida.
 */
function interpretarFechaColombia(entrada) {
  if (entrada === null || entrada === undefined || entrada === '') return null;

  if (entrada instanceof Date) {
    if (typeof entrada._instanteColombiaMs === 'number') {
      return new Date(entrada._instanteColombiaMs);
    }
    return isNaN(entrada.getTime()) ? null : new Date(entrada.getTime());
  }

  if (typeof entrada === 'number') {
    const fechaNum = new Date(entrada);
    return isNaN(fechaNum.getTime()) ? null : fechaNum;
  }

  if (typeof entrada === 'string') {
    const texto = entrada.trim();
    if (!texto) return null;

    let normalizado = texto;

    // Caso 1: Solo fecha YYYY-MM-DD -> medianoche en Colombia (-05:00)
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizado)) {
      normalizado = `${normalizado}T00:00:00${OFFSET_COLOMBIA}`;
    } else if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(normalizado)) {
      // Unificar separador de espacio por 'T'
      normalizado = normalizado.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T');

      // Si tiene offset corto tipo +00 o -05 al final, expandir a +00:00 / -05:00
      if (/[+-]\d{2}$/.test(normalizado)) {
        normalizado = `${normalizado}:00`;
      } else if (!/(Z|[+-]\d{2}:\d{2}|[+-]\d{4})$/i.test(normalizado)) {
        // Caso 2: Fecha y hora sin zona horaria -> asumir horario de Colombia (-05:00)
        normalizado = `${normalizado}${OFFSET_COLOMBIA}`;
      }
    }

    const fecha = new Date(normalizado);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  return null;
}

/**
 * Extrae todos los componentes de fecha y hora en la zona horaria America/Bogota
 * usando Intl.DateTimeFormat (sin depender del reloj local del navegador).
 *
 * @param {Date|string|number} [entrada=new Date()]
 * @returns {Object|null}
 */
function obtenerPartesFechaColombia(entrada = new Date()) {
  const instante = interpretarFechaColombia(entrada);
  if (!instante) return null;

  const partes = _fmtPartesColombia.formatToParts(instante);
  const mapa = {};
  for (const p of partes) {
    if (p.type !== 'literal') {
      mapa[p.type] = p.value;
    }
  }

  const anio = mapa.year;
  const mes = mapa.month;
  const dia = mapa.day;
  const hora = mapa.hour === '24' ? '00' : mapa.hour;
  const minuto = mapa.minute;
  const segundo = mapa.second;

  const anioNum = parseInt(anio, 10);
  const mesNum = parseInt(mes, 10);
  const diaNum = parseInt(dia, 10);
  const horaNum = parseInt(hora, 10);
  const minutoNum = parseInt(minuto, 10);
  const segundoNum = parseInt(segundo, 10);
  const milisegundoNum = instante.getUTCMilliseconds();
  const diaSemanaNum = new Date(Date.UTC(anioNum, mesNum - 1, diaNum)).getUTCDay();

  return {
    anio,
    mes,
    dia,
    hora,
    minuto,
    segundo,
    anioNum,
    mesNum,
    diaNum,
    horaNum,
    minutoNum,
    segundoNum,
    milisegundoNum,
    diaSemanaNum,
    instanteMs: instante.getTime()
  };
}

/**
 * Devuelve la fecha y hora en formato ISO 8601 estandarizado con el offset
 * oficial de Colombia (`YYYY-MM-DDTHH:mm:ss-05:00`) para almacenar y consultar
 * en Supabase de forma uniforme en todas las tablas.
 *
 * @param {Date|string|number} [entrada=new Date()]
 * @returns {string}
 */
function obtenerFechaISOColombia(entrada = new Date()) {
  const p = obtenerPartesFechaColombia(entrada) || obtenerPartesFechaColombia(new Date());
  return `${p.anio}-${p.mes}-${p.dia}T${p.hora}:${p.minuto}:${p.segundo}${OFFSET_COLOMBIA}`;
}

/**
 * Alias de obtenerFechaISOColombia para mantener compatibilidad con todos los módulos.
 */
function obtenerFechaColombia(entrada = new Date()) {
  return obtenerFechaISOColombia(entrada);
}

/**
 * Convierte una fecha (string de Supabase, timestamp o Date) en un objeto Date
 * cuyos getters (.getFullYear(), .getMonth(), .getDate(), .getHours(), .getMinutes(),
 * .getDay()) reflejan exactamente la hora de pared en Bogotá, preservando además
 * la marca de instante real (_instanteColombiaMs).
 *
 * @param {Date|string|number} [entrada=new Date()]
 * @returns {Date}
 */
function convertirFechaAColombia(entrada = new Date()) {
  const p = obtenerPartesFechaColombia(entrada);
  if (!p) return new Date(NaN);

  const fechaLocalColombia = new Date(
    p.anioNum,
    p.mesNum - 1,
    p.diaNum,
    p.horaNum,
    p.minutoNum,
    p.segundoNum,
    p.milisegundoNum
  );

  Object.defineProperty(fechaLocalColombia, '_instanteColombiaMs', {
    value: p.instanteMs,
    enumerable: false,
    configurable: true
  });

  return fechaLocalColombia;
}

/**
 * Devuelve un objeto Date cuyos componentes corresponden a la fecha y hora
 * actual en Colombia (America/Bogota).
 *
 * @returns {Date}
 */
function obtenerFechaActualColombia() {
  return convertirFechaAColombia(new Date());
}

/**
 * Devuelve la fecha actual en Colombia en formato `YYYY-MM-DD`.
 *
 * @param {Date|string|number} [entrada=new Date()]
 * @returns {string}
 */
function obtenerFechaHoyColombia(entrada = new Date()) {
  const p = obtenerPartesFechaColombia(entrada) || obtenerPartesFechaColombia(new Date());
  return `${p.anio}-${p.mes}-${p.dia}`;
}

/**
 * Formatea la hora de una fecha en horario de Colombia (`HH:mm` o `HH:mm:ss`).
 *
 * @param {Date|string|number} [fecha=new Date()]
 * @param {boolean} [incluirSegundos=false]
 * @returns {string}
 */
function formatearHora(fecha = new Date(), incluirSegundos = false) {
  const p = obtenerPartesFechaColombia(fecha);
  if (!p) return '';
  return incluirSegundos ? `${p.hora}:${p.minuto}:${p.segundo}` : `${p.hora}:${p.minuto}`;
}

/**
 * Obtiene la hora actual en Colombia (`HH:mm` o `HH:mm:ss`).
 *
 * @param {boolean} [incluirSegundos=false]
 * @returns {string}
 */
function obtenerHoraActualColombia(incluirSegundos = false) {
  return formatearHora(new Date(), incluirSegundos);
}

/**
 * Formatea una fecha para mostrar en pantalla siempre en zona horaria America/Bogota.
 *
 * Formatos soportados en `opciones.formato`:
 * - `'fecha'` / `'corto'`: `DD/MM/AAAA`
 * - `'fechaHora'`: `DD/MM/AAAA HH:mm` (24h)
 * - `'fechaHoraLocal'`: formato local `es-CO` con fecha y hora en Bogotá
 * - `'largo'`: fecha larga y hora corta en `es-CO` (`4 de noviembre de 2026, 1:30 p. m.`)
 * - `'encabezado'`: día de semana + fecha larga + hora con inicial mayúscula
 * - `'iso'`: `AAAA-MM-DD`
 *
 * @param {Date|string|number} entrada
 * @param {Object|string} [opciones={}]
 * @returns {string}
 */
function formatearFechaColombia(entrada, opciones = {}) {
  const p = obtenerPartesFechaColombia(entrada);
  if (!p) return '';

  const formato = typeof opciones === 'string' ? opciones : (opciones.formato || 'fechaHora');
  const instante = new Date(p.instanteMs);

  switch (formato) {
    case 'fecha':
    case 'corto':
      return `${p.dia}/${p.mes}/${p.anio}`;
    case 'fechaHora':
      return `${p.dia}/${p.mes}/${p.anio} ${p.hora}:${p.minuto}`;
    case 'fechaHoraLocal':
      return _fmtFechaHoraLocalColombia.format(instante);
    case 'largo':
      return _fmtFechaLargaHoraCortaColombia.format(instante);
    case 'encabezado': {
      const texto = _fmtEncabezadoColombia.format(instante);
      return texto.charAt(0).toUpperCase() + texto.slice(1);
    }
    case 'iso':
      return `${p.anio}-${p.mes}-${p.dia}`;
    default:
      return `${p.dia}/${p.mes}/${p.anio} ${p.hora}:${p.minuto}`;
  }
}

/**
 * Obtiene el nombre del día de la semana en español y en mayúsculas según la
 * zona horaria de Colombia (ej. `LUNES`, `MARTES`, `MIÉRCOLES`).
 *
 * @param {Date|string|number} [entrada=new Date()]
 * @returns {string}
 */
function obtenerDiaSemanaColombia(entrada = new Date()) {
  const instante = interpretarFechaColombia(entrada) || new Date();
  return _fmtDiaSemanaColombia.format(instante).toUpperCase();
}

/**
 * Determina la jornada (`MAÑANA` / `TARDE` / `NOCHE`) según la hora en
 * zona horaria de Colombia (America/Bogota). Fuera del rango 06:00–22:00
 * devuelve cadena vacía.
 *
 * @param {Date|string|number} [entrada=new Date()]
 * @returns {string}
 */
function obtenerJornadaColombia(entrada = new Date()) {
  const p = obtenerPartesFechaColombia(entrada) || obtenerPartesFechaColombia(new Date());
  const minutosTotales = p.horaNum * 60 + p.minutoNum;

  const INICIO_MANANA = 6 * 60;  // 06:00
  const INICIO_TARDE = 13 * 60;  // 13:00
  const INICIO_NOCHE = 18 * 60;  // 18:00
  const FIN_NOCHE = 22 * 60;     // 22:00

  if (minutosTotales >= INICIO_MANANA && minutosTotales < INICIO_TARDE) {
    return 'MAÑANA';
  }
  if (minutosTotales >= INICIO_TARDE && minutosTotales < INICIO_NOCHE) {
    return 'TARDE';
  }
  if (minutosTotales >= INICIO_NOCHE && minutosTotales <= FIN_NOCHE) {
    return 'NOCHE';
  }
  return '';
}

/**
 * Convierte un valor de `<input type="date">` (`YYYY-MM-DD`) y una hora (`HH:mm:ss`)
 * en una cadena ISO 8601 con el offset de Colombia (`-05:00`), sin depender de la
 * zona horaria del dispositivo.
 *
 * @param {string} fechaInput - Fecha en formato `YYYY-MM-DD`
 * @param {string} [hora='00:00:00'] - Hora en formato `HH:mm:ss`
 * @returns {string}
 */
function convertirFechaInputAISOColombia(fechaInput, hora = '00:00:00') {
  if (!fechaInput) return '';
  const [anio, mes, dia] = String(fechaInput).trim().split('-');
  const partesHora = String(hora || '00:00:00').trim().split(':');
  const hh = String(partesHora[0] ?? '00').padStart(2, '0');
  const mm = String(partesHora[1] ?? '00').padStart(2, '0');
  const ss = String(partesHora[2] ?? '00').padStart(2, '0');

  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T${hh}:${mm}:${ss}${OFFSET_COLOMBIA}`;
}

/**
 * Compara dos fechas interpretadas en horario de Colombia.
 * Devuelve un número negativo si `fechaA < fechaB`, `0` si son iguales,
 * o positivo si `fechaA > fechaB`.
 *
 * @param {Date|string|number} fechaA
 * @param {Date|string|number} fechaB
 * @returns {number}
 */
function compararFechasColombia(fechaA, fechaB) {
  const instA = interpretarFechaColombia(fechaA);
  const instB = interpretarFechaColombia(fechaB);
  if (!instA || !instB) return NaN;
  return instA.getTime() - instB.getTime();
}

/**
 * Calcula los minutos transcurridos entre una fecha pasada y una fecha de
 * referencia (por defecto el instante actual), interpretadas en Colombia.
 *
 * @param {Date|string|number} fechaPasada
 * @param {Date|string|number} [fechaReferencia=new Date()]
 * @returns {number}
 */
function calcularMinutosTranscurridosColombia(fechaPasada, fechaReferencia = new Date()) {
  const diferenciaMs = compararFechasColombia(fechaReferencia, fechaPasada);
  if (isNaN(diferenciaMs)) return Infinity;
  return Math.floor(diferenciaMs / (1000 * 60));
}

/**
 * Determina si ya ha transcurrido un periodo de tiempo (en minutos) desde
 * `fechaPasada` y calcula el tiempo restante formateado.
 *
 * @param {Date|string|number} fechaPasada
 * @param {number} minutosLimite
 * @param {Date|string|number} [fechaReferencia=new Date()]
 * @returns {{ transcurrido: boolean, minutosTranscurridos: number, minutosRestantes: number, tiempoRestante: string }}
 */
function haTranscurridoTiempoColombia(fechaPasada, minutosLimite, fechaReferencia = new Date()) {
  const minutosTranscurridos = calcularMinutosTranscurridosColombia(fechaPasada, fechaReferencia);
  const minutosRestantes = Math.max(0, Number(minutosLimite) - minutosTranscurridos);
  const transcurrido = minutosRestantes <= 0;

  return {
    transcurrido,
    minutosTranscurridos,
    minutosRestantes,
    tiempoRestante: transcurrido ? '' : formatearTiempoRestante(minutosRestantes)
  };
}

/**
 * Devuelve la fecha/hora límite en formato ISO Colombia (`-05:00`) restando
 * `horasLimite` horas al instante de referencia.
 *
 * @param {number} horasLimite
 * @param {Date|string|number} [fechaReferencia=new Date()]
 * @returns {string}
 */
function obtenerFechaLimiteColombia(horasLimite, fechaReferencia = new Date()) {
  const ref = interpretarFechaColombia(fechaReferencia) || new Date();
  const limiteMs = ref.getTime() - (Number(horasLimite) * 60 * 60 * 1000);
  return obtenerFechaISOColombia(limiteMs);
}

// ===================================
// 5. UTILIDADES DE EXPORTACIÓN A EXCEL
// ===================================
function convertirFechaASerialExcel(fecha) {
  const p = obtenerPartesFechaColombia(fecha);
  if (!p) return '';
  const utcMs = Date.UTC(p.anioNum, p.mesNum - 1, p.diaNum, p.horaNum, p.minutoNum, p.segundoNum);
  const epochExcelUTC = Date.UTC(1899, 11, 30, 0, 0, 0);
  return (utcMs - epochExcelUTC) / 86400000;
}

function aplicarFormatoExcel(ws, range, columnaFecha = 0, columnaDocumento = 2) {
  for (let row = 1; row <= range.e.r; row++) {
    const fechaCell = XLSX.utils.encode_cell({ r: row, c: columnaFecha });
    if (ws[fechaCell] && row > 0) {
      ws[fechaCell].t = 'n';
      ws[fechaCell].z = 'dd/mm/yyyy';
    }
  }

  for (let row = 1; row <= range.e.r; row++) {
    const docCell = XLSX.utils.encode_cell({ r: row, c: columnaDocumento });
    if (ws[docCell] && row > 0) {
      ws[docCell].t = 'n';
      ws[docCell].z = '0';
    }
  }
}

// ===================================
// 6. RESTRICCIONES DE TIEMPO Y REINICIO POR INACTIVIDAD
// ===================================
function formatearTiempoRestante(minutosRestantes) {
  const minutos = Math.max(1, Math.ceil(minutosRestantes));
  if (minutos >= 60) {
    const horas = Math.floor(minutos / 60);
    const minRestantes = minutos % 60;
    return minRestantes > 0
      ? `${horas} hora${horas > 1 ? 's' : ''} y ${minRestantes} minuto${minRestantes !== 1 ? 's' : ''}`
      : `${horas} hora${horas > 1 ? 's' : ''}`;
  }
  return `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
}

async function verificarRestriccionEnvio(config) {
  const {
    tabla,
    documento,
    horasLimite,
    filtrosExtra = {},
    campoFecha = 'fecha',
    esquema = null,
    construirMensaje = null
  } = config || {};

  if (!tabla || !documento || !horasLimite || horasLimite <= 0) {
    return { puedeRegistrar: true };
  }

  const minutosLimite = horasLimite * 60;

  try {
    const ahora = new Date();
    const fechaLimiteStr = obtenerFechaLimiteColombia(horasLimite, ahora);

    const filtrosEq = [{ field: 'documento', value: documento }];
    for (const [campo, valor] of Object.entries(filtrosExtra)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        filtrosEq.push({ field: campo, value: valor });
      }
    }

    const registroMasReciente = await ConsultasPublicas.consultarUno(tabla, {
      eq: filtrosEq,
      gte: { field: campoFecha, value: fechaLimiteStr },
      order: `${campoFecha}.desc`
    }, esquema);

    if (!registroMasReciente) {
      return { puedeRegistrar: true };
    }

    const valorFecha = registroMasReciente[campoFecha];
    const estadoTiempo = haTranscurridoTiempoColombia(valorFecha, minutosLimite, ahora);

    if (estadoTiempo.transcurrido) {
      return { puedeRegistrar: true };
    }

    const { tiempoRestante, minutosRestantes } = estadoTiempo;
    const mensaje = typeof construirMensaje === 'function'
      ? construirMensaje(tiempoRestante, registroMasReciente)
      : `Ya tienes un registro reciente. Podrás volver a intentarlo en ${tiempoRestante}.`;

    return {
      puedeRegistrar: false,
      tiempoRestante,
      minutosRestantes,
      mensaje,
      registro: registroMasReciente
    };
  } catch (error) {
    console.error(`Error verificando restricción de envío en ${tabla}:`, error);
    return { puedeRegistrar: true };
  }
}

async function verificarRestriccionesEnvio(restricciones) {
  const lista = Array.isArray(restricciones) ? restricciones : [restricciones];
  for (const config of lista) {
    const resultado = await verificarRestriccionEnvio(config);
    if (!resultado.puedeRegistrar) {
      return resultado;
    }
  }
  return { puedeRegistrar: true };
}

// ===================================
// 7. FACULTADES, PROGRAMAS Y SELECTS
// ===================================
let facultadesData = {};

function procesarFacultadesData() {
  facultadesData = {};

  for (const item of datosCache.facultadesCarreras) {
    const facultadNombre = item.nombre;
    if (!facultadNombre) continue;
    const listaProgramas = Array.isArray(item.programas)
      ? item.programas.map(p => p.nombre).filter(Boolean)
      : [];
    facultadesData[facultadNombre] = [...new Set(listaProgramas)];
  }
}

function _llenarOpcionesSelect(select, primeraOpcion, items) {
  select.textContent = '';
  const fragment = document.createDocumentFragment();

  const opcionInicial = document.createElement('option');
  opcionInicial.value = '';
  opcionInicial.textContent = primeraOpcion;
  fragment.appendChild(opcionInicial);

  for (const item of items) {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    fragment.appendChild(option);
  }

  select.appendChild(fragment);
}

function cargarFacultadesCascada(idSelectFacultad, idSelectPrograma) {
  const selectFacultad = document.getElementById(idSelectFacultad);
  if (!selectFacultad) return;

  const facultades = Object.keys(facultadesData).sort((a, b) => a.localeCompare(b));
  _llenarOpcionesSelect(selectFacultad, 'Seleccione una facultad', facultades);

  cargarProgramasCascada(idSelectFacultad, idSelectPrograma);
}

function cargarProgramasCascada(idSelectFacultad, idSelectPrograma) {
  const selectFacultad = document.getElementById(idSelectFacultad);
  const selectPrograma = document.getElementById(idSelectPrograma);
  if (!selectFacultad || !selectPrograma) return;

  const facultad = selectFacultad.value;

  if (!facultad) {
    _llenarOpcionesSelect(selectPrograma, 'Seleccione primero una facultad', []);
    selectPrograma.disabled = true;
    return;
  }

  const programas = [...(facultadesData[facultad] || [])].sort((a, b) => a.localeCompare(b));

  if (programas.length === 0) {
    _llenarOpcionesSelect(selectPrograma, 'No hay programas disponibles para esta facultad', []);
    selectPrograma.disabled = true;
    return;
  }

  _llenarOpcionesSelect(selectPrograma, 'Seleccione un programa', programas);
  selectPrograma.disabled = false;
}

function poblarSelect(selectElement, datos, opciones = {}) {
  if (!selectElement) return;
  const {
    valueKey = null,
    textKey = null,
    primeraOpcion = '',
    ordenar = null,
    opcionExtra = null
  } = opciones;

  selectElement.innerHTML = primeraOpcion ? `<option value="">${primeraOpcion}</option>` : '';

  if (!datos || datos.length === 0) return;

  const datosOrdenados = ordenar ? [...datos].sort(ordenar) : datos;
  const fragment = document.createDocumentFragment();

  for (const item of datosOrdenados) {
    const option = document.createElement('option');

    if (typeof item === 'string') {
      option.value = item;
      option.textContent = item;
    } else {
      option.value = valueKey ? item[valueKey] : item;
      option.textContent = textKey ? item[textKey] : item;
    }

    fragment.appendChild(option);
  }

  if (opcionExtra) {
    const optionExtra = document.createElement('option');
    optionExtra.value = opcionExtra.value;
    optionExtra.textContent = opcionExtra.text;
    if (opcionExtra.style) {
      Object.assign(optionExtra.style, opcionExtra.style);
    }
    fragment.appendChild(optionExtra);
  }

  selectElement.appendChild(fragment);
}

// ===================================
// 8. INTERFAZ DE USUARIO: MENSAJES, MODALES, BOTONES Y NAVEGACIÓN
// ===================================
const temporizadoresMensaje = {};

function mostrarMensaje(arg1, arg2, arg3) {
  let elementId, mensaje, tipo;
  if (arg3 === undefined) {
    elementId = 'mensajeFormulario';
    mensaje = arg1;
    tipo = arg2;
  } else {
    elementId = arg1;
    mensaje = arg2;
    tipo = arg3;
  }

  const elemento = (elementosDOM && elementosDOM[elementId]) || document.getElementById(elementId);
  if (!elemento) return;

  if (temporizadoresMensaje[elementId]) {
    clearTimeout(temporizadoresMensaje[elementId].scroll);
    clearTimeout(temporizadoresMensaje[elementId].limpiar);
  }

  const esElementoMensajeDirecto = elemento.classList.contains('mensaje');

  if (esElementoMensajeDirecto) {
    elemento.textContent = mensaje;
    elemento.className = `mensaje ${tipo}`;
    elemento.style.display = 'block';
  } else {
    elemento.textContent = '';
    const divMensaje = document.createElement('div');
    divMensaje.className = `mensaje ${tipo}`;
    divMensaje.textContent = mensaje;
    elemento.appendChild(divMensaje);

    if (typeof divMensaje.animate === 'function') {
      divMensaje.animate(
        [
          { opacity: 0, transform: 'translateY(-6px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: 250, easing: 'ease-out' }
      );
    }
  }

  temporizadoresMensaje[elementId] = {
    scroll: setTimeout(() => {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100),
    limpiar: setTimeout(() => {
      if (esElementoMensajeDirecto) {
        elemento.style.display = 'none';
      } else {
        elemento.textContent = '';
      }
    }, 10000)
  };
}

function mostrarModalConfirmacion(titulo, mensaje, callbackConfirmar) {
  const modal = document.getElementById('modalConfirmacion');
  if (!modal) return;
  document.getElementById('tituloConfirmacion').textContent = titulo;
  document.getElementById('mensajeConfirmacion').textContent = mensaje;

  modal.style.display = 'flex';
  modal.classList.remove('hidden');

  document.getElementById('btnConfirmarModal').onclick = function () {
    modal.style.display = 'none';
    modal.classList.add('hidden');
    if (callbackConfirmar) callbackConfirmar();
  };

  document.getElementById('btnCancelarModal').onclick = function () {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  };
}

function mostrarConfirmacionCancelar() {
  mostrarModalConfirmacion(
    '¿Seguro que deseas cancelar?',
    'Se perderán todos los datos del formulario que has ingresado.',
    function () {
      window.location.reload();
    }
  );
}

function manejarEstadoBoton(boton, desactivar, textoDesactivado = '', textoOriginal = '') {
  if (!boton) return;
  if (desactivar) {
    boton.disabled = true;
    boton.style.opacity = '0.6';
    boton.style.cursor = 'not-allowed';
    if (textoDesactivado) {
      boton.textContent = textoDesactivado;
    }
  } else {
    boton.disabled = false;
    boton.style.opacity = '1';
    boton.style.cursor = 'pointer';
    if (textoOriginal) {
      boton.textContent = textoOriginal;
    }
  }
}

let pantallaActual = 'pantallaBienvenida';

function mostrarPantalla(id) {
  document.querySelectorAll('.container > div').forEach(div => div.classList.add('hidden'));
  const destino = document.getElementById(id);
  if (destino) destino.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarContenidoFormulario() {
  const pantallaBienvenida = elementosDOM.pantallaBienvenida || document.getElementById('pantallaBienvenida');
  const contenidoFormulario = elementosDOM.contenidoFormulario || document.getElementById('contenidoFormulario');
  if (!pantallaBienvenida || !contenidoFormulario) return;

  pantallaActual = 'contenidoFormulario';
  document.body.classList.remove('welcome-active');

  pantallaBienvenida.style.opacity = '0';
  pantallaBienvenida.style.transition = 'opacity 0.25s ease';

  setTimeout(() => {
    pantallaBienvenida.style.display = 'none';
    contenidoFormulario.classList.remove('hidden');
    contenidoFormulario.style.opacity = '0';
    contenidoFormulario.style.transition = 'opacity 0.25s ease';

    setTimeout(() => {
      contenidoFormulario.style.opacity = '1';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 20);
  }, 250);
}

async function mostrarFormulario() {
  if (document.getElementById('facultad') && document.getElementById('programa')) {
    try {
      await ConsultasPublicas.obtenerFacultadesProgramas();
      cargarFacultadesCascada('facultad', 'programa');
    } catch (err) {
      console.error('Error al cargar facultades:', err);
    }
  }

  const bienvenida = document.getElementById('pantallaBienvenida');
  const formulario = document.getElementById('contenidoFormulario');
  if (!bienvenida || !formulario) return;

  bienvenida.style.opacity = '0';
  bienvenida.style.transition = 'opacity 0.5s ease';

  setTimeout(() => {
    bienvenida.style.display = 'none';
    formulario.classList.remove('hidden');
    formulario.style.opacity = '0';
    formulario.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      formulario.style.opacity = '1';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, 500);
}

function regresarABienvenida() {
  const bienvenida = document.getElementById('pantallaBienvenida');
  const formulario = document.getElementById('contenidoFormulario');
  if (!bienvenida || !formulario) return;

  formulario.style.opacity = '0';
  formulario.style.transition = 'opacity 0.5s ease';

  setTimeout(() => {
    formulario.classList.add('hidden');
    bienvenida.style.display = 'flex';
    bienvenida.style.opacity = '0';
    bienvenida.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      bienvenida.style.opacity = '1';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, 500);
}

function volverInicio() {
  location.reload();
}

function formatearAsteriscosLabels() {
  const labels = document.querySelectorAll('label');

  labels.forEach(label => {
    if (label.textContent.includes('*')) {
      const asteriscos = label.querySelectorAll('span[style*="color: #dc3545"], span.required, span.requerido');
      if (asteriscos.length === 0) {
        const span = document.createElement('span');
        span.style.color = '#dc3545';
        span.style.fontWeight = 'bold';
        span.style.fontSize = '16px';
        span.textContent = '*';
        label.innerHTML = label.innerHTML.replace(/\*/g, span.outerHTML);
      }
    }
  });
}

// Reinicio automático por inactividad / segundo plano (compartido por PMA, PVU, AAA y Visitas)
let tiempoSalida = null;
const MINUTOS_PARA_REINICIAR = 3;
let _reinicioInactividadInicializado = false;

/**
 * Inicializa el reinicio automático del formulario cuando el usuario sale de la
 * página, la deja en segundo plano o cambia de pestaña durante el tiempo límite.
 *
 * @param {number|Object} [opciones=MINUTOS_PARA_REINICIAR] - Minutos de espera (por defecto 3) o configuración `{ minutos, alReiniciar }`.
 */
function inicializarReinicioPorInactividad(opciones = MINUTOS_PARA_REINICIAR) {
  if (_reinicioInactividadInicializado) return;
  _reinicioInactividadInicializado = true;

  const minutosLimite = typeof opciones === 'number'
    ? opciones
    : (Number(opciones?.minutos) || MINUTOS_PARA_REINICIAR);
  const alReiniciar = typeof opciones === 'object' && typeof opciones?.alReiniciar === 'function'
    ? opciones.alReiniciar
    : () => location.reload();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      tiempoSalida = Date.now();
    } else if (tiempoSalida !== null) {
      const minutosAusente = (Date.now() - tiempoSalida) / 60000;
      tiempoSalida = null;
      if (minutosAusente >= minutosLimite) {
        alReiniciar();
      }
    }
  });
}

// ===================================
// 9. BARRA DE CARGA GLOBAL («Obteniendo datos...»)
// ===================================
const MENSAJE_CARGA_DEFECTO = 'Obteniendo datos...';
const _estadoLoaders = new WeakMap();

function _asegurarEstructuraLoader(loader, mensaje) {
  if (!loader || !(loader instanceof Element)) return null;

  if (!loader.classList.contains('loader')) {
    loader.classList.add('loader');
  }

  let texto = loader.querySelector('.loader-texto');
  let pista = loader.querySelector('.loader-pista');
  let barra = loader.querySelector('.loader-barra');

  if (!texto || !pista || !barra) {
    loader.textContent = '';

    texto = document.createElement('span');
    texto.className = 'loader-texto';
    texto.textContent = mensaje || loader.dataset.loaderMensaje || MENSAJE_CARGA_DEFECTO;

    pista = document.createElement('div');
    pista.className = 'loader-pista';

    barra = document.createElement('div');
    barra.className = 'loader-barra';
    pista.appendChild(barra);

    loader.appendChild(texto);
    loader.appendChild(pista);
  } else if (typeof mensaje === 'string' && mensaje.trim() !== '') {
    texto.textContent = mensaje;
  }

  if (typeof mensaje === 'string' && mensaje.trim() !== '') {
    loader.dataset.loaderMensaje = mensaje;
  }

  return { texto, pista, barra };
}

function _detenerAnimacionLoader(loader, reiniciarBarra = true) {
  if (!loader) return;

  const estado = _estadoLoaders.get(loader);
  if (estado) {
    if (estado.rafId) cancelAnimationFrame(estado.rafId);
    if (estado.timeoutInicial) clearTimeout(estado.timeoutInicial);
    if (estado.intervalo) clearInterval(estado.intervalo);
    _estadoLoaders.delete(loader);
  }

  if (reiniciarBarra) {
    const barra = loader.querySelector('.loader-barra');
    if (barra) {
      barra.style.transition = 'none';
      barra.style.width = '0%';
      void barra.offsetWidth;
      barra.style.transition = '';
    }
  }
}

function _iniciarAnimacionLoader(loader, mensaje) {
  if (!loader || !(loader instanceof Element)) return;

  const partes = _asegurarEstructuraLoader(loader, mensaje);
  if (!partes) return;

  _detenerAnimacionLoader(loader, false);

  if (loader.classList.contains('hidden') || (loader.isConnected && loader.closest('.hidden'))) {
    partes.barra.style.width = '0%';
    return;
  }

  const { barra } = partes;

  barra.style.transition = 'none';
  barra.style.width = '0%';
  void barra.offsetWidth;
  barra.style.transition = '';

  let progreso = 18;

  const aplicarPasoInicial = () => {
    if (!loader.isConnected || loader.classList.contains('hidden') || loader.closest('.hidden')) {
      return;
    }
    barra.style.transition = 'none';
    barra.style.width = '0%';
    void barra.offsetWidth;
    barra.style.transition = '';
    barra.style.width = progreso + '%';
  };

  const rafId = requestAnimationFrame(aplicarPasoInicial);
  const timeoutInicial = setTimeout(() => {
    if (!loader.isConnected || loader.classList.contains('hidden') || loader.closest('.hidden')) {
      return;
    }
    if (progreso <= 18) {
      progreso = 32;
      barra.style.width = progreso + '%';
    }
  }, 140);

  const intervalo = setInterval(() => {
    if (!loader.isConnected || loader.classList.contains('hidden') || loader.closest('.hidden')) {
      _detenerAnimacionLoader(loader, false);
      if (loader.dataset.loaderDinamico === 'true' && loader.isConnected && loader.closest('.hidden')) {
        loader.remove();
      }
      return;
    }
    const salto = Math.random() * (progreso < 60 ? 14 : 5) + 3;
    progreso = Math.min(progreso + salto, 92);
    barra.style.width = progreso + '%';
  }, 380);

  _estadoLoaders.set(loader, { intervalo, rafId, timeoutInicial, barra });
}

function _resolverElementoLoader(elementOrId) {
  if (!elementOrId) return null;
  if (elementOrId instanceof Element) return elementOrId;
  if (typeof elementOrId === 'string') {
    if (typeof elementosDOM !== 'undefined' && elementosDOM && elementosDOM[elementOrId]) {
      return elementosDOM[elementOrId];
    }
    return document.getElementById(elementOrId);
  }
  return null;
}

function crearLoader(mensaje = MENSAJE_CARGA_DEFECTO) {
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.dataset.loaderDinamico = 'true';
  _asegurarEstructuraLoader(loader, mensaje);
  _iniciarAnimacionLoader(loader, mensaje);
  return loader;
}

function mostrarCargando(elementOrId, mensaje = MENSAJE_CARGA_DEFECTO) {
  const elemento = _resolverElementoLoader(elementOrId);
  if (!elemento) return null;

  if (typeof elementOrId === 'string' && typeof temporizadoresMensaje !== 'undefined' && temporizadoresMensaje[elementOrId]) {
    clearTimeout(temporizadoresMensaje[elementOrId].scroll);
    clearTimeout(temporizadoresMensaje[elementOrId].limpiar);
    delete temporizadoresMensaje[elementOrId];
  }

  if (elemento.classList.contains('loader')) {
    _asegurarEstructuraLoader(elemento, mensaje);
    elemento.classList.remove('hidden');
    _iniciarAnimacionLoader(elemento, mensaje);
    return elemento;
  }

  elemento.querySelectorAll('.loader').forEach(loaderPrevio => {
    _detenerAnimacionLoader(loaderPrevio, false);
    if (elemento === document.body && loaderPrevio.dataset.loaderDinamico === 'true') {
      loaderPrevio.remove();
    }
  });

  if (elemento !== document.body) {
    elemento.textContent = '';
  }

  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.dataset.loaderDinamico = 'true';
  _asegurarEstructuraLoader(loader, mensaje);
  elemento.appendChild(loader);
  _iniciarAnimacionLoader(loader, mensaje);

  if (elemento !== document.body) {
    setTimeout(() => {
      if (loader.isConnected && !elemento.closest('.hidden')) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  return loader;
}

function ocultarCargando(elementOrId) {
  if (!elementOrId) {
    document.querySelectorAll('.loader').forEach(loader => {
      _detenerAnimacionLoader(loader, true);
      if (loader.dataset.loaderDinamico === 'true') {
        loader.remove();
      } else {
        loader.classList.add('hidden');
      }
    });
    return;
  }

  const elemento = _resolverElementoLoader(elementOrId);
  if (!elemento) return;

  if (elemento.classList.contains('loader')) {
    _detenerAnimacionLoader(elemento, true);
    if (elemento.dataset.loaderDinamico === 'true') {
      elemento.remove();
    } else {
      elemento.classList.add('hidden');
    }
    return;
  }

  elemento.querySelectorAll('.loader').forEach(loader => {
    _detenerAnimacionLoader(loader, true);
    loader.remove();
  });
}

function controlarLoader(elementOrId, mostrar = true, mensaje = MENSAJE_CARGA_DEFECTO) {
  if (mostrar) {
    return mostrarCargando(elementOrId, mensaje);
  }
  ocultarCargando(elementOrId);
  return null;
}

function actualizarMensajeCargando(elementOrId, mensaje = MENSAJE_CARGA_DEFECTO) {
  const elemento = elementOrId ? _resolverElementoLoader(elementOrId) : document.querySelector('.loader:not(.hidden)');
  if (!elemento) return;

  const loader = elemento.classList.contains('loader') ? elemento : elemento.querySelector('.loader');
  if (!loader) return;

  _asegurarEstructuraLoader(loader, mensaje);
}

function _inicializarObservadorLoaders() {
  const procesarLoader = (loader) => {
    if (!loader || !(loader instanceof Element)) return;
    _asegurarEstructuraLoader(loader);
    const visible = loader.isConnected && !loader.classList.contains('hidden') && !loader.closest('.hidden');
    if (visible) {
      if (!_estadoLoaders.has(loader)) {
        _iniciarAnimacionLoader(loader);
      }
    } else {
      _detenerAnimacionLoader(loader, true);
    }
  };

  document.querySelectorAll('.loader').forEach(procesarLoader);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.classList.contains('loader')) {
            procesarLoader(node);
          }
          node.querySelectorAll?.('.loader').forEach(procesarLoader);
        });

        mutation.removedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.classList.contains('loader')) {
            _detenerAnimacionLoader(node, false);
          }
          node.querySelectorAll?.('.loader').forEach(l => _detenerAnimacionLoader(l, false));
        });
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (!(target instanceof Element)) continue;

        if (target.classList.contains('loader')) {
          procesarLoader(target);
        } else {
          target.querySelectorAll?.('.loader').forEach(l => {
            if (target.classList.contains('hidden') && l.dataset.loaderDinamico === 'true') {
              _detenerAnimacionLoader(l, false);
              l.remove();
            } else {
              procesarLoader(l);
            }
          });
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
}

// ===================================
// 10. INICIALIZACIÓN GLOBAL DEL DOM
// ===================================
function _inicializarGlobalDOM() {
  inicializarCacheDOM();
  formatearAsteriscosLabels();
  _inicializarObservadorLoaders();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _inicializarGlobalDOM, { once: true });
} else {
  _inicializarGlobalDOM();
}
