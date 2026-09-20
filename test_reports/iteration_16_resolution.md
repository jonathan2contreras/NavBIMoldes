# Resolución final — Cronograma (20 septiembre 2026)

El JSON de iteration_16 conserva el hallazgo inicial. Se corrigieron los fallos antes de entregar.

## Correcciones
- Alias `CalendarDate` en `scheduling/models.py` elimina el sombreado del tipo en `MoveRequest.date`. ISO válido ahora es aceptado; `date:null` quita la programación; omitir `date` ya no puede quitarla accidentalmente.
- `lib/api.js` convierte errores de validación estructurados en mensajes de campo en español. Los conflictos del motor mantienen sus mensajes explicativos específicos.
- `/app/auth_testing.md` documenta acceso actual y alcance de las pruebas. No se modificó autenticación.

## Backend
`pytest tests/test_schedule_iter16.py -q --junitxml=/app/test_reports/pytest/iter16_schedule_fixed.xml`: **23 passed**.

Validados fechas legales, conflictos de molde/capacidad, domingos, antes de inicio/fuera de horizonte, revisión obsoleta/concurrente, guardado, generación, completar pendientes, invariantes de recursos y preservación de datos base. Build React posterior correcto.

## Navegador: retest de flujos afectados
- Guardar propuesta inicial mediante la UI.
- Quitar un panel M-03 del 2 noviembre y arrastrar físicamente con ratón otro M-03 del 3 al 2: PATCH 200, fecha persistida correcta.
- Añadir el panel pendiente al 3 noviembre: capacidad válida, pendientes vuelve a cero.
- Intentar moverlo al 2 ocupado: PATCH 409, mensaje español de molde ocupado; ninguna fecha sustituida.
- Mover mediante selector a 21 mayo 2027: PATCH 200 y fin previsto actualizado.
- Quitar y completar pendientes: todas las fechas de las piezas previamente fijas permanecen idénticas.
- Cambiar capacidad a 2: cancelar conserva 5; confirmar guarda 2 y persiste tras recarga.
- Usuario solo lectura sin controles de edición. Ambos roles: anchos 320/768/1024/1440/1920 sin scroll horizontal de página; timeline/nav tienen scroll interno.

Captura del retest (con capacidad **temporal de prueba** 2): `/tmp/schedule-final-flow-verified.jpg`.
Log: `/root/.emergent/automation_output/20260920_172247/console_20260920_172247.log`.

## Restauración
Se respaldó y restauró exactamente el documento original, que no existía: eliminado exclusivamente el cronograma temporal de pruebas. Propuesta actual: revisión 0, sin guardar, inicio 2026-11-01, capacidad 5, 526 piezas, fin 2027-05-20. Comparación de `/api/report/molds` antes/después: piezas y asignaciones intactas; total manual del usuario **526** y timestamp sin modificaciones. No existen APIs de producto simuladas.

**Estado: todos los fallos nuevos corregidos y verificados.**