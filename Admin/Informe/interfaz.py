import io
import zipfile
import streamlit as st

# ============================================================
# CONSTANTES DE INTERFAZ Y DESCARGA
# ============================================================

MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

BADGE_CALENDARIO_A = "BS2 · BS3 · SB2 · SB3 · B2 · B3 · S2 · S3 · SR2 · 2 · 3 · L2 · NL2 · L3 · NL3"
BADGE_CALENDARIO_B = "B1 · BS1 · SB1 · BR1 · BRS1 · LB1 · SBR1 · NLB1 · SRB1 · 1"
BADGE_CALENDARIO_C = "C1 · SC1"
HELP_CALENDARIO_A = "Incluye grupos: BS2, BS3, SB2, SB3, B2, B3, S2, S3, SR2, 2, 3, L2, NL2, L3, NL3"
HELP_CALENDARIO_B = "Incluye grupos: B1, BS1, SB1, BR1, BRS1, LB1, SBR1, NLB1, SRB1 (sin 00), 1 (sin 0 ni 1 después)"
HELP_CALENDARIO_C = "Incluye grupos: C1, SC1 (sin 00)"
CALENDARIOS = (
    ('A', BADGE_CALENDARIO_A, HELP_CALENDARIO_A),
    ('B', BADGE_CALENDARIO_B, HELP_CALENDARIO_B),
    ('C', BADGE_CALENDARIO_C, HELP_CALENDARIO_C),
)


# ============================================================
# CONFIGURACIÓN DE PÁGINA
# ============================================================

def configurar_pagina():
    st.set_page_config(
        page_title="INFORME PMA",
        page_icon="🎓",
        layout="wide",
        initial_sidebar_state="expanded"
    )


# ============================================================
# ==================  INTERFAZ STREAMLIT  ====================
# ============================================================

def _render_filtros_calendario(sufijo_key):
    """Renderiza los 3 checkboxes de Calendario A, B y C y retorna la tupla de booleanos."""
    st.markdown("---")
    st.markdown("**⚙️ Opciones de filtrado de grupos**")
    valores = []
    for col, (letra, badge, ayuda) in zip(st.columns(3), CALENDARIOS):
        with col:
            activo = st.checkbox(
                f"Calendario {letra}",
                help=ayuda,
                key=f"cal_{letra.lower()}_{sufijo_key}"
            )
            if activo:
                st.markdown(f'<span class="badge badge-blue">{badge}</span>', unsafe_allow_html=True)
            valores.append(activo)
    st.markdown("---")
    return tuple(valores)


def _mostrar_aviso_subida(mensaje="⬆️ Sube el archivo Excel para habilitar el procesamiento."):
    st.markdown(f'<div class="warning-card">{mensaje}</div>', unsafe_allow_html=True)


def renderizar_sidebar():
    with st.sidebar:
        st.markdown('<div class="sidebar-title">INFORME PMA</div>', unsafe_allow_html=True)
        st.markdown('<div class="sidebar-subtitle">EXCEL</div>', unsafe_allow_html=True)
        st.markdown("---")

        modulo = st.radio(
            "Selecciona un módulo:",
            options=[
                "Facultades",
                "Matriculados",
                "Cruce",
                "Informe General",
                "Estudiantes Supabase",
                "Visitas a Grupos"
            ],
            label_visibility="collapsed"
        )

        st.markdown("---")
        st.markdown(
            '<div style="font-size:0.72rem; color:rgba(255,255,255,0.25); line-height:1.6;">'
            'Los archivos se procesan en memoria.<br>Ningún dato se almacena en el servidor.'
            '</div>',
            unsafe_allow_html=True
        )
    return modulo


