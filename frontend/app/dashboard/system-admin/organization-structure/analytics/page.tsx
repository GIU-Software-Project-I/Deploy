'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';
import {
    orgStructureAnalyticsService,
    StructuralHealthScore,
    DepartmentAnalytics,
    PositionRiskAssessment,
    CostCenterSummary,
    ChangeImpactAnalysis
} from '@/app/services/org-structure-analytics';
import RoleGuard from '@/components/RoleGuard';
import { SystemRole } from '@/types';
import {
    OrgTenureDistributionChart,
    SpanOfControlChart,
    DepartmentFillRateChart,
    CostCenterPieChart,
    CostCenterUtilizationChart,
} from '@/components/org-analytics/OrgStructureCharts';

// Local interface definitions for raw data (for simulator)
interface Department {
    _id: string;
    name: string;
    code: string;
    parentDepartmentId?: { _id: string; name: string } | string;
    headOfDepartmentId?: { _id: string; firstName: string; lastName: string } | string;
    costCenter?: string;
    isActive: boolean;
}

interface Position {
    _id: string;
    title: string;
    code: string;
    departmentId: { _id: string; name: string } | string;
    reportsToPositionId?: { _id: string; title: string } | string;
    isActive: boolean;
}

/**
 * Organization Structure Analytics Dashboard
 * Data Science, Visualization, and Intelligence features
 * REQ-OSM-01, REQ-OSM-02, BR 24, BR 30
 * Now uses backend analytics service for consistency with HR Admin page
 */

