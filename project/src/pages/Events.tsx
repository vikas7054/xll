import React, { useEffect, useState, useMemo } from 'react';
import { Clock, User, Globe, MousePointer, X, ExternalLink, Monitor, Chrome, MapPin, Search, Filter, ChevronDown } from 'lucide-react';
import { useProject } from '../App';

interface Event {
  timestamp: string;
  eventName: string;
  visitorId: string;
  url: string;
  referrer: string;
  userAgent: string;
  screenResolution: string;
  ip?: string;
  elementType?: string;
  elementText?: string;
  elementId?: string;
  elementClass?: string;
}

type EventType = 'all' | 'pageview' | 'click';
type SearchField = 'all' | 'url' | 'ip';

function Events() {
  const { selectedProject } = useProject();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }

    fetch(`https://api1-orpin.vercel.app/api/${selectedProject.id}/events`)
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching events:', error);
        setLoading(false);
      });
  }, [selectedProject]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return events.filter(event => {
      if (filter !== 'all' && event.eventName !== filter) return false;

      if (!q) return true;

      if (searchField === 'url') {
        return event.url?.toLowerCase().includes(q);
      }
      if (searchField === 'ip') {
        return event.ip?.toLowerCase().includes(q);
      }
      // all: search across url, ip, visitorId, elementText
      return (
        event.url?.toLowerCase().includes(q) ||
        event.ip?.toLowerCase().includes(q) ||
        event.visitorId?.toLowerCase().includes(q) ||
        event.elementText?.toLowerCase().includes(q)
      );
    });
  }, [events, filter, searchQuery, searchField]);

  const getEventIcon = (eventName: string) => {
    switch (eventName) {
      case 'pageview':
        return <Globe className="h-5 w-5 text-blue-500" />;
      case 'click':
        return <MousePointer className="h-5 w-5 text-purple-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const EventDetailsModal = ({ event, onClose }: { event: Event; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {getEventIcon(event.eventName)}
            <h2 className="text-xl font-semibold">{event.eventName} Event Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <p className="text-gray-900">{new Date(event.timestamp).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Visitor Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                <p className="text-gray-900">ID: {event.visitorId}</p>
              </div>
              {event.ip && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                  <p className="text-gray-900 font-mono">IP: {event.ip}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-gray-400" />
                <p className="text-gray-900">Screen: {event.screenResolution}</p>
              </div>
              <div className="flex items-center gap-2">
                <Chrome className="h-5 w-5 text-gray-400" />
                <p className="text-gray-900 text-sm">{event.userAgent}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Page Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-gray-400" />
                <a href={event.url} target="_blank" rel="noopener noreferrer"
                   className="text-blue-600 hover:text-blue-800 break-all">
                  {event.url}
                </a>
              </div>
              {event.referrer && (
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <p className="text-gray-900 break-all">Referrer: {event.referrer}</p>
                </div>
              )}
            </div>
          </div>

          {event.elementType && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Click Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Element Type</p>
                    <p className="text-gray-900">{event.elementType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Element Text</p>
                    <p className="text-gray-900">{event.elementText}</p>
                  </div>
                  {event.elementId && (
                    <div>
                      <p className="text-sm text-gray-500">Element ID</p>
                      <p className="text-gray-900">{event.elementId}</p>
                    </div>
                  )}
                  {event.elementClass && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Element Class</p>
                      <p className="text-gray-900 break-all font-mono text-sm">{event.elementClass}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-500">Select a project from the sidebar to view events.</p>
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
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Event Log</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setFilter('pageview')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'pageview'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Pageviews
              </button>
              <button
                onClick={() => setFilter('click')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'click'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Clicks
              </button>
            </div>
          </div>

          {/* Search & filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by URL, IP, visitor ID, or click text..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchField)}
                className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow cursor-pointer"
              >
                <option value="all">All fields</option>
                <option value="url">URL only</option>
                <option value="ip">IP only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing <span className="font-medium text-gray-700">{filteredEvents.length}</span> of {events.length} events
            </span>
            {(searchQuery || filter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setFilter('all'); setSearchField('all'); }}
                className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No events found</h3>
            <p className="text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitor ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getEventIcon(event.eventName)}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {event.eventName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {event.visitorId.slice(0, 8)}...
                          </span>
                          {event.ip && (
                            <span className="text-xs text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">
                              {event.ip}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          <p className="truncate max-w-md">URL: {event.url}</p>
                          {event.elementType && (
                            <p className="text-xs text-gray-400">
                              Clicked: {event.elementType} - {event.elementText}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

export default Events;
