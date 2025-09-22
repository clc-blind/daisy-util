/**
 * Utility functions for DAISY v3 file parsing
 */

import { formatISO } from 'date-fns';
import { visit } from 'unist-util-visit';
import type { Element, Parent, Root, Text } from 'xast';
import { fromXml } from 'xast-util-from-xml';
import { toXml as baseToXml } from 'xast-util-to-xml';
import type { BaseMetadata } from '@/lib/types';

/**
 * Parse XML content into an xast tree
 */
export function parseXml(xmlContent: string): Root {
  try {
    return fromXml(xmlContent);
  } catch (error) {
    throw new Error(
      `Invalid XML content: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Convert xast tree back to XML string
 */
export function toXml(tree: Root): string {
  return baseToXml(tree);
}

/**
 * Find the first element with matching tag name
 * Using unist-util-visit for robust tree traversal
 */
export function findElement(
  tree: Parent,
  tagName: string,
): Element | undefined {
  let result: Element | undefined;

  visit(tree, 'element', (node: Element) => {
    if (node.name === tagName) {
      result = node;
      return false; // Stop traversal
    }
    return undefined;
  });

  return result;
}

/**
 * Find all direct child elements with matching tag name (non-recursive)
 */
export function findDirectChildren(tree: Parent, tagName: string): Element[] {
  const results: Element[] = [];

  if (tree.children) {
    tree.children.forEach((child) => {
      if (child.type === 'element' && child.name === tagName) {
        results.push(child as Element);
      }
    });
  }

  return results;
}

/**
 * Find all elements with matching tag name (recursive)
 * Using unist-util-visit for robust tree traversal
 */
export function findElements(tree: Parent, tagName: string): Element[] {
  const results: Element[] = [];

  visit(tree, 'element', (node: Element) => {
    if (node.name === tagName) {
      results.push(node);
    }
    return undefined;
  });

  return results;
}

/**
 * Get attribute value from element
 */
export function getAttribute(
  element: Element,
  attributeName: string,
): string | undefined {
  const value = element.attributes?.[attributeName];
  return value ?? undefined;
}

/**
 * Get text content from element (improved with better text aggregation)
 */
export function getTextContent(element: Element): string {
  const textParts: string[] = [];

  visit(element, 'text', (node: Text) => {
    textParts.push(node.value);
    return undefined;
  });

  return textParts.join('').trim();
}

/**
 * Extract metadata from meta elements with better error handling
 */
export function extractMetadata(metaElements: Element[]): BaseMetadata {
  const metadata: BaseMetadata = {};

  metaElements.forEach((meta) => {
    const name = getAttribute(meta, 'name');
    const content = getAttribute(meta, 'content');

    if (name && content) {
      // Handle multiple values for the same key
      if (metadata[name]) {
        const existing = metadata[name];
        if (Array.isArray(existing)) {
          existing.push(content);
        } else {
          metadata[name] = [existing, content];
        }
      } else {
        metadata[name] = content;
      }
    }
  });

  return metadata;
}

/**
 * Parse DAISY v3 time format to milliseconds
 * Supports only real DAISY v3 formats: "H:mm:ss.SSS" and "H:mm:ss"
 */
export function parseTime(timeStr: string): number {
  if (!timeStr) return 0;

  try {
    // DAISY v3 time formats:
    // - "0:50:27.083" (hours:minutes:seconds.milliseconds)
    // - "40:08:40" (hours:minutes:seconds)
    // - "0:00:02.029" (hours:minutes:seconds.milliseconds)

    const timePattern = /^(\d+):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
    const match = timeStr.match(timePattern);

    if (!match) {
      return 0;
    }

    const hours = parseInt(match[1]!, 10);
    const minutes = parseInt(match[2]!, 10);
    const seconds = parseInt(match[3]!, 10);
    const milliseconds = match[4] ? parseInt(match[4], 10) : 0;

    // Validate ranges
    if (minutes >= 60 || seconds >= 60 || milliseconds >= 1000) {
      return 0;
    }

    return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
  } catch {
    return 0;
  }
}

/**
 * Calculate duration in milliseconds between two time strings
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return Math.max(0, end - start);
}

/**
 * Format milliseconds to time string
 */
export function formatTime(milliseconds: number): string {
  return formatISO(new Date(milliseconds));
}
