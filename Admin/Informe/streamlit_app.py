import io
import os
import re
import sys
import time
from functools import lru_cache
import pandas as pd
import streamlit as st

_APP_DIR = os.path.dirname(os.path.abspath(__file__))
if _APP_DIR not in sys.path:
    sys.path.insert(0, _APP_DIR)

from excel import (
    TILDES_MAP,
    ORDEN_COLUMNAS,
    FORMATO_FECHA,
    ANCHO_COLUMNA_DEFAULT,
    SIN_BORDE,
    RELLENO_AMARILLO,
    COLUMNAS_FECHA,
    validar_archivo_xlsx,
    abrir_excel,
    buscar_hoja,
    _buscar_hoja,
    limpiar_nombre_hoja,
    normalizar_espacios_celda,
    normalizar_espacios_df,
    normalizar_encabezado,
    normalizar_encabezados_df,
    encontrar_columna,
    ordenar_columnas,
    mapear_columnas,
    normalizar_nota,
    convertir_a_fecha,
    normalizar_columna_fecha,
    leer_hoja_excel,
    leer_excel,
    leer_multiples_hojas,
    _a_numero,
    _a_fecha,
    aplicar_formato_encabezado,
    configurar_filtro,
    configurar_anchos_columnas,
    formatear_fechas_hoja,
    aplicar_formato_celdas,
    aplicar_formato,
    insertar_titulo_combinado,
    resaltar_filas,
    generar_libro_excel,
    exportar_workbook_bytes,
    exportar_libro,
    exportar_excel,
)
from styles import ESTILOS_CSS, aplicar_estilos
import supabase as _supabase_mod
from supabase import (
    SUPABASE_URL_DEFAULT,
    SUPABASE_KEY_DEFAULT,
    _ultimo_fetch_programas_ts,
    _obtener_config_supabase,
    _consultar_tabla_supabase,
    construir_relacion_programa_facultad,
    _cargar_programa_a_facultad_cached,
    obtener_programa_a_facultad,
    mat_obtener_facultad_de_programa,
)
from interfaz import (
    MIME_XLSX,
    BADGE_CALENDARIO_A,
    BADGE_CALENDARIO_B,
    BADGE_CALENDARIO_C,
    HELP_CALENDARIO_A,
    HELP_CALENDARIO_B,
    HELP_CALENDARIO_C,
    CALENDARIOS,
    configurar_pagina,
    _render_filtros_calendario,
    _mostrar_aviso_subida,
    renderizar_interfaz,
)

# ============================================================
# CONFIGURACIÓN DE PÁGINA Y ESTILOS
# ============================================================
configurar_pagina()
aplicar_estilos()


# ============================================================
# ==================  UTILIDADES GLOBALES  ===================
# ============================================================

PATRONES_SEMESTRE = {
    'PRIMERO': [
        r'^B1(?!00)', r'^BS1(?!00)', r'^SB1(?!00)',
        r'^BR1(?!00)', r'^BRS1(?!00)', r'^1(?!0|1)',
        r'^C1(?!00)', r'^SC1(?!00)', r'^LB1(?!00)',
        r'^SBR1(?!00)', r'^NLB1(?!00)', r'^SRB1(?!00)'
    ],
    'SEGUNDO': [
        r'^BS2', r'^SB2', r'^B2', r'^S2', r'^SR2', r'^2',
        r'^NL2', r'^L2'
    ],
    'TERCERO': [
        r'^BS3', r'^SB3', r'^B3', r'^S3', r'^3',
        r'^NL3', r'^L3'
    ]
}

PATRONES_CALENDARIO = {
    'A': [
        r'^BS2', r'^SB2', r'^B2', r'^S2', r'^SR2', r'^2',
        r'^BS3', r'^SB3', r'^B3', r'^S3', r'^3',
        r'^NL2', r'^L2', r'^NL3', r'^L3'
    ],
    'B': [
        r'^B1(?!00)', r'^BS1(?!00)', r'^SB1(?!00)',
        r'^BR1(?!00)', r'^BRS1(?!00)', r'^1(?!0|1)',
        r'^LB1(?!00)', r'^SBR1(?!00)', r'^NLB1(?!00)', r'^SRB1(?!00)'
    ],
    'C': [
        r'^C1(?!00)', r'^SC1(?!00)'
    ]
}

_REGEX_SEMESTRE = {k: re.compile('|'.join(v)) for k, v in PATRONES_SEMESTRE.items()}
_REGEX_CALENDARIO = {k: re.compile('|'.join(v)) for k, v in PATRONES_CALENDARIO.items()}

MATERIAS_COMUNICACION = {
    'COMUNICACION Y LENGUAJE', 'COMUNICACION Y LENGUAJE I', 'COMUNICACION Y LENGUAJE II',
    'COMUNICACION', 'COMUNICACION I', 'COMUNICACION II',
    'SEMINARIO DE COMUNICACION', 'SEMINARIO DE COMUNICACION I', 'SEMINARIO DE COMUNICACION II'
}
MATERIAS_MATEMATICAS = {
    'ALGEBRA LINEAL', 'MATEMATICAS', 'MATEMATICAS I', 'MATEMATICAS II', 'MATEMATICAS III',
    'MATEMATICAS FUNDAMENTAL', 'MATEMATICAS FUNDAMENTALES', 'MATEMATICA FUNDAMENTAL',
    'MATEMATICAS BASICAS', 'LOGICA Y RAZONAMIENTO', 'CALCULO INTEGRAL', 'CALCULO DIFERENCIAL', 'CALCULO'
}


