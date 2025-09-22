/**
 * DTB (DAISY Talking Book) XML utilities for DAISY v3 parsing
 * Handles both OPF and DTBook-specific XML element updates
 * Distinct from generic XML and DTBook XML utilities
 */
import { select, selectAll } from 'unist-util-select';
import type { Element, Root } from 'xast';
import type { DtbData, DtbMetadata } from '@/lib/types';
import { extractMetadata, parseXml } from '@/lib/utils';

/**
 * Parse XML string into xast Root node (for DTB/OPF context)
 */
export function parseDtb(xmlContent: string): DtbData {
  const tree = parseXml(xmlContent);

  // Extract metadata from head
  const metaElements = selectAll('element[name=meta]', tree) as Element[];
  const metadata: DtbMetadata = extractMetadata(metaElements);

  return {
    metadata,
    tree,
  };
}

/**
 * Update <meta> and <dc:*> elements in a DTB/OPF tree (in-place)
 */
export function updateDtbMetadataFromTree(
  tree: Root,
  newValue: Record<string, string | string[]>,
  options?: { createIfMissing?: boolean },
) {
  const shouldCreate = options?.createIfMissing !== false;

  const headElement = select('element[name=head]', tree) as Element;

  if (!headElement) {
    throw new Error('Invalid DTB file: no head element found');
  }

  const metaElements = selectAll('element[name=meta]', tree) as Element[];
  const updatedKeys = new Set<string>();

  // Update <meta name="dc:Title"> style elements
  metaElements.forEach((el: Element) => {
    const name = el.attributes?.name;

    if (name && newValue[name] !== undefined) {
      el.attributes = {
        ...el.attributes,
        content: String(newValue[name]),
      };
      updatedKeys.add(name);
    }
  });

  // Optionally add new <meta> elements for keys in newValue that were not updated
  if (shouldCreate) {
    Object.entries(newValue).forEach(([key, value]) => {
      if (updatedKeys.has(key)) return;

      headElement.children.push({
        type: 'element',
        name: 'meta',
        attributes: { name: key, content: String(value) },
        children: [],
      });
    });
  }
}
