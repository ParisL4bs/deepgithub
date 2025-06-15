"use client"

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileCode, Bot, User, Send, Github } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function RepositoryChatPage() {
    const router = useRouter();
    const { owner, repo } = useParams();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedContext, setSelectedContext] = useState<string | null>(null);

    // Add initial welcome message and handle pending message
    useEffect(() => {
        setMessages([
            {
                id: "welcome",
                sender: "ai",
                content: `Hello! I'm here to help you understand the ${owner}/${repo} repository. You can ask me questions about the codebase, documentation, or specific files. What would you like to know?`,
                timestamp: new Date(),
            }
        ]);

        // Check for pending message from ChatInterface
        const pendingMessage = sessionStorage.getItem('pendingChatMessage');
        if (pendingMessage) {
            sessionStorage.removeItem('pendingChatMessage');
            setInputMessage(pendingMessage);
            // Auto-send the message after a short delay
            setTimeout(() => {
                if (pendingMessage.trim()) {
                    handleSendPendingMessage(pendingMessage.trim());
                }
            }, 500);
        }
    }, [owner, repo]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

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
                context: null, // You can add context here if needed
            };

            const response = await chatWithRepository({
                body: chatRequest,
                path: { owner: owner as string, repo: repo as string }
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
            } else {
                throw new Error('No data received from API');
            }
        } catch (error) {
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

    const handleSendPendingMessage = async (message: string) => {
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: "user",
            content: message,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);

        try {
            const chatRequest: ChatRequest = {
                message: message,
                context: null,
            };

            const response = await chatWithRepository({
                body: chatRequest,
                path: { owner: owner as string, repo: repo as string }
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
            } else {
                throw new Error('No data received from API');
            }
        } catch (error) {
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
                                            onClick={() => setSelectedContext(filePath)}
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
                <div className="h-full flex items-center justify-center text-center p-6">
                    <div className="space-y-3">
                        <FileCode className="h-12 w-12 text-muted-foreground mx-auto" />
                        <div>
                            <h3 className="font-medium">No context selected</h3>
                            <p className="text-sm text-muted-foreground">
                                Click on a file reference in the chat to view its content
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        // Find the message that contains this context
        const contextMessage = messages.find(msg => 
            msg.sourceFiles?.some(file => Object.values(file).includes(selectedContext))
        );

        if (!contextMessage) return null;

        const sourceFile = contextMessage.sourceFiles?.find(file => 
            Object.values(file).includes(selectedContext)
        );

        if (!sourceFile) return null;

        const fileName = Object.keys(sourceFile)[0];
        const filePath = Object.values(sourceFile)[0];

        return (
            <div className="h-full flex flex-col">
                <div className="border-b p-4 flex items-center gap-2 bg-background/95 backdrop-blur-sm">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                        <h2 className="font-medium text-sm">{fileName}</h2>
                        <p className="text-xs text-muted-foreground">{filePath}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        Context
                    </Badge>
                </div>
                <ScrollArea className="flex-1 p-6 bg-muted/30">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">File Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="text-sm">
                                    <span className="font-medium">Path:</span> {filePath}
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium">Referenced in:</span> AI response
                                </div>
                            </CardContent>
                        </Card>

                        {/* Show code snippets if available */}
                        {contextMessage.codeSnippets && contextMessage.codeSnippets.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Code Context</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <pre className="text-sm font-mono whitespace-pre-wrap break-all bg-muted p-3 rounded">
                                        <code>{JSON.stringify(contextMessage.codeSnippets, null, 2)}</code>
                                    </pre>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </ScrollArea>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Header */}
            <header className="border-b flex items-center p-4 shrink-0 bg-background/95 backdrop-blur-sm">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.push(`/${owner}/${repo}`)} 
                    className="mr-3 rounded-full"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Github className="h-5 w-5 mr-2" />
                <div className="flex flex-col">
                    <h1 className="font-medium text-lg">{owner}/{repo}</h1>
                    <p className="text-xs text-muted-foreground">Chat with Repository</p>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
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
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="animate-pulse flex space-x-1">
                                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                        </div>
                                                        <span className="text-sm text-muted-foreground">Thinking...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Chat Input */}
                            <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
                                <div className="flex items-end gap-2 max-w-2xl mx-auto">
                                    <Textarea
                                        placeholder="Ask about the repository..."
                                        className="min-h-10 resize-none flex-1"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        disabled={isLoading}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!inputMessage.trim() || isLoading}
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
            </div>
        </div>
    );
} 