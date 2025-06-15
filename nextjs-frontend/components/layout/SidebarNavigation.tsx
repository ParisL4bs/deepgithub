"use client"

import { useState } from "react";
import { ChevronDown, ChevronRight, File, FileCode, FolderOpen, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: TreeNode[];
}

interface TreeItem {
  path: string;
  title: string;
  type: string;
  description: string;
}

interface SidebarNavigationProps {
  className?: string;
  onSelectItem: (item: TreeNode | TreeItem) => void;
  treeItems?: TreeItem[];
}

const repoStructure: TreeNode[] = [
  {
    id: "1",
    name: "Getting Started",
    type: "folder",
    path: "/docs/getting-started",
    children: [
      { id: "1.1", name: "Introduction", type: "file", path: "/docs/getting-started/introduction" },
      { id: "1.2", name: "Installation", type: "file", path: "/docs/getting-started/installation" },
      { id: "1.3", name: "Configuration", type: "file", path: "/docs/getting-started/configuration" },
    ]
  },
  {
    id: "2",
    name: "Components",
    type: "folder",
    path: "/docs/components",
    children: [
      { id: "2.1", name: "Button", type: "file", path: "/docs/components/button" },
      { id: "2.2", name: "Dialog", type: "file", path: "/docs/components/dialog" },
      {
        id: "2.3",
        name: "Form",
        type: "folder",
        path: "/docs/components/form",
        children: [
          { id: "2.3.1", name: "Validation", type: "file", path: "/docs/components/form/validation" },
          { id: "2.3.2", name: "Inputs", type: "file", path: "/docs/components/form/inputs" },
        ]
      },
    ]
  },
  {
    id: "3",
    name: "API Reference",
    type: "folder",
    path: "/docs/api",
    children: [
      { id: "3.1", name: "Authentication", type: "file", path: "/docs/api/auth" },
      { id: "3.2", name: "Endpoints", type: "file", path: "/docs/api/endpoints" },
      { id: "3.3", name: "Error Handling", type: "file", path: "/docs/api/errors" },
    ]
  },
  {
    id: "4",
    name: "Examples",
    type: "folder",
    path: "/docs/examples",
    children: [
      { id: "4.1", name: "Basic Example", type: "file", path: "/docs/examples/basic" },
      { id: "4.2", name: "Advanced Example", type: "file", path: "/docs/examples/advanced" },
    ]
  },
];

export function SidebarNavigation({ className, onSelectItem, treeItems }: SidebarNavigationProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "1": true,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Convert TreeItem[] to TreeNode[] structure
  const convertTreeItemsToNodes = (items: TreeItem[]): TreeNode[] => {
    const folderMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Sort items by path to ensure proper folder structure
    const sortedItems = [...items].sort((a, b) => a.path.localeCompare(b.path));

    sortedItems.forEach((item, index) => {
      const pathParts = item.path.split('/').filter(Boolean);
      let currentPath = '';
      let currentParent: TreeNode[] = rootNodes;

      // Create folder structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += '/' + pathParts[i];
        const folderName = pathParts[i];
        
        if (!folderMap.has(currentPath)) {
          const folderNode: TreeNode = {
            id: `folder-${currentPath}`,
            name: folderName,
            type: "folder",
            path: currentPath,
            children: []
          };
          folderMap.set(currentPath, folderNode);
          currentParent.push(folderNode);
        }
        
        currentParent = folderMap.get(currentPath)!.children!;
      }

      // Add the file
      const fileName = pathParts[pathParts.length - 1] || item.title;
      const fileNode: TreeNode = {
        id: `file-${index}`,
        name: fileName,
        type: "file",
        path: item.path,
      };
      currentParent.push(fileNode);
    });

    return rootNodes;
  };

  // Use provided treeItems or fallback to default structure
  const treeStructure = treeItems && treeItems.length > 0 ? convertTreeItemsToNodes(treeItems) : repoStructure;

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const filterTree = (node: TreeNode, query: string): boolean => {
    if (node.name.toLowerCase().includes(query.toLowerCase())) return true;

    if (node.children) {
      const filteredChildren = node.children.filter(child => filterTree(child, query));
      return filteredChildren.length > 0;
    }

    return false;
  };

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map(node => {
      if (searchQuery && !filterTree(node, searchQuery)) {
        return null;
      }

      if (node.type === "folder") {
        const isExpanded = expandedFolders[node.id] || (searchQuery && filterTree(node, searchQuery));

        return (
          <div key={node.id} className="animate-fade-in">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start px-2 py-1.5 h-auto my-0.5",
                level > 0 && `pl-${level * 3 + 2}`
              )}
              onClick={() => toggleFolder(node.id)}
            >
              <span className="flex items-center text-left">
                {isExpanded ? <ChevronDown className="h-4 w-4 mr-1.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mr-1.5 shrink-0" />}
                {isExpanded ? <FolderOpen className="h-4 w-4 mr-1.5 shrink-0" /> : <Folder className="h-4 w-4 mr-1.5 shrink-0" />}
                <span className="truncate">{node.name}</span>
              </span>
            </Button>
            {isExpanded && node.children && (
              <div className="ml-1">
                {renderTree(node.children, level + 1)}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <Button
            key={node.id}
            variant="ghost"
            className={cn(
              "w-full justify-start px-2 py-1.5 h-auto my-0.5 text-muted-foreground hover:text-foreground",
              level > 0 && `pl-${level * 3 + 2}`
            )}
            onClick={() => onSelectItem(node)}
          >
            <span className="flex items-center text-left">
              <span className="w-4 mr-1.5"></span>
              {node.path.endsWith('.tsx') || node.path.endsWith('.jsx') ? (
                <FileCode className="h-4 w-4 mr-1.5 shrink-0" />
              ) : (
                <File className="h-4 w-4 mr-1.5 shrink-0" />
              )}
              <span className="truncate">
                {searchQuery ? (
                  highlightMatch(node.name, searchQuery)
                ) : (
                  node.name
                )}
              </span>
            </span>
          </Button>
        );
      }
    });
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase()
        ? <span key={index} className="bg-primary/20 px-0.5 rounded">{part}</span>
        : part
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {renderTree(treeStructure)}
        </div>
      </ScrollArea>
    </div>
  );
}
