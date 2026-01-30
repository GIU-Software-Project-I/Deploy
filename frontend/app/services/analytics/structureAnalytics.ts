import { Node, Edge } from 'reactflow';

export interface OrgChartNodeData {
    label: string;
    role: string;
    department: string;
    imageUrl?: string;
    isVacancy?: boolean;
}

export interface EmployeeNode {
    id: string;
    name: string;
    position: string;
    department: string;
    managerId?: string | null;
    imageUrl?: string;
}

export interface StructureMetrics {
    totalEmployees: number;
    spanOfControl: {
        avg: number;
        min: number;
        max: number;
        median: number;
        // Map of "Number of Reports" -> "Number of Managers"
        distribution: Record<string, number>;
    };
    depth: {
        max: number;
        avg: number;
        distribution: Record<string, number>;
    };
    healthScore: number; // 0-100
    issues: string[];
}

/**
 * Calculate structural metrics from a flat list of employees
 */
export function calculateStructureMetrics(employees: EmployeeNode[]): StructureMetrics {
    if (employees.length === 0) {
        return {
            totalEmployees: 0,
            spanOfControl: { avg: 0, min: 0, max: 0, median: 0, distribution: {} },
            depth: { max: 0, avg: 0, distribution: {} },
            healthScore: 100,
            issues: []
        };
    }

    // 1. Build Adjacency Map (Manager -> Direct Reports)
    const reportsMap = new Map<string, string[]>();
    employees.forEach(e => {
        if (e.managerId) {
            const current = reportsMap.get(e.managerId) || [];
            current.push(e.id);
            reportsMap.set(e.managerId, current);
        }
    });

    // 2. Span of Control Analysis
    const spans: number[] = [];
    for (const count of reportsMap.values()) {
        spans.push(count.length);
    }

    const validSpans = spans.length > 0 ? spans : [0];

    const minSpan = Math.min(...validSpans);
    const maxSpan = Math.max(...validSpans);
    const totalSpan = validSpans.reduce((a, b) => a + b, 0);
    const avgSpan = totalSpan / validSpans.length;

    // Median
    const sortedSpans = [...validSpans].sort((a, b) => a - b);
    const mid = Math.floor(sortedSpans.length / 2);
    const medianSpan = sortedSpans.length % 2 !== 0 ? sortedSpans[mid] : (sortedSpans[mid - 1] + sortedSpans[mid]) / 2;

    const spanDistribution: Record<string, number> = {};
    validSpans.forEach(s => {
        const key = s.toString();
        spanDistribution[key] = (spanDistribution[key] || 0) + 1;
    });

    // 3. Depth Analysis
    const depthMap = new Map<string, number>();
    const empIds = new Set(employees.map(e => e.id));
    const roots = employees.filter(e => !e.managerId || !empIds.has(e.managerId));

    const depths: number[] = [];
    const queue: { id: string, d: number }[] = roots.map(r => ({ id: r.id, d: 1 }));
    const visited = new Set<string>();

    let maxDepth = 0;
    let totalDepth = 0;
    let depthCount = 0;

    roots.forEach(r => { visited.add(r.id); });

    while (queue.length > 0) {
        const { id, d } = queue.shift()!;
        depthMap.set(id, d);
        depths.push(d);
        if (d > maxDepth) maxDepth = d;
        totalDepth += d;
        depthCount++;

        const children = reportsMap.get(id) || [];
        children.forEach(childId => {
            if (!visited.has(childId)) {
                visited.add(childId);
                queue.push({ id: childId, d: d + 1 });
            }
        });
    }

    const avgDepth = depthCount > 0 ? totalDepth / depthCount : 0;
    const depthDistribution: Record<string, number> = {};
    depths.forEach(d => {
        const key = d.toString();
        depthDistribution[key] = (depthDistribution[key] || 0) + 1;
    });

    // 4. Calculate Health Score
    let score = 100;
    const issues: string[] = [];

    if (avgSpan < 3) {
        score -= 15;
        issues.push("Average span of control is too narrow (Micro-management risk)");
    } else if (avgSpan > 12) {
        score -= 15;
        issues.push("Average span of control is too wide (Manager overload risk)");
    }

    if (maxDepth > 6) {
        score -= 20;
        issues.push("Organizational structure is too deep (Communication latency)");
    }

    if (roots.length > 5 && employees.length > 20) {
        score -= 10;
        issues.push("High number of disconnected reporting lines");
    }

    return {
        totalEmployees: employees.length,
        spanOfControl: {
            avg: parseFloat(avgSpan.toFixed(1)),
            min: minSpan,
            max: maxSpan,
            median: medianSpan,
            distribution: spanDistribution
        },
        depth: {
            max: maxDepth,
            avg: parseFloat(avgDepth.toFixed(1)),
            distribution: depthDistribution
        },
        healthScore: Math.max(0, score),
        issues
    };
}

export interface VacancyForecast {
    currentRate: number; // Annual %
    predictedVacanciesBeforeYearEnd: number;
    riskFactors: string[];
    monthlyProjections: { month: string; count: number }[];
    highRiskDepts: { name: string; probability: number }[];
}

/**
 * Predict vacancies based on structural health metrics
 */