def _normalizar_grupo(grupo):
    return '' if pd.isna(grupo) else str(grupo).strip().upper()


def determinar_semestre(grupo):
    g = _normalizar_grupo(grupo)
    if g:
        for semestre, regex in _REGEX_SEMESTRE.items():
            if regex.match(g):
                return semestre
    return None


def filtrar_grupo(grupo, calendario_a=True, calendario_b=True, calendario_c=True):
    g = _normalizar_grupo(grupo)
    if not g:
        return False
    activos = {'A': calendario_a, 'B': calendario_b, 'C': calendario_c}
    return any(activo and _REGEX_CALENDARIO[cal].match(g) for cal, activo in activos.items())


def filtrar_por_calendario(df, calendario_a=True, calendario_b=True, calendario_c=True):
    """Conserva las filas cuyo GRUPO pertenece a alguno de los calendarios marcados."""
    if 'GRUPO' not in df.columns or not (calendario_a or calendario_b or calendario_c):
        return df
    mask = df['GRUPO'].apply(lambda g: filtrar_grupo(g, calendario_a, calendario_b, calendario_c))
    return df[mask]


def quitar_sufijo_programa(serie):
    """'PROGRAMA - 123' -> 'PROGRAMA' (elimina desde ' - ' en adelante)."""
    return serie.apply(lambda x: str(x).split(' - ')[0].strip() if pd.notna(x) else x)


def filtrar_por_materias(df, materias):
    if 'MATERIA' not in df.columns:
        return df.head(0)
    materia = df['MATERIA'].astype(str).str.upper().str.strip().str.translate(TILDES_MAP)
    return df[materia.isin(materias)]


# ============================================================
# ==================  MÓDULO 1: FACULTADES  ==================
# ============================================================

MAPEO_COLUMNAS_FAC = {
    'DOCUMENTO': ['DOC', 'DOCUM', 'DOCUMENTO', 'PEGE_DOCUMENTOIDENTIDAD'],
    'NOMBRE': ['NOMBRE', 'NOM', 'ESTUDIANTE'],
    'FACULTAD': ['FACULTAD'],
    'PROGRAMA': ['PROGRAMA', 'PROG', 'PROG_NOMBRE'],
    'MATERIA': ['MATERIA'],
    'EVALUACION': ['EVALUACION'],
    'GRUPO': ['GRUPO'],
    'SEMESTRE': ['SEM', 'SEMESTRE'],
    'NOTA': ['NOTA'],
    'N_PERDIDAS': ['N_PERDIDAS'],
}
COLUMNAS_CLAVE_FAC = {
    'DOCUMENTO', 'NOMBRE', 'PROGRAMA', 'FACULTAD', 'MATERIA', 'NOTA',
    'DOC', 'DOCUM', 'PEGE_DOCUMENTOIDENTIDAD', 'PROG', 'PROG_NOMBRE',
}
COLUMNAS_DEDUP_FAC = ['DOCUMENTO', 'PROGRAMA', 'MATERIA', 'GRUPO', 'NOTA']
COLUMNAS_HOJA_FAC = [
    'DOCUMENTO', 'NOMBRE', 'PROGRAMA', 'MATERIA', 'GRUPO', 'SEMESTRE', 'NOTA', 'N_PERDIDAS'
]
COLUMNAS_INFORME_GENERAL = [
    'DOCUMENTO', 'NOMBRE', 'FACULTAD', 'PROGRAMA', 'SEDE',
    'MATERIA', 'EVALUACION', 'GRUPO', 'SEMESTRE', 'NOTA', 'N_PERDIDAS',
]

CORRECCIONES_ORTOGRAFICAS = {
    'ADMINISTRACION': 'ADMINISTRACIÓN',
    'ALGEBRA': 'ÁLGEBRA',
    'ANATOMIA': 'ANATOMÍA',
    'AUDITORIA': 'AUDITORÍA',
    'BASICAS': 'BÁSICAS',
    'BIOLOGIA': 'BIOLOGÍA',
    'CALCULO': 'CÁLCULO',
    'CIUDADANIA': 'CIUDADANÍA',
    'COMUNICACION': 'COMUNICACIÓN',
    'CONSTITUCION': 'CONSTITUCIÓN',
    'CONTADURIA': 'CONTADURÍA',
    'ECONOMIA': 'ECONOMÍA',
    'ECOLOGIA': 'ECOLOGÍA',
    'EDUCACION': 'EDUCACIÓN',
    'ELECTRONICA': 'ELECTRÓNICA',
    'ESTADISTICA': 'ESTADÍSTICA',
    'ETICA': 'ÉTICA',
    'FISICA': 'FÍSICA',
    'FISIOLOGIA': 'FISIOLOGÍA',
    'GESTION': 'GESTIÓN',
    'INFORMACION': 'INFORMACIÓN',
    'INGENIERIA': 'INGENIERÍA',
    'INGENIERIAS': 'INGENIERÍA',
    'LEGISLACION': 'LEGISLACIÓN',
    'LOGICA': 'LÓGICA',
    'MATEMATICA': 'MATEMÁTICA',
    'MATEMATICAS': 'MATEMÁTICAS',
    'MECATRONICA': 'MECATRÓNICA',
    'ORGANIZACION': 'ORGANIZACIÓN',
    'PLANEACION': 'PLANEACIÓN',
    'POLITICA': 'POLÍTICA',
    'PRODUCCION': 'PRODUCCIÓN',
    'QUIMICA': 'QUÍMICA',
    'SOCIOLOGIA': 'SOCIOLOGÍA',
    'EVALUACION': 'EVALUACIÓN',
    'TECNOLOGIA': 'TECNOLOGÍA',
    'TEORIA': 'TEORÍA',
}
_REGEX_PREFIJO_FACULTAD = re.compile(r'(?i)^FACULTAD\s+DE\s+')
_REGEX_CORRECCIONES = [
    (re.compile(r'\b' + sin_tilde + r'\b', re.IGNORECASE), con_tilde)
    for sin_tilde, con_tilde in CORRECCIONES_ORTOGRAFICAS.items()
]


