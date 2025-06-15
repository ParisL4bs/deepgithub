"use client"

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileCode, Bot, User, Send, Github, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { chatWithRepository, type ChatRequest, type ChatResponse } from "@/app/clientService";
import { toast } from "sonner";

interface ChatMessage {
    id: string;
    sender: "user" | "ai";
    content: string;
    timestamp: Date;
    codeSnippets?: Array<{ [key: string]: unknown }>;
    sourceFiles?: Array<{ [key: string]: string }>;
}

function ChatDetailsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get repository info from URL parameters
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showCodePanel, setShowCodePanel] = useState(false);
    const [selectedContext, setSelectedContext] = useState<string | null>(null);

    const handleSendPendingMessage = useCallback(async (message: string) => {
        if (!owner || !repo) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: "user",
            content: message,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const chatRequest: ChatRequest = {
                message: message,
                context: null,
            };

            const response = await chatWithRepository({
                body: chatRequest,
                path: { owner, repo }
            });

            if (response.data) {
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    sender: "ai",
                    content: response.data.response,
                    timestamp: new Date(),
                    codeSnippets: response.data.code_snippets,
                    sourceFiles: response.data.source_files,
                };

                setMessages(prev => [...prev, aiMessage]);

                // Show code panel if there are source files
                if (response.data.source_files && response.data.source_files.length > 0) {
                    setShowCodePanel(true);
                }
            } else {
                throw new Error('No data received from API');
            }
        } catch (error) {
            console.error("Error sending pending message:", error);
            toast.error("Failed to send message. Please try again.");
            
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: "ai",
                content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [owner, repo]);

    // Initialize with welcome message and handle pending message
    useEffect(() => {
        const welcomeMessage: ChatMessage = {
            id: "welcome",
            sender: "ai",
            content: owner && repo 
                ? `Hello! I'm here to help you understand the ${owner}/${repo} repository. You can ask me questions about the codebase, documentation, or specific files. What would you like to know?`
                : "Hello! I'm here to help you with your questions. Please provide a repository owner and name in the URL parameters to get started.",
            timestamp: new Date(),
        };

        setMessages([welcomeMessage]);

        // Check for pending message from ChatInterface
        const pendingMessage = sessionStorage.getItem('pendingChatMessage');
        if (pendingMessage && owner && repo) {
            sessionStorage.removeItem('pendingChatMessage');
            setInputMessage(pendingMessage);
            // Auto-send the message after a short delay
            setTimeout(() => {
                if (pendingMessage.trim()) {
                    handleSendPendingMessage(pendingMessage.trim());
                }
            }, 500);
        }
    }, [owner, repo, handleSendPendingMessage]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading || !owner || !repo) return;

        const messageToSend = inputMessage.trim();
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: "user",
            content: messageToSend,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);

        try {
            const chatRequest: ChatRequest = {
                message: messageToSend,
                context: null,
            };

            console.log('=== CHAT DEBUG ===');
            console.log('Sending chat request:', chatRequest);
            console.log('To repository:', { owner, repo });

            const response = await chatWithRepository({
                body: chatRequest,
                path: { owner, repo }
            });

            console.log('Received response:', response);

            if (response.data) {
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    sender: "ai",
                    content: response.data.response,
                    timestamp: new Date(),
                    codeSnippets: response.data.code_snippets,
                    sourceFiles: response.data.source_files,
                };

                setMessages(prev => [...prev, aiMessage]);

                // Show code panel if there are source files
                if (response.data.source_files && response.data.source_files.length > 0) {
                    setShowCodePanel(true);
                }
            } else {
                throw new Error('No data received from API');
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message. Please try again.");
            
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: "ai",
                content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const renderMessage = (message: ChatMessage) => {
        return (
            <div key={message.id} className="animate-fade-in">
                <div className="flex items-start gap-4">
                    <Avatar className={cn(
                        "h-8 w-8 shrink-0",
                        message.sender === 'user' 
                            ? "bg-primary/10 text-primary" 
                            : "bg-primary text-primary-foreground"
                    )}>
                        <AvatarFallback>
                            {message.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                        <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>

                        {/* Show source files if available */}
                        {message.sourceFiles && message.sourceFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {message.sourceFiles.map((file, index) => {
                                    const fileName = Object.keys(file)[0];
                                    const filePath = Object.values(file)[0];
                                    return (
                                        <Button
                                            key={`${message.id}-file-${fileName}-${index}`}
                                            variant="outline"
                                            size="sm"
                                            className={`flex items-center gap-2 transition-all ${
                                                selectedContext === filePath
                                                    ? "border-primary/50 bg-primary/5 text-primary"
                                                    : ""
                                            }`}
                                            onClick={() => {
                                                setSelectedContext(filePath);
                                                if (!showCodePanel) {
                                                    setShowCodePanel(true);
                                                }
                                            }}
                                        >
                                            <FileCode className="h-3.5 w-3.5" />
                                            {fileName}
                                        </Button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderContextPanel = () => {
        if (!selectedContext) {
            return (
                <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center text-muted-foreground">
                        <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a file from the chat to view its content</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col">
                <div className="border-b p-4 flex items-center gap-2 bg-background/95 backdrop-blur-sm">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-medium text-sm">{selectedContext}</h2>
                </div>
                <ScrollArea className="flex-1 p-6 bg-muted/30">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                        <code>File content would be displayed here...</code>
                    </pre>
                </ScrollArea>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Header */}
            <header className="border-b flex items-center p-4 shrink-0 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.push(owner && repo ? `/${owner}/${repo}` : "/")} 
                    className="mr-3 rounded-full"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                {owner && repo ? (
                    <>
                        <Github className="h-5 w-5 mr-2" />
                        <div className="flex flex-col">
                            <h1 className="font-medium text-lg">{owner}/{repo}</h1>
                            <p className="text-xs text-muted-foreground">Chat with Repository</p>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col">
                        <h1 className="font-medium text-lg">Chat Session</h1>
                        <p className="text-xs text-muted-foreground">AI Assistant</p>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {showCodePanel ? (
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={60} minSize={40} maxSize={80}>
                            <div className="h-full flex flex-col">
                                <ScrollArea className="flex-1 px-4 py-6">
                                    <div className="space-y-8 max-w-2xl mx-auto pb-6">
                                        {messages.map(renderMessage)}
                                        
                                        {isLoading && (
                                            <div className="animate-fade-in">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                                        <AvatarFallback>
                                                            <Bot className="h-4 w-4" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                                            Thinking...
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
                                    <div className="flex items-end gap-2 max-w-2xl mx-auto">
                                        <Textarea
                                            placeholder={owner && repo ? "Ask about the repository..." : "Please provide repository info in URL"}
                                            className="min-h-10 resize-none flex-1"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            disabled={isLoading || !owner || !repo}
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={!inputMessage.trim() || isLoading || !owner || !repo}
                                            size="icon"
                                            className="h-10 w-10"
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle className="bg-border" />

                        <ResizablePanel defaultSize={40} minSize={20} maxSize={60}>
                            {renderContextPanel()}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                ) : (
                    <div className="h-full flex flex-col">
                        <ScrollArea className="flex-1 px-4 py-6">
                            <div className="space-y-8 max-w-2xl mx-auto pb-6">
                                {messages.map(renderMessage)}
                                
                                {isLoading && (
                                    <div className="animate-fade-in">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                                <AvatarFallback>
                                                    <Bot className="h-4 w-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                                    Thinking...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
                            <div className="flex items-end gap-2 max-w-2xl mx-auto">
                                <Textarea
                                    placeholder={owner && repo ? "Ask about the repository..." : "Please provide repository info in URL"}
                                    className="min-h-10 resize-none flex-1"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    disabled={isLoading || !owner || !repo}
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!inputMessage.trim() || isLoading || !owner || !repo}
                                    size="icon"
                                    className="h-10 w-10"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Toggle code panel button - only show if there are source files */}
            {messages.some(msg => msg.sourceFiles && msg.sourceFiles.length > 0) && (
                <Button
                    variant="outline"
                    size="sm"
                    className="fixed bottom-24 right-4 z-10 rounded-full shadow-md"
                    onClick={() => setShowCodePanel(!showCodePanel)}
                >
                    {showCodePanel ? (
                        <>
                            <ChevronUp className="mr-1 h-4 w-4" />
                            Hide Code
                        </>
                    ) : (
                        <>
                            <ChevronDown className="mr-1 h-4 w-4" />
                            Show Code
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <header className="border-b flex items-center p-4 shrink-0 bg-background/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="h-5 w-5 bg-muted animate-pulse rounded" />
                    <div className="flex flex-col gap-1">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    </div>
                </div>
            </header>
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        </div>
    );
}

export default function ChatDetails() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ChatDetailsContent />
        </Suspense>
    );
}