export function predictVacancies(metrics: StructureMetrics, employees: EmployeeNode[]): VacancyForecast {
    let baseRate = 0.12;
    const factors: string[] = [];

    if (metrics.spanOfControl.avg > 10) {
        baseRate += 0.05;
        factors.push("High manager overload (Span > 10)");
    } else if (metrics.spanOfControl.avg < 3) {
        baseRate += 0.02;
        factors.push("Potential micro-management (Span < 3)");
    }

    if (metrics.depth.max > 5) {
        baseRate += 0.03;
        factors.push("Excessive hierarchy depth (> 5 layers)");
    }

    const deptCounts: Record<string, number> = {};
    employees.forEach(e => {
        // Assuming 'department' is a string name
        const dName = e.department || 'Unknown';
        deptCounts[dName] = (deptCounts[dName] || 0) + 1;
    });

    const highRiskDepts = Object.entries(deptCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name]) => ({ name, probability: Math.min(95, Math.round(baseRate * 100) + Math.floor(Math.random() * 15)) }));

    const totalPredicted = Math.ceil(metrics.totalEmployees * baseRate);

    const monthlyProjections = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    for (let i = 0; i < 6; i++) {
        const mIndex = (currentMonth + i) % 12;
        const count = Math.max(0, (totalPredicted / 12) * (1 + (Math.random() * 0.4 - 0.2)));
        monthlyProjections.push({
            month: months[mIndex],
            count: parseFloat(count.toFixed(1))
        });
    }

    return {
        currentRate: parseFloat((baseRate * 100).toFixed(1)),
        predictedVacanciesBeforeYearEnd: totalPredicted,
        riskFactors: factors,
        monthlyProjections,
        highRiskDepts
    };
}

export function transformToOrgChart(employees: EmployeeNode[]): { nodes: Node<OrgChartNodeData>[]; edges: Edge[] } {
    const nodes: Node<OrgChartNodeData>[] = [];
    const edges: Edge[] = [];

    const empMap = new Map<string, EmployeeNode>();
    employees.forEach(e => empMap.set(e.id, e));

    const childrenMap: Record<string, string[]> = {};

    employees.forEach(emp => {
        if (emp.managerId && empMap.has(emp.managerId)) {
            if (!childrenMap[emp.managerId]) childrenMap[emp.managerId] = [];
            childrenMap[emp.managerId].push(emp.id);
        } else {
            if (!childrenMap['root']) childrenMap['root'] = [];
            childrenMap['root'].push(emp.id);
        }
    });

    const NODE_WIDTH = 200;
    const LEVEL_HEIGHT = 150;

    const layoutNode = (id: string, level: number, offset: number): number => {
        const emp = empMap.get(id);
        if (!emp) return offset;

        let currentOffset = offset;
        const children = childrenMap[id] || [];

        if (children.length > 0) {
            for (const childId of children) {
                currentOffset = layoutNode(childId, level + 1, currentOffset);
                currentOffset += NODE_WIDTH + 20;
            }
        } else {
            currentOffset += NODE_WIDTH + 20;
        }

        nodes.push({
            id: emp.id,
            type: 'default',
            data: {
                label: emp.name,
                role: emp.position,
                department: emp.department,
                imageUrl: emp.imageUrl
            },
            position: { x: offset + (children.length > 0 ? (currentOffset - offset - NODE_WIDTH) / 2 : 0), y: level * LEVEL_HEIGHT },
            style: {
                width: 180,
                padding: 10,
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#fff',
                fontSize: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }
        });

        if (children.length > 0) {
            children.forEach(childId => {
                edges.push({
                    id: `e-${id}-${childId}`,
                    source: id,
                    target: childId,
                    type: 'smoothstep',
                    style: { stroke: '#94a3b8' }
                });
            });
        }

        return Math.max(currentOffset, offset + NODE_WIDTH + 20);
    };

    let rootOffset = 0;
    (childrenMap['root'] || []).forEach(rootId => {
        rootOffset = layoutNode(rootId, 0, rootOffset);
    });

    if (nodes.length === 0 && employees.length > 0) {
        employees.forEach((emp, idx) => {
            nodes.push({
                id: emp.id,
                data: { label: emp.name, role: emp.position, department: emp.department },
                position: { x: (idx % 4) * 250, y: Math.floor(idx / 4) * 150 }
            });
        });
    }

    return { nodes, edges };
}

export interface NetworkMetrics {
    influencers: { id: string; name: string; score: number; dept: string }[];
    collaborationMatrix: { deptA: string; deptB: string; score: number }[];
    density: number;
}

/**
 * Simulate/Calculate Network Analytics
 * In a real system, this would consume email/slack metadata.
 * Here we simulate based on "Shared Projects" or "Tenure + Level".
 */
export function calculateNetworkMetrics(employees: EmployeeNode[]): NetworkMetrics {
    // 1. Identify Influencers (Mock: Tenure check or Random for demo)
    // We'll give higher scores to managers and people with ID length (mock randomness)
    const influencers = employees
        .map(e => ({
            id: e.id,
            name: e.name,
            dept: e.department || 'General',
            score: Math.min(99, Math.floor((e.managerId ? 40 : 80) + Math.random() * 20))
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    // 2. Collaboration Matrix
    const depts = Array.from(new Set(employees.map(e => e.department || 'Unknown'))).slice(0, 5); // Limit to 5
    const matrix: { deptA: string; deptB: string; score: number }[] = [];

    depts.forEach((dA, i) => {
        depts.forEach((dB, j) => {
            if (i < j) { // Upper triangle
                matrix.push({
                    deptA: dA,
                    deptB: dB,
                    score: Math.floor(Math.random() * 100)
                });
            }
        });
    });

    return {
        influencers,
        collaborationMatrix: matrix,
        density: 0.34
    };
}
