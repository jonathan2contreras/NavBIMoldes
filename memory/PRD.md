# PRD — BIMTracker Web (versión web de la app de seguimiento de piezas sobre modelo 3D)

## Problema original
"construye la aplicacion web utilizando el archivo subido" — el archivo NavBIMTracker-main.zip contiene la app móvil Expo + backend FastAPI de BIMTracker (modelo NAB 3D.glb, 12.275 objetos, 533 paneles de fachada).

## Elecciones del usuario (junio 2026)
- Réplica completa: login por roles, visor 3D, lista de piezas, dashboard de avance y reportes PDF/Excel.
- Mismo acceso: Administrador con contraseña "admin2026" y Usuario solo lectura.
- Mismo estilo visual que la app móvil (con los 3 logos corporativos).

## Arquitectura
- **Backend (FastAPI + MongoDB)**: reutilizado tal cual del zip (`/app/backend/server.py`). Sirve el GLB (`/api/model`) y el visor three.js (`/api/viewer` → `static/viewer.html`); catálogo cacheado en `static/objects.json` (12.275), fachadas en `static/facades.json`, dimensiones en `static/dims.json`. Endpoints: GET /api/objects (search/status/facade/skip/limit), GET /api/object?name=, GET/PUT /api/tags (upsert con history + observations; borra si status null sin obs históricas), GET /api/stats (533 paneles, por_fachada), GET /api/report + /api/report/export (pdf/xlsx con membrete de logos), POST /api/admin/verify (bcrypt vs ADMIN_PASSWORD_HASH en .env, comillas simples), POST /api/facades, POST /api/dims. Colección Mongo `tags` (índice único object_name).
- **Frontend (React CRA + Tailwind, puerto 3000)**: reescrito desde Expo a React web.
  - `src/lib/api.js` (cliente fetch), `src/lib/theme.js` (STATUSES/colores/logos/helpers).
  - `src/context/RoleContext.jsx`: rol en localStorage `bim_role` ("admin"|"viewer").
  - `src/components/AppLayout.jsx`: navbar superior con tabs (Modelo 3D /, Objetos /objects, Progreso /progress) + guard de rutas; `/reports` y `/login` fuera del layout.
  - `src/pages/ViewerPage.jsx`: iframe de /api/viewer + canal postMessage (comandos {__viewerCmd:true,cmd,args}: applyTags, setTag, clearSelection, isolate, focusObject; mensajes entrantes: progress/loaded/error/select). Header glass con chips de aislamiento, banner "Pieza enfocada" (?focus=), hint, overlays de carga (con %) y error con retry.
  - `src/components/TagSheet.jsx`: panel derecho (drawer) con fachada + pieza + dimensiones, 5 pills de estado, input de notas (solo admin), timeline historial (obs anidadas bajo el estado activo), modo solo lectura para viewer.
  - `src/pages/ObjectsPage.jsx`: búsqueda con debounce 400ms, chips de estado y de fachada, lista paginada 50 con scroll infinito, botón 3D → /?focus=.
  - `src/pages/ProgressPage.jsx`: hero % avance sobre 533 paneles + 3 logos, avance por fachada N/S/E/O, grid de tarjetas por estado + Sin estado, botón Reportes, logout.
  - `src/pages/ReportsPage.jsx`: tipos semanal (instalado)/mensual/personalizado (chips estado + fachada + rango fechas), navegación de períodos con dayjs, resumen con conteos, export PDF/Excel vía anchor download.
- Colores de estado: Fabricado #007AFF, Enviado #FF9500, Instalado #34C759, Entregable #F3EAD0 (accent #8A7A50), Observaciones #FFD60A (accent #D19E00), Sin estado #B4BAC6.

