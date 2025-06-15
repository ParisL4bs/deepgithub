import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertKBToMB(kb: number): number {
  return Math.round((kb / 1024) * 100) / 100;
}


export function estimateIndexingPrice(fileCount: number, pricePerFile: number = 0.00005, maxPrice: number = 10, repoSizeMB: number, maxSizeMB: number = 500): number | "too_large" {
  if (repoSizeMB > maxSizeMB) {
    return "too_large";
  }
  const price = Math.min(fileCount * pricePerFile, maxPrice);
  return Math.round(price * 100) / 100;
}