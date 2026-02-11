import httpProxy from 'http-proxy';
import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import AdvancedProxyEngine from './proxy-advanced';

/**
 * フィルタリング回避機能を備えたHTTPプロキシサーバー
 * 
 * 機能:
 * - User-Agentの偽装
 * - リクエストヘッダーの操作
 * - URLエンコーディング
 * - CORS対応
 * - 高度なスプーフィング
 */

interface ProxyConfig {
  targetUrl: string;
  headers?: Record<string, string>;
  userAgent?: string;
  stripHeaders?: string[];
}

// デフォルトのUser-Agent一覧（フィルタリング回避用）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

// ストリップするヘッダー（プライバシーとフィルタリング回避）
const DEFAULT_STRIP_HEADERS = [
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-real-ip',
  'cf-connecting-ip',
  'cf-ray',
  'cf-ipcountry',
];

export class ProxyServer {
  private proxy: httpProxy;
  private config: ProxyConfig;
  private engine: AdvancedProxyEngine;

  constructor(config: ProxyConfig) {
    this.config = {
      userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      stripHeaders: DEFAULT_STRIP_HEADERS,
      ...config,
    };

    this.engine = new AdvancedProxyEngine();

    this.proxy = httpProxy.createProxyServer({
      changeOrigin: true,
      followRedirects: true,
      timeout: 30000,
      proxyTimeout: 30000,
    });

    this.setupProxyListeners();
  }

  private setupProxyListeners() {
    // エラーハンドリング
    (this.proxy as any).on('error', (err: any, req: any, res: any) => {
      console.error('Proxy error:', err);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });

    // プロキシレスポンスの処理
    (this.proxy as any).on('proxyRes', (proxyRes: any, req: any, res: any) => {
      // CORS対応
      proxyRes.headers['access-control-allow-origin'] = '*';
      proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
      
      // キャッシュ制御
      proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate';
      
      // セキュリティヘッダーの削除
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['x-content-type-options'];
    });
  }

  private modifyRequest(req: IncomingMessage): IncomingMessage {
    // 高度なスプーフィングを適用
    const spoofedHeaders = this.engine.fullSpoof(
      req.headers as Record<string, any>,
      this.config.targetUrl
    );

    // カスタムヘッダーの追加
    if (this.config.headers) {
      Object.entries(this.config.headers).forEach(([key, value]) => {
        spoofedHeaders[key.toLowerCase()] = value;
      });
    }

    // カスタムUser-Agentを優先
    if (this.config.userAgent) {
      spoofedHeaders['user-agent'] = this.config.userAgent;
    }

    // ヘッダーを更新
    Object.entries(spoofedHeaders).forEach(([key, value]) => {
      req.headers[key.toLowerCase()] = value;
    });

    return req;
  }

  public handleRequest(req: IncomingMessage, res: ServerResponse) {
    // CORSプリフライトリクエストの処理
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }

    // リクエストの修正
    const modifiedReq = this.modifyRequest(req);

    // ターゲットURLの構築
    const targetUrl = new URL(this.config.targetUrl);
    
    // クエリパラメータの保持
    if (req.url?.includes('?')) {
      const [path, query] = req.url.split('?');
      targetUrl.pathname = path;
      targetUrl.search = query;
    } else {
      targetUrl.pathname = req.url || '/';
    }

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${targetUrl.toString()}`);

    // プロキシリクエストの実行
    this.proxy.web(modifiedReq, res, {
      target: targetUrl.origin,
      changeOrigin: true,
    });
  }

  public handleWebSocket(req: IncomingMessage, socket: any, head: Buffer) {
    const targetUrl = new URL(this.config.targetUrl);
    targetUrl.pathname = req.url || '/';

    console.log(`[${new Date().toISOString()}] WS ${req.url} -> ${targetUrl.toString()}`);

    this.proxy.ws(req, socket, head, {
      target: targetUrl.origin,
      changeOrigin: true,
    });
  }
}

export default ProxyServer;
