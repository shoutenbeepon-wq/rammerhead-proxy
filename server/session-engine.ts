import { randomBytes } from 'crypto';

/**
 * Rammerhead風のセッション管理エンジン
 * 
 * 機能:
 * - セッション作成・管理
 * - Cookie/LocalStorageの同期
 * - ブラウザフィンガープリント管理
 * - 複数デバイス対応
 */

export interface SessionData {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  cookies: Record<string, string>;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  browserFingerprint: BrowserFingerprint;
  customProxy?: string;
  requestHistory: RequestLog[];
}

export interface BrowserFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  webGLVendor: string;
  webGLRenderer: string;
  canvas: string;
  webRTC: boolean;
}

export interface RequestLog {
  timestamp: Date;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
}

export class SessionEngine {
  private sessions: Map<string, SessionData> = new Map();
  private readonly MAX_SESSIONS = 100;
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24時間

  /**
   * 新しいセッションを作成
   */
  createSession(browserFingerprint?: Partial<BrowserFingerprint>): SessionData {
    if (this.sessions.size >= this.MAX_SESSIONS) {
      // 最も古いセッションを削除
      const oldestSession = Array.from(this.sessions.values()).reduce((prev, current) =>
        prev.lastAccessedAt < current.lastAccessedAt ? prev : current
      );
      this.sessions.delete(oldestSession.id);
    }

    const sessionId = this.generateSessionId();
    const fingerprint = this.generateBrowserFingerprint(browserFingerprint);

    const session: SessionData = {
      id: sessionId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      cookies: {},
      localStorage: {},
      sessionStorage: {},
      browserFingerprint: fingerprint,
      requestHistory: [],
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * セッションを取得
   */
  getSession(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessedAt = new Date();
      // タイムアウトチェック
      if (Date.now() - session.lastAccessedAt.getTime() > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        return undefined;
      }
    }
    return session;
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * ブラウザフィンガープリントを生成
   */
  private generateBrowserFingerprint(
    custom?: Partial<BrowserFingerprint>
  ): BrowserFingerprint {
    const browsers = [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        hardwareConcurrency: 8,
        deviceMemory: 16,
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        platform: 'MacIntel',
        hardwareConcurrency: 8,
        deviceMemory: 16,
      },
      {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        hardwareConcurrency: 4,
        deviceMemory: 8,
      },
    ];

    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const screenResolutions = ['1920x1080', '1366x768', '1440x900', '2560x1440'];
    const colorDepths = [24, 32];
    const timezones = ['UTC', 'Asia/Tokyo', 'America/New_York', 'Europe/London'];

    return {
      userAgent: custom?.userAgent || browser.userAgent,
      acceptLanguage: custom?.acceptLanguage || 'ja-JP,ja;q=0.9',
      acceptEncoding: custom?.acceptEncoding || 'gzip, deflate, br',
      timezone: custom?.timezone || timezones[Math.floor(Math.random() * timezones.length)],
      screenResolution: custom?.screenResolution || screenResolutions[Math.floor(Math.random() * screenResolutions.length)],
      colorDepth: custom?.colorDepth || colorDepths[Math.floor(Math.random() * colorDepths.length)],
      platform: custom?.platform || browser.platform,
      hardwareConcurrency: custom?.hardwareConcurrency || browser.hardwareConcurrency,
      deviceMemory: custom?.deviceMemory || browser.deviceMemory,
      webGLVendor: custom?.webGLVendor || 'Google Inc.',
      webGLRenderer: custom?.webGLRenderer || 'ANGLE (Intel HD Graphics)',
      canvas: custom?.canvas || this.generateCanvasFingerprint(),
      webRTC: custom?.webRTC ?? true,
    };
  }

  /**
   * Canvasフィンガープリントを生成
   */
  private generateCanvasFingerprint(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Cookieを設定
   */
  setCookie(sessionId: string, name: string, value: string, domain?: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    const key = domain ? `${domain}:${name}` : name;
    session.cookies[key] = value;
    return true;
  }

  /**
   * Cookieを取得
   */
  getCookie(sessionId: string, name: string, domain?: string): string | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;

    const key = domain ? `${domain}:${name}` : name;
    return session.cookies[key];
  }

  /**
   * LocalStorageを設定
   */
  setLocalStorage(sessionId: string, key: string, value: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.localStorage[key] = value;
    return true;
  }

  /**
   * LocalStorageを取得
   */
  getLocalStorage(sessionId: string, key: string): string | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;

    return session.localStorage[key];
  }

  /**
   * リクエストをログに記録
   */
  logRequest(
    sessionId: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.requestHistory.push({
      timestamp: new Date(),
      method,
      url,
      statusCode,
      duration,
    });

    // 履歴は最新1000件に制限
    if (session.requestHistory.length > 1000) {
      session.requestHistory = session.requestHistory.slice(-1000);
    }

    return true;
  }

  /**
   * セッション統計を取得
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      totalSessions: this.sessions.size,
      sessionIds: Array.from(this.sessions.keys()),
    };
  }

  /**
   * セッションを削除
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * すべてのセッションをクリア
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }

  /**
   * セッションの詳細情報を取得
   */
  getSessionDetails(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      cookieCount: Object.keys(session.cookies).length,
      localStorageCount: Object.keys(session.localStorage).length,
      requestCount: session.requestHistory.length,
      browserFingerprint: session.browserFingerprint,
      recentRequests: session.requestHistory.slice(-10),
    };
  }
}

export default SessionEngine;
