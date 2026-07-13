import React from 'react';
import {
  Code2, Copy, CheckCircle2, AlertCircle, Save, RotateCcw, Loader2,
  FileCode2, RefreshCw, Rocket, Shield, Zap, BookOpen, Terminal,
  Webhook, MousePointerClick, FormInput, Search, Eye, Server,
} from 'lucide-react';
import { useProject } from '../App';

const API_BASE = 'https://api1-orpin.vercel.app/api/custom';

type Tab = 'overview' | 'install' | 'editor' | 'events' | 'privacy';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'install', label: 'Installation', icon: Rocket },
  { id: 'editor', label: 'Script Editor', icon: FileCode2 },
  { id: 'events', label: 'Custom Events', icon: Webhook },
  { id: 'privacy', label: 'Privacy & Performance', icon: Shield },
];

function Documentation() {
  const [activeTab, setActiveTab] = React.useState<Tab>('overview');
  const [copied, setCopied] = React.useState<string | null>(null);
  const { selectedProject } = useProject();

  // Script editor state
  const [scriptContent, setScriptContent] = React.useState('');
  const [originalContent, setOriginalContent] = React.useState('');
  const [loadingScript, setLoadingScript] = React.useState(false);
  const [savingScript, setSavingScript] = React.useState(false);
  const [resettingScript, setResettingScript] = React.useState(false);
  const [scriptError, setScriptError] = React.useState<string | null>(null);
  const [scriptSuccess, setScriptSuccess] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const lastLoadedProjectRef = React.useRef<string | null>(null);

  const projectId = selectedProject?.id || 'YOUR_PROJECT_ID';

  const installSnippet = `<!-- 1. Set your Project ID -->
<script>window.ANALYTICS_PROJECT_ID = '${projectId}';</script>

<!-- 2. Load rrweb (for session recording) -->
<script src="https://unpkg.com/rrweb@2.0.0-alpha.4/dist/rrweb.min.js"></script>

<!-- 3. Load your custom tracking script -->
<script src="${API_BASE}/${projectId}/tracking.js" defer></script>`;

  const fetchScript = React.useCallback(async (pId: string) => {
    setLoadingScript(true);
    setScriptError(null);
    setScriptSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/${pId}/tracking-script`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScriptContent(data.scriptContent || '');
      setOriginalContent(data.scriptContent || '');
      setUpdatedAt(data.updatedAt || null);
      lastLoadedProjectRef.current = pId;
    } catch (err: any) {
      setScriptError(err.message || 'Failed to fetch tracking script');
    } finally {
      setLoadingScript(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedProject?.id && selectedProject.id !== lastLoadedProjectRef.current) {
      fetchScript(selectedProject.id);
    }
  }, [selectedProject?.id, fetchScript]);

  const handleSaveScript = async () => {
    if (!selectedProject) return;
    setSavingScript(true);
    setScriptError(null);
    setScriptSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/${selectedProject.id}/tracking-script`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptContent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOriginalContent(scriptContent);
      setScriptSuccess('Script pushed live successfully.');
      setTimeout(() => setScriptSuccess(null), 4000);
    } catch (err: any) {
      setScriptError(err.message || 'Failed to save tracking script');
    } finally {
      setSavingScript(false);
    }
  };

  const handleResetScript = async () => {
    if (!selectedProject) return;
    if (!confirm('Reset the tracking script to the default template? Your custom changes will be lost.')) return;
    setResettingScript(true);
    setScriptError(null);
    setScriptSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/${selectedProject.id}/tracking-script/reset`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScriptContent(data.scriptContent || '');
      setOriginalContent(data.scriptContent || '');
      setScriptSuccess('Script reset to default template.');
      setTimeout(() => setScriptSuccess(null), 4000);
    } catch (err: any) {
      setScriptError(err.message || 'Failed to reset tracking script');
    } finally {
      setResettingScript(false);
    }
  };

  const hasChanges = scriptContent !== originalContent;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 pt-10 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Developer Docs</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Analytics Implementation</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Everything you need to install tracking, customize the script, and start collecting analytics from your website.
          </p>

          {/* Project status badge */}
          <div className="mt-5">
            {selectedProject ? (
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-blue-800 font-medium">{selectedProject.name}</span>
                <span className="text-xs text-blue-400">·</span>
                <code className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{selectedProject.id}</code>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-700 font-medium">No project selected — select one from the sidebar</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-10">
        {/* ───────────── Overview ───────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { icon: Rocket, title: '1. Create a Project', desc: 'Go to the Projects page and create a new project to get your unique Project ID.' },
                { icon: Code2, title: '2. Install Tracking', desc: 'Add three script tags to your HTML <head> — set the project ID, load rrweb, and load the tracking script.' },
                { icon: Eye, title: '3. View Analytics', desc: 'Visit your dashboard to see real-time visitors, events, session recordings, and more.' },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1.5">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Ready to integrate?</h3>
                  <p className="text-blue-100 text-sm mb-4 max-w-xl">
                    Jump to the Installation tab for the copy-paste snippet, or open the Script Editor to customize your tracking script.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveTab('install')}
                      className="px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                      View Installation
                    </button>
                    <button
                      onClick={() => setActiveTab('editor')}
                      className="px-4 py-2 bg-white/15 text-white rounded-lg text-sm font-medium hover:bg-white/25 transition-colors"
                    >
                      Open Script Editor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────── Installation ───────────── */}
        {activeTab === 'install' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Install the Tracking Script</h2>
              <p className="text-slate-500">
                Add these three tags to the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">&lt;head&gt;</code> of every page you want to track.
              </p>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-medium">1</div>
                  <span className="text-sm font-medium text-slate-700">Copy this snippet</span>
                </div>
                <button
                  onClick={() => copyToClipboard(installSnippet, 'install')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                >
                  {copied === 'install' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied === 'install' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-slate-900 rounded-xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-700">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-slate-400 font-mono">index.html</span>
                </div>
                <pre className="p-5 text-sm text-slate-100 font-mono overflow-x-auto leading-relaxed">{installSnippet}</pre>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { num: '1', label: 'Set Project ID', desc: 'Tells the tracker which project this data belongs to.' },
                { num: '2', label: 'Load rrweb', desc: 'Powers session recording and replay.' },
                { num: '3', label: 'Load Tracking Script', desc: 'Served per-project from the API — fully customizable.' },
              ].map((s) => (
                <div key={s.num} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold mb-3">{s.num}</div>
                  <h4 className="font-medium text-slate-800 text-sm mb-1">{s.label}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Heads up</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>Replace <code className="bg-blue-100 px-1 rounded">YOUR_PROJECT_ID</code> with your actual project ID</li>
                  <li>The rrweb library is required for session recording</li>
                  <li>The custom script URL is unique per project</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ───────────── Script Editor ───────────── */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Custom Tracking Script Editor</h2>
              <p className="text-slate-500">
                Each project has its own tracking script. Edit the code below and push to make changes live instantly —
                the updated script is served at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">/api/custom/{'{projectId}'}/tracking.js</code>.
              </p>
            </div>

            {!selectedProject ? (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 p-6 rounded-xl">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">Select a project from the sidebar to manage its custom tracking script.</p>
              </div>
            ) : (
              <>
                {/* Script URL card */}
                <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
                  <Server className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">Live Script URL</p>
                    <code className="text-xs text-blue-600 break-all">{API_BASE}/{selectedProject.id}/tracking.js</code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${API_BASE}/${selectedProject.id}/tracking.js`, 'url')}
                    className="flex-shrink-0 p-2 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {copied === 'url' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-slate-500" />}
                  </button>
                </div>

                {/* Status messages */}
                {scriptError && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">{scriptError}</p>
                  </div>
                )}
                {scriptSuccess && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">{scriptSuccess}</p>
                  </div>
                )}

                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSaveScript}
                    disabled={savingScript || !hasChanges}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingScript ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingScript ? 'Pushing...' : 'Push Script'}
                  </button>
                  <button
                    onClick={handleResetScript}
                    disabled={resettingScript}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40"
                  >
                    {resettingScript ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reset to Default
                  </button>
                  <button
                    onClick={() => fetchScript(selectedProject.id)}
                    disabled={loadingScript}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40"
                  >
                    {loadingScript ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Reload
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    {hasChanges ? (
                      <span className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Unsaved changes
                      </span>
                    ) : updatedAt ? (
                      <span className="text-sm text-slate-400">Last updated {new Date(updatedAt).toLocaleString()}</span>
                    ) : null}
                  </div>
                </div>

                {/* Code editor */}
                <div className="bg-slate-900 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-700">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-2 text-xs text-slate-400 font-mono">tracking.js</span>
                  </div>
                  {loadingScript ? (
                    <div className="flex items-center justify-center h-96">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                    </div>
                  ) : (
                    <textarea
                      value={scriptContent}
                      onChange={(e) => setScriptContent(e.target.value)}
                      spellCheck={false}
                      className="w-full h-96 bg-slate-900 text-slate-100 p-5 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/50 leading-relaxed"
                      placeholder="Loading tracking script..."
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────────── Custom Events ───────────── */}
        {activeTab === 'events' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Track Custom Events</h2>
              <p className="text-slate-500">
                Use the global <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">trackEvent()</code> function to track custom events beyond the default pageviews and clicks.
              </p>
            </div>

            <div className="bg-slate-900 rounded-xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-700">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-slate-400 font-mono">example.js</span>
              </div>
              <pre className="p-5 text-sm text-slate-100 font-mono overflow-x-auto leading-relaxed">{`// Track a custom event with optional data
trackEvent('event_name', {
  category: 'category',
  label: 'label',
  value: 123
});`}</pre>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                { icon: FormInput, title: 'Form Submissions', code: `trackEvent('form_submit', {\n  formId: 'contact',\n  success: true\n});` },
                { icon: Search, title: 'Feature Usage', code: `trackEvent('feature_used', {\n  feature: 'search',\n  query: 'shoes'\n});` },
                { icon: MousePointerClick, title: 'CTA Clicks', code: `trackEvent('cta_click', {\n  ctaId: 'signup-hero',\n  location: 'header'\n});` },
                { icon: Eye, title: 'Video Plays', code: `trackEvent('video_play', {\n  videoId: 'demo',\n  duration: 120\n});` },
              ].map((ex) => {
                const Icon = ex.icon;
                return (
                  <div key={ex.title} className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-slate-800 text-sm">{ex.title}</h4>
                    </div>
                    <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg font-mono overflow-x-auto">{ex.code}</pre>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ───────────── Privacy & Performance ───────────── */}
        {activeTab === 'privacy' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Privacy</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'No personal information collected by default',
                    'Anonymous, randomly-generated visitor IDs',
                    'Data stored on your own server',
                    'No third-party data sharing',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Performance</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'Efficient event batching (10 events per batch)',
                    'Throttled mouse movement tracking',
                    'Optimized scroll event handling',
                    'Minimal network requests via deferred sending',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 text-white">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Data Storage</h3>
                  <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                    All analytics data — events, sessions, and visitor records — is stored in your own database.
                    The custom tracking script is also stored per-project, so you have full control over what gets
                    collected and how it's sent.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Documentation;
