"use client"

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface FileDescription {
  path: string;
  description: string;
  type: string;
  size?: number | null;
  language?: string | null;
}

interface DocContentProps {
  path: string;
  searchQuery?: string;
  fileData?: FileDescription;
}

// Custom markdown parser
const parseMarkdown = (markdown: string): JSX.Element => {
  const lines = markdown.split('\n');
  const elements: JSX.Element[] = [];
  let currentIndex = 0;

  const processLine = (line: string, index: number): JSX.Element | null => {
    const trimmedLine = line.trim();
    
    // Headers
    if (trimmedLine.startsWith('# ')) {
      return <h1 key={index} className="text-3xl font-bold mt-6 mb-4">{trimmedLine.slice(2)}</h1>;
    }
    if (trimmedLine.startsWith('## ')) {
      return <h2 key={index} className="text-2xl font-semibold mt-5 mb-3">{trimmedLine.slice(3)}</h2>;
    }
    if (trimmedLine.startsWith('### ')) {
      return <h3 key={index} className="text-xl font-semibold mt-4 mb-2">{trimmedLine.slice(4)}</h3>;
    }
    if (trimmedLine.startsWith('#### ')) {
      return <h4 key={index} className="text-lg font-semibold mt-3 mb-2">{trimmedLine.slice(5)}</h4>;
    }

    // Code blocks
    if (trimmedLine.startsWith('```')) {
      const language = trimmedLine.slice(3);
      const codeLines: string[] = [];
      let i = index + 1;
      
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      currentIndex = i; // Skip processed lines
      
      return (
        <pre key={index} className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
          <code className={`language-${language}`}>
            {codeLines.join('\n')}
          </code>
        </pre>
      );
    }

    // Lists
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const listItems: string[] = [trimmedLine.slice(2)];
      let i = index + 1;
      
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      
      currentIndex = i - 1;
      
      return (
        <ul key={index} className="list-disc list-inside my-4 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx}>{processInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmedLine)) {
      const listItems: string[] = [trimmedLine.replace(/^\d+\.\s/, '')];
      let i = index + 1;
      
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      
      currentIndex = i - 1;
      
      return (
        <ol key={index} className="list-decimal list-inside my-4 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx}>{processInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
    }

    // Horizontal rule
    if (trimmedLine === '---' || trimmedLine === '***') {
      return <hr key={index} className="my-6 border-border" />;
    }

    // Empty lines
    if (trimmedLine === '') {
      return <br key={index} />;
    }

    // Regular paragraphs
    return (
      <p key={index} className="my-3 leading-relaxed">
        {processInlineMarkdown(trimmedLine)}
      </p>
    );
  };

  const processInlineMarkdown = (text: string): React.ReactNode => {
    // Process inline code first
    let processedText = text.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Bold text
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text
    processedText = processedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  for (let i = 0; i < lines.length; i++) {
    if (i <= currentIndex) continue;
    
    const element = processLine(lines[i], i);
    if (element) {
      elements.push(element);
    }
    
    if (currentIndex > i) {
      i = currentIndex;
    }
  }

  return <div className="prose prose-slate dark:prose-invert max-w-none">{elements}</div>;
};

const getDocContent = (path: string): { title: string; content: string } => {
  const docs: Record<string, { title: string; content: string }> = {
    "/docs/getting-started/introduction": {
      title: "Introduction",
      content: `
# Introduction

Welcome to the documentation explorer for GitHub repositories. This tool helps you browse, search, and understand code repositories more efficiently.

## Features

- **Repository Navigation**: Browse through the directory structure
- **Documentation Viewer**: Read formatted documentation
- **AI Chat Assistant**: Ask questions about the codebase
- **Advanced Search**: Find code and documentation quickly

## Getting Started

To begin exploring a repository, you can:

1. Use the sidebar navigation to browse files and folders
2. Search for specific terms using the search bar
3. Ask questions to the AI assistant at the bottom of the screen

The documentation is generated automatically from the repository contents, including README files, code comments, and other documentation formats.

\`\`\`typescript
// Example usage of the Documentation Explorer API
import { DocumentationExplorer } from '@docu-flow/core';

const explorer = new DocumentationExplorer({
  repository: 'https://github.com/user/repo',
  options: {
    generateDocs: true,
    aiAssistEnabled: true,
  }
});

await explorer.initialize();
\`\`\`

Our goal is to make codebases more accessible and understandable for everyone on your team.
      `
    },
    "/docs/getting-started/installation": {
      title: "Installation",
      content: `
# Installation

Setting up the Documentation Explorer is quick and straightforward.

## Prerequisites

- Node.js 16.0 or higher
- A GitHub account with access to the repositories you want to explore

## Install via npm

\`\`\`bash
npm install @docu-flow/explorer
\`\`\`

## Install via yarn

\`\`\`bash
yarn add @docu-flow/explorer
\`\`\`

## Configuration

Create a configuration file named \`docu-flow.config.js\` in your project root:

\`\`\`javascript
// docu-flow.config.js
module.exports = {
  repositories: [
    {
      name: 'My Repository',
      url: 'https://github.com/username/repository',
      branch: 'main',
      accessToken: process.env.GITHUB_TOKEN // Optional
    }
  ],
  output: {
    path: './docs',
    format: 'markdown'
  },
  features: {
    aiAssistant: true,
    codeHighlighting: true,
    searchIndex: true
  }
}
\`\`\`

## Environment Variables

Create a \`.env\` file with the following variables:

\`\`\`
GITHUB_TOKEN=your_personal_access_token
AI_API_KEY=your_api_key_for_assistant
\`\`\`

Now you're ready to start exploring your repositories with enhanced documentation!
      `
    },
    "/docs/components/button": {
      title: "Button Component",
      content: `
# Button Component

The Button component is a versatile UI element used for triggering actions.

## Import

\`\`\`tsx
import { Button } from '@docu-flow/ui';
\`\`\`

## Usage

\`\`\`tsx
import React from 'react';
import { Button } from '@docu-flow/ui';

function MyComponent() {
  return (
    <div>
      <Button variant="primary">Click Me</Button>
      <Button variant="secondary" disabled>Disabled</Button>
      <Button variant="outline" size="sm">Small Outline</Button>
    </div>
  );
}
\`\`\`

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'outline' \| 'ghost' | 'primary' | The visual style of the button |
| size | 'sm' \| 'md' \| 'lg' | 'md' | The size of the button |
| disabled | boolean | false | Whether the button is disabled |
| isLoading | boolean | false | Shows a loading indicator |
| leftIcon | ReactNode | undefined | Icon to display before button text |
| rightIcon | ReactNode | undefined | Icon to display after button text |
| onClick | () => void | undefined | Function called when button is clicked |
| className | string | undefined | Additional CSS classes |

## Examples

### Primary Button

\`\`\`tsx
<Button variant="primary">Primary Button</Button>
\`\`\`

### Button with Icon

\`\`\`tsx
import { ArrowRight } from 'lucide-react';

<Button rightIcon={<ArrowRight />}>Next Step</Button>
\`\`\`

### Loading State

\`\`\`tsx
<Button isLoading>Processing...</Button>
\`\`\`
      `
    },
    "default": {
      title: "Documentation",
      content: `
# Documentation

Select a topic from the sidebar to view related documentation.

## Available Sections

- Getting Started
- Components
- API Reference
- Examples

Click on any item in the navigation tree to explore the documentation.
      `
    }
  };

  return docs[path] || docs["default"];
};

export function DocContent({ path, searchQuery = "", fileData }: DocContentProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (path) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [path]);

  const highlightSearch = (content: string, query: string) => {
    if (!query) return content;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  // Use fileData if available, otherwise fallback to mock data
  const getContent = () => {
    if (fileData) {
      console.log('Processing fileData:', {
        path: fileData.path,
        type: fileData.type,
        descriptionLength: fileData.description.length,
        descriptionPreview: fileData.description.substring(0, 100) + '...'
      });
      
      return {
        title: fileData.path.split('/').pop() || fileData.path,
        content: fileData.description // Use the raw markdown description
      };
    }
    
    return getDocContent(path);
  };

  const { title, content } = getContent();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (!path && !fileData) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <h1 className="text-2xl font-bold">Welcome</h1>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6">
            <p className="text-muted-foreground">
              Select a file from the sidebar to view its documentation.
            </p>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Apply search highlighting to content before parsing
  const highlightedContent = highlightSearch(content, searchQuery);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
          <span>Documentation</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{title}</span>
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {fileData && (
          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <span>Type: {fileData.type}</span>
            {fileData.language && <span>Language: {fileData.language}</span>}
            {fileData.size && <span>Size: {fileData.size} bytes</span>}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-6">
          {parseMarkdown(highlightedContent)}
        </div>
      </ScrollArea>
    </div>
  );
}