def renderizar_modulo_facultades(fac_procesar_archivo):
    st.markdown("""
    <div class="module-header">
        <h1>Procesador de Facultades</h1>
        <p>Lee el archivo de facultades y genera un libro Excel por cada facultad,<br>
        con hoja GENERAL y una hoja por programa. También produce el <strong>INFORME GENERAL</strong>.</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
        <strong>¿Qué hace este módulo?</strong><br>
        • Filtra estudiantes con nota entre <strong>0.0 y 2.9</strong> (reprobados).<br>
        • Genera un archivo Excel por cada facultad encontrada.<br>
        • Cada archivo contiene hoja GENERAL + una hoja por programa académico.<br>
        • Genera adicionalmente el archivo <strong>INFORME GENERAL.xlsx</strong> con todas las facultades unidas.<br>
        • Corrige ortografía automáticamente (tildes en nombres de materias y programas).
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="warning-card">
        <strong>Columnas Necesarias</strong><br>
        <code>DOCUMENTO / DOC / DOCUM / PEGE_DOCUMENTOIDENTIDAD</code>
        <code>NOMBRE / NOM / ESTUDIANTE</code>
        <code>FACULTAD</code><br>
        <code>PROGRAMA / PROG / PROG_NOMBRE</code>
        <code>MATERIA</code>
        <code>EVALUACION</code>
        <code>GRUPO</code>
        <code>NOTA</code>
        <code>SEM / SEMESTRE</code><br><br>
        La columna <strong>N_PERDIDAS</strong> se genera automáticamente.
    </div>
    """, unsafe_allow_html=True)

    col_fac1, col_fac2 = st.columns(2)
    with col_fac1:
        st.markdown('<div class="upload-label">📂 Archivo 1 (obligatorio)</div>', unsafe_allow_html=True)
        archivo_fac = st.file_uploader(
            "Archivo Facultades 1",
            type=["xlsx"],
            key="uploader_fac",
            label_visibility="collapsed"
        )
    with col_fac2:
        st.markdown('<div class="upload-label">📂 Archivo 2 (opcional)</div>', unsafe_allow_html=True)
        archivo_fac2 = st.file_uploader(
            "Archivo Facultades 2",
            type=["xlsx"],
            key="uploader_fac2",
            label_visibility="collapsed"
        )

    calendario_a_fac, calendario_b_fac, calendario_c_fac = _render_filtros_calendario("fac")

    if archivo_fac:
        if st.button("▶  Procesar Facultades", key="btn_fac", use_container_width=True):
            with st.spinner("Procesando facultades..."):
                try:
                    archivos = fac_procesar_archivo(
                        archivo_fac, archivo_fac2,
                        calendario_a_fac, calendario_b_fac, calendario_c_fac
                    )
                    st.success(f"✅ Proceso completado. Se generaron **{len(archivos)} archivos**.")

                    zip_buffer = io.BytesIO()
                    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                        for nombre_archivo, contenido in archivos.items():
                            zip_file.writestr(nombre_archivo, contenido)

                    st.download_button(
                        label="⬇️  Descargar todos los archivos (.zip)",
                        data=zip_buffer.getvalue(),
                        file_name="FACULTADES_PROCESADAS.zip",
                        mime="application/zip",
                        key="dl_fac_zip"
                    )
                except Exception as e:
                    st.error(f"❌ Error al procesar: {str(e)}")
    else:
        _mostrar_aviso_subida()


