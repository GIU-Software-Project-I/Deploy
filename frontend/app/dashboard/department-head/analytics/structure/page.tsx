'use client';

import { useState, useEffect } from 'react';
import { OrgChartVisualizer } from '@/components/analytics/OrgChartVisualizer';
import { employeeProfileService } from '@/app/services/employee-profile';
import { organizationStructureService } from '@/app/services/organization-structure';
import { 
    orgStructureAnalyticsService,
    ChangeImpactAnalysis,
    WorkforceVacancyForecast,
    NetworkMetrics as BackendNetworkMetrics,
    StructureMetrics as BackendStructureMetrics,
} from '@/app/services/org-structure-analytics';
import {
    EmployeeNode,
} from '@/app/services/analytics/structureAnalytics';
import {
    Network,
    ChevronLeft,
    Activity,
    Users,
    Layers,
    AlertCircle,
    TrendingUp,
    BarChart3,
    Share2,
    Zap,
    Beaker
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function StructureAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<EmployeeNode[]>([]);
    const [metrics, setMetrics] = useState<BackendStructureMetrics | null>(null);
    const [forecast, setForecast] = useState<WorkforceVacancyForecast | null>(null);
    const [network, setNetwork] = useState<BackendNetworkMetrics | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'forecasting' | 'network' | 'simulator'>('overview');

    // Simulator State - now using backend
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [simulationType, setSimulationType] = useState<'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT'>('DEACTIVATE_POSITION');
    const [simulationTarget, setSimulationTarget] = useState<string>('');
    const [simulationResult, setSimulationResult] = useState<ChangeImpactAnalysis | null>(null);

    const riskBadgeClass = (risk: string) => {
        switch (risk) {
            case 'LOW': return 'bg-success/10 text-success border border-success/30';
            case 'MEDIUM': return 'bg-warning/10 text-warning border border-warning/30';
            case 'HIGH': return 'bg-warning/20 text-warning border border-warning/40';
            case 'CRITICAL': return 'bg-destructive/10 text-destructive border border-destructive/40';
            default: return 'bg-muted text-muted-foreground border border-border';
        }
    };

    const handleRunSimulation = async (type: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT', targetId: string) => {
        if (!targetId) return;
        try {
            const result = await orgStructureAnalyticsService.simulateChangeImpact(type, targetId);
            setSimulationResult(result);
        } catch (err: any) {
            console.error('Simulation error:', err);
            setSimulationResult(null);
        }
    };

    useEffect(() => {
        const fetchStructure = async () => {
            try {
                setLoading(true);
                
                // Fetch all data from backend in parallel
                const [
                    teamResponse,
                    structureMetricsRes,
                    vacancyForecastRes,
                    networkMetricsRes,
                    deptRes,
                    posRes
                ] = await Promise.all([
                    employeeProfileService.getTeamProfiles(),
                    orgStructureAnalyticsService.getStructureMetrics(),
                    orgStructureAnalyticsService.getWorkforceVacancyForecast(6),
                    orgStructureAnalyticsService.getNetworkMetrics(),
                    organizationStructureService.searchDepartments(undefined, undefined, 1, 1000),
                    organizationStructureService.searchPositions(undefined, undefined, undefined, 1, 1000),
                ]);

                // Process team profiles for org chart visualization
                if (!teamResponse.error && teamResponse.data && Array.isArray(teamResponse.data)) {
                    const nodes: EmployeeNode[] = teamResponse.data.map((m: any) => ({
                        id: m._id,
                        name: m.fullName || `${m.firstName} ${m.lastName}`,
                        position: m.primaryPositionId?.title || 'Unknown Position',
                        department: m.primaryDepartmentId?.name || 'Unknown Dept',
                        managerId: m.supervisorPositionId || null,
                        imageUrl: m.profilePicture
                    }));
                    setEmployees(nodes);
                }

                // Set backend analytics
                setMetrics(structureMetricsRes);
                setForecast(vacancyForecastRes);
                setNetwork(networkMetricsRes);

                // Fetch org structure data for simulator dropdowns
                const deptRaw = deptRes.data as any;
                const posRaw = posRes.data as any;
                const deptData = deptRaw?.data ?? deptRaw ?? [];
                const posData = posRaw?.data ?? posRaw ?? [];

                setDepartments(Array.isArray(deptData) ? deptData : []);
                setPositions(Array.isArray(posData) ? posData : []);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStructure();
    }, []);

    return (
        <div className="dept-head-theme min-h-screen bg-background font-sans text-foreground pb-20">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <Link href="/dashboard/department-head" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronLeft className="w-3 h-3 mr-1" />
                            Back to Overview
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary text-primary-foreground rounded-xl shadow-lg">
                                {activeTab === 'overview' && <Network className="w-6 h-6" />}
                                {activeTab === 'forecasting' && <TrendingUp className="w-6 h-6" />}
                                {activeTab === 'network' && <Share2 className="w-6 h-6" />}
                                {activeTab === 'simulator' && <Beaker className="w-6 h-6" />}
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold text-foreground tracking-tight">Structure Intelligence</h1>
                                <p className="text-sm text-muted-foreground font-medium mt-1">
                                    {activeTab === 'overview' && 'Visualize reporting lines and structural health.'}
                                    {activeTab === 'forecasting' && 'Predictive attrition and vacancy modeling.'}
                                    {activeTab === 'network' && 'Organizational network analysis (ONA) and influencers.'}
                                    {activeTab === 'simulator' && 'Run what-if scenarios to predict change impact.'}
                                </p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-muted/50 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'overview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Structure
                            </button>
                            <button
                                onClick={() => setActiveTab('forecasting')}
                                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'forecasting' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Forecasting
                            </button>
                            <button
                                onClick={() => setActiveTab('network')}
                                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'network' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Network
                            </button>
                            <button
                                onClick={() => setActiveTab('simulator')}
                                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${activeTab === 'simulator' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Beaker className="w-3 h-3" />
                                Simulator
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">

                    {activeTab === 'overview' && (
                        <>
                            {/* Visualizer Card */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-border/60 bg-muted/40 flex justify-between items-center">
                                    <h3 className="text-xs font-semibold text-foreground">Interactive Org Chart</h3>
                                    {employees.length > 0 && (
                                        <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                            {employees.length} Nodes
                                        </span>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="h-96 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2 animate-pulse">
                                            <div className="w-8 h-8 bg-muted rounded-full"></div>
                                            <span className="text-xs font-medium text-muted-foreground">Loading Graph...</span>
                                        </div>
                                    </div>
                                ) : error ? (
                                    <div className="p-12 text-center">
                                        <p className="text-sm font-semibold text-destructive">{error}</p>
                                    </div>
                                ) : (
                                    <OrgChartVisualizer employees={employees} />
                                )}
                            </div>

                            {/* Metrics Grid */}
                            {metrics && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Span of Control */}
                                    <div className="p-6 border border-border rounded-xl bg-card shadow-sm hover:border-border/60 transition-colors">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <h4 className="text-sm font-semibold text-foreground">Span of Control</h4>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Direct reports per manager analytics</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-semibold text-foreground">{metrics.spanOfControl.avg}</span>
                                                <p className="text-[10px] font-medium text-muted-foreground">Avg Reports</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                <span className="text-xs text-muted-foreground font-medium block mb-1">Min</span>
                                                <span className="text-lg font-semibold text-foreground">{metrics.spanOfControl.min}</span>
                                            </div>
                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                <span className="text-xs text-muted-foreground font-medium block mb-1">Median</span>
                                                <span className="text-lg font-semibold text-foreground">{metrics.spanOfControl.median}</span>
                                            </div>
                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                <span className="text-xs text-muted-foreground font-medium block mb-1">Max</span>
                                                <span className="text-lg font-semibold text-foreground">{metrics.spanOfControl.max}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reporting Depth */}
                                    <div className="p-6 border border-border rounded-xl bg-card shadow-sm hover:border-border/60 transition-colors">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Layers className="w-4 h-4 text-muted-foreground" />
                                                    <h4 className="text-sm font-semibold text-foreground">Reporting Depth</h4>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Hierarchy structural layers</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-semibold text-foreground">{metrics.depth.max}</span>
                                                <p className="text-[10px] font-medium text-muted-foreground">Max Layers</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full"
                                                        style={{ width: `${(metrics.depth.avg / 10) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground w-12 text-right">{metrics.depth.avg} Avg</span>
                                            </div>

                                            {metrics.issues.length > 0 && (
                                                <div className="mt-4 p-3 bg-card border border-border rounded-lg shadow-sm">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <AlertCircle className="w-3 h-3 text-foreground" />
                                                        <span className="text-[10px] font-medium text-foreground">Structural Risks</span>
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {metrics.issues.map((issue, i) => (
                                                            <li key={i} className="text-[10px] text-muted-foreground font-medium">• {issue}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'forecasting' && forecast && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Hero Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-primary text-primary-foreground rounded-xl shadow-xl">
                                    <div className="flex items-center gap-2 mb-4 text-primary-foreground/70">
                                        <Activity className="w-5 h-5" />
                                        <span className="text-xs font-semibold">Projected Turnover</span>
                                    </div>
                                    <div className="text-5xl font-semibold tracking-tight mb-2">{forecast.currentAttritionRate}%</div>
                                    <p className="text-sm text-primary-foreground/70">Annualized attrition rate based on historical data.</p>
                                </div>

                                <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                                        <Users className="w-5 h-5" />
                                        <span className="text-xs font-semibold">Predicted Vacancies</span>
                                    </div>
                                    <div className="text-5xl font-semibold tracking-tight text-foreground mb-2">{forecast.predictedVacancies}</div>
                                    <p className="text-sm text-muted-foreground">Roles likely to require backfilling in forecast period.</p>
                                </div>

                                <div className="p-6 bg-card border border-border rounded-xl shadow-sm overflow-hidden relative">
                                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="text-xs font-semibold">Primary Risk Factors</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {forecast.riskFactors.map((factor, i) => (
                                            <li key={i} className="text-xs font-semibold text-foreground flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-destructive rounded-full"></div>
                                                {factor}
                                            </li>
                                        ))}
                                        {forecast.riskFactors.length === 0 && (
                                            <li className="text-xs text-muted-foreground italic">No structural risks detected.</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Monthly Projection */}
                                <div className="lg:col-span-2 p-6 bg-card border border-border rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">6-Month Vacancy Forecast</h3>
                                            <p className="text-xs text-muted-foreground mt-1">Estimated vacancies per month</p>
                                        </div>
                                        <BarChart3 className="w-5 h-5 text-muted-foreground" />
                                    </div>

                                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                                        {forecast.monthlyProjections.map((m, i) => (
                                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                                <div
                                                    className="w-full bg-primary rounded-t-sm opacity-80 group-hover:opacity-100 transition-all relative"
                                                    style={{ height: `${Math.min(100, m.count * 20)}%` }}
                                                >
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {m.count}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-semibold text-muted-foreground">{m.month}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* High Risk Departments */}
                                <div className="p-6 bg-muted/40 border border-border rounded-xl">
                                    <h3 className="text-sm font-semibold text-foreground mb-6">At-Risk Departments</h3>
                                    <div className="space-y-4">
                                        {forecast.highRiskDepts.map((d, i) => (
                                            <div key={i} className="bg-background p-4 rounded-lg border border-border flex justify-between items-center shadow-sm">
                                                <div>
                                                    <span className="text-xs font-semibold text-foreground">{d.name}</span>
                                                    <span className="text-[10px] text-muted-foreground ml-2">({d.headcount} employees)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${d.attritionRate > 20 ? 'bg-destructive' : 'bg-warning'}`}
                                                            style={{ width: `${Math.min(100, d.attritionRate)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-semibold text-foreground">{d.attritionRate}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'network' && network && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Influencers */}
                                <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Zap className="w-4 h-4 text-warning" />
                                                <h3 className="text-sm font-semibold text-foreground">Key Influencers</h3>
                                            </div>
                                            <p className="text-xs text-muted-foreground">High centrality nodes in the organization.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {network.influencers.map((inf, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                                                        {inf.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-foreground">{inf.name}</h4>
                                                        <p className="text-[10px] text-muted-foreground">{inf.dept}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-semibold text-foreground">{inf.score}</span>
                                                    <p className="text-[10px] font-semibold text-muted-foreground">Score</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Collaboration Matrix */}
                                <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Share2 className="w-4 h-4 text-muted-foreground" />
                                                <h3 className="text-sm font-semibold text-foreground">Collaboration Matrix</h3>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Cross-departmental interaction strength.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {network.collaborationMatrix.map((item, i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 bg-background border border-border rounded-lg hover:shadow-sm transition-shadow">
                                                <div className="flex-1 flex justify-between items-center text-xs font-semibold text-foreground">
                                                    <span>{item.deptA}</span>
                                                    <span className="text-muted-foreground">↔</span>
                                                    <span>{item.deptB}</span>
                                                </div>
                                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all"
                                                        style={{ width: `${item.score}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-semibold text-foreground w-8 text-right">{item.score}</span>
                                            </div>
                                        ))}
                                        {network.collaborationMatrix.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic text-center py-8">Not enough departments to analyze.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Simulator Tab */}
                    {activeTab === 'simulator' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Simulator Controls */}
                                <Card className="border-border">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                            <Beaker className="h-5 w-5 text-muted-foreground" />
                                            Structure Simulator
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Run "what-if" scenarios to predict impact before making changes
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground">Action Type</label>
                                            <Select
                                                value={simulationType}
                                                onValueChange={(v) => {
                                                    setSimulationType(v as any);
                                                    setSimulationTarget('');
                                                    setSimulationResult(null);
                                                }}
                                            >
                                                <SelectTrigger className="border-border">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="DEACTIVATE_POSITION">Deactivate Position</SelectItem>
                                                    <SelectItem value="DEACTIVATE_DEPARTMENT">Deactivate Department</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground">Target Entity</label>
                                            <Select
                                                value={simulationTarget}
                                                onValueChange={(v) => {
                                                    setSimulationTarget(v);
                                                    handleRunSimulation(simulationType, v);
                                                }}
                                            >
                                                <SelectTrigger className="border-border">
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

                                {/* Simulation Results */}
                                <Card className="lg:col-span-2 border-border">
                                    {simulationResult ? (
                                        <>
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-sm font-semibold">Impact Analysis</CardTitle>
                                                    <Badge variant="outline" className={riskBadgeClass(simulationResult.impactLevel)}>
                                                        {simulationResult.impactLevel} IMPACT
                                                    </Badge>
                                                </div>
                                                <CardDescription className="text-xs">Predicted consequences of this action</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div className="p-4 bg-muted/40 rounded-lg text-center border border-border">
                                                        <div className="text-3xl font-semibold text-foreground">{simulationResult.affectedPositions}</div>
                                                        <div className="text-xs font-semibold text-muted-foreground mt-1">Positions Affected</div>
                                                    </div>
                                                    <div className="p-4 bg-muted/40 rounded-lg text-center border border-border">
                                                        <div className="text-3xl font-semibold text-foreground">{simulationResult.affectedEmployees}</div>
                                                        <div className="text-xs font-semibold text-muted-foreground mt-1">Employees Displaced</div>
                                                    </div>
                                                </div>

                                                {simulationResult.downstreamEffects.length > 0 && (
                                                    <div className="space-y-2 mb-6">
                                                        <h4 className="text-xs font-semibold text-muted-foreground">Downstream Effects</h4>
                                                        {simulationResult.downstreamEffects.map((effect, i) => (
                                                            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border">
                                                                <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
                                                                {effect}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="p-4 bg-primary text-primary-foreground rounded-lg">
                                                    <h4 className="text-xs font-semibold mb-2 text-primary-foreground/80">Recommendation</h4>
                                                    <p className="text-sm">{simulationResult.recommendation}</p>
                                                </div>
                                            </CardContent>
                                        </>
                                    ) : (
                                        <CardContent className="h-full flex flex-col items-center justify-center py-16">
                                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                                <Beaker className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground">Ready to Simulate</h3>
                                            <p className="text-xs text-muted-foreground mt-2 max-w-sm text-center">
                                                Select an action and target entity to see the potential impact on your team structure.
                                            </p>
                                        </CardContent>
                                    )}
                                </Card>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
