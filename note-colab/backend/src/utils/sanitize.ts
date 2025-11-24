import DOMPurify, { WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as unknown as WindowLike);

/**
 * Sanitizes a string by:
 * 1. Trimming whitespace
 * 2. Removing HTML tags and scripts
 * 3. Normalizing whitespace (multiple spaces to single)
 * 4. Removing control characters
 */
export function sanitizeString(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove HTML tags and sanitize
  sanitized = purify.sanitize(sanitized, { ALLOWED_TAGS: [] });

  // Normalize whitespace (multiple spaces/tabs/newlines to single space)
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Remove control characters (except newline, tab, carriage return)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Sanitizes a string but preserves line breaks for content fields
 */
export function sanitizeContent(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim only leading/trailing whitespace, preserve internal structure
  let sanitized = input.trim();

  // Remove HTML tags but preserve text structure
  sanitized = purify.sanitize(sanitized);
  // sanitized = purify.sanitize(sanitized, { ALLOWED_TAGS: [] });

  // Normalize multiple spaces to single space (but preserve newlines)
  sanitized = sanitized.replace(/[ \t]+/g, ' ');

  // Remove control characters (except newline, tab, carriage return)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

