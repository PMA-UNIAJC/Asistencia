import datetime
import io
import re
import openpyxl
import pandas as pd
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

# ============================================================
# CONSTANTES DE NORMALIZACIÓN, ORDEN Y FORMATO DE EXCEL
# ============================================================

TILDES_MAP = str.maketrans('ÁÉÍÓÚáéíóúÑñÜü', 'AEIOUaeiouNnUu')
_REGEX_ESPACIOS = re.compile(r'\s+')

# Orden canónico para las columnas compartidas entre los diferentes módulos.
# Cada archivo conserva únicamente las columnas que necesita, respetando este orden.
ORDEN_COLUMNAS = (
    'FECHA',
    'DIA',
    'HORARIO',
    'SALON',
    'DOCUMENTO',
    'NOMBRE',
    'FACULTAD',
    'PROGRAMA',
    'SEDE',
    'MATERIA',
    'EVALUACION',
    'GRUPO',
    'SEMESTRE',
    'JORNADA',
    'ASIGNATURA',
    'DOCENTE',
    'NOTA',
    'N_PERDIDAS',
    'CELULAR',
    'CORREO_INST',
    'AREA',
    'TEMA',
    'TUTOR',
    'MATRICULADOS',
)

FORMATO_FECHA = 'DD/MM/YYYY'
ANCHO_COLUMNA_DEFAULT = 18

SIN_BORDE = Border(
    left=Side(style=None),
    right=Side(style=None),
    top=Side(style=None),
    bottom=Side(style=None),
)
RELLENO_AMARILLO = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')

COLUMNAS_FECHA = {'FECHA', 'FECHA_ENCUENTRO', 'FECHA DE ASISTENCIA'}

_REGEX_FECHA_DMY = re.compile(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+.*)?$')
_REGEX_FECHA_YMD = re.compile(r'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s].*)?$')


# ============================================================
# VALIDACIÓN, APERTURA E IDENTIFICACIÓN DE HOJAS
# ============================================================

def validar_archivo_xlsx(file_obj):
    """Valida que el archivo cargado tenga extensión .xlsx."""
    nombre = getattr(file_obj, "name", "")
    if nombre and not str(nombre).lower().endswith(".xlsx"):
        raise Exception(
            "Formato no soportado. Para esta versión en Streamlit Cloud solo se aceptan archivos .xlsx."
        )


def abrir_excel(file_obj):
    """Valida la extensión .xlsx y abre el archivo con openpyxl."""
    if isinstance(file_obj, pd.ExcelFile):
        return file_obj
    validar_archivo_xlsx(file_obj)
    return pd.ExcelFile(file_obj, engine='openpyxl')


def buscar_hoja(excel_file, nombre):
    """Devuelve el nombre real de la hoja `nombre` (sin distinguir mayúsculas ni tildes) o None."""
    nombre_norm = normalizar_encabezado(nombre)
    for hoja in excel_file.sheet_names:
        if normalizar_encabezado(hoja) == nombre_norm:
            return hoja
    return None


# Alias de compatibilidad interna
_buscar_hoja = buscar_hoja


def limpiar_nombre_hoja(nombre, nombres_usados=None):
    """Normaliza un nombre de hoja para Excel (máx. 31 caracteres, sin caracteres inválidos ni duplicados)."""
    nombre_limpio = str(nombre)[:31]
    for ch in ('/', '\\', '?', '*', '[', ']', ':'):
        nombre_limpio = nombre_limpio.replace(ch, '_')
    if nombres_usados is None:
        return nombre_limpio
    nombre_original = nombre_limpio
    contador = 1
    while nombre_limpio in nombres_usados:
        nombre_limpio = f"{nombre_original[:27]}_{contador}"
        contador += 1
    nombres_usados.add(nombre_limpio)
    return nombre_limpio


# ============================================================
# NORMALIZACIÓN, DETECCIÓN Y MAPEO DE COLUMNAS Y VALORES
# ============================================================

def normalizar_espacios_celda(valor):
    """Elimina espacios al inicio/final y colapsa espacios múltiples internos en valores de texto."""
    if isinstance(valor, str):
        return _REGEX_ESPACIOS.sub(' ', valor).strip()
    return valor