def fac_leer_excel(file_obj):
    """Hoja ORIGINAL (o la primera), con el encabezado en la fila 2 o, si no, en la fila 1."""
    return leer_excel(file_obj, filas_header=(1, 0), columnas_clave=COLUMNAS_CLAVE_FAC)


def fac_aplicar_filtros(df, calendario_a, calendario_b, calendario_c):
    """Reprobados (nota 0.0 a 2.9), filtro por calendario y SEMESTRE deducido del GRUPO."""
    if 'NOTA' in df.columns:
        df = df[(df['NOTA'] >= 0.0) & (df['NOTA'] <= 2.9)]
    df = filtrar_por_calendario(df, calendario_a, calendario_b, calendario_c).copy()
    if 'GRUPO' in df.columns:
        df['SEMESTRE'] = df['GRUPO'].apply(determinar_semestre)
    return df


def fac_calcular_n_perdidas(df):
    """N_PERDIDAS = cantidad de registros (materias perdidas) de cada DOCUMENTO."""
    if 'DOCUMENTO' not in df.columns:
        return df
    df = df.copy()
    conteo = df['DOCUMENTO'].value_counts().to_dict()
    df['N_PERDIDAS'] = df['DOCUMENTO'].map(conteo).fillna(0).astype(int)
    return df


@lru_cache(maxsize=8192)
def _corregir_ortografia_texto(valor):
    resultado = _REGEX_PREFIJO_FACULTAD.sub('', valor).strip()
    for regex, con_tilde in _REGEX_CORRECCIONES:
        resultado = regex.sub(con_tilde, resultado)
    return resultado


def fac_corregir_ortografia_celda(valor):
    """Quita el prefijo 'FACULTAD DE' y agrega tildes. Con caché: los textos se repiten mucho."""
    if valor is None or not isinstance(valor, str):
        return valor
    return _corregir_ortografia_texto(valor)


def fac_corregir_ortografia_df(df):
    """Aplica la corrección ortográfica a todas las columnas de texto del DataFrame en memoria."""
    df = df.copy()
    for col in df.columns:
        if df[col].dtype == object or pd.api.types.is_string_dtype(df[col]):
            df[col] = df[col].map(fac_corregir_ortografia_celda)
    return df


def fac_corregir_ortografia_hoja(sheet, fila_inicio=1):
    for row in sheet.iter_rows(min_row=fila_inicio):
        for cell in row:
            if isinstance(cell.value, str):
                cell.value = fac_corregir_ortografia_celda(cell.value)


def fac_aplicar_formato_especial(workbook, nombre_hoja, titulo_encabezado):
    """Hoja con los datos desde B4: corrige ortografía, título combinado en B2:?3 y formato común."""
    if nombre_hoja not in workbook.sheetnames:
        return
    sheet = workbook[nombre_hoja]
    fac_corregir_ortografia_hoja(sheet)
    if sheet.max_row < 4:
        return
    insertar_titulo_combinado(sheet, titulo_encabezado, fila_inicio=2, fila_fin=3, col_inicio=2, tamano=20)
    aplicar_formato(workbook, nombre_hoja, fila_encabezado=4, col_inicio=2, quitar_bordes=True)


fac_limpiar_nombre_hoja = limpiar_nombre_hoja


def fac_generar_informe_general(hojas_informe):
    """Construye en memoria el INFORME GENERAL consolidando todas las facultades,
    recalculando N_PERDIDAS sobre el total, corrigiendo ortografía y generando las
    hojas GENERAL, COMUNICACION y MATEMATICAS."""
    df_informe = fac_calcular_n_perdidas(pd.concat(hojas_informe, ignore_index=True))
    cols_presentes = [c for c in COLUMNAS_INFORME_GENERAL if c in df_informe.columns]
    df_general = ordenar_columnas(fac_corregir_ortografia_df(df_informe[cols_presentes]))

    df_comunicacion = filtrar_por_materias(df_general, MATERIAS_COMUNICACION)
    df_matematicas = filtrar_por_materias(df_general, MATERIAS_MATEMATICAS)
    vacio = df_general.head(0)
    hojas = {
        'GENERAL': df_general,
        'COMUNICACION': df_comunicacion if not df_comunicacion.empty else vacio,
        'MATEMATICAS': df_matematicas if not df_matematicas.empty else vacio,
    }

    def formatear_informe(workbook):
        for nombre_hoja in hojas:
            fac_corregir_ortografia_hoja(workbook[nombre_hoja], fila_inicio=2)
            aplicar_formato(workbook, nombre_hoja, quitar_bordes=True)

    return exportar_libro(hojas, formatear_informe)


