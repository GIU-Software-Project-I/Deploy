/**
 * Organization Structure Data Science Engines
 * 
 * Provides predictive analytics, anomaly detection, and intelligence
 * for structural health monitoring and workforce planning.
 * 
 * Requirements: REQ-OSM-01, REQ-OSM-02, REQ-OSM-05, BR 24, BR 41
 */

export interface Department {
    _id: string;
    name: string;
    code: string;
    isActive: boolean;
    costCenter?: string;
    headPositionId?: { _id: string; title: string };
}

export interface Position {
    _id: string;
    title: string;
    code: string;
    departmentId: { _id: string; name: string };
    reportsToPositionId?: { _id: string; title: string };
    payGrade?: string;
    status?: 'ACTIVE' | 'FROZEN' | 'INACTIVE';
    isActive: boolean;
}

export interface Assignment {
    _id: string;
    employeeProfileId: { _id: string; firstName: string; lastName: string };
    positionId: { _id: string; title: string };
    startDate: string;
    endDate?: string;
}

// ============================================
// STRUCTURAL HEALTH ANALYTICS
// ============================================

export interface StructuralHealthScore {
    overall: number; // 0-100
    dimensions: {
        spanOfControl: number;
        hierarchyBalance: number;
        vacancyRisk: number;
        reportingClarity: number;
    };
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    trend: 'improving' | 'stable' | 'declining';
    insights: HealthInsight[];
}

export interface HealthInsight {
    type: 'warning' | 'critical' | 'opportunity' | 'info';
    title: string;
    description: string;
    metric?: number;
    recommendation?: string;
}

export function calculateStructuralHealth(
    departments: Department[],
    positions: Position[],
    assignments: Assignment[]
): StructuralHealthScore {
    const insights: HealthInsight[] = [];

    // Calculate dimensions
    const spanScore = calculateSpanOfControlScore(positions, assignments, insights);
    const hierarchyScore = calculateHierarchyScore(positions, insights);
    const vacancyScore = calculateVacancyRiskScore(positions, assignments, insights);
    const clarityScore = calculateReportingClarityScore(positions, insights);

    // Weighted average for overall score
    const overall = Math.round(
        spanScore * 0.3 +
        hierarchyScore * 0.25 +
        vacancyScore * 0.25 +
        clarityScore * 0.2
    );

    // Grade assignment
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overall >= 85) grade = 'A';
    else if (overall >= 70) grade = 'B';
    else if (overall >= 55) grade = 'C';
    else if (overall >= 40) grade = 'D';
    else grade = 'F';

    return {
        overall,
        dimensions: {
            spanOfControl: spanScore,
            hierarchyBalance: hierarchyScore,
            vacancyRisk: vacancyScore,
            reportingClarity: clarityScore
        },
        grade,
        trend: overall >= 70 ? 'stable' : overall >= 50 ? 'declining' : 'declining',
        insights
    };
}

function calculateSpanOfControlScore(
    positions: Position[],
    assignments: Assignment[],
    insights: HealthInsight[]
): number {
    // Build manager -> reports map
    const reportsCount: Record<string, number> = {};

    positions.forEach(pos => {
        if (pos.reportsToPositionId) {
            const managerId = pos.reportsToPositionId._id;
            reportsCount[managerId] = (reportsCount[managerId] || 0) + 1;
        }
    });

    const spans = Object.values(reportsCount);
    if (spans.length === 0) return 100;

    const avgSpan = spans.reduce((a, b) => a + b, 0) / spans.length;
    const maxSpan = Math.max(...spans);

    let score = 100;

    // Optimal span is 5-8
    if (avgSpan < 3) {
        score -= 25;
        insights.push({
            type: 'warning',
            title: 'Narrow Span of Control',
            description: `Average span is ${avgSpan.toFixed(1)} - potential micro-management risk`,
            metric: avgSpan,
            recommendation: 'Consider consolidating management layers'
        });
    } else if (avgSpan > 12) {
        score -= 30;
        insights.push({
            type: 'critical',
            title: 'Excessive Span of Control',
            description: `Average span is ${avgSpan.toFixed(1)} - manager overload risk`,
            metric: avgSpan,
            recommendation: 'Add middle management to reduce workload'
        });
    }

    if (maxSpan > 15) {
        score -= 15;
        insights.push({
            type: 'warning',
            title: 'Manager Overload Detected',
            description: `One manager has ${maxSpan} direct reports`,
            metric: maxSpan
        });
    }

    return Math.max(0, Math.min(100, score));
}

