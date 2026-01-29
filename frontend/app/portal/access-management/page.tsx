'use client';

import { useState, useEffect } from 'react';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import { offboardingService, TerminationRequest, TerminationStatus } from '@/app/services/offboarding';
import { LucideShield, LucideUserPlus, LucideUserMinus, LucideChevronRight, LucideInfo, LucideCheckCircle2, LucideAlertCircle, LucideLoader2, LucideKey, LucideMail, LucideLaptop, LucideZap } from 'lucide-react';

type TabType = 'provisioning' | 'revocation';

const ACCESS_TYPES = [
  { id: 'email', name: 'Email', description: 'Corporate mailbox setup', icon: LucideMail },
  { id: 'sso', name: 'Identity (SSO)', description: 'Centralized authentication', icon: LucideKey },
  { id: 'internal_systems', name: 'Internal Systems', description: 'HRIS & Operations tools', icon: LucideZap },
  { id: 'payroll', name: 'Payroll & Benefits', description: 'Financial system access', icon: LucideShield },
];

export default function AccessManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('provisioning');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [terminations, setTerminations] = useState<TerminationRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'provisioning') {
        const result = await onboardingService.getAllOnboardings();
        const pending = Array.isArray(result)
          ? result.filter(o => !o.completed && hasITPendingTasks(o))
          : [];
        setOnboardings(pending);
      } else {
        const result = await offboardingService.getAllTerminationRequests();
        const approved = Array.isArray(result)
          ? result.filter(r => r.status === TerminationStatus.APPROVED)
          : [];
        setTerminations(approved);
      }
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setOnboardings([]);
      setTerminations([]);
    } finally {
      setLoading(false);
    }
  };

  const hasITPendingTasks = (onboarding: Onboarding) => {
    return onboarding.tasks?.some(t =>
      t.department === 'IT' && t.status !== OnboardingTaskStatus.COMPLETED
    ) || false;
  };

  const handleProvisionAccess = async (onboarding: Onboarding) => {
    const employeeId = typeof onboarding.employeeId === 'object'
      ? (onboarding.employeeId as any)?._id
      : onboarding.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    try {
      setProcessing(onboarding._id);
      setError(null);
      setSuccess(null);

      await onboardingService.provisionSystemAccess({ employeeId });

      const itTasks = onboarding.tasks?.filter(t => t.department === 'IT') || [];
      for (const task of itTasks) {
        if (task.status !== OnboardingTaskStatus.COMPLETED) {
          await onboardingService.updateTaskStatus(onboarding._id, task.name, {
            status: OnboardingTaskStatus.COMPLETED,
            completedAt: new Date().toISOString(),
          });
        }
      }

      setSuccess(`System access provisioned successfully`);
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to provision access');
    } finally {
      setProcessing(null);
    }
  };

  const handleRevokeAccess = async (request: TerminationRequest) => {
    const employeeId = typeof request.employeeId === 'object'
      ? (request.employeeId as any)?._id
      : request.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    try {
      setProcessing(request._id);
      setError(null);
      setSuccess(null);

      await offboardingService.revokeSystemAccess({ employeeId });

      setSuccess(`System access revoked successfully`);
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded-lg w-64"></div>
              <div className="h-4 bg-gray-50 rounded w-96"></div>
            </div>
          </div>
          <div className="h-16 bg-gray-50 rounded-2xl border border-gray-100"></div>
          <div className="grid grid-cols-1 gap-6">
            <div className="h-96 bg-gray-50 rounded-3xl border border-gray-100"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10 font-sans text-[#1a1a1a]">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest mb-4">
              <LucideShield className="w-3 h-3" />
              Security Operations
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black">
              System Access
            </h1>
            <p className="text-gray-500 mt-3 text-lg max-w-xl leading-relaxed">
              Global identity and access management. Provisioning and revocation of corporate credentials and system roles.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="px-6 py-4 bg-white border border-black/5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <LucideZap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Tasks</p>
                <p className="text-xl font-black">{activeTab === 'provisioning' ? onboardings.length : terminations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-900 px-6 py-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <LucideAlertCircle className="w-6 h-6 text-red-600" />
            <p className="font-semibold text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-black text-white px-6 py-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl">
            <LucideCheckCircle2 className="w-6 h-6 text-white" />
            <p className="font-bold text-sm tracking-wide">{success}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex p-1.5 bg-gray-100/80 rounded-2xl backdrop-blur-md sticky top-6 z-40 border border-white max-w-md mx-auto shadow-sm">
          <button
            onClick={() => setActiveTab('provisioning')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'provisioning'
                ? 'bg-white text-black shadow-lg shadow-black/5'
                : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <LucideUserPlus className="w-4 h-4" />
            Provisioning
          </button>
          <button
            onClick={() => setActiveTab('revocation')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'revocation'
                ? 'bg-white text-black shadow-lg shadow-black/5'
                : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <LucideUserMinus className="w-4 h-4" />
            Revocation
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Worklist */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                {activeTab === 'provisioning' ? 'Queue' : 'Review'}
                <span className="text-gray-300 font-normal">/</span>
                <span className="text-gray-400 text-sm font-bold uppercase tracking-wider">
                  {activeTab === 'provisioning' ? `${onboardings.length} Pending` : `${terminations.length} Pending`}
                </span>
              </h2>
              <button onClick={fetchData} className="text-xs font-bold text-gray-400 hover:text-black transition-colors">
                REFRESH DATA
              </button>
            </div>

            <div className="space-y-4">
              {activeTab === 'provisioning' ? (
                onboardings.length === 0 ? (
                  <EmptyState message="All provisioning requests completed." sub="No new hires currently in the IT queue." />
                ) : (
                  onboardings.map((o) => (
                    <ProvisioningCard
                      key={o._id}
                      onboarding={o}
                      isProcessing={processing === o._id}
                      onAction={() => handleProvisionAccess(o)}
                    />
                  ))
                )
              ) : (
                terminations.length === 0 ? (
                  <EmptyState message="System security is up to date." sub="No pending access revocations found." />
                ) : (
                  terminations.map((r) => (
                    <RevocationCard
                      key={r._id}
                      request={r}
                      isProcessing={processing === r._id}
                      onAction={() => handleRevokeAccess(r)}
                    />
                  ))
                )
              )}
            </div>
          </div>

          {/* Sidebar / Info Panel */}
          <div className="space-y-6">
            <div className="bg-black rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <LucideShield className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-4">Security Notice</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-8">
                  {activeTab === 'provisioning'
                    ? "Provisioning should only occur after identity verification. System roles assigned here define the perimeter of corporate data access."
                    : "Access revocation is an irreversible security command. Ensure all departmental sign-offs are reviewed before final decommissioning."}
                </p>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                    <LucideInfo className="w-5 h-5 text-white/40" />
                    <p className="text-[12px] font-bold tracking-wide">Audit log will be recorded</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Directory Services</h3>
              <div className="space-y-6">
                {ACCESS_TYPES.map((access) => (
                  <div key={access.id} className="flex items-center gap-4 group">
                    <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-black group-hover:text-white transition-all duration-300">
                      <access.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black">{access.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{access.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ProvisioningCard({ onboarding, isProcessing, onAction }: { onboarding: Onboarding, isProcessing: boolean, onAction: () => void }) {
  const employeeData = typeof onboarding.employeeId === 'object' ? (onboarding.employeeId as any) : null;
  const name = employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : 'New Employee';
  const role = employeeData?.primaryPositionId?.title || 'System User';
  const dept = employeeData?.primaryDepartmentId?.name || 'IT Operations';
  const itTasks = onboarding.tasks?.filter(t => t.department === 'IT') || [];

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-8 hover:shadow-xl hover:shadow-black/5 transition-all duration-500 group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-black font-black text-xl group-hover:bg-black group-hover:text-white transition-colors duration-500">
            {name.charAt(0)}
          </div>
          <div>
            <h4 className="text-xl font-black tracking-tight">{name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{role}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dept}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">Queue Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Ready to provision</span>
            </div>
          </div>

          <button
            onClick={onAction}
            disabled={isProcessing}
            className="px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-lg shadow-black/10"
          >
            {isProcessing ? (
              <LucideLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LucideUserPlus className="w-4 h-4 text-white" />
            )}
            GRANT ACCESS
          </button>
        </div>
      </div>

      {itTasks.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-50 flex flex-wrap gap-4">
          {itTasks.map((t, i) => (
            <div key={i} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 transition-all duration-300 ${t.status === OnboardingTaskStatus.COMPLETED
                ? 'bg-green-50 border-green-100 text-green-700'
                : 'bg-white border-gray-100 text-gray-400'
              }`}>
              <LucideCheckCircle2 className={`w-3 h-3 ${t.status === OnboardingTaskStatus.COMPLETED ? 'text-green-600' : 'text-gray-200'}`} />
              {t.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RevocationCard({ request, isProcessing, onAction }: { request: TerminationRequest, isProcessing: boolean, onAction: () => void }) {
  const employeeData = typeof request.employeeId === 'object' ? (request.employeeId as any) : null;
  const name = employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : 'Terminated Employee';
  const role = employeeData?.primaryPositionId?.title || 'Former Employee';
  const reason = typeof request.reason === 'string' ? request.reason : 'Professional Separation';

  return (
    <div className="bg-white border border-red-50 rounded-[32px] p-8 hover:shadow-xl hover:shadow-red-900/5 transition-all duration-500 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-100/50 transition-colors duration-500"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 font-black text-xl group-hover:bg-red-600 group-hover:text-white transition-colors duration-500 shadow-sm shadow-red-200">
            {name.charAt(0)}
          </div>
          <div>
            <h4 className="text-xl font-black tracking-tight">{name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{role}</span>
              <span className="w-1 h-1 rounded-full bg-red-200"></span>
              <span className="text-[10px] font-bold text-red-600/60 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-full">Secure Deletion Required</span>
            </div>
          </div>
        </div>

        <button
          onClick={onAction}
          disabled={isProcessing}
          className="px-8 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-lg shadow-red-600/20"
        >
          {isProcessing ? (
            <LucideLoader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LucideUserMinus className="w-4 h-4 text-white" />
          )}
          BLOCK ALL ACCESS
        </button>
      </div>

      <div className="mt-8 pt-8 border-t border-red-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LucideAlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-[11px] font-bold text-gray-500 italic max-w-md">"{reason}"</p>
        </div>
        {request.terminationDate && (
          <p className="text-[10px] font-black text-red-900/40 uppercase tracking-widest">
            Effective: {new Date(request.terminationDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message, sub }: { message: string, sub: string }) {
  return (
    <div className="py-20 text-center bg-white border border-gray-100 rounded-[32px] shadow-sm">
      <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <LucideShield className="w-10 h-10 text-gray-200" />
      </div>
      <p className="text-xl font-black tracking-tight text-black">{message}</p>
      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">{sub}</p>
    </div>
  );
}
