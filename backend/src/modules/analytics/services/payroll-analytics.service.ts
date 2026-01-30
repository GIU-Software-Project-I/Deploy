import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { payrollRuns } from '../../payroll/payroll-execution/models/payrollRuns.schema';
import { paySlip } from '../../payroll/payroll-execution/models/payslip.schema';
import { AttendanceRecord } from '../../time-management/models/attendance-record.schema';
import { PayRollStatus } from '../../payroll/payroll-execution/enums/payroll-execution-enum';

export interface PayrollStory {
    headline: string;
    narrative: string;
    trend: 'RISING' | 'FALLING' | 'STABLE';
    changePercentage: number;
}

export interface PayrollAnomaly {
    type: 'GHOST_EMPLOYEE' | 'GRADE_DEVIATION' | 'UNUSUAL_BONUS';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    employeeId: string;
    description: string;
    detectedAt: Date;
}

@Injectable()
export class PayrollAnalyticsService {
    private readonly logger = new Logger(PayrollAnalyticsService.name);

    constructor(
        @InjectModel(payrollRuns.name) private runModel: Model<payrollRuns>,
        @InjectModel(paySlip.name) private payslipModel: Model<paySlip>,
        @InjectModel(AttendanceRecord.name) private attendanceModel: Model<AttendanceRecord>,
    ) { }

    /**
     * Engine 1: Storytelling
     * Generates a natural language summary of the latest payroll run compared to the previous one.
     */
    async getPayrollStory(entityId?: string): Promise<PayrollStory> {
        const runs = await this.runModel.find(entityId ? { entityId, status: PayRollStatus.APPROVED } : { status: PayRollStatus.APPROVED })
            .sort({ payrollPeriod: -1 })
            .limit(2)
            .exec();

        if (runs.length < 2) return { headline: 'Insufficient Data', narrative: 'Not enough payroll history to generate a story.', trend: 'STABLE', changePercentage: 0 };

        const [current, previous] = runs;
        const diff = current.totalnetpay - previous.totalnetpay;
        const pct = (diff / (previous.totalnetpay || 1)) * 100;

        let headline = 'Payroll Stable';
        let narrative = `The payroll for ${current.payrollPeriod.toLocaleString('default', { month: 'long' })} closed at $${current.totalnetpay.toLocaleString()}. `;

        if (pct > 5) {
            headline = 'Significant Cost Increase';
            narrative += `Net pay jumped by ${pct.toFixed(1)}% compared to last month. This is driven by ${current.employees - previous.employees} new hires and ${current.exceptions} detected exceptions.`;
        } else if (pct < -5) {
            headline = 'Cost Reduction Observed';
            narrative += `Payroll costs dropped by ${Math.abs(pct).toFixed(1)}%, likely due to offboarding or reduced overtime payouts.`;
        } else {
            narrative += `Costs remained stable with a minor ${pct.toFixed(1)}% variance. Operational efficiency is steady.`;
        }

        return {
            headline,
            narrative,
            trend: pct > 1 ? 'RISING' : (pct < -1 ? 'FALLING' : 'STABLE'),
            changePercentage: parseFloat(pct.toFixed(1))
        };
    }

    /**
     * Engine 2: Anomaly Detection (Ghost Employees)
     * Detects employees who are getting paid but have ZERO attendance logs in the period.
     */
    async detectGhostEmployees(runId: string): Promise<PayrollAnomaly[]> {
        const run = await this.runModel.findOne({ runId }).exec(); // find by runId string or _id
        if (!run) return [];

        const startOfMonth = new Date(run.payrollPeriod.getFullYear(), run.payrollPeriod.getMonth(), 1);
        const endOfMonth = run.payrollPeriod;

        const payslips = await this.payslipModel.find({ payrollRunId: run._id }).populate('employeeId').exec();
        const anomalies: PayrollAnomaly[] = [];

        for (const slip of payslips) {
            const attendanceCount = await this.attendanceModel.countDocuments({
                employeeId: slip.employeeId,
                'punches.time': { $gte: startOfMonth, $lte: endOfMonth }
            });

            // Ghost Protocol: Paid > 0 but Attendance == 0
            if (attendanceCount === 0 && slip.netPay > 0) {
                // @ts-ignore
                const empName = slip.employeeId?.fullName || 'Unknown';
                anomalies.push({
                    type: 'GHOST_EMPLOYEE',
                    severity: 'HIGH',
                    // @ts-ignore
                    employeeId: slip.employeeId?._id?.toString(),
                    description: `Employee ${empName} received ${slip.netPay} but has 0 attendance logs this month.`,
                    detectedAt: new Date()
                });
            }
        }
        return anomalies;
    }

    /**
     * Engine 3: Predictive Modeling (Linear Forecasting)
     * Predicts next month's payroll cost based on 6-month history.
     */
    async getForecast(): Promise<{ nextMonthPrediction: number, confidence: number }> {
        const history = await this.runModel.find({ status: PayRollStatus.APPROVED }).sort({ payrollPeriod: 1 }).limit(6).exec();
        if (history.length < 3) return { nextMonthPrediction: 0, confidence: 0 };

        const x = history.map((_, i) => i);
        const y = history.map(h => h.totalnetpay);

        const n = y.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const nextX = n;
        const prediction = slope * nextX + intercept;

        return {
            nextMonthPrediction: parseFloat(prediction.toFixed(2)),
            confidence: 0.85 // Heuristic confidence
        };
    }
}
