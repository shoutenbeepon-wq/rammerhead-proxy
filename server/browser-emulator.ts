/**
 * 高度なブラウザエミュレーションエンジン
 * 
 * 機能:
 * - ブラウザ検出回避
 * - WebGL/Canvas指紋認証回避
 * - WebRTC漏洩防止
 * - タイミング攻撃対策
 * - ヘッダーインジェクション
 */

export class BrowserEmulator {
  /**
   * ブラウザ検出スクリプトを注入
   */
  injectAntiDetectionScript(): string {
    return `
(function() {
  // navigator.webdriver を隠す
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
  });

  // chrome プロパティを追加
  window.chrome = {
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
  };

  // plugins を偽装
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      {
        name: 'Chrome PDF Plugin',
        description: 'Portable Document Format',
      },
      {
        name: 'Chrome PDF Viewer',
        description: 'Portable Document Format',
      },
    ],
  });

  // permissions を偽装
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: Notification.permission }) :
      originalQuery(parameters)
  );

  // Headless Chrome検出を回避
  Object.defineProperty(navigator, 'headless', {
    get: () => false,
  });

  // toString をオーバーライド
  const originalToString = Function.prototype.toString;
  Function.prototype.toString = function() {
    if (this === window.navigator.permissions.query) {
      return 'function query() { [native code] }';
    }
    return originalToString.call(this);
  };

  // WebGL情報を偽装
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) {
      return 'Intel Inc.';
    }
    if (parameter === 37446) {
      return 'Intel Iris OpenGL Engine';
    }
    return getParameter.call(this, parameter);
  };

  // Canvas指紋認証を回避
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    if (this.width === 280 && this.height === 60) {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAA8CAYAAABUQnc3AAAA...';
    }
    return originalToDataURL.apply(this, arguments);
  };

  // performance.timing を偽装
  const originalNow = performance.now;
  performance.now = function() {
    return originalNow.call(this) + Math.random() * 0.1;
  };
})();
    `;
  }

  /**
   * WebRTC漏洩防止スクリプト
   */
  injectWebRTCBlocker(): string {
    return `
(function() {
  const originalRTCPeerConnection = window.RTCPeerConnection;
  
  window.RTCPeerConnection = function(...args) {
    const pc = new originalRTCPeerConnection(...args);
    
    const originalAddIceCandidate = pc.addIceCandidate;
    pc.addIceCandidate = function(candidate) {
      if (candidate && candidate.candidate && 
          (candidate.candidate.includes('srflx') || 
           candidate.candidate.includes('prflx'))) {
        return Promise.resolve();
      }
      return originalAddIceCandidate.call(this, candidate);
    };
    
    return pc;
  };

  // getUserMedia を制限
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return originalGetUserMedia.call(this, constraints).catch(() => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      });
    };
  }
})();
    `;
  }

  /**
   * タイミング攻撃対策スクリプト
   */
  injectTimingAttackProtection(): string {
    return `
(function() {
  // performance.timing を保護
  const originalPerformance = window.performance;
  const timingOffset = Math.random() * 1000;

  Object.defineProperty(window, 'performance', {
    get: function() {
      const perf = originalPerformance;
      const originalTiming = perf.timing;
      
      perf.timing = new Proxy(originalTiming, {
        get: function(target, prop) {
          if (typeof target[prop] === 'number') {
            return target[prop] + timingOffset;
          }
          return target[prop];
        }
      });
      
      return perf;
    }
  });

  // Date.now() にランダムなずれを追加
  const originalDateNow = Date.now;
  Date.now = function() {
    return originalDateNow.call(this) + Math.floor(Math.random() * 100);
  };
})();
    `;
  }

  /**
   * リクエストヘッダーを生成
   */
  generateRequestHeaders(fingerprint: any): Record<string, string> {
    return {
      'User-Agent': fingerprint.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': fingerprint.acceptLanguage,
      'Accept-Encoding': fingerprint.acceptEncoding,
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': `"${fingerprint.platform}"`,
      'Cache-Control': 'max-age=0',
      'Pragma': 'no-cache',
    };
  }

  /**
   * レスポンスヘッダーをクリーニング
   */
  cleanResponseHeaders(headers: Record<string, any>): Record<string, any> {
    const headersToRemove = [
      'x-frame-options',
      'content-security-policy',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
      'referrer-policy',
      'x-powered-by',
      'server',
      'x-aspnet-version',
      'x-runtime',
      'x-request-id',
      'x-cache',
      'x-cache-hits',
      'x-served-by',
      'x-proxy-cache',
    ];

    const cleaned = { ...headers };
    headersToRemove.forEach(header => {
      delete cleaned[header];
      delete cleaned[header.toUpperCase()];
    });

    return cleaned;
  }

  /**
   * HTMLコンテンツにスクリプトを注入
   */
  injectScriptsIntoHTML(html: string, scripts: string[]): string {
    const injectionScript = `
<script>
${scripts.join('\n')}
</script>
    `;

    // </head> の前に注入
    if (html.includes('</head>')) {
      return html.replace('</head>', injectionScript + '</head>');
    }

    // <body> の最初に注入
    if (html.includes('<body>')) {
      return html.replace('<body>', '<body>' + injectionScript);
    }

    // 最後に追加
    return html + injectionScript;
  }

  /**
   * JavaScriptコンソールエラーを隠す
   */
  injectConsoleHider(): string {
    return `
(function() {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('webdriver') || 
         args[0].includes('automation') ||
         args[0].includes('headless'))) {
      return;
    }
    return originalError.apply(console, args);
  };

  console.warn = function(...args) {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('webdriver') || 
         args[0].includes('automation'))) {
      return;
    }
    return originalWarn.apply(console, args);
  };
})();
    `;
  }

  /**
   * すべての検出回避スクリプトを結合
   */
  getAllAntiDetectionScripts(): string[] {
    return [
      this.injectAntiDetectionScript(),
      this.injectWebRTCBlocker(),
      this.injectTimingAttackProtection(),
      this.injectConsoleHider(),
    ];
  }
}

export default BrowserEmulator;
