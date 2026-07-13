import React, { createContext, useContext, useState, useEffect } from 'react';
import Analytics from './pages/Analytics';
import Documentation from './pages/Documentation';
import Events from './pages/Events';
import Sessions from './pages/Sessions';
import Visitors from './pages/Visitors';
import Projects from './pages/Projects';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LayoutDashboard, FileText, List, Video, FolderOpen, ChevronDown, LogOut, User, Settings as SettingsIcon, Globe2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  domain: string;
  trackingId: string;
  createdAt: string;
}

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
}

export const ProjectContext = createContext<ProjectContextType>({
  selectedProject: null,
  setSelectedProject: () => {},
  projects: [],
  setProjects: () => {}
});

export const useProject = () => useContext(ProjectContext);

function DashboardApp() {
  const { user, logout, loading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<'analytics' | 'docs' | 'events' | 'sessions' | 'visitors' | 'projects' | 'settings'>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const userId = (() => {
      try {
        const authUser = localStorage.getItem('auth_user');
        if (authUser) {
          const user = JSON.parse(authUser);
          return user.id || '';
        }
      } catch {}
      return '';
    })();

    fetch(`https://api1-orpin.vercel.app/api/projects?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || []);
        const savedProjectId = localStorage.getItem('selectedProjectId');
        if (savedProjectId) {
          const found = (data.projects || []).find((p: Project) => p.id === savedProjectId);
          if (found) {
            setSelectedProject(found);
            setCurrentPage('analytics');
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selectedProjectId', selectedProject.id);
    }
  }, [selectedProject]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const userDisplayName = user.name || user.email || 'User';

  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject, projects, setProjects }}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white p-4 flex flex-col">
          <h1 className="text-xl font-bold mb-6">Analytics Dashboard</h1>

          {/* Project Selector */}
          <div className="mb-6">
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Current Project</label>
            <div className="relative">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span className="truncate">
                  {selectedProject ? selectedProject.name : 'Select a project'}
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </button>

              {showProjectDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedProject(null);
                      setShowProjectDropdown(false);
                      setCurrentPage('projects');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded-t-lg transition-colors"
                  >
                    <FolderOpen className="h-4 w-4 inline mr-2" />
                    Manage Projects
                  </button>
                  {projects.length > 0 && <div className="border-t border-gray-700" />}
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setShowProjectDropdown(false);
                        if (currentPage === 'projects') {
                          setCurrentPage('analytics');
                        }
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors ${
                        selectedProject?.id === project.id ? 'bg-indigo-600' : ''
                      }`}
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 flex-1">
            <button
              onClick={() => setCurrentPage('projects')}
              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'projects' ? 'bg-indigo-600' : 'hover:bg-gray-800'
              }`}
            >
              <FolderOpen className="h-5 w-5" />
              <span>Projects</span>
            </button>
            <button
              onClick={() => setCurrentPage('analytics')}
              disabled={!selectedProject}
              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'analytics' ? 'bg-indigo-600' : 'hover:bg-gray-800'
              } ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentPage('events')}
              disabled={!selectedProject}
              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'events' ? 'bg-indigo-600' : 'hover:bg-gray-800'
              } ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <List className="h-5 w-5" />
              <span>Events</span>
            </button>
            <button
              onClick={() => setCurrentPage('sessions')}
              disabled={!selectedProject}
              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'sessions' ? 'bg-indigo-600' : 'hover:bg-gray-800'
              } ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Video className="h-5 w-5" />
              <span>Sessions</span>
            </button>
            <button
              onClick={() => setCurrentPage('visitors')}
              disabled={!selectedProject}
              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'visitors' ? 'bg-indigo-600' : 'hover:bg-gray-800'
              } ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Globe2 className="h-5 w-5" />
              <span>Visitors</span>
            </button>
            <button
              onClick={() => setCurrentPage('docs')}
              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'docs' ? 'bg-indigo-600' : 'hover:bg-gray-800'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Documentation</span>
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              disabled={!selectedProject}
              className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'settings' ? 'bg-indigo-600' : 'hover:bg-gray-800'
              } ${!selectedProject ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <SettingsIcon className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </nav>

          {/* User Menu */}
          <div className="relative pt-4 border-t border-gray-800">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="truncate text-sm flex-1 text-left">{userDisplayName}</span>
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 rounded-lg shadow-lg z-50">
                <div className="px-3 py-2 border-b border-gray-700">
                  <p className="text-sm text-white truncate">{userDisplayName}</p>
                  {user.email && user.email !== userDisplayName && (
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-gray-700 rounded-b-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {currentPage === 'projects' ? <Projects /> :
           currentPage === 'analytics' ? <Analytics /> :
           currentPage === 'events' ? <Events /> :
           currentPage === 'sessions' ? <Sessions /> :
           currentPage === 'visitors' ? <Visitors /> :
           currentPage === 'settings' ? <Settings /> :
           <Documentation />}
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

function App() {
  return (
    <AuthProvider>
      <DashboardApp />
    </AuthProvider>
  );
}

export default App;