def normalizar_espacios_df(df):
    """Aplica la normalización de espacios a todas las columnas de texto del DataFrame,
    manteniendo intactos números, fechas, valores nulos y demás tipos no textuales."""
    df = df.copy()
    for col in df.columns:
        if df[col].dtype == object or pd.api.types.is_string_dtype(df[col]):
            df[col] = df[col].map(normalizar_espacios_celda)
    return df


def normalizar_encabezado(nombre):
    """Normaliza un encabezado: sin espacios extremos, en mayúsculas y sin tildes."""
    return _REGEX_ESPACIOS.sub(' ', str(nombre).strip()).upper().translate(TILDES_MAP)


def normalizar_encabezados_df(df):
    """Devuelve una copia del DataFrame con los nombres de sus columnas normalizados."""
    df = df.copy()
    df.columns = [normalizar_encabezado(c) for c in df.columns]
    return df


def encontrar_columna(df, nombres_posibles):
    """Primera columna de `df` que coincide con algún alias (sin distinguir mayúsculas ni tildes)."""
    columnas = [(col, normalizar_encabezado(col)) for col in df.columns]
    for nombre in nombres_posibles:
        nombre_norm = normalizar_encabezado(nombre)
        for col, col_norm in columnas:
            if col_norm == nombre_norm:
                return col
    return None


def ordenar_columnas(df, orden=ORDEN_COLUMNAS):
    """Reordena las columnas de `df` según `orden`, manteniendo al final cualquier columna
    adicional en su orden relativo original."""
    if df is None or df.empty and len(df.columns) == 0:
        return df
    mapa_norm_a_real = {}
    for col in df.columns:
        col_norm = normalizar_encabezado(col)
        if col_norm not in mapa_norm_a_real:
            mapa_norm_a_real[col_norm] = col

    columnas_ordenadas = []
    usadas = set()
    for col_canon in orden:
        col_norm = normalizar_encabezado(col_canon)
        if col_norm in mapa_norm_a_real:
            col_real = mapa_norm_a_real[col_norm]
            if col_real not in usadas:
                columnas_ordenadas.append(col_real)
                usadas.add(col_real)

    columnas_extra = [col for col in df.columns if col not in usadas]
    return df[columnas_ordenadas + columnas_extra]


def mapear_columnas(df_original, mapeo, ordenar=True, orden=ORDEN_COLUMNAS):
    """Construye un DataFrame con los nombres estándar de `mapeo`, tomados de la primera
    columna que coincida, y ordena las columnas bajo el criterio común."""
    df = pd.DataFrame()
    for col_norm, nombres in mapeo.items():
        col_enc = encontrar_columna(df_original, nombres)
        if col_enc is not None:
            df[col_norm] = df_original[col_enc].copy()
    if ordenar and not df.empty or len(df.columns) > 0:
        df = ordenar_columnas(df, orden=orden)
    return df


def normalizar_nota(nota):
    """Convierte una nota a float (aceptando coma o punto decimal)."""
    if pd.isna(nota):
        return nota
    try:
        return float(str(nota).replace(',', '.'))
    except Exception:
        return nota


def convertir_a_fecha(valor):
    """Convierte un valor (date, datetime, Timestamp, serial de Excel o texto) en `datetime.date`
    para que Excel lo reconozca como fecha nativa y pueda formatearse como DD/MM/AAAA."""
    if valor is None or isinstance(valor, bool):
        return None
    if isinstance(valor, pd.Timestamp):
        return None if pd.isna(valor) else valor.date()
    if isinstance(valor, datetime.datetime):
        return valor.date()
    if isinstance(valor, datetime.date):
        return valor
    try:
        if pd.isna(valor):
            return None
    except Exception:
        pass

    if isinstance(valor, (int, float)):
        try:
            dias = int(float(valor))
            if 1 <= dias <= 100000:
                return datetime.date(1899, 12, 30) + datetime.timedelta(days=dias)
        except Exception:
            return None

    texto = str(valor).strip()
    if not texto or texto.upper() in ('NAN', 'NAT', 'NONE', 'NULL'):
        return None

    m_dmy = _REGEX_FECHA_DMY.match(texto)
    if m_dmy:
        d, m, y = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
        if d <= 12 and m > 12:
            d, m = m, d
        try:
            return datetime.date(y, m, d)
        except ValueError:
            pass

    m_ymd = _REGEX_FECHA_YMD.match(texto)
    if m_ymd:
        y, m, d = int(m_ymd.group(1)), int(m_ymd.group(2)), int(m_ymd.group(3))
        try:
            return datetime.date(y, m, d)
        except ValueError:
            pass

    if re.match(r'^\d+(?:\.\d+)?$', texto):
        try:
            dias = int(float(texto))
            if 1 <= dias <= 100000:
                return datetime.date(1899, 12, 30) + datetime.timedelta(days=dias)
        except Exception:
            pass

    ts = pd.to_datetime(texto, dayfirst=True, errors='coerce')
    if not pd.isna(ts):
        return ts.date()
    return None


