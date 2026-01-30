'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProfileAnalyticsService, ProfileHealth } from '@/app/services/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, TrendingUp, Award, Zap, AlertTriangle } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

export default function MyCareerPage() {
    const { user } = useAuth();
    const [health, setHealth] = useState<ProfileHealth | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            ProfileAnalyticsService.getProfileHealth(user.id)
                .then((data) => {
                    if (data) setHealth(data);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [user]);

    // Mock Data for Visualizations (since seed data is just being established)
    const timelineData = [
        { year: '2023', role: 'Junior Associate', level: 1 },
        { year: '2024', role: 'Associate', level: 2 },
        { year: '2025', role: 'Senior Associate (Current)', level: 3 },
        { year: '2026', role: 'Team Lead (Projected)', level: 4, projected: true },
        { year: '2027', role: 'Manager (Goal)', level: 5, projected: true },
    ];

    const skillsData = [
        { subject: 'Technical', A: 120, B: 110, fullMark: 150 },
        { subject: 'Leadership', A: 98, B: 130, fullMark: 150 },
        { subject: 'Communication', A: 86, B: 130, fullMark: 150 },
        { subject: 'Strategy', A: 99, B: 100, fullMark: 150 },
        { subject: 'Delivery', A: 85, B: 90, fullMark: 150 },
        { subject: 'Innovation', A: 65, B: 85, fullMark: 150 },
    ];

    return (
        <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">My Career & Growth</h1>
                    <p className="text-muted-foreground mt-2">Visualize your journey, track skills, and optimize your profile.</p>
                </div>
                <Button>
                    Download Career Report
                </Button>
            </div>

            {/* Profile Health Widget */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-l-4 border-l-primary shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Zap className="h-5 w-5 text-primary" />
                            Profile Strength
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Completeness of your talent profile</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-foreground">{health?.completenessScore || 0}%</span>
                                <span className="text-sm text-muted-foreground">Gold Standard</span>
                            </div>
                            <Progress value={health?.completenessScore || 0} className="h-2" />

                            {health?.missingCriticalFields?.length ? (
                                <div className="space-y-2 mt-4">
                                    <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4" /> Action Items:
                                    </p>
                                    <ul className="text-sm text-muted-foreground space-y-1 pl-1">
                                        {health.missingCriticalFields.map((field) => (
                                            <li key={field} className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                Add {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-green-600 text-sm font-medium mt-4">
                                    <CheckCircle className="h-4 w-4" />
                                    Profile is optimized!
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Career Trajectory */}
                <Card className="col-span-1 lg:col-span-2 shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Career Trajectory
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Your role progression and future milestones</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                                <YAxis hide domain={[0, 6]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Line
                                    type="stepAfter"
                                    dataKey="level"
                                    stroke="var(--primary)"
                                    strokeWidth={3}
                                    dot={{ r: 6, strokeWidth: 2, fill: 'var(--background)' }}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Skills Radar & Development */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Award className="h-5 w-5 text-primary" />
                            Competency Radar
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Your skills vs. role expectations</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart outerRadius={90} data={skillsData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} hide />
                                <Radar
                                    name="My Skills"
                                    dataKey="A"
                                    stroke="var(--primary)"
                                    fill="var(--primary)"
                                    fillOpacity={0.4}
                                />
                                <Radar
                                    name="Role Standard"
                                    dataKey="B"
                                    stroke="var(--muted-foreground)"
                                    fill="var(--muted-foreground)"
                                    fillOpacity={0.1}
                                />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-foreground">Recommended Actions</CardTitle>
                        <CardDescription className="text-muted-foreground">Steps to reach your next career milestone</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Alert className="bg-primary/5 border-primary/20">
                                <Zap className="h-4 w-4 text-primary" />
                                <AlertTitle className="text-primary font-bold">New Certification Available</AlertTitle>
                                <AlertDescription className="text-muted-foreground">
                                    Based on your goal "Manager", we recommend the <strong>Advanced Leadership Certification</strong>.
                                    <div className="mt-2">
                                        <Button size="sm" variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">View Course</Button>
                                    </div>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-foreground">Open Opportunities</h4>
                                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-accent transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">TL</div>
                                        <div>
                                            <p className="font-medium text-foreground group-hover:text-primary">Team Lead, Engineering</p>
                                            <p className="text-xs text-muted-foreground">Internal Posting • 2 days ago</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-accent transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">PM</div>
                                        <div>
                                            <p className="font-medium text-foreground group-hover:text-primary">Product Manager (Rotation)</p>
                                            <p className="text-xs text-muted-foreground">Internal Posting • 1 week ago</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
