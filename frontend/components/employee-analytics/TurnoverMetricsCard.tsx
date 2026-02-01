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
import { TurnoverMetrics } from '@/app/services/employee-analytics';
import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

interface TurnoverMetricsCardProps {
    data: TurnoverMetrics | null;
    loading?: boolean;
}

export function TurnoverMetricsCard({ data, loading }: TurnoverMetricsCardProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Turnover Analytics</CardTitle>
                    <CardDescription>Employee turnover rates and trends</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[300px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Turnover Analytics</CardTitle>
                    <CardDescription>Employee turnover rates and trends</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[300px] flex-col items-center justify-center text-center">
                        <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                            Turnover data is being calculated.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getTurnoverColor = (rate: number): string => {
        if (rate <= 5) return '#22c55e'; // green - healthy
        if (rate <= 10) return '#f59e0b'; // amber - moderate
        if (rate <= 15) return '#f97316'; // orange - elevated
        return '#ef4444'; // red - high
    };

    const getTurnoverLevel = (rate: number): string => {
        if (rate <= 5) return 'Healthy';
        if (rate <= 10) return 'Moderate';
        if (rate <= 15) return 'Elevated';
        return 'High';
    };

    const tenureBandData = data.byTenureBand.map((item) => ({
        name: item.band,
        rate: item.rate,
        fill: getTurnoverColor(item.rate),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Turnover Analytics</span>
                    <span
                        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                        style={{
                            backgroundColor: `${getTurnoverColor(data.overallTurnoverRate)}20`,
                            color: getTurnoverColor(data.overallTurnoverRate),
                        }}
                    >
                        {data.overallTurnoverRate > 10 ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        {getTurnoverLevel(data.overallTurnoverRate)}
                    </span>
                </CardTitle>
                <CardDescription>
                    12-month rolling turnover analysis
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Overall metrics */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="text-2xl font-bold" style={{ color: getTurnoverColor(data.overallTurnoverRate) }}>
                                {data.overallTurnoverRate}%
                            </p>
                            <p className="text-xs text-muted-foreground">Overall Rate</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="text-2xl font-bold text-amber-600">
                                {data.voluntaryTurnoverRate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Voluntary</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">
                                {data.involuntaryTurnoverRate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Involuntary</p>
                        </div>
                    </div>

                    {/* Turnover by Tenure */}
                    <div>
                        <h4 className="mb-3 text-sm font-medium">Turnover by Tenure</h4>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={tenureBandData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                                    <XAxis
                                        type="number"
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tickFormatter={(value) => `${value}%`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={70}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <Tooltip
                                        formatter={(value) => [`${value}%`, 'Turnover Rate']}
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    />
                                    <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={25}>
                                        {tenureBandData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Departments by Turnover */}
                    {data.byDepartment.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-medium">Highest Turnover Departments</h4>
                            <div className="space-y-2">
                                {data.byDepartment.slice(0, 3).map((dept, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{dept.departmentName}</span>
                                        <span
                                            className="font-medium"
                                            style={{ color: getTurnoverColor(dept.rate) }}
                                        >
                                            {dept.rate}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
