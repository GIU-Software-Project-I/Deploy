'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
    Controls,
    Background,
    Node,
    Edge,
    ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { EmployeeNode, transformToOrgChart } from '@/app/services/analytics/structureAnalytics';

interface OrgChartVisualizerProps {
    employees: EmployeeNode[];
}

export function OrgChartVisualizer({ employees }: OrgChartVisualizerProps) {

    // Transform data on prop change
    const { nodes, edges } = useMemo(() => transformToOrgChart(employees), [employees]);

    // Default Viewport
    const defaultViewport = { x: 0, y: 0, zoom: 0.8 };

    return (
        <div className="h-[600px] w-full border border-slate-200 bg-slate-50 relative">
            <div className="absolute top-4 left-4 z-10 bg-white/80 p-2 border border-slate-200 backdrop-blur-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Structure Visualization</h3>
                <p className="text-[10px] text-slate-500">{employees.length} Positions Rendered</p>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                attributionPosition="bottom-right"
                connectionLineType={ConnectionLineType.SmoothStep}
            >
                <Background color="#cbd5e1" gap={20} size={1} />
                <Controls showInteractive={false} className="bg-white border border-slate-200" />
            </ReactFlow>
        </div>
    );
}
