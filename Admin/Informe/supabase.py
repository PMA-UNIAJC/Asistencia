import json
import os
import time
import urllib.error
import urllib.request
import pandas as pd
import streamlit as st

# ============================================================
# CONEXIÓN CON SUPABASE (FACULTADES Y PROGRAMAS)
# ============================================================

SUPABASE_URL_DEFAULT = "https://hgppzklpukgslnrynvld.supabase.co"
SUPABASE_KEY_DEFAULT = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHB6a2xwdWtnc2xucnludmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTIzNTcsImV4cCI6MjA4MDM2ODM1N30."
    "gRgf8vllRhVXj9pPPoHj2fPDgXyjZ8SA9h_wLmBSZfs"
)

_ultimo_fetch_programas_ts = 0.0
_contexto_app = None


def vincular_contexto_app(ns):
    """Vincula el espacio de nombres del módulo principal sin crear importaciones circulares."""
    global _contexto_app, _ultimo_fetch_programas_ts
    _contexto_app = ns
    _ultimo_fetch_programas_ts = 0.0


def _obtener_normalizador_programa():
    if _contexto_app is not None and "mat_normalizar_programa" in _contexto_app:
        return _contexto_app["mat_normalizar_programa"]
    from streamlit_app import mat_normalizar_programa
    return mat_normalizar_programa


def _obtener_config_supabase():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not url or not key:
        try:
            if not url and "SUPABASE_URL" in st.secrets:
                url = str(st.secrets["SUPABASE_URL"]).strip()
            if not key and "SUPABASE_KEY" in st.secrets:
                key = str(st.secrets["SUPABASE_KEY"]).strip()
        except Exception:
            pass
    if not url:
        url = SUPABASE_URL_DEFAULT
    if not key:
        key = SUPABASE_KEY_DEFAULT
    return url.rstrip("/"), key


def _consultar_tabla_supabase(tabla, select="*", order="id.asc", intentos=3, timeout=10):
    supabase_url, supabase_key = _obtener_config_supabase()
    if not supabase_url or not supabase_key:
        raise Exception("Configuración de conexión a Supabase incompleta (URL o API Key faltante).")

    url = f"{supabase_url}/rest/v1/{tabla}?select={select}&order={order}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Accept": "application/json"
    }

    ultimo_error = None
    for intento in range(intentos):
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
                datos = json.loads(raw)
                if not isinstance(datos, list):
                    raise Exception(f"Formato de respuesta inválido al consultar la tabla 'public.{tabla}'.")
                return datos
        except urllib.error.HTTPError as e:
            ultimo_error = Exception(
                f"Error al consultar 'public.{tabla}' en Supabase (HTTP {e.code}). "
                "Verifique los permisos y la disponibilidad de la base de datos."
            )
            if 400 <= e.code < 500 and e.code != 429:
                break
        except urllib.error.URLError as e:
            ultimo_error = Exception(
                f"No se pudo conectar con Supabase al consultar 'public.{tabla}'. "
                f"Verifique su conexión a internet ({e.reason})."
            )
        except json.JSONDecodeError:
            ultimo_error = Exception(
                f"Respuesta ilegible desde Supabase al consultar 'public.{tabla}'."
            )
        except Exception as e:
            ultimo_error = e

        if intento < intentos - 1:
            time.sleep(0.5 * (intento + 1))

    raise ultimo_error if ultimo_error else Exception(f"Error desconocido consultando 'public.{tabla}'.")


def construir_relacion_programa_facultad(facultades_registros, programas_registros):
    """
    Construye dinámicamente el diccionario {programa_normalizado: facultad_normalizada}
    a partir de los registros de public.facultades (id, nombre) y
    public.programas (id, facultad_id, nombre).
    """
    if not isinstance(facultades_registros, list) or not isinstance(programas_registros, list):
        raise Exception("Los datos de facultades y programas deben ser listas de registros.")

    mat_normalizar_programa = _obtener_normalizador_programa()

    facultades_por_id = {}
    for fac in facultades_registros:
        if not isinstance(fac, dict):
            continue
        fac_id = fac.get("id")
        fac_nombre = fac.get("nombre")
        if fac_id is None or fac_nombre is None or pd.isna(fac_nombre):
            continue
        fac_nombre_norm = mat_normalizar_programa(fac_nombre)
        if fac_nombre_norm:
            facultades_por_id[fac_id] = fac_nombre_norm

    relacion = {}
    for prog in programas_registros:
        if not isinstance(prog, dict):
            continue
        prog_nombre = prog.get("nombre")
        if prog_nombre is None or pd.isna(prog_nombre):
            continue
        prog_nombre_norm = mat_normalizar_programa(prog_nombre)
        if not prog_nombre_norm:
            continue

        fac_id = prog.get("facultad_id")
        fac_nombre_norm = facultades_por_id.get(fac_id) if fac_id is not None else None

        if not fac_nombre_norm and isinstance(prog.get("facultades"), dict):
            emb = prog["facultades"]
            emb_id = emb.get("id")
            emb_nombre = emb.get("nombre")
            if (fac_id is None or emb_id == fac_id) and emb_nombre is not None and not pd.isna(emb_nombre):
                fac_nombre_norm = mat_normalizar_programa(emb_nombre)

        if fac_nombre_norm:
            relacion[prog_nombre_norm] = fac_nombre_norm

    return relacion


@st.cache_data(ttl=300, show_spinner=False)
def _cargar_programa_a_facultad_cached():
    consultar_fn = (
        _contexto_app.get("_consultar_tabla_supabase", _consultar_tabla_supabase)
        if _contexto_app is not None
        else _consultar_tabla_supabase
    )
    facultades_data = consultar_fn("facultades", select="id,nombre", order="id.asc")
    programas_data = consultar_fn("programas", select="id,facultad_id,nombre", order="id.asc")
    return construir_relacion_programa_facultad(facultades_data, programas_data)


def obtener_programa_a_facultad(forzar_recarga=False):
    global _ultimo_fetch_programas_ts
    if forzar_recarga:
        _cargar_programa_a_facultad_cached.clear()
    relacion = _cargar_programa_a_facultad_cached()
    if forzar_recarga or _ultimo_fetch_programas_ts == 0.0:
        _ultimo_fetch_programas_ts = time.time()
        if _contexto_app is not None:
            _contexto_app["_ultimo_fetch_programas_ts"] = _ultimo_fetch_programas_ts
    return dict(relacion)


def mat_obtener_facultad_de_programa(programa, programa_a_facultad):
    if pd.isna(programa) or not isinstance(programa_a_facultad, dict):
        return None
    mat_normalizar_programa = _obtener_normalizador_programa()
    prog_norm = mat_normalizar_programa(programa)
    if not prog_norm:
        return None
    facultad = programa_a_facultad.get(prog_norm)
    if pd.isna(facultad) or not str(facultad).strip():
        return None
    return facultad
