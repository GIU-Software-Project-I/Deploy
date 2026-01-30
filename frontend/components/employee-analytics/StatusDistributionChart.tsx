'use client';

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusDistribution } from '@/app/services/employee-analytics';

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#22c55e',      // green-500
    ON_LEAVE: '#f59e0b',    // amber-500
    PROBATION: '#3b82f6',   // blue-500
    SUSPENDED: '#ef4444',   // red-500
    TERMINATED: '#6b7280',  // gray-500
    RETIRED: '#8b5cf6',     // violet-500
    RESIGNED: '#f97316',    // orange-500
    DEFAULT: '#94a3b8',     // slate-400
};

interface StatusDistributionChartProps {
    data: StatusDistribution[];
    loading?: boolean;
}

export function StatusDistributionChart({ data, loading }: StatusDistributionChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Employee Status Distribution</CardTitle>
                    <CardDescription>Breakdown by employment status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[300px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Employee Status Distribution</CardTitle>
                    <CardDescription>Breakdown by employment status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                        No status data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartData = data.map((item) => ({
        name: formatStatusLabel(item.status),
        value: item.count,
        percentage: item.percentage,
        fill: STATUS_COLORS[item.status] || STATUS_COLORS.DEFAULT,
    }));

    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Employee Status Distribution</CardTitle>
                <CardDescription>
                    Total: {total.toLocaleString()} employees
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, payload }) => `${name}: ${payload?.percentage ?? 0}%`}
                                labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => [
                                    `${Number(value).toLocaleString()} employees`,
                                    name,
                                ]}
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => (
                                    <span className="text-sm text-foreground">{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function formatStatusLabel(status: string): string {
    return status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
