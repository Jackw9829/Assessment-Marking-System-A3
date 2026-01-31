// =============================================
// AI Chatbot Component
// =============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from './ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';
import {
    MessageCircle,
    Send,
    Bot,
    User,
    Loader2,
    X,
    ExternalLink,
    TicketPlus,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import { cn } from './ui/utils';
import {
    ChatMessage,
    ChatbotContext,
    NavigationLink,
    QueryCategory,
    getChatbotContext,
    createSupportTicket,
    logChatbotQuery,
    processMessage,
    isProhibitedRequest,
    generateMessageId,
    generateSessionId,
    generateWelcomeMessage,
    QUICK_ACTIONS,
} from '@/lib/chatbot';

// =============================================
// TYPES
// =============================================

interface AIChatbotProps {
    studentId: string;
    studentName?: string;
    onNavigate?: (tab: string) => void;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function AIChatbot({ studentId, studentName, onNavigate }: AIChatbotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState<ChatbotContext | null>(null);
    const [sessionId] = useState(() => generateSessionId());
    const [showEscalationDialog, setShowEscalationDialog] = useState(false);
    const [isCreatingTicket, setIsCreatingTicket] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load context when chatbot opens
    useEffect(() => {
        if (isOpen && !context) {
            loadContext();
        }
    }, [isOpen]);

    // Initialize with welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0 && context) {
            const welcomeMessage: ChatMessage = {
                id: generateMessageId(),
                role: 'assistant',
                content: generateWelcomeMessage(context.student_name),
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
        }
    }, [isOpen, context]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const loadContext = async () => {
        const data = await getChatbotContext();
        setContext(data);
    };

    const handleSendMessage = useCallback(async (messageText?: string) => {
        const text = messageText || inputValue.trim();
        if (!text || isLoading) return;

        setInputValue('');
        setIsLoading(true);

        // Add user message
        const userMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            // Check for prohibited requests first
            const prohibited = isProhibitedRequest(text);
            if (prohibited.prohibited) {
                const warningMessage: ChatMessage = {
                    id: generateMessageId(),
                    role: 'assistant',
                    content: prohibited.reason!,
                    timestamp: new Date(),
                    metadata: { category: 'unknown' },
                };
                setMessages(prev => [...prev, warningMessage]);
                await logChatbotQuery(sessionId, 'unknown', 'fallback');
                setIsLoading(false);
                return;
            }

            // Process the message
            const response = await processMessage(text, context);

            // Log analytics
            await logChatbotQuery(sessionId, response.category, response.responseType);

            // Add assistant response
            const assistantMessage: ChatMessage = {
                id: generateMessageId(),
                role: 'assistant',
                content: response.message,
                timestamp: new Date(),
                metadata: {
                    category: response.category,
                    links: response.links,
                },
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Suggest escalation if appropriate
            if (response.suggestEscalation) {
                setTimeout(() => {
                    const escalationMessage: ChatMessage = {
                        id: generateMessageId(),
                        role: 'assistant',
                        content: "Would you like me to create a support ticket so a staff member can help you?",
                        timestamp: new Date(),
                        metadata: { isEscalation: true },
                    };
                    setMessages(prev => [...prev, escalationMessage]);
                }, 500);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            const errorMessage: ChatMessage = {
                id: generateMessageId(),
                role: 'assistant',
                content: "I'm sorry, I encountered an error. Please try again.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, context, sessionId]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleQuickAction = (query: string) => {
        handleSendMessage(query);
    };

    const handleNavigate = (tab: string) => {
        if (onNavigate) {
            onNavigate(tab);
            setIsOpen(false);
        }
    };

    const handleCreateTicket = async () => {
        setIsCreatingTicket(true);
        try {
            const result = await createSupportTicket(
                'Chatbot Escalation Request',
                'general',
                messages
            );

            if (result.success) {
                const successMessage: ChatMessage = {
                    id: generateMessageId(),
                    role: 'assistant',
                    content: `✅ Support ticket created successfully!\n\n**Reference:** ${result.reference}\n\nA staff member will review your query and respond as soon as possible.`,
                    timestamp: new Date(),
                    metadata: { ticketReference: result.reference },
                };
                setMessages(prev => [...prev, successMessage]);
                await logChatbotQuery(sessionId, 'unknown', 'escalation');
                toast.success(`Support ticket ${result.reference} created`);
            } else {
                toast.error('Failed to create support ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            toast.error('Failed to create support ticket');
        } finally {
            setIsCreatingTicket(false);
            setShowEscalationDialog(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        if (context) {
            const welcomeMessage: ChatMessage = {
                id: generateMessageId(),
                role: 'assistant',
                content: generateWelcomeMessage(context.student_name),
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
        }
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button
                        size="lg"
                        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
                    >
                        <MessageCircle className="h-6 w-6" />
                        <span className="sr-only">Open AI Assistant</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0 flex flex-col">
                    <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5" />
                                <SheetTitle className="text-white">EduConnect Assistant</SheetTitle>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI
                            </Badge>
                        </div>
                        <SheetDescription className="text-blue-100 text-sm">
                            Ask me about assessments, deadlines, and grades
                        </SheetDescription>
                    </SheetHeader>

                    {/* Messages Area */}
                    <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    onNavigate={handleNavigate}
                                    onEscalate={() => setShowEscalationDialog(true)}
                                />
                            ))}
                            {isLoading && (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Bot className="h-5 w-5" />
                                    <div className="flex gap-1">
                                        <span className="animate-bounce">•</span>
                                        <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>•</span>
                                        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Quick Actions */}
                    {messages.length <= 1 && (
                        <div className="px-4 py-2 border-t bg-gray-50">
                            <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                            <div className="flex flex-wrap gap-2">
                                {QUICK_ACTIONS.map((action, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => handleQuickAction(action.query)}
                                    >
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="px-4 py-3 border-t bg-white">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                placeholder="Ask a question..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button
                                size="icon"
                                onClick={() => handleSendMessage()}
                                disabled={!inputValue.trim() || isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-gray-400">
                                I provide guidance only. I cannot submit or modify data.
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-gray-400"
                                onClick={handleClearChat}
                            >
                                Clear chat
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Escalation Dialog */}
            <Dialog open={showEscalationDialog} onOpenChange={setShowEscalationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Support Ticket</DialogTitle>
                        <DialogDescription>
                            This will create a support ticket with your conversation history so a
                            staff member can help you.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-medium">What happens next?</p>
                                    <ul className="mt-1 space-y-1 text-amber-700">
                                        <li>• A support ticket will be created</li>
                                        <li>• You'll receive a reference number</li>
                                        <li>• Staff will respond via the system</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEscalationDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateTicket} disabled={isCreatingTicket}>
                            {isCreatingTicket ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <TicketPlus className="h-4 w-4 mr-2" />
                                    Create Ticket
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// =============================================
// MESSAGE BUBBLE COMPONENT
// =============================================

interface MessageBubbleProps {
    message: ChatMessage;
    onNavigate: (tab: string) => void;
    onEscalate: () => void;
}

function MessageBubble({ message, onNavigate, onEscalate }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isEscalation = message.metadata?.isEscalation;

    return (
        <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
                <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                    </div>
                </div>
            )}
            <div
                className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2',
                    isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                )}
            >
                {/* Message Content */}
                <div className="text-sm whitespace-pre-wrap">
                    <MarkdownContent content={message.content} />
                </div>

                {/* Navigation Links */}
                {message.metadata?.links && message.metadata.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {message.metadata.links.map((link, index) => (
                            <Button
                                key={index}
                                variant="secondary"
                                size="sm"
                                className="text-xs"
                                onClick={() => onNavigate(link.tab)}
                            >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {link.label}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Escalation Button */}
                {isEscalation && (
                    <div className="mt-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                            onClick={onEscalate}
                        >
                            <TicketPlus className="h-3 w-3 mr-1" />
                            Yes, create a support ticket
                        </Button>
                    </div>
                )}

                {/* Ticket Reference */}
                {message.metadata?.ticketReference && (
                    <div className="mt-2 flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-mono">{message.metadata.ticketReference}</span>
                    </div>
                )}

                {/* Timestamp */}
                <div className={cn(
                    'text-xs mt-1',
                    isUser ? 'text-blue-200' : 'text-gray-400'
                )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
            {isUser && (
                <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================
// MARKDOWN CONTENT RENDERER
// =============================================

interface MarkdownContentProps {
    content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
    // Simple markdown parsing for bold, bullet points, headers
    const lines = content.split('\n');

    return (
        <>
            {lines.map((line, index) => {
                // Headers
                if (line.startsWith('## ')) {
                    return (
                        <h3 key={index} className="font-bold text-base mt-2 mb-1">
                            {line.substring(3)}
                        </h3>
                    );
                }
                if (line.startsWith('### ')) {
                    return (
                        <h4 key={index} className="font-semibold mt-2 mb-1">
                            {line.substring(4)}
                        </h4>
                    );
                }

                // Bullet points
                if (line.startsWith('- ')) {
                    return (
                        <div key={index} className="flex gap-2 ml-2">
                            <span>•</span>
                            <span>{parseBold(line.substring(2))}</span>
                        </div>
                    );
                }

                // Numbered lists
                if (/^\d+\.\s/.test(line)) {
                    const match = line.match(/^(\d+)\.\s(.*)$/);
                    if (match) {
                        return (
                            <div key={index} className="flex gap-2 ml-2">
                                <span>{match[1]}.</span>
                                <span>{parseBold(match[2])}</span>
                            </div>
                        );
                    }
                }

                // Blockquotes
                if (line.startsWith('> ')) {
                    return (
                        <div key={index} className="border-l-2 border-gray-300 pl-2 ml-2 italic text-gray-600">
                            {parseBold(line.substring(2))}
                        </div>
                    );
                }

                // Empty lines
                if (line.trim() === '') {
                    return <div key={index} className="h-2" />;
                }

                // Regular text
                return (
                    <div key={index}>
                        {parseBold(line)}
                    </div>
                );
            })}
        </>
    );
}

function parseBold(text: string): React.ReactNode {
    // Parse **bold** text
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={index} className="font-semibold">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return part;
    });
}

export default AIChatbot;
