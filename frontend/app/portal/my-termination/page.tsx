'use client';

import { useState, useEffect } from 'react';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  ClearanceChecklist,
  ClearanceCompletionStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/context/AuthContext';
import {
  LucideCheckCircle2,
  LucideClock,
  LucideAlertCircle,
  LucideShield,
  LucideLayout,
  LucideChevronRight,
  LucideCalendar,
  LucideInfo,
  LucideArrowRight,
  LucidePackage,
  LucideContact2,
  LucideFileText,
  LucideTimer
} from 'lucide-react';

export default function MyTerminationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [termination, setTermination] = useState<TerminationRequest | null>(null);
  const [clearanceChecklist, setClearanceChecklist] = useState<ClearanceChecklist | null>(null);
  const [clearanceStatus, setClearanceStatus] = useState<ClearanceCompletionStatus | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTerminationStatus();
    }
  }, [user?.id]);

  const fetchTerminationStatus = async () => {
    try {
      setLoading(true);
      const employeeId = user?.id;
      if (!employeeId) return;

      const requests = await offboardingService.getAllTerminationRequests(employeeId);

      if (requests && requests.length > 0) {
        const latestTermination = requests[0];
        setTermination(latestTermination);

        if (latestTermination.status === TerminationStatus.APPROVED) {
          try {
            const checklist = await offboardingService.getClearanceChecklistByTerminationId(
              latestTermination._id
            );
            setClearanceChecklist(checklist);

            const status = await offboardingService.getClearanceCompletionStatus(checklist._id);
            setClearanceStatus(status);
          } catch (err) {
            // Checklist not created yet
          }
        }
      }
    } catch (err) {
      // Handle silently
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return {
          icon: LucideClock,
          color: 'text-warning',
          bg: 'bg-warning/10',
          border: 'border-warning/20',
          description: 'Awaiting initial departmental review.',
        };
      case TerminationStatus.UNDER_REVIEW:
        return {
          icon: LucideTimer,
          color: 'text-primary',
          bg: 'bg-primary/10',
          border: 'border-primary/20',
          description: 'HR and Management are coordinating your final paperwork.',
        };
      case TerminationStatus.APPROVED:
        return {
          icon: LucideCheckCircle2,
          color: 'text-success',
          bg: 'bg-success/10',
          border: 'border-success/20',
          description: 'Request authorized. Clearance protocols are active.',
        };
      case TerminationStatus.REJECTED:
        return {
          icon: LucideAlertCircle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          description: 'Request declined. Please contact your HR representative.',
        };
      default:
        return {
          icon: LucideInfo,
          color: 'text-muted-foreground',
          bg: 'bg-muted/50',
          border: 'border-border',
          description: 'System state: Unknown.',
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 animate-pulse">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="h-12 bg-muted rounded-2xl w-64"></div>
          <div className="h-96 bg-muted/50 rounded-[48px]"></div>
          <div className="h-64 bg-muted/50 rounded-[48px]"></div>
        </div>
      </div>
    );
  }

  if (!termination) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-8 bg-background">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-8 border border-border">
          <LucideShield className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4 text-foreground">Account Status: Active</h1>
        <p className="text-muted-foreground font-medium max-w-sm mb-10">
          No pending termination or resignation requests were found for your employee profile.
        </p>
        <div className="px-6 py-3 bg-foreground text-background rounded-full text-[10px] font-black uppercase tracking-widest cursor-default">
          Corporate Secure Identity
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(termination.status);
  const clearanceProgress =
    clearanceChecklist && clearanceStatus
      ? Math.round(
        ((clearanceChecklist.items.filter((i) => i.status === 'approved').length || 0) /
          (clearanceChecklist.items.length || 1)) *
        100
      )
      : 0;

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 font-sans text-foreground">
      <div className="max-w-5xl mx-auto space-y-12">

        {/* Superior Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground text-background text-[10px] font-black uppercase tracking-[0.2em]">
              <statusConfig.icon className="w-3.5 h-3.5" />
              Case Status: {termination.status}
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground">
              {termination.initiator === 'employee' ? 'Departure' : 'Separation'}
            </h1>
            <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              Ref Code: T-{termination._id.toUpperCase()}
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
              Submitted {new Date(termination.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Effective Last Day</p>
              <div className="flex items-center gap-3">
                <LucideCalendar className="w-6 h-6 text-foreground" />
                <p className="text-3xl font-black tracking-tighter text-foreground">
                  {termination.terminationDate ? new Date(termination.terminationDate).toLocaleDateString() : 'TBD'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Overview Card */}
        <div className="bg-card border border-border rounded-[48px] p-10 shadow-2xl shadow-black/[0.02] flex flex-col md:flex-row gap-12">
          <div className="md:w-1/3 flex flex-col justify-between">
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl ${statusConfig.bg} ${statusConfig.border} flex flex-col items-center text-center`}>
                <statusConfig.icon className={`w-12 h-12 ${statusConfig.color} mb-4`} />
                <p className={`text-xs font-black uppercase tracking-widest ${statusConfig.color}`}>{termination.status}</p>
                <p className="text-gray-500 font-medium text-sm mt-3 leading-relaxed">{statusConfig.description}</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Case Details</h4>
                <div className="space-y-2">
                  <DetailRow label="Primary Reason" value={termination.reason} />
                  {termination.employeeComments && <DetailRow label="Your Comments" value={termination.employeeComments} />}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-10">
            {termination.status === TerminationStatus.APPROVED ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-tight">Clearance Checklist</h3>
                  <div className="px-4 py-1.5 bg-green-50 rounded-full border border-green-100">
                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">{clearanceProgress}% Complete</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-black h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${clearanceProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Security sign-off in progress</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clearanceChecklist?.items.map((item, idx) => (
                    <ClearanceItemRow key={idx} item={item} />
                  ))}
                  <AssetStatusRow
                    label="IT Hardware Return"
                    isComplete={clearanceStatus?.allEquipmentReturned || false}
                    icon={LucidePackage}
                  />
                  <AssetStatusRow
                    label="Security Badge Return"
                    isComplete={clearanceStatus?.cardReturned || false}
                    icon={LucideContact2}
                  />
                </div>

                {clearanceStatus?.fullyCleared && (
                  <div className="p-8 bg-foreground text-background rounded-[32px] flex items-center gap-6 shadow-2xl">
                    <LucideCheckCircle2 className="w-10 h-10 text-background animate-bounce" />
                    <div>
                      <p className="text-lg font-black tracking-tight text-background">Separation Protocols Finalized</p>
                      <p className="text-background/40 text-sm font-bold uppercase tracking-widest mt-1">Ready for settlement</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <LucideFileText className="w-20 h-20 text-gray-50 mb-8" />
                <h3 className="text-2xl font-black tracking-tight text-gray-200 uppercase">Awaiting Authorization</h3>
                <p className="text-gray-300 text-sm font-bold uppercase tracking-widest mt-4">Checklist will materialize upon approval.</p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic HR Feed */}
        {termination.hrComments && (
          <div className="bg-card rounded-[48px] p-10 text-card-foreground relative overflow-hidden group border border-border">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <LucideArrowRight className="w-48 h-48 -rotate-45" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start md:items-center">
              <div className="p-6 bg-muted rounded-3xl border border-border shrink-0">
                <LucideInfo className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-3">Governance Feed / HR Message</h4>
                <p className="text-2xl font-black tracking-tight text-foreground italic leading-snug">
                  "{termination.hrComments}"
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-foreground leading-relaxed">{value}</p>
    </div>
  );
}

function ClearanceItemRow({ item }: { item: any }) {
  const isApproved = item.status === 'approved';
  return (
    <div className={`p-5 rounded-3xl border transition-all duration-500 flex items-center justify-between group ${isApproved ? 'bg-card border-border' : 'bg-muted/30 border-muted-foreground/20 cursor-not-allowed opacity-60'
      }`}>
      <div className="flex items-center gap-4">
        <div className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-foreground' : 'bg-muted'}`} />
        <p className={`text-xs font-black uppercase tracking-widest ${isApproved ? 'text-foreground' : 'text-muted-foreground'}`}>
          {item.department}
        </p>
      </div>
      {isApproved ? (
        <LucideCheckCircle2 className="w-4 h-4 text-foreground" />
      ) : (
        <LucideClock className="w-4 h-4 text-muted" />
      )}
    </div>
  );
}

function AssetStatusRow({ label, isComplete, icon: Icon }: { label: string, isComplete: boolean, icon: any }) {
  return (
    <div className={`p-5 rounded-3xl border transition-all duration-500 flex items-center justify-between group ${isComplete ? 'bg-card border-border shadow-sm' : 'bg-muted/30 border-muted-foreground/20 opacity-60'
      }`}>
      <div className="flex items-center gap-4 text-muted-foreground group-hover:text-foreground">
        <Icon className={`w-5 h-5 ${isComplete ? 'text-foreground' : 'text-muted'}`} />
        <p className={`text-[10px] font-black uppercase tracking-widest ${isComplete ? 'text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </p>
      </div>
      {isComplete ? (
        <LucideCheckCircle2 className="w-4 h-4 text-foreground" />
      ) : (
        <div className="w-4 h-4 border-2 border-dashed border-border rounded-full" />
      )}
    </div>
  );
}
