import streamlit as st

# ============================================================
# ESTILOS CSS
# ============================================================
ESTILOS_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

html, body, [class*="css"] {
    font-family: 'Sora', sans-serif;
}

/* Fondo general */
.stApp {
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
    min-height: 100vh;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d1117 0%, #161b27 100%);
    border-right: 1px solid rgba(99, 179, 237, 0.15);
}

[data-testid="stSidebar"] * {
    font-family: 'Sora', sans-serif !important;
}

/* --- Bloquear el sidebar: sin scroll, sin colapso, tamaño fijo --- */

/* Oculta el botón de flecha que colapsa/oculta el sidebar (todas las versiones) */
[data-testid="stSidebarCollapsedControl"],
[data-testid="collapsedControl"],
button[data-testid="stSidebarCollapseButton"],
[data-testid="stSidebarCollapseButton"] {
    display: none !important;
}

/* Oculta la barra/handle para redimensionar el ancho */
[data-testid="stSidebarResizeHandle"] {
    display: none !important;
}

/* Ancho fijo y sin posibilidad de encogerse */
[data-testid="stSidebar"] {
    min-width: 300px !important;
    max-width: 300px !important;
    width: 300px !important;
}

/* Quita cualquier scroll dentro del sidebar */
[data-testid="stSidebar"],
[data-testid="stSidebarContent"],
section[data-testid="stSidebar"] > div {
    overflow: hidden !important;
}

/* Título principal en sidebar */
.sidebar-title {
    font-family: 'Sora', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: #63b3ed;
    padding: 1rem 0 0.5rem 0;
    letter-spacing: 0.02em;
}

.sidebar-subtitle {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.4);
    margin-bottom: 1.5rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

/* Radio buttons del sidebar */
[data-testid="stSidebar"] .stRadio label {
    color: rgba(255,255,255,0.75) !important;
    font-size: 0.9rem !important;
    padding: 0.4rem 0 !important;
    cursor: pointer;
    transition: color 0.2s;
}

[data-testid="stSidebar"] .stRadio label:hover {
    color: #63b3ed !important;
}

/* Encabezado de módulo */
.module-header {
    background: linear-gradient(135deg, rgba(99,179,237,0.08) 0%, rgba(154,117,234,0.08) 100%);
    border: 1px solid rgba(99,179,237,0.2);
    border-radius: 16px;
    padding: 2rem 2.5rem;
    margin-bottom: 2rem;
    position: relative;
    overflow: hidden;
}

.module-header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #63b3ed, #9a75ea, #63b3ed);
}

.module-header h1 {
    font-family: 'Sora', sans-serif;
    font-size: 1.9rem;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0 0 0.4rem 0;
    letter-spacing: -0.01em;
}

.module-header p {
    color: rgba(255,255,255,0.5);
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.6;
}

.module-icon {
    font-size: 2.5rem;
    margin-bottom: 0.8rem;
    display: block;
}

/* Tarjeta de instrucciones */
.info-card {
    background: rgba(99,179,237,0.06);
    border: 1px solid rgba(99,179,237,0.15);
    border-left: 3px solid #63b3ed;
    border-radius: 10px;
    padding: 1rem 1.4rem;
    margin-bottom: 1.5rem;
    color: rgba(255,255,255,0.7);
    font-size: 0.87rem;
    line-height: 1.7;
}

/* Tarjeta de advertencia */
.warning-card {
    background: rgba(246,173,85,0.06);
    border: 1px solid rgba(246,173,85,0.2);
    border-left: 3px solid #f6ad55;
    border-radius: 10px;
    padding: 1rem 1.4rem;
    margin-bottom: 1.5rem;
    color: rgba(255,255,255,0.7);
    font-size: 0.87rem;
    line-height: 1.7;
}

/* Sección de upload */
.upload-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.2rem;
}

.upload-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.5rem;
}

/* File uploader */
[data-testid="stFileUploader"] {
    background: rgba(255,255,255,0.02) !important;
    border: 1.5px dashed rgba(99,179,237,0.25) !important;
    border-radius: 10px !important;
    transition: border-color 0.2s !important;
}

[data-testid="stFileUploader"]:hover {
    border-color: rgba(99,179,237,0.5) !important;
}

/* Botón principal */
.stButton > button {
    background: linear-gradient(135deg, #2b6cb0 0%, #553c9a 100%) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 0.7rem 2.5rem !important;
    font-family: 'Sora', sans-serif !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    letter-spacing: 0.02em !important;
    transition: all 0.25s ease !important;
    box-shadow: 0 4px 15px rgba(43,108,176,0.3) !important;
}

.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(43,108,176,0.5) !important;
}

.stButton > button:active {
    transform: translateY(0) !important;
}

/* Download button */
[data-testid="stDownloadButton"] button {
    background: linear-gradient(135deg, #276749 0%, #2f855a 100%) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 0.7rem 2.5rem !important;
    font-family: 'Sora', sans-serif !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    transition: all 0.25s ease !important;
    box-shadow: 0 4px 15px rgba(39,103,73,0.4) !important;
}

[data-testid="stDownloadButton"] button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(39,103,73,0.6) !important;
}

/* Checkboxes */
.stCheckbox label {
    color: rgba(255,255,255,0.8) !important;
    font-size: 0.9rem !important;
}

/* Mensajes de éxito / error */
.stSuccess {
    background: rgba(39,103,73,0.15) !important;
    border: 1px solid rgba(72,187,120,0.3) !important;
    border-radius: 10px !important;
    color: #9ae6b4 !important;
}

.stError {
    background: rgba(154,44,44,0.15) !important;
    border: 1px solid rgba(252,129,129,0.3) !important;
    border-radius: 10px !important;
}

/* Divider */
hr {
    border-color: rgba(255,255,255,0.07) !important;
    margin: 1.5rem 0 !important;
}

/* Texto en general */
p, span, div, label {
    color: rgba(255,255,255,0.8);
}

h2, h3 {
    color: #e2e8f0 !important;
    font-family: 'Sora', sans-serif !important;
}

/* Badge de estado */
.badge {
    display: inline-block;
    padding: 0.2rem 0.7rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
}
.badge-blue { background: rgba(99,179,237,0.15); color: #90cdf4; border: 1px solid rgba(99,179,237,0.3); }
.badge-green { background: rgba(72,187,120,0.15); color: #9ae6b4; border: 1px solid rgba(72,187,120,0.3); }

/* Spinner */
.stSpinner > div {
    border-color: #63b3ed !important;
}

/* Ocultar footer de Streamlit */
footer { visibility: hidden; }
#MainMenu { visibility: hidden; }

/* Oculta la barra superior de Streamlit (header con Fork/GitHub) */
header[data-testid="stHeader"] {
    display: none !important;
}
</style>
"""


def aplicar_estilos():
    """Inyecta los estilos CSS personalizados en la aplicación Streamlit."""
    st.markdown(ESTILOS_CSS, unsafe_allow_html=True)