function calculateHierarchyScore(positions: Position[], insights: HealthInsight[]): number {
    // Calculate hierarchy depth
    const posMap = new Map(positions.map(p => [p._id, p]));

    const getDepth = (posId: string, visited = new Set<string>()): number => {
        if (visited.has(posId)) return 0;
        visited.add(posId);
        const pos = posMap.get(posId);
        if (!pos || !pos.reportsToPositionId) return 1;
        return 1 + getDepth(pos.reportsToPositionId._id, visited);
    };

    const depths = positions.map(p => getDepth(p._id));
    const maxDepth = Math.max(...depths, 0);

    let score = 100;

    if (maxDepth > 7) {
        score -= 30;
        insights.push({
            type: 'critical',
            title: 'Deep Organizational Hierarchy',
            description: `${maxDepth} layers detected - communication latency risk`,
            metric: maxDepth,
            recommendation: 'Flatten structure to improve agility'
        });
    } else if (maxDepth > 5) {
        score -= 15;
        insights.push({
            type: 'warning',
            title: 'Moderate Hierarchy Depth',
            description: `${maxDepth} reporting layers`,
            metric: maxDepth
        });
    }

    return Math.max(0, Math.min(100, score));
}

function calculateVacancyRiskScore(
    positions: Position[],
    assignments: Assignment[],
    insights: HealthInsight[]
): number {
    const activePositions = positions.filter(p => p.isActive && p.status !== 'FROZEN');
    const filledPositionIds = new Set(
        assignments
            .filter(a => !a.endDate || new Date(a.endDate) > new Date())
            .map(a => a.positionId._id)
    );

    const vacantCount = activePositions.filter(p => !filledPositionIds.has(p._id)).length;
    const vacancyRate = activePositions.length > 0 ? (vacantCount / activePositions.length) * 100 : 0;

    let score = 100 - vacancyRate;

    if (vacancyRate > 20) {
        insights.push({
            type: 'critical',
            title: 'High Vacancy Rate',
            description: `${vacancyRate.toFixed(1)}% of positions are vacant`,
            metric: vacancyRate,
            recommendation: 'Prioritize recruitment for critical roles'
        });
    } else if (vacancyRate > 10) {
        insights.push({
            type: 'warning',
            title: 'Elevated Vacancy Rate',
            description: `${vacancyRate.toFixed(1)}% vacancy rate detected`,
            metric: vacancyRate
        });
    } else if (vacancyRate < 5) {
        insights.push({
            type: 'opportunity',
            title: 'Healthy Fill Rate',
            description: 'Position fill rate is excellent',
            metric: 100 - vacancyRate
        });
    }

    return Math.max(0, Math.min(100, score));
}

function calculateReportingClarityScore(positions: Position[], insights: HealthInsight[]): number {
    let score = 100;

    // Check for orphaned positions (no reporting line)
    const orphanedCount = positions.filter(
        p => p.isActive && !p.reportsToPositionId
    ).length;

    // Root positions are acceptable (1-3 typically)
    if (orphanedCount > 5) {
        score -= (orphanedCount - 5) * 5;
        insights.push({
            type: 'warning',
            title: 'Undefined Reporting Lines',
            description: `${orphanedCount} positions have no reporting manager`,
            metric: orphanedCount,
            recommendation: 'Define reporting structure for clarity'
        });
    }

    return Math.max(0, Math.min(100, score));
}

// ============================================
// DEPARTMENT ANALYTICS
// ============================================

export interface DepartmentAnalytics {
    departmentId: string;
    departmentName: string;
    totalPositions: number;
    filledPositions: number;
    vacantPositions: number;
    frozenPositions: number;
    fillRate: number;
    healthScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    avgTenureMonths?: number;
    headcountTrend: 'growing' | 'stable' | 'shrinking';
}

