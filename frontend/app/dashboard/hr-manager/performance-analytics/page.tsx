'use client';

import { useState, useEffect } from 'react';
import {
    AppraisalRecord,
    calculateRaterBias,
    calculateTrajectory,
    classify9Box,
    ManagerBiasMetric,
    PerformanceTrajectory,
    transformBackendRecords
} from '@/app/services/analytics/performanceAnalytics';
import { performanceService } from '@/app/services/performance';
import {
    TrendingUp,
    Scale,
    Grid,
    AlertCircle,
    User,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PerformanceAnalyticsPage() {
    const [biasMetrics, setBiasMetrics] = useState<ManagerBiasMetric[]>([]);
    const [trends, setTrends] = useState<PerformanceTrajectory[]>([]);
    const [gridData, setGridData] = useState<{ x: number, y: number, name: string, label: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const response = await performanceService.searchRecords('', 1, 1000) as any;
                const records = transformBackendRecords(response.data?.data || []);

                if (records.length === 0) {
                    setBiasMetrics([]);
                    setTrends([]);
                    setGridData([]);
                    return;
                }

                // 1. Bias
                setBiasMetrics(calculateRaterBias(records));

                // 2. Trends
                const trajectories = calculateTrajectory(records);
                setTrends(trajectories.sort((a, b) => b.slope - a.slope));

                // 3. 9-Box (Use latest)
                const latestMap = new Map<string, AppraisalRecord>();
                records.forEach(r => {
                    const existing = latestMap.get(r.employeeId);
                    if (!existing || new Date(r.date) > new Date(existing.date)) {
                        latestMap.set(r.employeeId, r);
                    }
                });

                const grid = Array.from(latestMap.values()).map(d => ({
                    x: d.rating,
                    y: d.potential || d.rating,
                    name: d.employeeName,
                    label: classify9Box(d.rating, d.potential || d.rating)
                }));
                setGridData(grid);
            } catch (error) {
                console.error('Failed to fetch performance analytics:', error);
                toast.error('Failed to load real performance data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading Strategic Insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Link href="/dashboard/hr-manager" className="hover:text-foreground">HR Manager</Link>
                        <span>/</span>
                        <span className="text-foreground font-medium">Strategic Intelligence</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Talent Analytics Nexus</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Predictive analysis of rater fairness, growth trajectories, and organizational potential</p>
                </div>
            </div>

            {biasMetrics.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <AlertCircle className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-1">No Historical Data Found</h3>
                    <p className="text-muted-foreground">We couldn't find enough appraisal records to generate strategic insights. Please ensure performance cycles are completed and Published.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* 1. Rater Bias Analyzer */}
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all">
                        <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                            <Scale className="w-5 h-5 text-muted-foreground" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-foreground">Rater Bias Analysis (Z-Score)</h2>
                        </div>

                        <div className="space-y-4">
                            {biasMetrics.map((m: ManagerBiasMetric) => (
                                <div key={m.managerId} className="flex items-center gap-4">
                                    <div className="w-24 text-xs font-semibold text-muted-foreground truncate">{m.managerName}</div>
                                    <div className="flex-1 h-8 bg-muted rounded relative">
                                        {/* Center Line */}
                                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-border"></div>

                                        {/* Bar */}
                                        <div
                                            className={`absolute top-2 bottom-2 ${m.zScore > 0 ? 'bg-foreground' : 'bg-muted-foreground'}`}
                                            style={{
                                                width: `${Math.min(50, Math.abs(m.zScore) * 20)}%`,
                                                left: m.zScore > 0 ? '50%' : 'auto',
                                                right: m.zScore <= 0 ? '50%' : 'auto'
                                            }}
                                        ></div>
                                    </div>
                                    <div className="w-20 text-right">
                                        <div className="text-xs font-bold text-foreground">{m.zScore > 0 ? '+' : ''}{m.zScore} SD</div>
                                        <div className={`text-[10px] uppercase font-bold ${m.biasCategory === 'Strict' ? 'text-foreground' : m.biasCategory === 'Lenient' ? 'text-muted-foreground' : 'text-foreground opacity-70'}`}>
                                            {m.biasCategory}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Performance Trajectory */}
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all">
                        <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                            <TrendingUp className="w-5 h-5 text-muted-foreground" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-foreground">Growth Trajectory (Slope)</h2>
                        </div>

                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                            {trends.slice(0, 8).map((t: PerformanceTrajectory) => (
                                <div key={t.employeeId} className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
                                    <div>
                                        <div className="text-xs font-semibold text-foreground">{t.name}</div>
                                        <div className="text-[10px] text-muted-foreground">Next Score: {t.predictedNextRating} / 5</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-foreground">
                                                {t.slope > 0 ? '+' : ''}{t.slope}
                                            </div>
                                        </div>
                                        {t.slope > 0.05 ? <ArrowUpRight className="w-4 h-4 text-foreground" /> :
                                            t.slope < -0.05 ? <ArrowDownRight className="w-4 h-4 text-muted-foreground" /> :
                                                <Minus className="w-4 h-4 text-muted-foreground" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. 9-Box Grid */}
                    <div className="lg:col-span-2 bg-card border border-border rounded-xl p-8 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-8">
                            <Grid className="w-5 h-5 text-muted-foreground" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-foreground">9-Box Talent Matrix</h2>
                        </div>

                        <div className="relative h-[400px] w-full border-l-2 border-b-2 border-border bg-muted/30 rounded mx-auto max-w-3xl">
                            {/* Grid Lines */}
                            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-border dashed border-dashed border-l"></div>
                            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-border dashed border-dashed border-l"></div>
                            <div className="absolute top-1/3 left-0 right-0 h-px bg-border dashed border-dashed border-t"></div>
                            <div className="absolute top-2/3 left-0 right-0 h-px bg-border dashed border-dashed border-t"></div>

                            {/* Labels */}
                            <div className="absolute -left-12 top-1/2 -rotate-90 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Potential</div>
                            <div className="absolute -bottom-8 left-1/2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Performance</div>

                            {/* Plot Points */}
                            {gridData.map((pt: any, i: number) => (
                                <div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full bg-foreground hover:w-4 hover:h-4 transition-all cursor-pointer group shadow-sm"
                                    style={{
                                        left: `${(pt.x / 5) * 100}%`,
                                        bottom: `${(pt.y / 5) * 100}%`
                                    }}
                                >
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity font-bold">
                                        {pt.name} - {pt.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            <span>Underperformer</span>
                            <span>Top Talent</span>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
