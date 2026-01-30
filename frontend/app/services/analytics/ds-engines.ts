
/**
 * Data Science Engines for HR Master Data Management
 * Heuristic models that can be scaled to ML models (Isolation Forest, KNN, etc.)
 */

import { Employee } from "@/components/hr-admin";

export interface RiskAnalysis {
    score: number; // 0 to 100
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    flags: string[];
}

export const DS_ENGINES = {
    /**
     * US-E2-03: Anomaly Detection for Profile Changes
     * Analyzes proposed changes and assigns a risk score.
     */
    analyzeChangeRequestRisk: (changes: Record<string, any>, context: string): RiskAnalysis => {
        let score = 0;
        const flags: string[] = [];

        const HIGH_SENSITIVITY_FIELDS = ['bankAccountNumber', 'bankName', 'nationalId', 'workEmail'];
        const MEDIUM_SENSITIVITY_FIELDS = ['address.streetAddress', 'mobilePhone', 'fullName'];

        // 1. Sensitivity Analysis
        Object.keys(changes).forEach(field => {
            if (HIGH_SENSITIVITY_FIELDS.includes(field)) {
                score += 40;
                flags.push(`High Sensitivity Field: ${field}`);
            } else if (MEDIUM_SENSITIVITY_FIELDS.includes(field)) {
                score += 15;
                flags.push(`Medium Sensitivity Field: ${field}`);
            }
        });

        // 2. Volume Analysis (Anomaly Detection Heuristic: Unusual amount of changes)
        if (Object.keys(changes).length > 3) {
            score += 20;
            flags.push('Bulk change detected (>3 fields)');
        }

        // 3. Keyword Analysis in Reason (Sentiment/Intent Analysis)
        const suspiciousKeywords = ['urgent', 'mistake', 'quick', 'password', 'access'];
        suspiciousKeywords.forEach(word => {
            if (context.toLowerCase().includes(word)) {
                score += 10;
                flags.push(`Keyword Alert: "${word}" in justification`);
            }
        });

        // Normalize
        score = Math.min(score, 100);

        let level: RiskAnalysis['level'] = 'LOW';
        if (score > 75) level = 'CRITICAL';
        else if (score > 50) level = 'HIGH';
        else if (score > 25) level = 'MEDIUM';

        return { score, level, flags };
    },

    /**
     * US-E7-05: Predictive Role Recommendation
     * Suggests roles based on employee position and department context (KNN-like)
     */
    recommendRoles: (employee: Partial<Employee>): string[] => {
        const recommendations: string[] = ['department employee'];
        const position = employee.primaryPositionId?.title?.toLowerCase() || '';
        const department = employee.primaryDepartmentId?.name?.toLowerCase() || '';

        // Position-based patterns
        if (position.includes('head') || position.includes('director') || position.includes('lead')) {
            recommendations.push('department head');
        }
        if (position.includes('hr') || department.includes('human resources')) {
            recommendations.push('HR Employee');
            if (position.includes('manager')) recommendations.push('HR Manager');
        }
        if (position.includes('payroll') || department.includes('finance')) {
            recommendations.push('Payroll Specialist');
        }
        if (position.includes('admin') || position.includes('system')) {
            recommendations.push('System Admin');
        }

        return Array.from(new Set(recommendations));
    },

    /**
     * US-EP-05: Stability / Attrition Signal
     * Heuristic for employee retention risk based on tenure and status
     */
    calculateRetentionSignal: (employee: Partial<Employee>): number => {
        if (!employee.dateOfHire) return 0;

        const tenureMonths = (new Date().getTime() - new Date(employee.dateOfHire).getTime()) / (1000 * 60 * 60 * 24 * 30);

        // Classic "Honeymoon-Hangover" pattern: Higher risk around 6-12 months and 2+ years
        if (tenureMonths < 6) return 20; // Learning phase
        if (tenureMonths >= 6 && tenureMonths <= 12) return 65; // High risk window
        if (tenureMonths > 12 && tenureMonths < 24) return 40;
        return 25; // Stable
    },

    /**
     * US-EP-05: Deactivation Impact Analysis
     * Predicts the impact on the team when an employee is deactivated
     */
    analyzeDeactivationImpact: (employee: Partial<Employee>) => {
        const position = employee.primaryPositionId?.title?.toLowerCase() || '';
        const department = employee.primaryDepartmentId?.name?.toLowerCase() || '';

        // Predict replacement complexity (days to hire)
        let replacementDays = 45; // Baseline
        if (position.includes('lead') || position.includes('director') || position.includes('head')) {
            replacementDays = 120;
        } else if (position.includes('senior') || position.includes('manager')) {
            replacementDays = 90;
        } else if (department.includes('technology') || department.includes('engineering')) {
            replacementDays = 75;
        }

        // Capacity impact (heuristic)
        let capacityLoss = 10; // Baseline for individual contributor
        if (position.includes('head') || position.includes('manager')) {
            capacityLoss = 40; // High leadership impact
        }

        return { replacementDays, capacityLoss };
    }
};