export function calculateDepartmentAnalytics(
    departments: Department[],
    positions: Position[],
    assignments: Assignment[]
): DepartmentAnalytics[] {
    return departments.filter(d => d.isActive).map(dept => {
        const deptPositions = positions.filter(
            p => p.departmentId?._id === dept._id || (p.departmentId as any) === dept._id
        );

        const activePositions = deptPositions.filter(p => p.isActive && p.status !== 'FROZEN');
        const frozenPositions = deptPositions.filter(p => p.status === 'FROZEN');

        const filledPositionIds = new Set(
            assignments
                .filter(a => !a.endDate || new Date(a.endDate) > new Date())
                .map(a => a.positionId?._id)
        );

        const filledCount = activePositions.filter(p => filledPositionIds.has(p._id)).length;
        const vacantCount = activePositions.length - filledCount;
        const fillRate = activePositions.length > 0 ? (filledCount / activePositions.length) * 100 : 100;

        // Calculate health score for department
        let healthScore = 100;
        if (fillRate < 80) healthScore -= (80 - fillRate);
        if (frozenPositions.length > activePositions.length * 0.2) healthScore -= 15;

        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (healthScore >= 80) riskLevel = 'LOW';
        else if (healthScore >= 60) riskLevel = 'MEDIUM';
        else if (healthScore >= 40) riskLevel = 'HIGH';
        else riskLevel = 'CRITICAL';

        // Trend calculation (simplified heuristic)
        const trend = fillRate > 90 ? 'growing' : fillRate > 70 ? 'stable' : 'shrinking';

        return {
            departmentId: dept._id,
            departmentName: dept.name,
            totalPositions: deptPositions.length,
            filledPositions: filledCount,
            vacantPositions: vacantCount,
            frozenPositions: frozenPositions.length,
            fillRate: Math.round(fillRate),
            healthScore: Math.max(0, Math.round(healthScore)),
            riskLevel,
            headcountTrend: trend
        };
    });
}

// ============================================
// POSITION INTELLIGENCE
// ============================================

export interface PositionRiskAssessment {
    positionId: string;
    positionTitle: string;
    department: string;
    criticalityScore: number; // 0-100
    vacancyRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    successionStatus: 'COVERED' | 'AT_RISK' | 'NO_SUCCESSOR';
    factors: string[];
}

export function assessPositionRisk(
    positions: Position[],
    assignments: Assignment[]
): PositionRiskAssessment[] {
    const filledPositionIds = new Set(
        assignments
            .filter(a => !a.endDate || new Date(a.endDate) > new Date())
            .map(a => a.positionId?._id)
    );

    return positions.filter(p => p.isActive).map(pos => {
        const factors: string[] = [];
        let criticalityScore = 50; // Base score

        // Check if position has subordinates (manager role)
        const hasSubordinates = positions.some(p => p.reportsToPositionId?._id === pos._id);
        if (hasSubordinates) {
            criticalityScore += 20;
            factors.push('Management Position');
        }

        // Check if it's a department head position
        const titleLower = pos.title.toLowerCase();
        if (titleLower.includes('head') || titleLower.includes('director') || titleLower.includes('chief')) {
            criticalityScore += 25;
            factors.push('Leadership Role');
        }

        // Pay grade indicator
        if (pos.payGrade && parseInt(pos.payGrade) >= 8) {
            criticalityScore += 15;
            factors.push('Senior Grade');
        }

        // Vacancy risk based on current status
        const isFilled = filledPositionIds.has(pos._id);
        let vacancyRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

        if (!isFilled) {
            vacancyRisk = 'HIGH';
            factors.push('Currently Vacant');
        } else if (pos.status === 'FROZEN') {
            vacancyRisk = 'MEDIUM';
            factors.push('Frozen Status');
        }

        // Succession status (simplified - would need real succession data)
        const successionStatus: 'COVERED' | 'AT_RISK' | 'NO_SUCCESSOR' =
            isFilled && criticalityScore > 70 ? 'AT_RISK' :
                isFilled ? 'COVERED' : 'NO_SUCCESSOR';

        return {
            positionId: pos._id,
            positionTitle: pos.title,
            department: pos.departmentId?.name || 'Unknown',
            criticalityScore: Math.min(100, criticalityScore),
            vacancyRisk,
            successionStatus,
            factors
        };
    }).sort((a, b) => b.criticalityScore - a.criticalityScore);
}

// ============================================
// COST CENTER ANALYTICS (BR 30)
// ============================================

export interface CostCenterSummary {
    costCenter: string;
    departmentCount: number;
    positionCount: number;
    filledCount: number;
    estimatedHeadcount: number;
    utilizationRate: number;
}

