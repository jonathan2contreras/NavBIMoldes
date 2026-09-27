# NaBiMoldes (BIMTracker)

## Despliegue en un VPS con Docker

Stack de producción (`deploy/docker-compose.prod.yml`):
- **Caddy**: es el único servicio con puertos públicos (80/443) y saca y renueva solo el certificado HTTPS con Let's Encrypt.
- **frontend**: la app React compilada, servida por nginx.
- **backend**: FastAPI, accesible en `/api` del mismo dominio.
- **MongoDB**: con usuario y contraseña, solo accesible dentro de la red interna de Docker.

> ⚠️ La app no tiene login: cualquiera que abra la URL puede ver y editar los datos.

### 1. Preparar el servidor
- VPS Linux con al menos 2 GB de RAM (el backend carga en memoria el modelo 3D de ~58 MB).
- Instalar Docker y el plugin Compose: `curl -fsSL https://get.docker.com | sh`
- Crear un registro DNS **A** del dominio apuntando a la IP del VPS.
- Abrir los puertos 80 y 443 en el firewall.

### 2. Configurar
```bash
git clone <url-del-repo> nabimoldes && cd nabimoldes
cp deploy/.env.example deploy/.env
nano deploy/.env   # deploy/.env está en .gitignore
```

| Variable | Qué es |
|---|---|
| `DOMAIN` | Dominio público, sin `https://` (ej. `moldes.tuempresa.com`) |
| `ACME_EMAIL` | Email para avisos de Let's Encrypt |
| `MONGO_USER` / `MONGO_PASSWORD` | Credenciales internas de Mongo (`openssl rand -hex 24`) |
| `DB_NAME` | Nombre de la base de datos (por defecto `bimtracker`) |
| `EMERGENT_LLM_KEY` | Opcional: habilita la subida de fotos/PDF |

### 3. Arrancar
```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
docker compose -f deploy/docker-compose.prod.yml ps      # todos "Up", backend "healthy"
```
El primer arranque tarda unos minutos (build + carga del modelo 3D). Luego abre `https://TU_DOMINIO`.

### Actualizar
```bash
git pull
docker compose -f deploy/docker-compose.prod.yml up -d --build
```
No uses `down -v`: borra el volumen de la base de datos. Si cambias `DOMAIN` hay que reconstruir (`--build`), porque la URL se incrusta en el frontend.

### Copias de seguridad
```bash
source deploy/.env
docker compose -f deploy/docker-compose.prod.yml exec -T mongo \
  mongodump -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin --archive --gzip > backup-$(date +%F).gz
# Restaurar:
docker compose -f deploy/docker-compose.prod.yml exec -T mongo \
  mongorestore -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin --archive --gzip < backup-AAAA-MM-DD.gz
```

### Logs
```bash
docker compose -f deploy/docker-compose.prod.yml logs -f backend caddy
```
