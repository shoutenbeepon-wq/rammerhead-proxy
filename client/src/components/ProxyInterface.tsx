import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Copy, Loader2, CheckCircle2, Settings2, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  contentType: string;
}

export default function ProxyInterface() {
  const [targetUrl, setTargetUrl] = useState('https://example.com');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [customHeaders, setCustomHeaders] = useState('');
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [responseTime, setResponseTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [proxyChain, setProxyChain] = useState('');
  const [rateLimit, setRateLimit] = useState('500');

  const parseHeaders = (headerString: string): Record<string, string> => {
    const headers: Record<string, string> = {};
    headerString.split('\n').forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        headers[key] = value;
      }
    });
    return headers;
  };

  const handleProxyRequest = async () => {
    if (!targetUrl.trim()) {
      toast.error('ターゲットURLを入力してください');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...parseHeaders(customHeaders),
      };

      const payload: any = {
        url: targetUrl,
      };

      if (customUserAgent) {
        payload.userAgent = customUserAgent;
      }

      if (Object.keys(headers).length > 1) {
        payload.headers = headers;
      }

      if (method === 'POST' && requestBody) {
        payload.body = requestBody;
      }

      // レート制限を適用
      if (advancedMode && rateLimit) {
        await new Promise(resolve => setTimeout(resolve, parseInt(rateLimit)));
      }

      const response = await fetch('/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseTime = Date.now() - startTime;
      setResponseTime(responseTime);

      const contentType = response.headers.get('content-type') || 'text/plain';
      const body = await response.text();

      setResponse({
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        contentType,
      });

      if (response.ok) {
        toast.success(`リクエスト成功 (${responseTime}ms)`);
      } else {
        toast.warning(`ステータス: ${response.status}`);
      }
    } catch (error) {
      toast.error(`エラー: ${String(error)}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('コピーしました');
  };

  const formatJson = (str: string): string => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const insertSampleUserAgent = () => {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    setCustomUserAgent(agents[Math.floor(Math.random() * agents.length)]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">🌐</div>
            <h1 className="text-4xl font-bold text-slate-900">
              CodeSandbox Web Proxy
            </h1>
          </div>
          <p className="text-lg text-slate-600">
            高度なフィルタリング回避機能付きのHTTPプロキシサーバー
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* リクエストパネル */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>リクエスト設定</CardTitle>
                  <CardDescription>
                    プロキシ経由でリクエストを送信
                  </CardDescription>
                </div>
                <Button
                  variant={advancedMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAdvancedMode(!advancedMode)}
                  className="gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  {advancedMode ? '詳細' : '基本'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ターゲットURL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ターゲットURL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* HTTPメソッド */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    HTTPメソッド
                  </label>
                  <div className="flex gap-2">
                    {(['GET', 'POST'] as const).map((m) => (
                      <Button
                        key={m}
                        variant={method === m ? 'default' : 'outline'}
                        onClick={() => setMethod(m)}
                        className="flex-1"
                      >
                        {m}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* カスタムUser-Agent */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      カスタムUser-Agent（オプション）
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={insertSampleUserAgent}
                      className="text-xs"
                    >
                      ランダム挿入
                    </Button>
                  </div>
                  <Input
                    type="text"
                    placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
                    value={customUserAgent}
                    onChange={(e) => setCustomUserAgent(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>

                {/* カスタムヘッダー */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    カスタムヘッダー（オプション）
                  </label>
                  <Textarea
                    placeholder="Authorization: Bearer token&#10;X-Custom-Header: value"
                    value={customHeaders}
                    onChange={(e) => setCustomHeaders(e.target.value)}
                    rows={3}
                    className="w-full text-sm font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    形式: Header-Name: value（1行に1つ）
                  </p>
                </div>

                {/* 詳細設定 */}
                {advancedMode && (
                  <>
                    {/* レート制限 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        リクエスト間隔（ミリ秒）
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="5000"
                        step="100"
                        value={rateLimit}
                        onChange={(e) => setRateLimit(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        検出回避のためのリクエスト遅延
                      </p>
                    </div>

                    {/* プロキシチェーン */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        プロキシチェーン（オプション）
                      </label>
                      <Textarea
                        placeholder="proxy1.example.com:8080&#10;proxy2.example.com:8080"
                        value={proxyChain}
                        onChange={(e) => setProxyChain(e.target.value)}
                        rows={2}
                        className="w-full text-sm font-mono"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        複数のプロキシを経由（1行に1つ）
                      </p>
                    </div>
                  </>
                )}

                {/* リクエストボディ */}
                {method === 'POST' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      リクエストボディ（オプション）
                    </label>
                    <Textarea
                      placeholder='{"key": "value"}'
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={4}
                      className="w-full text-sm font-mono"
                    />
                  </div>
                )}

                {/* 送信ボタン */}
                <Button
                  onClick={handleProxyRequest}
                  disabled={loading}
                  className="w-full h-10 text-base font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      リクエストを送信
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 機能説明 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">🛡️ フィルタリング回避機能</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-slate-900">基本機能</h4>
                    <ul className="space-y-1 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>User-Agentの自動偽装</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>追跡ヘッダーの削除</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>CORS対応</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-slate-900">詳細機能</h4>
                    <ul className="space-y-1 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>リファラー偽装</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>セキュリティヘッダー除去</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>レート制限対応</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* レスポンスパネル */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">レスポンス</CardTitle>
                {response && (
                  <CardDescription>
                    ステータス: {response.status} ({responseTime}ms)
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {response ? (
                  <Tabs defaultValue="body" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="body">ボディ</TabsTrigger>
                      <TabsTrigger value="headers">ヘッダー</TabsTrigger>
                    </TabsList>

                    <TabsContent value="body" className="space-y-2">
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                          {formatJson(response.body).substring(0, 5000)}
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(response.body)}
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="headers" className="space-y-2">
                      <div className="bg-slate-50 p-3 rounded text-xs space-y-1 max-h-96 overflow-auto">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="font-mono">
                            <span className="text-blue-600 font-semibold">{key}:</span>
                            <span className="text-slate-700 ml-2 break-all">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">リクエストを送信してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 注意事項 */}
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">⚠️ 免責事項</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-800">
            <p>
              このプロキシサーバーは教育目的で提供されています。
              ユーザーは自身の責任において使用してください。
              違法なコンテンツへのアクセスや、他者のシステムへの不正アクセスは禁止されています。
            </p>
          </CardContent>
        </Card>

        {/* APIドキュメント */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">📚 APIドキュメント</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">POST /proxy</h4>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-auto">
{`{
  "url": "https://example.com",
  "userAgent": "Custom User-Agent",
  "headers": {
    "Authorization": "Bearer token"
  }
}`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">GET /proxy?url=&lt;URL&gt;</h4>
              <p className="text-sm text-slate-600">
                クエリパラメータでURLを指定してプロキシリクエスト
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