def normalizar_columna_fecha(serie):
    """Normaliza una serie de pandas para que todos sus valores válidos sean objetos `datetime.date`."""
    return serie.map(convertir_a_fecha)


# ============================================================
# LECTURA DE ARCHIVOS Y HOJAS EXCEL
# ============================================================

def leer_hoja_excel(
    excel_file,
    hoja,
    filas_header=(0,),
    columnas_clave=None,
    min_coincidencias=1,
    dtype=None,
    normalizar_headers=False,
):
    """Lee una hoja de un `pd.ExcelFile` probando las filas candidatas en `filas_header`
    hasta hallar al menos `min_coincidencias` columnas de `columnas_clave`."""
    claves_norm = {normalizar_encabezado(c) for c in columnas_clave} if columnas_clave else None
    df_seleccionado = None

    for header_row in filas_header:
        df_temp = pd.read_excel(excel_file, sheet_name=hoja, header=header_row, dtype=dtype)
        if normalizar_headers:
            df_temp = normalizar_encabezados_df(df_temp)

        if not claves_norm:
            df_seleccionado = df_temp
            break

        coincidencias = sum(normalizar_encabezado(c) in claves_norm for c in df_temp.columns)
        if coincidencias >= min_coincidencias:
            df_seleccionado = df_temp
            break

        if df_seleccionado is None and min_coincidencias <= 1:
            df_seleccionado = df_temp

    if df_seleccionado is None:
        return None
    return normalizar_espacios_df(df_seleccionado)


def leer_excel(file_obj, nombre_hoja=None, filas_header=(0,), columnas_clave=None, dtype=None):
    """Lee `nombre_hoja` (obligatoria si se indica) o, si no, la hoja ORIGINAL o la primera;
    detecta la fila de encabezado entre `filas_header` y normaliza los espacios de texto."""
    try:
        excel_file = abrir_excel(file_obj)
        if nombre_hoja:
            hoja = buscar_hoja(excel_file, nombre_hoja)
            if hoja is None:
                raise Exception(f"No se encontró la hoja '{nombre_hoja}' en el archivo.")
        else:
            hoja = buscar_hoja(excel_file, 'ORIGINAL') or excel_file.sheet_names[0]

        return leer_hoja_excel(
            excel_file,
            hoja=hoja,
            filas_header=filas_header,
            columnas_clave=columnas_clave,
            min_coincidencias=1,
            dtype=dtype,
            normalizar_headers=False,
        )
    except Exception as e:
        raise Exception(f"Error al leer el archivo Excel: {str(e)}")


def leer_multiples_hojas(file_obj, nombres_hojas, dtype=None):
    """Lee y concatena las hojas de `nombres_hojas` presentes en el archivo Excel."""
    try:
        excel_file = abrir_excel(file_obj)
        dfs = []
        for nombre_hoja in nombres_hojas:
            hoja = buscar_hoja(excel_file, nombre_hoja)
            if hoja is not None:
                dfs.append(pd.read_excel(excel_file, sheet_name=hoja, dtype=dtype))
        if not dfs:
            lista = " ni ".join(nombres_hojas)
            raise Exception(f"No se encontraron las hojas {lista} en el archivo.")
        return normalizar_espacios_df(pd.concat(dfs, ignore_index=True))
    except Exception as e:
        raise Exception(f"Error al leer el archivo: {str(e)}")


# ============================================================
# FORMATO Y ESCRITURA DE ARCHIVOS EXCEL
# ============================================================

def _a_numero(cell, texto):
    """Convierte el contenido de una celda a valor numérico entero con formato '0'."""
    try:
        texto_limpio = str(texto).strip().replace(',', '.')
        if not texto_limpio:
            return
        valor_float = float(texto_limpio)
        cell.value = int(valor_float) if valor_float.is_integer() else valor_float
        cell.number_format = '0'
    except Exception:
        pass


