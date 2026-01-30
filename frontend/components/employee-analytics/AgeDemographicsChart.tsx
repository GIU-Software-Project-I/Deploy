'use client';

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

interface AgeBucket {
    range: string;
    count: number;
    percentage: number;
}

interface AgeDemographicsChartProps {
    data: AgeBucket[];
    avgAge?: number;
    loading?: boolean;
}

const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185'];

export function AgeDemographicsChart({ data, avgAge, loading }: AgeDemographicsChartProps) {
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
                            <Users className="h-5 w-5 text-primary" />
                            Age Demographics
                        </CardTitle>
                        <CardDescription>Workforce age group distribution</CardDescription>
                    </div>
                    {avgAge !== undefined && (
                        <div className="text-right">
                            <div className="text-2xl font-bold">{avgAge.toFixed(0)}</div>
                            <div className="text-xs text-muted-foreground">Avg Age</div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                        No age data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={data as any[]}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                dataKey="count"
                                nameKey="range"
                                paddingAngle={2}
                                label={({ payload }) => `${payload?.range || ''}: ${payload?.percentage || 0}%`}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                }}
                                formatter={(value: number | undefined) => [
                                    `${value ?? 0} employees`,
                                    'Count'
                                ]}
                            />
                            <Legend
                                layout="horizontal"
                                align="center"
                                verticalAlign="bottom"
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
