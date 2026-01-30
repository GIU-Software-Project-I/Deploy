import api from "@/app/services/api";

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
    detectedAt: string;
}

export interface ForecastResponse {
    nextMonthPrediction: number;
    confidence: number;
}

export const payrollAnalyticsService = {
    getStory: async (entityId?: string): Promise<PayrollStory> => {
        const query = entityId ? `?entityId=${entityId}` : '';
        const response = await api.get<PayrollStory>(`/payroll-analytics/story${query}`);
        // @ts-ignore
        return response.data;
    },

    getGhostEmployees: async (runId: string): Promise<PayrollAnomaly[]> => {
        const response = await api.get<PayrollAnomaly[]>(`/payroll-analytics/anomalies/ghosts/${runId}`);
        // @ts-ignore
        return response.data;
    },

    getForecast: async (): Promise<ForecastResponse> => {
        const response = await api.get<ForecastResponse>('/payroll-analytics/forecast');
        // @ts-ignore
        return response.data;
    }
};


export interface RiskAnalysis {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    flags: string[];
}

export interface ImpactAnalysis {
    replacementDays: number;
    capacityLossScore: number;
    knowledgeLossRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProfileHealth {
    completenessScore: number;
    missingCriticalFields: string[];
    dataQualityIssues: string[];
    lastUpdated: Date;
}

export const ProfileAnalyticsService = {
    /**
     * Engine 1: Risk Analysis
     */
    analyzeChangeRisk: async (data: { changes: Record<string, any>; context: string }) => {
        const response = await api.post<RiskAnalysis>('/employee/analytics/change-risk', data);
        return response.data;
    },

    getRetentionRisk: async (employeeId: string) => {
        const response = await api.get<RiskAnalysis>(`/employee/analytics/${employeeId}/retention-risk`);
        return response.data;
    },

    /**
     * Engine 2: Impact Analysis
     */
    getDeactivationImpact: async (employeeId: string) => {
        const response = await api.get<ImpactAnalysis>(`/employee/analytics/${employeeId}/impact`);
        return response.data;
    },

    /**
     * Engine 3: Profile Health
     */
    getProfileHealth: async (employeeId: string) => {
        const response = await api.get<ProfileHealth>(`/employee/analytics/${employeeId}/health`);
        return response.data;
    }
};


export interface AttritionRiskResponse {
    employeeId: string;
    name: string;
    riskScore: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    factors: string[];
    updatedAt: string;
}

export interface OrgPulseResponse {
    headcount: number;
    genderDiversity: { _id: string; count: number }[];
    avgPerformanceScore: number;
    activeAppraisals: number;
    timestamp: string;
}

export interface SkillMatrixResponse {
    skill: string;
    avgLevel: number;
    headcount: number;
    topTalent: { name: string; level: number }[];
}

export const analyticsService = {
    getOrgPulse: async (): Promise<OrgPulseResponse> => {
        const response = await api.get('/analytics/org-pulse');
        return response.data as OrgPulseResponse;
    },

    getAttritionRisk: async (employeeId: string): Promise<AttritionRiskResponse> => {
        const response = await api.get(`/analytics/attrition/${employeeId}`);
        return response.data as AttritionRiskResponse;
    },

    getDepartmentSkills: async (departmentId: string): Promise<SkillMatrixResponse[]> => {
        const response = await api.get(`/analytics/department/${departmentId}/skills`);
        return response.data as SkillMatrixResponse[];
    },
};