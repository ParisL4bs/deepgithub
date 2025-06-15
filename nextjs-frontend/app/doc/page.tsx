"use client"

import { useState, useEffect } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarNavigation } from "@/components/layout/SidebarNavigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { DocContent } from "@/components/docs/DocContent";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { SearchResults } from "@/components/search/SearchResults";
import { Search, X, Github, Twitter, Linkedin } from "lucide-react";
import { IndexationStatus } from "@/components/indexation/IndexationStatus";
import { toast } from "sonner";

const mockSearchResults = (query: string) => {
    if (!query) return [];

    return [
        {
            id: "1",
            title: "Button Component",
            path: "/docs/components/button",
            excerpt: "The Button component is a versatile UI element used for triggering actions.",
            matches: [
                `The <strong>${query}</strong> component is a versatile UI element`,
                `Button with Icon example shows how to use icons with <strong>${query}</strong>s`
            ]
        },
        {
            id: "2",
            title: "Installation Guide",
            path: "/docs/getting-started/installation",
            excerpt: "Setting up the Documentation Explorer is quick and straightforward.",
            matches: [
                `To install the required packages for the ${query} explorer`,
                `Configure your ${query} settings in the configuration file`
            ]
        },
        {
            id: "3",
            title: "API Reference",
            path: "/docs/api/endpoints",
            excerpt: "Complete reference of all available API endpoints and their parameters.",
            matches: [
                `The API provides ${query}-related functionality through various endpoints`,
                `For advanced ${query} configuration, use the following parameters`
            ]
        },
    ];
};

const Index = () => {
    const [selectedPath, setSelectedPath] = useState("/docs/getting-started/introduction");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeDocSearchQuery, setActiveDocSearchQuery] = useState("");

    const [isRepositoryIndexed, setIsRepositoryIndexed] = useState(false);

    const repositoryData = {
        name: "huggingface/transformers",
        repoSize: "138MB",
        estimatedTime: "15",
        price: "$19.99",
        indexedCount: 3247,
        recentlyIndexed: [
            { name: "react", avatar: "/placeholder.svg" },
            { name: "vue", avatar: "/placeholder.svg" },
            { name: "angular", avatar: "/placeholder.svg" },
        ]
    };

    const handleSelectTreeItem = (item: any) => {
        setSelectedPath(item.path);
    };

    const handleSelectSearchResult = (result: any) => {
        setSelectedPath(result.path);
        setActiveDocSearchQuery(searchQuery);
        setIsSearchDialogOpen(false);
    };

    const handleIndexingComplete = () => {
        setIsRepositoryIndexed(true);
        toast.success("Repository indexed successfully!");
    };

    useEffect(() => {
        if (!isSearchDialogOpen) return;

        if (searchQuery) {
            setIsSearching(true);

            const timer = setTimeout(() => {
                setSearchResults(mockSearchResults(searchQuery));
                setIsSearching(false);
            }, 500);

            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, isSearchDialogOpen]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setIsSearchDialogOpen(true);
            }
            if (e.key === "Escape" && isSearchDialogOpen) {
                setIsSearchDialogOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isSearchDialogOpen]);

    useEffect(() => {
        const checkIndexationStatus = async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));

            setIsRepositoryIndexed(false);
        };

        checkIndexationStatus();
    }, []);

    const renderMainContent = () => (
        <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
                defaultSize={20}
                minSize={15}
                maxSize={30}
                className="bg-sidebar"
            >
                <SidebarNavigation
                    onSelectItem={handleSelectTreeItem}
                />
            </ResizablePanel>

            <ResizableHandle className="w-1 bg-border" />

            <ResizablePanel defaultSize={80}>
                <DocContent
                    path={selectedPath}
                    searchQuery={activeDocSearchQuery}
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <header className="border-b flex items-center justify-between p-3 shrink-0">
                <div className="flex items-center space-x-2">
                    <Github className="h-6 w-6" />
                    <div className="flex flex-col">
                        <h1 className="font-semibold">HuggingFace Transformers</h1>
                        <p className="text-xs text-muted-foreground">Repository Explorer</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <span className="mr-2">Indexed by</span>
                        <div className="flex space-x-1">
                            <a
                                href="https://twitter.com/erudictus"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                                <Twitter className="h-4 w-4 text-primary" />
                                <span className="sr-only">Twitter</span>
                            </a>
                            <a
                                href="https://linkedin.com/in/thomaschlt"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                                <Linkedin className="h-4 w-4 text-primary" />
                                <span className="sr-only">LinkedIn</span>
                            </a>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
                <div className={`h-full ${!isRepositoryIndexed ? 'blur-sm' : ''}`}>
                    {renderMainContent()}
                </div>

                {!isRepositoryIndexed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                        <div className="absolute opacity-10 pointer-events-none flex items-center justify-center w-full h-full">
                            <Github className="h-64 w-64" />
                        </div>
                        <IndexationStatus
                            repoName={repositoryData.name}
                            repoSize={repositoryData.repoSize}
                            estimatedTime={repositoryData.estimatedTime}
                            price={repositoryData.price}
                            indexedCount={repositoryData.indexedCount}
                            recentlyIndexed={repositoryData.recentlyIndexed}
                            onIndexingComplete={handleIndexingComplete}
                        />
                    </div>
                )}
            </div>

            {isRepositoryIndexed && <ChatInterface />}

            <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
                <DialogContent className="max-w-3xl h-[60vh] flex flex-col p-0">
                    <DialogHeader className="px-4 pt-4 pb-2">
                        <DialogTitle>Search Documentation</DialogTitle>
                    </DialogHeader>
                    <div className="px-4 pb-2 relative">
                        <Search className="absolute left-6 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            type="text"
                            placeholder="Type to search..."
                            className="pl-10 pr-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-6 top-2.5 h-6 w-6"
                                onClick={() => setSearchQuery("")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden border-t">
                        <SearchResults
                            results={searchResults}
                            isLoading={isSearching}
                            query={searchQuery}
                            onSelectResult={handleSelectSearchResult}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Index;
