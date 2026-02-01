'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Loader2, Sparkles, Database, Users, Building2, Briefcase, ClipboardList, Timer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { hrAssistantService, HRAssistantRequest } from '@/app/services/openai';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    dataLoaded?: string[];
}

interface AIAssistantProps {
    title?: string;
    placeholder?: string;
    className?: string;
}

interface IncludeDataState {
    employees: boolean;
    organization: boolean;
    leaves: boolean;
    payroll: boolean;
    performance: boolean;
    recruitment: boolean;
    timeManagement: boolean;
    summary: boolean;
    all: boolean;
}

export function AIAssistant({
    title = 'HR AI Assistant',
    placeholder = 'Ask me anything about HR, employees, payroll, leaves...',
    className,
}: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [includeData, setIncludeData] = useState<IncludeDataState>({
        employees: false,
        organization: false,
        leaves: false,
        payroll: false,
        performance: false,
        recruitment: false,
        timeManagement: false,
        summary: true,
        all: false,
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus textarea when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized) {
            textareaRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setError(null);
        setIsLoading(true);

        try {
            // Build conversation history
            const conversationHistory = messages.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }));

            const request: HRAssistantRequest = {
                query: userMessage.content,
                conversationHistory,
                includeData,
            };

            const response = await hrAssistantService.chat(request);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.response,
                timestamp: new Date(),
                dataLoaded: response.dataLoaded,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get response');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        setIsMinimized(false);
    };

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    const toggleDataSource = (key: keyof IncludeDataState) => {
        setIncludeData(prev => {
            const next = { ...prev, [key]: !prev[key] } as IncludeDataState;
            if (key === 'all') {
                return {
                    ...next,
                    employees: next.all,
                    organization: next.all,
                    leaves: next.all,
                    payroll: next.all,
                    performance: next.all,
                    recruitment: next.all,
                    timeManagement: next.all,
                    summary: true,
                };
            }
            if (key === 'summary') {
                return next;
            }
            if (next[key]) {
                return { ...next, all: false };
            }
            return next;
        });
    };

    if (!isOpen) {
        return (
            <Button
                onClick={toggleOpen}
                className={cn(
                    'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
                    'bg-primary hover:bg-primary/90',
                    'transition-transform hover:scale-105',
                    className
                )}
                size="icon"
            >
                <Bot className="h-6 w-6" />
            </Button>
        );
    }

    return (
        <div
            className={cn(
                'fixed bottom-6 right-6 z-50 flex flex-col rounded-xl border bg-background shadow-2xl transition-all duration-200 overflow-hidden',
                isMinimized ? 'h-14 w-80' : 'h-[600px] w-[420px]',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-primary px-4 py-3 rounded-t-xl">
                <div className="flex items-center gap-2 text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-semibold">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                        onClick={toggleMinimize}
                    >
                        {isMinimized ? (
                            <Maximize2 className="h-4 w-4" />
                        ) : (
                            <Minimize2 className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                        onClick={toggleOpen}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Data Sources Toggle */}
                    <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30 flex-wrap">
                        <span className="text-xs text-muted-foreground mr-2">Include:</span>
                        <Button
                            variant={includeData.all ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('all')}
                        >
                            <Database className="h-3 w-3 mr-1" />
                            All
                        </Button>
                        <Button
                            variant={includeData.summary ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('summary')}
                        >
                            <Database className="h-3 w-3 mr-1" />
                            Summary
                        </Button>
                        <Button
                            variant={includeData.employees ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('employees')}
                        >
                            <Users className="h-3 w-3 mr-1" />
                            Employees
                        </Button>
                        <Button
                            variant={includeData.organization ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('organization')}
                        >
                            <Building2 className="h-3 w-3 mr-1" />
                            Org
                        </Button>
                        <Button
                            variant={includeData.leaves ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('leaves')}
                        >
                            <ClipboardList className="h-3 w-3 mr-1" />
                            Leaves
                        </Button>
                        <Button
                            variant={includeData.payroll ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('payroll')}
                        >
                            <Briefcase className="h-3 w-3 mr-1" />
                            Payroll
                        </Button>
                        <Button
                            variant={includeData.performance ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('performance')}
                        >
                            <FileText className="h-3 w-3 mr-1" />
                            Performance
                        </Button>
                        <Button
                            variant={includeData.recruitment ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('recruitment')}
                        >
                            <Briefcase className="h-3 w-3 mr-1" />
                            Recruitment
                        </Button>
                        <Button
                            variant={includeData.timeManagement ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => toggleDataSource('timeManagement')}
                        >
                            <Timer className="h-3 w-3 mr-1" />
                            Time
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 min-h-0 p-4">
                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
                                <Bot className="mb-4 h-12 w-12 opacity-50" />
                                <p className="text-sm font-medium">
                                    Hi! I&apos;m your HR AI Assistant.
                                </p>
                                <p className="text-xs mt-2 max-w-[280px]">
                                    I have access to your HR database. Ask me about employees, departments, payroll, leaves, performance, and more!
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setInput('How many employees do we have?')}
                                    >
                                        Employee count
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setInput('Show me department overview')}
                                    >
                                        Departments
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setInput('Draft a job description for Software Engineer')}
                                    >
                                        Draft JD
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            'flex',
                                            message.role === 'user' ? 'justify-end' : 'justify-start'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'max-w-[85%] rounded-lg px-3 py-2 text-sm text-foreground',
                                                message.role === 'user'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-muted',
                                                message.role === 'assistant' && 'max-h-[320px] overflow-auto'
                                            )}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                            <div className="flex items-center justify-between mt-1 gap-2">
                                                <p className="text-[10px] opacity-70">
                                                    {message.timestamp.toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                                {message.dataLoaded && message.dataLoaded.length > 0 && (
                                                    <p className="text-[10px] opacity-70 flex items-center gap-1">
                                                        <Database className="h-3 w-3" />
                                                        {message.dataLoaded.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-xs text-muted-foreground">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </ScrollArea>

                    {/* Error Display */}
                    {error && (
                        <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {error}
                        </div>
                    )}

                    {/* Input */}
                    <div className="border-t p-4">
                        <div className="flex gap-2">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                className="min-h-[40px] max-h-[120px] resize-none"
                                disabled={isLoading}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                                className="h-10 w-10 shrink-0"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground text-center">
                            Powered by OpenAI • Read-only HR access • Press Enter to send
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AIAssistant;
