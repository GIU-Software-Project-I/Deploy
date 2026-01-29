'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Users,
  Search,
  ChevronRight,
  Check,
  X,
  BrainCircuit,
  TrendingUp,
  LayoutGrid
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
    ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
    : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm'
    }`}>
    <div className="flex justify-between items-start">
      <span className={`text-[10px] uppercase tracking-widest font-bold ${highlight ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
      <Icon className={`w-5 h-5 ${highlight ? 'text-slate-400' : 'text-slate-300'}`} />
    </div>
    <div>
      <div className={`text-4xl font-black tracking-tighter ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</div>
      {subValue && <div className={`text-xs mt-1 font-medium ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>{subValue}</div>}
    </div>
  </div>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
    {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20 font-sans">

      {/* Simple Header */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900">Department Overview</h1>
            <p className="text-slate-500 font-medium mt-1">Manage team requests, performance, and structure.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/department-head/team-profiles" className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              Team
            </Link>
            <Link href="/dashboard/department-head/analytics/structure" className="px-4 py-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-wide rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
              Analytics
            </Link>
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
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

              {/* Tabs */}
              <div className="border-b border-slate-100 flex">
                <button
                  onClick={() => setActiveTab('approvals')}
                  className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'approvals' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Requests
                </button>
                <button
                  onClick={() => setActiveTab('patterns')}
                  className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'patterns' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
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
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${statusFilter === status
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 w-full sm:w-48"
                        />
                      </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                      {filteredRequests.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-sm text-slate-400 font-medium">No requests found</p>
                        </div>
                      ) : (
                        filteredRequests.map(request => (
                          <div key={request._id} className="p-4 rounded-lg border border-slate-100 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                {(request.employeeName || 'UN').substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{request.employeeName}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>{request.status}</span>
                                  <span className="text-xs text-slate-500 font-medium">{request.leaveTypeName} • {request.durationDays}d</span>
                                </div>
                              </div>
                            </div>

                            {request.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAction(request._id, 'approve')}
                                  disabled={actionLoading === request._id}
                                  className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleAction(request._id, 'reject')}
                                  disabled={actionLoading === request._id}
                                  className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
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
                      <div className="p-8 text-center bg-slate-50 rounded-lg">
                        <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-900">System Healthy</p>
                        <p className="text-xs text-slate-500">No anomalous behavior detected.</p>
                      </div>
                    ) : (
                      patternResults.map((result, idx) => (
                        <div key={idx} className="p-5 border border-amber-200 bg-amber-50/30 rounded-lg">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <h4 className="text-sm font-bold text-slate-900">{requests.find(r => r.employeeId === result.employeeId)?.employeeName || result.employeeId}</h4>
                            </div>
                            <span className="text-2xl font-black text-amber-600">{result.overallRiskScore}%</span>
                          </div>
                          <div className="space-y-2">
                            {result.patterns.map((p, pIdx) => (
                              <div key={pIdx} className="flex justify-between text-xs border-b border-amber-100 pb-1 last:border-0">
                                <span className="font-medium text-slate-700">{p.type.replace(/_/g, ' ')}</span>
                                <span className="font-bold text-slate-900">{p.occurrences ? p.occurrences.length : 0}x</span>
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
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Competency Map</h3>
                <BrainCircuit className="w-4 h-4 text-slate-400" />
              </div>
              <div className="h-48 flex items-center justify-center">
                {skillMatrix.length > 0 ? (
                  <div className="w-full h-full scale-90">
                    <SkillRadar skills={skillMatrix.map(s => ({ name: s.skill, level: s.avgLevel }))} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No data available</p>
                )}
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Quick Guidelines</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-slate-900 rounded-full mt-1.5"></div>
                  <p className="text-xs text-slate-600 leading-relaxed">Ensure min. 20% team availability before mass approvals.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-slate-900 rounded-full mt-1.5"></div>
                  <p className="text-xs text-slate-600 leading-relaxed">Flag patterns with risk score {'>'} 50% for HR review.</p>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
