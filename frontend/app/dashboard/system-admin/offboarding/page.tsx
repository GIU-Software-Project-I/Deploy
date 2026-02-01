'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { offboardingService, PendingAccessRevocation } from '@/app/services/offboarding';

export default function SystemAdminOffboardingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingRevocations, setPendingRevocations] = useState<PendingAccessRevocation[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await offboardingService.getEmployeesPendingAccessRevocation();
      setPendingRevocations(result || []);
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setPendingRevocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (employeeId: string, employeeName: string) => {
    try {
      setProcessing(employeeId);
      setError(null);
      setSuccess(null);

      const result = await offboardingService.revokeSystemAccess({ employeeId });

      setSuccess(`System access revoked for ${employeeName}. ${result.details.systemRolesDisabled} role(s) disabled.`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
    } finally {
      setProcessing(null);
    }
  };

  const urgentCount = pendingRevocations.filter(r => r.isUrgent).length;
  const standardCount = pendingRevocations.filter(r => !r.isUrgent).length;

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
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Access Revocation</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Revoke system access for terminated employees to maintain security
              </p>
            </div>
            <Link
              href="/dashboard/system-admin/onboarding"
              className="px-6 py-3 border-2 border-foreground text-foreground font-bold rounded-full hover:bg-foreground hover:text-background transition-all"
            >
              Access Provisioning
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
                <p className="text-4xl font-black text-foreground mt-2">{pendingRevocations.length}</p>
              </div>
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 hover:border-foreground/20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Urgent</p>
                <p className="text-4xl font-black text-foreground mt-2">{urgentCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
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

        {/* Security Notice */}
        <div className="bg-destructive/5 border-2 border-destructive/20 rounded-2xl p-5 flex gap-4">
          <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-destructive">Security Compliance Required</h3>
            <p className="text-sm text-destructive/80 mt-1">
              Access must be revoked immediately upon termination approval. Urgent items indicate termination date has passed or approval is older than 3 days.
            </p>
          </div>
        </div>

        {/* Pending Revocations List */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <div className="px-8 py-5 border-b border-border">
            <h2 className="font-bold text-foreground text-lg">Pending Access Revocations</h2>
          </div>

          <div className="divide-y divide-border">
            {pendingRevocations.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-foreground">All Clear</p>
                <p className="text-muted-foreground mt-2">
                  No pending access revocations. All terminated employees have had their access revoked.
                </p>
              </div>
            ) : (
              pendingRevocations.map((item) => (
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                        {item.workEmail && (
                          <p className="text-sm text-muted-foreground mt-1">{item.workEmail}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          Reason: {item.terminationReason.length > 60 ? item.terminationReason.slice(0, 60) + '...' : item.terminationReason}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          {item.terminationDate && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Last Day: {new Date(item.terminationDate).toLocaleDateString()}
                              {new Date(item.terminationDate) <= new Date() && (
                                <span className="text-destructive font-bold ml-1">(PASSED)</span>
                              )}
                            </span>
                          )}
                          <span>Approved {item.daysSinceApproval} day(s) ago</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(item.employeeId, item.employeeName)}
                      disabled={processing === item.employeeId}
                      className={`px-6 py-3 font-bold rounded-full transition-all flex-shrink-0 ${item.isUrgent
                          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                          : 'bg-foreground text-background hover:bg-foreground/90'
                        } disabled:opacity-50`}
                    >
                      {processing === item.employeeId ? 'Revoking...' : 'Revoke Access'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Access Types */}
        <div className="bg-card rounded-3xl border border-border p-8">
          <h2 className="font-bold text-foreground mb-6">Access Types Revoked</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { name: 'SSO', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { name: 'Internal Systems', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { name: 'Payroll', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((item) => (
              <div key={item.name} className="p-5 bg-muted/30 rounded-2xl text-center border border-border/50 hover:border-border transition-colors">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">Disabled on revoke</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
