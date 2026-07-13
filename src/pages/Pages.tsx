import React, { useEffect, useState, useMemo } from 'react';
import { Globe, MousePointer, Users, MapPin, TrendingUp, ArrowLeft, Clock, ExternalLink, Search, X } from 'lucide-react';
import { useProject } from '../App';

interface Event {
  timestamp: string;
  eventName: string;
  visitorId: string;
  url: string;
  referrer?: string;
  userAgent?: string;
  screenResolution?: string;
  ip?: string;
  elementType?: string;
  elementText?: string;
  elementId?: string;
  elementClass?: string;
}

interface PageData {
  url: string;
  path: string;
  visits: number;
  uniqueVisitors: number;
  clicks: number;
  uniqueIPs: number;
  lastVisited: string;
}

function Pages() {
  const { selectedProject } = useProject();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPageUrl, setSelectedPageUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageFilter, setPageFilter] = useState<'all' | 'pageview' | 'click'>('all');

  useEffect(() => {
    if (!selectedProject) { setLoading(false); return; }
    setLoading(true);
    fetch(`https://api1-orpin.vercel.app/api/${selectedProject.id}/events`)
      .then(res => res.json())
      .then(data => { setEvents(data.events ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedProject]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/page') {
        // stays on page detail - need to get the url from state
        const state = window.history.state;
        if (state?.pageUrl) {
          setSelectedPageUrl(state.pageUrl);
        }
      } else {
        setSelectedPageUrl(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const pageDataList = useMemo<PageData[]>(() => {
    const pageMap = new Map<string, PageData>();
    for (const e of events) {
      if (!e.url) continue;
      let path = e.url;
      try {
        const u = new URL(e.url);
        path = u.pathname + u.search;
      } catch {}

      const existing = pageMap.get(e.url);
      if (existing) {
        existing.visits += e.eventName === 'pageview' ? 1 : 0;
        existing.clicks += e.eventName === 'click' ? 1 : 0;
        if (!existing._visitors) (existing as any)._visitors = new Set();
        (existing as any)._visitors.add(e.visitorId);
        if (e.ip) (existing as any)._ips?.add(e.ip) ?? ((existing as any)._ips = new Set([e.ip]));
        if (new Date(e.timestamp) > new Date(existing.lastVisited)) {
          existing.lastVisited = e.timestamp;
        }
      } else {
        const visitors = new Set<string>([e.visitorId]);
        const ips = new Set<string>(e.ip ? [e.ip] : []);
        pageMap.set(e.url, {
          url: e.url,
          path,
          visits: e.eventName === 'pageview' ? 1 : 0,
          uniqueVisitors: 0,
          clicks: e.eventName === 'click' ? 1 : 0,
          uniqueIPs: 0,
          lastVisited: e.timestamp,
          ...({ _visitors: visitors, _ips: ips } as any),
        });
      }
    }
    const list = Array.from(pageMap.values());
    for (const p of list) {
      p.uniqueVisitors = (p as any)._visitors?.size || 0;
      p.uniqueIPs = (p as any)._ips?.size || 0;
      delete (p as any)._visitors;
      delete (p as any)._ips;
    }
    return list.sort((a, b) => b.visits - a.visits);
  }, [events]);

  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pageDataList;
    return pageDataList.filter(p => p.path.toLowerCase().includes(q) || p.url.toLowerCase().includes(q));
  }, [pageDataList, searchQuery]);

  const totalPageviews = useMemo(() => pageDataList.reduce((s, p) => s + p.visits, 0), [pageDataList]);
  const totalClicks = useMemo(() => pageDataList.reduce((s, p) => s + p.clicks, 0), [pageDataList]);

  const selectedPageEvents = useMemo(() => {
    if (!selectedPageUrl) return [];
    let evs = events.filter(e => e.url === selectedPageUrl);
    if (pageFilter !== 'all') {
      evs = evs.filter(e => e.eventName === pageFilter);
    }
    return evs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events, selectedPageUrl, pageFilter]);

  const handlePageClick = (url: string) => {
    setSelectedPageUrl(url);
    window.history.pushState({ pageUrl: url }, '', '/page');
  };

  const handleBack = () => {
    setSelectedPageUrl(null);
    window.history.back();
  };

  const getEventIcon = (eventName: string) => {
    switch (eventName) {
      case 'pageview': return <Globe className="h-5 w-5 text-blue-500" />;
      case 'click': return <MousePointer className="h-5 w-5 text-purple-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select a project to view page data.</p>
        </div>
      </div>
    );
  }

  // ---- Page detail view ----
  if (selectedPageUrl) {
    const page = pageDataList.find(p => p.url === selectedPageUrl);
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pages
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Page Details
              </h2>
              <a
                href={selectedPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 break-all flex items-center gap-1 mt-1"
              >
                {selectedPageUrl}
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-gray-500">Pageviews</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{page?.visits ?? 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-xs text-gray-500">Unique Visitors</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{page?.uniqueVisitors ?? 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-gray-500">Unique IPs</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{page?.uniqueIPs ?? 0}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <MousePointer className="h-4 w-4 text-rose-600" />
                <span className="text-xs text-gray-500">Clicks</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{page?.clicks ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Event filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'pageview', 'click'] as const).map(f => (
            <button
              key={f}
              onClick={() => setPageFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                pageFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f === 'all' ? 'All Events' : f + 's'}
            </button>
          ))}
          <span className="text-sm text-gray-500 ml-auto">
            {selectedPageEvents.length} events
          </span>
        </div>

        {/* Event list for this page */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {selectedPageEvents.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No events for this page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedPageEvents.map((event, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.eventName)}
                          <span className="text-sm font-medium text-gray-900">{event.eventName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.visitorId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.ip ? (
                          <span className="text-xs text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded">
                            {event.ip}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {event.elementType ? (
                          <span>Clicked: {event.elementType} — {event.elementText}</span>
                        ) : (
                          <span className="text-gray-400">Page visit</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Pages list view ----
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (pageDataList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
        <Globe className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No page data yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Page Traffic
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {pageDataList.length} pages · {totalPageviews} pageviews · {totalClicks} clicks
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow w-64"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IPs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visited</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPages.map((page, i) => {
                const maxVisits = pageDataList[0]?.visits || 1;
                const barWidth = (page.visits / maxVisits) * 100;
                return (
                  <tr
                    key={page.url}
                    onClick={() => handlePageClick(page.url)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                      {i + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-50 rounded-md group-hover:bg-blue-100 transition-colors">
                          <Globe className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{page.path}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{page.url}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{page.visits}</span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{page.uniqueVisitors}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{page.uniqueIPs}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{page.clicks}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(page.lastVisited).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Pages;
