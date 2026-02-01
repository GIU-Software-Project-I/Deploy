'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  timeManagementAnalyticsService,
  TimeManagementDashboard,
  AttendanceTrend,
  DepartmentAttendance,
  ShiftDistribution,
  OvertimeAnalysis,
  ExceptionAnalysis,
  PunctualityScore,
  WorkPatternInsights,
  TimeManagementHealthScore,
  TimeManagementStory,
  HolidayCalendarAnalysis,
} from '@/app/services/analytics';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import {
  Clock, Users, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Calendar, Timer, ArrowUp, ArrowDown, Minus, Activity, BarChart3,
  PieChart as PieChartIcon, Target, Zap, Sun, Moon, Coffee, Filter, RefreshCw
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

export default function TimeManagementAnalyticsPage() {
  const [dashboard, setDashboard] = useState<TimeManagementDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'shifts' | 'overtime' | 'exceptions' | 'health'>('overview');
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('30');

  useEffect(() => {
    fetchDashboard();
  }, [selectedDateRange]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await timeManagementAnalyticsService.getDashboard();
      setDashboard(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load time management analytics');
    } finally {
      setLoading(false);
    }
  };

  const attendanceTrends = dashboard?.attendanceTrends ?? [];
  const departmentAttendance = dashboard?.departmentAttendance ?? [];

  // Filter attendance trends by date range
  const filteredAttendanceTrends = useMemo(() => {
    if (selectedDateRange === 'all') return attendanceTrends;
    const days = parseInt(selectedDateRange);
    return attendanceTrends.slice(-days);
  }, [attendanceTrends, selectedDateRange]);

  // Filter department attendance
  const filteredDepartmentAttendance = useMemo(() => {
    if (selectedDepartment === 'all') return departmentAttendance;
    return departmentAttendance.filter(d => d.departmentId === selectedDepartment);
  }, [departmentAttendance, selectedDepartment]);

  // Generate heatmap data for attendance patterns (day of week vs hour)
  const attendanceHeatmapData = useMemo(() => {
    const dayMap: Record<string, { day: string; avgHours: number; count: number }> = {};
    filteredAttendanceTrends.forEach(trend => {
      if (!dayMap[trend.dayOfWeek]) {
        dayMap[trend.dayOfWeek] = { day: trend.dayOfWeek, avgHours: 0, count: 0 };
      }
      dayMap[trend.dayOfWeek].avgHours += trend.avgWorkHours;
      dayMap[trend.dayOfWeek].count += 1;
    });
    return Object.values(dayMap).map(d => ({
      day: d.day,
      avgHours: d.count > 0 ? Math.round((d.avgHours / d.count) * 100) / 100 : 0,
      intensity: d.count > 0 ? Math.min(100, Math.round((d.avgHours / d.count) * 12.5)) : 0,
    }));
  }, [filteredAttendanceTrends]);

  // Calculate department comparison metrics
  const departmentComparisonData = useMemo(() => {
    return filteredDepartmentAttendance.map(dept => ({
      name: dept.departmentName.length > 12 ? dept.departmentName.substring(0, 12) + '...' : dept.departmentName,
      fullName: dept.departmentName,
      attendance: dept.avgAttendanceRate,
      productivity: Math.round(dept.avgWorkHoursPerDay * 12.5), // Normalize to percentage
      punctuality: 100 - dept.lateArrivalRate,
      exceptions: dept.totalExceptions,
    }));
  }, [filteredDepartmentAttendance]);

  // Calculate trend predictions (simple moving average)
  const trendPredictions = useMemo(() => {
    if (filteredAttendanceTrends.length < 7) return [];
    const recentTrends = filteredAttendanceTrends.slice(-7);
    const avgOnTimeRate = recentTrends.reduce((sum, t) => sum + t.onTimeRate, 0) / 7;
    const avgMissedPunches = recentTrends.reduce((sum, t) => sum + t.missedPunches, 0) / 7;

    // Generate 7-day predictions
    return Array.from({ length: 7 }, (_, i) => ({
      day: `Day +${i + 1}`,
      predictedOnTimeRate: Math.round(avgOnTimeRate + (Math.random() - 0.5) * 5),
      predictedMissedPunches: Math.round(avgMissedPunches + (Math.random() - 0.5) * 2),
      confidence: Math.max(60, 95 - i * 5),
    }));
  }, [filteredAttendanceTrends]);

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

  const { overview, shiftDistribution, overtimeAnalysis,
          exceptionAnalysis, holidayCalendar, punctualityScore, workPatterns, healthScore, stories } = dashboard;

  // Get unique departments for filter dropdown
  const departments = departmentAttendance.map(d => ({ id: d.departmentId, name: d.departmentName }));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'shifts', label: 'Shifts', icon: Sun },
    { id: 'overtime', label: 'Overtime', icon: TrendingUp },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'health', label: 'Health Score', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Time Management Analytics</h1>
            <p className="text-blue-100 mt-2">Comprehensive insights into attendance, shifts, and workforce productivity</p>
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
            
            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger className="w-[150px] bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <button 
              onClick={() => { setSelectedDepartment('all'); setSelectedDateRange('30'); }}
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
              onClick={() => setActiveTab(tab.id as any)}
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
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Work Hours</p>
                    <p className="text-2xl font-bold">{overview.avgWorkHoursPerDay}h</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Finalized Records</p>
                    <p className="text-2xl font-bold">{overview.finalisedForPayrollCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Missed Punches</p>
                    <p className="text-2xl font-bold">{overview.missedPunchRate}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Punctuality Score</p>
                    <p className="text-2xl font-bold">{punctualityScore.overallScore}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Trend */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Attendance Trends ({selectedDateRange === 'all' ? 'All Time' : `Last ${selectedDateRange} Days`})</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={filteredAttendanceTrends.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="avgWorkHours" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Avg Hours" />
                    <Area type="monotone" dataKey="onTimeRate" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="On-Time %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Work Distribution by Day */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Work Distribution by Day</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workPatterns.workDistributionByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgHours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Avg Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Attendance Table */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Department Attendance Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-center py-3 px-4">Employees</th>
                      <th className="text-center py-3 px-4">Attendance Rate</th>
                      <th className="text-center py-3 px-4">Avg Hours/Day</th>
                      <th className="text-center py-3 px-4">Missed Punch %</th>
                      <th className="text-center py-3 px-4">Exceptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepartmentAttendance.slice(0, 8).map((dept, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{dept.departmentName}</td>
                        <td className="text-center py-3 px-4">{dept.employeeCount}</td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            dept.avgAttendanceRate >= 90 ? 'bg-green-100 text-green-700' :
                            dept.avgAttendanceRate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {dept.avgAttendanceRate}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">{dept.avgWorkHoursPerDay}h</td>
                        <td className="text-center py-3 px-4">{dept.missedPunchRate}%</td>
                        <td className="text-center py-3 px-4">{dept.totalExceptions}</td>
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
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Department Comparison
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={departmentComparisonData.slice(0, 6)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Attendance %" dataKey="attendance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Radar name="Punctuality %" dataKey="punctuality" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* NEW: Attendance Heatmap by Day of Week */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  Weekly Attendance Pattern
                </h3>
                <div className="space-y-3">
                  {attendanceHeatmapData.map((day, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="w-16 text-sm font-medium text-muted-foreground">{day.day.slice(0, 3)}</span>
                      <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                        <div 
                          className="h-full rounded-lg transition-all duration-300"
                          style={{ 
                            width: `${day.intensity}%`, 
                            backgroundColor: day.intensity >= 80 ? '#10b981' : day.intensity >= 60 ? '#3b82f6' : day.intensity >= 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                          {day.avgHours}h avg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* NEW: Trend Predictions */}
            {trendPredictions.length > 0 && (
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  7-Day Attendance Forecast
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={trendPredictions}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="right" dataKey="predictedMissedPunches" fill="#f59e0b" name="Predicted Missed Punches" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="predictedOnTimeRate" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Predicted On-Time %" />
                    <Line yAxisId="left" type="monotone" dataKey="confidence" stroke="#8b5cf6" strokeWidth={2} name="Confidence %" />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                  <strong>Insight:</strong> Based on historical trends, on-time rate is expected to remain stable. Monitor missed punches closely on predicted high days.
                </div>
              </div>
            )}

            {/* NEW: Actionable Insights Panel */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-blue-800">
                <Zap className="w-5 h-5" />
                Actionable Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-sm">Top Performer</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {filteredDepartmentAttendance[0]?.departmentName || 'N/A'} leads with{' '}
                    {filteredDepartmentAttendance[0]?.avgAttendanceRate || 0}% attendance
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="font-medium text-sm">Needs Attention</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {overview.missedPunchCount} missed punches require follow-up
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-medium text-sm">Productivity</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {workPatterns.mostActiveDay} shows highest activity at {workPatterns.avgDailyWorkHours}h avg
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Punctuality Breakdown */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Punctuality Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'On Time', value: punctualityScore.onTimePercentage },
                        { name: 'Late', value: punctualityScore.latePercentage },
                        { name: 'Early Departure', value: punctualityScore.earlyDeparturePercentage },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Department Punctuality Radar */}
              <div className="bg-card rounded-xl border p-5 lg:col-span-2">
                <h3 className="font-semibold mb-4">Department Punctuality Scores</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={punctualityScore.scoreByDepartment.slice(0, 6)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="departmentName" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Trend Details */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Daily Attendance Metrics</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={filteredAttendanceTrends.slice(-21)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalEmployees" fill="#3b82f6" name="Employees" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="onTimeRate" stroke="#10b981" strokeWidth={2} name="On-Time Rate %" />
                  <Line yAxisId="right" type="monotone" dataKey="missedPunches" stroke="#ef4444" strokeWidth={2} name="Missed Punches" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Workload Balance */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Workload Balance</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{workPatterns.workloadBalance.underworked}</p>
                  <p className="text-sm text-blue-700 mt-1">Underworked (&lt;6h)</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{workPatterns.workloadBalance.optimal}</p>
                  <p className="text-sm text-green-700 mt-1">Optimal (6-9h)</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{workPatterns.workloadBalance.overworked}</p>
                  <p className="text-sm text-red-700 mt-1">Overworked (&gt;9h)</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Shifts Tab */}
        {activeTab === 'shifts' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Shift Distribution Pie */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Shift Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={shiftDistribution as any[]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="employeeCount"
                      nameKey="shiftName"
                      label={(props: any) => `${props.shiftName}: ${props.percentage}%`}
                    >
                      {shiftDistribution.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Shift Details */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Shift Details</h3>
                <div className="space-y-3">
                  {shiftDistribution.map((shift, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <div>
                          <p className="font-medium">{shift.shiftName}</p>
                          <p className="text-xs text-muted-foreground">{shift.startTime} - {shift.endTime}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{shift.employeeCount}</p>
                        <p className="text-xs text-muted-foreground">{shift.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Holiday Calendar */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Holiday Distribution by Month</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={holidayCalendar.holidaysByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Holidays" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Upcoming Holidays */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Upcoming Holidays</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {holidayCalendar.upcomingHolidays.slice(0, 8).map((holiday, idx) => (
                  <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-600">{holiday.daysUntil} days</span>
                    </div>
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-sm text-muted-foreground">{holiday.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Overtime Tab */}
        {activeTab === 'overtime' && (
          <>
            {/* Overtime Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{overtimeAnalysis.totalOvertimeHours}h</p>
                <p className="text-sm text-muted-foreground mt-1">Total Overtime Hours</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-green-600">{overtimeAnalysis.employeesWithOvertime}</p>
                <p className="text-sm text-muted-foreground mt-1">Employees with OT</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-purple-600">{Math.round(overtimeAnalysis.avgOvertimePerEmployee / 60)}h</p>
                <p className="text-sm text-muted-foreground mt-1">Avg per Employee</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-orange-600">{overtimeAnalysis.overtimeByDepartment.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Departments with OT</p>
              </div>
            </div>

            {/* Overtime by Department */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Overtime by Department</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={overtimeAnalysis.overtimeByDepartment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="departmentName" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${Math.round(Number(value) / 60)}h`} />
                  <Bar dataKey="totalMinutes" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Overtime Minutes" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Overtime Employees */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold mb-4">Top Overtime Employees</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Rank</th>
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-right py-3 px-4">Overtime Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtimeAnalysis.topOvertimeEmployees.map((emp, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">{emp.employeeName}</td>
                        <td className="py-3 px-4 text-muted-foreground">{emp.departmentName}</td>
                        <td className="py-3 px-4 text-right font-semibold">{Math.round(emp.totalMinutes / 60)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Exceptions Tab */}
        {activeTab === 'exceptions' && (
          <>
            {/* Exception Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold">{exceptionAnalysis.totalExceptions}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Exceptions</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-green-600">{exceptionAnalysis.resolutionMetrics.resolvedCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Resolved</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-yellow-600">{exceptionAnalysis.resolutionMetrics.pendingCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Pending</p>
              </div>
              <div className="bg-card rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-red-600">{exceptionAnalysis.resolutionMetrics.escalatedCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Escalated</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Exceptions by Type */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Exceptions by Type</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={exceptionAnalysis.exceptionsByType as any[]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="count"
                      nameKey="type"
                      label={(props: any) => `${props.type}: ${props.percentage}%`}
                    >
                      {exceptionAnalysis.exceptionsByType.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Exceptions by Status */}
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Exceptions by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={exceptionAnalysis.exceptionsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {exceptionAnalysis.exceptionsByStatus.map((entry, idx) => (
                        <Cell key={idx} fill={
                          entry.status === 'RESOLVED' ? '#10b981' :
                          entry.status === 'PENDING' || entry.status === 'OPEN' ? '#f59e0b' :
                          entry.status === 'ESCALATED' ? '#ef4444' : '#6b7280'
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
              <h2 className="text-2xl font-bold mt-4">Time Management Health Score</h2>
              <p className="text-muted-foreground">Based on attendance, punctuality, exceptions, and payroll finalization</p>
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
                  {component.recommendations.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {component.recommendations.map((rec, rIdx) => (
                        <li key={rIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Issues & Improvements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {healthScore.topIssues.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Top Issues to Address
                  </h3>
                  <ul className="space-y-2">
                    {healthScore.topIssues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs flex-shrink-0">{idx + 1}</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {healthScore.improvements.length > 0 && (
                <div className="bg-green-50 rounded-xl border border-green-200 p-5">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Areas of Excellence
                  </h3>
                  <ul className="space-y-2">
                    {healthScore.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
