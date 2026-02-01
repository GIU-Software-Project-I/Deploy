'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, Clock, Zap } from 'lucide-react';

interface AttritionRiskProps {
    riskScore: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    factors: string[];
}

export function AttritionRiskCard({ riskScore, level, factors }: AttritionRiskProps) {
    const getLevelColor = (l: string) => {
        switch (l) {
            case 'HIGH': return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'MEDIUM': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'LOW': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <Card className="overflow-hidden border-t-4 border-t-primary">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Attrition Risk Prediction
                    </CardTitle>
                    <Badge className={getLevelColor(level)} variant="outline">
                        {level} RISK
                    </Badge>
                </div>
                <CardDescription>
                    AI-driven prediction based on tenure and performance trends
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mt-4 space-y-4">
                    <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ${level === 'HIGH' ? 'bg-destructive' : level === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                            style={{ width: `${riskScore}%` }}
                        />
                    </div>
                    <p className="text-sm font-medium text-center">{riskScore}% Risk Score</p>

                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Risk Factors</h4>
                        {factors?.length > 0 ? (
                            <ul className="space-y-2">
                                {factors?.map((factor, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                        <span>{factor}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-emerald-600 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                No immediate risk factors detected.
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
