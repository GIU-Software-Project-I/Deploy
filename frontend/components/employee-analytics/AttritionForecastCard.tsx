'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface MonthlyProjection {
    month: string;
    predicted: number;
    confidence: number;
}

interface AttritionForecast {
    currentRate: number;
    predictedRate: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    predictedVacancies: number;
    riskFactors: string[];
    monthlyProjections: MonthlyProjection[];
}

interface AttritionForecastCardProps {
    data: AttritionForecast | null;
    loading?: boolean;
}

export function AttritionForecastCard({ data, loading }: AttritionForecastCardProps) {
    if (loading) {
        return (
            <Card className="col-span-full">
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-72 mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-primary" />
                        Attrition Forecast
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        No forecast data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'bg-red-500/10 text-red-600 border-red-200';
            case 'HIGH': return 'bg-orange-500/10 text-orange-600 border-orange-200';
            case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
            default: return 'bg-green-500/10 text-green-600 border-green-200';
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'increasing': return <TrendingDown className="h-4 w-4 text-red-500 rotate-180" />;
            case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
            default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-primary" />
                            Attrition Forecast & Risk Analysis
                        </CardTitle>
                        <CardDescription>
                            Predictive analytics for workforce attrition and vacancy planning
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={getRiskColor(data.riskLevel)}>
                        {data.riskLevel} RISK
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Key Metrics */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg border p-4 text-center">
                                <div className="text-3xl font-bold text-slate-900">{data.currentRate}%</div>
                                <div className="text-xs text-muted-foreground mt-1">Current Rate</div>
                            </div>
                            <div className="rounded-lg border p-4 text-center">
                                <div className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-1">
                                    {data.predictedRate}%
                                    {getTrendIcon(data.trend)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Predicted</div>
                            </div>
                        </div>
                        
                        <div className="rounded-lg bg-slate-50 p-4">
                            <div className="text-sm font-medium text-slate-700 mb-2">Predicted Vacancies</div>
                            <div className="text-4xl font-black text-slate-900">{data.predictedVacancies}</div>
                            <div className="text-xs text-muted-foreground">Before year end</div>
                        </div>

                        {data.riskFactors.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    Risk Factors
                                </div>
                                <ul className="space-y-1">
                                    {data.riskFactors.slice(0, 4).map((factor, i) => (
                                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                                            {factor}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Chart */}
                    <div className="lg:col-span-2">
                        <div className="text-sm font-medium text-slate-700 mb-4">6-Month Projection</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={data.monthlyProjections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="attritionGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                    }}
                                    formatter={(value: number | undefined) => [`${value ?? 0} predicted departures`, 'Forecast']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="predicted"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    fill="url(#attritionGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
