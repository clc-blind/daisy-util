/**
 * NCX (Navigation Control file for XML) parser for DAISY v3
 * Simplified implementation using utilities
 */

import type { Element } from 'xast';
import type { NavPoint, NcxData, NcxMetadata } from '@/lib/types';
import {
  extractMetadata,
  findDirectChildren,
  findElement,
  findElements,
  getAttribute,
  getTextContent,
  parseXml,
} from '@/lib/utils';

/**
 * Recursively parse navigation points with level tracking
 */
function parseNavPoints(
  navPointElements: Element[],
  level: number,
): NavPoint[] {
  const result: NavPoint[] = [];

  navPointElements.forEach((navPoint) => {
    const id = getAttribute(navPoint, 'id') || '';
    const playOrder = parseInt(getAttribute(navPoint, 'playOrder') || '0', 10);

    // Get label
    const navLabelElement = findElement(navPoint, 'navLabel');
    const labelTextElement = navLabelElement
      ? findElement(navLabelElement, 'text')
      : null;
    const label = labelTextElement ? getTextContent(labelTextElement) : '';

    // Get content src
    const contentElement = findElement(navPoint, 'content');
    const src = contentElement ? getAttribute(contentElement, 'src') || '' : '';

    result.push({
      id,
      level,
      label,
      src,
      playOrder,
    });

    // Parse nested navigation points - use direct children to avoid infinite recursion
    const nestedNavPoints = findDirectChildren(navPoint, 'navPoint');
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
  const ncxElement = findElement(tree, 'ncx');

  if (!ncxElement) {
    throw new Error('Invalid NCX file: no ncx element found');
  }

  // Extract metadata from head
  const headElement = findElement(ncxElement, 'head');
  const metaElements = headElement ? findElements(headElement, 'meta') : [];
  const metadata: NcxMetadata = extractMetadata(metaElements);

  // Extract document title
  const docTitleElement = findElement(ncxElement, 'docTitle');
  const docTitle = docTitleElement
    ? getTextContent(findElement(docTitleElement, 'text') || docTitleElement)
    : undefined;

  // Extract navigation map - only get direct children to avoid duplicates
  const navMapElement = findElement(ncxElement, 'navMap');
  const navPointElements = navMapElement
    ? findDirectChildren(navMapElement, 'navPoint')
    : [];

  const navPoints = parseNavPoints(navPointElements, 1);

  return {
    metadata,
    navPoints,
    docTitle,
  };
}
