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
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

interface TenureBucket {
    range: string;
    count: number;
    percentage: number;
}

interface TenureDistributionChartProps {
    data: TenureBucket[];
    avgTenure?: number;
    loading?: boolean;
}

const COLORS = ['#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

export function TenureDistributionChart({ data, avgTenure, loading }: TenureDistributionChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-60 mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[250px] w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Tenure Distribution
                        </CardTitle>
                        <CardDescription>Employee distribution by years of service</CardDescription>
                    </div>
                    {avgTenure !== undefined && (
                        <div className="text-right">
                            <div className="text-2xl font-bold">{avgTenure.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Avg Years</div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                        No tenure data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="range"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                                angle={-15}
                                textAnchor="end"
                                height={50}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                }}
                                formatter={(value: number | undefined) => [
                                    `${value ?? 0} employees (${data.find(d => d.count === value)?.percentage || 0}%)`,
                                    'Count'
                                ]}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