def renderizar_modulo_matriculados(mat_procesar_archivo):
    st.markdown("""
    <div class="module-header">
        <h1>Procesador de Matriculados</h1>
        <p>Procesa el archivo de matriculados y genera hojas organizadas:<br>
        <strong>GENERAL · MATRICULADOS · COMUNICACION · MATEMATICAS</strong></p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
        <strong>¿Qué hace este módulo?</strong><br>
        • Filtra y organiza los datos de estudiantes matriculados.<br>
        • Asigna <strong>FACULTAD</strong> automáticamente según el programa académico.<br>
        • Normaliza la columna <strong>SEDE</strong> (NORTE / SUR).<br>
        • Filtra grupos válidos y determina el semestre (PRIMERO / SEGUNDO / TERCERO).<br>
        • Genera hoja <strong>MATRICULADOS</strong> con conteo de estudiantes únicos por grupo.<br>
        • Genera hojas separadas de <strong>COMUNICACION</strong> y <strong>MATEMATICAS</strong>.
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="warning-card">
        <strong>Columnas Necesarias</strong><br>
        <code>DOCUMENTO / DOC / DOCUM / PEGE_DOCUMENTOIDENTIDAD</code>
        <code>NOMBRE / NOM / ESTUDIANTE</code>
        <code>PROGRAMA / PROG / PROG_NOMBRE</code><br>
        <code>SEDE / FRANJA</code>
        <code>MATERIA</code>
        <code>GRUPO</code>
        <code>SEMESTRE</code>
        <code>CELULAR</code>
        <code>CORREO_INST</code>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="upload-label">📂 Archivo de entrada</div>', unsafe_allow_html=True)
    archivo_mat = st.file_uploader(
        "Sube el archivo Excel de Matriculados",
        type=["xlsx"],
        key="uploader_mat",
        label_visibility="collapsed"
    )

    st.markdown("---")

    if archivo_mat:
        if st.button("▶  Procesar Matriculados", key="btn_mat", use_container_width=True):
            with st.spinner("Procesando matriculados..."):
                try:
                    resultado = mat_procesar_archivo(archivo_mat)
                    st.success("✅ Proceso completado exitosamente.")
                    st.download_button(
                        label="⬇️  Descargar archivo procesado",
                        data=resultado,
                        file_name="MATRICULADOS_PROCESADO.xlsx",
                        mime=MIME_XLSX,
                        key="dl_mat"
                    )
                except Exception as e:
                    st.error(f"❌ Error al procesar: {str(e)}")
    else:
        _mostrar_aviso_subida()


def renderizar_modulo_cruce(cruce_procesar_archivo):
    st.markdown("""
    <div class="module-header">
        <h1>Procesador de Cruce</h1>
        <p>Cruza los archivos <strong>TUTORIAS</strong>, <strong>MATRICULADOS</strong> e <strong>INFORME GENERAL</strong><br>
        para generar hojas de asistencia y estudiantes que ganaron.</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
        <strong>¿Qué hace este módulo?</strong><br>
        • Filtra por AREA: Matemáticas (M, DCB) y Comunicación (C).<br>
        • Cruza con MATRICULADOS para obtener GRUPO y SEDE por estudiante.<br>
        • Genera hojas: <br>
        <strong>GENERAL · ASISTENCIA MATEMÁTICAS · ASISTENCIA COMUNICACIÓN · ASISTENCIA PMA · GANARON MATEMÁTICAS · GANARON COMUNICACIÓN</strong>.<br>
        • GANARON = Estudiantes que asistieron pero no aparecen en el INFORME GENERAL (No reprobaron).
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="warning-card">
        <strong>Archivos Necesarios</strong><br>
        TUTORIAS — descargado desde el Panel Admin del formulario ("Descargar Informe").<br>
        MATRICULADOS — archivo ya procesado por el módulo "Matriculados".<br>
        INFORME GENERAL — archivo ya procesado por el módulo "Informe General".
    </div>
    """, unsafe_allow_html=True)

    col_c1, col_c2, col_c3 = st.columns(3)
    with col_c1:
        st.markdown('<div class="upload-label">📂 Archivo TUTORIAS</div>', unsafe_allow_html=True)
        archivo_cruce = st.file_uploader("Archivo CRUCE", type=["xlsx"], key="uploader_cruce", label_visibility="collapsed")
    with col_c2:
        st.markdown('<div class="upload-label">📂 Archivo MATRICULADOS</div>', unsafe_allow_html=True)
        archivo_mat_cruce = st.file_uploader("Archivo MATRICULADOS", type=["xlsx"], key="uploader_mat_cruce", label_visibility="collapsed")
    with col_c3:
        st.markdown('<div class="upload-label">📂 Archivo INFORME GENERAL</div>', unsafe_allow_html=True)
        archivo_informe_cruce = st.file_uploader("Archivo INFORME GENERAL", type=["xlsx"], key="uploader_inf_cruce", label_visibility="collapsed")

    calendario_a_cruce, calendario_b_cruce, calendario_c_cruce = _render_filtros_calendario("cruce")

    if archivo_cruce and archivo_mat_cruce and archivo_informe_cruce:
        if st.button("▶  Procesar Cruce", key="btn_cruce", use_container_width=True):
            with st.spinner("Procesando cruce de archivos..."):
                try:
                    resultado = cruce_procesar_archivo(
                        archivo_cruce, archivo_mat_cruce, archivo_informe_cruce,
                        calendario_a_cruce, calendario_b_cruce, calendario_c_cruce
                    )
                    st.success("✅ Proceso completado exitosamente.")
                    st.download_button(
                        label="⬇️  Descargar archivo procesado",
                        data=resultado,
                        file_name="CRUCE_PROCESADO.xlsx",
                        mime=MIME_XLSX,
                        key="dl_cruce"
                    )
                except Exception as e:
                    st.error(f"❌ Error al procesar: {str(e)}")
    else:
        faltantes_c = [
            nombre for nombre, archivo in (
                ("CRUCE", archivo_cruce),
                ("MATRICULADOS", archivo_mat_cruce),
                ("INFORME GENERAL", archivo_informe_cruce),
            ) if not archivo
        ]
        _mostrar_aviso_subida(f"⬆️ Faltan archivos por subir: <strong>{' · '.join(faltantes_c)}</strong>")


def renderizar_modulo_informe_general(inf_procesar_archivo):
    st.markdown("""
    <div class="module-header">
        <h1>Procesador de Informe General</h1>
        <p>Procesa el archivo de informe general y genera hojas organizadas:<br>
        <strong>GENERAL · COMUNICACION · MATEMATICAS</strong></p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
        <strong>¿Qué hace este módulo?</strong><br>
        • Lee la hoja <strong>ORIGINAL</strong> del archivo (o la primera hoja si no existe).<br>
        • Normaliza y mapea las columnas al formato estándar.<br>
        • Genera hoja <strong>GENERAL</strong> con todas las materias.<br>
        • Filtra y genera hojas separadas de <strong>COMUNICACION</strong> y <strong>MATEMATICAS</strong>.<br>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="warning-card">
        <strong>Archivo Necesario</strong><br>
        Debe subirse el Archivo "Informe General" generado en el modulo de "Procesador de Facultades".
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="upload-label">📂 INFORME GENERAL (CREADO POR "PROCESADOR DE FACULTADES")</div>', unsafe_allow_html=True)
    archivo_inf = st.file_uploader(
        "Sube el archivo Excel de Informe General",
        type=["xlsx"],
        key="uploader_inf",
        label_visibility="collapsed"
    )

    st.markdown("---")

    if archivo_inf:
        if st.button("▶  Procesar Informe General", key="btn_inf", use_container_width=True):
            with st.spinner("Procesando informe general..."):
                try:
                    resultado = inf_procesar_archivo(archivo_inf)
                    st.success("✅ Proceso completado exitosamente.")
                    st.download_button(
                        label="⬇️  Descargar archivo procesado",
                        data=resultado,
                        file_name="INFORME_GENERAL_PROCESADO.xlsx",
                        mime=MIME_XLSX,
                        key="dl_inf"
                    )
                except Exception as e:
                    st.error(f"❌ Error al procesar: {str(e)}")
    else:
        _mostrar_aviso_subida()


def renderizar_modulo_estudiantes_supabase(sup_procesar_archivo):
    st.markdown("""
    <div class="module-header">
        <h1>Estudiantes para Supabase</h1>
        <p>Prepara los datos de estudiantes para importación a Supabase:<br></p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
        <strong>¿Qué hace este módulo?</strong><br>
        • Lee las hojas <strong>COMUNICACION</strong> y <strong>MATEMATICAS</strong> del archivo.<br>
        • Elimina duplicados por número de documento.<br>
        • Convierte el semestre en número.
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="warning-card">
        <strong>Archivo Necesario</strong><br>
        Debe subirse el archivo MATRICULADOS PROCESADO generado en el módulo de "Procesador de Matriculados".
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="upload-label">📂 MATRICULADOS (PROCESADO)</div>', unsafe_allow_html=True)
    archivo_sup = st.file_uploader(
        "Sube el archivo Excel con hojas COMUNICACION y MATEMATICAS",
        type=["xlsx"],
        key="uploader_sup",
        label_visibility="collapsed"
    )

    st.markdown("---")

    if archivo_sup:
        if st.button("▶  Procesar Estudiantes Supabase", key="btn_sup", use_container_width=True):
            with st.spinner("Preparando datos para Supabase..."):
                try:
                    resultado = sup_procesar_archivo(archivo_sup)
                    st.success("✅ Proceso completado exitosamente.")
                    st.download_button(
                        label="⬇️  Descargar archivo ESTUDIANTES",
                        data=resultado,
                        file_name="ESTUDIANTES_SUPABASE.csv",
                        mime="text/csv",
                        key="dl_sup"
                    )
                except Exception as e:
                    st.error(f"❌ Error al procesar: {str(e)}")
    else:
        _mostrar_aviso_subida()


def renderizar_modulo_visitas(vis_procesar_archivo):
    st.markdown("""
    <div class="module-header">
        <h1>Visitas a Grupos</h1>
        <p>Une todas las hojas válidas de los archivos subidos en una hoja <strong>GENERAL</strong>,<br>
        y genera la hoja <strong>VISITAS</strong> con semestre asignado según el grupo.</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="info-card">
        <strong>¿Qué hace este módulo?</strong><br>
        • Lee únicamente las hojas llamadas <strong>LUNES, MARTES, MIERCOLES, JUEVES, VIERNES o SABADO</strong>.<br>
        • Los encabezados se buscan automáticamente en las filas 7, 6, 8 y 1.<br>
        • Los encabezados del archivo original pueden estar en minúscula o mayúscula — se normalizan automáticamente.<br>
        • Une los archivos en una sola <strong>GENERAL</strong>, luego genera <strong>VISITAS</strong> con semestre asignado.<br>
        • Puedes subir entre <strong>1 y 3 archivos</strong>. No es obligatorio subir los 3.
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="warning-card">
        <strong>Columnas Necesarias</strong><br>
        <code>SALON</code>
        <code>GRUPO</code>
        <code>ASIGNATURA</code>
        <code>DOCENTE</code>
        <code>HORARIO</code><br><br>
        Las columnas <strong>DIA</strong>, <strong>JORNADA</strong> y <strong>SEMESTRE</strong> se generan automáticamente.
    </div>
    """, unsafe_allow_html=True)

    col_v1, col_v2, col_v3 = st.columns(3)
    with col_v1:
        st.markdown('<div class="upload-label">📂 ARCHIVO 1</div>', unsafe_allow_html=True)
        archivo_vis_1 = st.file_uploader("Archivo 1", type=["xlsx"], key="uploader_vis_1", label_visibility="collapsed")
    with col_v2:
        st.markdown('<div class="upload-label">📂 ARCHIVO 2</div>', unsafe_allow_html=True)
        archivo_vis_2 = st.file_uploader("Archivo 2", type=["xlsx"], key="uploader_vis_2", label_visibility="collapsed")
    with col_v3:
        st.markdown('<div class="upload-label">📂  ARCHIVO 3</div>', unsafe_allow_html=True)
        archivo_vis_3 = st.file_uploader("Archivo 3", type=["xlsx"], key="uploader_vis_3", label_visibility="collapsed")

    st.markdown("---")

    archivos_vis = [f for f in (archivo_vis_1, archivo_vis_2, archivo_vis_3) if f is not None]

    if archivos_vis:
        if st.button("▶  Procesar Visitas a Grupos", key="btn_vis", use_container_width=True):
            with st.spinner("Procesando visitas a grupos..."):
                try:
                    resultado = vis_procesar_archivo(archivos_vis)
                    st.success(f"✅ Proceso completado. Se procesaron **{len(archivos_vis)} archivo(s)**.")
                    st.download_button(
                        label="⬇️  Descargar archivo procesado",
                        data=resultado,
                        file_name="VISITAS_GRUPOS_PROCESADO.xlsx",
                        mime=MIME_XLSX,
                        key="dl_vis"
                    )
                except Exception as e:
                    st.error(f"❌ Error al procesar: {str(e)}")
    else:
        _mostrar_aviso_subida("⬆️ Sube al menos un archivo Excel para habilitar el procesamiento.")


def renderizar_interfaz(
    fac_procesar_archivo=None,
    mat_procesar_archivo=None,
    cruce_procesar_archivo=None,
    inf_procesar_archivo=None,
    sup_procesar_archivo=None,
    vis_procesar_archivo=None,
):
    """Renderiza el sidebar y el módulo activo de la aplicación."""
    if fac_procesar_archivo is None:
        from streamlit_app import (
            fac_procesar_archivo,
            mat_procesar_archivo,
            cruce_procesar_archivo,
            inf_procesar_archivo,
            sup_procesar_archivo,
            vis_procesar_archivo,
        )

    modulo = renderizar_sidebar()

    if modulo == "Facultades":
        renderizar_modulo_facultades(fac_procesar_archivo)
    elif modulo == "Matriculados":
        renderizar_modulo_matriculados(mat_procesar_archivo)
    elif modulo == "Cruce":
        renderizar_modulo_cruce(cruce_procesar_archivo)
    elif modulo == "Informe General":
        renderizar_modulo_informe_general(inf_procesar_archivo)
    elif modulo == "Estudiantes Supabase":
        renderizar_modulo_estudiantes_supabase(sup_procesar_archivo)
    elif modulo == "Visitas a Grupos":
        renderizar_modulo_visitas(vis_procesar_archivo)

    return modulo
