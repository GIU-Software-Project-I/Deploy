
import React, { useMemo } from 'react';
import { OrgPulseResponse } from '@/app/services/analytics';
import { Employee } from './EmployeeTableRow';

interface SearchInsightsPanelProps {
    stats: OrgPulseResponse | null;
    filteredEmployees: Employee[];
    loading: boolean;
}

export const SearchInsightsPanel: React.FC<SearchInsightsPanelProps> = ({ stats, filteredEmployees, loading }) => {

    // Calculate specific insights for the current filtered set
    const searchInsights = useMemo(() => {
        if (filteredEmployees.length === 0) return null;

        const activeCount = filteredEmployees.filter(e => e.status === 'ACTIVE').length;
        const avgTenureYears = filteredEmployees.reduce((acc, curr) => {
            const years = (new Date().getTime() - new Date(curr.dateOfHire).getTime()) / (1000 * 60 * 60 * 24 * 365);
            return acc + years;
        }, 0) / filteredEmployees.length;

        const deptCounts: Record<string, number> = {};
        filteredEmployees.forEach(e => {
            const name = e.primaryDepartmentId?.name || 'Unassigned';
            deptCounts[name] = (deptCounts[name] || 0) + 1;
        });

        const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0];

        return {
            activeRatio: (activeCount / filteredEmployees.length) * 100,
            avgTenure: avgTenureYears.toFixed(1),
            topDept: topDept ? topDept[0] : 'N/A'
        };
    }, [filteredEmployees]);

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded-2xl border border-border/50"></div>
            ))}
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 1. Workforce Health Card */}
            <div className="relative overflow-hidden bg-card border border-border rounded-xl p-5 hover:border-black/30 transition-all">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Org Pulse
                </h3>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground">{stats?.avgPerformanceScore?.toFixed(1) || '0.0'}%</p>
                        <p className="text-sm text-muted-foreground">Avg. Performance</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-black">{stats?.activeAppraisals || 0}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Cycles Recorded</p>
                    </div>
                </div>
            </div>

            {/* 2. Search Result Specifics */}
            <div className="relative overflow-hidden bg-white border border-border rounded-xl p-5 hover:border-black/3 transition-all">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Current Selection
                </h3>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground">{searchInsights?.avgTenure || '0.0'}y</p>
                        <p className="text-sm text-muted-foreground">Avg. Tenure</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-black">{searchInsights?.topDept || 'N/A'}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Dominant Dept</p>
                    </div>
                </div>
            </div>

            {/* 3. Predictive Meta */}
            <div className="relative overflow-hidden bg-card border border-border rounded-xl p-5 hover:border-black/30 transition-all">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Retention Signal
                </h3>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground">{searchInsights?.activeRatio?.toFixed(0) || '0'}%</p>
                        <p className="text-sm text-muted-foreground">Activity Rate</p>
                    </div>
                    <div className="text-right">
                        <div className="flex -space-x-2 justify-end mb-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-5 h-5 rounded-full border border-background bg-zinc-200"></div>
                            ))}
                        </div>
                        <p className="text-[10px] uppercase text-muted-foreground">Risk Watchlist</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
