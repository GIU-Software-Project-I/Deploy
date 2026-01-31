'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SkillData } from '@/app/services/employee-analytics';

interface SkillsDistributionChartProps {
    data: SkillData[];
    loading?: boolean;
    title?: string;
    description?: string;
}

const LEVEL_COLORS = {
    excellent: '#22c55e', // green-500
    good: '#3b82f6',      // blue-500
    average: '#f59e0b',   // amber-500
    developing: '#ef4444', // red-500
};

function getLevelColor(level: number): string {
    if (level >= 4) return LEVEL_COLORS.excellent;
    if (level >= 3) return LEVEL_COLORS.good;
    if (level >= 2) return LEVEL_COLORS.average;
    return LEVEL_COLORS.developing;
}

function getLevelLabel(level: number): string {
    if (level >= 4) return 'Expert';
    if (level >= 3) return 'Proficient';
    if (level >= 2) return 'Competent';
    return 'Developing';
}

export function SkillsDistributionChart({ data, loading, title = 'Skills Distribution', description = 'Top skills by employee count' }: SkillsDistributionChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No skills data available</p>
                </CardContent>
            </Card>
        );
    }

    // Take top 10 skills
    const chartData = data.slice(0, 10).map(skill => ({
        name: skill.skill,
        employees: skill.employeeCount,
        avgLevel: skill.avgLevel,
        category: skill.category,
        verified: skill.verifiedPercentage,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={75}
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                        <div className="bg-background border rounded-lg shadow-lg p-3">
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">{item.category}</p>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm">Employees: <span className="font-medium">{item.employees}</span></p>
                                                <p className="text-sm">Avg Level: <span className="font-medium">{item.avgLevel}/5</span></p>
                                                <p className="text-sm">Verified: <span className="font-medium">{item.verified}%</span></p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="employees" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getLevelColor(entry.avgLevel)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t">
                    {Object.entries(LEVEL_COLORS).map(([label, color]) => (
                        <div key={label} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs text-muted-foreground capitalize">{label}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
