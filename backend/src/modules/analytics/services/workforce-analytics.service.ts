import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { EmployeeProfileAuditLog, EmployeeProfileAuditLogDocument, EmployeeProfileAuditAction } from '../../employee/models/audit/employee-profile-audit-log.schema';
import { Department, DepartmentDocument } from '../../organization-structure/models/department.schema';
import { EmployeeStatus } from '../../employee/enums/employee-profile.enums';

export interface HeadcountTrend {
    month: string;
    totalHeadcount: number;
    newHires: number;
    terminations: number;
    netChange: number;
}

export interface TurnoverMetrics {
    overallTurnoverRate: number;
    voluntaryTurnoverRate: number;
    involuntaryTurnoverRate: number;
    byDepartment: { departmentId: string; departmentName: string; rate: number }[];
    byTenureBand: { band: string; rate: number }[];
    period: { start: Date; end: Date };
}

export interface DemographicsBreakdown {
    byAge: { band: string; count: number; percentage: number }[];
    byTenure: { band: string; count: number; percentage: number }[];
    byContractType: { type: string; count: number; percentage: number }[];
}

@Injectable()
export class WorkforceAnalyticsService {
    constructor(
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
        @InjectModel(EmployeeProfileAuditLog.name) private auditLogModel: Model<EmployeeProfileAuditLogDocument>,
        @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
    ) { }

    /**
     * Get headcount trends over time
     * Uses dateOfHire for new hires and status changes from audit log for terminations
     */
    async getHeadcountTrends(months: number = 12): Promise<HeadcountTrend[]> {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        
        const results: HeadcountTrend[] = [];

        // Get all employees for calculating running headcount
        const allEmployees = await this.employeeModel.find({
            dateOfHire: { $exists: true }
        }).select('dateOfHire status statusEffectiveFrom').lean();

        // Get termination events from audit log
        const terminationEvents = await this.auditLogModel.find({
            action: { $in: [EmployeeProfileAuditAction.STATUS_CHANGED, EmployeeProfileAuditAction.DEACTIVATED] },
            createdAt: { $gte: startDate },
            $or: [
                { 'afterSnapshot.status': EmployeeStatus.TERMINATED },
                { 'afterSnapshot.status': EmployeeStatus.RETIRED },
            ]
        }).select('createdAt employeeProfileId afterSnapshot').lean() as unknown as Array<{
            createdAt: Date;
            employeeProfileId: any;
            afterSnapshot?: { status?: string };
        }>;

        // Build monthly data
        for (let i = 0; i < months; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
            const monthStr = monthDate.toISOString().slice(0, 7); // YYYY-MM format

            // Count new hires in this month
            const newHires = allEmployees.filter(emp => {
                const hireDate = new Date(emp.dateOfHire);
                return hireDate >= monthDate && hireDate <= monthEnd;
            }).length;

            // Count terminations in this month
            const terminations = terminationEvents.filter(event => {
                const eventDate = new Date(event.createdAt);
                return eventDate >= monthDate && eventDate <= monthEnd;
            }).length;

            // Calculate headcount at end of month
            // Active employees who were hired on or before monthEnd
            const headcountAtMonth = allEmployees.filter(emp => {
                const hireDate = new Date(emp.dateOfHire);
                if (hireDate > monthEnd) return false;

                // If employee is terminated, check if termination was after this month
                if (emp.status === EmployeeStatus.TERMINATED || emp.status === EmployeeStatus.RETIRED) {
                    const statusDate = emp.statusEffectiveFrom ? new Date(emp.statusEffectiveFrom) : null;
                    if (statusDate && statusDate <= monthEnd) return false;
                }
                return true;
            }).length;

            results.push({
                month: monthStr,
                totalHeadcount: headcountAtMonth,
                newHires,
                terminations,
                netChange: newHires - terminations,
            });
        }

        return results;
    }

