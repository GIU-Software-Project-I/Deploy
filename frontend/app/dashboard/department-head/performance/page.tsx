'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { performanceService } from '@/app/services/performance';
import { timeManagementService } from '@/app/services/time-management';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Users, Clock, CheckCircle, ChevronLeft, Building2, Calendar, AlertCircle, FileText, Target, TrendingUp, Loader2 } from 'lucide-react';

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
    PENDING: 'bg-warning/10 text-warning border-warning/30',
    IN_PROGRESS: 'bg-info/10 text-info border-info/30',
    SUBMITTED: 'bg-success/10 text-success border-success/30',
    PUBLISHED: 'bg-primary/10 text-primary border-primary/30',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/department-head" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              Department Head
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Team Performance</span>
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Performance Evaluations</h1>
          <p className="text-muted-foreground mt-1">Review and finalize performance appraisals for your direct reports</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assigned</p>
              <p className="text-3xl font-semibold text-foreground">{assignments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-3xl font-semibold text-foreground">{assignments.filter(a => a.status === 'PENDING').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-semibold text-foreground">{assignments.filter(a => a.status === 'SUBMITTED' || a.status === 'PUBLISHED').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments Grid */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <div
              key={assignment._id}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {assignment.employeeProfileId?.firstName} {assignment.employeeProfileId?.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {assignment.employeeProfileId?.jobTitle || 'No title assigned'}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${statusColors[assignment.status]}`}>
                    {assignment.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{assignment.employeeProfileId?.primaryDepartmentId?.name || 'Global'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <span>Cycle: <span className="text-foreground font-medium">{assignment.cycleId?.name}</span></span>
                  </div>
                  {assignment.dueDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Due: <span className="text-foreground font-medium">{new Date(assignment.dueDate).toLocaleDateString()}</span></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                {assignment.status === 'PENDING' || assignment.status === 'IN_PROGRESS' ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => handleStartEvaluation(assignment)}
                    >
                      {assignment.status === 'IN_PROGRESS' ? 'Resume Appraisal' : 'Begin Evaluation'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPreviewTemplate(assignment.templateId);
                        setShowViewFramework(true);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Framework
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="w-full">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Report
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Assignments Found</h3>
          <p className="text-muted-foreground mt-1">You have no active appraisal tasks at the moment.</p>
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
            <DialogTitle className="text-2xl font-semibold">Performance Appraisal</DialogTitle>
            <DialogDescription>
              Evaluating <span className="font-semibold text-foreground">{selectedAssignment?.employeeProfileId?.firstName} {selectedAssignment?.employeeProfileId?.lastName}</span> for {selectedAssignment?.cycleId?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* Attendance & Punctuality Context */}
            <div className="bg-muted/50 border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Attendance & Punctuality Context</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Repeated Lateness</p>
                  {fetchingAttendance ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-semibold ${attendanceData?.latenessCount && attendanceData.latenessCount > 3 ? 'text-destructive' : 'text-foreground'}`}>
                        {attendanceData?.latenessCount ?? 0}
                      </span>
                      <span className="text-sm text-muted-foreground">incidents</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Work Hours (Current Month)</p>
                  {fetchingAttendance ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    <span className="text-2xl font-semibold text-foreground">
                      {Math.floor((attendanceData?.totalMinutes ?? 0) / 60)}h {Math.round((attendanceData?.totalMinutes ?? 0) % 60)}m
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 italic">Use this data to inform ratings on punctuality and reliability criteria.</p>
            </div>

            {/* Criteria List */}
            <div className="space-y-6">
              {selectedAssignment?.templateId?.criteria?.map((criterion) => {
                const rating = formData.ratings.find(r => r.criterionKey === criterion.key);
                const maxScore = selectedAssignment.templateId?.ratingScale?.max || 5;
                return (
                  <div key={criterion.key} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{criterion.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{criterion.details}</p>
                      </div>
                      {criterion.weight && (
                        <Badge variant="secondary" className="shrink-0">Weight: {criterion.weight}%</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {Array.from({ length: maxScore }, (_, i) => i + 1).map((score) => (
                        <button
                          key={score}
                          onClick={() => handleRatingChange(criterion.key, score)}
                          className={`w-12 h-12 rounded-lg font-semibold transition-all border-2 ${rating?.score === score
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
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
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold text-foreground">Summary & Development</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Key Strengths</label>
                  <Textarea
                    placeholder="What did the employee excel at during this period?"
                    value={formData.strengths}
                    onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Growth Areas</label>
                  <Textarea
                    placeholder="Which competencies require further development?"
                    value={formData.areasForImprovement}
                    onChange={(e) => setFormData(prev => ({ ...prev, areasForImprovement: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Development Plan</label>
                <Textarea
                  placeholder="Define specific training or exposure goals for the next cycle..."
                  value={formData.developmentPlan}
                  onChange={(e) => setFormData(prev => ({ ...prev, developmentPlan: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {/* Final Calculation */}
            <div className="bg-primary rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-primary-foreground">
              <div>
                <h4 className="font-semibold">Final Aggregate Rating</h4>
                <p className="text-sm text-primary-foreground/70">Weighted average based on criteria</p>
              </div>
              <div className="text-4xl font-semibold">
                {calculateOverallRating().toFixed(2)} / {selectedAssignment?.templateId?.ratingScale?.max || 5}
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t border-border mt-6">
            <Button variant="ghost" onClick={() => setShowEvaluationForm(false)}>Discard</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button onClick={handleSubmitEvaluation} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Framework Dialog */}
      <Dialog open={showViewFramework} onOpenChange={setShowViewFramework}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Review the criteria and weights established for this appraisal cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-muted/50 p-4 rounded-xl border border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Instructions</h4>
              <p className="text-sm text-foreground">{previewTemplate?.instructions || 'No specific instructions provided for this framework.'}</p>
            </div>

            <div className="space-y-4">
              {previewTemplate?.criteria?.map((c: any) => (
                <div key={c.key} className="p-4 bg-card border border-border rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-foreground">{c.title}</h5>
                    <Badge variant="secondary">Weight: {c.weight}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.details}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rating Scale:</span>
                    <span className="text-xs font-medium text-foreground">1 - {c.maxScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowViewFramework(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
