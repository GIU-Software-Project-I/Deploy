'use client';

import React, { useState, useEffect } from 'react';
import { Employee } from './EmployeeTableRow';
import { performanceService } from '@/app/services/performance';
import { transformBackendRecords, AppraisalRecord } from '@/app/services/analytics/performanceAnalytics';
import { Loader2, Users, TrendingUp, Star, AlertTriangle, Target, Zap, Award, UserCheck, ShieldCheck } from 'lucide-react';

interface Talent9BoxGridProps {
    employees: Employee[];
}

interface EmployeeBoxData {
    employee: Employee;
    performance: number; // 0-5 scale
    potential: number; // 0-5 scale
    boxX: number; // 0, 1, 2
    boxY: number; // 0, 1, 2
}

export const Talent9BoxGrid: React.FC<Talent9BoxGridProps> = ({ employees }) => {
    const [loading, setLoading] = useState(true);
    const [employeeBoxData, setEmployeeBoxData] = useState<EmployeeBoxData[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Convert rating to box position (0: Low, 1: Med, 2: High)
    const getLevel = (val: number): number => {
        if (val >= 4) return 2; // High
        if (val >= 2.5) return 1; // Med
        return 0; // Low
    };

    useEffect(() => {
        const fetchPerformanceData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch all performance records
                const response = await performanceService.searchRecords('', 1, 500) as any;
                const records = response?.data?.data || response?.data || [];

                // Transform to AppraisalRecord format
                const appraisals: AppraisalRecord[] = Array.isArray(records)
                    ? transformBackendRecords(records)
                    : [];

                // Build a map of employeeId -> latest performance/potential scores
                const employeeScores = new Map<string, { performance: number; potential: number; count: number }>();

                appraisals.forEach(app => {
                    const existing = employeeScores.get(app.employeeId);
                    if (existing) {
                        // Average the scores if multiple records
                        existing.performance = (existing.performance * existing.count + app.rating) / (existing.count + 1);
                        existing.potential = (existing.potential * existing.count + (app.potential || app.rating)) / (existing.count + 1);
                        existing.count += 1;
                    } else {
                        employeeScores.set(app.employeeId, {
                            performance: app.rating,
                            potential: app.potential || app.rating,
                            count: 1
                        });
                    }
                });

                // Map employees to their box data
                const boxData: EmployeeBoxData[] = employees.map(emp => {
                    const scores = employeeScores.get(emp._id);

                    // If no real data, use a neutral position (center box) or skip
                    const performance = scores?.performance ?? 3; // Default to medium
                    const potential = scores?.potential ?? 3; // Default to medium

                    return {
                        employee: emp,
                        performance,
                        potential,
                        boxX: getLevel(performance),
                        boxY: getLevel(potential)
                    };
                });

                setEmployeeBoxData(boxData);
            } catch (err) {
                console.error('Failed to fetch performance data:', err);
                setError('Could not load performance data');

                // Fallback: place all employees in center box
                const fallbackData: EmployeeBoxData[] = employees.map(emp => ({
                    employee: emp,
                    performance: 3,
                    potential: 3,
                    boxX: 1,
                    boxY: 1
                }));
                setEmployeeBoxData(fallbackData);
            } finally {
                setLoading(false);
            }
        };

        if (employees.length > 0) {
            fetchPerformanceData();
        } else {
            setLoading(false);
            setEmployeeBoxData([]);
        }
    }, [employees]);

    const boxes = [
        { x: 0, y: 2, label: "Rough Diamond", icon: Zap, colorClass: "bg-warning/10 border-warning/30 hover:border-warning" },
        { x: 1, y: 2, label: "Future Star", icon: Star, colorClass: "bg-info/10 border-info/30 hover:border-info" },
        { x: 2, y: 2, label: "Top Talent", icon: Award, colorClass: "bg-success/10 border-success/30 hover:border-success" },
        { x: 0, y: 1, label: "Inconsistent", icon: AlertTriangle, colorClass: "bg-orange-500/10 border-orange-500/30 hover:border-orange-500" },
        { x: 1, y: 1, label: "Core Performer", icon: UserCheck, colorClass: "bg-primary/10 border-primary/30 hover:border-primary" },
        { x: 2, y: 1, label: "High Performer", icon: TrendingUp, colorClass: "bg-info/10 border-info/30 hover:border-info" },
        { x: 0, y: 0, label: "Underperformer", icon: Target, colorClass: "bg-destructive/10 border-destructive/30 hover:border-destructive" },
        { x: 1, y: 0, label: "Effective", icon: ShieldCheck, colorClass: "bg-muted border-border hover:border-primary" },
        { x: 2, y: 0, label: "Trusted Pro", icon: Users, colorClass: "bg-primary/5 border-primary/20 hover:border-primary" },
    ];

    const getEmployeesInBox = (boxX: number, boxY: number): EmployeeBoxData[] => {
        return employeeBoxData.filter(e => e.boxX === boxX && e.boxY === boxY);
    };

    // Count employees with real performance data
    const employeesWithData = employeeBoxData.filter(e => e.performance !== 3 || e.potential !== 3).length;

    return (
        <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Talent Matrix (9-Box Grid)</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {loading ? 'Loading performance data...' : (
                            <>
                                Mapping {employees.length} employees by Performance vs Potential
                                {employeesWithData > 0 && (
                                    <span className="ml-2 text-success">({employeesWithData} with appraisal data)</span>
                                )}
                            </>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                        <span className="text-muted-foreground">High Potential</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <span className="text-muted-foreground">High Performance</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error} - Showing default placement
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">Loading performance data...</span>
                </div>
            ) : (
                <div className="relative">
                    {/* Axis Labels */}
                    <div className="absolute -left-2 lg:-left-8 top-1/2 -translate-y-1/2 -rotate-90">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                            ← Potential →
                        </span>
                    </div>
                    <div className="absolute left-1/2 -bottom-6 -translate-x-1/2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                            ← Performance →
                        </span>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-3 grid-rows-3 gap-3 max-w-3xl mx-auto ml-6 lg:ml-10 mb-8">
                        {boxes.sort((a, b) => b.y - a.y || a.x - b.x).map((box, idx) => {
                            const empsInBox = getEmployeesInBox(box.x, box.y);
                            const IconComponent = box.icon;

                            return (
                                <div
                                    key={idx}
                                    className={`relative flex flex-col items-center justify-center border-2 p-4 rounded-xl transition-all duration-300 cursor-default min-h-[140px] ${box.colorClass}`}
                                >
                                    {/* Box Label */}
                                    <div className="absolute top-2 left-2 flex items-center gap-1">
                                        <IconComponent className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            {box.label}
                                        </span>
                                    </div>

                                    {/* Employee Avatars */}
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-[80px] overflow-y-auto mt-4">
                                        {empsInBox.length === 0 ? (
                                            <span className="text-xs text-muted-foreground/50">No employees</span>
                                        ) : (
                                            empsInBox.slice(0, 12).map((data, eidx) => (
                                                <div
                                                    key={eidx}
                                                    title={`${data.employee.fullName || `${data.employee.firstName} ${data.employee.lastName}`}\nPerf: ${data.performance.toFixed(1)} | Pot: ${data.potential.toFixed(1)}`}
                                                    className="w-8 h-8 rounded-full border-2 border-background bg-muted flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-foreground overflow-hidden shadow-sm hover:scale-110 transition-transform"
                                                >
                                                    {data.employee.profilePictureUrl ? (
                                                        <img
                                                            src={data.employee.profilePictureUrl}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        (data.employee.firstName?.[0] || '') + (data.employee.lastName?.[0] || '')
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        {empsInBox.length > 12 && (
                                            <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                                                +{empsInBox.length - 12}
                                            </div>
                                        )}
                                    </div>

                                    {/* Count Badge */}
                                    <span className="absolute bottom-2 right-2 text-sm font-bold text-muted-foreground/40">
                                        {empsInBox.length || ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Legend / Info */}
            <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Employee placement is based on appraisal records.
                    Employees without performance data are placed in the "Core Performer" box by default.
                    Hover over avatars to see individual scores.
                </p>
            </div>
        </div>
    );
};