def fac_procesar_archivo(file_obj1, file_obj2, calendario_a, calendario_b, calendario_c):
    """Procesa los archivos de facultades y retorna un dict {nombre_archivo: bytes}
    que incluye cada facultad y el INFORME GENERAL.xlsx completo."""
    df_original = fac_leer_excel(file_obj1)
    if file_obj2 is not None:
        df_original = pd.concat([df_original, fac_leer_excel(file_obj2)], ignore_index=True)

    df_general = mapear_columnas(df_original, MAPEO_COLUMNAS_FAC)
    if 'SEMESTRE' not in df_general.columns:
        df_general['SEMESTRE'] = None
    if 'NOTA' in df_general.columns:
        df_general['NOTA'] = df_general['NOTA'].apply(normalizar_nota)
    if df_general.empty:
        raise Exception("No se pudieron mapear las columnas del archivo original.")
    if all(col in df_general.columns for col in COLUMNAS_DEDUP_FAC):
        df_general = df_general.drop_duplicates(subset=COLUMNAS_DEDUP_FAC, keep='first').reset_index(drop=True)
    if 'FACULTAD' not in df_general.columns:
        raise Exception("No se encontró la columna FACULTAD en el archivo.")
    if 'PROGRAMA' in df_general.columns:
        df_general['PROGRAMA'] = quitar_sufijo_programa(df_general['PROGRAMA'])

    facultades = df_general['FACULTAD'].dropna().unique()
    if len(facultades) == 0:
        raise Exception("No se encontraron facultades en el archivo.")

    archivos_resultado = {}
    hojas_informe = []
    for facultad in facultades:
        df_facultad = fac_aplicar_filtros(
            df_general[df_general['FACULTAD'] == facultad],
            calendario_a, calendario_b, calendario_c,
        )
        df_hoja_general = ordenar_columnas(
            fac_calcular_n_perdidas(
                df_facultad[[c for c in COLUMNAS_HOJA_FAC if c in df_facultad.columns]]
            )
        )

        df_para_informe = df_hoja_general.copy()
        df_para_informe['FACULTAD'] = facultad
        if 'EVALUACION' in df_facultad.columns:
            df_para_informe['EVALUACION'] = df_facultad['EVALUACION'].values
        hojas_informe.append(df_para_informe)

        # Hoja GENERAL + una hoja por programa (sus filas ya traen el N_PERDIDAS de la facultad)
        hojas = {'GENERAL': df_hoja_general}
        titulos = {'GENERAL': fac_corregir_ortografia_celda(f'REPORTE GENERAL {facultad}')}
        nombres_usados = {'GENERAL'}
        programas = df_facultad['PROGRAMA'].dropna().unique() if 'PROGRAMA' in df_facultad.columns else []
        for programa in programas:
            nombre_hoja = limpiar_nombre_hoja(programa, nombres_usados)
            hojas[nombre_hoja] = df_hoja_general[df_hoja_general['PROGRAMA'] == programa]
            titulos[nombre_hoja] = fac_corregir_ortografia_celda(str(programa))

        def formatear(workbook, titulos=titulos):
            for nombre_hoja, titulo in titulos.items():
                fac_aplicar_formato_especial(workbook, nombre_hoja, titulo)

        nombre_facultad_limpio = "".join(c for c in str(facultad) if c.isalnum() or c in (' ', '-', '_')).strip()
        nombre_facultad_limpio = nombre_facultad_limpio.replace(' ', '_')
        archivos_resultado[f"{nombre_facultad_limpio}.xlsx"] = exportar_libro(
            hojas, formatear, startrow=3, startcol=1
        )

    # INFORME GENERAL: todas las facultades y hojas GENERAL, COMUNICACION y MATEMATICAS generadas en memoria
    archivos_resultado["INFORME GENERAL.xlsx"] = fac_generar_informe_general(hojas_informe)
    return archivos_resultado


# ============================================================
# ==================  MÓDULO 2: MATRICULADOS  ================
# ============================================================

MAPEO_COLUMNAS_MAT = {
    'DOCUMENTO': ['DOC', 'DOCUM', 'DOCUMENTO', 'PEGE_DOCUMENTOIDENTIDAD'],
    'NOMBRE': ['NOMBRE', 'NOM', 'ESTUDIANTE'],
    'PROGRAMA': ['PROGRAMA', 'PROG', 'PROG_NOMBRE'],
    'SEDE': ['FRANJA', 'SEDE'],
    'MATERIA': ['MATERIA'],
    'GRUPO': ['GRUPO'],
    'SEMESTRE': ['SEMESTRE', 'SEM'],
    'CELULAR': ['CELULAR'],
    'CORREO_INST': ['CORREO_INST'],
}


def mat_normalizar_programa(programa):
    if pd.isna(programa):
        return programa
    return normalizar_espacios_celda(str(programa)).upper().translate(TILDES_MAP)


_supabase_mod.vincular_contexto_app(globals())


def mat_normalizar_sede(sede):
    if pd.isna(sede):
        return sede
    sede_str = str(sede).strip()
    if '-' in sede_str:
        sede_str = sede_str.split('-')[0].strip()
    return sede_str


