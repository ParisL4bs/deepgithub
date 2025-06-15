"use client"

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useParams } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ModelOption {
  id: string;
  name: string;
  icon: JSX.Element;
  isPro: boolean;
}

interface ChatInterfaceProps {
  owner?: string;
  repo?: string;
}

export function ChatInterface({ owner, repo }: ChatInterfaceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    icon: <div className="rounded-full bg-primary/80 w-5 h-5 flex items-center justify-center text-white text-xs">AI</div>,
    isPro: false,
  });
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const params = useParams();

  // Get repository info from props or URL params
  const repoOwner = owner || (params?.owner as string);
  const repoName = repo || (params?.repo as string);

  const modelOptions: ModelOption[] = [
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      icon: <div className="rounded-full bg-primary/80 w-5 h-5 flex items-center justify-center text-white text-xs">AI</div>,
      isPro: false,
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      icon: <div className="rounded-full bg-primary/80 w-5 h-5 flex items-center justify-center text-white text-xs">AI</div>,
      isPro: false,
    },
    {
      id: "gpt-4.5-preview",
      name: "GPT-4.5 Preview",
      icon: <div className="rounded-full bg-primary/80 w-5 h-5 flex items-center justify-center text-white text-xs">AI</div>,
      isPro: true,
    },
    {
      id: "gemini-pro",
      name: "Gemini 2.5 Pro",
      icon: <div className="rounded-full bg-blue-400 w-5 h-5 flex items-center justify-center text-white text-xs">G</div>,
      isPro: false,
    },
    {
      id: "gemini-flash",
      name: "Gemini 2.0 Flash",
      icon: <div className="rounded-full bg-blue-400 w-5 h-5 flex items-center justify-center text-white text-xs">G</div>,
      isPro: false,
    },
    {
      id: "claude-3.7",
      name: "Claude 3.7 Sonnet",
      icon: <div className="rounded-full bg-amber-400 w-5 h-5 flex items-center justify-center text-white text-xs">C</div>,
      isPro: true,
    },
  ];

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    console.log("Sending message:", inputMessage);
    console.log("Using model:", selectedModel.name);

    // Navigate to repository-specific chat page if we have repo info
    if (repoOwner && repoName) {
      // Store the message in sessionStorage so it can be sent on the chat page
      sessionStorage.setItem('pendingChatMessage', inputMessage.trim());
      router.push(`/${repoOwner}/${repoName}/chat`);
    } else {
      // Fallback to generic chat page
      router.push("/chat-details");
    }

    setInputMessage("");

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectModel = (model: ModelOption) => {
    setSelectedModel(model);
    setIsModelSelectorOpen(false);
  };

  const handleModelSelectorInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      <div
        className={cn(
          "bg-background/80 backdrop-blur-sm border border-border rounded-lg shadow-lg transition-all duration-200 ease-in-out",
          isExpanded ? "p-4" : "p-3"
        )}
      >
        <div className="flex items-center gap-2">
          <Textarea
            ref={inputRef}
            placeholder={isExpanded ? "Ask about the documentation..." : "Ask about the repository"}
            className={cn(
              "min-h-10 resize-none flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70",
              isExpanded ? "py-2" : "py-1"
            )}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsExpanded(true)}
            onBlur={(e) => {
              const isModelSelectorClick =
                e.relatedTarget &&
                (e.relatedTarget.closest('[data-model-selector]') !== null);
              if (!inputMessage && !isModelSelectorClick && !isModelSelectorOpen) {
                setIsExpanded(false);
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
          >
            {inputMessage.trim() ? <Send className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>Ask questions about the repository or documentation</span>
            <div className="flex items-center gap-2" data-model-selector="true" onClick={handleModelSelectorInteraction}>
              <Popover
                open={isModelSelectorOpen}
                onOpenChange={setIsModelSelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs flex items-center gap-2 bg-background/50 border-none hover:bg-accent/50"
                  >
                    {selectedModel.icon}
                    <span>{selectedModel.name}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-0"
                  align="end"
                  sideOffset={5}
                >
                  <div className="max-h-60 overflow-y-auto p-1">
                    {modelOptions.map((model) => (
                      <button
                        key={model.id}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
                          selectedModel.id === model.id && "bg-accent/30"
                        )}
                        onClick={() => handleSelectModel(model)}
                      >
                        <div className="flex items-center gap-2">
                          {model.icon}
                          <span>{model.name}</span>
                        </div>
                        {model.isPro && (
                          <Badge variant="outline" className="text-xs px-2 py-0 h-5 flex items-center">
                            Pro
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
