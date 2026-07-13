import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Globe as Globe2, MapPin, Monitor, Chrome, Clock, User, Loader2, Search, Fingerprint, Wifi, Languages, Smartphone, RefreshCw, ExternalLink, Filter, Radio, Info } from 'lucide-react';
import { useProject } from '../App';
import Globe from 'globe.gl';
import VisitorDashboard from './VisitorDashboard';

export interface Event {
  timestamp: string;
  eventName: string;
  visitorId: string;
  url: string;
  ip?: string;
  userAgent?: string;
  language?: string;
  screenResolution?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

interface IpInfo {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  org?: string;
  asn?: string;
  timezone?: string;
  postal?: string;
  flag?: string;
  loading?: boolean;
  error?: boolean;
}

export interface VisitorRow extends IpInfo {
  visitorId: string;
  lastSeen: string;
  eventCount: number;
  userAgent?: string;
  language?: string;
  screenResolution?: string;
  events: Event[];
}

interface Marker { lat: number; lon: number; label?: string; live?: boolean; }

// ---- 3D interactive globe (globe.gl + three.js, fully client-side) ----
function Globe3D({ markers, liveMode }: { markers: Marker[]; liveMode: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const globe = Globe()(containerRef.current)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
      .showAtmosphere(true)
      .atmosphereColor('#6366f1')
      .atmosphereAltitude(0.18)
      .pointLat('lat')
      .pointLng('lon')
      .pointColor((d: any) => d.live ? '#22c55e' : '#f43f5e')
      .pointAltitude(0.01)
      .pointRadius((d: any) => d.live ? 0.45 : 0.3)
      .pointLabel((d: any) => d.label || '')
      .ringLat('lat')
      .ringLng('lon')
      .ringColor((d: any) => d.live
        ? (t: number) => `rgba(34,197,94,${1 - t})`
        : (t: number) => `rgba(244,63,94,${1 - t})`)
      .ringAltitude(0.005)
      .ringMaxRadius(4)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1200);

    globeRef.current = globe;

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 180;
    controls.maxDistance = 600;
    const stopRotate = () => { controls.autoRotate = false; };
    globe.onGlobeClick(stopRotate);
    controls.addEventListener('start', stopRotate);

    const resize = () => {
      const w = containerRef.current?.clientWidth || 400;
      const h = containerRef.current?.clientHeight || 400;
      globe.width(w).height(h);
    };
    resize();
    window.addEventListener('resize', resize);
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);

    return () => {
      window.removeEventListener('resize', resize);
      controls.removeEventListener('start', stopRotate);
    };
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const ringData = markers.map(m => ({ lat: m.lat, lng: m.lon, live: m.live }));
    const pointData = markers.map(m => ({ lat: m.lat, lon: m.lon, label: m.label || '', live: m.live }));
    globeRef.current
      .pointColor((d: any) => d.live ? '#22c55e' : '#f43f5e')
      .pointRadius((d: any) => d.live ? 0.45 : 0.3)
      .ringColor((d: any) => d.live
        ? (t: number) => `rgba(34,197,94,${1 - t})`
        : (t: number) => `rgba(244,63,94,${1 - t})`)
      .pointsData(pointData)
      .ringsData(ringData);
  }, [markers, liveMode]);

  return <div ref={containerRef} className="w-full h-full" />;
}

// ---- helpers ----
export function parseUA(ua?: string) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
  let browser = 'Unknown';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macintosh|iphone|ipad/i.test(ua)) os = 'iOS/macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  const device = /mobile|android|iphone|ipad/i.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, os, device };
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function flagEmoji(cc?: string) {
  if (!cc || cc.length !== 2) return '';
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + (cc.charCodeAt(0) - base)) + String.fromCodePoint(A + (cc.charCodeAt(1) - base));
}

const API_URL = 'https://api1-orpin.vercel.app/api';
const IP_API = 'https://ipwho.is'; // free, no key, client-side

