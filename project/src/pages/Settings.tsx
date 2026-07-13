import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Settings as SettingsIcon, Database, CreditCard, BarChart3, Check, X } from 'lucide-react';
import { useProject } from '../App';

interface UsageData {
  userId: string;
  plan: string;
  billingCycleStart: string;
  billingCycleEnd: string;
  usage: {
    events: { used: number; limit: number };
    sessions: { used: number; limit: number };
    projects: { used: number; limit: number };
    storage: { used: number; limit: number };
  };
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_BADGE_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700 border-slate-200',
  pro: 'bg-blue-50 text-blue-700 border-blue-200',
  enterprise: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function getUserId(): string {
  try {
    const authUser = localStorage.getItem('auth_user');
    if (authUser) {
      const user = JSON.parse(authUser);
      return user.id || '';
    }
  } catch {}
  return '';
}

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500';
  const textColor = isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-700';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-medium ${textColor}`}>
          {used.toLocaleString()} / {limit.toLocaleString()}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">{percentage.toFixed(1)}% used</span>
        <span className="text-xs text-gray-400">{(limit - used).toLocaleString()} remaining</span>
      </div>
    </div>
  );
}

function Settings() {
  const { selectedProject, projects, setProjects, setSelectedProject } = useProject();
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteDataResult, setDeleteDataResult] = useState<{ deletedEvents: number; deletedSessions: number } | null>(null);
  const [projectDeleted, setProjectDeleted] = useState(false);

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [planUpdating, setPlanUpdating] = useState(false);
  const [planUpdateMsg, setPlanUpdateMsg] = useState<string | null>(null);

  const userId = getUserId();

  useEffect(() => {
    if (!userId) {
      setUsageLoading(false);
      return;
    }
    setUsageLoading(true);
    fetch(`https://api1-orpin.vercel.app/api/usage/${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch usage');
        return res.json();
      })
      .then((data) => setUsage(data))
      .catch((err) => console.error('Usage fetch error:', err))
      .finally(() => setUsageLoading(false));
  }, [userId, projects.length]);

  const handleDeleteAllData = async () => {
    if (!selectedProject) return;
    setDeletingData(true);
    try {
      const res = await fetch(`https://api1-orpin.vercel.app/api/${selectedProject.id}/data`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const result = await res.json();
        setDeleteDataResult({ deletedEvents: result.deletedEvents, deletedSessions: result.deletedSessions });
        setShowDeleteDataModal(false);
      } else {
        const error = await res.json();
        alert(`Failed to delete data: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Failed to delete data. Please try again.');
    } finally {
      setDeletingData(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    setDeletingProject(true);
    try {
      const res = await fetch(`https://api1-orpin.vercel.app/api/projects/${selectedProject.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updated = projects.filter((p) => p.id !== selectedProject.id);
        setProjects(updated);
        setSelectedProject(updated[0] || null);
        setShowDeleteProjectModal(false);
        setProjectDeleted(true);
        setTimeout(() => setProjectDeleted(false), 4000);
      } else {
        const error = await res.json();
        alert(`Failed to delete project: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeletingProject(false);
    }
  };

  const handlePlanChange = async (newPlan: string) => {
    if (!userId) return;
    setPlanUpdating(true);
    setPlanUpdateMsg(null);
    try {
      const res = await fetch(`https://api1-orpin.vercel.app/api/usage/${encodeURIComponent(userId)}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsage((prev) => (prev ? { ...prev, plan: data.plan } : prev));
        setPlanUpdateMsg(`Plan updated to ${PLAN_LABELS[data.plan] || data.plan}`);
        setTimeout(() => setPlanUpdateMsg(null), 3000);
      } else {
        alert('Failed to update plan');
      }
    } catch (error) {
      console.error('Plan update error:', error);
      alert('Failed to update plan. Please try again.');
    } finally {
      setPlanUpdating(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-500">Select a project from the sidebar to manage settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
        <p className="text-gray-500 mb-8">Manage your project settings, plan, and data</p>

        {projectDeleted && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-green-800 text-sm">Project deleted successfully.</p>
          </div>
        )}

        {/* Project Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-500" />
            Project Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Project Name</span>
              <p className="font-medium text-gray-900">{selectedProject.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Domain</span>
              <p className="font-medium text-gray-900">{selectedProject.domain || 'Not set'}</p>
            </div>
            <div>
              <span className="text-gray-500">Project ID</span>
              <p className="font-mono text-gray-900 text-xs">{selectedProject.id}</p>
            </div>
            <div>
              <span className="text-gray-500">Tracking ID</span>
              <p className="font-mono text-gray-900 text-xs">{selectedProject.trackingId}</p>
            </div>
            <div>
              <span className="text-gray-500">Created</span>
              <p className="font-medium text-gray-900">
                {new Date(selectedProject.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Usage & Plan Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-500" />
            Usage &amp; Plan
          </h2>
          <p className="text-sm text-gray-400 mb-5">Track your resource usage and manage your subscription plan.</p>

          {usageLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
            </div>
          ) : !usage ? (
            <div className="py-6 text-center text-gray-500 text-sm">
              Unable to load usage data. Please try again later.
            </div>
          ) : (
            <>
              {/* Current Plan Badge */}
              <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Plan</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${PLAN_BADGE_COLORS[usage.plan] || PLAN_BADGE_COLORS.free}`}>
                      {PLAN_LABELS[usage.plan] || usage.plan}
                    </span>
                    <span className="text-sm text-gray-500">
                      Renews {new Date(usage.billingCycleEnd).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {planUpdateMsg && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" /> {planUpdateMsg}
                  </span>
                )}
              </div>

              {/* Usage Bars */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Resource Usage</h3>
                </div>
                <UsageBar label="Events" used={usage.usage.events.used} limit={usage.usage.events.limit} />
                <UsageBar label="Sessions" used={usage.usage.sessions.used} limit={usage.usage.sessions.limit} />
                <UsageBar label="Projects" used={usage.usage.projects.used} limit={usage.usage.projects.limit} />
                <UsageBar label="Storage" used={usage.usage.storage.used} limit={usage.usage.storage.limit} unit="MB" />
              </div>

              {/* Plan Selector */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Change Plan</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['free', 'pro', 'enterprise'] as const).map((planKey) => {
                    const isActive = usage.plan === planKey;
                    return (
                      <button
                        key={planKey}
                        onClick={() => !isActive && handlePlanChange(planKey)}
                        disabled={planUpdating || isActive}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          isActive
                            ? 'border-blue-500 bg-blue-50 cursor-default'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        } ${planUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-gray-800">{PLAN_LABELS[planKey]}</span>
                          {isActive && <Check className="h-4 w-4 text-blue-600" />}
                        </div>
                        <p className="text-xs text-gray-500">
                          {planKey === 'free' && '10K events'}
                          {planKey === 'pro' && '100K events'}
                          {planKey === 'enterprise' && '1M events'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-red-200">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200">
            <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Delete All Data */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Delete All Project Data</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Permanently delete all events and session recordings for this project. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDeleteDataModal(true);
                  setDeleteDataResult(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4" />
                Delete Data
              </button>
            </div>

            {deleteDataResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  Successfully deleted {deleteDataResult.deletedEvents} events and {deleteDataResult.deletedSessions} sessions.
                </p>
              </div>
            )}

            <div className="border-t border-gray-100" />

            {/* Delete Project */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Delete Project</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Permanently delete this project along with all its events, sessions, and settings. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteProjectModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4" />
                Delete Project
              </button>
            </div>
          </div>
        </div>

        {/* Delete Data Confirmation Modal */}
        {showDeleteDataModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold">Delete All Data?</h2>
              </div>
              <p className="text-gray-600 mb-6">
                This will permanently delete all events and session recordings for project <strong>"{selectedProject.name}"</strong>. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteDataModal(false)}
                  disabled={deletingData}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllData}
                  disabled={deletingData}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deletingData ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete All Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Project Confirmation Modal */}
        {showDeleteProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold">Delete Project?</h2>
              </div>
              <p className="text-gray-600 mb-4">
                This will permanently delete the project <strong>"{selectedProject.name}"</strong> along with all its events, sessions, and settings.
              </p>
              <p className="text-sm text-red-600 mb-6">
                This action cannot be undone. All data associated with this project will be lost forever.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteProjectModal(false)}
                  disabled={deletingProject}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={deletingProject}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deletingProject ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