export function analyzeCostCenters(
    departments: Department[],
    positions: Position[],
    assignments: Assignment[]
): CostCenterSummary[] {
    const costCenterMap = new Map<string, {
        depts: Set<string>;
        positions: Position[];
    }>();

    // Group by cost center
    departments.forEach(dept => {
        const cc = dept.costCenter || 'UNASSIGNED';
        if (!costCenterMap.has(cc)) {
            costCenterMap.set(cc, { depts: new Set(), positions: [] });
        }
        costCenterMap.get(cc)!.depts.add(dept._id);
    });

    // Add positions to cost centers
    positions.forEach(pos => {
        const deptId = pos.departmentId?._id || (pos.departmentId as any);
        for (const [cc, data] of costCenterMap.entries()) {
            if (data.depts.has(deptId)) {
                data.positions.push(pos);
                break;
            }
        }
    });

    const filledPositionIds = new Set(
        assignments
            .filter(a => !a.endDate || new Date(a.endDate) > new Date())
            .map(a => a.positionId?._id)
    );

    const results: CostCenterSummary[] = [];

    for (const [cc, data] of costCenterMap.entries()) {
        const activePositions = data.positions.filter(p => p.isActive);
        const filledCount = activePositions.filter(p => filledPositionIds.has(p._id)).length;

        results.push({
            costCenter: cc,
            departmentCount: data.depts.size,
            positionCount: activePositions.length,
            filledCount,
            estimatedHeadcount: filledCount,
            utilizationRate: activePositions.length > 0 ?
                Math.round((filledCount / activePositions.length) * 100) : 100
        });
    }

    return results.sort((a, b) => b.positionCount - a.positionCount);
}

// ============================================
// STRUCTURE CHANGE IMPACT PREDICTION
// ============================================

export interface ChangeImpactAnalysis {
    changeType: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT' | 'REASSIGN_REPORTING';
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedPositions: number;
    affectedEmployees: number;
    downstreamEffects: string[];
    recommendation: string;
}

export function predictChangeImpact(
    changeType: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT' | 'REASSIGN_REPORTING',
    targetId: string,
    positions: Position[],
    assignments: Assignment[]
): ChangeImpactAnalysis {
    const effects: string[] = [];
    let affectedPositions = 0;
    let affectedEmployees = 0;

    if (changeType === 'DEACTIVATE_POSITION') {
        const targetPos = positions.find(p => p._id === targetId);

        // Check if position has subordinates
        const subordinates = positions.filter(p => p.reportsToPositionId?._id === targetId);
        affectedPositions = subordinates.length + 1;

        // Check current assignment
        const currentAssignment = assignments.find(
            a => a.positionId?._id === targetId && (!a.endDate || new Date(a.endDate) > new Date())
        );

        if (currentAssignment) {
            affectedEmployees = 1;
            effects.push('Current incumbent will need reassignment');
        }

        if (subordinates.length > 0) {
            effects.push(`${subordinates.length} positions will lose their reporting line`);
            effects.push('Reporting structure update required');
        }

        if (targetPos?.title.toLowerCase().includes('head')) {
            effects.push('Department leadership vacancy will occur');
        }
    } else if (changeType === 'DEACTIVATE_DEPARTMENT') {
        const deptPositions = positions.filter(
            p => p.departmentId?._id === targetId || (p.departmentId as any) === targetId
        );
        affectedPositions = deptPositions.length;

        const deptAssignments = assignments.filter(a =>
            deptPositions.some(p => p._id === a.positionId?._id) &&
            (!a.endDate || new Date(a.endDate) > new Date())
        );
        affectedEmployees = deptAssignments.length;

        effects.push(`${affectedPositions} positions will be deactivated`);
        effects.push(`${affectedEmployees} employees will require reassignment`);
        effects.push('Payroll cost center updates required');
    }

    // Determine impact level
    let impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (affectedEmployees > 10 || affectedPositions > 20) impactLevel = 'CRITICAL';
    else if (affectedEmployees > 5 || affectedPositions > 10) impactLevel = 'HIGH';
    else if (affectedEmployees > 0 || affectedPositions > 3) impactLevel = 'MEDIUM';
    else impactLevel = 'LOW';

    const recommendation = impactLevel === 'CRITICAL'
        ? 'Requires executive approval and transition plan'
        : impactLevel === 'HIGH'
            ? 'Create detailed transition plan before proceeding'
            : impactLevel === 'MEDIUM'
                ? 'Notify affected stakeholders before change'
                : 'Change can proceed with standard approval';

    return {
        changeType,
        impactLevel,
        affectedPositions,
        affectedEmployees,
        downstreamEffects: effects,
        recommendation
    };
}
