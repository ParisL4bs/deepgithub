"use client"

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Lock, Clock } from "lucide-react";
import { toast } from "sonner";
import {indexRepository} from '@/app/openapi-client/sdk.gen';

interface IndexationStatusProps {
  repoName: string;
  repoSize: string;
  estimatedTime: string;
  price: string;
  indexedCount: number;
  recentlyIndexed?: Array<{ name: string; avatar: string }>;
  onIndexingComplete: () => void;
}

export function IndexationStatus({
  repoName,
  repoSize,
  estimatedTime,
  price,
  indexedCount,
  recentlyIndexed = [],
  onIndexingComplete,
}: IndexationStatusProps) {
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);

  useEffect(() => {
    if (isIndexing) {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 1;
        setProgress(currentProgress);

        if (currentProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onIndexingComplete();
          }, 1000);
        }
      }, 300);

      return () => clearInterval(interval);
    }
  }, [isIndexing, onIndexingComplete]);

  const handleIndexRepository = async () => {
    try {

      setIsRedirectingToStripe(true);
      toast.info("Redirecting to Stripe checkout...");

      await new Promise(resolve => setTimeout(resolve, 1500));


      toast.success("Payment successful!");
      setIsRedirectingToStripe(false);


      setIsIndexing(true);

      const response = await indexRepository({
        path: {
          owner: repoName.split("/")[0],
          repo: repoName.split("/")[1],
        },
      });
      console.log("response from indexRepository");
      console.log(response);

    } catch (error) {
      setIsRedirectingToStripe(false);
      toast.error("Payment failed. Please try again.");
      console.error("Payment error:", error);
    }
  };

  if (isIndexing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto bg-background/95 backdrop-blur-sm rounded-lg shadow-xl z-50">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Indexing in progress</CardTitle>
            <CardDescription className="text-center">
              Please wait while we index {repoName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2 w-full" />
            <p className="text-center text-sm text-muted-foreground">
              Estimated time remaining: {Math.ceil((100 - progress) / 100 * parseInt(estimatedTime))} minutes
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 max-w-xl mx-auto bg-background/95 backdrop-blur-sm rounded-lg shadow-xl z-50">
      <Alert className="mb-6">
        <Info className="h-5 w-5" />
        <AlertTitle>This repository hasn't been indexed yet</AlertTitle>
        <AlertDescription>
          To explore documentation and chat with this codebase, indexing is required
        </AlertDescription>
      </Alert>

      <div className="mb-8 flex justify-center">
        <div className="relative rounded-full bg-primary/10 p-6">
          <Lock className="h-12 w-12 text-primary opacity-80" />
          <Clock className="absolute bottom-1 right-1 h-6 w-6 text-primary" />
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Index This Repository</CardTitle>
          <CardDescription>
            Get full access to documentation and AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium">Benefits of indexing:</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 rounded-full bg-primary/10 p-1">
                  <Info className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm">AI-generated documentation structure</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 rounded-full bg-primary/10 p-1">
                  <Info className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm">Searchable code explanations</span>
              </li>
              <li className="flex items-start">
                <div className="mr-2 mt-0.5 rounded-full bg-primary/10 p-1">
                  <Info className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm">Repository-specific chat assistant</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Repository size:</span>
              <span className="text-sm">{repoSize}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated time:</span>
              <span className="text-sm">~{estimatedTime} minutes</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            className="w-full"
            onClick={handleIndexRepository}
            disabled={isRedirectingToStripe}
          >
            {isRedirectingToStripe ? "Processing..." : `Index for ${price}`}
          </Button>
          <div className="flex w-full flex-col items-center space-y-2">
            <a href="#" className="text-sm text-primary hover:underline">
              Learn how indexing works
            </a>
            <p className="text-xs text-muted-foreground">
              Join {indexedCount.toLocaleString()} repositories already indexed
            </p>

            {recentlyIndexed && recentlyIndexed.length > 0 && (
              <div className="flex items-center -space-x-2">
                {recentlyIndexed.map((repo, index) => (
                  <div key={index} className="h-6 w-6 overflow-hidden rounded-full border-2 border-background">
                    <img src={repo.avatar} alt={repo.name} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
