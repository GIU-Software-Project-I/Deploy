'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    Users,
    UserCheck,
    TrendingUp,
    ClipboardList,
    Building2,
    Activity,
} from 'lucide-react';

interface KPIData {
    totalHeadcount: number;
    activeEmployees: number;
    avgPerformanceScore: number;
    pendingChangeRequests: number;
    genderDiversityIndex: number;
    departmentsCount: number;
}

interface WorkforceKPICardsProps {
    data: KPIData | null;
    loading?: boolean;
}

export function WorkforceKPICards({ data, loading }: WorkforceKPICardsProps) {
    const kpis = [
        {
            title: 'Total Headcount',
            value: data?.totalHeadcount ?? 0,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            format: 'number',
        },
        {
            title: 'Active Employees',
            value: data?.activeEmployees ?? 0,
            icon: UserCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            format: 'number',
        },
        {
            title: 'Avg. Performance',
            value: data?.avgPerformanceScore ?? 0,
            icon: TrendingUp,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            format: 'score',
        },
        {
            title: 'Pending Requests',
            value: data?.pendingChangeRequests ?? 0,
            icon: ClipboardList,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            format: 'number',
        },
        {
            title: 'Departments',
            value: data?.departmentsCount ?? 0,
            icon: Building2,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-50',
            format: 'number',
        },
        {
            title: 'Diversity Index',
            value: data?.genderDiversityIndex ?? 0,
            icon: Activity,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50',
            format: 'percentage',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi, index) => (
                <KPICard
                    key={index}
                    title={kpi.title}
                    value={kpi.value}
                    icon={kpi.icon}
                    color={kpi.color}
                    bgColor={kpi.bgColor}
                    format={kpi.format as 'number' | 'score' | 'percentage'}
                    loading={loading}
                />
            ))}
        </div>
    );
}

interface KPICardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    format: 'number' | 'score' | 'percentage';
    loading?: boolean;
}

function KPICard({ title, value, icon: Icon, color, bgColor, format, loading }: KPICardProps) {
    const formatValue = (val: number, fmt: string): string => {
        switch (fmt) {
            case 'score':
                return val.toFixed(1);
            case 'percentage':
                return `${(val * 100).toFixed(0)}%`;
            default:
                return val.toLocaleString();
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn('rounded-lg p-2', bgColor)}>
                    <Icon className={cn('h-4 w-4', color)} />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="h-8 w-20 animate-pulse rounded bg-muted"></div>
                ) : (
                    <div className="text-2xl font-bold">{formatValue(value, format)}</div>
                )}
            </CardContent>
        </Card>
    );
}
