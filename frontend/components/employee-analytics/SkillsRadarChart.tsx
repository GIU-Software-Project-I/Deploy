'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SkillData } from '@/app/services/employee-analytics';

interface SkillsRadarChartProps {
    data: SkillData[];
    loading?: boolean;
    title?: string;
}

export function SkillsRadarChart({ data, loading, title = 'Top Skills Radar' }: SkillsRadarChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>Skill proficiency visualization</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-72">
                    <p className="text-muted-foreground">No skills data available</p>
                </CardContent>
            </Card>
        );
    }

    // Take top 8 skills for radar
    const chartData = data.slice(0, 8).map(skill => ({
        skill: skill.skill.length > 15 ? skill.skill.substring(0, 15) + '...' : skill.skill,
        fullName: skill.skill,
        level: skill.avgLevel,
        employees: skill.employeeCount,
        category: skill.category,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>Skill proficiency levels (scale 1-5)</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} />
                        <Radar 
                            name="Avg Level" 
                            dataKey="level" 
                            stroke="#6366f1" 
                            fill="#6366f1" 
                            fillOpacity={0.5}
                        />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                        <div className="bg-background border rounded-lg shadow-lg p-3">
                                            <p className="font-semibold">{item.fullName}</p>
                                            <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm">Avg Level: <span className="font-medium">{item.level.toFixed(1)}/5</span></p>
                                                <p className="text-sm">Employees: <span className="font-medium">{item.employees}</span></p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
