import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, User, MapPin, Globe, Clock, Chrome, Monitor, Smartphone,
  Languages, Fingerprint, Wifi, ExternalLink, MousePointer, Eye,
  TrendingUp, Calendar, Hash, ChevronDown, ChevronUp
} from 'lucide-react';
import { VisitorRow, Event, parseUA, flagEmoji, timeAgo } from './Visitors';

interface Props {
  visitor: VisitorRow;
  onBack: () => void;
}

function VisitorDashboard({ visitor, onBack }: Props) {
  const [eventFilter, setEventFilter] = useState<'all' | 'pageview' | 'click'>('all');
  const [showAllEvents, setShowAllEvents] = useState(false);

  const { browser, os, device } = parseUA(visitor.userAgent);
  const isLive = Date.now() - new Date(visitor.lastSeen).getTime() < 5 * 60 * 1000;

  const sortedEvents = useMemo(() =>
    [...visitor.events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  [visitor.events]);

  const filteredEvents = useMemo(() =>
    eventFilter === 'all' ? sortedEvents : sortedEvents.filter(e => e.eventName === eventFilter),
  [sortedEvents, eventFilter]);

  const pageVisits = useMemo(() => {
    const map = new Map<string, { url: string; path: string; visits: number; clicks: number; lastVisited: string }>();
    for (const e of visitor.events) {
      if (!e.url) continue;
      let path = e.url;
      try { path = new URL(e.url).pathname + new URL(e.url).search; } catch {}
      const existing = map.get(e.url);
      if (existing) {
        if (e.eventName === 'pageview') existing.visits++;
        if (e.eventName === 'click') existing.clicks++;
        if (new Date(e.timestamp) > new Date(existing.lastVisited)) existing.lastVisited = e.timestamp;
      } else {
        map.set(e.url, {
          url: e.url, path,
          visits: e.eventName === 'pageview' ? 1 : 0,
          clicks: e.eventName === 'click' ? 1 : 0,
          lastVisited: e.timestamp,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
  }, [visitor.events]);

  const sessions = useMemo(() => {
    const SESSION_GAP = 30 * 60 * 1000;
    const sorted = [...visitor.events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sessions: { startTime: string; endTime: string; events: Event[] }[] = [];
    let current: Event[] = [];
    for (const e of sorted) {
      if (current.length === 0) {
        current.push(e);
      } else {
        const last = current[current.length - 1];
        if (new Date(e.timestamp).getTime() - new Date(last.timestamp).getTime() > SESSION_GAP) {
          sessions.push({ startTime: current[0].timestamp, endTime: current[current.length - 1].timestamp, events: current });
          current = [e];
        } else {
          current.push(e);
        }
      }
    }
    if (current.length > 0) sessions.push({ startTime: current[0].timestamp, endTime: current[current.length - 1].timestamp, events: current });
    return sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [visitor.events]);

  const stats = useMemo(() => ({
    totalEvents: visitor.events.length,
    pageviews: visitor.events.filter(e => e.eventName === 'pageview').length,
    clicks: visitor.events.filter(e => e.eventName === 'click').length,
    uniquePages: pageVisits.length,
    sessions: sessions.length,
  }), [visitor.events, pageVisits, sessions]);

  const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      emerald: 'bg-emerald-50 text-emerald-600',
      orange: 'bg-orange-50 text-orange-600',
      indigo: 'bg-indigo-50 text-indigo-600',
    };
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    );
  };

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Visitors
          </button>
        </div>

        {/* Visitor profile header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {visitor.flag ? (
                  <img src={visitor.flag} alt={visitor.country_code || ''} className="w-10 h-10 object-contain" />
                ) : visitor.country_code ? (
                  <span className="text-3xl">{flagEmoji(visitor.country_code)}</span>
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{visitor.ip || 'Unknown Visitor'}</h1>
                  {isLive && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-400/30 border border-emerald-300 text-emerald-50 text-xs font-medium rounded-full">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-200" />
                      </span>
                      Live Now
                    </span>
                  )}
                </div>
                <p className="text-indigo-100 text-sm mt-1">
                  {visitor.city ? `${visitor.city}, ` : ''}{visitor.country_name || 'Location pending'}
                  {' · '}Last seen {timeAgo(visitor.lastSeen)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={<Hash className="h-5 w-5" />} label="Total Events" value={stats.totalEvents} color="indigo" />
          <StatCard icon={<Eye className="h-5 w-5" />} label="Pageviews" value={stats.pageviews} color="blue" />
          <StatCard icon={<MousePointer className="h-5 w-5" />} label="Clicks" value={stats.clicks} color="purple" />
          <StatCard icon={<Globe className="h-5 w-5" />} label="Pages Visited" value={stats.uniquePages} color="emerald" />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Sessions" value={stats.sessions} color="orange" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Events/Sess" value={stats.sessions > 0 ? Math.round(stats.totalEvents / stats.sessions) : 0} color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Device & location info */}
          <div className="space-y-6">
            {/* Device & Browser */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Monitor className="h-4 w-4 text-indigo-500" />
                Device & Browser
              </h3>
              <InfoRow icon={<Chrome className="h-4 w-4" />} label="Browser" value={browser} />
              <InfoRow icon={<Monitor className="h-4 w-4" />} label="Operating System" value={os} />
              <InfoRow icon={<Smartphone className="h-4 w-4" />} label="Device Type" value={device} />
              <InfoRow icon={<Monitor className="h-4 w-4" />} label="Screen Resolution" value={visitor.screenResolution} />
              <InfoRow icon={<Languages className="h-4 w-4" />} label="Language" value={visitor.language} />
              <InfoRow icon={<Fingerprint className="h-4 w-4" />} label="Visitor ID" value={<code className="text-xs">{visitor.visitorId}</code>} />
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-emerald-500" />
                Location
              </h3>
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="City / Region" value={visitor.city ? `${visitor.city}, ${visitor.region || ''}` : undefined} />
              <InfoRow icon={<Globe className="h-4 w-4" />} label="Country" value={visitor.country_name ? `${visitor.country_name} (${visitor.country_code})` : undefined} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Coordinates" value={visitor.latitude ? `${visitor.latitude}, ${visitor.longitude}` : undefined} />
              <InfoRow icon={<Clock className="h-4 w-4" />} label="Timezone" value={visitor.timezone} />
              <InfoRow icon={<Wifi className="h-4 w-4" />} label="ISP / Org" value={visitor.org} />
              <InfoRow icon={<Fingerprint className="h-4 w-4" />} label="ASN" value={visitor.asn} />
              {visitor.latitude && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${visitor.latitude}&mlon=${visitor.longitude}#map=10/${visitor.latitude}/${visitor.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View on Map
                </a>
              )}
            </div>
          </div>

          {/* Right column: Pages visited + Sessions + Events */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pages visited */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  Pages Visited
                  <span className="text-xs text-gray-400 font-normal">({pageVisits.length} unique pages)</span>
                </h3>
              </div>
              {pageVisits.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No page visits recorded.</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {pageVisits.map((page, i) => {
                    const maxVisits = pageVisits[0]?.visits || 1;
                    const barWidth = (page.visits / maxVisits) * 100;
                    return (
                      <div key={page.url} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-xs text-gray-400 font-mono w-6">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{page.path}</p>
                              <p className="text-xs text-gray-400 truncate">{page.url}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {page.clicks > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                                <MousePointer className="h-3 w-3" /> {page.clicks}
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${barWidth}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-8 text-right">{page.visits}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sessions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Sessions
                  <span className="text-xs text-gray-400 font-normal">({sessions.length} total)</span>
                </h3>
              </div>
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No sessions recorded.</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {sessions.map((session, i) => {
                    const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
                    const mins = Math.floor(duration / 60000);
                    const secs = Math.floor((duration % 60000) / 1000);
                    return (
                      <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at{' '}
                                {new Date(session.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-xs text-gray-400">
                                {session.events.length} events · {mins > 0 ? `${mins}m ` : ''}{secs}s
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                              <Eye className="h-3 w-3" /> {session.events.filter(e => e.eventName === 'pageview').length}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                              <MousePointer className="h-3 w-3" /> {session.events.filter(e => e.eventName === 'click').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Event timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  Event Timeline
                </h3>
                <div className="flex items-center gap-2">
                  {(['all', 'pageview', 'click'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setEventFilter(f)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                        eventFilter === f
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'All' : f + 's'}
                    </button>
                  ))}
                </div>
              </div>
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No events match this filter.</div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {(showAllEvents ? filteredEvents : filteredEvents.slice(0, 20)).map((event, i) => (
                      <div key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {event.eventName === 'pageview' ? (
                            <div className="p-1.5 bg-blue-50 rounded-md"><Eye className="h-4 w-4 text-blue-500" /></div>
                          ) : event.eventName === 'click' ? (
                            <div className="p-1.5 bg-purple-50 rounded-md"><MousePointer className="h-4 w-4 text-purple-500" /></div>
                          ) : (
                            <div className="p-1.5 bg-gray-50 rounded-md"><Hash className="h-4 w-4 text-gray-500" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{event.eventName}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {event.url}
                            {event.elementType && ` · ${event.elementType}: ${event.elementText || ''}`}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(event.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                  {filteredEvents.length > 20 && (
                    <button
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      className="w-full p-3 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1 border-t border-gray-100"
                    >
                      {showAllEvents ? <><ChevronUp className="h-4 w-4" /> Show Less</> : <><ChevronDown className="h-4 w-4" /> Show All {filteredEvents.length} Events</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VisitorDashboard;
