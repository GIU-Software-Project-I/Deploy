'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, PendingProvisioning } from '@/app/services/onboarding';

export default function SystemAdminOnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingProvisioning, setPendingProvisioning] = useState<PendingProvisioning[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getEmployeesPendingProvisioning();
      // Ensure result is always an array
      const data = Array.isArray(result) ? result : ((result as any)?.data || []);
      setPendingProvisioning(data);
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setPendingProvisioning([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionAccess = async (item: PendingProvisioning) => {
    try {
      setProcessing(item.employeeId);
      setError(null);
      setSuccess(null);

      await onboardingService.provisionSystemAccess({
        employeeId: item.employeeId,
      });

      setSuccess(`System access provisioned successfully for ${item.employeeName}`);
      await fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to provision access');
    } finally {
      setProcessing(null);
    }
  };

  const handleScheduleRevocation = async (item: PendingProvisioning) => {
    const revocationDate = prompt('Enter scheduled revocation date (YYYY-MM-DD):');
    if (!revocationDate) return;

    try {
      setProcessing(item.employeeId);
      setError(null);

      await onboardingService.scheduleAccessRevocation({
        employeeId: item.employeeId,
        revocationDate,
      });

      setSuccess(`Access revocation scheduled for ${item.employeeName} on ${revocationDate}`);
      await fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule revocation');
    } finally {
      setProcessing(null);
    }
  };

  const urgentCount = Array.isArray(pendingProvisioning) ? pendingProvisioning.filter(p => p.isUrgent).length : 0;
  const standardCount = Array.isArray(pendingProvisioning) ? pendingProvisioning.filter(p => !p.isUrgent).length : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto p-6 lg:p-10">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted/50 rounded-2xl w-2/3"></div>
            <div className="h-6 bg-muted/30 rounded-xl w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-card border border-border rounded-2xl"></div>
              ))}
            </div>
            <div className="h-96 bg-card border border-border rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-5xl mx-auto p-6 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Access Provisioning</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Provision system access for new hires (email, SSO, internal systems)
              </p>
            </div>
            <Link
              href="/dashboard/system-admin/offboarding"
              className="px-6 py-3 border-2 border-foreground text-foreground font-bold rounded-full hover:bg-foreground hover:text-background transition-all"
            >
              Access Revocation
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
        {/* Alerts */}
        {error && (
          <div className="bg-destructive/5 border border-destructive/20 text-destructive px-5 py-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-foreground/5 border border-foreground/10 text-foreground px-5 py-4 rounded-2xl flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border border-border p-6 hover:border-foreground/20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pending</p>
                <p className="text-4xl font-black text-foreground mt-2">{pendingProvisioning.length}</p>
              </div>
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 hover:border-foreground/20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Urgent</p>
                <p className="text-4xl font-black text-foreground mt-2">{urgentCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Starting within 3 days</p>
              </div>
              <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 hover:border-foreground/20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Standard</p>
                <p className="text-4xl font-black text-foreground mt-2">{standardCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Regular timeline</p>
              </div>
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-muted/30 border border-border rounded-2xl p-5 flex gap-4">
          <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center flex-shrink-0 border border-border">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Access Provisioning Process</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When you provision access, the following will be set up: Email account, SSO/Single Sign-On,
              Internal systems access, and Payroll system access. IT tasks in the onboarding checklist will be
              automatically marked as completed.
            </p>
          </div>
        </div>

        {/* Pending Provisioning List */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <div className="px-8 py-5 border-b border-border">
            <h2 className="font-bold text-foreground text-lg">New Hires Pending Access Provisioning</h2>
          </div>

          <div className="divide-y divide-border">
            {pendingProvisioning.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-foreground">All Caught Up</p>
                <p className="text-muted-foreground mt-2">
                  No new hires pending access provisioning.
                </p>
              </div>
            ) : (
              pendingProvisioning.map((item) => (
                <div key={item.employeeId} className="px-8 py-6 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.isUrgent
                          ? 'bg-destructive/10 border-2 border-destructive/20'
                          : 'bg-muted'
                        }`}>
                        {item.isUrgent ? (
                          <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-lg text-foreground">{item.employeeName}</h3>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{item.employeeNumber}</span>
                          {item.isUrgent && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-destructive text-destructive-foreground rounded-full">
                              URGENT
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                          {item.department && <span>{item.department}</span>}
                          {item.position && <span>• {item.position}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          {item.startDate && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Start: {new Date(item.startDate).toLocaleDateString()}
                              {item.daysUntilStart <= 0 ? (
                                <span className="text-destructive font-bold ml-1">(TODAY or PASSED)</span>
                              ) : item.daysUntilStart <= 3 ? (
                                <span className="text-destructive font-bold ml-1">({item.daysUntilStart} day(s))</span>
                              ) : (
                                <span className="ml-1">({item.daysUntilStart} days)</span>
                              )}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            IT Tasks: {item.itTasksStatus.completed}/{item.itTasksStatus.total}
                          </span>
                        </div>
                        {item.itTasksStatus.pending.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Pending: {item.itTasksStatus.pending.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 lg:flex-shrink-0">
                      <button
                        onClick={() => handleProvisionAccess(item)}
                        disabled={processing === item.employeeId}
                        className="px-6 py-3 bg-foreground text-background font-bold rounded-full hover:bg-foreground/90 disabled:opacity-50 transition-all"
                      >
                        {processing === item.employeeId ? 'Provisioning...' : 'Provision Access'}
                      </button>
                      <button
                        onClick={() => handleScheduleRevocation(item)}
                        disabled={processing === item.employeeId}
                        className="px-6 py-3 border-2 border-border text-foreground font-semibold rounded-full hover:bg-muted disabled:opacity-50 transition-all"
                      >
                        Schedule Revocation
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Access Types */}
        <div className="bg-card rounded-3xl border border-border p-8">
          <h2 className="font-bold text-foreground mb-6">Access Types Provisioned</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { name: 'SSO', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { name: 'Internal Systems', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { name: 'Payroll', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((item) => (
              <div key={item.name} className="p-5 bg-muted/30 rounded-2xl text-center border border-border/50 hover:border-border transition-colors">
                <div className="w-12 h-12 bg-foreground/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">Auto-provisioned</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
