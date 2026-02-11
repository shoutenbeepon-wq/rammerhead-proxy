import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import ProxyServer from "./proxy";
import SessionEngine from "./session-engine";
import BrowserEmulator from "./browser-emulator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // セッションエンジンとブラウザエミュレーターを初期化
  const sessionEngine = new SessionEngine();
  const browserEmulator = new BrowserEmulator();

  // JSON パーサー
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // セッション作成エンドポイント
  app.post("/api/sessions", (req, res) => {
    try {
      const session = sessionEngine.createSession();
      res.json({
        sessionId: session.id,
        browserFingerprint: session.browserFingerprint,
        createdAt: session.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // セッション情報取得エンドポイント
  app.get("/api/sessions/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const details = sessionEngine.getSessionDetails(sessionId);

    if (!details) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json(details);
  });

  // セッション統計エンドポイント
  app.get("/api/sessions", (req, res) => {
    res.json(sessionEngine.getStats());
  });

  // プロキシAPI エンドポイント
  app.post("/api/proxy", (req, res) => {
    const { targetUrl, sessionId, headers, userAgent } = req.body;

    if (!targetUrl) {
      res.status(400).json({ error: "targetUrl is required" });
      return;
    }

    try {
      // URLの検証
      new URL(targetUrl);

      // セッション情報を取得
      let session = null;
      if (sessionId) {
        session = sessionEngine.getSession(sessionId);
        if (!session) {
          res.status(404).json({ error: "Session not found" });
          return;
        }
      }

      // プロキシサーバーの作成
      const proxyServer = new ProxyServer({
        targetUrl,
        headers,
        userAgent,
      });

      // リクエストをプロキシに転送
      proxyServer.handleRequest(req, res);

      // リクエストをログに記録
      if (sessionId) {
        const startTime = Date.now();
        res.on("finish", () => {
          const duration = Date.now() - startTime;
          sessionEngine.logRequest(
            sessionId,
            req.method || "GET",
            targetUrl,
            res.statusCode,
            duration
          );
        });
      }
    } catch (error) {
      res.status(400).json({ error: "Invalid URL", details: String(error) });
    }
  });

  // プロキシGETエンドポイント（URLクエリパラメータから）
  app.get("/proxy", (req, res) => {
    const { url, userAgent, sessionId } = req.query;

    if (!url) {
      res.status(400).json({ error: "url query parameter is required" });
      return;
    }

    try {
      const targetUrl = typeof url === "string" ? url : Array.isArray(url) ? String(url[0]) : String(url);
      new URL(targetUrl);

      const proxyServer = new ProxyServer({
        targetUrl,
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
      });

      proxyServer.handleRequest(req, res);

      if (sessionId && typeof sessionId === "string") {
        const startTime = Date.now();
        res.on("finish", () => {
          const duration = Date.now() - startTime;
          sessionEngine.logRequest(
            sessionId,
            req.method || "GET",
            targetUrl,
            res.statusCode,
            duration
          );
        });
      }
    } catch (error) {
      res.status(400).json({ error: "Invalid URL", details: String(error) });
    }
  });

  // プロキシPOSTエンドポイント（ボディから）
  app.post("/proxy", (req, res) => {
    const { url, userAgent, headers, sessionId } = req.body;

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

      if (sessionId) {
        const startTime = Date.now();
        res.on("finish", () => {
          const duration = Date.now() - startTime;
          sessionEngine.logRequest(
            sessionId,
            req.method || "POST",
            url,
            res.statusCode,
            duration
          );
        });
      }
    } catch (error) {
      res.status(400).json({ error: "Invalid URL", details: String(error) });
    }
  });

  // ブラウザエミュレーション情報エンドポイント
  app.get("/api/emulation/scripts", (req, res) => {
    const scripts = browserEmulator.getAllAntiDetectionScripts();
    res.json({ scripts });
  });

  // ヘルスチェック
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      activeSessions: sessionEngine.getStats().activeSessions,
    });
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Proxy API available at http://localhost:${port}/proxy`);
    console.log(`Session API available at http://localhost:${port}/api/sessions`);
  });
}

startServer().catch(console.error);
