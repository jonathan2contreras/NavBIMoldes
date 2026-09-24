# Base44 dev notes — BIMTracker

- Stack: FastAPI backend (`backend/server.py`, port 8001) + CRA/craco React frontend (port 3000) + MongoDB. Run with `docker compose -f docker-compose.base44.yml up -d`.
- Wiring is separate-origin: the frontend calls `REACT_APP_BACKEND_URL=https://8001-$BASE44_PUBLIC_HOST_SUFFIX`. CORS is `*` and auth uses Bearer tokens (localStorage), so no cookies are involved.
- Backend install skips `emergentintegrations` and `litellm` from requirements.txt (private Emergent index, not imported by the code). Deps live in the `backend-venv` volume; first boot takes ~2 min.
- `backend/static/nab3d.glb` (~58MB) is loaded at startup; "Loaded 12275 objects" in backend logs means startup is OK.
- "Storage init failed: 400" in logs is expected until `EMERGENT_LLM_KEY` is set; only photo/PDF uploads depend on it.
- Admin login checks the password against `ADMIN_PASSWORD_HASH` (bcrypt). The "Usuario" role needs no password.
- `@emergentbase/visual-edits` is optional in craco.config.js; webpack "Compilation.assets" deprecation warnings are harmless.
- Fabrication phases (`backend/scheduling/phases.py`, Mongo `fabrication_phases`): fronts + Monday-based weeks, items kept in selection order. Phase weeks are ON-SITE INSTALLATION weeks; the schedule is FABRICATION. When the list is non-empty the scheduler fabricates only listed panels from the schedule start date, ordered by installation week then list order (no week window constraint); `phase_late` counts panels fabricated on/after their installation Monday. Panel m² = `dims[1] * max(dims[0], dims[2])` from `dims.json` (Y is height).
- Tests: `docker compose -f docker-compose.base44.yml exec backend /venv/bin/pytest tests` (some tests expect an admin password).
