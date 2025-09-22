/**
 * Parser for DAISY v3 SMIL (Synchronized Multimedia Integration Language) files
 */

import { select, selectAll } from 'unist-util-select';
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'xast';
import type { AudioClip, SmilData, SmilMetadata } from '@/lib/types';
import { calculateDuration, extractMetadata, parseXml } from '@/lib/utils';

/**
 * Extract audio clip information from a DAISY v3 SMIL element
 */
function extractAudioClip(element: Element): AudioClip | null {
  // Look for audio element within this element
  const audioElement = select('element[name=audio]', element) as Element;

  if (!audioElement) {
    return null;
  }

  // DAISY v3 uses clipBegin/clipEnd attributes (camelCase)
  const { src, clipBegin, clipEnd } = audioElement.attributes;

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
  const smilElement = select('element[name=smil]', tree);

  if (!smilElement) {
    throw new Error('Invalid SMIL file: no smil element found');
  }

  // Extract metadata from head
  const metaElements = selectAll('element[name=meta]', tree) as Element[];
  const metadata: SmilMetadata = extractMetadata(metaElements);

  // Extract body and parse par/seq elements
  const elements: Record<string, AudioClip> = {};
  const parElements = selectAll('element[name=par]', tree) as Element[];

  parElements.forEach((element) => {
    const { id } = element.attributes;
    if (id) {
      const audioClip = extractAudioClip(element);
      if (audioClip) {
        elements[`${smilFileName}#${id}`] = audioClip;
      }
    }
  });

  return {
    metadata,
    elements,
  };
}

/**
 * Update SMIL metadata in-place from a new XML tree
 * Returns updated SmilData
 */
export function updateSmilMetadataFromTree(
  tree: Root,
  newMetadata: Partial<SmilMetadata>,
  options?: { createIfMissing?: boolean },
) {
  const shouldCreate = options?.createIfMissing !== false;

  const updatedKeys = new Set<string>();

  visit(tree, { type: 'element', name: 'meta' }, (element, index, parent) => {
    if (element.type !== 'element') {
      return;
    }

    const name = element.attributes?.name;

    if (name && newMetadata[name] !== undefined) {
      element.attributes = {
        ...element.attributes,
        content: String(newMetadata[name]),
      };
      updatedKeys.add(name);
    }

    // Optionally add new <meta> elements for keys in newMetadata that were not updated
    if (shouldCreate) {
      Object.entries(newMetadata).forEach(([key, value]) => {
        if (updatedKeys.has(key)) return;

        parent?.children.push({
          type: 'element',
          name: 'meta',
          attributes: { name: key, content: String(value) },
          children: [],
        });
      });
    }
  });
}