## Implementado (12 junio 2026)
- [x] MVP web completo portado desde la app móvil — testeado iteration_1: backend 25/25 pytest, frontend 100%, sin issues críticos.
- [x] Login por roles con contraseña admin bcrypt (admin2026), guard de rutas, logout.
- [x] Visor 3D con etiquetado, aislamiento por estado, foco de pieza desde la lista.
- [x] Lista con filtros (estado + fachada) y búsqueda, dashboard de avance, reportes con export PDF/Excel.
- [x] Fotos de avance: adjuntar foto de obra a cada nota (TagSheet → botón "Adjuntar foto de obra", preview, miniatura en el historial). Backend: Emergent Object Storage (EMERGENT_LLM_KEY en .env), POST /api/upload (whitelist de imágenes, máx 10MB), GET /api/files/{path}, campo `photo` en observations. Registros en colección `files` (soft-delete is_deleted). Testeado iteration_2 (34/34 backend + frontend OK).
- [x] Resumen semanal en Progreso: tarjeta "INSTALACIONES SEMANALES" (esta semana vs anterior + delta), datos en `semana` de GET /api/stats (semana Lun-Dom, solo paneles de fachada).
- [x] Fix (13 jun 2026): "Instalaciones semanales" contaba eventos históricos de instalado aunque la pieza hubiera cambiado luego a otro estado (ej. fabricado). Ahora solo cuenta piezas cuyo estado ACTUAL es instalado (una vez cada una, por la fecha de su última instalación). Pendiente redeploy a producción.
- [x] Fix (13 jun 2026): "Error al calcular estadísticas" — un documento malformado en `tags` tumbaba /api/stats, /api/tags y /api/objects con 500; `fetch_tags_map` ahora salta docs inválidos con warning. Botón "Reintentar" añadido al error del dashboard (progress-retry-button). Testeado iteration_4 (51/51 backend + frontend 100%). Pendiente redeploy a producción.
- [x] Superficie en m² en el TagSheet debajo de las dimensiones (`formatArea`: max(sx,sz) × sy, conversión mm→m si >100).
- [x] Galería de fotos de obra: nueva pestaña "Fotos" (/photos) con grid de tarjetas, chips de fachada, filtro por rango de fechas y lightbox. Endpoint GET /api/photos?facade&from&to (recorre observations con photo, orden fecha desc). Testeado iteration_3 (40/40 backend + frontend OK).
- [x] Dedup de códigos de objeto en la UI: "C1 C1 [6420986]" se muestra como "C1 [6420986]" (helper `displayName` en frontend: ObjectsPage/TagSheet/ReportsPage/Viewer banner/PhotosPage; `display_name` en backend solo para exports PDF/Excel). La API mantiene los nombres originales (claves estables).
- [x] (1 sep 2026) Miniatura 3D del panel en el TagSheet (sustituye al icono cuadrado): canvas 80×80 con el panel girando (three.js 0.160, gris neutro con aristas). Al pulsarla → pantalla completa (`PanelFullscreen`, z-60) con OrbitControls (gira solo hasta interactuar; arrastrar/rueda/pinza), cabecera con Código del panel, Fachada, Ancho, Alto y Superficie m²; cierre con botón o Escape. Backend: `GET /api/object/mesh?name=` extrae la geometría del nodo del GLB (JSON chunk indexado al arranque + mmap del binario, transformación mundo por cadena de padres, centrado, cache 200 items). Componentes en `src/components/panel3d/`. Testeado iteration_5 (backend 51/51 + 6 nuevos, frontend OK).
- [x] (2 sep 2026) Pantalla completa del panel: etiqueta superior fijada en estilo **Minimalista** (opción E elegida por el usuario entre 6 variantes): código grande con punto de color del estado, y línea "Fachada X · ancho × alto m · m² · estado". Sin tarjeta. Eliminado el aviso inferior "Arrastra para rotar". Verificado con screenshot.
- [x] (4 sep 2026) Borrar fotos en la galería (solo admin): icono papelera al pasar sobre la tarjeta y botón "Eliminar foto" en el lightbox con confirmación inline. Backend `DELETE /api/photos?object_name=&photo=`: quita el campo `photo` de la observación (borra la observación si no tenía texto; borra el tag si queda sin estado ni observaciones), marca `files.is_deleted=true` (el archivo deja de servirse, 404). Verificado con curl + screenshot.
- [x] (4 sep 2026) **P0 — Protección de escritura server-side (JWT)**: al verificar la contraseña admin, `POST /api/admin/verify` devuelve `{ok:true, token}` (JWT HS256, 30 días, `JWT_SECRET` en .env). El token se guarda en localStorage `bim_token` y se envía como `Authorization: Bearer` en todas las escrituras. Dependencia `require_admin` protege `PUT /api/tags`, `POST /api/upload`, `DELETE /api/photos`, `POST /api/facades`, `POST /api/dims` (401 sin token / caducado, 403 sin rol admin). Frontend: `authHeaders()` en `api.js`, `setRole(role, token)` en RoleContext. Testeado iteration_6 (11/11 backend + 4/4 flujos frontend, 100%).
- [x] (4 sep 2026) **P1 — Fotos en reportes PDF**: `build_report` devuelve además la lista `photos` (observaciones con foto dentro de la fachada+rango de fechas); `make_pdf` embebe una sección "Fotos de obra" con miniaturas (grid 3 col, máx 60) descargadas de Object Storage, con pie de foto (fachada · pieza · fecha · nota). El XLSX no incluye fotos. Testeado iteration_6.
- [x] (4 sep 2026) **P2 — Ir a la pieza desde la galería**: botón "Ir a la pieza" (`photo-goto-piece-button`) en el lightbox de Fotos → hace `GET /api/object` y abre el `TagSheet` de esa pieza (al guardar, refresca la galería). Testeado iteration_6.
- [x] (4 sep 2026) **Reubicación de logos corporativos**: eliminados los 3 logos de `LoginPage.jsx` (pantalla de inicio de sesión ahora limpia, solo header + opciones de rol). Añadidos a `ViewerPage.jsx` en la pantalla de carga del modelo (`viewer-loading`): posición vertical, tarjetas iguales (84×240px, borde + fondo blanco para contraste) y equidistantes (gap-6), sobre el spinner "Cargando modelo BIM...". Confirmado con el usuario vía screenshot (aprobado, opción "a").

## Backlog priorizado
- P2: migrar @app.on_event a lifespan handlers de FastAPI.
- P2: interceptor 401 en frontend → limpiar `bim_token` y redirigir a /login cuando el JWT de 30 días caduque (hoy daría 401 silenciosos).
- P2: refactor de server.py (~980 líneas): extraer make_pdf/make_xlsx y helpers de storage a módulos.
- P2: multiusuario / exportar CSV.

## Notas técnicas
- No modificar MONGO_URL/DB_NAME. GLB en `/app/backend/static/nab3d.glb`; si se reemplaza, borrar `objects.json` para regenerar catálogo.
- Logos en `/app/frontend/public/logo_*.png` y en `/app/backend/static/` (membrete PDF).
- El visor tarda 30-90s en cargar (GLB 57MB) con barra de progreso.
- Suite de tests backend: `/app/backend/tests/backend_test.py`.
