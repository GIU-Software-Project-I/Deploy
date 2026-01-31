'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    StatusDistributionChart,
    DepartmentDistributionChart,
    GenderDiversityChart,
    WorkforceKPICards,
    HeadcountTrendsChart,
    TurnoverMetricsCard,
    TenureDistributionChart,
    AgeDemographicsChart,
    AttritionForecastCard,
    HighRiskEmployeesCard,
    EmploymentTypeChart,
    SkillsOverviewCard,
    SkillsDistributionChart,
    SkillGapsCard,
    SkillsCategoryChart,
    SkillsComparisonChart,
    SkillsRadarChart,
} from '@/components/employee-analytics';
import {
    employeeAnalyticsService,
    StatusDistribution,
    DepartmentDistribution,
    HeadcountTrend,
    TurnoverMetrics,
    AttritionForecast,
    TenureBucket,
    AgeBucket,
    EmploymentTypeData,
    AtRiskEmployee,
    SkillsAnalyticsResponse,
    SkillsComparisonResponse,
} from '@/app/services/employee-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Download, BarChart3, Users, TrendingUp, PieChart, Activity, AlertTriangle, Building2, Brain } from 'lucide-react';
import Link from 'next/link';

interface KPIData {
    totalHeadcount: number;
    activeEmployees: number;
    avgPerformanceScore: number;
    pendingChangeRequests: number;
    genderDiversityIndex: number;
    departmentsCount: number;
}

interface GenderData {
    gender: string;
    count: number;
    percentage: number;
}

/**
 * Calculate average tenure from tenure distribution buckets
 */
function calculateAverageTenure(data: TenureBucket[]): number {
    if (!data || data.length === 0) return 0;
    
    // Estimate midpoint for each bucket
    const bucketMidpoints: Record<string, number> = {
        '< 1 year': 0.5,
        '1-2 years': 1.5,
        '2-3 years': 2.5,
        '3-5 years': 4,
        '5-10 years': 7.5,
        '10+ years': 12,
    };
    
    let totalWeightedYears = 0;
    let totalCount = 0;
    
    data.forEach(bucket => {
        const midpoint = bucketMidpoints[bucket.range] || 3;
        totalWeightedYears += midpoint * bucket.count;
        totalCount += bucket.count;
    });
    
    return totalCount > 0 ? Math.round((totalWeightedYears / totalCount) * 10) / 10 : 0;
}

/**
 * Calculate average age from age demographics buckets
 */
function calculateAverageAge(data: AgeBucket[]): number {
    if (!data || data.length === 0) return 0;
    
    // Estimate midpoint for each bucket
    const bucketMidpoints: Record<string, number> = {
        '< 25': 23,
        '25-34': 30,
        '35-44': 40,
        '45-54': 50,
        '55+': 60,
        '< 30': 27,
        '30-39': 35,
        '40-49': 45,
        '50-59': 55,
        '60+': 63,
    };
    
    let totalWeightedAge = 0;
    let totalCount = 0;
    
    data.forEach(bucket => {
        const midpoint = bucketMidpoints[bucket.range] || 35;
        totalWeightedAge += midpoint * bucket.count;
        totalCount += bucket.count;
    });
    
    return totalCount > 0 ? Math.round(totalWeightedAge / totalCount) : 0;
}

