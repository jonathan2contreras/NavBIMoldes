# BIMTracker — dev notes

- Run: `docker compose -f docker-compose.base44.yml up -d`. Services: `mongo`, `backend` (FastAPI, uvicorn --reload on 8001), `frontend` (CRA/craco dev server on 3000).
- Single origin: `REACT_APP_BACKEND_URL` is empty, so the frontend calls relative `/api/...`; `frontend/src/setupProxy.js` forwards `/api` to `BACKEND_PROXY_TARGET` (http://backend:8001). A setupProxy is used instead of package.json `proxy` because `/api/viewer` is loaded as HTML in an iframe, and CRA's simple proxy won't forward `Accept: text/html` requests.
- `emergentintegrations` in requirements.txt is only on Emergent's private index and is not imported; the backend command filters it out before `pip install`.
- First backend start installs deps (~1–2 min); first frontend start runs `yarn install` (~2 min). node_modules and pip cache live in named volumes.
- `Storage init failed: 400` in backend logs is expected without a real `EMERGENT_LLM_KEY`; only photo/PDF uploads depend on it.
- Admin login needs `ADMIN_PASSWORD_HASH` (bcrypt). "Usuario" (read-only) mode works without it.
- Verify: `curl localhost:3000/api/` → `{"message":"BIMTracker API",...}`. The 3D viewer is WebGL (blank in screenshots).
- Tests: `docker compose -f docker-compose.base44.yml exec backend pytest` (tests expect a running backend).
