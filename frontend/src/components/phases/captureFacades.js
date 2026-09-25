import { BACKEND_URL } from "../../lib/api";

/** Ask the already loaded model viewer for four full-model isometric stills. */
export function captureFacades() {
  const viewer = document.querySelector('[data-testid="model-viewer-iframe"]');
  if (!viewer?.contentWindow) return Promise.reject(new Error("El modelo 3D no está disponible."));
  const id = `facades-${Date.now()}-${Math.random()}`;
  return new Promise((resolve, reject) => {
    const origin = new URL(BACKEND_URL).origin;
    const cleanup = () => { window.removeEventListener("message", receive); clearTimeout(timer); };
    const receive = (event) => {
      if (event.source !== viewer.contentWindow || event.origin !== origin) return;
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type !== "facadeCaptures" || message.id !== id) return;
      cleanup();
      if (message.error) reject(new Error(message.error));
      else resolve(message.images);
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error("El modelo 3D aún no está listo. Espera a que cargue e inténtalo de nuevo.")); }, 30000);
    window.addEventListener("message", receive);
    viewer.contentWindow.postMessage(JSON.stringify({ __viewerCmd: true, cmd: "captureFacades", args: [id] }), origin);
  });
}
