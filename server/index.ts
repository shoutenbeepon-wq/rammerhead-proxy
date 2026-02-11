import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import ProxyServer from "./proxy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // JSON パーサー
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // プロキシAPI エンドポイント
  app.post("/api/proxy", (req, res) => {
    const { targetUrl, headers, userAgent } = req.body;

    if (!targetUrl) {
      res.status(400).json({ error: "targetUrl is required" });
      return;
    }

    try {
      // URLの検証
      new URL(targetUrl);

      // プロキシサーバーの作成
      const proxyServer = new ProxyServer({
        targetUrl,
        headers,
        userAgent,
      });

      // リクエストをプロキシに転送
      proxyServer.handleRequest(req, res);
    } catch (error) {
      res.status(400).json({ error: "Invalid URL", details: String(error) });
    }
  });

  // プロキシGETエンドポイント（URLクエリパラメータから）
  app.get("/proxy", (req, res) => {
    const { url, userAgent } = req.query;

    if (!url) {
      res.status(400).json({ error: "url query parameter is required" });
      return;
    }

    try {
      const targetUrlStr = typeof url === "string" ? url : Array.isArray(url) ? String(url[0]) : String(url);
      new URL(targetUrlStr);

      const proxyServer = new ProxyServer({
        targetUrl: targetUrlStr,
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
      });

      proxyServer.handleRequest(req, res);
    } catch (error) {
      res.status(400).json({ error: "Invalid URL", details: String(error) });
    }
  });

  // プロキシPOSTエンドポイント（ボディから）
  app.post("/proxy", (req, res) => {
    const { url, userAgent, headers } = req.body;

    if (!url) {
      res.status(400).json({ error: "url is required in request body" });
      return;
    }

    try {
      new URL(url);

      const proxyServer = new ProxyServer({
        targetUrl: url,
        userAgent,
        headers,
      });

      proxyServer.handleRequest(req, res);
    } catch (error) {
      res.status(400).json({ error: "Invalid URL", details: String(error) });
    }
  });

  // ヘルスチェック
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Proxy API available at http://localhost:${port}/proxy`);
  });
}

startServer().catch(console.error);
