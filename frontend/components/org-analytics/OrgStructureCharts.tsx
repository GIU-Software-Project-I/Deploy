'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TenureBracket {
    range: string;
    count: number;
}

interface SpanDistribution {
    range: string;
    count: number;
}

interface TenureDistributionChartProps {
    data: TenureBracket[];
}

interface SpanOfControlChartProps {
    data: SpanDistribution[];
    average: number;
}

interface DepartmentFillRateChartProps {
    data: Array<{
        departmentName: string;
        fillRate: number;
        filledPositions: number;
        vacantPositions: number;
    }>;
}

interface CostCenterDistributionChartProps {
    data: Array<{
        costCenter: string;
        positionCount: number;
        estimatedHeadcount: number;
        utilizationRate: number;
    }>;
}

const COLORS = ['#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316'];

export function OrgTenureDistributionChart({ data }: TenureDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tenure Distribution</CardTitle>
                    <CardDescription>Employee tenure breakdown by years of service</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                        No tenure data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tenure Distribution</CardTitle>
                <CardDescription>Employee tenure breakdown by years of service</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="range"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            }}
                            formatter={(value?: number) => [`${value ?? 0} employees`, 'Count']}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export function SpanOfControlChart({ data, average }: SpanOfControlChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Span of Control Distribution</CardTitle>
                    <CardDescription>Direct reports per manager</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                        No span of control data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Span of Control</CardTitle>
                        <CardDescription>Distribution of direct reports per manager</CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">{average}</div>
                        <div className="text-xs text-muted-foreground">Avg Reports</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="range"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                            }}
                            formatter={(value?: number) => [`${value ?? 0} managers`, 'Count']}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export function DepartmentFillRateChart({ data }: DepartmentFillRateChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Department Fill Rates</CardTitle>
                    <CardDescription>Position fill rate by department</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                        No department data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartData = data.slice(0, 10).map(d => ({
        name: d.departmentName.length > 15 ? d.departmentName.slice(0, 15) + '...' : d.departmentName,
        fillRate: d.fillRate,
        filled: d.filledPositions,
        vacant: d.vacantPositions,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Department Fill Rates</CardTitle>
                <CardDescription>Top 10 departments by position fill rate</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                            width={80}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                            }}
                            formatter={(value?: number, _name?: string, props?: any) => {
                                const entry = props?.payload;
                                return [`${value ?? 0}% (${entry?.filled ?? 0} filled, ${entry?.vacant ?? 0} vacant)`, 'Fill Rate'];
                            }}
                        />
                        <Bar dataKey="fillRate" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fillRate >= 80 ? '#10b981' : entry.fillRate >= 60 ? '#eab308' : '#ef4444'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export function CostCenterPieChart({ data }: CostCenterDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cost Center Distribution</CardTitle>
                    <CardDescription>Headcount allocation by cost center</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                        No cost center data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const pieData = data.slice(0, 8).map((cc, idx) => ({
        name: cc.costCenter,
        value: cc.estimatedHeadcount,
        positions: cc.positionCount,
        utilization: cc.utilizationRate,
        fill: PIE_COLORS[idx % PIE_COLORS.length],
    }));

    const totalHeadcount = pieData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Cost Center Distribution</CardTitle>
                        <CardDescription>Headcount allocation across cost centers</CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">{totalHeadcount}</div>
                        <div className="text-xs text-muted-foreground">Total Headcount</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                            labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                            }}
                            formatter={(value?: number, _name?: string, props?: any) => {
                                const entry = props?.payload;
                                return [`${value ?? 0} employees (${entry?.utilization ?? 0}% utilization)`, entry?.name ?? ''];
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export function CostCenterUtilizationChart({ data }: CostCenterDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cost Center Utilization</CardTitle>
                    <CardDescription>Utilization rate by cost center</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                        No cost center data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartData = data.slice(0, 10).map(cc => ({
        name: cc.costCenter,
        utilization: cc.utilizationRate,
        headcount: cc.estimatedHeadcount,
        positions: cc.positionCount,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cost Center Utilization</CardTitle>
                <CardDescription>Position utilization rate by cost center</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                            width={60}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                            }}
                            formatter={(value?: number, _name?: string, props?: any) => {
                                const entry = props?.payload;
                                return [`${value ?? 0}% (${entry?.headcount ?? 0}/${entry?.positions ?? 0} filled)`, 'Utilization'];
                            }}
                        />
                        <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.utilization >= 80 ? '#10b981' : entry.utilization >= 60 ? '#eab308' : '#ef4444'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
