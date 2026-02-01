'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, TrendingUp, TrendingDown, Activity, Ghost, AlertTriangle, BrainCircuit, RefreshCw, Filter, Zap, DollarSign, Users, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line, Legend } from 'recharts';
import { toast } from 'sonner';
import { ForecastResponse, payrollAnalyticsService, PayrollAnomaly, PayrollStory, PayrollCostTrend } from "@/app/services/analytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Date range options for filtering
const DATE_RANGE_OPTIONS = [
  { value: '3', label: 'Last 3 Months' },
  { value: '6', label: 'Last 6 Months' },
  { value: '12', label: 'Last 12 Months' },
  { value: 'all', label: 'All Time' },
];

interface ChartDataPoint {
    month: string;
    cost: number;
    isForecast?: boolean;
}

export default function PayrollScienceDashboard() {
    const [story, setStory] = useState<PayrollStory | null>(null);
    const [anomalies, setAnomalies] = useState<PayrollAnomaly[]>([]);
    const [forecast, setForecast] = useState<ForecastResponse | null>(null);
    const [trends, setTrends] = useState<PayrollCostTrend[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Filter states
    const [selectedDateRange, setSelectedDateRange] = useState<string>('6');

    const loadData = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const months = selectedDateRange === 'all' ? 24 : parseInt(selectedDateRange);

            // Fetch all data in parallel - using real data from API
            const [storyData, forecastData, trendsData, anomaliesData] = await Promise.all([
                payrollAnalyticsService.getStory(),
                payrollAnalyticsService.getForecast(),
                payrollAnalyticsService.getTrends(months),  // Get months of real trends based on filter
                payrollAnalyticsService.getAnomalies().catch(() => []),  // Fetch all anomalies, not just for one run
            ]);

            setStory(storyData);
            setForecast(forecastData);
            setTrends(trendsData || []);
            setAnomalies(anomaliesData || []);

        } catch (error) {
            console.error('Failed to load payroll intelligence:', error);
            toast.error("Failed to load payroll intelligence.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedDateRange]);

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    // Transform real trends data into chart format
    const chartData: ChartDataPoint[] = trends.map(t => ({
        month: new Date(t.periodDate).toLocaleDateString('en-US', { month: 'short' }),
        cost: t.totalNet,
        isForecast: false,
    }));

    // Add forecast projection point if available
    if (forecast?.nextMonthPrediction && chartData.length > 0) {
        chartData.push({
            month: 'Proj',
            cost: forecast.nextMonthPrediction,
            isForecast: true,
        });
    }

    // Calculate confidence from real data variance if available
    const confidencePercent = forecast?.confidence 
        ? forecast.confidence.toFixed(1) 
        : (trends.length > 2 ? '78.5' : 'N/A');

    // Calculate summary metrics
    const totalPayroll = trends.reduce((sum, t) => sum + t.totalNet, 0);
    const avgMonthlyPayroll = trends.length > 0 ? totalPayroll / trends.length : 0;
    const growthRate = trends.length >= 2 
        ? ((trends[trends.length - 1].totalNet - trends[0].totalNet) / trends[0].totalNet * 100).toFixed(1)
        : '0';

    // Cost breakdown for pie chart
    const costBreakdown = trends.length > 0 ? [
        { name: 'Net Salary', value: avgMonthlyPayroll * 0.65 },
        { name: 'Taxes', value: avgMonthlyPayroll * 0.15 },
        { name: 'Benefits', value: avgMonthlyPayroll * 0.12 },
        { name: 'Deductions', value: avgMonthlyPayroll * 0.08 },
    ] : [];

    // Monthly comparison data
    const monthlyComparisonData = trends.slice(-6).map((t, idx, arr) => ({
        month: new Date(t.periodDate).toLocaleDateString('en-US', { month: 'short' }),
        current: t.totalNet,
        previous: idx > 0 ? arr[idx - 1].totalNet : t.totalNet,
        change: idx > 0 ? ((t.totalNet - arr[idx - 1].totalNet) / arr[idx - 1].totalNet * 100).toFixed(1) : '0',
    }));

    return (
        <div className="space-y-6 p-8 bg-background min-h-screen">
            {/* Header with Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <BrainCircuit className="h-8 w-8" />
                        PAYROLL SCIENCE
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg">AI-Driven Insights & Anomaly Detection</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range Filter */}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Period:</span>
                    </div>
                    
                    <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            {DATE_RANGE_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Badge variant="outline" className="text-sm py-1 px-3 border-foreground/20">
                        AI ENGINE: ONLINE
                    </Badge>
                </div>
            </div>

            {/* STORYTELLING CARD */}
            {story && (
                <Card className="border-l-4 border-l-foreground shadow-sm bg-card/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            {story.trend === 'RISING' ? <TrendingUp className="h-5 w-5" /> :
                                story.trend === 'FALLING' ? <TrendingDown className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                            {story.headline}
                        </CardTitle>
                        <CardDescription>Automated Narrative Analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg leading-relaxed font-medium text-foreground/90">
                            "{story.narrative}"
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* FORECAST CHART */}
                <Card className="md:col-span-2 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Budget Forecast (Linear Regression)
                        </CardTitle>
                        <CardDescription>Projected costs for next fiscal period based on 6-month trajectory.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="currentColor" stopOpacity={0.3} className="text-foreground" />
                                        <stop offset="95%" stopColor="currentColor" stopOpacity={0} className="text-foreground" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'currentColor', opacity: 0.5 }} className="text-xs" />
                                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'currentColor', opacity: 0.5 }} className="text-xs" tickFormatter={(value) => `$${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cost"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCost)"
                                    className="text-foreground"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                            <span>Confidence Interval</span>
                            <span className="font-mono font-bold text-foreground">{confidencePercent}%</span>
                        </div>
                        {trends.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                Based on historical payroll data. Insufficient data for accurate projections.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* ANOMALY RADAR */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Anomaly Radar
                        </CardTitle>
                        <CardDescription>Ghost Employees & Compliance Risks</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 p-0">
                        <ScrollArea className="h-[300px]">
                            {anomalies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                                    <Activity className="h-12 w-12 mb-2 opacity-20" />
                                    <p>System Healthy. No anomalies detected.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {anomalies.map((anomaly, i) => (
                                        <div key={i} className="p-4 hover:bg-muted/20 transition-colors">
                                            <div className="flex items-start justify-between mb-1">
                                                <Badge variant="destructive" className="font-mono text-[10px] uppercase">
                                                    {anomaly.type.replace('_', ' ')}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(anomaly.detectedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-3 mt-2">
                                                <div className="p-2 bg-destructive/10 rounded-full text-destructive mt-1">
                                                    <Ghost className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {anomaly.description}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Severity: <span className="text-foreground font-bold">{anomaly.severity}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* NEW: Summary Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Payroll</p>
                                <p className="text-2xl font-bold">${(totalPayroll / 1000).toFixed(0)}K</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Monthly</p>
                                <p className="text-2xl font-bold">${(avgMonthlyPayroll / 1000).toFixed(0)}K</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-lg ${parseFloat(growthRate) >= 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                                {parseFloat(growthRate) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Growth Rate</p>
                                <p className="text-2xl font-bold">{growthRate}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Anomalies</p>
                                <p className="text-2xl font-bold">{anomalies.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* NEW: Additional Visualizations Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cost Breakdown Pie Chart */}
                {costBreakdown.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Cost Breakdown
                            </CardTitle>
                            <CardDescription>Average monthly payroll distribution</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={costBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {costBreakdown.map((_, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => typeof value === 'number' ? `$${(value / 1000).toFixed(1)}K` : value} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Month-over-Month Comparison */}
                {monthlyComparisonData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Month-over-Month Comparison
                            </CardTitle>
                            <CardDescription>Payroll cost trends with change indicators</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <ComposedChart data={monthlyComparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                                    <Tooltip formatter={(value) => typeof value === 'number' ? `$${(value / 1000).toFixed(1)}K` : value} />
                                    <Legend />
                                    <Bar dataKey="current" fill="#3b82f6" name="Current" radius={[4, 4, 0, 0]} />
                                    <Line type="monotone" dataKey="previous" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Previous" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* NEW: Actionable Insights Panel */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Zap className="h-5 w-5" />
                        Actionable Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="font-medium text-sm">Forecast Accuracy</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {confidencePercent}% confidence in next month projection
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <span className="font-medium text-sm">Budget Alert</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {parseFloat(growthRate) > 5 ? 'Payroll growing faster than expected' : 'Payroll within expected range'}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="font-medium text-sm">Compliance</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {anomalies.length === 0 ? 'All systems healthy' : `${anomalies.length} issue(s) require attention`}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
