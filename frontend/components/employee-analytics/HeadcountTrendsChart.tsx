'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    ComposedChart,
    Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HeadcountTrend } from '@/app/services/employee-analytics';

interface HeadcountTrendsChartProps {
    data: HeadcountTrend[];
    loading?: boolean;
}

export function HeadcountTrendsChart({ data, loading }: HeadcountTrendsChartProps) {
    if (loading) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Headcount Trends</CardTitle>
                    <CardDescription>Monthly workforce changes over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // If no data, show placeholder with message about backend implementation
    if (!data || data.length === 0) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Headcount Trends</CardTitle>
                    <CardDescription>Monthly workforce changes over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] flex-col items-center justify-center text-center">
                        <svg
                            className="mb-4 h-16 w-16 text-muted-foreground/50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                            />
                        </svg>
                        <p className="text-sm text-muted-foreground">
                            Historical headcount tracking is being configured.
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                            Data will appear after the trends endpoint is enabled.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartData = data.map((item) => ({
        ...item,
        month: formatMonth(item.month),
    }));

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Headcount Trends</CardTitle>
                <CardDescription>
                    Tracking hires, terminations, and net workforce changes
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="month"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                yAxisId="left"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                            />
                            <Legend />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="totalHeadcount"
                                name="Total Headcount"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Bar
                                yAxisId="right"
                                dataKey="newHires"
                                name="New Hires"
                                fill="#22c55e"
                                opacity={0.8}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={20}
                            />
                            <Bar
                                yAxisId="right"
                                dataKey="terminations"
                                name="Terminations"
                                fill="#ef4444"
                                opacity={0.8}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={20}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function formatMonth(monthStr: string): string {
    try {
        const date = new Date(monthStr);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch {
        return monthStr;
    }
}
