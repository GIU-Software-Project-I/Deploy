'use client';

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface GenderData {
    gender: string;
    count: number;
    percentage: number;
}

interface GenderDiversityChartProps {
    data: GenderData[];
    diversityIndex?: number;
    loading?: boolean;
}

const GENDER_COLORS: Record<string, string> = {
    Male: '#3b82f6',    // blue-500
    Female: '#ec4899',  // pink-500
    Other: '#8b5cf6',   // violet-500
    Unknown: '#94a3b8', // slate-400
    male: '#3b82f6',
    female: '#ec4899',
    other: '#8b5cf6',
    MALE: '#3b82f6',
    FEMALE: '#ec4899',
    OTHER: '#8b5cf6',
    NOT_SPECIFIED: '#94a3b8',
    M: '#3b82f6',
    F: '#ec4899',
};

export function GenderDiversityChart({ data, diversityIndex, loading }: GenderDiversityChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Gender Diversity</CardTitle>
                    <CardDescription>Workforce gender composition</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[250px] items-center justify-center">
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
                    <CardTitle>Gender Diversity</CardTitle>
                    <CardDescription>Workforce gender composition</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                        No gender data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartData = data.map((item) => ({
        name: formatGenderLabel(item.gender),
        value: item.count,
        percentage: item.percentage,
        fill: GENDER_COLORS[item.gender] || GENDER_COLORS.Unknown,
    }));

    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Gender Diversity</span>
                    {diversityIndex !== undefined && (
                        <span className="text-sm font-normal text-muted-foreground">
                            Index: {(diversityIndex * 100).toFixed(0)}%
                        </span>
                    )}
                </CardTitle>
                <CardDescription>
                    Total: {total.toLocaleString()} employees
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-[200px] items-center">
                    <div className="w-1/2">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [
                                        `${Number(value).toLocaleString()} (${chartData.find(d => d.name === name)?.percentage}%)`,
                                        name,
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-3 pl-4">
                        {chartData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: item.fill }}
                                    />
                                    <span className="text-sm">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-medium">{item.value.toLocaleString()}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        ({item.percentage}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function formatGenderLabel(gender: string): string {
    const labels: Record<string, string> = {
        M: 'Male',
        F: 'Female',
        male: 'Male',
        female: 'Female',
        Male: 'Male',
        Female: 'Female',
        MALE: 'Male',
        FEMALE: 'Female',
        other: 'Other',
        Other: 'Other',
        OTHER: 'Other',
        NOT_SPECIFIED: 'Not Specified',
        Unknown: 'Unknown',
    };
    return labels[gender] || gender || 'Unknown';
}
