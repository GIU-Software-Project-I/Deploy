'use client';

import { useState, useEffect } from 'react';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/context/AuthContext';
import {
  LucideSend,
  LucideHistory,
  LucideClock,
  LucideCheckCircle2,
  LucideXCircle,
  LucideTimer,
  LucideArrowRight,
  LucideInfo,
  LucideCalendar,
  LucideFileText,
  LucideChevronRight,
  LucideShieldAlert,
  LucideCheck,
  LucideUserCheck,
  LucideWallet,
  LucideUserPlus,
  LucideBox,
  LucideBadgeDollarSign
} from 'lucide-react';

export default function MyResignationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingRequests, setExistingRequests] = useState<TerminationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reason: '',
    employeeComments: '',
    terminationDate: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchExistingRequests();
    }
  }, [user]);

  const fetchExistingRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const employeeId = user?.id;
      if (employeeId) {
        const requests = await offboardingService.getResignationRequestsByEmployeeId(employeeId);
        setExistingRequests(Array.isArray(requests) ? requests : []);
      }
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        console.error('Failed to fetch resignation requests:', err);
      }
      setExistingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason || !formData.terminationDate) {
      setError('Please provide a reason and effective date');
      return;
    }

    const employeeId = user?.id;
    const contractId = (user as any)?.contractId || (user as any)?.employeeContractId || employeeId;

    if (!employeeId) {
      setError('Unable to determine employee information. Please contact HR.');
      return;
    }

    if (!contractId) {
      setError('Unable to find your contract information. Please contact HR.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await offboardingService.createResignationRequest({
        employeeId,
        contractId,
        reason: formData.reason,
        employeeComments: formData.employeeComments || undefined,
        terminationDate: formData.terminationDate,
      });

      setFormData({ reason: '', employeeComments: '', terminationDate: '' });
      setShowForm(false);
      setSuccess('Resignation request submitted. Governance protocols initiated.');
      await fetchExistingRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to submit resignation request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcons: Record<string, any> = {
    [TerminationStatus.PENDING]: { icon: LucideTimer, color: 'text-warning', label: 'Pending Assessment' },
    [TerminationStatus.UNDER_REVIEW]: { icon: LucideClock, color: 'text-primary', label: 'Under Review' },
    [TerminationStatus.APPROVED]: { icon: LucideCheckCircle2, color: 'text-success', label: 'Case Approved' },
    [TerminationStatus.REJECTED]: { icon: LucideXCircle, color: 'text-destructive', label: 'Action Declined' },
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    return today.toISOString().split('T')[0];
  };

  const activeRequest = existingRequests.find(
    (r) => r.status !== TerminationStatus.REJECTED
  );

  const steps = [
    { label: 'Submit', icon: LucideSend },
    { label: 'Review', icon: LucideUserCheck },
    { label: 'Finance', icon: LucideWallet },
    { label: 'Assets', icon: LucideBox },
    { label: 'Payment', icon: LucideBadgeDollarSign },
    { label: 'Complete', icon: LucideCheckCircle2 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 animate-pulse">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="h-12 bg-muted rounded-2xl w-64"></div>
          <div className="h-[500px] bg-muted/50 rounded-[48px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground text-background text-[10px] font-black uppercase tracking-[0.2em]">
              <LucideHistory className="w-3.5 h-3.5" />
              Case History
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground">
              Resignation
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-lg leading-relaxed">
              Initiate voluntary separation protocols. Your request will be reviewed by HR and Management teams.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-900 px-8 py-5 rounded-[32px] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm font-black text-xs uppercase tracking-widest">
            <LucideShieldAlert className="w-6 h-6 text-red-600" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-black text-white px-8 py-5 rounded-[32px] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl font-black text-xs uppercase tracking-[0.1em]">
            <LucideCheckCircle2 className="w-6 h-6 text-white" />
            {success}
          </div>
        )}

        {!activeRequest || showForm ? (
          <div className="bg-card border border-border rounded-[48px] overflow-hidden shadow-2xl shadow-black/[0.02] transform transition-all">
            <div className="p-10 md:p-16">
              <div className="flex items-center justify-between mb-12">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-foreground">Separation Form</h3>
                  <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Official Resignation Initiation</p>
                </div>
                {showForm && (
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors font-black text-xs tracking-widest uppercase">CANCEL</button>
                )}
              </div>

              {!showForm ? (
                <div className="text-center py-10 space-y-10">
                  <div className="w-24 h-24 bg-muted rounded-[40px] flex items-center justify-center mx-auto group hover:bg-foreground transition-all duration-500">
                    <LucideSend className="w-10 h-10 text-muted-foreground group-hover:text-background transition-colors duration-500" />
                  </div>
                  <div className="max-w-sm mx-auto">
                    <p className="text-muted-foreground font-medium mb-10 leading-relaxed">
                      You are currently in good standing. If you choose to proceed, your formal request will enter the governance queue.
                    </p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="px-12 py-5 bg-foreground text-background rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-105 transition-all active:scale-95"
                    >
                      Initiate Request
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Reason for Departure</label>
                      <select
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        className="w-full h-16 px-6 bg-muted/50 border-none rounded-2xl focus:ring-2 ring-primary text-sm font-bold transition-all appearance-none cursor-pointer text-foreground"
                        required
                      >
                        <option value="" className="bg-background">Choose a reason...</option>
                        <option value="Career Progression" className="bg-background">Career Progression</option>
                        <option value="Educational Pursuits" className="bg-background">Educational Pursuits</option>
                        <option value="Personal / Family" className="bg-background">Personal / Family</option>
                        <option value="Relocation" className="bg-background">Relocation</option>
                        <option value="Health & Wellness" className="bg-background">Health & Wellness</option>
                        <option value="Career Change" className="bg-background">Career Change</option>
                        <option value="Other" className="bg-background">Other</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Effective Date</label>
                      <input
                        type="date"
                        value={formData.terminationDate}
                        onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                        min={getMinDate()}
                        className="w-full h-16 px-6 bg-muted/50 border-none rounded-2xl focus:ring-2 ring-primary text-sm font-bold transition-all text-foreground"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Additional Discourse</label>
                    <textarea
                      value={formData.employeeComments}
                      onChange={(e) => setFormData({ ...formData, employeeComments: e.target.value })}
                      className="w-full p-8 bg-muted/50 border-none rounded-[32px] focus:ring-2 ring-primary text-sm font-bold transition-all min-h-[200px] text-foreground"
                      placeholder="Optional context for the HR review board..."
                    />
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-6 bg-foreground text-background rounded-3xl text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl shadow-black/20 hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                    >
                      {submitting ? <LucideTimer className="w-5 h-5 animate-spin" /> : <LucideSend className="w-5 h-5" />}
                      COMMIT RESIGNATION REQUEST
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-foreground rounded-[48px] p-12 text-background relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <LucideHistory className="w-48 h-48" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="w-32 h-32 rounded-[40px] bg-background/5 border border-background/10 flex items-center justify-center shrink-0">
                {(() => {
                  const Cfg = statusIcons[activeRequest.status] || statusIcons[TerminationStatus.PENDING];
                  return <Cfg.icon className={`w-12 h-12 ${Cfg.color}`} />;
                })()}
              </div>
              <div className="space-y-4 text-center md:text-left">
                <h3 className="text-3xl font-black tracking-tight">Active Separation Case</h3>
                <p className="text-background/40 font-medium leading-relaxed max-w-md">
                  Case identified. Governance protocols are currently evaluating your request. New submissions are restricted until resolution.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Process Stepper */}
        <div className="bg-card rounded-[40px] p-10 border border-border shadow-sm relative overflow-hidden">
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-12 text-center">Governance Workflow Map</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 relative">
            <div className="hidden md:block absolute top-[22px] left-0 w-full h-[1px] bg-border z-0"></div>
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${activeRequest?.status === TerminationStatus.APPROVED && i <= 3
                  ? 'bg-foreground text-background'
                  : i === 0 ? 'bg-foreground text-background' : 'bg-card text-muted border border-border'
                  }`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-center text-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Request Feed */}
        {existingRequests.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] px-4">Audit History</h3>
            {existingRequests.map((req) => (
              <div key={req._id} className="bg-card border border-border p-8 rounded-[40px] flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-foreground transition-colors duration-500">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-foreground transition-colors duration-500">
                    {(() => {
                      const Cfg = statusIcons[req.status] || statusIcons[TerminationStatus.PENDING];
                      return <Cfg.icon className={`w-6 h-6 transition-colors duration-500 ${Cfg.color} group-hover:text-background`} />;
                    })()}
                  </div>
                  <div>
                    <h4 className="font-black text-lg tracking-tight text-foreground">{req.reason}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      Submitted: {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-right">
                  <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                    <p className="font-black text-sm uppercase tracking-tighter text-foreground">{(statusIcons[req.status]?.label || req.status).toUpperCase()}</p>
                  </div>
                  <LucideChevronRight className="w-6 h-6 text-muted group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

