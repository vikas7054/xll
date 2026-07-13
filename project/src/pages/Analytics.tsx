import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Clock, Users, MousePointer, Globe, MapPin, TrendingUp } from 'lucide-react';
import { useProject } from '../App';
import Pages from './Pages';

interface Event {
  timestamp: string;
  eventName: string;
  visitorId: string;
  url: string;
  ip?: string;
}

type Range = 'M' | 'H' | 'W' | 'MO' | 'Y';

const RANGES: { key: Range; label: string; title: string }[] = [
  { key: 'M',  label: 'M',  title: 'By Minute (last 24 h)' },
  { key: 'H',  label: 'H',  title: 'By Hour (last 24 h)' },
  { key: 'W',  label: 'W',  title: 'By Day (last 7 days)' },
  { key: 'MO', label: 'M',  title: 'By Day (last 30 days)' },
  { key: 'Y',  label: 'Y',  title: 'By Month (last 12 months)' },
];

function bucketLabel(date: Date, range: Range): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (range === 'M')  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (range === 'H')  return `${pad(date.getHours())}:00`;
  if (range === 'W')  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (range === 'MO') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function cutoff(range: Range): Date {
  const now = new Date();
  if (range === 'M')  return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (range === 'H')  return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (range === 'W')  return new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  if (range === 'MO') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
}

function buildTimeData(events: Event[], range: Range) {
  const from = cutoff(range);
  const filtered = events.filter(e => new Date(e.timestamp) >= from);
  const buckets: Record<string, { events: number; visitors: Set<string> }> = {};
  for (const e of filtered) {
    const key = bucketLabel(new Date(e.timestamp), range);
    if (!buckets[key]) buckets[key] = { events: 0, visitors: new Set() };
    buckets[key].events += 1;
    buckets[key].visitors.add(e.visitorId);
  }
  return Object.entries(buckets)
    .map(([time, v]) => ({ time, events: v.events, visitors: v.visitors.size }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function Analytics() {
  const { selectedProject } = useProject();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('H');

  useEffect(() => {
    if (!selectedProject) { setLoading(false); return; }
    setLoading(true);
    fetch(`https://api1-orpin.vercel.app/api/${selectedProject.id}/events`)
      .then(res => res.json())
      .then(data => { setEvents(data.events ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedProject]);

  const pageviews     = useMemo(() => events.filter(e => e.eventName === 'pageview').length, [events]);
  const uniqueVisitors = useMemo(() => new Set(events.map(e => e.visitorId)).size, [events]);
  const uniqueIPs     = useMemo(() => new Set(events.map(e => e.ip).filter(Boolean)).size, [events]);
  const clicks        = useMemo(() => events.filter(e => e.eventName === 'click').length, [events]);

  const timeData = useMemo(() => buildTimeData(events, range), [events, range]);

  const eventTypeData = useMemo(() => {
    const m = events.reduce((acc, e) => { acc[e.eventName] = (acc[e.eventName] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(m).map(([type, count]) => ({ type, count }));
  }, [events]);

  const activeRange = RANGES.find(r => r.key === range)!;

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-500">Select a project from the sidebar to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-2">
        <span className="text-sm text-gray-500">Project:</span>
        <span className="ml-2 font-medium text-gray-800">{selectedProject.name}</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Analytics Dashboard</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Pageviews',       value: pageviews,      icon: Globe,        bg: 'bg-blue-100',    ico: 'text-blue-600' },
              { label: 'Unique Visitors', value: uniqueVisitors, icon: Users,        bg: 'bg-green-100',   ico: 'text-green-600' },
              { label: 'Unique IPs',      value: uniqueIPs,      icon: MapPin,       bg: 'bg-emerald-100', ico: 'text-emerald-600' },
              { label: 'Total Clicks',    value: clicks,         icon: MousePointer, bg: 'bg-rose-100',    ico: 'text-rose-600' },
            ].map(({ label, value, icon: Icon, bg, ico }) => (
              <div key={label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${bg} rounded-lg`}>
                    <Icon className={`h-6 w-6 ${ico}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline chart with M H W M Y switcher */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Events Timeline
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{activeRange.title}</p>
              </div>

              {/* Range switcher */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
                {RANGES.map((r, i) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`relative px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 min-w-[40px] ${
                      range === r.key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {r.key === 'MO' ? 'M' : r.label}
                    {/* distinguish the two M buttons visually */}
                    {(r.key === 'M' || r.key === 'MO') && (
                      <span className="absolute -top-1 -right-0.5 text-[8px] font-bold text-gray-400 leading-none">
                        {r.key === 'M' ? 'in' : 'on'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {timeData.length === 0 ? (
              <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
                No data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 2' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="events"   stroke="#3b82f6" strokeWidth={2} fill="url(#eventsGrad)"   dot={false} activeDot={{ r: 4 }} name="Events" />
                  <Area type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2} fill="url(#visitorsGrad)" dot={false} activeDot={{ r: 4 }} name="Visitors" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Event types + Recent events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Types Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={eventTypeData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h2>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {events.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No events yet</p>
                ) : (
                  events.slice(-10).reverse().map((event, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{event.eventName}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(event.timestamp).toLocaleString(undefined, {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      {event.ip && (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full shrink-0">
                          <MapPin className="h-3 w-3 text-emerald-500" />
                          <span className="text-xs text-emerald-700 font-mono">{event.ip}</span>
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <Pages />
      </div>
    </div>
  );
}

export default Analytics;
