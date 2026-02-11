import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Plus,
  Trash2,
  Copy,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
  Eye,
  Code,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface Session {
  id: string;
  createdAt: string;
  lastAccessedAt: string;
  cookieCount: number;
  localStorageCount: number;
  requestCount: number;
  browserFingerprint: any;
}

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  content?: string;
  responseTime?: number;
}

export default function RammerheadBrowser() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // セッションを作成
  const createSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to create session');

      const data = await response.json();
      toast.success('セッションを作成しました');

      // 新しいセッションを取得
      const sessionDetails = await fetch(`/api/sessions/${data.sessionId}`);
      const sessionData = await sessionDetails.json();

      setSessions([...sessions, sessionData]);
      setActiveSessionId(data.sessionId);

      // 新しいタブを作成
      const newTab: BrowserTab = {
        id: `tab-${Date.now()}`,
        url: 'about:blank',
        title: 'New Tab',
        loading: false,
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    } catch (error) {
      toast.error(`エラー: ${String(error)}`);
    }
  };

  // セッションを削除
  const deleteSession = (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions.length > 1 ? sessions[0].id : null);
    }
    toast.success('セッションを削除しました');
  };

  // URLをナビゲート
  const navigateToUrl = async () => {
    if (!urlInput.trim() || !activeTabId || !activeSessionId) {
      toast.error('URLとセッションを選択してください');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: urlInput,
          sessionId: activeSessionId,
        }),
      });

      const responseTime = Date.now() - startTime;
      const content = await response.text();

      // タブを更新
      setTabs(
        tabs.map(tab =>
          tab.id === activeTabId
            ? {
                ...tab,
                url: urlInput,
                title: urlInput.split('/')[2] || urlInput,
                content,
                responseTime,
              }
            : tab
        )
      );

      toast.success(`ページを読み込みました (${responseTime}ms)`);
    } catch (error) {
      toast.error(`エラー: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 新しいタブを作成
  const createNewTab = () => {
    const newTab: BrowserTab = {
      id: `tab-${Date.now()}`,
      url: 'about:blank',
      title: 'New Tab',
      loading: false,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // タブを閉じる
  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex h-screen flex-col">
        {/* ヘッダー */}
        <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                🌐 Rammerhead
              </div>
              <span className="text-xs font-mono text-slate-400">Advanced Browser Proxy</span>
            </div>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* サイドバー */}
          <div className="w-64 border-r border-slate-700 bg-slate-800/30 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* セッション管理 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-200">セッション</h3>
                  <Button
                    onClick={createSession}
                    size="sm"
                    className="h-7 px-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => setActiveSessionId(session.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        activeSessionId === session.id
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50'
                          : 'bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="text-xs font-mono text-slate-300 truncate">
                        {session.id.substring(0, 12)}...
                      </div>
                      <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                        <div>🍪 {session.cookieCount} cookies</div>
                        <div>💾 {session.localStorageCount} items</div>
                        <div>📊 {session.requestCount} requests</div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        削除
                      </Button>
                    </div>
                  ))}
                </div>

                {sessions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">セッションを作成してください</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* アドレスバー */}
            <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm p-4">
              <div className="max-w-4xl mx-auto flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && navigateToUrl()}
                  className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                />
                <Button
                  onClick={navigateToUrl}
                  disabled={loading || !activeSessionId}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* タブバー */}
            <div className="border-b border-slate-700 bg-slate-800/30 px-4 py-2 flex items-center gap-2 overflow-x-auto">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-all ${
                    activeTabId === tab.id
                      ? 'bg-slate-700 border-b-2 border-cyan-500'
                      : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  <Globe className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-300 max-w-[100px] truncate">
                    {tab.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="text-slate-400 hover:text-red-400 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button
                onClick={createNewTab}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-slate-400 hover:text-slate-200"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* コンテンツエリア */}
            <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-800 to-slate-900">
              {activeTab ? (
                <Tabs defaultValue="preview" className="h-full flex flex-col">
                  <TabsList className="bg-slate-800/50 border-b border-slate-700 rounded-none">
                    <TabsTrigger value="preview" className="gap-2">
                      <Eye className="h-4 w-4" />
                      プレビュー
                    </TabsTrigger>
                    <TabsTrigger value="source" className="gap-2">
                      <Code className="h-4 w-4" />
                      ソース
                    </TabsTrigger>
                    <TabsTrigger value="info" className="gap-2">
                      <Shield className="h-4 w-4" />
                      情報
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="flex-1 overflow-auto p-4">
                    {activeTab.content ? (
                      <div className="bg-white rounded-lg p-6 text-slate-900">
                        <div
                          dangerouslySetInnerHTML={{ __html: activeTab.content.substring(0, 5000) }}
                          className="prose prose-sm max-w-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                          <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>ページを読み込んでください</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="source" className="flex-1 overflow-auto p-4">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded text-xs overflow-auto max-h-full">
                      {activeTab.content?.substring(0, 2000) || 'No content'}
                    </pre>
                  </TabsContent>

                  <TabsContent value="info" className="flex-1 overflow-auto p-4">
                    <div className="space-y-4">
                      <Card className="bg-slate-700/50 border-slate-600">
                        <CardHeader>
                          <CardTitle className="text-sm">ページ情報</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">URL:</span>
                            <span className="text-slate-200 font-mono text-xs truncate">
                              {activeTab.url}
                            </span>
                          </div>
                          {activeTab.responseTime && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">読み込み時間:</span>
                              <span className="text-slate-200">{activeTab.responseTime}ms</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {activeSession && (
                        <Card className="bg-slate-700/50 border-slate-600">
                          <CardHeader>
                            <CardTitle className="text-sm">セッション情報</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">User-Agent:</span>
                              <span className="text-slate-200 text-xs truncate">
                                {activeSession.browserFingerprint?.userAgent?.substring(0, 40)}...
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">プラットフォーム:</span>
                              <span className="text-slate-200">
                                {activeSession.browserFingerprint?.platform}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">タイムゾーン:</span>
                              <span className="text-slate-200">
                                {activeSession.browserFingerprint?.timezone}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>タブを作成してください</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
