'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';
import {
    orgStructureAnalyticsService,
    StructuralHealthScore,
    DepartmentAnalytics,
    PositionRiskAssessment,
    CostCenterSummary,
    ChangeImpactAnalysis,
    OrgSummaryStats,
} from '@/app/services/org-structure-analytics';
import RoleGuard from '@/components/RoleGuard';
import { SystemRole } from '@/types';
import {
    ArrowLeft,
    RefreshCw,
    Activity,
    Building2,
    Users,
    Briefcase,
    AlertTriangle,
    DollarSign,
    Beaker,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Department {
    _id: string;
    name: string;
}

interface Position {
    _id: string;
    title: string;
}

/**
 * Organization Structure Analytics Dashboard for HR Admin
 * Uses backend API for data science and analytics
 */
export default function HRAdminOrgAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Summary stats
    const [summaryStats, setSummaryStats] = useState<OrgSummaryStats | null>(null);

    // Computed analytics from backend
    const [healthScore, setHealthScore] = useState<StructuralHealthScore | null>(null);
    const [deptAnalytics, setDeptAnalytics] = useState<DepartmentAnalytics[]>([]);
    const [positionRisks, setPositionRisks] = useState<PositionRiskAssessment[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenterSummary[]>([]);

    // For simulator dropdowns
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);

    // Simulation State
    const [simulationType, setSimulationType] = useState<'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT'>('DEACTIVATE_POSITION');
    const [simulationTarget, setSimulationTarget] = useState<string>('');
    const [simulationResult, setSimulationResult] = useState<ChangeImpactAnalysis | null>(null);
    const [simulationLoading, setSimulationLoading] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Fetch all analytics from backend in parallel
            const [
                healthRes,
                summaryRes,
                deptRes,
                posRiskRes,
                costCenterRes,
                deptsForSimulator,
                positionsForSimulator,
            ] = await Promise.all([
                orgStructureAnalyticsService.getStructuralHealth(),
                orgStructureAnalyticsService.getOrgSummaryStats(),
                orgStructureAnalyticsService.getDepartmentAnalytics(),
                orgStructureAnalyticsService.getPositionRiskAssessment(),
                orgStructureAnalyticsService.getCostCenterAnalysis(),
                organizationStructureService.searchDepartments(undefined, undefined, 1, 200),
                organizationStructureService.searchPositions(undefined, undefined, undefined, 1, 200),
            ]);

            setHealthScore(healthRes);
            setSummaryStats(summaryRes);
            setDeptAnalytics(deptRes);
            setPositionRisks(posRiskRes);
            setCostCenters(costCenterRes);

            // For simulator dropdowns - deptsForSimulator.data is PaginatedResult, need .data.data for array
            const deptRaw = deptsForSimulator.data as any;
            const posRaw = positionsForSimulator.data as any;
            const deptData = deptRaw?.data ?? deptRaw ?? [];
            const posData = posRaw?.data ?? posRaw ?? [];
            setDepartments(Array.isArray(deptData) ? deptData : []);
            setPositions(Array.isArray(posData) ? posData : []);
        } catch (err: any) {
            console.error('Failed to fetch org analytics:', err);
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRunSimulation = async (type: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT', targetId: string) => {
        if (!targetId) return;
        try {
            setSimulationLoading(true);
            const result = await orgStructureAnalyticsService.simulateChangeImpact(type, targetId);
            setSimulationResult(result);
        } catch (err: any) {
            console.error('Simulation failed:', err);
            setSimulationResult(null);
        } finally {
            setSimulationLoading(false);
        }
    };

    const riskBadgeClass = (risk: string) => {
        switch (risk) {
            case 'LOW': return 'bg-green-100 text-green-700 border-green-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const impactBadgeClass = (level: string) => {
        switch (level) {
            case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'LOW': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    if (loading) {
        return (
            <RoleGuard allowedRoles={[SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
                <div className="space-y-6">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-muted rounded w-1/3" />
                        <div className="grid grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-32 bg-muted rounded-xl" />
                            ))}
                        </div>
                        <div className="h-96 bg-muted rounded-xl" />
                    </div>
                </div>
            </RoleGuard>
        );
    }

    return (
        <RoleGuard allowedRoles={[SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/hr-admin" className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Organization Analytics</h1>
                            <p className="text-muted-foreground">Structure health, position risk, and impact analysis</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchAnalytics(true)} disabled={refreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Structure Insights Card */}
                {healthScore && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        Organizational Structure Insights
                                    </CardTitle>
                                    <CardDescription>Factual KPI analysis and structural distributions</CardDescription>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Overall Capacity</div>
                                    <div className="text-4xl font-bold text-primary mt-1">{healthScore.overallFillRate}%</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">Management Ratio</div>
                                    <div className="text-2xl font-bold">{healthScore.managementRatio}%</div>
                                    <div className="text-xs text-muted-foreground">Leadership roles</div>
                                </div>
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">Avg. Span of Control</div>
                                    <div className="text-2xl font-bold">{healthScore.spanOfControl.average}</div>
                                    <div className="text-xs text-muted-foreground">Reports per manager</div>
                                </div>
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">Hierarchy Depth</div>
                                    <div className="text-2xl font-bold">{healthScore.hierarchyStats.averageDepth}</div>
                                    <div className="text-xs text-muted-foreground">Management layers</div>
                                </div>
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">High Tenure Risk</div>
                                    <div className="text-2xl font-bold">{healthScore.tenureDistribution[3]?.count || 0}</div>
                                    <div className="text-xs text-muted-foreground">Employees 10+ years</div>
                                </div>
                            </div>

                            {healthScore.insights.length > 0 && (
                                <div className="mt-6 grid gap-3 md:grid-cols-2">
                                    {healthScore.insights.slice(0, 4).map((insight, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-lg border ${insight.type === 'critical' ? 'bg-red-50 border-red-200' :
                                                insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                                                    'bg-blue-50 border-blue-200'
                                                }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className={`h-4 w-4 mt-0.5 ${insight.type === 'critical' ? 'text-red-500' :
                                                    insight.type === 'warning' ? 'text-yellow-500' :
                                                        'text-blue-500'
                                                    }`} />
                                                <div>
                                                    <h4 className="text-sm font-medium">{insight.title}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Departments</p>
                                    <p className="text-3xl font-bold">{summaryStats?.totalDepartments ?? 0}</p>
                                </div>
                                <Building2 className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Positions</p>
                                    <p className="text-3xl font-bold">{summaryStats?.totalPositions ?? 0}</p>
                                    <p className="text-xs text-muted-foreground">{summaryStats?.fillRate ?? 0}% filled</p>
                                </div>
                                <Briefcase className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Filled Positions</p>
                                    <p className="text-3xl font-bold text-green-600">{summaryStats?.filledPositions ?? 0}</p>
                                    <p className="text-xs text-muted-foreground">{summaryStats?.vacantPositions ?? 0} vacant</p>
                                </div>
                                <Users className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Cost Centers</p>
                                    <p className="text-3xl font-bold">{summaryStats?.costCenterCount ?? 0}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabbed Content */}
                <Tabs defaultValue="departments" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="departments" className="gap-2">
                            <Building2 className="h-4 w-4" />
                            Departments
                        </TabsTrigger>
                        <TabsTrigger value="positions" className="gap-2">
                            <Briefcase className="h-4 w-4" />
                            Position Risk
                        </TabsTrigger>
                        <TabsTrigger value="costs" className="gap-2">
                            <DollarSign className="h-4 w-4" />
                            Cost Centers
                        </TabsTrigger>
                        <TabsTrigger value="simulator" className="gap-2">
                            <Beaker className="h-4 w-4" />
                            Simulator
                        </TabsTrigger>
                    </TabsList>

                    {/* Departments Tab */}
                    <TabsContent value="departments">
                        <Card>
                            <CardHeader>
                                <CardTitle>Department Analytics</CardTitle>
                                <CardDescription>Fill rates, health scores, and risk levels by department</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Positions</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Filled</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Vacant</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Fill Rate</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Leadership</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Avg Tenure</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {deptAnalytics.map(dept => (
                                                <tr key={dept.departmentId} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-medium">{dept.departmentName}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{dept.totalPositions}</td>
                                                    <td className="px-4 py-3 text-center text-green-600">{dept.filledPositions}</td>
                                                    <td className="px-4 py-3 text-center text-red-600">{dept.vacantPositions}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Progress value={dept.fillRate} className="w-16 h-2" />
                                                            <span className="text-sm">{dept.fillRate}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{dept.managementCount}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{dept.avgTenure}y</td>
                                                </tr>
                                            ))}
                                            {deptAnalytics.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                                        No department data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Position Risk Tab */}
                    <TabsContent value="positions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Position Risk Assessment</CardTitle>
                                <CardDescription>Criticality scoring and succession status by position</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Position</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Impact</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Exit Risk</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Succession</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Factual Markers</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {positionRisks.slice(0, 15).map(pos => (
                                                <tr key={pos.positionId} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-medium">{pos.positionTitle}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{pos.department}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant="outline" className={impactBadgeClass(pos.impactLevel)}>
                                                            {pos.impactLevel}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant="outline" className={riskBadgeClass(pos.vacancyRisk)}>
                                                            {pos.vacancyRisk}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant="outline" className={
                                                            pos.successionStatus === 'COVERED' ? 'bg-green-100 text-green-700' :
                                                                pos.successionStatus === 'AT_RISK' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-700'
                                                        }>
                                                            {pos.successionStatus.replace('_', ' ')}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {pos.facts.slice(0, 2).map((f: string, i: number) => (
                                                                <span key={i} className="px-2 py-0.5 bg-muted text-xs rounded">
                                                                    {f}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {positionRisks.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                                        No position data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {positionRisks.length > 15 && (
                                    <p className="text-xs text-center text-muted-foreground mt-4">
                                        Showing top 15 of {positionRisks.length} positions (sorted by criticality)
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Cost Centers Tab */}
                    <TabsContent value="costs">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cost Center Summary</CardTitle>
                                    <CardDescription>Cost allocation by organizational unit</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Cost Center</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Depts</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Positions</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Headcount</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Utilization</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {costCenters.map(cc => (
                                                    <tr key={cc.costCenter} className="hover:bg-muted/30">
                                                        <td className="px-4 py-3 font-mono font-medium">{cc.costCenter}</td>
                                                        <td className="px-4 py-3 text-center text-muted-foreground">{cc.departmentCount}</td>
                                                        <td className="px-4 py-3 text-center text-muted-foreground">{cc.positionCount}</td>
                                                        <td className="px-4 py-3 text-center font-medium">{cc.estimatedHeadcount}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Progress value={cc.utilizationRate} className="w-12 h-2" />
                                                                <span className="text-sm">{cc.utilizationRate}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {costCenters.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                            No cost center data available
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Position Distribution by Cost Center</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {costCenters.slice(0, 8).map(cc => {
                                            const maxPositions = Math.max(...costCenters.map(c => c.positionCount), 1);
                                            const widthPct = (cc.positionCount / maxPositions) * 100;
                                            return (
                                                <div key={cc.costCenter} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-mono">{cc.costCenter}</span>
                                                        <span className="text-muted-foreground">{cc.positionCount} positions</span>
                                                    </div>
                                                    <div className="h-6 bg-muted rounded overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary/80 rounded flex items-center justify-end pr-2 transition-all"
                                                            style={{ width: `${Math.max(widthPct, 10)}%` }}
                                                        >
                                                            <span className="text-xs text-primary-foreground font-medium">
                                                                {cc.estimatedHeadcount}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Simulator Tab */}
                    <TabsContent value="simulator">
                        <div className="grid gap-6 lg:grid-cols-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Beaker className="h-5 w-5" />
                                        Structure Simulator
                                    </CardTitle>
                                    <CardDescription>
                                        Run "what-if" scenarios to predict impact before making changes
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Action Type</label>
                                        <Select
                                            value={simulationType}
                                            onValueChange={(v) => {
                                                setSimulationType(v as any);
                                                setSimulationTarget('');
                                                setSimulationResult(null);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DEACTIVATE_POSITION">Deactivate Position</SelectItem>
                                                <SelectItem value="DEACTIVATE_DEPARTMENT">Deactivate Department</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Target Entity</label>
                                        <Select
                                            value={simulationTarget}
                                            onValueChange={(v) => {
                                                setSimulationTarget(v);
                                                handleRunSimulation(simulationType, v);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select target..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {simulationType === 'DEACTIVATE_DEPARTMENT' ? (
                                                    departments.map(d => (
                                                        <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                                    ))
                                                ) : (
                                                    positions.slice(0, 50).map(p => (
                                                        <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-2">
                                {simulationResult ? (
                                    <>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle>Impact Analysis</CardTitle>
                                                <Badge variant="outline" className={riskBadgeClass(simulationResult.impactLevel)}>
                                                    {simulationResult.impactLevel} IMPACT
                                                </Badge>
                                            </div>
                                            <CardDescription>Predicted consequences of this action</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div className="p-4 bg-muted/50 rounded-lg text-center">
                                                    <div className="text-2xl font-bold">{simulationResult.affectedPositions}</div>
                                                    <div className="text-sm text-muted-foreground">Positions Affected</div>
                                                </div>
                                                <div className="p-4 bg-muted/50 rounded-lg text-center">
                                                    <div className="text-2xl font-bold">{simulationResult.affectedEmployees}</div>
                                                    <div className="text-sm text-muted-foreground">Employees Displaced</div>
                                                </div>
                                            </div>

                                            {simulationResult.downstreamEffects.length > 0 && (
                                                <div className="space-y-2 mb-6">
                                                    <h4 className="text-sm font-medium">Downstream Effects</h4>
                                                    {simulationResult.downstreamEffects.map((effect, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                            {effect}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                                <h4 className="text-sm font-medium text-primary mb-1">Recommendation</h4>
                                                <p className="text-sm">{simulationResult.recommendation}</p>
                                            </div>
                                        </CardContent>
                                    </>
                                ) : (
                                    <CardContent className="h-full flex flex-col items-center justify-center py-12">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                            <Beaker className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="font-medium">Ready to Simulate</h3>
                                        <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
                                            Select an action and target entity to see the potential impact on your organization structure.
                                        </p>
                                    </CardContent>
                                )}
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </RoleGuard>
    );
}
