"use client"

import { useState, useEffect } from "react";

interface StreamingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function StreamingText({
  text,
  speed = 10,
  onComplete,
  autoStart = true,
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(autoStart);
  const [index, setIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isStreaming) return;

    if (index < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText((current) => current + text.charAt(index));
        setIndex((current) => current + 1);
      }, speed);

      return () => clearTimeout(timeoutId);
    } else {
      setIsStreaming(false);
      setIsCompleted(true);
      onComplete?.();
    }
  }, [index, isStreaming, text, speed, onComplete]);

  const startStreaming = () => {
    if (!isStreaming && index < text.length) {
      setIsStreaming(true);
    }
  };

  if (isCompleted) {
    return <div>{text}</div>;
  }

  return (
    <div>
      {displayedText}
      {!isStreaming && index < text.length && (
        <button
          className="text-primary text-xs underline ml-1 hover:text-primary/80"
          onClick={startStreaming}
        >
          Continue
        </button>
      )}
    </div>
  );
}
