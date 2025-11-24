import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from "dompurify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitize(html: string) {
  return DOMPurify.sanitize(html);
}