export default function EmployeeAnalyticsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Data states
    const [kpiData, setKpiData] = useState<KPIData | null>(null);
    const [statusData, setStatusData] = useState<StatusDistribution[]>([]);
    const [departmentData, setDepartmentData] = useState<DepartmentDistribution[]>([]);
    const [genderData, setGenderData] = useState<GenderData[]>([]);
    const [headcountTrends, setHeadcountTrends] = useState<HeadcountTrend[]>([]);
    const [turnoverMetrics, setTurnoverMetrics] = useState<TurnoverMetrics | null>(null);
    const [attritionForecast, setAttritionForecast] = useState<AttritionForecast | null>(null);
    const [tenureData, setTenureData] = useState<TenureBucket[]>([]);
    const [ageData, setAgeData] = useState<AgeBucket[]>([]);
    const [employmentTypeData, setEmploymentTypeData] = useState<EmploymentTypeData[]>([]);
    const [highRiskEmployees, setHighRiskEmployees] = useState<AtRiskEmployee[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    // Skills analytics states
    const [skillsData, setSkillsData] = useState<SkillsAnalyticsResponse | null>(null);
    const [skillsLoading, setSkillsLoading] = useState(false);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
    const [comparisonDept1, setComparisonDept1] = useState<string>('');
    const [comparisonDept2, setComparisonDept2] = useState<string>('');
    const [comparisonData, setComparisonData] = useState<SkillsComparisonResponse | null>(null);
    const [comparisonLoading, setComparisonLoading] = useState(false);

    const fetchAllData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            console.log('[Employee Analytics] Fetching data...');

            const [kpis, composition, trends, turnover, forecast, tenure, age, empTypes, riskEmployees] = await Promise.all([
                employeeAnalyticsService.getKPISummary(),
                employeeAnalyticsService.getWorkforceComposition(),
                employeeAnalyticsService.getHeadcountTrends(12),
                employeeAnalyticsService.getTurnoverMetrics(12),
                employeeAnalyticsService.getAttritionForecast(),
                employeeAnalyticsService.getTenureDistribution(),
                employeeAnalyticsService.getAgeDemographics(),
                employeeAnalyticsService.getEmploymentTypes(),
                employeeAnalyticsService.getHighRiskEmployees(),
            ]);

            console.log('[Employee Analytics] KPIs:', kpis);
            console.log('[Employee Analytics] Composition:', composition);
            console.log('[Employee Analytics] Forecast:', forecast);

            setKpiData(kpis);
            setStatusData(composition.byStatus);
            setDepartmentData(composition.byDepartment);
            setGenderData(composition.genderDiversity);
            setHeadcountTrends(trends);
            setTurnoverMetrics(turnover);
            setAttritionForecast(forecast);
            setTenureData(tenure);
            setAgeData(age);
            setEmploymentTypeData(empTypes);
            setHighRiskEmployees(riskEmployees);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('[Employee Analytics] Failed to fetch analytics data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Fetch skills data when tab changes or filter changes
    useEffect(() => {
        if (activeTab === 'skills') {
            fetchSkillsData();
        }
    }, [activeTab, selectedDepartmentFilter]);

    const fetchSkillsData = async () => {
        setSkillsLoading(true);
        try {
            const departmentId = selectedDepartmentFilter === 'all' ? undefined : selectedDepartmentFilter;
            const data = await employeeAnalyticsService.getSkillsAnalytics(departmentId);
            setSkillsData(data);
        } catch (error) {
            console.error('[Employee Analytics] Failed to fetch skills data:', error);
        } finally {
            setSkillsLoading(false);
        }
    };

    // Fetch comparison data when both departments are selected
    useEffect(() => {
        if (comparisonDept1 && comparisonDept2 && comparisonDept1 !== comparisonDept2) {
            fetchComparisonData();
        } else {
            setComparisonData(null);
        }
    }, [comparisonDept1, comparisonDept2]);

    const fetchComparisonData = async () => {
        setComparisonLoading(true);
        try {
            const data = await employeeAnalyticsService.compareSkills(comparisonDept1, comparisonDept2);
            setComparisonData(data);
        } catch (error) {
            console.error('[Employee Analytics] Failed to fetch comparison data:', error);
        } finally {
            setComparisonLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchAllData(true);
        if (activeTab === 'skills') {
            fetchSkillsData();
        }
    };

    // Get department names for comparison labels
    const getDeptName = (deptId: string) => {
        const dept = departmentData.find(d => d.departmentId === deptId);
        return dept?.departmentName || deptId;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employee Analytics</h1>
                    <p className="text-muted-foreground">
                        Workforce composition, demographics, predictions, and intelligence
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <span className="text-xs text-muted-foreground">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <WorkforceKPICards data={kpiData} loading={loading} />

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="overview" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="demographics" className="gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Demographics</span>
                    </TabsTrigger>
                    <TabsTrigger value="skills" className="gap-2">
                        <Brain className="h-4 w-4" />
                        <span className="hidden sm:inline">Skills</span>
                    </TabsTrigger>
                    <TabsTrigger value="predictions" className="gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="hidden sm:inline">Predictions</span>
                    </TabsTrigger>
                    <TabsTrigger value="risks" className="gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="hidden sm:inline">Risks</span>
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <StatusDistributionChart data={statusData} loading={loading} />
                        <GenderDiversityChart
                            data={genderData}
                            diversityIndex={kpiData?.genderDiversityIndex}
                            loading={loading}
                        />
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <HeadcountTrendsChart data={headcountTrends} loading={loading} />
                        <TurnoverMetricsCard data={turnoverMetrics} loading={loading} />
                    </div>
                    <DepartmentDistributionChart data={departmentData} loading={loading} />
                </TabsContent>

                {/* Demographics Tab */}
                <TabsContent value="demographics" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <TenureDistributionChart 
                            data={tenureData} 
                            avgTenure={tenureData.length > 0 ? calculateAverageTenure(tenureData) : undefined}
                            loading={loading} 
                        />
                        <AgeDemographicsChart 
                            data={ageData}
                            avgAge={ageData.length > 0 ? calculateAverageAge(ageData) : undefined}
                            loading={loading} 
                        />
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <EmploymentTypeChart data={employmentTypeData} loading={loading} />
                        <GenderDiversityChart
                            data={genderData}
                            diversityIndex={kpiData?.genderDiversityIndex}
                            loading={loading}
                        />
                    </div>
                </TabsContent>

                {/* Predictions Tab */}
                <TabsContent value="predictions" className="space-y-6">
                    <AttritionForecastCard data={attritionForecast} loading={loading} />
                    <TurnoverMetricsCard data={turnoverMetrics} loading={loading} />
                </TabsContent>

                {/* Risks Tab */}
                <TabsContent value="risks" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <HighRiskEmployeesCard data={highRiskEmployees} loading={loading} />
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    Risk Summary
                                </CardTitle>
                                <CardDescription>Overview of workforce risk indicators</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-medium">High Risk Employees</span>
                                        <span className="text-2xl font-bold text-red-600">{highRiskEmployees.filter(e => e.riskLevel === 'HIGH').length}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-medium">Medium Risk Employees</span>
                                        <span className="text-2xl font-bold text-amber-600">{highRiskEmployees.filter(e => e.riskLevel === 'MEDIUM').length}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-medium">Attrition Risk Level</span>
                                        <span className={`text-sm font-bold px-2 py-1 rounded ${
                                            attritionForecast?.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                            attritionForecast?.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                            attritionForecast?.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {attritionForecast?.riskLevel || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-medium">Predicted Vacancies (6mo)</span>
                                        <span className="text-2xl font-bold">{attritionForecast?.predictedVacancies || 0}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Skills Tab */}
                <TabsContent value="skills" className="space-y-6">
                    {/* Department Filter */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Filter by Department:</span>
                            <Select value={selectedDepartmentFilter} onValueChange={setSelectedDepartmentFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departmentData.map((dept) => (
                                        <SelectItem key={dept.departmentId} value={dept.departmentId}>
                                            {dept.departmentName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Skills Overview */}
                    <SkillsOverviewCard data={skillsData?.summary || null} loading={skillsLoading} />

                    {/* Skills Distribution and Radar */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <SkillsDistributionChart 
                            data={skillsData?.skillsDistribution || []} 
                            loading={skillsLoading}
                            title="Skills by Popularity"
                            description="Most common skills across employees"
                        />
                        <SkillsRadarChart 
                            data={skillsData?.topSkills || []} 
                            loading={skillsLoading}
                            title="Top Skills Proficiency"
                        />
                    </div>

                    {/* Category and Gaps */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <SkillsCategoryChart 
                            data={skillsData?.categoryDistribution || []} 
                            loading={skillsLoading}
                        />
                        <SkillGapsCard 
                            data={skillsData?.skillGaps || []} 
                            loading={skillsLoading}
                        />
                    </div>

                    {/* Department Comparison */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Compare Departments</CardTitle>
                            <CardDescription>Select two departments to compare their skill profiles</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                                <Select value={comparisonDept1} onValueChange={setComparisonDept1}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Select Department 1" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departmentData.map((dept) => (
                                            <SelectItem key={dept.departmentId} value={dept.departmentId}>
                                                {dept.departmentName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-muted-foreground">vs</span>
                                <Select value={comparisonDept2} onValueChange={setComparisonDept2}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Select Department 2" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departmentData.filter(d => d.departmentId !== comparisonDept1).map((dept) => (
                                            <SelectItem key={dept.departmentId} value={dept.departmentId}>
                                                {dept.departmentName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {comparisonDept1 && comparisonDept2 && (
                                <SkillsComparisonChart
                                    data={comparisonData}
                                    dept1Name={getDeptName(comparisonDept1)}
                                    dept2Name={getDeptName(comparisonDept2)}
                                    loading={comparisonLoading}
                                />
                            )}
                            {(!comparisonDept1 || !comparisonDept2) && (
                                <div className="text-center py-12 text-muted-foreground">
                                    Select two departments above to view skill comparison
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Quick Links to Related Features */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <QuickLinkCard
                    title="Employee Management"
                    description="View and manage employee profiles"
                    href="/dashboard/hr-admin/employee-management"
                    icon={Users}
                />
                <QuickLinkCard
                    title="Change Requests"
                    description="Review pending profile changes"
                    href="/dashboard/hr-admin/change-requests"
                    icon={TrendingUp}
                    badge={kpiData?.pendingChangeRequests}
                />
                <QuickLinkCard
                    title="Organization Analytics"
                    description="Structure health & insights"
                    href="/dashboard/hr-admin/org-analytics"
                    icon={Building2}
                />
                <QuickLinkCard
                    title="Performance Analytics"
                    description="View performance insights"
                    href="/dashboard/hr-manager/performance-analytics"
                    icon={BarChart3}
                />
            </div>
        </div>
    );
}

interface QuickLinkCardProps {
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
}

function QuickLinkCard({ title, description, href, icon: Icon, badge }: QuickLinkCardProps) {
    return (
        <Link href={href}>
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <div className="relative">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {badge !== undefined && badge > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                                {badge > 9 ? '9+' : badge}
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </CardContent>
            </Card>
        </Link>
    );
}