def mat_crear_hoja_general(df_original, programa_a_facultad=None):
    df_general = mapear_columnas(df_original, MAPEO_COLUMNAS_MAT)
    if 'PROGRAMA' in df_general.columns:
        df_general['PROGRAMA'] = quitar_sufijo_programa(df_general['PROGRAMA'])
        if programa_a_facultad is None:
            relacion_pf = obtener_programa_a_facultad()
            programas_archivo = [
                mat_normalizar_programa(p)
                for p in df_general['PROGRAMA'].dropna().unique()
                if str(p).strip()
            ]
            if any(p not in relacion_pf for p in programas_archivo if p) and (
                time.time() - _supabase_mod._ultimo_fetch_programas_ts
            ) > 2.0:
                relacion_pf = obtener_programa_a_facultad(forzar_recarga=True)
        else:
            relacion_pf = programa_a_facultad

        df_general['FACULTAD'] = df_general['PROGRAMA'].apply(
            lambda p: mat_obtener_facultad_de_programa(p, relacion_pf)
        )

    if 'SEDE' in df_general.columns:
        df_general['SEDE'] = df_general['SEDE'].apply(mat_normalizar_sede)
    if 'GRUPO' in df_general.columns:
        df_general = filtrar_por_calendario(df_general, True, True, True).copy()
    if 'GRUPO' in df_general.columns:
        df_general['SEMESTRE'] = df_general['GRUPO'].apply(determinar_semestre)
    return ordenar_columnas(df_general)


def mat_crear_hoja_matriculados(df_general):
    if 'GRUPO' not in df_general.columns or 'DOCUMENTO' not in df_general.columns:
        return pd.DataFrame(columns=['GRUPO', 'MATRICULADOS'])
    df_mat = df_general.groupby('GRUPO')['DOCUMENTO'].nunique().reset_index()
    df_mat.columns = ['GRUPO', 'MATRICULADOS']
    return ordenar_columnas(df_mat.sort_values('GRUPO').reset_index(drop=True))


def mat_procesar_archivo(file_obj):
    df_general = mat_crear_hoja_general(leer_excel(file_obj))
    if df_general.empty:
        raise Exception(
            "No se pudieron mapear las columnas del archivo original o no hay datos después del filtrado."
        )
    df_matriculados = mat_crear_hoja_matriculados(df_general)
    df_comunicacion = filtrar_por_materias(df_general, MATERIAS_COMUNICACION)
    df_matematicas = filtrar_por_materias(df_general, MATERIAS_MATEMATICAS)
    vacio = df_general.head(0)
    hojas = {
        'GENERAL': df_general,
        'MATRICULADOS': df_matriculados if not df_matriculados.empty else pd.DataFrame(columns=['GRUPO', 'MATRICULADOS']),
        'COMUNICACION': df_comunicacion if not df_comunicacion.empty else vacio,
        'MATEMATICAS': df_matematicas if not df_matematicas.empty else vacio,
    }
    return exportar_libro(hojas)


# ============================================================
# ==================  MÓDULO 3: CRUCE  =======================
# ============================================================

MAPEO_COLUMNAS_CRUCE = {
    'FECHA': ['FECHA_ENCUENTRO', 'FECHA'],
    'DOCUMENTO': ['DOC', 'DOCUM', 'DOCUMENTO', 'PEGE_DOCUMENTOIDENTIDAD'],
    'NOMBRE': ['NOMBRE', 'NOM', 'ESTUDIANTE'],
    'FACULTAD': ['FACULTAD'],
    'PROGRAMA': ['PROGRAMA', 'PROG', 'PROG_NOMBRE'],
    'SEDE': ['FRANJA', 'SEDE', 'SEDE ESTUDIANTE'],
    'AREA': ['AREA'],
    'TEMA': ['ENCU_TEMA', 'TEMA'],
    'TUTOR': ['TUTOR', 'INSTRUCTOR'],
}


def cruce_crear_hoja_general(df_original):
    df_general = mapear_columnas(df_original, MAPEO_COLUMNAS_CRUCE)
    if 'FECHA' in df_general.columns:
        df_general['FECHA'] = normalizar_columna_fecha(df_general['FECHA'])
    return ordenar_columnas(df_general)


def cruce_filtrar_por_area(df_general, valores_area):
    if 'AREA' not in df_general.columns:
        return pd.DataFrame()
    valores_upper = {v.upper().strip() for v in valores_area}
    mask = df_general['AREA'].astype(str).str.upper().str.strip().isin(valores_upper)
    df_filtrado = df_general[mask].copy()
    if 'DOCUMENTO' in df_filtrado.columns:
        df_filtrado = df_filtrado.drop_duplicates(subset=['DOCUMENTO'], keep='first')
    return ordenar_columnas(df_filtrado)


