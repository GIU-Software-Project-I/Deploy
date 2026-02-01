'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, CheckCircle, AlertCircle, Target, TrendingUp } from 'lucide-react';
import { SkillsAnalyticsSummary } from '@/app/services/employee-analytics';

interface SkillsOverviewCardProps {
    data: SkillsAnalyticsSummary | null;
    loading?: boolean;
}

export function SkillsOverviewCard({ data, loading }: SkillsOverviewCardProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-48">
                    <p className="text-muted-foreground">No skills data available</p>
                </CardContent>
            </Card>
        );
    }

    const metrics = [
        {
            label: 'Skills Coverage',
            value: `${data.skillsCoverage}%`,
            icon: Target,
            color: data.skillsCoverage > 70 ? 'text-green-600' : data.skillsCoverage > 40 ? 'text-amber-600' : 'text-red-600',
            progress: data.skillsCoverage,
        },
        {
            label: 'Employees with Skills',
            value: data.totalEmployeesWithSkills,
            subValue: `of ${data.totalEmployees}`,
            icon: Users,
            color: 'text-blue-600',
        },
        {
            label: 'Unique Skills',
            value: data.uniqueSkillsCount,
            icon: Brain,
            color: 'text-purple-600',
        },
        {
            label: 'Skill Categories',
            value: data.categoriesCount,
            icon: CheckCircle,
            color: 'text-emerald-600',
        },
        {
            label: 'Avg Skills/Employee',
            value: data.avgSkillsPerEmployee,
            icon: TrendingUp,
            color: 'text-indigo-600',
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Skills Overview
                </CardTitle>
                <CardDescription>Organization-wide skills metrics and coverage</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {metrics.map((metric, index) => (
                        <div key={index} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                            <div className="flex items-center gap-2 mb-2">
                                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                                <span className="text-xs text-muted-foreground font-medium">{metric.label}</span>
                            </div>
                            <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
                            {metric.subValue && (
                                <span className="text-xs text-muted-foreground">{metric.subValue}</span>
                            )}
                            {metric.progress !== undefined && (
                                <Progress value={metric.progress} className="mt-2 h-1" />
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
