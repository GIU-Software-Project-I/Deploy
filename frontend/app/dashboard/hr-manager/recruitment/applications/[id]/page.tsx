'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    getApplicationById,
    updateApplicationStage,
    updateApplicationStatus,
    getInterviewsByApplication,
    rejectApplication
} from '@/app/services/recruitment';
import { Application, Interview } from '@/types/recruitment';
import { ApplicationStage, ApplicationStatus, InterviewStatus } from '@/types/enums';
import {
    User,
    Mail,
    Phone,
    Linkedin,
    Globe,
    FileText,
    Calendar,
    ChevronLeft,
    ExternalLink,
    Download,
    Clock,
    CheckCircle2,
    XCircle,
    Zap,
    MoreVertical,
    MessageSquare,
    ShieldCheck,
    AlertTriangle,
    ArrowUpRight,
    Briefcase,
    ChevronRight
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ApplicationDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [application, setApplication] = useState<Application | null>(null);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [appData, interviewsData] = await Promise.all([
                getApplicationById(id as string),
                getInterviewsByApplication(id as string).catch(() => [])
            ]);
            setApplication(appData);
            setInterviews(interviewsData);
        } catch (err: any) {
            toast.error('Failed to load application data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStageChange = async (newStage: ApplicationStage) => {
        if (!application) return;
        try {
            setUpdating(true);
            await updateApplicationStage(application.id, newStage);
            toast.success(`Transitioned to ${newStage.replace('_', ' ')}`);
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Stage transition failed');
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusChange = async (newStatus: ApplicationStatus) => {
        if (!application) return;
        try {
            setUpdating(true);
            await updateApplicationStatus(application.id, { status: newStatus });
            toast.success(`Application marked as ${newStatus.replace('_', ' ')}`);
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Status update failed');
        } finally {
            setUpdating(false);
        }
    };

    const handleReject = async () => {
        if (!application) return;
        const reason = prompt('Please provide a reason for rejection (optional):');
        if (reason === null) return;

        try {
            setUpdating(true);
            await rejectApplication(application.id, reason || undefined);
            toast.success('Application rejected');
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Rejection failed');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <LoadingSpinner size="lg" className="text-primary" />
                <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Loading Application Dossier</p>
            </div>
        );
    }

    if (!application) {
        return (
            <div className="p-8 text-center space-y-4">
                <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
                <h2 className="text-2xl font-bold">Application Not Found</h2>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const { candidate, requisition } = application;
    const initials = candidate ? `${candidate.firstName?.[0] || ''}${candidate.lastName?.[0] || ''}`.toUpperCase() : '??';

    const statusColors: Record<string, string> = {
        [ApplicationStatus.SUBMITTED]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        [ApplicationStatus.IN_PROCESS]: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        [ApplicationStatus.OFFER]: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        [ApplicationStatus.HIRED]: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        [ApplicationStatus.REJECTED]: 'bg-destructive/10 text-destructive border-destructive/20',
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Navigation & Actions */}
            <div className="flex items-center justify-between gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/hr-manager/recruitment/applications')}
                    className="group text-muted-foreground hover:text-primary transition-colors pr-6 pl-2 h-12 rounded-2xl"
                >
                    <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Back to Global Pipeline</span>
                </Button>

                <div className="flex items-center gap-2">
                    {application.status !== ApplicationStatus.REJECTED && application.status !== ApplicationStatus.HIRED && (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" disabled={updating} className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-border hover:bg-muted transition-all">
                                        Update Pipeline Stage <Zap className="w-4 h-4 ml-2 text-primary" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                                    <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest px-2 py-3 opacity-50">Transition To</DropdownMenuLabel>
                                    {Object.values(ApplicationStage).map((stage) => (
                                        <DropdownMenuItem
                                            key={stage}
                                            onClick={() => handleStageChange(stage)}
                                            className={`rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest mb-1 cursor-pointer transition-colors ${application.currentStage === stage ? 'bg-primary/10 text-primary' : ''}`}
                                        >
                                            {stage.replace('_', ' ')}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                onClick={handleReject}
                                disabled={updating}
                                variant="destructive"
                                className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/10 hover:shadow-destructive/25 transition-all"
                            >
                                Archive Dossier <XCircle className="w-4 h-4 ml-2" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Candidate & Job Details */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Main Dossier Header Card */}
                    <GlassCard className="p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -z-10" />

                        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                            <div className="relative">
                                <Avatar className="w-32 h-32 rounded-[40px] shadow-2xl border-4 border-background ring-1 ring-border/50">
                                    <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-black text-4xl italic">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2 p-3 bg-emerald-500 rounded-2xl shadow-xl border-4 border-background">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                                            {application.candidateName}
                                        </h1>
                                        <Badge className={`${statusColors[application.status]} py-1 px-4 font-black uppercase text-[10px] tracking-widest h-fit italic border`}>
                                            {application.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-primary" /> Application #{application.id.slice(-8).toUpperCase()}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-xl border border-border/50">
                                        <Mail className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-black uppercase tracking-widest text-foreground/80">{application.candidateEmail}</span>
                                    </div>
                                    {candidate?.mobilePhone && (
                                        <div className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-xl border border-border/50">
                                            <Phone className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-black uppercase tracking-widest text-foreground/80">{candidate.mobilePhone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Job Mandate Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <GlassCard className="p-8 space-y-6">
                            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-[10px]">
                                <Briefcase className="w-4 h-4" /> Strategic Mandate Link
                            </div>
                            <div className="space-y-4 text-foreground/90 font-medium leading-relaxed">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight leading-tight uppercase mb-1">
                                        {application.jobTitle}
                                    </h3>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        {application.departmentName} Department
                                    </p>
                                </div>
                                {requisition && (
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Location</p>
                                            <p className="text-sm font-bold uppercase tracking-tight">{requisition.location || 'Remote Selection'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Openings</p>
                                            <p className="text-sm font-bold uppercase tracking-tight">{requisition.openings} Positions</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-8 space-y-6">
                            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-[10px]">
                                <Clock className="w-4 h-4" /> Operational Metrics
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Pipeline Progress</p>
                                        <p className="text-xs font-black uppercase tracking-widest text-primary italic">{application.currentStage.replace('_', ' ')}</p>
                                    </div>
                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/30">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                                            style={{
                                                width: application.currentStage === ApplicationStage.SCREENING ? '25%' :
                                                    application.currentStage === ApplicationStage.DEPARTMENT_INTERVIEW ? '50%' :
                                                        application.currentStage === ApplicationStage.HR_INTERVIEW ? '75%' : '100%'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 pt-2">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Submitted</p>
                                        <p className="text-sm font-bold tracking-tight">{new Date(application.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                    <div className="w-[1px] h-8 bg-border/50" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Last Update</p>
                                        <p className="text-sm font-bold tracking-tight">{new Date(application.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Social & Resources */}
                    <GlassCard className="p-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-8 border-b border-primary/10 pb-4">Digital Identity & Artifacts</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 italic mb-4">Professional Linkage</h4>
                                <div className="space-y-3">
                                    {candidate?.linkedInUrl ? (
                                        <a
                                            href={candidate.linkedInUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50 hover:border-primary/40 group transition-all"
                                        >
                                            <div className="p-3 bg-blue-600/10 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                                <Linkedin className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black uppercase tracking-widest">LinkedIn Profile</p>
                                                <p className="text-[10px] font-medium text-muted-foreground truncate max-w-[200px]">{candidate.linkedInUrl}</p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-4 p-4 bg-muted/10 rounded-2xl border border-dashed border-border/50 opacity-50">
                                            <div className="p-3 bg-muted text-muted-foreground rounded-xl">
                                                <Linkedin className="w-5 h-5" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest italic">LinkedIn Not Provided</p>
                                        </div>
                                    )}

                                    {candidate?.portfolioUrl ? (
                                        <a
                                            href={candidate.portfolioUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50 hover:border-primary/40 group transition-all"
                                        >
                                            <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black uppercase tracking-widest">Personal Portfolio</p>
                                                <p className="text-[10px] font-medium text-muted-foreground truncate max-w-[200px]">{candidate.portfolioUrl}</p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-4 p-4 bg-muted/10 rounded-2xl border border-dashed border-border/50 opacity-50">
                                            <div className="p-3 bg-muted text-muted-foreground rounded-xl">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest italic">Portfolio Not Provided</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 italic mb-4">Core Documentation</h4>
                                <div className="space-y-3">
                                    {candidate?.resumeUrl ? (
                                        <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-[30px] border border-primary/20 hover:border-primary/40 group transition-all shadow-xl shadow-primary/5">
                                            <div className="p-4 bg-primary/20 text-primary rounded-2xl group-hover:rotate-12 transition-transform shadow-sm">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-black uppercase tracking-tight leading-tight">Candidate Curriculum Vitae</p>
                                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest pt-0.5">Primary Documentation</p>
                                            </div>
                                            <Button variant="outline" size="sm" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-4 gap-2 bg-background/50 hover:bg-primary hover:text-white border-primary/20" asChild>
                                                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                                                    <Download className="w-4 h-4" /> Access
                                                </a>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 p-6 bg-muted/10 rounded-[30px] border border-dashed border-border/50 opacity-50 h-[104px]">
                                            <div className="p-4 bg-muted text-muted-foreground rounded-2xl">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest italic text-center w-full">No CV Document Attached</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column: Interviews & Pipeline Timeline */}
                <div className="space-y-8">
                    {/* Quick Stats / Assigned HR */}
                    <GlassCard className="p-8 space-y-6">
                        <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-[10px]">
                            <ShieldCheck className="w-4 h-4" /> Ownership
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 flex items-center gap-4">
                                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Institutional Lead</p>
                                    <p className="text-xs font-bold uppercase tracking-tight">HR Operations Team</p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Recruitment Events */}
                    <GlassCard className="p-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-[10px]">
                                <Calendar className="w-4 h-4" /> Pipeline Events
                            </div>
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2">{interviews.length} Scheduled</Badge>
                        </div>

                        <div className="space-y-6">
                            {interviews.length === 0 ? (
                                <div className="text-center py-12 px-6 rounded-3xl bg-muted/10 border border-dashed border-border/30 opacity-40 space-y-4">
                                    <Clock className="w-10 h-10 mx-auto text-muted-foreground" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em]">No Active Events</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Interviews pending coordination</p>
                                    </div>
                                </div>
                            ) : (
                                interviews.map((interview, idx) => (
                                    <div key={interview.id} className="relative pl-8 pb-8 group last:pb-0">
                                        {idx !== interviews.length - 1 && (
                                            <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-border/30 group-hover:bg-primary/20 transition-colors" />
                                        )}
                                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center p-1 group-hover:scale-110 transition-transform">
                                            <div className={`w-full h-full rounded-full ${interview.status === InterviewStatus.COMPLETED ? 'bg-emerald-500' : 'bg-primary'}`} />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-start">
                                                <p className="text-xs font-black uppercase tracking-widest text-foreground/90 leading-none">{interview.stage.replace('_', ' ')}</p>
                                                <Badge variant="outline" className="px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 italic h-fit border-border/30">{interview.status}</Badge>
                                            </div>
                                            <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(interview.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(interview.scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div className="pt-2">
                                                <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/hr-manager/recruitment/interviews`)} className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Manage Event <ArrowUpRight className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Button
                            onClick={() => router.push('/dashboard/hr-manager/recruitment/interviews')}
                            className="w-full h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                            Coordinate New Event
                        </Button>
                    </GlassCard>

                    {/* Assessment Overview */}
                    <GlassCard className="p-8 bg-gradient-to-br from-primary/5 to-blue-500/5">
                        <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-8">
                            <ShieldCheck className="w-4 h-4" /> Assessment Index
                        </div>

                        <div className="text-center space-y-6 py-4">
                            <div className="inline-flex flex-col items-center">
                                <div className="text-6xl font-black tracking-tighter text-foreground leading-none">--</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-2 italic">Composite Score</div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic leading-relaxed">
                                    Evaluation metrics will compute automatically after structured feedback cycles are processed.
                                </p>
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => router.push('/dashboard/hr-manager/recruitment/feedback')}
                                className="font-black uppercase tracking-widest text-[10px] text-primary hover:bg-primary/10"
                            >
                                View Peer Reviews <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
