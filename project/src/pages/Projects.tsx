import React, { useEffect, useState } from 'react';
import { Plus, Globe, Trash2, CreditCard as Edit2, X, Check, Copy, CheckCircle2, Code, ExternalLink, MousePointerClick } from 'lucide-react';
import { useProject } from '../App';

interface Project {
  id: string;
  name: string;
  domain: string;
  trackingId: string;
  createdAt: string;
  updatedAt?: string;
}

function Projects() {
  const { projects, setProjects, selectedProject, setSelectedProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const API_URL = 'https://api1-orpin.vercel.app/api';

  const getUserId = (): string => {
    try {
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.id || '';
      }
    } catch {}
    return '';
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const userId = getUserId();
      const res = await fetch(`${API_URL}/projects?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      setProjects(data.projects || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(`Failed to load projects: ${err instanceof Error ? err.message : 'Network error'}. Make sure the API server is running on port 3001.`);
      setLoading(false);
    }
  };

  const selectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    const userId = getUserId();
    if (!userId) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim(), domain: newProjectDomain.trim(), userId })
      });

      if (res.ok) {
        const project = await res.json();
        setProjects([...projects, project]);
        setShowCreateModal(false);
        setNewProjectName('');
        setNewProjectDomain('');
        setError(null);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(`Failed to create project: ${errorData.error || res.status}`);
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError(`Failed to create project: ${err instanceof Error ? err.message : 'Network error'}`);
    }
  };

  const updateProject = async () => {
    if (!editingProject || !newProjectName.trim()) return;

    const userId = getUserId();
    if (!userId) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim(), domain: newProjectDomain.trim(), userId })
      });

      if (res.ok) {
        const updated = await res.json();
        setProjects(projects.map(p => p.id === updated.id ? updated : p));
        setEditingProject(null);
        setNewProjectName('');
        setNewProjectDomain('');
      }
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project');
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? All associated data will be lost.')) return;

    const userId = getUserId();
    if (!userId) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/projects/${id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
        if (selectedProject?.id === id) {
          setSelectedProject(null);
        }
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
    }
  };

  const copyTrackingCode = (project: Project) => {
    const code = `<!-- Analytics Tracking for ${project.name} -->
<script src="https://unpkg.com/rrweb@2.0.0-alpha.4/dist/rrweb.min.js"></script>
<script>
(function() {
  const API_URL = 'https://api1-orpin.vercel.app/api';
  const PROJECT_ID = '${project.id}';
  let events = [];
  let recording = false;
  let stopFn = null;

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
      visitorId = generateId();
      localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = generateId();
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  function startRecording() {
    if (recording || typeof rrweb === 'undefined') return;
    stopFn = rrweb.record({
      emit(event) {
        events.push(event);
        if (events.length >= 10) sendEvents();
      },
      sampling: { mousemove: 50, scroll: 150, input: 'last' }
    });
    recording = true;
    setInterval(sendEvents, 5000);
    window.addEventListener('beforeunload', sendEvents);
  }

  async function sendEvents() {
    if (events.length === 0) return;
    const eventsToSend = events.splice(0, events.length);
    await fetch(API_URL + '/' + PROJECT_ID + '/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenResolution: window.screen.width + 'x' + window.screen.height,
        events: eventsToSend
      })
    });
  }

  function trackEvent(eventName, eventData = {}) {
    fetch(API_URL + '/' + PROJECT_ID + '/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        eventName,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenResolution: window.screen.width + 'x' + window.screen.height,
        ...eventData
      })
    });
  }

  if (document.readyState === 'complete') startRecording();
  else window.addEventListener('load', startRecording);
  trackEvent('pageview');
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a, button');
    if (target) trackEvent('click', {
      elementType: target.tagName.toLowerCase(),
      elementText: target.textContent?.trim(),
      elementId: target.id,
      elementClass: target.className
    });
  });
  window.trackEvent = trackEvent;
})();
</script>`;
    navigator.clipboard.writeText(code);
    setCopiedId(project.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditing = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectDomain(project.domain);
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setNewProjectName('');
    setNewProjectDomain('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Projects</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Project
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">Create your first project to start tracking analytics.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {projects.map(project => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {editingProject?.id === project.id ? (
                  <div className="p-6">
                    <div className="flex gap-4 mb-4">
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Project name"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={newProjectDomain}
                        onChange={(e) => setNewProjectDomain(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Domain (optional)"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateProject}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
                        {project.domain && (
                          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                            <ExternalLink className="h-4 w-4" />
                            <span>{project.domain}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                          <span>Tracking ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{project.trackingId}</code></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => selectProject(project)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedProject?.id === project.id
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          }`}
                          title="Select project"
                        >
                          <MousePointerClick className="h-4 w-4" />
                          {selectedProject?.id === project.id ? 'Selected' : 'Select'}
                        </button>
                        <button
                          onClick={() => copyTrackingCode(project)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Copy tracking code"
                        >
                          {copiedId === project.id ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Code className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => startEditing(project)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit project"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete project"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {selectedProject?.id === project.id && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Tracking Code</h4>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                          <pre className="whitespace-pre-wrap text-xs">{`<script src="https://unpkg.com/rrweb@2.0.0-alpha.4/dist/rrweb.min.js"></script>\n<script>\n  // Tracking code for project: ${project.name}\n  // Project ID: ${project.id}\n</script>`}</pre>
                        </div>
                        <button
                          onClick={() => copyTrackingCode(project)}
                          className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          {copiedId === project.id ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy Full Tracking Code
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Create New Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="My Website"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain (optional)
                </label>
                <input
                  type="text"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://mywebsite.com"
                />
              </div>

              <p className="text-sm text-gray-500">
                After creating the project, you'll get a unique tracking code to add to your website.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
