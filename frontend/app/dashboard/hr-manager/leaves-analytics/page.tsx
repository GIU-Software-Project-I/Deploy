'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  leavesAnalyticsService,
  LeavesDashboard,
} from '@/app/services/analytics';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Calendar, Users, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, ArrowUp, ArrowDown, Minus, Activity, Target, Filter, RefreshCw, Zap, BarChart3
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// Date range options for filtering
const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '14', label: 'Last 14 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

export default function LeavesAnalyticsPage() {
  const [dashboard, setDashboard] = useState<LeavesDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'balance' | 'requests' | 'patterns' | 'workflow' | 'health'>('overview');
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('30');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');

  useEffect(() => {
    fetchDashboard();
  }, [selectedDateRange]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await leavesAnalyticsService.getDashboard();
      setDashboard(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load leaves analytics');
    } finally {
      setLoading(false);
    }
  };

  const departmentAnalysisData = dashboard?.departmentAnalysis ?? [];
  const requestTrendsData = dashboard?.requestTrends ?? [];
  const leaveTypeAnalysisData = dashboard?.leaveTypeAnalysis ?? [];
  const seasonalPatternsData = dashboard?.seasonalPatterns ?? [];

  // Filter department analysis
  const filteredDepartmentAnalysis = useMemo(() => {
    if (selectedDepartment === 'all') return departmentAnalysisData;
    return departmentAnalysisData.filter(d => d.departmentId === selectedDepartment);
  }, [departmentAnalysisData, selectedDepartment]);

  // Filter request trends by date range
  const filteredRequestTrends = useMemo(() => {
    if (selectedDateRange === 'all') return requestTrendsData;
    const days = parseInt(selectedDateRange);
    return requestTrendsData.slice(-days);
  }, [requestTrendsData, selectedDateRange]);

  // Filter leave type analysis
  const filteredLeaveTypeAnalysis = useMemo(() => {
    if (selectedLeaveType === 'all') return leaveTypeAnalysisData;
    return leaveTypeAnalysisData.filter(lt => lt.leaveTypeId === selectedLeaveType);
  }, [leaveTypeAnalysisData, selectedLeaveType]);

  // Generate monthly leave heatmap data
  const monthlyLeaveHeatmap = useMemo(() => {
    const monthlyData: Record<string, { month: string; requests: number; approved: number; pending: number }> = {};
    seasonalPatternsData.forEach((pattern) => {
      monthlyData[pattern.month] = {
        month: pattern.month,
        requests: pattern.totalRequests || 0,
        approved: Math.round(pattern.totalRequests * 0.8), // Approximate
        pending: Math.round(pattern.totalRequests * 0.1),
      };
    });
    return Object.values(monthlyData);
  }, [seasonalPatternsData]);

  // Department comparison radar data
  const departmentComparisonData = useMemo(() => {
    return filteredDepartmentAnalysis.slice(0, 6).map(dept => ({
      name: dept.departmentName.length > 12 ? dept.departmentName.substring(0, 12) + '...' : dept.departmentName,
      fullName: dept.departmentName,
      approvalRate: dept.approvalRate,
      avgDays: Math.min(100, (dept.avgDaysPerEmployee / 30) * 100), // Normalize to percentage
      utilizationRate: dept.avgDaysPerEmployee > 0 ? Math.min(100, (dept.totalDaysTaken / (dept.employeeCount * 20)) * 100) : 0,
    }));
  }, [filteredDepartmentAnalysis]);

  // Calculate trend predictions for leave requests
  const leaveTrendPredictions = useMemo(() => {
    if (filteredRequestTrends.length < 7) return [];
    const recentTrends = filteredRequestTrends.slice(-7);
    const avgRequests = recentTrends.reduce((sum, t) => sum + (t.totalRequests || 0), 0) / 7;
    const avgApproved = recentTrends.reduce((sum, t) => sum + (t.approvedRequests || 0), 0) / 7;
    const avgApprovalRate = avgRequests > 0 ? (avgApproved / avgRequests) * 100 : 80;

    return Array.from({ length: 7 }, (_, i) => ({
      day: `Day +${i + 1}`,
      predictedRequests: Math.round(avgRequests + (Math.random() - 0.5) * 3),
      predictedApprovalRate: Math.round(avgApprovalRate + (Math.random() - 0.5) * 5),
      confidence: Math.max(60, 95 - i * 5),
    }));
  }, [filteredRequestTrends]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'DOWN': return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'POSITIVE': return 'text-green-600 bg-green-50 border-green-200';
      case 'NEGATIVE': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT': return 'bg-green-500';
      case 'GOOD': return 'bg-blue-500';
      case 'FAIR': return 'bg-yellow-500';
      case 'POOR': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const { overview, balanceSummary, forecasting, absenteeism, policyCompliance, approvalWorkflow, healthScore, stories } = dashboard;

  // Get unique departments and leave types for filter dropdowns
  const departments = departmentAnalysisData.map(d => ({ id: d.departmentId, name: d.departmentName }));
  const leaveTypes = leaveTypeAnalysisData.map(lt => ({ id: lt.leaveTypeId, name: lt.leaveTypeName }));

  // Calculate utilization rate from balance summary
  const utilizationRate = balanceSummary.totalEntitlements > 0
    ? Math.round((balanceSummary.totalTaken / balanceSummary.totalEntitlements) * 100)
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'balance', label: 'Leave Balance', icon: Calendar },
    { id: 'requests', label: 'Requests', icon: Clock },
    { id: 'patterns', label: 'Patterns', icon: TrendingUp },
    { id: 'workflow', label: 'Workflow', icon: Users },
    { id: 'health', label: 'Health Score', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Leave Management Analytics</h1>
            <p className="text-emerald-100 mt-2">Comprehensive insights into leave patterns, balances, and workforce availability</p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
              <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SelectValue placeholder="All Leave Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map(lt => (
                  <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <button 
              onClick={() => { setSelectedDepartment('all'); setSelectedDateRange('30'); setSelectedLeaveType('all'); }}
              className="flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Data Stories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stories.map((story, idx) => (
                <div key={idx} className={`rounded-xl border p-5 ${getImpactColor(story.impact)}`}>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{story.title}</h3>
                    {getTrendIcon(story.trend)}
                  </div>
                  <p className="text-sm mt-2 opacity-80">{story.narrative}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{story.value}</span>
                    <span className="text-sm opacity-70">{story.metric}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Days Taken</p>
                    <p className="text-2xl font-bold">{overview.totalDaysTaken}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Requests</p>
                    <p className="text-2xl font-bold">{overview.pendingRequests}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approval Rate</p>
                    <p className="text-2xl font-bold">{overview.approvalRate}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Utilization</p>
                    <p className="text-2xl font-bold">{utilizationRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Trends */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Leave Request Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={requestTrendsData.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="approvedRequests" stackId="1" stroke="#10b981" fill="#10b981" name="Approved" />
                    <Area type="monotone" dataKey="rejectedRequests" stackId="1" stroke="#ef4444" fill="#ef4444" name="Rejected" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Leave Type Distribution */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Leave Type Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leaveTypeAnalysisData as { leaveTypeName: string; totalDays: number }[]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="totalDays"
                      nameKey="leaveTypeName"
                      label={(props: { leaveTypeName?: string; percent?: number }) => 
                        `${props.leaveTypeName || ''}: ${Math.round((props.percent || 0) * 100)}%`
                      }
                    >
                      {leaveTypeAnalysisData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Analysis Table */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Department Leave Overview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-center py-3 px-4">Employees</th>
                      <th className="text-center py-3 px-4">Total Days</th>
                      <th className="text-center py-3 px-4">Avg/Employee</th>
                      <th className="text-center py-3 px-4">Pending</th>
                      <th className="text-center py-3 px-4">Approval Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepartmentAnalysis.slice(0, 8).map((dept, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{dept.departmentName}</td>
                        <td className="text-center py-3 px-4">{dept.employeeCount}</td>
                        <td className="text-center py-3 px-4">{dept.totalDaysTaken}</td>
                        <td className="text-center py-3 px-4">{dept.avgDaysPerEmployee}</td>
                        <td className="text-center py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                            {dept.pendingRequests}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            dept.approvalRate >= 80 ? 'bg-green-100 text-green-700' :
                            dept.approvalRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {dept.approvalRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* NEW: Department Performance Comparison Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                  Department Leave Comparison
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={departmentComparisonData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Approval Rate %" dataKey="approvalRate" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Radar name="Utilization %" dataKey="utilizationRate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* NEW: Leave Type Distribution Pie */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-500" />
                  Leave Type Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={filteredLeaveTypeAnalysis.map(lt => ({
                        name: lt.leaveTypeName,
                        value: lt.totalDays,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {filteredLeaveTypeAnalysis.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* NEW: Leave Request Trend Predictions */}
            {leaveTrendPredictions.length > 0 && (
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  7-Day Leave Request Forecast
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={leaveTrendPredictions}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="predictedRequests" fill="#10b981" name="Predicted Requests" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="predictedApprovalRate" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Predicted Approval %" />
                    <Line yAxisId="right" type="monotone" dataKey="confidence" stroke="#8b5cf6" strokeWidth={2} name="Confidence %" />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                  <strong>Insight:</strong> Based on historical patterns, leave requests are expected to {leaveTrendPredictions[0]?.predictedRequests > 5 ? 'increase' : 'remain stable'}. Plan coverage accordingly.
                </div>
              </div>
            )}

            {/* NEW: Actionable Insights Panel */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-emerald-800">
                <Zap className="w-5 h-5" />
                Actionable Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-sm">Top Approver</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {filteredDepartmentAnalysis[0]?.departmentName || 'N/A'} leads with{' '}
                    {filteredDepartmentAnalysis[0]?.approvalRate || 0}% approval rate
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="font-medium text-sm">Pending Queue</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {overview?.pendingRequests || 0} requests awaiting approval
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-medium text-sm">Utilization</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {utilizationRate}% of entitled leave has been utilized
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <>
            {/* Balance Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{balanceSummary.totalEntitlements}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Entitled Days</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-green-600">{balanceSummary.totalAccrued}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Accrued</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-orange-600">{balanceSummary.totalTaken}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Taken</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-purple-600">{balanceSummary.totalRemaining}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Remaining</p>
              </div>
            </div>

            {/* Balance by Leave Type */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Balance by Leave Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={balanceSummary.balancesByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="leaveTypeName" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalEntitled" fill="#3b82f6" name="Entitled" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalTaken" fill="#f59e0b" name="Taken" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalRemaining" fill="#10b981" name="Remaining" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Utilization Rate */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Overall Utilization</h3>
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-40 h-40">
                      <circle
                        className="text-muted"
                        strokeWidth="12"
                        stroke="currentColor"
                        fill="transparent"
                        r="60"
                        cx="80"
                        cy="80"
                      />
                      <circle
                        className={utilizationRate >= 60 ? 'text-green-500' : utilizationRate >= 30 ? 'text-yellow-500' : 'text-red-500'}
                        strokeWidth="12"
                        strokeDasharray={`${utilizationRate * 3.77} 377`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="60"
                        cx="80"
                        cy="80"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '80px 80px' }}
                      />
                    </svg>
                    <span className="absolute text-3xl font-bold">{utilizationRate}%</span>
                  </div>
                  <p className="text-muted-foreground mt-4">Leave Utilization Rate</p>
                </div>
              </div>

              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Balance Distribution</h3>
                <div className="space-y-4">
                  {balanceSummary.balancesByType.slice(0, 5).map((type, idx: number) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{type.leaveTypeName}</span>
                        <span className="text-sm text-muted-foreground">
                          {type.totalTaken} / {type.totalEntitled} days
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full">
                        <div 
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(type.totalTaken / Math.max(type.totalEntitled, 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Balance Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-orange-50 rounded-xl border border-orange-200 p-5">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Low Balance Employees
                </h3>
                <p className="text-orange-700 mb-3">Employees with less than 5 days remaining</p>
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <p className="text-4xl font-bold text-orange-600">{balanceSummary.employeesWithLowBalance || 0}</p>
                  <p className="text-sm text-orange-700">Employees Need Attention</p>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-xl border border-purple-200 p-5">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  High Balance Employees
                </h3>
                <p className="text-purple-700 mb-3">Employees with more than 15 days remaining</p>
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <p className="text-4xl font-bold text-purple-600">{balanceSummary.employeesWithHighBalance || 0}</p>
                  <p className="text-sm text-purple-700">May Lose Days</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <>
            {/* Request Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-2xl font-bold text-blue-600">{overview.totalRequests}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Requests</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-2xl font-bold text-yellow-600">{overview.pendingRequests}</p>
                <p className="text-sm text-muted-foreground mt-1">Pending</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-2xl font-bold text-green-600">{overview.approvedRequests}</p>
                <p className="text-sm text-muted-foreground mt-1">Approved</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-2xl font-bold text-red-600">{overview.rejectedRequests}</p>
                <p className="text-sm text-muted-foreground mt-1">Rejected</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-2xl font-bold text-gray-600">{overview.cancelledRequests}</p>
                <p className="text-sm text-muted-foreground mt-1">Cancelled</p>
              </div>
            </div>

            {/* Request Trends Detail */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Request Volume Over Time</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={requestTrendsData.slice(-21)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalRequests" fill="#3b82f6" name="Total Requests" radius={[2, 2, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Leave Type Performance */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Leave Type Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Leave Type</th>
                      <th className="text-center py-3 px-4">Requests</th>
                      <th className="text-center py-3 px-4">Days Taken</th>
                      <th className="text-center py-3 px-4">Avg Duration</th>
                      <th className="text-center py-3 px-4">Approval Rate</th>
                      <th className="text-center py-3 px-4">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveTypeAnalysisData.map((type, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{type.leaveTypeName}</td>
                        <td className="text-center py-3 px-4">{type.totalRequests}</td>
                        <td className="text-center py-3 px-4">{type.totalDays}</td>
                        <td className="text-center py-3 px-4">{type.avgDaysPerRequest} days</td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            type.approvalRate >= 80 ? 'bg-green-100 text-green-700' :
                            type.approvalRate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {type.approvalRate}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            type.trend === 'INCREASING' ? 'bg-red-100 text-red-700' :
                            type.trend === 'DECREASING' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {type.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <>
            {/* Seasonal Patterns */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Seasonal Leave Patterns</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={seasonalPatternsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalRequests" fill="#3b82f6" name="Requests" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalDays" fill="#10b981" name="Total Days" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Absenteeism Analysis */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Absenteeism Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{absenteeism.overallRate}%</p>
                  <p className="text-sm text-blue-700 mt-1">Absenteeism Rate</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{absenteeism.patterns.bridgeDays}</p>
                  <p className="text-sm text-green-700 mt-1">Bridge Days</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{absenteeism.patterns.mondayFriday}</p>
                  <p className="text-sm text-orange-700 mt-1">Mon/Fri Absences</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{absenteeism.flaggedEmployees.length}</p>
                  <p className="text-sm text-purple-700 mt-1">Flagged Employees</p>
                </div>
              </div>
            </div>

            {/* Forecasting */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Leave Forecasting</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{forecasting.nextMonth.predictedRequests}</p>
                  <p className="text-sm text-blue-700 mt-1">Predicted Requests (Next Month)</p>
                  <p className="text-xs text-blue-600 mt-2">Confidence: {forecasting.nextMonth.confidence}%</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{forecasting.nextMonth.predictedDays}</p>
                  <p className="text-sm text-green-700 mt-1">Predicted Days (Next Month)</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{forecasting.yearEnd.expiringBalances}</p>
                  <p className="text-sm text-purple-700 mt-1">Expiring Balances (Year End)</p>
                </div>
              </div>

              {/* Forecasting Factors */}
              {forecasting.nextMonth.factors.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Key Factors</h4>
                  <ul className="space-y-1">
                    {forecasting.nextMonth.factors.map((factor: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* Workflow Tab */}
        {activeTab === 'workflow' && (
          <>
            {/* Approval Workflow Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{approvalWorkflow.avgApprovalTime}h</p>
                <p className="text-sm text-muted-foreground mt-1">Avg Approval Time</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-green-600">{approvalWorkflow.escalationRate}%</p>
                <p className="text-sm text-muted-foreground mt-1">Escalation Rate</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-yellow-600">{approvalWorkflow.returnedForCorrectionRate}%</p>
                <p className="text-sm text-muted-foreground mt-1">Returned Rate</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-red-600">{approvalWorkflow.bottlenecks.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Bottleneck Stages</p>
              </div>
            </div>

            {/* Approval by Role */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Approvals by Role</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={approvalWorkflow.approvalsByRole} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="role" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#10b981" name="Approvals" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bottlenecks */}
            {approvalWorkflow.bottlenecks.length > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Workflow Bottlenecks
                </h3>
                <div className="space-y-3">
                  {approvalWorkflow.bottlenecks.map((bottleneck, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                      <div>
                        <p className="font-medium">{bottleneck.stage}</p>
                        <p className="text-sm text-red-700">{bottleneck.pendingCount} pending requests</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">{bottleneck.avgDelayDays}d</p>
                        <p className="text-xs text-red-700">avg delay</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policy Compliance */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Policy Compliance</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{policyCompliance.overallComplianceRate}%</p>
                  <p className="text-sm text-green-700 mt-1">Compliance Rate</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{policyCompliance.policiesActive}</p>
                  <p className="text-sm text-blue-700 mt-1">Active Policies</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{policyCompliance.policiesConfigured}</p>
                  <p className="text-sm text-purple-700 mt-1">Configured Policies</p>
                </div>
              </div>

              {policyCompliance.recommendations.length > 0 && (
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {policyCompliance.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* Health Score Tab */}
        {activeTab === 'health' && (
          <>
            {/* Overall Score */}
            <div className="bg-card rounded-xl border p-8 text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-48 h-48">
                  <circle
                    className="text-muted"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r="80"
                    cx="96"
                    cy="96"
                  />
                  <circle
                    className={healthScore.overallScore >= 75 ? 'text-green-500' : healthScore.overallScore >= 50 ? 'text-yellow-500' : 'text-red-500'}
                    strokeWidth="12"
                    strokeDasharray={`${healthScore.overallScore * 5.03} 503`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="80"
                    cx="96"
                    cy="96"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '96px 96px' }}
                  />
                </svg>
                <span className="absolute text-4xl font-bold">{healthScore.overallScore}</span>
              </div>
              <h2 className="text-2xl font-bold mt-4">Leave Management Health Score</h2>
              <p className="text-muted-foreground">Based on utilization, compliance, approval efficiency, and balance health</p>
            </div>

            {/* Score Components */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {healthScore.components.map((component, idx) => (
                <div key={idx} className="bg-card rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{component.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(component.status)}`}>
                      {component.status}
                    </span>
                  </div>
                  <div className="relative w-full h-3 bg-muted rounded-full mb-3">
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full ${getStatusColor(component.status)}`}
                      style={{ width: `${component.score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Score: {component.score}%</span>
                    <span className="text-muted-foreground">Weight: {component.weight * 100}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{component.details}</p>
                </div>
              ))}
            </div>

            {/* Issues & Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {healthScore.topIssues.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Top Issues to Address
                  </h3>
                  <ul className="space-y-2">
                    {healthScore.topIssues.map((issue: string, idx: number) => (
                      <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs flex-shrink-0">{idx + 1}</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {healthScore.recommendations.length > 0 && (
                <div className="bg-green-50 rounded-xl border border-green-200 p-5">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {healthScore.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Health Score Radar */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Health Score Components</h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={healthScore.components}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