def cruce_cruzar_con_matriculados(df_asistencia, file_obj_matriculados, hoja_matriculados):
    try:
        df_matriculados = leer_excel(file_obj_matriculados, hoja_matriculados)
        if 'DOCUMENTO' not in df_asistencia.columns:
            return df_asistencia
        if 'DOCUMENTO' not in df_matriculados.columns:
            return pd.DataFrame(columns=df_asistencia.columns)

        docs_mat = [
            re.sub(r'\.0$', '', str(d).strip()) if pd.notna(d) else None
            for d in df_matriculados['DOCUMENTO']
        ]
        doc_to_grupo = {}
        if 'GRUPO' in df_matriculados.columns:
            for doc, grupo in zip(docs_mat, df_matriculados['GRUPO']):
                if doc is not None and pd.notna(grupo):
                    doc_to_grupo[doc] = grupo

        doc_to_sede = {}
        if 'SEDE' in df_matriculados.columns:
            for doc, sede in zip(docs_mat, df_matriculados['SEDE']):
                if doc is not None and pd.notna(sede):
                    doc_to_sede[doc] = sede

        df_resultado = df_asistencia.copy()
        df_resultado['GRUPO'] = None

        indices_a_conservar = []
        for idx, doc_val in zip(df_resultado.index, df_resultado['DOCUMENTO']):
            if pd.notna(doc_val):
                doc = re.sub(r'\.0$', '', str(doc_val).strip())
                if doc in doc_to_grupo:
                    df_resultado.at[idx, 'GRUPO'] = doc_to_grupo[doc]
                    if doc in doc_to_sede:
                        df_resultado.at[idx, 'SEDE'] = doc_to_sede[doc]
                    indices_a_conservar.append(idx)

        df_cruzado = df_resultado.loc[indices_a_conservar].reset_index(drop=True)
        return ordenar_columnas(df_cruzado)
    except Exception as e:
        raise Exception(f"Error al cruzar con MATRICULADOS: {str(e)}")


def cruce_crear_hoja_asistencia_pma(df_matematicas, df_comunicacion):
    df_union = pd.concat([df_matematicas, df_comunicacion], ignore_index=True)
    if 'DOCUMENTO' in df_union.columns and 'GRUPO' in df_union.columns:
        df_union = df_union.drop_duplicates(subset=['DOCUMENTO', 'GRUPO'], keep='first')
    return ordenar_columnas(df_union.reset_index(drop=True))


def cruce_filtrar_ganaron(df_asistencia, file_obj_informe, hoja_informe):
    try:
        if isinstance(file_obj_informe, pd.DataFrame):
            df_informe = file_obj_informe
        else:
            df_informe = leer_excel(file_obj_informe, hoja_informe)
        if 'DOCUMENTO' not in df_asistencia.columns or 'DOCUMENTO' not in df_informe.columns:
            return df_asistencia
        docs_perdidos = {
            re.sub(r'\.0$', '', str(d).strip()) for d in df_informe['DOCUMENTO'].dropna()
        }
        mask = df_asistencia['DOCUMENTO'].apply(
            lambda x: pd.notna(x) and re.sub(r'\.0$', '', str(x).strip()) not in docs_perdidos
        )
        return ordenar_columnas(df_asistencia[mask].reset_index(drop=True))
    except Exception as e:
        raise Exception(f"Error al filtrar ganaron: {str(e)}")


def cruce_procesar_archivo(file_cruce, file_matriculados, file_informe, calendario_a, calendario_b, calendario_c):
    df_general = cruce_crear_hoja_general(leer_excel(file_cruce))
    if df_general.empty:
        raise Exception("No se pudieron mapear las columnas del archivo CRUCE.")

    df_asistencia_matematicas = cruce_filtrar_por_area(df_general, ['M', 'DCB'])
    if not df_asistencia_matematicas.empty:
        file_matriculados.seek(0)
        df_asistencia_matematicas = cruce_cruzar_con_matriculados(
            df_asistencia_matematicas, file_matriculados, 'MATEMATICAS'
        )

    df_asistencia_comunicacion = cruce_filtrar_por_area(df_general, ['C'])
    if not df_asistencia_comunicacion.empty:
        file_matriculados.seek(0)
        df_asistencia_comunicacion = cruce_cruzar_con_matriculados(
            df_asistencia_comunicacion, file_matriculados, 'COMUNICACION'
        )

    if calendario_a or calendario_b or calendario_c:
        if not df_asistencia_matematicas.empty:
            df_asistencia_matematicas = filtrar_por_calendario(
                df_asistencia_matematicas, calendario_a, calendario_b, calendario_c
            ).copy()
        if not df_asistencia_comunicacion.empty:
            df_asistencia_comunicacion = filtrar_por_calendario(
                df_asistencia_comunicacion, calendario_a, calendario_b, calendario_c
            ).copy()

    df_asistencia_pma = cruce_crear_hoja_asistencia_pma(
        df_asistencia_matematicas, df_asistencia_comunicacion
    )

    file_informe.seek(0)
    df_ganaron_matematicas = cruce_filtrar_ganaron(
        df_asistencia_matematicas, file_informe, 'MATEMATICAS'
    )

    file_informe.seek(0)
    df_ganaron_comunicacion = cruce_filtrar_ganaron(
        df_asistencia_comunicacion, file_informe, 'COMUNICACION'
    )

    vacio = df_general.head(0)
    hojas = {
        'GENERAL': df_general,
        'ASISTENCIA MATEMATICAS': df_asistencia_matematicas if not df_asistencia_matematicas.empty else vacio,
        'ASISTENCIA COMUNICACION': df_asistencia_comunicacion if not df_asistencia_comunicacion.empty else vacio,
        'ASISTENCIA PMA': df_asistencia_pma if not df_asistencia_pma.empty else vacio,
        'GANARON MATEMATICAS': df_ganaron_matematicas if not df_ganaron_matematicas.empty else vacio,
        'GANARON COMUNICACION': df_ganaron_comunicacion if not df_ganaron_comunicacion.empty else vacio,
    }
    return exportar_libro(hojas)


