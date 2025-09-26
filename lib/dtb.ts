/**
 * DTB (DAISY Talking Book) XML utilities for DAISY v3 parsing
 * Handles both OPF and DTBook-specific XML element updates
 * Distinct from generic XML and DTBook XML utilities
 */
import { select, selectAll } from 'unist-util-select';
import { SKIP, type Test, visit } from 'unist-util-visit';
import type { Element, Root } from 'xast';
import type {
  DaisyTreeSplitResult,
  DtbData,
  DtbMetadata,
  Page,
} from '@/lib/types';
import { extractMetadata, parseXml } from '@/lib/utils';
/**
 * Parse XML string into xast Root node (for DTB/OPF context)
 */
export function parseDtb(xmlContent: string): DtbData {
  const tree = parseXml(xmlContent);

  // Extract metadata from head
  const metaElements = selectAll('element[name=meta]', tree) as Element[];
  const metadata = extractMetadata(metaElements);

  const dtbMetadata = {
    creator: metadata['dc:Creator'] || '',
    title: metadata['dc:Title'] || '',
    publisher: metadata['dc:Publisher'] || '',
    date: metadata['dc:Date'] || '',
    identifier: metadata['dc:Identifier'] || '',
    description: metadata['dc:Description'] || '',
    format: metadata['dc:Format'] || '',
    language: metadata['dc:Language'] || '',
    source: metadata['dc:Source'] || '',
    subject: metadata['dc:Subject'] || '',
  } satisfies DtbMetadata;

  return {
    metadata: dtbMetadata,
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

/**
 * Split a DAISY XML (xast/hast) tree into multiple parts by a given test.
 *
 * Traverses the direct children of the given tree and creates a new part
 * each time a node matching the provided test is encountered. Each part contains all preceding elements
 * (since the last split or start) up to and including the matched element. The rest of the elements (after the last match)
 * are pushed as the final part if any.
 *
 * If there are no matching elements, the function returns a single part containing all the original children.
 * This ensures that the returned array is never empty unless the input tree has no children.
 *
 * This is useful for splitting a large DAISY book tree into smaller chunks for performance or pagination.
 *
 * @param tree - The root element whose children will be split.
 * @param test - A unist-util-visit Test (object, array, or function) to match direct children for splitting.
 *   For example: `{ type: 'element', name: 'p' }` or an array of such objects.
 * @returns An object with the split parts (as Root nodes) and the total number of parts.
 *
 * @example
 *   const { parts, totalParts } = splitDaisyTreeByTag(tree, { type: 'element', name: 'p' });
 *   const { parts } = splitDaisyTreeByTag(tree, [ { type: 'element', name: 'p' }, { type: 'element', name: 'div' } ]);
 */
export function splitDaisyTreeByTag(
  tree: Element,
  test: Test,
): DaisyTreeSplitResult {
  const parts: Root[] = [];

  if (!tree?.children || tree.children.length === 0) {
    return { parts, totalParts: 0 };
  }

  // Wrapper root so we can run `visit` and still detect "direct children" via parent === wrapper.
  const wrapper: Root = { type: 'root', children: tree.children };

  let lastIndex = 0;

  visit(wrapper, test, (node, index, parent) => {
    // Only act on matches that are direct children of our wrapper.
    if (parent !== wrapper || typeof index !== 'number') {
      return SKIP;
    }

    // slice from the last split up to and including this matching child
    const partChildren = wrapper.children.slice(lastIndex, index + 1);
    parts.push({ type: 'root', children: partChildren });

    // next part starts after the matched child
    lastIndex = index + 1;

    // Prevent descending into this matched node
    return SKIP;
  });

  // If there are nodes after the last match, push them as the final part.
  if (lastIndex < wrapper.children.length) {
    parts.push({ type: 'root', children: wrapper.children.slice(lastIndex) });
  }

  return { parts, totalParts: parts.length };
}

/**
 * Paginate a DAISY XML (xast/hast) tree into pages of a given size by splitting on one or more tag names.
 *
 * Uses splitDaisyTreeByTag to split the tree into parts by the specified tag name(s),
 * then groups those parts into pages of the given size. Each page contains a slice of parts,
 * along with pagination metadata (current page, total pages, navigation URLs, etc).
 *
 * @param options - An object with the following properties:
 *   - tree: The root element whose children will be paginated.
 *   - itemsPerPage: The number of parts per page.
 *   - tagName: The tag name or array of tag names to split by (default: 'p').
 *   - basePath: The base path for pagination URLs (default: '/').
 * @returns An array of Page objects, each representing a page of parts and pagination info, with navigation URLs.
 *
 * @example
 *   const pages = paginateDaisyTree({ tree, itemsPerPage: 10, tagName: ['p', 'div'], basePath: '/chapter/' });
 *   // pages[0].data contains the first 10 parts split by <p> or <div>
 */
export function paginateDaisyTree({
  tree,
  itemsPerPage,
  tagName = 'p',
  basePath = '/',
}: {
  tree: Element;
  itemsPerPage: number;
  tagName?: string | string[];
  basePath?: string;
}): Page<Root>[] {
  const mapTest = [...(Array.isArray(tagName) ? tagName : [tagName])].map(
    (name) => ({ type: 'element', name }),
  );

  const { parts } = splitDaisyTreeByTag(tree, mapTest);

  if (parts.length === 0) {
    return [];
  }

  const pages: Page<Root>[] = [];
  const totalItems = parts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  for (let i = 0; i < totalPages; i += 1) {
    const start = i * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    const pageParts = parts.slice(start, end);
    const currentPage = i + 1;
    const lastPage = totalPages;
    const url = {
      current: `${basePath}${currentPage}`,
      prev: currentPage > 1 ? `${basePath}${currentPage - 1}` : undefined,
      next:
        currentPage < lastPage ? `${basePath}${currentPage + 1}` : undefined,
      first: currentPage > 1 ? `${basePath}1` : undefined,
      last: currentPage < lastPage ? `${basePath}${lastPage}` : undefined,
    };

    pages.push({
      data: pageParts,
      start,
      end: end - 1,
      total: totalItems,
      currentPage,
      size: itemsPerPage,
      lastPage,
      url,
    });
  }

  return pages;
}
