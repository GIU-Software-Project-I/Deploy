'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Search,
  Check,
  X,
  BrainCircuit
} from 'lucide-react';
import { leavesService } from '@/app/services/leaves';
import { analyticsService, SkillMatrixResponse } from '@/app/services/analytics';
import { analyzeLeavePatterns, PatternAnalysisResult } from '@/utils/leavePatternAnalyzer';
import { SkillRadar } from '@/components/analytics/SkillRadar';
import Link from 'next/link';

// --- Types ---

interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  dates: { from: string; to: string };
  durationDays: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned_for_correction';
  appliedOn: string;
  justification?: string;
}

interface DashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  anomalies: number;
}

// --- Components ---

const StatCard = ({ label, value, icon: Icon, subValue, highlight = false }: { label: string; value: string | number; icon: any; subValue?: string; highlight?: boolean }) => (
  <div className={`p-6 border rounded-xl flex flex-col justify-between h-32 transition-all duration-300 ${highlight
    ? 'bg-primary border-primary text-primary-foreground shadow-lg'
    : 'bg-card border-border hover:border-border/60 hover:shadow-sm'
    }`}>
    <div className="flex justify-between items-start">
      <span className={`text-sm font-medium ${highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{label}</span>
      <div className={`inline-flex items-center justify-center rounded-md p-1.5 ${highlight ? 'bg-primary-foreground/10 text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div>
      <div className={`text-3xl font-semibold tracking-tight ${highlight ? 'text-primary-foreground' : 'text-foreground'}`}>{value}</div>
      {subValue && <div className={`text-sm mt-1 ${highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{subValue}</div>}
    </div>
  </div>
);

// --- Main Page Component ---

export default function DepartmentHeadDashboard() {
  // State
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [patternResults, setPatternResults] = useState<PatternAnalysisResult[]>([]);
  const [skillMatrix, setSkillMatrix] = useState<SkillMatrixResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'approvals' | 'patterns'>('approvals');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const requestsData = await leavesService.getTeamRequests('current', {
          limit: 200,
          sort: '-createdAt'
        });

        let fetchedRequests: LeaveRequest[] = [];
        if (requestsData && !requestsData.error && Array.isArray(requestsData.data)) {
          fetchedRequests = requestsData.data as LeaveRequest[];
          setRequests(fetchedRequests);
        }

        // 2. Analyze Patterns
        if (fetchedRequests.length > 0) {
          const groupedRequests = fetchedRequests.reduce((acc, req) => {
            if (!acc[req.employeeId]) {
              acc[req.employeeId] = {
                leaves: [],
                name: req.employeeName || 'Unknown'
              };
            }
            acc[req.employeeId].leaves.push(req);
            return acc;
          }, {} as Record<string, { leaves: LeaveRequest[], name: string }>);

          const results: PatternAnalysisResult[] = [];
          Object.entries(groupedRequests).forEach(([empId, data]) => {
            const res = analyzeLeavePatterns(data.leaves, empId, data.name);
            if (res.overallRiskScore > 50) results.push(res);
          });
          setPatternResults(results);
        }

        // 3. Department Analytics (Skills)
        const skillsData = await analyticsService.getDepartmentSkills('current');
        if (skillsData) setSkillMatrix(skillsData);

      } catch (e) {
        console.error("Dashboard Load Error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Derived Stats
  const stats: DashboardStats = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      anomalies: patternResults.length
    };
  }, [requests, patternResults]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    let res = requests;
    if (statusFilter !== 'all') {
      res = res.filter(r => r.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(r =>
        (r.employeeName || '').toLowerCase().includes(q) ||
        (r.leaveTypeName || '').toLowerCase().includes(q)
      );
    }
    return res;
  }, [requests, statusFilter, searchQuery]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(id);
      if (action === 'approve') {
        await leavesService.accpetRequest(id);
      } else {
        await leavesService.rejectRequest(id, "Administrative decision");
      }
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
    } catch (e) {
      console.error(e);
      alert("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-muted rounded-full"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dept-head-theme min-h-screen bg-background text-foreground pb-20 font-sans">

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                Department Head
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mt-3">Department Overview</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage team requests, performance, and structure.</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/department-head/team-profiles"
                className="px-4 py-2 bg-secondary text-secondary-foreground font-semibold text-sm rounded-lg hover:bg-secondary/80 transition-all shadow-sm"
              >
                Team
              </Link>
              <Link
                href="/dashboard/department-head/analytics/structure"
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 transition-all shadow-lg"
              >
                Analytics
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-2">{stats.pending}</p>
              <p className="text-sm text-muted-foreground mt-1">Awaiting review</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Detected Patterns</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-2">{stats.anomalies}</p>
              <p className="text-sm text-muted-foreground mt-1">Risk signals</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Monthly Actions</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-2">{stats.approved + stats.rejected}</p>
              <p className="text-sm text-muted-foreground mt-1">Approved + Declined</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-12">

        {/* Stats Grid - Simple & Clean */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Pending Actions" value={stats.pending} icon={FileText} subValue="Leave Requests" highlight={stats.pending > 0} />
          <StatCard label="Patterns" value={stats.anomalies} icon={BrainCircuit} subValue="Detected Risks" />
          <StatCard label="Authorized" value={stats.approved} icon={Check} subValue="This Month" />
          <StatCard label="Declined" value={stats.rejected} icon={X} subValue="This Month" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Left Column: Requests & Warnings */}
          <div className="xl:col-span-2 space-y-8">

            {/* Main Action Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">

              {/* Tabs */}
              <div className="border-b border-border flex">
                <button
                  onClick={() => setActiveTab('approvals')}
                  className={`px-6 py-4 text-sm font-medium transition-all border-b-2 ${activeTab === 'approvals' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Requests
                </button>
                <button
                  onClick={() => setActiveTab('patterns')}
                  className={`px-6 py-4 text-sm font-medium transition-all border-b-2 ${activeTab === 'patterns' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Insights
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'approvals' && (
                  <>
                    {/* Filter Bar */}
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                      <div className="flex gap-2">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === status
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-1.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-48"
                        />
                      </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                      {filteredRequests.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-sm text-muted-foreground font-medium">No requests found</p>
                        </div>
                      ) : (
                        filteredRequests.map(request => (
                          <div key={request._id} className="p-4 rounded-lg border border-border bg-card hover:border-border/60 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {(request.employeeName || 'UN').substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-foreground">{request.employeeName}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${request.status === 'pending' ? 'bg-warning text-warning-foreground' :
                                    request.status === 'approved' ? 'bg-success text-success-foreground' :
                                      request.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                                      'bg-muted text-muted-foreground'
                                    }`}>{request.status}</span>
                                  <span className="text-sm text-muted-foreground font-medium">{request.leaveTypeName} • {request.durationDays}d</span>
                                </div>
                              </div>
                            </div>

                            {request.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAction(request._id, 'approve')}
                                  disabled={actionLoading === request._id}
                                  className="p-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleAction(request._id, 'reject')}
                                  disabled={actionLoading === request._id}
                                  className="p-2 border border-border text-muted-foreground rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-50"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'patterns' && (
                  <div className="space-y-4">
                    {patternResults.length === 0 ? (
                      <div className="p-8 text-center bg-muted rounded-lg">
                        <ShieldCheck className="w-8 h-8 text-success mx-auto mb-3" />
                        <p className="text-sm font-bold text-foreground">System Healthy</p>
                        <p className="text-xs text-muted-foreground">No anomalous behavior detected.</p>
                      </div>
                    ) : (
                      patternResults.map((result, idx) => (
                        <div key={idx} className="p-5 border border-warning/40 bg-warning/10 rounded-lg">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-warning" />
                              <h4 className="text-sm font-bold text-foreground">{requests.find(r => r.employeeId === result.employeeId)?.employeeName || result.employeeId}</h4>
                            </div>
                            <span className="text-2xl font-black text-warning">{result.overallRiskScore}%</span>
                          </div>
                          <div className="space-y-2">
                            {result.patterns.map((p, pIdx) => (
                              <div key={pIdx} className="flex justify-between text-xs border-b border-warning/20 pb-1 last:border-0">
                                <span className="font-medium text-muted-foreground">{p.type.replace(/_/g, ' ')}</span>
                                <span className="font-bold text-foreground">{p.occurrences ? p.occurrences.length : 0}x</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Analytics & Quick Links */}
          <div className="space-y-8">

            {/* Skill Matrix */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-foreground">Competency Map</h3>
                <BrainCircuit className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="h-48 flex items-center justify-center">
                {skillMatrix.length > 0 ? (
                  <div className="w-full h-full scale-90">
                    <SkillRadar skills={skillMatrix.map(s => ({ name: s.skill, level: s.avgLevel }))} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No data available</p>
                )}
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-foreground mb-4">Quick Guidelines</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5"></div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Ensure min. 20% team availability before mass approvals.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-1.5"></div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Flag patterns with risk score {'>'} 50% for HR review.</p>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