# ============================================================
# ==============  MÓDULO 4: ESTUDIANTES SUPABASE  ============
# ============================================================

SEMESTRE_MAP_SUP = {'PRIMERO': '1', 'SEGUNDO': '2', 'TERCERO': '3'}
COLUMNAS_REQUERIDAS_SUP = {
    'documento': ['DOCUMENTO', 'DOCUM', 'PEGE_DOCUMENTOIDENTIDAD', 'DOC'],
    'nombre': ['NOMBRE', 'NOM', 'ESTUDIANTE'],
    'facultad': ['FACULTAD'],
    'programa': ['PROGRAMA', 'PROG', 'PROG_NOMBRE'],
    'sede': ['SEDE', 'FRANJA'],
    'semestre': ['SEMESTRE', 'SEM'],
}


def sup_limpiar_texto(texto):
    if pd.isna(texto):
        return texto
    return normalizar_espacios_celda(str(texto).translate(TILDES_MAP))


def sup_leer_hojas(file_obj):
    return leer_multiples_hojas(file_obj, ('COMUNICACION', 'MATEMATICAS'), dtype=str)


def sup_procesar_archivo(file_obj):
    df = sup_leer_hojas(file_obj)
    cols = {clave: encontrar_columna(df, aliases) for clave, aliases in COLUMNAS_REQUERIDAS_SUP.items()}
    faltantes = [k for k, v in cols.items() if v is None]
    if faltantes:
        raise Exception(f"No se encontraron las columnas: {', '.join(faltantes)}")

    df_unicos = df.drop_duplicates(subset=cols['documento']).copy()
    if df_unicos.empty:
        raise Exception("No hay registros para procesar.")

    df_final = pd.DataFrame({
        'documento': df_unicos[cols['documento']].apply(
            lambda x: re.sub(r'\.0$', '', str(x).strip()) if pd.notna(x) else x
        ),
        'nombre': df_unicos[cols['nombre']].apply(sup_limpiar_texto),
        'facultad': df_unicos[cols['facultad']].values,
        'programa': df_unicos[cols['programa']].values,
        'sede': df_unicos[cols['sede']],
        'semestre': df_unicos[cols['semestre']].apply(
            lambda x: SEMESTRE_MAP_SUP.get(str(x).strip().upper(), str(x).strip()) if pd.notna(x) else x
        ),
    }).reset_index(drop=True)

    output = io.BytesIO()
    df_final.to_csv(output, index=False, sep=',', encoding='utf-8-sig')
    return output.getvalue()


# ============================================================
# ==================  MÓDULO 5: VISITAS A GRUPOS  ============
# ============================================================

DIAS_VALIDOS_VIS = {'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'}
COLUMNAS_GENERAL_VIS = ['DIA', 'HORARIO', 'SALON', 'GRUPO', 'JORNADA', 'ASIGNATURA', 'DOCENTE']
COLUMNAS_VISITAS_VIS = ['DIA', 'HORARIO', 'SALON', 'GRUPO', 'SEMESTRE', 'JORNADA']
COLUMNAS_ORIGINALES_VIS = ('SALON', 'GRUPO', 'ASIGNATURA', 'DOCENTE', 'HORARIO')
FILAS_HEADER_VIS = (6, 5, 7, 0)  # fila 7, fila 6, fila 8, fila 1 (índice 0-based)

_PATRON_INICIO_HORARIO = re.compile(r'^(\d{3,4})')
_PATRON_HM = re.compile(r'^(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?$')  # 7:00 / 07:00 / 07.00
_PATRON_HHMM = re.compile(r'^(\d{3,4})$')                          # 0700 / 700
_PATRON_HORA_SOLA = re.compile(r'^(\d{1,2})$')                     # 10 / 1 / 01


def vis_detectar_dia(nombre_hoja, dias_validos=DIAS_VALIDOS_VIS):
    """Primera palabra del nombre de la hoja sin tildes/mayúsculas si es un día válido, o None."""
    nombre_norm = str(nombre_hoja).strip().upper().translate(TILDES_MAP)
    if not nombre_norm:
        return None
    primer_token = nombre_norm.split()[0]
    return primer_token if primer_token in dias_validos else None


def vis_determinar_jornada(horario):
    """Determina la JORNADA (MAÑANA / TARDE / NOCHE) a partir de los primeros 3-4 dígitos de HORARIO."""
    if pd.isna(horario):
        return None
    match = _PATRON_INICIO_HORARIO.match(str(horario).strip())
    if not match:
        return None
    hora_num = int(match.group(1).zfill(4))
    if 700 <= hora_num <= 1159:
        return 'MAÑANA'
    if 1200 <= hora_num <= 1759:
        return 'TARDE'
    if 1800 <= hora_num <= 2159:
        return 'NOCHE'
    return None


def _extraer_hora_minuto(parte):
    m = _PATRON_HM.match(parte)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = _PATRON_HHMM.match(parte)
    if m:
        digitos = m.group(1)
        return (int(digitos[0]), int(digitos[1:])) if len(digitos) == 3 else (int(digitos[:2]), int(digitos[2:]))
    m = _PATRON_HORA_SOLA.match(parte)
    if m:
        return int(m.group(1)), 0
    return None


