/**
 * Utility functions for DAISY v3 file parsing
 */

import type { Element, Root } from 'xast';
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
 * Extract metadata from meta elements with better error handling
 */
export function extractMetadata(metaElements: Element[]): BaseMetadata {
  const metadata: BaseMetadata = {};

  metaElements.forEach((meta) => {
    const { name, content } = meta.attributes;

    if (name && content) {
      metadata[name] = content;
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
    // - "1.234s" (seconds with decimal and 's' suffix)

    const timePattern = /^(\d+):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
    const match = timeStr.match(timePattern);

    if (!match) {
      if (timeStr.endsWith('s')) {
        const seconds = parseFloat(timeStr.slice(0, -1));
        if (!Number.isNaN(seconds)) {
          return Math.round(seconds * 1000);
        }
      }

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
  const hours = String(Math.floor(milliseconds / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((milliseconds % 3600000) / 60000)).padStart(
    2,
    '0',
  );
  const secs = (milliseconds % 60000) / 1000;

  const seconds = secs.toFixed(3).padStart(6, '0'); // includes .SSS

  return `${hours}:${minutes}:${seconds}`;
}