def _a_fecha(cell, formato=FORMATO_FECHA):
    """Convierte el valor de una celda en `datetime.date` de Excel y le aplica el formato DD/MM/AAAA."""
    if cell.value is None:
        return
    fecha = convertir_a_fecha(cell.value)
    if fecha is not None:
        cell.value = fecha
        cell.number_format = formato
        cell.alignment = Alignment(horizontal='center', vertical='center')


def aplicar_formato_encabezado(sheet, fila_encabezado=1, col_inicio=1, quitar_bordes=False):
    """Aplica negrita y centrado a los encabezados y devuelve el mapa `{COLUMNA: indice}`."""
    max_col = sheet.max_column
    columnas = {}
    for col in range(col_inicio, max_col + 1):
        cell = sheet.cell(row=fila_encabezado, column=col)
        if cell.value is not None:
            columnas[normalizar_encabezado(cell.value)] = col
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        if quitar_bordes:
            cell.border = SIN_BORDE
    return columnas


def configurar_filtro(sheet, fila_encabezado=1, col_inicio=1):
    """Configura el autofiltro sobre el rango de datos de la hoja."""
    max_row, max_col = sheet.max_row, sheet.max_column
    if max_col >= col_inicio and max_row >= fila_encabezado:
        sheet.auto_filter.ref = (
            f'{get_column_letter(col_inicio)}{fila_encabezado}:'
            f'{get_column_letter(max_col)}{max_row}'
        )


def configurar_anchos_columnas(sheet, col_inicio=1, ancho=ANCHO_COLUMNA_DEFAULT, anchos_especificos=None):
    """Configura el ancho de las columnas de la hoja."""
    max_col = sheet.max_column
    for col in range(col_inicio, max_col + 1):
        letra = get_column_letter(col)
        sheet.column_dimensions[letra].width = ancho
    if anchos_especificos:
        for letra_o_col, ancho_col in anchos_especificos.items():
            letra = get_column_letter(letra_o_col) if isinstance(letra_o_col, int) else str(letra_o_col)
            sheet.column_dimensions[letra].width = ancho_col


def formatear_fechas_hoja(sheet, columnas, fila_encabezado=1, formato=FORMATO_FECHA):
    """Aplica el formato de fecha DD/MM/AAAA a todas las columnas de fecha de la hoja."""
    max_row = sheet.max_row
    for nombre_col, col_idx in columnas.items():
        if nombre_col in COLUMNAS_FECHA or nombre_col.startswith('FECHA'):
            for r in range(fila_encabezado + 1, max_row + 1):
                _a_fecha(sheet.cell(row=r, column=col_idx), formato=formato)


def aplicar_formato_celdas(sheet, columnas, fila_encabezado=1):
    """Aplica formatos generales a las celdas según el tipo de columna (fechas, números, texto, alineación)."""
    max_row = sheet.max_row

    def celdas(nombre):
        col_norm = normalizar_encabezado(nombre)
        if col_norm not in columnas:
            return []
        return [sheet.cell(row=r, column=columnas[col_norm]) for r in range(fila_encabezado + 1, max_row + 1)]

    formatear_fechas_hoja(sheet, columnas, fila_encabezado=fila_encabezado, formato=FORMATO_FECHA)

    for cell in celdas('DOCUMENTO'):
        if cell.value is not None:
            _a_numero(cell, str(cell.value))
    for cell in celdas('CELULAR'):
        if cell.value is not None:
            _a_numero(cell, re.sub(r'[ \-()]', '', str(cell.value)))
    for cell in celdas('MATRICULADOS'):
        if cell.value is not None:
            _a_numero(cell, str(cell.value))
    for cell in celdas('GRUPO'):
        if cell.value is not None:
            cell.value = str(cell.value).strip()
            cell.number_format = '@'
            cell.alignment = Alignment(horizontal='left', vertical='center')
    for cell in celdas('N_PERDIDAS'):
        if cell.value is not None:
            _a_numero(cell, str(cell.value))
        cell.alignment = Alignment(horizontal='center', vertical='center')


