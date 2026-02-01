'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { SkillData } from '@/app/services/employee-analytics';

interface SkillGapsCardProps {
    data: SkillData[];
    loading?: boolean;
}

export function SkillGapsCard({ data, loading }: SkillGapsCardProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Skill Gaps
                    </CardTitle>
                    <CardDescription>Areas needing development</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48">
                    <div className="text-center">
                        <TrendingDown className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="text-muted-foreground">No significant skill gaps detected</p>
                        <p className="text-xs text-muted-foreground mt-1">All skills have adequate proficiency levels</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Skill Gaps
                </CardTitle>
                <CardDescription>Skills with average proficiency below 3.0 (needs development)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {data.slice(0, 8).map((skill, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{skill.skill}</span>
                                    <Badge variant="outline" className="text-xs">{skill.category}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {skill.employeeCount} employees • {skill.verifiedPercentage}% verified
                                </p>
                            </div>
                            <div className="text-right">
                                <div className={`text-lg font-bold ${
                                    skill.avgLevel < 2 ? 'text-red-600' : 'text-amber-600'
                                }`}>
                                    {skill.avgLevel.toFixed(1)}
                                </div>
                                <p className="text-xs text-muted-foreground">avg level</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
