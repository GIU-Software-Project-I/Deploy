'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SkillsComparisonResponse } from '@/app/services/employee-analytics';

interface SkillsComparisonChartProps {
    data: SkillsComparisonResponse | null;
    dept1Name: string;
    dept2Name: string;
    loading?: boolean;
}

export function SkillsComparisonChart({ data, dept1Name, dept2Name, loading }: SkillsComparisonChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-80 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.comparison.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Skills Comparison</CardTitle>
                    <CardDescription>Compare skills between departments</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Select two departments to compare</p>
                </CardContent>
            </Card>
        );
    }

    // Take top 10 skills by difference
    const chartData = data.comparison.slice(0, 10).map(item => ({
        skill: item.skill,
        [dept1Name]: item.dept1AvgLevel,
        [dept2Name]: item.dept2AvgLevel,
        difference: item.difference,
    }));

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Skills Comparison</CardTitle>
                        <CardDescription>{dept1Name} vs {dept2Name}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline">
                            Common: {data.commonSkills}
                        </Badge>
                        <Badge variant="secondary">
                            {dept1Name} unique: {data.dept1UniqueSkills}
                        </Badge>
                        <Badge variant="secondary">
                            {dept2Name} unique: {data.dept2UniqueSkills}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 5]} />
                        <YAxis 
                            dataKey="skill" 
                            type="category" 
                            width={95}
                            tick={{ fontSize: 11 }}
                        />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                        <div className="bg-background border rounded-lg shadow-lg p-3">
                                            <p className="font-semibold mb-2">{item.skill}</p>
                                            <div className="space-y-1">
                                                <p className="text-sm flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                                                    {dept1Name}: <span className="font-medium">{item[dept1Name]?.toFixed(1) || 0}</span>
                                                </p>
                                                <p className="text-sm flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                                    {dept2Name}: <span className="font-medium">{item[dept2Name]?.toFixed(1) || 0}</span>
                                                </p>
                                                <p className={`text-sm font-medium ${item.difference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                    Difference: {item.difference > 0 ? '+' : ''}{item.difference.toFixed(1)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend />
                        <Bar dataKey={dept1Name} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        <Bar dataKey={dept2Name} fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
