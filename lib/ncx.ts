/**
 * NCX (Navigation Control file for XML) parser for DAISY v3
 * Simplified implementation using utilities
 */

import { select, selectAll } from 'unist-util-select';
import { visit } from 'unist-util-visit';
import type { Element, Root, Text } from 'xast';
import type { NavPoint, NcxData, NcxMetadata } from '@/lib/types';
import { extractMetadata, parseXml } from '@/lib/utils';

/**
 * Recursively parse navigation points with level tracking
 */
function parseNavPoints(
  navPointElements: Element[],
  level: number,
): NavPoint[] {
  const result: NavPoint[] = [];

  navPointElements.forEach((navPoint) => {
    const { id, playOrder } = navPoint?.attributes || {};

    // Get label
    const label = (
      select(
        'element[name=navLabel] > element[name=text] > text',
        navPoint,
      ) as Text
    )?.value;

    // Get content src
    const { src } =
      (select('element[name=content]', navPoint) as Element)?.attributes || {};

    result.push({
      id: id || '',
      level,
      label,
      src: src || '',
      playOrder: playOrder ? parseInt(playOrder, 10) : 0,
    });

    // Parse nested navigation points - use direct children to avoid infinite recursion
    const nestedNavPoints = selectAll(
      '* > element[name=navPoint]',
      navPoint,
    ) as Element[];
    if (nestedNavPoints.length > 0) {
      result.push(...parseNavPoints(nestedNavPoints, level + 1));
    }
  });

  return result;
}

/**
 * Parse NCX file content and extract navigation structure
 */
export function parseNcx(ncxContent: string): NcxData {
  const tree = parseXml(ncxContent);
  const ncxElement = select('element[name=ncx]', tree);

  if (!ncxElement) {
    throw new Error('Invalid NCX file: no ncx element found');
  }

  const metaElements = selectAll('element[name=meta]', tree) as Element[];
  const metadata: NcxMetadata = extractMetadata(metaElements);

  // Extract document title
  const docTitle = (
    select('element[name=docTitle] > element[name=text] > text', tree) as Text
  )?.value;

  // Extract navigation map - only get direct children to avoid duplicates
  const navPointElements = selectAll(
    'element[name=navMap] > element[name=navPoint]',
    tree,
  ) as Element[];

  const navPoints = parseNavPoints(navPointElements, 1);

  return {
    metadata,
    navPoints,
    docTitle,
  };
}

/**
 * Update NCX metadata in-place from a new XML tree
 * Returns updated NcxData
 */
export function updateNcxMetadataFromTree(
  tree: Root,
  newMetadata: Partial<NcxMetadata>,
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
