'use client';

import { useState, useCallback } from 'react';
import { openaiService, ChatMessage } from '@/app/services/openai';

interface UseOpenAIOptions {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

interface UseOpenAIReturn {
    // State
    isLoading: boolean;
    error: string | null;
    isConfigured: boolean | null;

    // Methods
    chat: (messages: ChatMessage[]) => Promise<string | null>;
    complete: (prompt: string) => Promise<string | null>;
    checkStatus: () => Promise<boolean>;
    clearError: () => void;
}

/**
 * React hook for interacting with OpenAI API
 *
 * @example
 * ```tsx
 * const { complete, isLoading, error } = useOpenAI({ systemPrompt: 'You are an HR assistant' });
 *
 * const handleSubmit = async () => {
 *   const response = await complete('Help me write a job description for a software engineer');
 *   console.log(response);
 * };
 * ```
 */
export function useOpenAI(options: UseOpenAIOptions = {}): UseOpenAIReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const checkStatus = useCallback(async (): Promise<boolean> => {
        try {
            const status = await openaiService.getStatus();
            setIsConfigured(status.configured);
            return status.configured;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to check AI status');
            setIsConfigured(false);
            return false;
        }
    }, []);

    const chat = useCallback(async (messages: ChatMessage[]): Promise<string | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await openaiService.chat({
                messages,
                systemPrompt: options.systemPrompt,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
            });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'AI request failed';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [options.systemPrompt, options.temperature, options.maxTokens]);

    const complete = useCallback(async (prompt: string): Promise<string | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await openaiService.complete(prompt, options.systemPrompt);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'AI request failed';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [options.systemPrompt]);

    return {
        isLoading,
        error,
        isConfigured,
        chat,
        complete,
        checkStatus,
        clearError,
    };
}

export default useOpenAI;
