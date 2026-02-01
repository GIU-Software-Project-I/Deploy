'use client';

import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

interface Skill {
    name: string;
    level: number;
}

interface SkillRadarProps {
    skills: Skill[];
}

export function SkillRadar({ skills }: SkillRadarProps) {
    if (!skills || skills.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                No skill data available
            </div>
        );
    }

    return (
        <div className="h-[400px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skills}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                    <Radar
                        name="Skill Level"
                        dataKey="level"
                        stroke="#2563eb"
                        fill="#3b82f6"
                        fillOpacity={0.5}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        itemStyle={{ color: '#1e293b' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
