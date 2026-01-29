'use client';

import { useState, useEffect } from 'react';
import {
  onboardingService,
  OnboardingTracker,
  OnboardingTaskStatus,
  Document,
} from '@/app/services/onboarding';
import { useAuth, SystemRole } from '@/context/AuthContext';

export default function MyOnboardingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracker, setTracker] = useState<OnboardingTracker | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [noOnboarding, setNoOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents'>('overview');

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoOnboarding(false);

      const employeeId = user?.id;
      if (!employeeId) {
        setNoOnboarding(true);
        return;
      }

      const [trackerData, docsData] = await Promise.all([
        onboardingService.getOnboardingTracker(employeeId).catch(() => null),
        onboardingService.getDocumentsByOwner(employeeId).catch(() => []),
      ]);

      if (!trackerData) {
        setNoOnboarding(true);
        setDocuments(Array.isArray(docsData) ? docsData : []);
        return;
      }

      setTracker(trackerData);
      setDocuments(Array.isArray(docsData) ? docsData : []);
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setNoOnboarding(true);
      } else {
        setError(err.message || 'Failed to fetch onboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskName: string) => {
    if (!user?.id) return;

    try {
      setUpdatingTask(taskName);
      setError(null);
      await onboardingService.startTask(user.id, taskName);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to start task');
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleCompleteTask = async (taskName: string) => {
    if (!user?.id) return;

    try {
      setUpdatingTask(taskName);
      setError(null);
      await onboardingService.completeTask(user.id, taskName);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete task');
    } finally {
      setUpdatingTask(null);
    }
  };

  const getStepperSteps = () => {
    if (!tracker) return [];
    const isComplete = tracker.progress.isComplete;

    return [
      { step: 1, label: 'Offer Accepted', completed: true, active: false },
      { step: 2, label: 'Profile Created', completed: true, active: false },
      { step: 3, label: 'Onboarding', completed: isComplete, active: !isComplete },
      { step: 4, label: 'Complete', completed: isComplete, active: isComplete },
    ];
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto p-6 lg:p-10">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted/50 rounded-2xl w-2/3"></div>
            <div className="h-6 bg-muted/30 rounded-xl w-1/2"></div>
            <div className="h-32 bg-card border border-border rounded-3xl"></div>
            <div className="h-64 bg-card border border-border rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // No Onboarding State - Check if documents are uploaded
  if (noOnboarding) {
    const hasUploadedDocs = documents.length > 0;
    const isEmployee = user?.role !== SystemRole.JOB_CANDIDATE;

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6 lg:p-10">
          {/* Status Card */}
          <div className="bg-card border border-border rounded-3xl p-12 lg:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_theme(colors.border)_1px,_transparent_0)] bg-[length:24px_24px] opacity-50"></div>

            <div className="relative z-10">
              <div className="w-24 h-24 bg-muted border-2 border-border rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-black/5">
                {isEmployee ? (
                  <div className="relative">
                    <svg className="w-12 h-12 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                    </svg>
                  </div>
                ) : hasUploadedDocs ? (
                  <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                )}
              </div>

              {isEmployee ? (
                <>
                  <h1 className="text-4xl font-black text-foreground mb-4 tracking-tight">Initializing Your Workspace</h1>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6 text-lg leading-relaxed">
                    Welcome to the team, <span className="font-bold text-foreground">{user?.firstName}</span>! We're currently setting up your onboarding checklist. This should only take a few moments.
                  </p>
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-primary/10 rounded-2xl text-sm font-bold text-primary border border-primary/20">
                    <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
                    Preparing your journey...
                  </div>
                </>
              ) : hasUploadedDocs ? (
                <>
                  <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Pending HR Verification</h1>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6 text-lg leading-relaxed">
                    Your documents have been submitted and are awaiting HR verification. You'll receive access to your onboarding checklist once your profile is created.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm font-medium text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {documents.length} document(s) uploaded
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">No Active Onboarding</h1>
                  <p className="text-muted-foreground max-w-md mx-auto mb-10 text-lg leading-relaxed">
                    You don't have an active onboarding checklist yet. Ready to begin your journey?
                  </p>

                  <a
                    href="/portal/candidate/document-upload"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-bold rounded-full hover:bg-foreground/90 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Documents
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Step Instructions */}
          <div className="mt-8 bg-card border border-border rounded-3xl p-8">
            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { step: 1, title: 'Upload Contract', desc: 'Submit your signed employment contract', done: hasUploadedDocs },
                { step: 2, title: 'Add Documents', desc: 'Upload required ID and verification docs', done: hasUploadedDocs },
                { step: 3, title: 'HR Review', desc: 'Our team verifies and creates your profile', done: false },
                { step: 4, title: 'Start Onboarding', desc: 'Complete tasks and meet your team', done: false },
              ].map((item) => (
                <div key={item.step} className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${item.done ? 'bg-foreground/5 border-foreground/10' : 'bg-muted/30 border-border/50'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${item.done ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                    }`}>
                    {item.done ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Tracker View
  return (
    <div className="min-h-screen bg-background">
      {/* Header with subtle gradient */}
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-5xl mx-auto p-6 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight">My Onboarding</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Track your progress and complete required tasks
              </p>
            </div>
            {tracker && (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-5xl font-black text-foreground tracking-tight">{tracker.progress.progressPercentage}%</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Complete</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
        {error && (
          <div className="bg-destructive/5 border border-destructive/20 text-destructive px-5 py-4 rounded-2xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {tracker && (
          <>
            {/* Horizontal Journey Stepper */}
            <div className="bg-card border border-border rounded-3xl p-8">
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-0 w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-700 ease-out"
                    style={{ width: `${tracker.progress.isComplete ? 100 : 50}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4 relative">
                  {getStepperSteps().map((item) => (
                    <div key={item.step} className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-all duration-300 border-4 ${item.completed
                        ? 'bg-foreground text-background border-background shadow-lg'
                        : item.active
                          ? 'bg-background text-foreground border-foreground shadow-lg ring-4 ring-foreground/10'
                          : 'bg-muted text-muted-foreground border-background'
                        }`}>
                        {item.completed ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : item.step}
                      </div>
                      <p className={`text-sm font-bold mt-4 text-center ${item.active || item.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Tasks', value: tracker.progress.totalTasks },
                { label: 'Completed', value: tracker.progress.completedTasks },
                { label: 'In Progress', value: tracker.progress.inProgressTasks },
                { label: 'Pending', value: tracker.progress.pendingTasks },
              ].map((stat, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 text-center hover:border-foreground/20 transition-colors">
                  <p className="text-3xl font-black text-foreground">{stat.value}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Next Task Highlight */}
            {tracker.nextTask && !tracker.progress.isComplete && (
              <div className="bg-foreground text-background rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-background/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Up Next</p>
                    <h3 className="text-2xl font-bold">{tracker.nextTask.name}</h3>
                    <p className="opacity-70 mt-1">{tracker.nextTask.department}</p>
                    {tracker.nextTask.deadline && (
                      <p className="text-sm opacity-60 mt-2">Due: {new Date(tracker.nextTask.deadline).toLocaleDateString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStartTask(tracker.nextTask!.name)}
                    disabled={updatingTask === tracker.nextTask.name}
                    className="px-8 py-4 bg-background text-foreground font-bold rounded-full hover:bg-background/90 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
                  >
                    {updatingTask === tracker.nextTask.name ? 'Starting...' : 'Start Task'}
                  </button>
                </div>
              </div>
            )}

            {/* Overdue Warning */}
            {tracker.overdueTasks.length > 0 && (
              <div className="bg-destructive/5 border-2 border-destructive/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-destructive">Overdue Tasks ({tracker.overdueTasks.length})</h3>
                    <ul className="mt-2 space-y-1">
                      {tracker.overdueTasks.map((task) => (
                        <li key={task.name} className="text-sm text-destructive/80">
                          {task.name} — Due: {new Date(task.deadline!).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-2xl w-fit">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'tasks', label: 'All Tasks' },
                { id: 'documents', label: 'Documents' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === tab.id
                    ? 'bg-foreground text-background shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tasks by Department */}
                <div className="bg-card border border-border rounded-3xl p-6">
                  <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 bg-muted rounded-lg flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </span>
                    Progress by Department
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(tracker.tasksByDepartment).map(([dept, tasks]) => {
                      const completed = tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length;
                      const percentage = Math.round((completed / tasks.length) * 100);
                      return (
                        <div key={dept}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-foreground">{dept}</span>
                            <span className="text-xs font-mono text-muted-foreground">{completed}/{tasks.length}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="bg-card border border-border rounded-3xl p-6">
                  <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 bg-muted rounded-lg flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    Upcoming Deadlines
                  </h3>
                  {tracker.upcomingDeadlines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                  ) : (
                    <div className="space-y-3">
                      {tracker.upcomingDeadlines.slice(0, 5).map((task) => (
                        <div key={task.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{task.name}</p>
                            <p className="text-xs text-muted-foreground">{task.department}</p>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded-lg border border-border">
                            {new Date(task.deadline!).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="bg-card border border-border rounded-3xl overflow-hidden">
                <div className="divide-y divide-border">
                  {[...tracker.tasksByStatus.inProgress, ...tracker.tasksByStatus.pending, ...tracker.tasksByStatus.completed].map((task) => (
                    <div key={task.name} className="px-6 py-5 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${task.status === OnboardingTaskStatus.COMPLETED
                            ? 'bg-foreground text-background'
                            : task.status === OnboardingTaskStatus.IN_PROGRESS
                              ? 'bg-muted border-2 border-foreground text-foreground'
                              : 'bg-muted text-muted-foreground'
                            }`}>
                            {task.status === OnboardingTaskStatus.COMPLETED ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : task.status === OnboardingTaskStatus.IN_PROGRESS ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{task.name}</h4>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {task.department}
                              {task.deadline && ` • Due: ${new Date(task.deadline).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {task.status === OnboardingTaskStatus.PENDING && (
                            <button
                              onClick={() => handleStartTask(task.name)}
                              disabled={updatingTask === task.name}
                              className="px-5 py-2.5 text-sm bg-foreground text-background font-semibold rounded-full hover:bg-foreground/90 disabled:opacity-50 transition-all"
                            >
                              {updatingTask === task.name ? 'Starting...' : 'Start'}
                            </button>
                          )}
                          {task.status === OnboardingTaskStatus.IN_PROGRESS && (
                            <button
                              onClick={() => handleCompleteTask(task.name)}
                              disabled={updatingTask === task.name}
                              className="px-5 py-2.5 text-sm bg-foreground text-background font-semibold rounded-full hover:bg-foreground/90 disabled:opacity-50 transition-all"
                            >
                              {updatingTask === task.name ? 'Completing...' : 'Complete'}
                            </button>
                          )}
                          {task.status === OnboardingTaskStatus.COMPLETED && (
                            <span className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted rounded-full">Done</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="bg-card border border-border rounded-3xl p-6">
                <h3 className="font-bold text-foreground mb-6">Uploaded Documents</h3>
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc) => (
                      <div key={doc._id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50 hover:border-border transition-colors">
                        <div className="w-12 h-12 bg-foreground/5 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{doc.type.toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completion Celebration */}
            {tracker.progress.isComplete && (
              <div className="bg-foreground text-background rounded-3xl p-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)]"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-background/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-black">Onboarding Complete!</h3>
                  <p className="text-lg opacity-80 mt-4 max-w-md mx-auto">
                    Congratulations! You've completed all your onboarding tasks. Welcome to the team!
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
