import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeProfile } from '../../employee/models/employee/employee-profile.schema';

export interface RiskAnalysis {
    score: number; // 0 to 100
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    flags: string[];
}

export interface CareerRecommendation {
    recommendedSystemRoles: string[];
    suggestedNextPositions: string[]; // Future: Mocked for now
    readinessScore: number;
}

export interface ImpactAnalysis {
    replacementDays: number;
    capacityLossScore: number; // 0-100
    knowledgeLossRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProfileHealth {
    completenessScore: number;
    missingCriticalFields: string[];
    dataQualityIssues: string[];
    lastUpdated: Date;
}

@Injectable()
export class ProfileAnalyticsService {
    private readonly logger = new Logger(ProfileAnalyticsService.name);

    constructor(
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
    ) { }

    /**
     * Engine 1: Change Request Risk Engine
     * Analyzes pending profile changes for security risks.
     */
    analyzeChangeRequestRisk(changes: Record<string, any>, context: string): RiskAnalysis {
        let score = 0;
        const flags: string[] = [];

        // 1. Sensitivity Analysis
        const HIGH_SENSITIVITY_FIELDS = ['bankAccountNumber', 'bankName', 'nationalId', 'workEmail', 'contractType'];
        const MEDIUM_SENSITIVITY_FIELDS = ['address.streetAddress', 'mobilePhone', 'fullName'];

        Object.keys(changes).forEach(field => {
            if (HIGH_SENSITIVITY_FIELDS.includes(field)) {
                score += 40;
                flags.push(`High Sensitivity Field: ${field}`);
            } else if (MEDIUM_SENSITIVITY_FIELDS.includes(field)) {
                score += 15;
                flags.push(`Medium Sensitivity Field: ${field}`);
            }
        });

        // 2. Volume Analysis
        if (Object.keys(changes).length > 3) {
            score += 20;
            flags.push('Bulk modification detected (>3 fields)');
        }

        // 3. Context/Sentiment Analysis
        const suspiciousKeywords = ['urgent', 'mistake', 'quick', 'password', 'access', 'immediately'];
        if (context) {
            suspiciousKeywords.forEach(word => {
                if (context.toLowerCase().includes(word)) {
                    score += 10;
                    flags.push(`Keyword Alert: "${word}" in justification`);
                }
            });
        }

        score = Math.min(score, 100);
        let level: RiskAnalysis['level'] = 'LOW';
        if (score > 75) level = 'CRITICAL';
        else if (score > 50) level = 'HIGH';
        else if (score > 25) level = 'MEDIUM';

        return { score, level, flags };
    }

    /**
     * Engine 2: Retention & Flight Risk Signal
     * Calculates risk based on tenure (Honeymoon/Hangover effect) and performance patterns.
     */
    async calculateRetentionRisk(employeeId: string): Promise<RiskAnalysis> {
        const employee = await this.employeeModel.findById(employeeId).populate('primaryPositionId').exec();
        if (!employee) throw new Error('Employee not found');

        let score = 0;
        const flags: string[] = [];

        // 1. Tenure Analysis (Honeymoon-Hangover)
        if (employee.dateOfHire) {
            const tenureMonths = (new Date().getTime() - new Date(employee.dateOfHire).getTime()) / (1000 * 60 * 60 * 24 * 30);

            if (tenureMonths < 6) {
                score += 30; // Onboarding risk
                flags.push('Onboarding Phase (<6 months)');
            } else if (tenureMonths >= 6 && tenureMonths <= 12) {
                score += 60; // The "Cliff"
                flags.push('One-Year "Cliff" Phase (High Risk)');
            } else if (tenureMonths > 24 && tenureMonths < 36) {
                score += 40; // 3-Year Itch
                flags.push('3-Year Stagnation Risk');
            }
        }

        // 2. Performance Stagnation (Mock logic - would check appraisal history)
        if (employee.lastAppraisalScore && employee.lastAppraisalScore < 3.0) {
            score += 20;
            flags.push('Low Performance Indicators');
        }

        score = Math.min(score, 100);
        let level: RiskAnalysis['level'] = 'LOW';
        if (score > 70) level = 'CRITICAL';
        else if (score > 50) level = 'HIGH';
        else if (score > 30) level = 'MEDIUM';

        return { score, level, flags };
    }

    /**
     * Engine 3: Deactivation Impact Analysis
     * Predicts operational impact if this employee leaves.
     */
    async analyzeDeactivationImpact(employeeId: string): Promise<ImpactAnalysis> {
        const employee = await this.employeeModel.findById(employeeId).populate('primaryPositionId primaryDepartmentId').exec();
        if (!employee) throw new Error('Employee not found');

        const positionTitle = (employee.primaryPositionId as any)?.title?.toLowerCase() || '';
        const deptName = (employee.primaryDepartmentId as any)?.name?.toLowerCase() || '';

        // 1. Replacement Velocity
        let replacementDays = 45; // Baseline
        if (positionTitle.includes('head') || positionTitle.includes('director')) replacementDays = 120;
        else if (positionTitle.includes('senior') || positionTitle.includes('manager')) replacementDays = 90;
        else if (deptName.includes('engineering') || deptName.includes('dev')) replacementDays = 75;

        // 2. Capacity Loss
        let capacity = 15;
        if (positionTitle.includes('manager')) capacity = 40;
        if (positionTitle.includes('head')) capacity = 60;

        // 3. Knowledge Loss (Tenure factor)
        const tenureYears = (new Date().getTime() - new Date(employee.dateOfHire).getTime()) / (1000 * 60 * 60 * 24 * 365);
        let knowledgeRisk: ImpactAnalysis['knowledgeLossRisk'] = 'LOW';
        if (tenureYears > 5) knowledgeRisk = 'HIGH';
        else if (tenureYears > 2) knowledgeRisk = 'MEDIUM';

        return { replacementDays, capacityLossScore: capacity, knowledgeLossRisk: knowledgeRisk };
    }

    /**
     * Engine 4: Profile Health & Completeness
     * Checks how complete the profile is for "Gold Standard" verification.
     */
    async getProfileHealth(employeeId: string): Promise<ProfileHealth> {
        const employee = await this.employeeModel.findById(employeeId).exec();
        if (!employee) throw new Error('Employee not found');

        const criticalFields = ['workEmail', 'mobilePhone', 'address.streetAddress', 'emergencyContact'];
        const optionalFields = ['biography', 'profilePicture', 'skills'];

        let filledCount = 0;
        const missing: string[] = [];

        // Check Critical (Mocking some checks as address might be nested)
        if (employee.workEmail) filledCount++; else missing.push('workEmail');
        // ... simplistic check for demo

        // Specific checks for visual completeness
        const issues: string[] = [];
        if (!employee.biography || employee.biography.length < 50) issues.push('Bio is too short or missing');
        if (!employee.skills || employee.skills.length === 0) issues.push('No skills listed');

        const completenessScore = 85; // Mocked for now based on logic

        return {
            completenessScore,
            missingCriticalFields: missing,
            dataQualityIssues: issues,
            lastUpdated: (employee as any).updatedAt as Date
        };
    }
}
