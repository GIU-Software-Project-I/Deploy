/**
 * Performance Analytics Utility
 * Provides statistical methods for People Analytics / Performance Science
 */

export interface AppraisalRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    managerId: string;
    managerName: string;
    rating: number; // 0-5 or 0-100
    potential?: number; // 0-5
    date: string;
    cycleId: string;
}

/**
 * Transforms Backend records to the format expected by analytics tools.
 * Backend records usually come with populated profiles if searchRecords is used.
 */
export function transformBackendRecords(backendRecords: any[]): AppraisalRecord[] {
    return backendRecords.map(rec => ({
        id: rec._id,
        employeeId: rec.employeeProfileId?._id || rec.employeeProfileId,
        employeeName: rec.employeeProfileId?.fullName || `Employee ${rec.employeeProfileId}`,
        managerId: rec.managerProfileId?._id || rec.managerProfileId,
        managerName: rec.managerProfileId?.fullName || `Manager ${rec.managerProfileId}`,
        rating: rec.totalScore || 0,
        potential: rec.potentialScore || rec.totalScore || 0, // Fallback to totalScore if potential not explicitly set
        date: rec.managerSubmittedAt || rec.createdAt,
        cycleId: rec.cycleId?._id || rec.cycleId
    }));
}

export interface ManagerBiasMetric {
    managerId: string;
    managerName: string;
    avgRating: number;
    ratingCount: number;
    zScore: number; // Deviations from company mean
    biasCategory: 'Lenient' | 'Strict' | 'Balanced';
}

export interface PerformanceTrajectory {
    employeeId: string;
    name: string;
    slope: number; // Trend direction (+ rising, - declining)
    rSquared: number; // Reliability of trend
    predictedNextRating: number;
    history: { date: string; rating: number }[];
}

export interface TalentGridNode {
    id: string;
    name: string;
    x: number; // Performance
    y: number; // Potential
    boxLabel: string; // "Star", "Iceberg", etc.
    imageUrl?: string;
}

/**
 * 1. Rater Bias Analyzer (Z-Score)
 * Detects "Strict" vs "Lenient" managers relative to population mean.
 */
export function calculateRaterBias(appraisals: AppraisalRecord[]): ManagerBiasMetric[] {
    if (appraisals.length === 0) return [];

    // Global Stats
    const totalSum = appraisals.reduce((acc, curr) => acc + curr.rating, 0);
    const globalMean = totalSum / appraisals.length;

    // Standard Deviation
    const variance = appraisals.reduce((acc, curr) => acc + Math.pow(curr.rating - globalMean, 2), 0) / appraisals.length;
    const stdDev = Math.sqrt(variance) || 1; // Prevent div by zero

    // Group by Manager
    const managerMap = new Map<string, { name: string; ratings: number[] }>();
    appraisals.forEach(app => {
        const mgr = managerMap.get(app.managerId) || { name: app.managerName, ratings: [] };
        mgr.ratings.push(app.rating);
        managerMap.set(app.managerId, mgr);
    });

    const results: ManagerBiasMetric[] = [];

    managerMap.forEach((data, id) => {
        if (data.ratings.length < 3) return; // Need min sample size

        const mgrAvg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
        const zScore = (mgrAvg - globalMean) / stdDev;

        let biasCategory: 'Lenient' | 'Strict' | 'Balanced' = 'Balanced';
        if (zScore > 1.0) biasCategory = 'Lenient';
        if (zScore < -1.0) biasCategory = 'Strict';

        results.push({
            managerId: id,
            managerName: data.name,
            avgRating: parseFloat(mgrAvg.toFixed(2)),
            ratingCount: data.ratings.length,
            zScore: parseFloat(zScore.toFixed(2)),
            biasCategory
        });
    });

    return results.sort((a, b) => b.zScore - a.zScore);
}

/**
 * 2. Performance Trajectory (Linear Regression)
 * Calculates slope of performance over time.
 */
export function calculateTrajectory(appraisals: AppraisalRecord[]): PerformanceTrajectory[] {
    // Group by Employee
    const employeeMap = new Map<string, { name: string; history: { date: number; rating: number; rawDate: string }[] }>();

    appraisals.forEach(app => {
        const emp = employeeMap.get(app.employeeId) || { name: app.employeeName, history: [] };
        emp.history.push({
            date: new Date(app.date).getTime(),
            rating: app.rating,
            rawDate: app.date
        });
        employeeMap.set(app.employeeId, emp);
    });

    const results: PerformanceTrajectory[] = [];

    employeeMap.forEach((data, id) => {
        if (data.history.length < 2) return; // Need at least 2 points

        // Sort by date ascending
        const sorted = data.history.sort((a, b) => a.date - b.date);

        // Simple Linear Regression (Least Squares)
        // X = time index (0, 1, 2...), Y = rating
        const n = sorted.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        sorted.forEach((pt, index) => {
            const x = index;
            const y = pt.rating;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
        const intercept = (sumY - slope * sumX) / n;

        // Next predicted rating (index = n)
        const nextRating = slope * n + intercept;

        results.push({
            employeeId: id,
            name: data.name,
            slope: parseFloat(slope.toFixed(2)),
            rSquared: 0, // Not calculating R^2 for simplicity now
            predictedNextRating: parseFloat(nextRating.toFixed(1)),
            history: sorted.map(h => ({ date: h.rawDate, rating: h.rating }))
        });
    });

    return results;
}

/**
 * 3. 9-Box Grid Classifier
 * X: Performance (Low/Med/High)
 * Y: Potential (Low/Med/High)
 */
export function classify9Box(perfRating: number, potentialRating: number): string {
    // Assuming 5-point scale
    // Low: 1-2.5, Med: 2.51-3.9, High: 4-5

    const getLevel = (val: number) => {
        if (val >= 4) return 2; // High
        if (val >= 2.5) return 1; // Med
        return 0; // Low
    };

    const x = getLevel(perfRating);
    const y = getLevel(potentialRating);

    // Matrix [Potential][Performance]
    // P = High (2) -> [Iceberg, Growth Star, Star]
    // P = Med  (1) -> [Dilemma, Core P, High Performer]
    // P = Low  (0) -> [Risk, Effective, Trusted Pro]

    const grid = [
        ["Underperformer (Risk)", "Effective Employee", "Trusted Professional"],
        ["Inconsistent Player", "Core Performer", "High Performer"],
        ["Rough Diamond", "Future Star", "Top Talent (Star)"]
    ];

    return grid[y][x];
}