def aplicar_formato(
    workbook,
    nombre_hoja,
    fila_encabezado=1,
    col_inicio=1,
    quitar_bordes=False,
    ancho_columna=ANCHO_COLUMNA_DEFAULT,
):
    """Formato común: encabezado en negrita y centrado, autofiltro, fechas en DD/MM/AAAA,
    DOCUMENTO y CELULAR numéricos sin decimales, GRUPO como texto, N_PERDIDAS centrado y ancho 18."""
    if nombre_hoja not in workbook.sheetnames:
        return
    sheet = workbook[nombre_hoja]
    columnas = aplicar_formato_encabezado(
        sheet,
        fila_encabezado=fila_encabezado,
        col_inicio=col_inicio,
        quitar_bordes=quitar_bordes,
    )
    configurar_filtro(sheet, fila_encabezado=fila_encabezado, col_inicio=col_inicio)
    aplicar_formato_celdas(sheet, columnas, fila_encabezado=fila_encabezado)
    configurar_anchos_columnas(sheet, col_inicio=col_inicio, ancho=ancho_columna)


def insertar_titulo_combinado(sheet, titulo_encabezado, fila_inicio=2, fila_fin=3, col_inicio=2, tamano=20):
    """Combina las celdas del bloque de título y aplica fuente en negrita centrada."""
    if sheet.max_column < col_inicio:
        return
    letra_inicio = get_column_letter(col_inicio)
    letra_fin = get_column_letter(sheet.max_column)
    sheet.merge_cells(f'{letra_inicio}{fila_inicio}:{letra_fin}{fila_fin}')
    celda = sheet[f'{letra_inicio}{fila_inicio}']
    celda.value = titulo_encabezado
    celda.font = Font(bold=True, size=tamano)
    celda.alignment = Alignment(horizontal='center', vertical='center')


def resaltar_filas(workbook, nombre_hoja, flags_filas, fill=RELLENO_AMARILLO, fila_encabezado=1):
    """Resalta con `fill` las filas de `nombre_hoja` cuyo flag booleano en `flags_filas` sea True."""
    if nombre_hoja not in workbook.sheetnames:
        return
    sheet = workbook[nombre_hoja]
    for idx, resaltar in enumerate(flags_filas):
        if resaltar:
            fila_excel = idx + fila_encabezado + 1
            for col in range(1, sheet.max_column + 1):
                sheet.cell(row=fila_excel, column=col).fill = fill


# ============================================================
# GENERACIÓN Y EXPORTACIÓN DE LIBROS EXCEL
# ============================================================

def _preparar_df_para_excel(df, ordenar=True):
    """Prepara una copia del DataFrame antes de escribirlo en Excel: ordena sus columnas
    bajo el criterio común y convierte columnas de fecha en `datetime.date`."""
    if df is None:
        return pd.DataFrame()
    df_prep = ordenar_columnas(df.copy()) if ordenar else df.copy()
    for col in df_prep.columns:
        col_norm = normalizar_encabezado(col)
        if col_norm in COLUMNAS_FECHA or col_norm.startswith('FECHA'):
            df_prep[col] = normalizar_columna_fecha(df_prep[col])
    return df_prep


def generar_libro_excel(hojas, formatear=None, ordenar=True, **opciones):
    """Genera y devuelve un `openpyxl.Workbook` a partir de `{hoja: DataFrame}` (o un DataFrame único),
    aplicando `formatear(workbook)` o el formato común en cada hoja."""
    if isinstance(hojas, pd.DataFrame):
        hojas = {'GENERAL': hojas}

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        for nombre, df in hojas.items():
            df_prep = _preparar_df_para_excel(df, ordenar=ordenar)
            df_prep.to_excel(writer, sheet_name=nombre, index=False, **opciones)

    buffer.seek(0)
    workbook = openpyxl.load_workbook(buffer)
    if formatear is None:
        for nombre in hojas:
            aplicar_formato(workbook, nombre)
    else:
        formatear(workbook)
    return workbook


def exportar_workbook_bytes(workbook):
    """Exporta un `openpyxl.Workbook` en formato `bytes` descargable."""
    salida = io.BytesIO()
    workbook.save(salida)
    return salida.getvalue()


def exportar_libro(hojas, formatear=None, **opciones):
    """Escribe `{hoja: DataFrame}` con pandas, aplica formato con openpyxl y devuelve los bytes del .xlsx."""
    workbook = generar_libro_excel(hojas, formatear=formatear, **opciones)
    return exportar_workbook_bytes(workbook)


def exportar_excel(df, nombre_hoja='GENERAL', formatear=None, **opciones):
    """Genera y exporta un archivo Excel de una sola hoja a partir de un DataFrame."""
    return exportar_libro({nombre_hoja: df}, formatear=formatear, **opciones)
