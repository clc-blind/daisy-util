/**
 * Parser for DAISY v3 OPF (Open Packaging Format) files
 */

import { select, selectAll } from 'unist-util-select';
import type { Element, Root, Text } from 'xast';
import type {
  ManifestItem,
  OpfData,
  OpfMetadata,
  SpineItem,
} from '@/lib/types';
import { extractMetadata, parseXml } from '@/lib/utils';

/**
 * Parse OPF file content and extract metadata, manifest, and spine
 */
export function parseOpf(opfContent: string): OpfData {
  const tree = parseXml(opfContent);
  const packageElement = select('element[name=package]', tree);

  if (!packageElement) {
    throw new Error('Invalid OPF file: no package element found');
  }

  // Extract metadata
  const metadata: OpfMetadata = {};

  const metadataMapping = {
    'dc:Title': 'title',
    'dc:Creator': 'creator',
    'dc:Identifier': 'identifier',
    'dc:Subject': 'subject',
    'dc:Description': 'description',
    'dc:Publisher': 'publisher',
    'dc:Date': 'date',
    'dc:Language': 'language',
    'dc:Source': 'source',
    'dc:Format': 'format',
  };

  const dcMetadataElements = selectAll(
    'element[name=dc-metadata] > *',
    tree,
  ) as Element[];
  const xMetadataElements = selectAll(
    'element[name=x-metadata] > element[name=meta]',
    tree,
  ) as Element[];

  // Extract all <dc:*> elements
  dcMetadataElements?.forEach((element) => {
    const metadataKey =
      metadataMapping[element.name as keyof typeof metadataMapping];

    if (metadataKey) {
      metadata[metadataKey] = (select('text', element) as Text)?.value;
    }
  });

  // Extract all <meta> elements
  const xMetadata = extractMetadata(xMetadataElements);

  Object.assign(metadata, {
    ...metadata,
    ...xMetadata,
  });

  // Extract manifest
  const itemElements = selectAll(
    'element[name=manifest] > element[name=item]',
    tree,
  ) as Element[];

  const manifest: ManifestItem[] = itemElements.map((item) => ({
    id: item.attributes.id || '',
    href: item.attributes.href || '',
    mediaType: item.attributes['media-type'] || '',
  }));

  // Extract spine
  const itemrefElements = selectAll(
    'element[name=spine] > element[name=itemref]',
    tree,
  ) as Element[];

  const spine: SpineItem[] = itemrefElements.map((itemref) => ({
    idref: itemref.attributes.idref || '',
    linear: itemref.attributes.linear !== 'no',
  }));

  return {
    metadata,
    manifest,
    spine,
  };
}

/**
 * Update OPF metadata in-place from a new XML tree
 * Returns updated OpfData
 */
export function updateOpfMetadataFromTree(
  tree: Root,
  newMetadata: Partial<OpfMetadata>,
  options?: { createIfMissing?: boolean },
) {
  const shouldCreate = options?.createIfMissing !== false;

  const packageElement = select('element[name=package]', tree);
  if (!packageElement) {
    throw new Error('Invalid OPF file: no package element found');
  }

  const dcMetadataParent = select('element[name=dc-metadata]', tree) as Element;
  const dcMetadataElement = selectAll(
    'element[name=dc-metadata] > *',
    tree,
  ) as Element[];
  const xMetadataParent = select('element[name=x-metadata]', tree) as Element;
  const xMetadataElement = selectAll(
    'element[name=x-metadata] > element[name=meta]',
    tree,
  ) as Element[];

  const dcElementNames = [
    'dc:Title',
    'dc:Creator',
    'dc:Identifier',
    'dc:Subject',
    'dc:Description',
    'dc:Publisher',
    'dc:Date',
    'dc:Language',
    'dc:Source',
  ];

  const updatedKeys = new Set<string>();
  dcMetadataElement.forEach((element) => {
    if (element.type !== 'element') return;

    if (dcElementNames.includes(element.name)) {
      const textEl = select('text', element) as Text;

      textEl.value = String(newMetadata[element.name]);

      updatedKeys.add(element.name);
    }
  });

  // Update <meta name="dc:Title"> style elements
  xMetadataElement.forEach((el: Element) => {
    const name = el.attributes?.name;

    if (name && newMetadata[name] !== undefined) {
      el.attributes = {
        ...el.attributes,
        content: String(newMetadata[name]),
      };
      updatedKeys.add(name);
    }
  });

  // Optionally add new <meta> elements for keys in newMetadata that were not updated
  if (shouldCreate) {
    Object.entries(newMetadata).forEach(([key, value]) => {
      if (updatedKeys.has(key)) return;

      if (key.startsWith('dc:')) {
        dcMetadataParent?.children.push({
          type: 'element',
          name: key,
          attributes: {
            'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
          },
          children: [
            {
              type: 'text',
              value: String(newMetadata[key]),
            } as Text,
          ],
        });
      } else {
        xMetadataParent.children.push({
          type: 'element',
          name: 'meta',
          attributes: { name: key, content: String(value) },
          children: [],
        });
      }
    });
  }
}
