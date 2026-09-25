"""Portable database and attachment backups for local download and restore."""
import base64
import json
import logging
import re
from datetime import datetime, timezone

from bson import json_util
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response


FORMAT = "bimtracker-backup"
MAX_SIZE = 250 * 1024 * 1024
COLLECTION_NAME = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]*$")


def create_backup_router(db, static_dir, get_object, put_object, on_restore):
    router = APIRouter(prefix="/backup")
    static_files = {"facades": static_dir / "facades.json", "dims": static_dir / "dims.json"}

    @router.get("")
    async def download_backup():
        collections = {}
        for name in await db.list_collection_names():
            if name.startswith("system."):
                continue
            collections[name] = [doc async for doc in db[name].find({})]
        attachments = {}
        try:
            for record in collections.get("files", []):
                if record.get("is_deleted"):
                    continue
                path = record.get("storage_path")
                if path and path not in attachments:
                    data, content_type = get_object(path)
                    attachments[path] = {"content_type": content_type,
                                         "data": base64.b64encode(data).decode("ascii")}
        except Exception:
            logging.exception("Backup attachment download failed")
            raise HTTPException(502, "No se pudo incluir un archivo adjunto en la copia. No se descargó una copia incompleta.")
        payload = {
            "format": FORMAT, "version": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "collections": collections,
            "settings": {key: json.loads(path.read_text()) if path.exists() else {}
                         for key, path in static_files.items()},
            "attachments": attachments,
        }
        content = json_util.dumps(payload, ensure_ascii=False).encode("utf-8")
        filename = f"bimtracker_copia_{datetime.now(timezone.utc):%Y%m%d_%H%M%S}.json"
        return Response(content, media_type="application/json",
                        headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    @router.post("")
    async def restore_backup(file: UploadFile = File(...)):
        raw = await file.read(MAX_SIZE + 1)
        if len(raw) > MAX_SIZE:
            raise HTTPException(413, "El archivo supera el límite de 250 MB")
        try:
            payload = json_util.loads(raw.decode("utf-8"))
            if not isinstance(payload, dict) or payload.get("format") != FORMAT or payload.get("version") != 1:
                raise ValueError("Formato de copia desconocido")
            collections = payload["collections"]
            settings = payload["settings"]
            attachments = payload["attachments"]
            if not isinstance(collections, dict) or not collections or not all(
                isinstance(name, str) and COLLECTION_NAME.fullmatch(name) and
                isinstance(docs, list) and all(isinstance(doc, dict) and "_id" in doc for doc in docs)
                for name, docs in collections.items()
            ):
                raise ValueError("Colecciones inválidas")
            if not isinstance(settings, dict) or set(settings) != set(static_files) or not all(
                isinstance(value, dict) for value in settings.values()
            ):
                raise ValueError("Configuración inválida")
            if not isinstance(attachments, dict) or not all(
                isinstance(path, str) and isinstance(item, dict) and
                isinstance(item.get("content_type"), str) and isinstance(item.get("data"), str)
                for path, item in attachments.items()
            ):
                raise ValueError("Adjuntos inválidos")
            expected = {doc.get("storage_path") for doc in collections.get("files", [])
                        if not doc.get("is_deleted") and doc.get("storage_path")}
            if set(attachments) != expected:
                raise ValueError("Faltan archivos adjuntos")
            media = {path: base64.b64decode(item["data"], validate=True)
                     for path, item in attachments.items()}
        except (ValueError, KeyError, TypeError, UnicodeError) as exc:
            raise HTTPException(422, f"Copia de seguridad inválida: {exc}") from exc

        # Upload attachments first so an unavailable object store never erases the database.
        try:
            for path, data in media.items():
                put_object(path, data, attachments[path]["content_type"])
        except Exception:
            logging.exception("Backup attachment restore failed")
            raise HTTPException(502, "No se pudo restaurar un archivo adjunto; los datos actuales no se modificaron.")

        for name in await db.list_collection_names():
            if not name.startswith("system."):
                await db.drop_collection(name)
        for name, docs in collections.items():
            if docs:
                await db[name].insert_many(docs)
            else:
                await db.create_collection(name)
        await db.tags.create_index("object_name", unique=True)
        await db.molds.create_index("name", unique=True)
        await db.tipos.create_index("name", unique=True)
        for key, path in static_files.items():
            path.write_text(json.dumps(settings[key]))
        on_restore(settings)
        return {"restored": True, "collections": len(collections)}

    return router