def vis_limpiar_horario(horario):
    if pd.isna(horario):
        return horario, True

    texto = str(horario).strip()
    if not texto or texto.count('-') != 1:
        return horario, True

    parte_inicio, parte_fin = (p.strip() for p in texto.split('-'))
    datos_inicio = _extraer_hora_minuto(parte_inicio)
    datos_fin = _extraer_hora_minuto(parte_fin)
    if datos_inicio is None or datos_fin is None:
        return horario, True

    hora_inicio, min_inicio = datos_inicio
    hora_fin, min_fin = datos_fin

    # Nunca hay clases entre 1:00 a.m. y 6:59 a.m. -> formato de 12h detectado
    if hora_inicio < 7:
        hora_inicio += 12
    if hora_fin < 7:
        hora_fin += 12

    if not (0 <= hora_inicio <= 23 and 0 <= hora_fin <= 23 and 0 <= min_inicio <= 59 and 0 <= min_fin <= 59):
        return horario, True

    return f"{hora_inicio:02d}{min_inicio:02d} - {hora_fin:02d}{min_fin:02d}", False


def vis_resaltar_sospechosos(workbook, nombre_hoja, sospechosos):
    resaltar_filas(workbook, nombre_hoja, sospechosos, fill=RELLENO_AMARILLO, fila_encabezado=1)


def vis_procesar_archivo(archivos):
    """Une las hojas de días válidos de `archivos` (1 a 3) en GENERAL y VISITAS."""
    generales = []

    for file_obj in archivos:
        excel_file = abrir_excel(file_obj)

        for nombre_hoja in excel_file.sheet_names:
            dia_detectado = vis_detectar_dia(nombre_hoja)
            if dia_detectado is None:
                continue

            df_hoja = leer_hoja_excel(
                excel_file,
                hoja=nombre_hoja,
                filas_header=FILAS_HEADER_VIS,
                columnas_clave=COLUMNAS_ORIGINALES_VIS,
                min_coincidencias=2,
                dtype=str,
                normalizar_headers=True,
            )
            if df_hoja is None:
                continue

            df_hoja['DIA'] = dia_detectado
            if 'HORARIO' in df_hoja.columns:
                limpieza = df_hoja['HORARIO'].apply(vis_limpiar_horario)
                df_hoja['HORARIO'] = [item[0] for item in limpieza]
                df_hoja['SOSPECHOSO'] = [item[1] for item in limpieza]
                df_hoja['JORNADA'] = [
                    None if sospechoso else vis_determinar_jornada(h)
                    for h, sospechoso in zip(df_hoja['HORARIO'], df_hoja['SOSPECHOSO'])
                ]
            else:
                df_hoja['JORNADA'] = None
                df_hoja['SOSPECHOSO'] = False

            for col_critica in ('SALON', 'GRUPO', 'HORARIO'):
                if col_critica in df_hoja.columns:
                    col_str = df_hoja[col_critica].astype(str).str.strip()
                    df_hoja = df_hoja[
                        df_hoja[col_critica].notna() & (col_str != '') & (col_str.str.upper() != 'NAN')
                    ]

            generales.append(df_hoja)

    if not generales:
        raise Exception("No se encontraron hojas válidas (LUNES a SABADO) en ninguno de los archivos.")

    df_general_raw = pd.concat(generales, ignore_index=True)

    df_general = pd.DataFrame({
        col: df_general_raw[col] if col in df_general_raw.columns else None
        for col in COLUMNAS_GENERAL_VIS
    })
    df_general['SOSPECHOSO'] = df_general_raw['SOSPECHOSO'] if 'SOSPECHOSO' in df_general_raw.columns else False
    df_general = df_general.drop_duplicates(subset=['DIA', 'HORARIO', 'GRUPO'], keep='first').reset_index(drop=True)

    df_visitas = df_general.copy()
    df_visitas['SEMESTRE'] = df_visitas['GRUPO'].apply(determinar_semestre)
    df_visitas = df_visitas[df_visitas['SEMESTRE'].notna()].reset_index(drop=True)

    sospechosos_general = df_general['SOSPECHOSO'].fillna(False).tolist()
    sospechosos_visitas = df_visitas['SOSPECHOSO'].fillna(False).tolist()

    hojas = {
        'GENERAL': ordenar_columnas(df_general[COLUMNAS_GENERAL_VIS]),
        'VISITAS': ordenar_columnas(df_visitas[COLUMNAS_VISITAS_VIS]),
    }

    def formatear(workbook):
        aplicar_formato(workbook, 'GENERAL')
        aplicar_formato(workbook, 'VISITAS')
        vis_resaltar_sospechosos(workbook, 'GENERAL', sospechosos_general)
        vis_resaltar_sospechosos(workbook, 'VISITAS', sospechosos_visitas)

    return exportar_libro(hojas, formatear)


# ============================================================
# ==================  EJECUCIÓN DE INTERFAZ  =================
# ============================================================

modulo = renderizar_interfaz(
    fac_procesar_archivo=fac_procesar_archivo,
    mat_procesar_archivo=mat_procesar_archivo,
    cruce_procesar_archivo=cruce_procesar_archivo,
    sup_procesar_archivo=sup_procesar_archivo,
    vis_procesar_archivo=vis_procesar_archivo,
)
