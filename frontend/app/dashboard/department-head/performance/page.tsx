'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { performanceService } from '@/app/services/performance';
import { timeManagementService } from '@/app/services/time-management';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Assignment {
  _id: string;
  cycleId: {
    _id: string;
    name: string;
    status: string;
  };
  templateId?: {
    _id: string;
    name: string;
    ratingScale: {
      type: string;
      min: number;
      max: number;
    };
    criteria: {
      key: string;
      title: string;
      details?: string;
      weight?: number;
    }[];
  };
  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    jobTitle?: string;
    primaryDepartmentId?: {
      name: string;
    };
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'PUBLISHED';
  dueDate?: string;
  createdAt: string;
}

interface AppraisalRecord {
  assignmentId: string;
  ratings: {
    criterionKey: string;
    score: number;
    comment?: string;
  }[];
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  managerComments?: string;
}

export default function DepartmentHeadPerformancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);

  const [formData, setFormData] = useState<AppraisalRecord>({
    assignmentId: '',
    ratings: [],
    overallRating: undefined,
    strengths: '',
    areasForImprovement: '',
    developmentPlan: '',
    managerComments: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ latenessCount: number; totalMinutes: number } | null>(null);
  const [fetchingAttendance, setFetchingAttendance] = useState(false);
  const [showViewFramework, setShowViewFramework] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();
    }
  }, [user?.id]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await performanceService.getAssignmentsForManager(user?.id || '');
      if (response.error) {
        setError(response.error);
        return;
      }
      const responseData = response.data;
      if (Array.isArray(responseData)) {
        setAssignments(responseData as Assignment[]);
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        setAssignments((responseData as { data: Assignment[] }).data);
      } else {
        setAssignments([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const initialRatings = assignment.templateId?.criteria?.map(criterion => ({
      criterionKey: criterion.key,
      score: 0,
      comment: '',
    })) || [];
    setFormData({
      assignmentId: assignment._id,
      ratings: initialRatings,
      overallRating: undefined,
      strengths: '',
      areasForImprovement: '',
      developmentPlan: '',
      managerComments: '',
    });
    setShowEvaluationForm(true);
    fetchAttendanceMetrics(assignment.employeeProfileId._id);
  };

  const fetchAttendanceMetrics = async (employeeId: string) => {
    try {
      setFetchingAttendance(true);
      const [latenessRes, attendanceRes] = await Promise.all([
        timeManagementService.getRepeatedLatenessCount(employeeId),
        timeManagementService.getMonthlyAttendance(employeeId, new Date().getMonth() + 1, new Date().getFullYear())
      ]);

      const latenessCount = (latenessRes as any).data?.count || 0;
      const records = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      const totalMinutes = records.reduce((acc: number, curr: any) => acc + (curr.totalWorkMinutes || 0), 0);

      setAttendanceData({ latenessCount, totalMinutes });
    } catch (err) {
      console.error('Failed to fetch attendance metrics:', err);
    } finally {
      setFetchingAttendance(false);
    }
  };

  const handleRatingChange = (criterionKey: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: prev.ratings.map(r =>
        r.criterionKey === criterionKey ? { ...r, score } : r
      ),
    }));
  };

  const handleCommentChange = (criterionKey: string, comment: string) => {
    setFormData(prev => ({
      ...prev,
      ratings: prev.ratings.map(r =>
        r.criterionKey === criterionKey ? { ...r, comment } : r
      ),
    }));
  };

  const calculateOverallRating = () => {
    const template = selectedAssignment?.templateId;
    if (!template?.criteria) return 0;
    let totalWeightedScore = 0;
    let totalWeight = 0;
    formData.ratings.forEach(rating => {
      const criterion = template.criteria.find(c => c.key === rating.criterionKey);
      const weight = criterion?.weight || 1;
      totalWeightedScore += rating.score * weight;
      totalWeight += weight;
    });
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  };

  const handleSaveDraft = async () => {
    try {
      setIsSubmitting(true);
      const overall = calculateOverallRating();
      const response = await performanceService.saveDraftRecord({
        assignmentId: formData.assignmentId,
        ratings: formData.ratings,
        overallRating: overall,
        strengths: formData.strengths || undefined,
        areasForImprovement: formData.areasForImprovement || undefined,
        developmentPlan: formData.developmentPlan || undefined,
        managerComments: formData.managerComments || undefined,
      });
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success('Draft saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    const unratedCriteria = formData.ratings.filter(r => r.score === 0);
    if (unratedCriteria.length > 0) {
      toast.error('Please rate all criteria before submitting');
      return;
    }
    try {
      setIsSubmitting(true);
      const overall = calculateOverallRating();
      const response = await performanceService.submitAppraisalRecord({
        assignmentId: formData.assignmentId,
        ratings: formData.ratings,
        overallRating: overall,
        strengths: formData.strengths || undefined,
        areasForImprovement: formData.areasForImprovement || undefined,
        developmentPlan: formData.developmentPlan || undefined,
        managerComments: formData.managerComments || undefined,
      });
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success('Evaluation submitted successfully');
      setShowEvaluationForm(false);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-muted text-muted-foreground border-border',
    IN_PROGRESS: 'bg-muted-foreground text-background border-muted-foreground',
    SUBMITTED: 'bg-foreground text-background border-foreground',
    PUBLISHED: 'bg-foreground text-background border-foreground opacity-80',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/department-head" className="hover:text-foreground">Department Head</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Team Performance</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Talent Evaluation Hub</h1>
          <p className="text-muted-foreground mt-1 text-sm">Review and finalize performance appraisals for your direct reports</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assigned</p>
              <p className="text-2xl font-black text-foreground">{assignments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending</p>
              <p className="text-2xl font-black text-foreground">{assignments.filter(a => a.status === 'PENDING').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completed</p>
              <p className="text-2xl font-black text-foreground">{assignments.filter(a => a.status === 'SUBMITTED' || a.status === 'PUBLISHED').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((assignment) => (
          <div
            key={assignment._id}
            className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {assignment.employeeProfileId?.firstName} {assignment.employeeProfileId?.lastName}
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                    {assignment.employeeProfileId?.jobTitle || 'Unassigned Title'}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${statusColors[assignment.status]}`}>
                  {assignment.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {assignment.employeeProfileId?.primaryDepartmentId?.name || 'Global'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Cycle: <span className="text-foreground font-medium">{assignment.cycleId?.name}</span>
                </div>
                {assignment.dueDate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Due: <span className="text-foreground font-medium">{new Date(assignment.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              {assignment.status === 'PENDING' || assignment.status === 'IN_PROGRESS' ? (
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={() => handleStartEvaluation(assignment)}
                  >
                    {assignment.status === 'IN_PROGRESS' ? 'Resume Appraisal' : 'Begin Evaluation'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-[10px] font-bold uppercase tracking-widest h-8"
                    onClick={() => {
                      setPreviewTemplate(assignment.templateId);
                      setShowViewFramework(true);
                    }}
                  >
                    View Framework
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full">View Finalized Report</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <svg className="w-16 h-16 text-muted-foreground opacity-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-foreground">No Assignments Found</h3>
          <p className="text-muted-foreground">You have no active appraisal tasks at the moment.</p>
        </div>
      )}

      {/* Evaluation Form Dialog */}
      <Dialog open={showEvaluationForm} onOpenChange={(open) => {
        if (!open) {
          setShowEvaluationForm(false);
          setSelectedAssignment(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Performance Appraisal</DialogTitle>
            <DialogDescription>
              Evaluating <span className="font-bold text-foreground">{selectedAssignment?.employeeProfileId?.firstName} {selectedAssignment?.employeeProfileId?.lastName}</span> for {selectedAssignment?.cycleId?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* Attendance & Punctuality Context (REQ-AE-03) */}
            <div className="bg-muted border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-bold text-foreground">Attendance & Punctuality Context</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Repeated Lateness</p>
                  {fetchingAttendance ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-black ${attendanceData?.latenessCount && attendanceData.latenessCount > 3 ? 'text-destructive' : 'text-foreground'}`}>
                        {attendanceData?.latenessCount ?? 0}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">Incidents found</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Work Hours (Current Month)</p>
                  {fetchingAttendance ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-foreground">
                        {Math.floor((attendanceData?.totalMinutes ?? 0) / 60)}h {Math.round((attendanceData?.totalMinutes ?? 0) % 60)}m
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 italic font-medium">Use this data to inform ratings on punctuality and reliability criteria.</p>
            </div>

            {/* Criteria List */}
            <div className="space-y-6">
              {selectedAssignment?.templateId?.criteria?.map((criterion) => {
                const rating = formData.ratings.find(r => r.criterionKey === criterion.key);
                const maxScore = selectedAssignment.templateId?.ratingScale?.max || 5;
                return (
                  <div key={criterion.key} className="bg-muted/30 border border-border rounded-xl p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h4 className="font-bold text-foreground">{criterion.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{criterion.details}</p>
                      </div>
                      {criterion.weight && (
                        <Badge variant="secondary" className="bg-muted text-foreground border-border">Weight: {criterion.weight}%</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {Array.from({ length: maxScore }, (_, i) => i + 1).map((score) => (
                        <button
                          key={score}
                          onClick={() => handleRatingChange(criterion.key, score)}
                          className={`w-12 h-12 rounded-lg font-black transition-all border-2 ${rating?.score === score
                            ? 'bg-foreground border-foreground text-background'
                            : 'bg-background border-border text-muted-foreground hover:border-foreground/50'
                            }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      placeholder="Provide specific evidence or examples for this rating..."
                      value={rating?.comment || ''}
                      onChange={(e) => handleCommentChange(criterion.key, e.target.value)}
                      className="bg-background"
                    />
                  </div>
                );
              })}
            </div>

            {/* Qualitative Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-lg font-bold text-foreground">Summary & Development</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key Strengths</label>
                  <Textarea
                    placeholder="What did the employee excel at during this period?"
                    value={formData.strengths}
                    onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Growth Areas</label>
                  <Textarea
                    placeholder="Which competencies require further development?"
                    value={formData.areasForImprovement}
                    onChange={(e) => setFormData(prev => ({ ...prev, areasForImprovement: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Actionable Development Plan</label>
                <Textarea
                  placeholder="Define specific training or exposure goals for the next cycle..."
                  value={formData.developmentPlan}
                  onChange={(e) => setFormData(prev => ({ ...prev, developmentPlan: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {/* Final Calculation */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-foreground">Final Aggregate Rating</h4>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Weighted average based on criteria</p>
              </div>
              <div className="text-3xl font-black text-foreground">
                {calculateOverallRating().toFixed(2)} / {selectedAssignment?.templateId?.ratingScale?.max || 5}
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-card pt-4 border-t border-border mt-6">
            <Button variant="ghost" onClick={() => setShowEvaluationForm(false)}>Discard</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
                {isSubmitting ? '...' : 'Save as Draft'}
              </Button>
              <Button onClick={handleSubmitEvaluation} disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Submit Evaluation'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Framework Dialog */}
      <Dialog open={showViewFramework} onOpenChange={setShowViewFramework}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border border-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              Evaluation Framework: {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Review the criteria and weights established for this appraisal cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Standard Instruction</h4>
              <p className="text-sm text-foreground italic">{previewTemplate?.instructions || 'No specific instructions provided for this framework.'}</p>
            </div>

            <div className="space-y-4">
              {previewTemplate?.criteria?.map((c: any) => (
                <div key={c.key} className="p-4 bg-background border border-border rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-bold text-foreground">{c.title}</h5>
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
                      Weight: {c.weight}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.details}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">Rating Scale:</span>
                    <span className="text-[9px] font-black text-foreground uppercase tracking-widest">1 - {c.maxScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowViewFramework(false)} className="w-full">Understood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