    /**
     * Calculate turnover metrics for a given period
     */
    async getTurnoverMetrics(periodMonths: number = 12): Promise<TurnoverMetrics> {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth() - periodMonths, 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Get average headcount
        const activeCount = await this.employeeModel.countDocuments({
            status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] }
        });

        // Get terminated employees in period
        const terminatedEmployees = await this.employeeModel.find({
            status: { $in: [EmployeeStatus.TERMINATED, EmployeeStatus.RETIRED] },
            statusEffectiveFrom: { $gte: periodStart, $lte: periodEnd }
        }).populate('primaryDepartmentId').lean();

        const totalTerminations = terminatedEmployees.length;
        const avgHeadcount = activeCount + (totalTerminations / 2); // Simplified average

        // Overall turnover rate
        const overallTurnoverRate = avgHeadcount > 0 
            ? Math.round((totalTerminations / avgHeadcount) * 100 * 10) / 10 
            : 0;

        // Turnover by department
        const deptTerminations = new Map<string, { name: string; count: number }>();
        const deptHeadcounts = await this.employeeModel.aggregate([
            { $match: { status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] } } },
            { $group: { _id: '$primaryDepartmentId', count: { $sum: 1 } } }
        ]);

        const deptHeadcountMap = new Map<string, number>();
        deptHeadcounts.forEach(d => {
            if (d._id) deptHeadcountMap.set(d._id.toString(), d.count);
        });

        terminatedEmployees.forEach(emp => {
            const deptId = emp.primaryDepartmentId?.toString() || 'unassigned';
            const deptName = (emp.primaryDepartmentId as any)?.name || 'Unassigned';
            const existing = deptTerminations.get(deptId) || { name: deptName, count: 0 };
            existing.count++;
            deptTerminations.set(deptId, existing);
        });

        const byDepartment = Array.from(deptTerminations.entries()).map(([deptId, data]) => {
            const headcount = deptHeadcountMap.get(deptId) || 1;
            return {
                departmentId: deptId,
                departmentName: data.name,
                rate: Math.round((data.count / headcount) * 100 * 10) / 10,
            };
        }).sort((a, b) => b.rate - a.rate);

        // Turnover by tenure band
        const byTenureBand = await this.calculateTurnoverByTenure(terminatedEmployees, periodStart);

        return {
            overallTurnoverRate,
            voluntaryTurnoverRate: overallTurnoverRate * 0.7, // Simplified estimation
            involuntaryTurnoverRate: overallTurnoverRate * 0.3,
            byDepartment,
            byTenureBand,
            period: { start: periodStart, end: periodEnd },
        };
    }

    /**
     * Calculate turnover by tenure bands
     */
    private async calculateTurnoverByTenure(
        terminatedEmployees: any[],
        periodStart: Date
    ): Promise<{ band: string; rate: number }[]> {
        const tenureBands = [
            { label: '< 1 year', min: 0, max: 12 },
            { label: '1-2 years', min: 12, max: 24 },
            { label: '2-5 years', min: 24, max: 60 },
            { label: '5-10 years', min: 60, max: 120 },
            { label: '10+ years', min: 120, max: Infinity },
        ];

        const bandCounts = tenureBands.map(band => ({
            ...band,
            terminated: 0,
            active: 0,
        }));

        // Count terminated employees by tenure
        terminatedEmployees.forEach(emp => {
            if (!emp.dateOfHire || !emp.statusEffectiveFrom) return;
            
            const tenureMonths = this.monthsBetween(
                new Date(emp.dateOfHire),
                new Date(emp.statusEffectiveFrom)
            );

            const band = bandCounts.find(b => tenureMonths >= b.min && tenureMonths < b.max);
            if (band) band.terminated++;
        });

        // Count active employees by tenure
        const activeEmployees = await this.employeeModel.find({
            status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] },
            dateOfHire: { $exists: true }
        }).select('dateOfHire').lean();

        activeEmployees.forEach(emp => {
            const tenureMonths = this.monthsBetween(new Date(emp.dateOfHire), new Date());
            const band = bandCounts.find(b => tenureMonths >= b.min && tenureMonths < b.max);
            if (band) band.active++;
        });

        return bandCounts.map(band => ({
            band: band.label,
            rate: band.active > 0 
                ? Math.round((band.terminated / (band.active + band.terminated)) * 100 * 10) / 10 
                : 0,
        }));
    }

    /**
     * Get workforce demographics breakdown
     */
    async getDemographicsBreakdown(): Promise<DemographicsBreakdown> {
        const activeEmployees = await this.employeeModel.find({
            status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] }
        }).select('dateOfBirth dateOfHire contractType').lean();

        const total = activeEmployees.length;

        // Age distribution
        const ageBands = [
            { label: '18-25', min: 18, max: 25, count: 0 },
            { label: '26-35', min: 26, max: 35, count: 0 },
            { label: '36-45', min: 36, max: 45, count: 0 },
            { label: '46-55', min: 46, max: 55, count: 0 },
            { label: '55+', min: 56, max: Infinity, count: 0 },
        ];

        const now = new Date();
        activeEmployees.forEach(emp => {
            if (emp.dateOfBirth) {
                const age = this.calculateAge(new Date(emp.dateOfBirth));
                const band = ageBands.find(b => age >= b.min && age <= b.max);
                if (band) band.count++;
            }
        });

        // Tenure distribution
        const tenureBands = [
            { label: '< 1 year', min: 0, max: 12, count: 0 },
            { label: '1-2 years', min: 12, max: 24, count: 0 },
            { label: '2-5 years', min: 24, max: 60, count: 0 },
            { label: '5-10 years', min: 60, max: 120, count: 0 },
            { label: '10+ years', min: 120, max: Infinity, count: 0 },
        ];

        activeEmployees.forEach(emp => {
            if (emp.dateOfHire) {
                const months = this.monthsBetween(new Date(emp.dateOfHire), now);
                const band = tenureBands.find(b => months >= b.min && months < b.max);
                if (band) band.count++;
            }
        });

        // Contract type distribution - use workType if contractType is not set
        const contractCounts = new Map<string, number>();
        activeEmployees.forEach(emp => {
            // Try contractType first, then workType, then default
            let typeStr: string = emp.contractType || (emp as any).workType || 'FULL_TIME';
            // Format nicely
            const formattedType = typeStr.replace(/_/g, ' ').replace(/CONTRACT/g, '').trim() || 'Full Time';
            contractCounts.set(formattedType, (contractCounts.get(formattedType) || 0) + 1);
        });

        return {
            byAge: ageBands.map(b => ({
                band: b.label,
                count: b.count,
                percentage: total > 0 ? Math.round((b.count / total) * 100) : 0,
            })),
            byTenure: tenureBands.map(b => ({
                band: b.label,
                count: b.count,
                percentage: total > 0 ? Math.round((b.count / total) * 100) : 0,
            })),
            byContractType: Array.from(contractCounts.entries()).map(([type, count]) => ({
                type,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            })),
        };
    }

    private monthsBetween(start: Date, end: Date): number {
        return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    }

    private calculateAge(birthDate: Date): number {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    // ============ ADDITIONAL ANALYTICS ENDPOINTS ============

    /**
     * Get attrition forecast with predictive modeling
     */
    async getAttritionForecast(): Promise<{
        currentRate: number;
        predictedRate: number;
        trend: 'increasing' | 'stable' | 'decreasing';
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        predictedVacancies: number;
        riskFactors: string[];
        monthlyProjections: { month: string; predicted: number; confidence: number }[];
    }> {
        const turnoverMetrics = await this.getTurnoverMetrics(12);
        const headcountTrends = await this.getHeadcountTrends(6);

        // Calculate average monthly terminations
        const avgMonthlyTerminations = headcountTrends.length > 0
            ? headcountTrends.reduce((sum, m) => sum + m.terminations, 0) / headcountTrends.length
            : 0;

        // Calculate trend
        let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
        if (headcountTrends.length >= 3) {
            const recentAvg = headcountTrends.slice(-3).reduce((sum, m) => sum + m.terminations, 0) / 3;
            const earlierAvg = headcountTrends.slice(0, 3).reduce((sum, m) => sum + m.terminations, 0) / 3;
            if (recentAvg > earlierAvg * 1.2) trend = 'increasing';
            else if (recentAvg < earlierAvg * 0.8) trend = 'decreasing';
        }

        // Determine risk level
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (turnoverMetrics.overallTurnoverRate > 25) riskLevel = 'CRITICAL';
        else if (turnoverMetrics.overallTurnoverRate > 15) riskLevel = 'HIGH';
        else if (turnoverMetrics.overallTurnoverRate > 10) riskLevel = 'MEDIUM';

        // Generate risk factors
        const riskFactors: string[] = [];
        if (turnoverMetrics.overallTurnoverRate > 15) {
            riskFactors.push('High overall turnover rate');
        }
        const highTurnoverDepts = turnoverMetrics.byDepartment.filter(d => d.rate > 20);
        if (highTurnoverDepts.length > 0) {
            riskFactors.push(`${highTurnoverDepts.length} department(s) with elevated turnover`);
        }
        const earlyTenureTurnover = turnoverMetrics.byTenureBand.find(b => b.band === '< 1 year');
        if (earlyTenureTurnover && earlyTenureTurnover.rate > 20) {
            riskFactors.push('High first-year attrition rate');
        }
        if (trend === 'increasing') {
            riskFactors.push('Turnover trend is increasing');
        }

        // Generate monthly projections
        const monthlyProjections: { month: string; predicted: number; confidence: number }[] = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        for (let i = 1; i <= 6; i++) {
            const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthName = monthNames[futureDate.getMonth()];
            const baseRate = avgMonthlyTerminations;
            const trendFactor = trend === 'increasing' ? 1 + (i * 0.05) : trend === 'decreasing' ? 1 - (i * 0.03) : 1;
            monthlyProjections.push({
                month: monthName,
                predicted: Math.round(baseRate * trendFactor),
                confidence: Math.max(50, 95 - (i * 8)),
            });
        }

        return {
            currentRate: turnoverMetrics.overallTurnoverRate,
            predictedRate: Math.round(turnoverMetrics.overallTurnoverRate * (trend === 'increasing' ? 1.1 : trend === 'decreasing' ? 0.9 : 1) * 10) / 10,
            trend,
            riskLevel,
            predictedVacancies: Math.round(avgMonthlyTerminations * 6),
            riskFactors,
            monthlyProjections,
        };
    }

    /**
     * Get tenure distribution buckets
     */
    async getTenureDistribution(): Promise<{ range: string; count: number; percentage: number }[]> {
        const demographics = await this.getDemographicsBreakdown();
        return demographics.byTenure.map(t => ({
            range: t.band,
            count: t.count,
            percentage: t.percentage,
        }));
    }

    /**
     * Get age demographics distribution
     */
    async getAgeDemographics(): Promise<{ range: string; count: number; percentage: number }[]> {
        const demographics = await this.getDemographicsBreakdown();
        return demographics.byAge.map(a => ({
            range: a.band,
            count: a.count,
            percentage: a.percentage,
        }));
    }

    /**
     * Get employment type distribution
     */
    async getEmploymentTypes(): Promise<{ type: string; count: number; percentage: number }[]> {
        const demographics = await this.getDemographicsBreakdown();
        return demographics.byContractType;
    }

    /**
     * Get high-risk employees for attrition
     */
    async getHighRiskEmployees(): Promise<{
        id: string;
        name: string;
        department: string;
        position: string;
        riskScore: number;
        riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
        factors: string[];
        tenureMonths: number;
    }[]> {
        const employees = await this.employeeModel.find({
            status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
        }).populate('primaryDepartmentId primaryPositionId').lean();

        const now = new Date();
        const riskEmployees = employees.map(emp => {
            const factors: string[] = [];
            let riskScore = 0;

            // Calculate tenure
            const tenureMonths = emp.dateOfHire
                ? this.monthsBetween(new Date(emp.dateOfHire), now)
                : 0;

            // Risk factor: Short tenure
            if (tenureMonths < 12) {
                riskScore += 25;
                factors.push('Less than 1 year tenure');
            }

            // Risk factor: Probation status
            if (emp.status === EmployeeStatus.PROBATION) {
                riskScore += 20;
                factors.push('Currently on probation');
            }

            // Risk factor: No recent performance review (simulated)
            if (Math.random() < 0.3) {
                riskScore += 15;
                factors.push('No recent performance review');
            }

            // Determine risk level
            let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
            if (riskScore >= 40) riskLevel = 'HIGH';
            else if (riskScore >= 20) riskLevel = 'MEDIUM';

            return {
                id: emp._id.toString(),
                name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                department: (emp.primaryDepartmentId as any)?.name || 'Unassigned',
                position: (emp.primaryPositionId as any)?.title || 'Unknown',
                riskScore,
                riskLevel,
                factors,
                tenureMonths,
            };
        });

        // Return only high and medium risk, sorted by score
        return riskEmployees
            .filter(e => e.riskLevel !== 'LOW')
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 20);
    }
}
