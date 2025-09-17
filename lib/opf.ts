/**
 * Parser for DAISY v3 OPF (Open Packaging Format) files
 */

import type { Element } from 'xast';
import type {
  ManifestItem,
  OpfData,
  OpfMetadata,
  SpineItem,
} from '@/lib/types';
import {
  extractMetadata,
  findElement,
  findElements,
  getAttribute,
  getTextContent,
  parseXml,
} from '@/lib/utils';

/**
 * Parse OPF file content and extract metadata, manifest, and spine
 */
export function parseOpf(opfContent: string): OpfData {
  const tree = parseXml(opfContent);
  const packageElement = findElement(tree, 'package');

  if (!packageElement) {
    throw new Error('Invalid OPF file: no package element found');
  }

  // Extract metadata
  const metadataElement = findElement(packageElement, 'metadata');
  const metaElements = metadataElement
    ? findElements(metadataElement, 'meta')
    : [];

  // Find DC elements by searching for common DC element names
  // Dublin Core elements are the primary metadata in DAISY files
  const dcElementNames = [
    'title',
    'creator',
    'identifier',
    'subject',
    'description',
    'publisher',
    'date',
    'language',
    'source',
  ];
  const dcElements: Element[] = [];

  if (metadataElement) {
    dcElementNames.forEach((name) => {
      const elements = findElements(metadataElement, `dc:${name}`);
      dcElements.push(...elements);
    });
  }

  const metadata: OpfMetadata = extractMetadata(metaElements);

  // Add DC elements directly
  dcElements.forEach((element) => {
    const tagName = element.name?.replace('dc:', '');
    if (tagName) {
      metadata[tagName] = getTextContent(element);
    }
  });

  // Extract manifest
  const manifestElement = findElement(packageElement, 'manifest');
  const itemElements = manifestElement
    ? findElements(manifestElement, 'item')
    : [];

  const manifest: ManifestItem[] = itemElements.map((item) => ({
    id: getAttribute(item, 'id') || '',
    href: getAttribute(item, 'href') || '',
    mediaType: getAttribute(item, 'media-type') || '',
  }));

  // Extract spine
  const spineElement = findElement(packageElement, 'spine');
  const itemrefElements = spineElement
    ? findElements(spineElement, 'itemref')
    : [];

  const spine: SpineItem[] = itemrefElements.map((itemref) => ({
    idref: getAttribute(itemref, 'idref') || '',
    linear: getAttribute(itemref, 'linear') !== 'no',
  }));

  return {
    metadata,
    manifest,
    spine,
  };
}