export default function StructureAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<'health' | 'departments' | 'positions' | 'costs' | 'simulation'>('health');

    // Raw data (for simulator dropdowns)
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [assignmentCount, setAssignmentCount] = useState<number>(0);

    // Backend analytics data
    const [healthScore, setHealthScore] = useState<StructuralHealthScore | null>(null);
    const [deptAnalytics, setDeptAnalytics] = useState<DepartmentAnalytics[]>([]);
    const [positionRisks, setPositionRisks] = useState<PositionRiskAssessment[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenterSummary[]>([]);

    // Simulation State
    const [simulationType, setSimulationType] = useState<'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT'>('DEACTIVATE_POSITION');
    const [simulationTarget, setSimulationTarget] = useState<string>('');
    const [simulationResult, setSimulationResult] = useState<ChangeImpactAnalysis | null>(null);
    const [simulationLoading, setSimulationLoading] = useState(false);

    const handleRunSimulation = async (type: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT', targetId: string) => {
        if (!targetId) return;
        try {
            setSimulationLoading(true);
            const result = await orgStructureAnalyticsService.simulateChangeImpact(type, targetId);
            setSimulationResult(result);
        } catch (err: any) {
            setError(err.message || 'Simulation failed');
        } finally {
            setSimulationLoading(false);
        }
    };

    useEffect(() => {
        fetchAndAnalyze();
    }, []);

    const fetchAndAnalyze = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch raw data for simulator dropdowns + backend analytics
            const [deptRes, posRes, assignRes, healthRes, deptAnalyticsRes, riskRes, costRes] = await Promise.all([
                organizationStructureService.searchDepartments(undefined, undefined, 1, 1000),
                organizationStructureService.searchPositions(undefined, undefined, undefined, 1, 1000),
                organizationStructureService.searchAssignments(undefined, undefined, undefined, undefined, 1, 1000),
                orgStructureAnalyticsService.getStructuralHealth(),
                orgStructureAnalyticsService.getDepartmentAnalytics(),
                orgStructureAnalyticsService.getPositionRiskAssessment(),
                orgStructureAnalyticsService.getCostCenterAnalysis(),
            ]);

            // Extract raw data for simulator dropdowns
            const deptRaw = deptRes.data as any;
            const posRaw = posRes.data as any;
            const assignRaw = assignRes.data as any;
            const depts = deptRaw?.data ?? deptRaw ?? [];
            const poss = posRaw?.data ?? posRaw ?? [];
            const assigns = assignRaw?.data ?? assignRaw ?? [];
            setDepartments(Array.isArray(depts) ? depts : []);
            setPositions(Array.isArray(poss) ? poss : []);
            setAssignmentCount(Array.isArray(assigns) ? assigns.length : 0);

            // Set backend analytics data (these services return data directly)
            if (healthRes) setHealthScore(healthRes);
            if (deptAnalyticsRes) setDeptAnalytics(deptAnalyticsRes);
            if (riskRes) setPositionRisks(riskRes);
            if (costRes) setCostCenters(costRes);

        } catch (err: any) {
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    // Grade color helpers
    const gradeColor = (grade: string) => {
        switch (grade) {
            case 'A': return 'text-green-500';
            case 'B': return 'text-blue-500';
            case 'C': return 'text-yellow-500';
            case 'D': return 'text-orange-500';
            case 'F': return 'text-red-500';
            default: return 'text-muted-foreground';
        }
    };

    const riskColor = (risk: string) => {
        switch (risk) {
            case 'LOW': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'HIGH': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-muted text-muted-foreground';
        }
    }

    const impactColor = (level: string) => {
        switch (level) {
            case 'HIGH': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'LOW': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const insightIcon = (type: string) => {
        switch (type) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    if (loading) {
        return (
            <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
                <div className="p-6 lg:p-8 bg-background min-h-screen">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="animate-pulse space-y-6">
                            <div className="h-8 bg-muted rounded w-1/3"></div>
                            <div className="grid grid-cols-4 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-32 bg-muted rounded-xl"></div>
                                ))}
                            </div>
                            <div className="h-96 bg-muted rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </RoleGuard>
        );
    }

    return (
        <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
            <div className="p-6 lg:p-8 bg-background min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard/system-admin/organization-structure"
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Structure Analytics</h1>
                                <p className="text-muted-foreground text-sm">Data-driven insights for organizational health</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchAndAnalyze}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Refresh Analysis
                        </button>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Overall Structure Insights Card */}
                    {healthScore && (
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Organizational Structure Insights</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Factual KPI analysis and structural distributions</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Overall Capacity</div>
                                    <div className="text-4xl font-bold text-primary">{healthScore.overallFillRate}%</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {assignmentCount} / {positions.length} Positions Filled
                                    </div>
                                </div>
                            </div>

                            {/* Core KPIs */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">Management Ratio</div>
                                    <div className="text-2xl font-bold text-foreground">{healthScore.managementRatio}%</div>
                                    <div className="text-xs text-muted-foreground">Percentage of leadership roles</div>
                                </div>
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">Avg. Span of Control</div>
                                    <div className="text-2xl font-bold text-foreground">{healthScore.spanOfControl.average}</div>
                                    <div className="text-xs text-muted-foreground">Direct reports per manager</div>
                                </div>
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">Avg. Hierarchy Depth</div>
                                    <div className="text-2xl font-bold text-foreground">{healthScore.hierarchyStats.averageDepth}</div>
                                    <div className="text-xs text-muted-foreground">Management layers (Target: 3-5)</div>
                                </div>
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase">High Tenure Risk</div>
                                    <div className="text-2xl font-bold text-foreground">
                                        {healthScore.tenureDistribution[3].count}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Employees with 10+ years</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 border-b border-border pb-2">
                        {[
                            { id: 'health', label: 'Health Insights', icon: '' },
                            { id: 'departments', label: 'Departments', icon: '' },
                            { id: 'positions', label: 'Position Risk', icon: '' },
                            { id: 'costs', label: 'Cost Centers', icon: '' },
                            { id: 'simulation', label: 'Simulator', icon: '' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === tab.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Health Insights Section */}
                    {activeSection === 'health' && healthScore && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Key Insights */}
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h3 className="font-semibold text-foreground mb-4">Key Insights</h3>
                                <div className="space-y-3">
                                    {healthScore.insights.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">No significant issues detected ✓</p>
                                    ) : (
                                        healthScore.insights.map((insight, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-4 rounded-lg border ${insight.type === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                                                    insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                                                        'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xl">{insightIcon(insight.type)}</span>
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-foreground">{insight.title}</h4>
                                                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                                                    </div>
                                                    {insight.metric !== undefined && (
                                                        <span className="text-lg font-bold text-foreground">{insight.metric}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="space-y-4">
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <h3 className="font-semibold text-foreground mb-4">Structure Overview</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <div className="text-3xl font-bold text-foreground">{departments.length}</div>
                                            <div className="text-sm text-muted-foreground">Departments</div>
                                        </div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <div className="text-3xl font-bold text-foreground">{positions.length}</div>
                                            <div className="text-sm text-muted-foreground">Positions</div>
                                        </div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <div className="text-3xl font-bold text-foreground">{assignmentCount}</div>
                                            <div className="text-sm text-muted-foreground">Assignments</div>
                                        </div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <div className="text-3xl font-bold text-foreground">{costCenters.length}</div>
                                            <div className="text-sm text-muted-foreground">Cost Centers</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {healthScore.tenureDistribution && (
                                        <OrgTenureDistributionChart data={healthScore.tenureDistribution.map(d => ({ range: d.bracket, count: d.count }))} />
                                    )}
                                    {healthScore.spanOfControl?.distribution && (
                                        <SpanOfControlChart
                                            data={healthScore.spanOfControl.distribution.map(d => ({ range: d.bracket, count: d.count }))}
                                            average={healthScore.spanOfControl.average}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Departments Section */}
                    {activeSection === 'departments' && (
                        <div className="space-y-6">
                            {/* Department Fill Rate Chart */}
                            <DepartmentFillRateChart data={deptAnalytics} />

                            {/* Data Table */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">Department Details</h3>
                                    <p className="text-sm text-muted-foreground">Detailed metrics by department</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Positions</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Filled</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Vacant</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Leadership</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">IC Roles</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Fill Rate</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Avg Tenure</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {deptAnalytics.map(dept => (
                                                <tr key={dept.departmentId} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-medium text-foreground">{dept.departmentName}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{dept.totalPositions}</td>
                                                    <td className="px-4 py-3 text-center text-green-600 dark:text-green-400">{dept.filledPositions}</td>
                                                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{dept.vacantPositions}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{dept.managementCount}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{dept.icCount}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${dept.fillRate >= 80 ? 'bg-green-500' : dept.fillRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${dept.fillRate}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-medium">{dept.fillRate}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{dept.avgTenure}y</td>
                                                </tr>
                                            ))}
                                            {deptAnalytics.length === 0 && (
                                                <tr>
                                                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                                                        No department data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Position Risk Section */}
                    {activeSection === 'positions' && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-border">
                                <h3 className="font-semibold text-foreground">Position Risk Assessment</h3>
                                <p className="text-sm text-muted-foreground">Criticality scoring and succession status by position</p>
                            </div>
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
                                        {positionRisks.slice(0, 20).map(pos => (
                                            <tr key={pos.positionId} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium text-foreground">{pos.positionTitle}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{pos.department}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${impactColor(pos.impactLevel)}`}>
                                                        {pos.impactLevel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${riskColor(pos.vacancyRisk)}`}>
                                                        {pos.vacancyRisk}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${pos.successionStatus === 'COVERED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        pos.successionStatus === 'AT_RISK' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {pos.successionStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {pos.facts.map((f, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded border border-border/50">
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
                            {positionRisks.length > 20 && (
                                <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">
                                    Showing top 20 of {positionRisks.length} positions (sorted by criticality)
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cost Centers Section */}
                    {activeSection === 'costs' && (
                        <div className="space-y-6">
                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <CostCenterPieChart data={costCenters} />
                                <CostCenterUtilizationChart data={costCenters} />
                            </div>

                            {/* Data Table */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">Cost Center Details</h3>
                                    <p className="text-sm text-muted-foreground">Detailed breakdown by cost center</p>
                                </div>
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
                                                    <td className="px-4 py-3 font-medium text-foreground font-mono">{cc.costCenter}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{cc.departmentCount}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{cc.positionCount}</td>
                                                    <td className="px-4 py-3 text-center font-medium text-foreground">{cc.estimatedHeadcount}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${cc.utilizationRate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            cc.utilizationRate >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                            }`}>
                                                            {cc.utilizationRate}%
                                                        </span>
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
                            </div>
                        </div>
                    )}
                    {/* Simulation Section */}
                    {activeSection === 'simulation' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Simulator Controls */}
                            <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 h-fit">
                                <h3 className="font-semibold text-foreground mb-4">Structure Simulator</h3>
                                <p className="text-sm text-muted-foreground mb-6">Run "what-if" scenarios to predict impact before making changes.</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-foreground block mb-2">Action Type</label>
                                        <select
                                            className="w-full p-2 rounded-lg border border-input bg-background text-sm"
                                            value={simulationType}
                                            onChange={(e) => {
                                                setSimulationType(e.target.value as any);
                                                setSimulationTarget('');
                                                setSimulationResult(null);
                                            }}
                                        >
                                            <option value="DEACTIVATE_POSITION">Deactivate Position</option>
                                            <option value="DEACTIVATE_DEPARTMENT">Deactivate Department</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-foreground block mb-2">Target Entity</label>
                                        <select
                                            className="w-full p-2 rounded-lg border border-input bg-background text-sm"
                                            value={simulationTarget}
                                            onChange={(e) => {
                                                setSimulationTarget(e.target.value);
                                                handleRunSimulation(simulationType, e.target.value);
                                            }}
                                        >
                                            <option value="">Select Target...</option>
                                            {simulationType === 'DEACTIVATE_DEPARTMENT' ? (
                                                departments.map(d => (
                                                    <option key={d._id} value={d._id}>{d.name}</option>
                                                ))
                                            ) : (
                                                positions.map(p => (
                                                    <option key={p._id} value={p._id}>{p.title}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Simulation Results */}
                            <div className="lg:col-span-2">
                                {simulationResult ? (
                                    <div className="bg-card border border-border rounded-xl p-6">
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <h3 className="font-semibold text-foreground">Impact Analysis</h3>
                                                <p className="text-sm text-muted-foreground mt-1">Predicted consequences of this action</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${riskColor(simulationResult.impactLevel)}`}>
                                                {simulationResult.impactLevel} IMPACT
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                                <div className="text-2xl font-bold text-foreground">{simulationResult.affectedPositions}</div>
                                                <div className="text-sm text-muted-foreground">Positions Affected</div>
                                            </div>
                                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                                <div className="text-2xl font-bold text-foreground">{simulationResult.affectedEmployees}</div>
                                                <div className="text-sm text-muted-foreground">Employees Displaced</div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-sm font-medium text-foreground mb-3">Downstream Effects</h4>
                                                <div className="space-y-2">
                                                    {simulationResult.downstreamEffects.map((effect, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                                            <span className="text-amber-500">⚠️</span>
                                                            {effect}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                                <h4 className="text-sm font-medium text-primary mb-1">Recommendation</h4>
                                                <p className="text-sm text-foreground">{simulationResult.recommendation}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-card border border-border rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-3xl">
                                            🧪
                                        </div>
                                        <h3 className="font-medium text-foreground">Ready to Simulate</h3>
                                        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                                            Select an action and a target entity to see the potential impact on your organization structure.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </RoleGuard>
    );
}
