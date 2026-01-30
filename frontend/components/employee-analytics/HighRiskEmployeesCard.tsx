'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingDown, Clock, UserMinus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AtRiskEmployee {
    id: string;
    name: string;
    department: string;
    position: string;
    riskScore: number;
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    factors: string[];
    tenureMonths: number;
}

interface HighRiskEmployeesCardProps {
    data: AtRiskEmployee[];
    loading?: boolean;
}

export function HighRiskEmployeesCard({ data, loading }: HighRiskEmployeesCardProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'HIGH': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'MEDIUM': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        }
    };

    const getRiskBarColor = (score: number) => {
        if (score >= 70) return 'bg-red-500';
        if (score >= 40) return 'bg-amber-500';
        return 'bg-green-500';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserMinus className="h-5 w-5 text-red-500" />
                    High Attrition Risk Employees
                </CardTitle>
                <CardDescription>
                    Employees with elevated turnover risk based on behavioral signals
                </CardDescription>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="rounded-full bg-green-100 p-3 mb-3">
                            <TrendingDown className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">No High-Risk Employees</p>
                        <p className="text-xs text-muted-foreground mt-1">All employees show stable retention signals</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.slice(0, 5).map((employee) => (
                            <div
                                key={employee.id}
                                className="rounded-lg border p-4 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                                            {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">{employee.name}</h4>
                                            <p className="text-xs text-muted-foreground">{employee.position} • {employee.department}</p>
                                        </div>
                                    </div>
                                    <Badge className={getRiskColor(employee.riskLevel)} variant="outline">
                                        {employee.riskScore}% Risk
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getRiskBarColor(employee.riskScore)} transition-all`}
                                            style={{ width: `${employee.riskScore}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {Math.floor(employee.tenureMonths / 12)}y {employee.tenureMonths % 12}m tenure
                                        </div>
                                        <div className="flex gap-1 flex-wrap justify-end">
                                            {employee.factors.slice(0, 2).map((factor, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                                                    {factor}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {data.length > 5 && (
                            <p className="text-xs text-center text-muted-foreground pt-2">
                                +{data.length - 5} more employees with elevated risk
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
