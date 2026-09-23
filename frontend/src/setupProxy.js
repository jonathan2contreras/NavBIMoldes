// Dev-only: proxy /api to the backend when BACKEND_PROXY_TARGET is set
// (used by docker-compose.base44.yml so the app runs on a single origin).
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  const target = process.env.BACKEND_PROXY_TARGET;
  if (!target) return;
  app.use(createProxyMiddleware("/api", { target, changeOrigin: true }));
};
