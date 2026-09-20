# Resolución — Cronograma estricto por modelo 3D

Fecha: 20 septiembre 2026. Se conserva el informe JSON original como registro de los hallazgos iniciales.

## Resultado de pruebas principales
- Suite `backend/tests/test_schedule_strict_iter17.py`: **7/7 correctas**.
- Invariantes reales: 526 paneles, 7 grupos de cota inferior, 24 tramos, 311 jornadas, fin 2027-10-29. PB Oeste antes de PB Norte y antes de Planta 1; orden horario interno; una planta/fachada por día; máximo un panel/molde/día; domingos excluidos.
- No se confunden niveles inferidos por base geométrica con metadatos BIM: el archivo no trae nombres de plantas.

## Corrección del único fallo nuevo detectado
`DayDetails.jsx`: opciones de pendientes convertidas a una única cadena dinámica. El procesamiento de múltiples nodos JSX inyectaba un elemento `span` dentro de un `option` nativo.

Retest con navegador real:
- Quitar la primera pieza, buscar «planta baja», inspeccionar todas las opciones (ningún elemento hijo) y reponer la pieza en su fecha original: sin errores de página, consola o hidratación.
- Tramos desplegados a 320/768/1024/1440/1920: sin desbordamiento horizontal de página. Pulsar PB Norte cambia la jornada seleccionada a 2026-11-16 y muestra Norte en el detalle.
- Cambiar la primera pieza a 2028-01-03: 409 específico del recorrido, sin cambiar su fecha ni otras piezas. La entrada HTTP409 esperada de esta prueba no es un error de renderizado.

## Confirmación de planes anteriores
Se respaldó el cronograma original y se preparó exclusivamente un documento temporal de planificación libre con revisión 21:
- GET mantuvo todas sus fechas/configuración; mostró `needs_replan` y deshabilitó edición parcial.
- Cancelar **Aplicar orden estricto** dejó la respuesta idéntica, incluyendo revisión y timestamp.
- Confirmar generó revisión 22 y estrategia estricta, preservando fecha inicial y capacidad, sin modificar tags/moldes/proyecto.
- Estado original restaurado exactamente después del retest: documento de usuario ausente, propuesta estricta sin guardar, revisión 0, 5/día, 526 programados y fin 2027-10-29.

Comparación completa de `/api/report/molds` antes/después: piezas y configuración del proyecto intactas (total manual526). Ninguna integración de producto simulada.

## Referencias
- Captura inicial: `/tmp/strict-schedule-smoke.jpg`.
- Log retest: `/root/.emergent/automation_output/20260920_175219/console_20260920_175219.log`.
- Las observaciones de auth/CORS del informe corresponden al backlog preexistente, no a fallos nuevos de Cronograma. La aplicación conserva su contrato JWT Bearer actual; no se implementó ni prometió migración a cookies.

**Estado final: selector corregido y verificado; sin defectos funcionales nuevos abiertos del recorrido estricto.**