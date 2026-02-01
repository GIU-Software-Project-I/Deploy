import api from './api';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatRequest {
    messages: ChatMessage[];
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface CompletionRequest {
    prompt: string;
    systemPrompt?: string;
}

export interface AIResponse {
    success: boolean;
    response: string;
}

export interface AIStatusResponse {
    configured: boolean;
    message: string;
}

export interface HRAssistantRequest {
    query: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    includeData?: {
        employees?: boolean;
        organization?: boolean;
        leaves?: boolean;
        payroll?: boolean;
        performance?: boolean;
        recruitment?: boolean;
        timeManagement?: boolean;
        summary?: boolean;
        all?: boolean;
    };
}

export interface HRAssistantResponse {
    success: boolean;
    response: string;
    dataLoaded?: string[];
}

export interface AssistantCapability {
    name: string;
    description: string;
    examples: string[];
}

/**
 * OpenAI API Service
 * Provides methods to interact with the OpenAI endpoints
 */
export const openaiService = {
    /**
     * Check if OpenAI is configured on the backend
     */
    async getStatus(): Promise<AIStatusResponse> {
        const response = await api.get<AIStatusResponse>('/api/ai/status');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data!;
    },

    /**
     * Send a chat completion request
     */
    async chat(request: ChatRequest): Promise<string> {
        const response = await api.post<AIResponse>('/api/ai/chat', request);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data!.response;
    },

    /**
     * Send a simple completion request
     */
    async complete(prompt: string, systemPrompt?: string): Promise<string> {
        const request: CompletionRequest = { prompt, systemPrompt };
        const response = await api.post<AIResponse>('/api/ai/complete', request);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data!.response;
    },
};

/**
 * HR Assistant API Service
 * Provides methods to interact with the HR-specific AI assistant with database access
 */
export const hrAssistantService = {
    /**
     * Chat with the HR Assistant (with database access)
     */
    async chat(request: HRAssistantRequest): Promise<HRAssistantResponse> {
        const response = await api.post<HRAssistantResponse>('/api/hr-assistant/chat', request);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data!;
    },

    /**
     * Get assistant capabilities
     */
    async getCapabilities(): Promise<{ capabilities: AssistantCapability[] }> {
        const response = await api.get<{ capabilities: AssistantCapability[] }>('/api/hr-assistant/capabilities');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data!;
    },

    /**
     * Generate an AI report
     */
    async generateReport(reportType: string, filters?: Record<string, unknown>): Promise<{ report: string; rawData: Record<string, unknown> }> {
        const response = await api.post<{ success: boolean; report: string; rawData: Record<string, unknown> }>(
            '/api/hr-assistant/report',
            { reportType, filters }
        );
        if (response.error) {
            throw new Error(response.error);
        }
        return { report: response.data!.report, rawData: response.data!.rawData };
    },

    /**
     * Draft an HR document
     */
    async draftDocument(documentType: string, context: Record<string, unknown>): Promise<string> {
        const response = await api.post<{ success: boolean; document: string }>(
            '/api/hr-assistant/draft',
            { documentType, context }
        );
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data!.document;
    },
};

export default openaiService;
