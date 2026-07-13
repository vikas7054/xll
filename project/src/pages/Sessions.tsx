import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Calendar, Monitor, User, Clock, Globe, MousePointer, MapPin, Trash2, AlertTriangle, X, Info, ExternalLink, Chrome } from 'lucide-react';
import { useProject } from '../App';

interface Session {
  sessionId: string;
  visitorId: string;
  timestamp: string;
  url: string;
  userAgent: string;
  screenResolution: string;
  viewportWidth?: number;
  viewportHeight?: number;
  ip?: string;
  events: any[];
}

interface RawSession {
  sessionId: string;
  visitorId: string;
  timestamp: string;
  url: string;
  userAgent: string;
  screenResolution: string;
  viewportWidth?: number;
  viewportHeight?: number;
  ip?: string;
  events: any[];
  recordedAt: string;
}

function Sessions() {
  const { selectedProject } = useProject();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerDimensions, setPlayerDimensions] = useState({ width: 1024, height: 576 });
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);

  useEffect(() => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }

    fetch(`https://api1-orpin.vercel.app/api/${selectedProject.id}/sessions`)
      .then(res => res.json())
      .then(data => {
        const rawSessions = data.sessions || [];

        // Group sessions by sessionId and merge events
        const sessionMap = new Map<string, Session>();

        rawSessions.forEach((raw: RawSession) => {
          // Parse events if they are strings
          const parsedEvents = raw.events.map((e: any) => {
            if (typeof e === 'string') {
              try {
                return JSON.parse(e);
              } catch {
                return null;
              }
            }
            return e;
          }).filter((e: any) => e !== null && e.type !== undefined && e.timestamp !== undefined);

          // Sort events by timestamp
          parsedEvents.sort((a: any, b: any) => a.timestamp - b.timestamp);

          const existing = sessionMap.get(raw.sessionId);
          if (existing) {
            // Merge events, avoiding duplicates by timestamp
            const existingTimestamps = new Set(existing.events.map((e: any) => e.timestamp));
            const newEvents = parsedEvents.filter((e: any) => !existingTimestamps.has(e.timestamp));
            existing.events = [...existing.events, ...newEvents].sort((a, b) => a.timestamp - b.timestamp);
            // Update timestamp to earliest
            if (new Date(raw.timestamp) < new Date(existing.timestamp)) {
              existing.timestamp = raw.timestamp;
            }
          } else {
            sessionMap.set(raw.sessionId, {
              sessionId: raw.sessionId,
              visitorId: raw.visitorId,
              timestamp: raw.timestamp,
              url: raw.url,
              userAgent: raw.userAgent,
              screenResolution: raw.screenResolution,
              viewportWidth: raw.viewportWidth,
              viewportHeight: raw.viewportHeight,
              ip: raw.ip,
              events: parsedEvents,
            });
          }
        });

        // Convert to array and sort by timestamp
        const mergedSessions = Array.from(sessionMap.values())
          .filter(s => s.events.length >= 2) // Need at least 2 events for a valid recording
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setSessions(mergedSessions);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching sessions:', error);
        setError('Failed to load sessions');
        setLoading(false);
      });
  }, [selectedProject]);

  // Cleanup function for player
  const cleanupPlayer = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying player:', e);
      }
      playerRef.current = null;
    }
  }, []);

  // Calculate responsive player dimensions
  const calculateDimensions = useCallback(() => {
    if (!wrapperRef.current) return { width: 1024, height: 576 };

    const wrapperWidth = wrapperRef.current.clientWidth;
    const aspectRatio = 16 / 9;
    const width = Math.max(320, wrapperWidth - 48);
    const height = Math.round(width / aspectRatio);

    return { width, height };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newDimensions = calculateDimensions();
      setPlayerDimensions(newDimensions);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDimensions, selectedSession]);

  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, [cleanupPlayer]);

  useEffect(() => {
    if (!selectedSession || !containerRef.current) return;

    // Cleanup previous player
    cleanupPlayer();

    // Clear the container
    containerRef.current.innerHTML = '';

    const initPlayer = async () => {
      try {
        const { default: rrwebPlayer } = await import('rrweb-player');
        await import('rrweb-player/dist/style.css');

        const events = selectedSession.events;

        // Find first Meta event and first FullSnapshot
        let metaEvent = events.find((e: any) => e.type === 4); // Meta event
        let fullSnapshot = events.find((e: any) => e.type === 2); // FullSnapshot

        // If we don't have a FullSnapshot, we can't replay properly
        if (!fullSnapshot) {
          containerRef.current!.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #6b7280; background: #f3f4f6; border-radius: 8px;">
              <p>Session recording is incomplete (missing initial snapshot)</p>
            </div>
          `;
          return;
        }

        // Build proper event sequence: Meta -> FullSnapshot -> IncrementalSnapshots
        let orderedEvents: any[] = [];

        if (metaEvent) {
          orderedEvents.push(metaEvent);
        }
        orderedEvents.push(fullSnapshot);

        // Add incremental snapshots (type 3)
        const incrementalSnapshots = events.filter((e: any) =>
          e.type === 3 && e.timestamp > fullSnapshot.timestamp
        );
        orderedEvents.push(...incrementalSnapshots);

        // Sort all events by timestamp
        orderedEvents.sort((a, b) => a.timestamp - b.timestamp);

        // Get the recorded viewport dimensions - prioritize actual viewport over screen
        let recordedWidth = 1280;
        let recordedHeight = 720;

        // First check if we have viewport dimensions from the session data
        const sessionData = selectedSession as any;
        if (sessionData.viewportWidth && sessionData.viewportHeight) {
          recordedWidth = sessionData.viewportWidth;
          recordedHeight = sessionData.viewportHeight;
        } else if (selectedSession.screenResolution) {
          // Fallback to screen resolution
          const [w, h] = selectedSession.screenResolution.split('x').map(Number);
          if (w && h) {
            recordedWidth = w;
            recordedHeight = h;
          }
        }

        // Check fullSnapshot data for more accurate dimensions
        if (fullSnapshot.data?.node?.initialScroll?.width) {
          recordedWidth = fullSnapshot.data.node.initialScroll.width;
        }
        if (fullSnapshot.data?.node?.initialScroll?.height) {
          recordedHeight = fullSnapshot.data.node.initialScroll.height;
        }

        // Get container width
        const containerWidth = containerRef.current.clientWidth || 800;

        // Calculate dimensions maintaining the recorded aspect ratio
        const aspectRatio = recordedWidth / recordedHeight;
        const playerWidth = containerWidth;
        const playerHeight = Math.round(playerWidth / aspectRatio);

        const newPlayer = new rrwebPlayer({
          target: containerRef.current,
          props: {
            events: orderedEvents,
            width: playerWidth,
            height: playerHeight,
            skipInactive: true,
            showController: true,
            autoPlay: false,
            speedOption: [0.5, 1, 2, 4],
            mouseTail: {
              duration: 1.5,
              lineCap: 'round',
              lineWidth: 3,
              strokeStyle: '#ef4444',
            },
            tagsColor: {
              'click': '#22c55e',
              'scroll': '#3b82f6',
              'input': '#f59e0b',
            },
          },
        });

        playerRef.current = newPlayer;
        setPlayerDimensions({ width: playerWidth, height: playerHeight });

      } catch (error) {
        console.error('Error initializing player:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #ef4444; background: #fef2f2; border-radius: 8px;">
              <p>Failed to initialize player: ${error}</p>
            </div>
          `;
        }
      }
    };

    // Small delay to ensure container is rendered
    const timer = setTimeout(initPlayer, 50);
    return () => clearTimeout(timer);
  }, [selectedSession, cleanupPlayer]);

  const handleDeleteSession = async (session: Session) => {
    if (!selectedProject) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `https://api1-orpin.vercel.app/api/${selectedProject.id}/sessions/${session.sessionId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.sessionId !== session.sessionId));
        if (selectedSession?.sessionId === session.sessionId) {
          setSelectedSession(null);
          cleanupPlayer();
        }
        setSessionToDelete(null);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to delete session');
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session');
    } finally {
      setDeleting(false);
    }
  };

  const formatDuration = (events: any[]) => {
    if (!events || events.length < 2) return '0s';
    const timestamps = events.map((e: any) => e.timestamp).filter((t: any) => typeof t === 'number');
    if (timestamps.length < 2) return '0s';
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const formatEventCount = (events: any[]) => {
    if (!events) return 0;
    return events.length;
  };

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-500">Select a project from the sidebar to view sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <span className="text-sm text-gray-500">Project:</span>
          <span className="ml-2 font-medium text-gray-800">{selectedProject.name}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Session Recordings</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Play className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions recorded</h3>
            <p className="text-gray-500">Sessions will appear here when visitors interact with your site.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sessions List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Recent Sessions ({sessions.length})</h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-[calc(100vh-250px)] overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className={`flex items-center gap-2 p-4 hover:bg-gray-50 transition-colors ${
                      selectedSession?.sessionId === session.sessionId ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="flex-1 text-left space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {new Date(session.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {formatDuration(session.events)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({formatEventCount(session.events)} events)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {session.visitorId.slice(0, 8)}...
                        </span>
                      </div>
                      {session.ip && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs text-emerald-600 font-mono">
                            {session.ip}
                          </span>
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Play session"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionInfo(session);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete(session);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Player */}
            <div className="lg:col-span-2" ref={wrapperRef}>
              {selectedSession ? (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Session Header */}
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Play className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Session Replay</h2>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            {new Date(selectedSession.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                          <Monitor className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{selectedSession.screenResolution}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                          <MousePointer className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{formatDuration(selectedSession.events)}</span>
                        </div>
                        {selectedSession.ip && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                            <MapPin className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm text-emerald-700 font-mono">{selectedSession.ip}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
                          <User className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm text-indigo-700 font-mono">{selectedSession.visitorId.slice(0, 8)}</span>
                        </div>
                        <button
                          onClick={() => setSessionToDelete(selectedSession)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Player Container */}
                  <div className="p-4 bg-white border border-gray-200">
                    <div
                      ref={containerRef}
                      className="w-full bg-white rounded-lg"
                      style={{ minHeight: '450px' }}
                    >
                      {/* Player will be mounted here */}
                    </div>
                  </div>

                  {/* Session Info Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-gray-600">
                        <span className="flex items-center gap-1">
                          <MousePointer className="h-4 w-4" />
                          <span className="font-medium">{formatEventCount(selectedSession.events)}</span> events
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>Duration: <span className="font-medium">{formatDuration(selectedSession.events)}</span></span>
                      </div>
                      <div className="text-gray-500 text-xs font-mono truncate max-w-[200px]" title={selectedSession.visitorId}>
                        ID: {selectedSession.sessionId.slice(0, 16)}...
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 flex flex-col items-center justify-center min-h-[400px]">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Play className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">Select a session to watch the replay</p>
                  <p className="text-gray-400 text-sm mt-1">Click on any session from the list</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold">Delete Session Recording?</h2>
            </div>

            <p className="text-gray-600 mb-6">
              This will permanently delete this session recording and all its event data. This action cannot be undone.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{new Date(sessionToDelete.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <User className="h-4 w-4" />
                <span className="font-mono">{sessionToDelete.visitorId.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <MousePointer className="h-4 w-4" />
                <span>{formatEventCount(sessionToDelete.events)} events</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(sessionToDelete)}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Info Modal */}
      {sessionInfo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-300" />
                  <h2 className="font-semibold">Session Details</h2>
                </div>
                <button
                  onClick={() => setSessionInfo(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 text-sm">
              {/* URL */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Website</span>
                </div>
                <a
                  href={sessionInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 break-all text-xs font-medium flex items-center gap-1"
                >
                  {sessionInfo.url.length > 50 ? sessionInfo.url.slice(0, 50) + '...' : sessionInfo.url}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>

              {/* Visitor & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <User className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium uppercase tracking-wide">Visitor</span>
                  </div>
                  <p className="font-mono text-xs text-slate-700">{sessionInfo.visitorId.slice(0, 12)}...</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium uppercase tracking-wide">Time</span>
                  </div>
                  <p className="text-xs text-slate-700">{new Date(sessionInfo.timestamp).toLocaleDateString()}</p>
                </div>
              </div>

              {/* IP & Device Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium uppercase tracking-wide">IP</span>
                  </div>
                  <p className="font-mono text-xs text-slate-700">{sessionInfo.ip || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Monitor className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium uppercase tracking-wide">Screen</span>
                  </div>
                  <p className="text-xs text-slate-700">{sessionInfo.screenResolution}</p>
                </div>
              </div>

              {/* Events & Duration Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                    <MousePointer className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium uppercase tracking-wide">Events</span>
                  </div>
                  <p className="font-semibold text-emerald-700">{formatEventCount(sessionInfo.events)}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                    <Play className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium uppercase tracking-wide">Duration</span>
                  </div>
                  <p className="font-semibold text-indigo-700">{formatDuration(sessionInfo.events)}</p>
                </div>
              </div>

              {/* User Agent (collapsed) */}
              {sessionInfo.userAgent && (
                <details className="bg-slate-50 rounded-xl">
                  <summary className="px-3 py-2.5 cursor-pointer text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5 hover:text-slate-700">
                    <Chrome className="h-3.5 w-3.5" />
                    User Agent
                  </summary>
                  <p className="px-3 pb-3 text-xs text-slate-600 break-all">{sessionInfo.userAgent}</p>
                </details>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => setSessionInfo(null)}
                className="flex-1 py-2 text-sm text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedSession(sessionInfo);
                  setSessionInfo(null);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                Play
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sessions;
