# Resolución posterior a iteration_15 — 9 septiembre 2026

El informe JSON conserva los hallazgos originales de las pruebas. El único fallo nuevo, recorte del loader en 320×520, se corrigió posteriormente.

## Ajuste
- `ViewerLoading.jsx` y `viewer-loading.css`: container queries por altura para ajustar proporcionalmente el ancho de los tres logos, reducir espacios y ocultar únicamente el aviso secundario del tamaño del archivo en alturas reducidas.
- No se modificó el backend después de sus 19 pruebas correctas.

## Retest directo con Playwright
Se mantuvo temporalmente en espera la petición real de `/api/model` para medir los elementos antes de que se desmontase el loader; luego se reanudó la descarga auténtica.

| Vista | Centro del grupo / altura del visor | Ancho común de logos | Recortes/desbordamiento |
|---|---|---|---|
| 320×520 | 0.350 | 133 px | Ninguno |
| 320×800 | 0.350 | 230 px | Ninguno |
| 768×800 | 0.350 | 230 px | Ninguno |
| 1024×800 | 0.350 | 230 px | Ninguno |
| 1440×800 | 0.350 | 230 px | Ninguno |
| 1920×800 | 0.350 | 230 px | Ninguno |

Tres imágenes cargadas en todos los tamaños, proporciones naturales conservadas (tolerancia <1 px), sin scroll horizontal. El modelo 3D finalizó su carga después de reanudar la solicitud. Captura: `/tmp/loader-final-verified.jpg`. Log: `/root/.emergent/automation_output/20260909_170903/console_20260909_170903.log`.

Comparación final de API frente a instantánea previa: paneles y asignaciones intactos. Configuración de prueba restaurada al estado previo sin total manual (533/526/7, is_manual=false).

**Estado final: fallo del loader corregido y verificado; sin defectos funcionales nuevos abiertos.**