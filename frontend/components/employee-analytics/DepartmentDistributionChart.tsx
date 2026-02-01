'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DepartmentDistribution } from '@/app/services/employee-analytics';

// Color palette for departments
const DEPARTMENT_COLORS = [
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#14b8a6', // teal-500
    '#6366f1', // indigo-500
    '#84cc16', // lime-500
];

interface DepartmentDistributionChartProps {
    data: DepartmentDistribution[];
    loading?: boolean;
}

export function DepartmentDistributionChart({ data, loading }: DepartmentDistributionChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Employees by Department</CardTitle>
                    <CardDescription>Distribution across organizational units</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center">
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
                    <CardTitle>Employees by Department</CardTitle>
                    <CardDescription>Distribution across organizational units</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        No department data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Sort by count descending and take top 10
    const chartData = [...data]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item) => ({
            name: truncateLabel(item.departmentName, 20),
            fullName: item.departmentName,
            count: item.count,
            percentage: item.percentage,
        }));

    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Employees by Department</CardTitle>
                <CardDescription>
                    {data.length} departments • {total.toLocaleString()} total employees
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                            <XAxis
                                type="number"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={120}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <Tooltip
                                formatter={(value) => [
                                    `${Number(value).toLocaleString()} employees`,
                                    'Count',
                                ]}
                                labelFormatter={(label, payload) =>
                                    payload?.[0]?.payload?.fullName || label
                                }
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                            />
                            <Bar
                                dataKey="count"
                                radius={[0, 4, 4, 0]}
                                maxBarSize={30}
                            >
                                {chartData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function truncateLabel(label: string, maxLength: number): string {
    if (label.length <= maxLength) return label;
    return `${label.substring(0, maxLength - 3)}...`;
}
