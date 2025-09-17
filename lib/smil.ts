/**
 * Parser for DAISY v3 SMIL (Synchronized Multimedia Integration Language) files
 */

import type { Element } from 'xast';
import type { AudioClip, SmilData, SmilMetadata } from '@/lib/types';
import {
  calculateDuration,
  extractMetadata,
  findElement,
  findElements,
  getAttribute,
  parseXml,
} from '@/lib/utils';

/**
 * Extract audio clip information from a DAISY v3 SMIL element
 */
function extractAudioClip(element: Element): AudioClip | null {
  // Look for audio element within this element
  const audioElement = findElement(element, 'audio');

  if (!audioElement) {
    return null;
  }

  const src = getAttribute(audioElement, 'src');

  // DAISY v3 uses clipBegin/clipEnd attributes (camelCase)
  const clipBegin = getAttribute(audioElement, 'clipBegin');
  const clipEnd = getAttribute(audioElement, 'clipEnd');

  if (!src || !clipBegin || !clipEnd) {
    return null;
  }

  // Calculate duration in milliseconds
  const duration = calculateDuration(clipBegin, clipEnd);

  return {
    src,
    clipBegin,
    clipEnd,
    duration,
  };
}

/**
 * Parse SMIL file content and extract audio timing information
 */
export function parseSmil(smilContent: string, smilFileName: string): SmilData {
  const tree = parseXml(smilContent);
  const smilElement = findElement(tree, 'smil');

  if (!smilElement) {
    throw new Error('Invalid SMIL file: no smil element found');
  }

  // Extract metadata from head
  const headElement = findElement(smilElement, 'head');
  const metaElements = headElement ? findElements(headElement, 'meta') : [];
  const metadata: SmilMetadata = extractMetadata(metaElements);

  // Extract total elapsed time from meta (DAISY v3 uses dtb:totalElapsedTime)
  const totalTimeElement = metaElements.find(
    (meta) => getAttribute(meta, 'name') === 'dtb:totalElapsedTime',
  );
  const totalElapsedTime = totalTimeElement
    ? getAttribute(totalTimeElement, 'content')
    : undefined;

  // Extract body and parse par/seq elements
  const bodyElement = findElement(smilElement, 'body');
  const elements: Record<string, AudioClip> = {};

  if (bodyElement) {
    // In DAISY v3, audio clips are typically in <par> elements
    // <seq> elements are containers and don't have direct audio
    const parElements = findElements(bodyElement, 'par');

    parElements.forEach((element) => {
      const id = getAttribute(element, 'id');
      if (id) {
        const audioClip = extractAudioClip(element);
        if (audioClip) {
          elements[`${smilFileName}#${id}`] = audioClip;
        }
      }
    });
  }

  return {
    metadata,
    elements,
    totalElapsedTime,
  };
}
