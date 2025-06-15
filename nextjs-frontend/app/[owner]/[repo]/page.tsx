"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { convertKBToMB, estimateIndexingPrice } from "@/lib/utils";
import { type DocsResponse, type FileDescription, getGithubRepoInfo, getRepositoryDocs, getRepositoryStatus, type RepositoryInfo, type RepositoryStatusResponse } from "@/app/clientService";
import { toast } from "sonner";

interface SearchResult {
    id: string;
    title: string;
    path: string;
    excerpt: string;
    matches: string[];
}

interface TreeItem {
    path: string;
    title: string;
    type: string;
    description: string;
}

// Mock search functionality - moved outside component to avoid dependency issues
const mockSearchResults = (query: string, files?: FileDescription[]): SearchResult[] => {
    if (!query || !files) return [];

    return files
        .filter(file => 
            file.path.toLowerCase().includes(query.toLowerCase()) ||
            file.description.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)
        .map((file, index) => ({
            id: `${index}`,
            title: file.path.split('/').pop() || file.path,
            path: file.path,
            excerpt: file.description,
            matches: [
                file.description.replace(
                    new RegExp(query, 'gi'),
                    `<strong>${query}</strong>`
                )
            ]
        }));
};

export default function RepoDocsPage() {
    const { owner, repo } = useParams();
    const [docData, setDocData] = useState<DocsResponse | null>(null);
    const [isIndexed, setIsIndexed] = useState(false);
    const [status, setStatus] = useState<RepositoryStatusResponse | null>(null);
    const [repoInfo, setRepoInfo] = useState<RepositoryInfo | null>(null);
    const [selectedPath, setSelectedPath] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeDocSearchQuery, setActiveDocSearchQuery] = useState("");
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get repository status
                const statusRes = await getRepositoryStatus({
                    path: { owner: owner as string, repo: repo as string }
                });
                setStatus(statusRes.data ?? null);
                const indexed = statusRes.data?.status === "indexed";
                setIsIndexed(indexed);

                // Get repository info
                const repoRes = await getGithubRepoInfo({
                    path: { owner: owner as string, repo: repo as string }
                });
                setRepoInfo(repoRes.data ?? null);

                // If indexed, get documentation
                if (indexed) {
                    setIsLoadingDocs(true);
                    const docsRes = await getRepositoryDocs({
                        path: { owner: owner as string, repo: repo as string }
                    });
                    setDocData(docsRes.data ?? null);
                    
                    // Set default selected path to first file if available
                    if (docsRes.data?.files && docsRes.data.files.length > 0) {
                        setSelectedPath(docsRes.data.files[0].path);
                    }
                    setIsLoadingDocs(false);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load repository data");
                setIsLoadingDocs(false);
            }
        };

        fetchData();
    }, [owner, repo]);

    // Calculate repo size in MB and price
    const repoSizeMB = repoInfo?.size ? convertKBToMB(repoInfo.size) : 0;
    const fileCount = status?.file_count ?? 0;
    const price = estimateIndexingPrice(fileCount, 0.00005, 10, repoSizeMB, 500);

    // Convert file descriptions to tree items for sidebar
    const treeItems: TreeItem[] = docData?.files.map(file => ({
        path: file.path,
        title: file.path.split('/').pop() || file.path,
        type: file.type,
        description: file.description
    })) || [];

    // Debug logging
    console.log('Debug info:', {
        isIndexed,
        isLoadingDocs,
        docDataExists: !!docData,
        filesCount: docData?.files?.length || 0,
        treeItemsCount: treeItems.length
    });

    const handleSelectTreeItem = (item: { path: string }) => {
        setSelectedPath(item.path);
    };

    const handleSelectSearchResult = (result: SearchResult) => {
        setSelectedPath(result.path);
        setActiveDocSearchQuery(searchQuery);
        setIsSearchDialogOpen(false);
    };

    const handleIndexingComplete = () => {
        setIsIndexed(true);
        toast.success("Repository indexed successfully!");
        // Refresh the page data
        window.location.reload();
    };

    // Search effect
    useEffect(() => {
        if (!isSearchDialogOpen) return;

        if (searchQuery) {
            setIsSearching(true);
            const timer = setTimeout(() => {
                setSearchResults(mockSearchResults(searchQuery, docData?.files));
                setIsSearching(false);
            }, 300);
            return () => clearTimeout(timer);
        }
        setSearchResults([]);
    }, [searchQuery, isSearchDialogOpen, docData?.files]);

    // Keyboard shortcuts
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

    // Get selected file data
    const selectedFile = docData?.files.find(file => file.path === selectedPath);

    if (!isIndexed) {
        return (
            <div className="flex h-screen items-center justify-center">
                <IndexationStatus
                    repoName={`${owner}/${repo}`}
                    repoSize={repoSizeMB.toString()}
                    price={price === "too_large" ? "Too large" : `$${price}`}
                    estimatedTime={"10"}
                    indexedCount={fileCount}
                    onIndexingComplete={handleIndexingComplete}
                />
            </div>
        );
    }

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
                    treeItems={isLoadingDocs || treeItems.length === 0 ? undefined : treeItems}
                />
            </ResizablePanel>

            <ResizableHandle className="w-1 bg-border" />

            <ResizablePanel defaultSize={80}>
                <DocContent
                    path={selectedPath}
                    searchQuery={activeDocSearchQuery}
                    fileData={selectedFile}
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
                        <h1 className="font-semibold">{repoInfo?.full_name || `${owner}/${repo}`}</h1>
                        <p className="text-xs text-muted-foreground">
                            {repoInfo?.description || "Repository Explorer"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSearchDialogOpen(true)}
                        className="hidden md:flex"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Search...
                        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </Button>
                    
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

            <div className="flex-1 overflow-hidden">
                {renderMainContent()}
            </div>

            <ChatInterface />

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
}

