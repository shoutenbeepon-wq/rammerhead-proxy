import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

/**
 * 高度なフィルタリング回避機能
 * 
 * 実装機能:
 * - User-Agentローテーション
 * - ヘッダー操作とスプーフィング
 * - リクエストの遅延とランダム化
 * - キャッシュバスティング
 * - IPローテーション対応
 */

// ブラウザUser-Agent一覧
export const BROWSER_USER_AGENTS = {
  chrome: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
  firefox: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  ],
  safari: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  ],
  edge: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  ],
};

// トラッキング関連ヘッダー
export const TRACKING_HEADERS = [
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-real-ip',
  'cf-connecting-ip',
  'cf-ray',
  'cf-ipcountry',
  'x-client-ip',
  'x-originating-ip',
  'x-cluster-client-ip',
  'x-forwarded-server',
  'x-forwarded-by',
  'x-forwarded-for-original',
  'x-original-forwarded-for',
];

// セキュリティ関連ヘッダー（削除対象）
export const SECURITY_HEADERS = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'x-xss-protection',
  'strict-transport-security',
  'referrer-policy',
];

// リファラーポリシー
export const REFERRER_POLICIES = [
  'no-referrer',
  'no-referrer-when-downgrade',
  'same-origin',
  'origin',
  'strict-origin',
  'origin-when-cross-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url',
];

export class AdvancedProxyEngine {
  private requestCount = 0;
  private lastRequestTime = 0;

  /**
   * ランダムなUser-Agentを取得
   */
  getRandomUserAgent(): string {
    const allAgents = Object.values(BROWSER_USER_AGENTS).flat();
    return allAgents[Math.floor(Math.random() * allAgents.length)];
  }

  /**
   * 特定のブラウザのUser-Agentを取得
   */
  getUserAgentForBrowser(browser: keyof typeof BROWSER_USER_AGENTS): string {
    const agents = BROWSER_USER_AGENTS[browser];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  /**
   * リクエストヘッダーをスプーフィング
   */
  spoofHeaders(headers: Record<string, any>): Record<string, any> {
    const spoofed = { ...headers };

    // User-Agent
    spoofed['user-agent'] = this.getRandomUserAgent();

    // Accept-Language
    const languages = ['ja-JP,ja;q=0.9', 'en-US,en;q=0.9', 'en-GB,en;q=0.9'];
    spoofed['accept-language'] = languages[Math.floor(Math.random() * languages.length)];

    // Accept-Encoding
    spoofed['accept-encoding'] = 'gzip, deflate, br';

    // Accept
    spoofed['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';

    // DNT（Do Not Track）
    spoofed['dnt'] = '1';

    // Sec-Fetch-*
    spoofed['sec-fetch-dest'] = 'document';
    spoofed['sec-fetch-mode'] = 'navigate';
    spoofed['sec-fetch-site'] = 'none';
    spoofed['sec-fetch-user'] = '?1';

    // Sec-CH-UA
    spoofed['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120"';
    spoofed['sec-ch-ua-mobile'] = '?0';
    spoofed['sec-ch-ua-platform'] = '"Windows"';

    return spoofed;
  }

  /**
   * トラッキングヘッダーを削除
   */
  removeTrackingHeaders(headers: Record<string, any>): Record<string, any> {
    const cleaned = { ...headers };
    TRACKING_HEADERS.forEach(header => {
      delete cleaned[header];
      delete cleaned[header.toUpperCase()];
    });
    return cleaned;
  }

  /**
   * セキュリティヘッダーを削除
   */
  removeSecurityHeaders(headers: Record<string, any>): Record<string, any> {
    const cleaned = { ...headers };
    SECURITY_HEADERS.forEach(header => {
      delete cleaned[header];
      delete cleaned[header.toUpperCase()];
    });
    return cleaned;
  }

  /**
   * キャッシュバスティングパラメータを追加
   */
  addCacheBustingParams(url: string): string {
    const urlObj = new URL(url);
    // ランダムなタイムスタンプを追加
    urlObj.searchParams.set('_cache_bust', Date.now().toString());
    urlObj.searchParams.set('_rand', Math.random().toString(36).substring(7));
    return urlObj.toString();
  }

  /**
   * リクエストを遅延させる（検出回避）
   */
  async addRandomDelay(minMs: number = 100, maxMs: number = 1000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * リクエストレート制限を適用
   */
  async applyRateLimit(minInterval: number = 500): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      await this.addRandomDelay(minInterval - timeSinceLastRequest, minInterval);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * リファラーを生成
   */
  generateReferer(targetUrl: string): string {
    const url = new URL(targetUrl);
    const domain = url.hostname;

    // 同じドメインからのリファラーを生成
    const paths = ['/', '/search', '/page', '/index.html'];
    const path = paths[Math.floor(Math.random() * paths.length)];

    return `https://${domain}${path}`;
  }

  /**
   * プロキシチェーンを構築（複数のプロキシを経由）
   */
  buildProxyChain(proxies: string[]): string[] {
    return proxies.sort(() => Math.random() - 0.5);
  }

  /**
   * リクエスト統計を取得
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
    };
  }

  /**
   * 完全なリクエストスプーフィング
   */
  fullSpoof(headers: Record<string, any>, targetUrl: string): Record<string, any> {
    let spoofed = this.spoofHeaders(headers);
    spoofed = this.removeTrackingHeaders(spoofed);
    spoofed = this.removeSecurityHeaders(spoofed);

    // リファラーを設定
    spoofed['referer'] = this.generateReferer(targetUrl);

    // その他のスプーフィング
    spoofed['upgrade-insecure-requests'] = '1';
    spoofed['cache-control'] = 'max-age=0';
    spoofed['pragma'] = 'no-cache';

    return spoofed;
  }
}

export default AdvancedProxyEngine;
