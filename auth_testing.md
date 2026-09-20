# Pruebas de acceso — BIMTracker

La autenticación existente no se ha modificado al añadir Cronograma. Las credenciales vigentes están en `/app/memory/test_credentials.md`.

## Comportamiento esperado
- Administrador: inicio mediante contraseña compartida; token Bearer emitido por `POST /api/admin/verify`.
- Usuario: acceso de lectura, sin formularios de mutación.
- La verificación de permisos de escritura siempre es del servidor (`require_admin`), no solo de la interfaz.
- `GET /api/schedule` es público. `POST /api/schedule/save`, `/generate`, `/fill` y `PATCH /api/schedule/panel` requieren el token de administrador, igual que las otras escrituras protegidas existentes.
- Salir elimina la sesión local y devuelve a `/login`.

## Evidencia y alcance
- `/app/backend/tests/test_schedule_iter16.py` comprueba GET público y escritura sin token rechazada (401), además de validaciones y concurrencia del cronograma.
- `/app/test_reports/layout_reports_relocation.md` documenta acceso de ambos roles, visibilidad de controles y cierre de sesión.
- Las observaciones preexistentes de refuerzo del acceso (limitación de intentos/CORS) siguen en el backlog de PRD; esta documentación no representa una auditoría de seguridad ni una implementación de esos cambios.
- Las pruebas deben preservar registros de usuario y restaurar exactamente cualquier documento temporal de planificación.