export default function Visitors() {
  const { selectedProject } = useProject();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [ipCache, setIpCache] = useState<Record<string, IpInfo>>({});
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<VisitorRow | null>(null);
  const [dashboardVisitor, setDashboardVisitor] = useState<VisitorRow | null>(null);
  const [liveOnly, setLiveOnly] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every 30s to keep "live" status fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedProject) { setLoading(false); return; }
    fetch(`${API_URL}/${selectedProject.id}/events`)
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedProject]);

  const visitors: VisitorRow[] = useMemo(() => {
    const map = new Map<string, VisitorRow>();
    for (const e of events) {
      const key = e.visitorId || 'unknown';
      const existing = map.get(key);
      if (existing) {
        existing.eventCount += 1;
        if (new Date(e.timestamp) > new Date(existing.lastSeen)) existing.lastSeen = e.timestamp;
        existing.events.push(e);
      } else {
        map.set(key, {
          ip: e.ip || '',
          visitorId: key,
          lastSeen: e.timestamp,
          eventCount: 1,
          userAgent: e.userAgent,
          language: e.language,
          screenResolution: e.screenResolution,
          events: [e],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  }, [events]);

  const uniqueIps = useMemo(() => {
    const s = new Set<string>();
    visitors.forEach(v => { if (v.ip && !v.ip.startsWith('127.') && v.ip !== 'unknown') s.add(v.ip); });
    return Array.from(s);
  }, [visitors]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (const ip of uniqueIps) {
        if (cancelled) return;
        if (ipCache[ip] && !ipCache[ip].loading) continue;
        setIpCache(prev => ({ ...prev, [ip]: { ip, loading: true } }));
        try {
          const res = await fetch(`${IP_API}/${ip}`);
          if (!res.ok) throw new Error('ip lookup failed');
          const data = await res.json();
          if (cancelled) return;
          if (!data.success) throw new Error(data.reason || 'lookup failed');
          setIpCache(prev => ({
            ...prev,
            [ip]: {
              ip: data.ip,
              city: data.city,
              region: data.region,
              country_name: data.country,
              country_code: data.country_code,
              latitude: data.latitude,
              longitude: data.longitude,
              org: data.connection?.isp,
              asn: data.connection?.asn ? `AS${data.connection.asn}` : undefined,
              timezone: data.timezone?.id,
              postal: data.postal,
              flag: data.flag?.img,
              loading: false,
            },
          }));
        } catch {
          if (cancelled) return;
          setIpCache(prev => ({ ...prev, [ip]: { ip, loading: false, error: true } }));
        }
        await new Promise(r => setTimeout(r, 350));
      }
    };
    run();
    return () => { cancelled = true; };
  }, [uniqueIps]);

  const enriched = useMemo(() => visitors.map(v => ({ ...v, ...(ipCache[v.ip] || {}) })), [visitors, ipCache]);

  const countries = useMemo(() => {
    const s = new Set<string>();
    enriched.forEach(v => { if (v.country_name) s.add(v.country_name); });
    return Array.from(s).sort();
  }, [enriched]);

  const LIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  const isLive = (lastSeen: string) => now - new Date(lastSeen).getTime() < LIVE_WINDOW_MS;

  const liveCount = useMemo(() => enriched.filter(v => isLive(v.lastSeen)).length, [enriched, now]);

  const filtered = useMemo(() => enriched.filter(v => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      v.ip?.toLowerCase().includes(q) ||
      v.visitorId.toLowerCase().includes(q) ||
      v.country_name?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.org?.toLowerCase().includes(q);
    const matchesCountry = countryFilter === 'all' || v.country_name === countryFilter;
    const matchesLive = !liveOnly || isLive(v.lastSeen);
    return matchesSearch && matchesCountry && matchesLive;
  }), [enriched, search, countryFilter, liveOnly, now]);

  const globeMarkers: Marker[] = useMemo(() =>
    enriched
      .filter(v => typeof v.latitude === 'number' && typeof v.longitude === 'number')
      .map(v => ({
        lat: v.latitude!,
        lon: v.longitude!,
        label: `${v.ip} — ${v.city ? v.city + ', ' : ''}${v.country_name || ''}`,
        live: isLive(v.lastSeen),
      }))
  , [enriched, now]);

  const stats = useMemo(() => ({
    total: enriched.length,
    located: enriched.filter(v => v.country_name).length,
    countries: new Set(enriched.map(v => v.country_name).filter(Boolean)).size,
    mobile: enriched.filter(v => parseUA(v.userAgent).device === 'Mobile').length,
  }), [enriched]);

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <Globe2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-500">Select a project from the sidebar to view visitors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-1">
          <span className="text-sm text-gray-500">Project:</span>
          <span className="ml-2 font-medium text-gray-800">{selectedProject.name}</span>
        </div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Visitors</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLiveOnly(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-sm border ${
                liveOnly
                  ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${liveOnly ? 'animate-ping bg-white' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${liveOnly ? 'bg-white' : 'bg-emerald-500'}`} />
              </span>
              Live Active
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                liveOnly ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {liveCount}
              </span>
            </button>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Wifi className="h-3.5 w-3.5" /> IP geolocation resolved in your browser
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<User className="h-5 w-5" />} label="Visitors" value={stats.total} color="indigo" />
              <StatCard icon={<MapPin className="h-5 w-5" />} label="Located" value={stats.located} color="emerald" />
              <StatCard icon={<Globe2 className="h-5 w-5" />} label="Countries" value={stats.countries} color="blue" />
              <StatCard icon={<Smartphone className="h-5 w-5" />} label="Mobile" value={stats.mobile} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-slate-900 rounded-2xl shadow-sm overflow-hidden h-[420px] relative">
                <div className="absolute top-4 left-4 z-10">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Globe2 className="h-5 w-5 text-indigo-400" /> Live Map
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{globeMarkers.length} located visitors · drag to rotate · scroll to zoom</p>
                  {liveOnly && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-emerald-400"><span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> Active</span>
                      <span className="flex items-center gap-1 text-xs text-rose-400"><span className="inline-block w-2 h-2 rounded-full bg-rose-400" /> Inactive</span>
                    </div>
                  )}
                </div>
                <Globe3D markers={globeMarkers} liveMode={liveOnly} />
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search IP, country, city, ISP..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={countryFilter}
                      onChange={e => setCountryFilter(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All countries</option>
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                  {filtered.length === 0 && (
                    <div className="p-12 text-center text-gray-400">No visitors match your filters.</div>
                  )}
                  {filtered.map(v => {
                    const { browser, os, device } = parseUA(v.userAgent);
                    const info = v.loading ? 'Locating…' : v.error ? 'Location unavailable' : v.country_name
                      ? `${v.city ? v.city + ', ' : ''}${v.country_name}` : 'Pending';
                    return (
                      <div
                        key={v.visitorId}
                        onClick={() => setDashboardVisitor(v)}
                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 cursor-pointer group"
                      >
                        <div className="relative w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {v.flag ? (
                            <img src={v.flag} alt={v.country_code || ''} className="w-7 h-7 object-contain" />
                          ) : v.country_code ? (
                            <span className="text-lg leading-none">{flagEmoji(v.country_code)}</span>
                          ) : (
                            <User className="h-5 w-5 text-indigo-500" />
                          )}
                          {isLive(v.lastSeen) && (
                            <span className="absolute bottom-0 right-0 w-3 h-3">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{v.ip || 'Unknown IP'}</span>
                            {v.loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                            {isLive(v.lastSeen) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-full">
                                <Radio className="h-2.5 w-2.5" /> Live
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 truncate flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" /> {info}
                          </div>
                        </div>
                        <div className="hidden sm:flex flex-col items-end text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Chrome className="h-3.5 w-3.5" /> {browser} · {os}</span>
                          <span className="flex items-center gap-1 mt-1"><Clock className="h-3.5 w-3.5" /> {timeAgo(v.lastSeen)}</span>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 rounded-full">{v.eventCount} events</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(v); }}
                          className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex-shrink-0"
                          title="View visitor info"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && <VisitorDrawer visitor={selected} onClose={() => setSelected(null)} />}

      {dashboardVisitor && (
        <div className="fixed inset-0 z-[60] bg-gray-50 overflow-y-auto">
          <VisitorDashboard
            visitor={dashboardVisitor}
            onBack={() => setDashboardVisitor(null)}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function VisitorDrawer({ visitor, onClose }: { visitor: VisitorRow; onClose: () => void }) {
  const { browser, os, device } = parseUA(visitor.userAgent);
  const info = visitor;
  const isLiveVisitor = Date.now() - new Date(info.lastSeen).getTime() < 5 * 60 * 1000;

  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" style={{ animation: 'slideIn 0.2s ease-out' }}>
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {info.flag ? (
                <img src={info.flag} alt={info.country_code || ''} className="w-7 h-7 object-contain" />
              ) : info.country_code ? (
                <span className="text-xl">{flagEmoji(info.country_code)}</span>
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                {info.ip || 'Visitor'}
                {isLiveVisitor && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-400/30 border border-emerald-300 text-emerald-100 text-xs font-medium rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-300" />
                    </span>
                    Live
                  </span>
                )}
              </h2>
              <p className="text-xs text-indigo-100">{info.country_name ? `${info.city ? info.city + ', ' : ''}${info.country_name}` : 'Location pending'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {info.loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Resolving location…
            </div>
          )}
          {info.error && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              Could not resolve this IP's location (free API limit or private IP).
            </div>
          )}

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</h3>
          <Row icon={<MapPin className="h-4 w-4" />} label="City / Region" value={info.city ? `${info.city}, ${info.region || ''}` : undefined} />
          <Row icon={<Globe2 className="h-4 w-4" />} label="Country" value={info.country_name ? `${info.country_name} (${info.country_code})` : undefined} />
          <Row icon={<MapPin className="h-4 w-4" />} label="Coordinates" value={info.latitude ? `${info.latitude}, ${info.longitude}` : undefined} />
          <Row icon={<Clock className="h-4 w-4" />} label="Timezone" value={info.timezone} />
          <Row icon={<MapPin className="h-4 w-4" />} label="Postal" value={info.postal} />

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mt-4">Network</h3>
          <Row icon={<Wifi className="h-4 w-4" />} label="IP Address" value={info.ip} />
          <Row icon={<Globe2 className="h-4 w-4" />} label="ISP / Org" value={info.org} />
          <Row icon={<Fingerprint className="h-4 w-4" />} label="ASN" value={info.asn} />

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mt-4">Device & Browser</h3>
          <Row icon={<Chrome className="h-4 w-4" />} label="Browser" value={browser} />
          <Row icon={<Monitor className="h-4 w-4" />} label="Operating System" value={os} />
          <Row icon={<Smartphone className="h-4 w-4" />} label="Device" value={device} />
          <Row icon={<Monitor className="h-4 w-4" />} label="Screen" value={info.screenResolution} />
          <Row icon={<Languages className="h-4 w-4" />} label="Language" value={info.language} />
          <Row icon={<Fingerprint className="h-4 w-4" />} label="Visitor ID" value={<code className="text-xs">{info.visitorId}</code>} />

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 mt-4">Activity</h3>
          <Row icon={<Clock className="h-4 w-4" />} label="Last Seen" value={new Date(info.lastSeen).toLocaleString()} />
          <Row icon={<User className="h-4 w-4" />} label="Events" value={`${info.eventCount} tracked`} />

          {info.latitude && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${info.latitude}&mlon=${info.longitude}#map=10/${info.latitude}/${info.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> View on OpenStreetMap
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
