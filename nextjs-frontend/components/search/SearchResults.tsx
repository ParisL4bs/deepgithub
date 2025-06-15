
import { Fragment } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResult {
  id: string;
  title: string;
  path: string;
  excerpt: string;
  matches: string[];
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelectResult: (result: SearchResult) => void;
}

export function SearchResults({ results, isLoading, query, onSelectResult }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">No results found for "{query}"</p>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase()
        ? <span key={index} className="search-highlight">{part}</span>
        : part
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {results.map((result) => (
          <div
            key={result.id}
            className="cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
            onClick={() => onSelectResult(result)}
          >
            <h3 className="font-medium mb-1">{highlightMatch(result.title, query)}</h3>
            <p className="text-sm text-muted-foreground mb-1">
              {result.path}
            </p>
            <p className="text-sm">
              {result.matches.map((match, i) => (
                <Fragment key={i}>
                  <span dangerouslySetInnerHTML={{
                    __html: match.replace(new RegExp(`(${query})`, 'gi'), '<span class="search-highlight">$1</span>')
                  }} />
                  {i < result.matches.length - 1 && <span className="text-muted-foreground"> ... </span>}
                </Fragment>
              ))}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
