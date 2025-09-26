# daisy-util

TypeScript utility to parse, extract, and manipulate DAISY v3 files (OPF, NCX, SMIL, DTBook) with full metadata and structure preservation, following unist/xast conventions.

## Contents

- [What is this?](#what-is-this)
- [When should I use this?](#when-should-i-use-this)
- [Install](#install)
- [Use](#use)
- [API](#api)
  - [parseOpf](#parseopfxml-string-opfdata)
  - [parseNcx](#parsencxxml-string-ncxdata)
  - [parseSmil](#parsesmilxml-string-filename-string-smildata)
  - [parseDtb](#parsedtbxml-string-dtbdata)
  - [splitDaisyTreeByTag](#splitdaisytreebytagtree-element-test-test-daisytreesplitresult)
  - [paginateDaisyTree](#paginatedaisytree-tree-itemsperpage-tagname--p-basepath-----tree-element-itemsperpage-number-tagname-string--string-basepath-string--pageroot)
  - [updateOpfMetadataFromTree](#updateopfmetadatafromtreetree-root-newmetadata-partialopfmetadata-options--createifmissing-boolean--void)
  - [updateNcxMetadataFromTree](#updatencxmetadatafromtreetree-root-newmetadata-partialncxmetadata-options--createifmissing-boolean--void)
  - [updateSmilMetadataFromTree](#updatesmilmetadatafromtreetree-root-newmetadata-partialsmilmetadata-options--createifmissing-boolean--void)
  - [updateDtbMetadataFromTree](#updatedtbmetadatafromtreetree-root-newmetadata-recordstring-string--string-options--createifmissing-boolean--void)
  - [parseXml](#parsexmlxml-string-root)
  - [toXml](#toxmltree-root-string)
  - [extractMetadata](#extractmetadatametaelements-element-basemetadata)
  - [parseTime](#parsetimetimestring-string-number)
  - [formatTime](#formattimemilliseconds-number-string)
  - [calculateDuration](#calculatedurationstart-string-end-string-number)
- [Examples](#examples)
- [Types](#types)
- [Compatibility](#compatibility)
- [Security](#security)
- [Related](#related)
- [Contribute](#contribute)
- [License](#license)

## What is this?

**daisy-util** is a TypeScript library for parsing, extracting, and updating metadata and structure from DAISY v3 files (OPF, NCX, SMIL, DTBook). It provides:

- **Strict DAISY v3 compliance**: Only supports authentic DAISY v3 formats and specifications
- **Metadata extraction**: Dublin Core and DAISY-specific metadata preservation
- **Tree utilities**: Split and paginate xast trees by tag(s) for efficient processing
- **TypeScript support**: Fully typed interfaces for all data structures
- **Low-level XML helpers**: Parse and serialize xast trees, extract metadata, and handle DAISY time formats

The library is built on [unist](https://github.com/syntax-tree/unist), [xast](https://github.com/syntax-tree/xast), and [unist-util-visit](https://github.com/syntax-tree/unist-util-visit), following their conventions for tree manipulation and traversal.

## When should I use this?

Use **daisy-util** when you need to:

- Parse and extract metadata/structure from DAISY v3 publications
- Build accessible audiobook readers or players
- Create navigation interfaces for DAISY content
- Paginate or split DAISY XML trees for performance or UI
- Work with DAISY v3 files in web applications or Node.js

## Install

In Node.js (version 16+), install with [npm](https://docs.npmjs.com/cli/install):

```sh
npm install @clc-blind/daisy-util
```

## Use

Say we have a DAISY v3 OPF file `book.opf`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">My DAISY Book</dc:title>
    <dc:identifier xmlns:dc="http://purl.org/dc/elements/1.1/" id="bookid">isbn-123456</dc:identifier>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Jane Author</dc:creator>
    <meta name="dtb:totalTime" content="2:15:30"/>
  </metadata>
  <manifest>
    <item id="ncx" href="navigation.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.smil" media-type="application/smil+xml"/>
    <item id="audio1" href="audio01.mp3" media-type="audio/mpeg"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>
```

And our module `example.js`:

```js
import { parseOpf, parseTime } from '@clc-blind/daisy-util';
import { readFileSync } from 'node:fs';

const opfXml = readFileSync('book.opf', 'utf8');
const opfData = parseOpf(opfXml);

console.log('Title:', opfData.metadata.title);
console.log('Author:', opfData.metadata.creator);
console.log('Total time:', opfData.metadata.totalTime);
console.log('Spine items:', opfData.spine.length);

// Parse the total time to milliseconds
const totalMs = parseTime(opfData.metadata.totalTime || '0:00:00');
console.log('Duration in ms:', totalMs);
```

…then running `node example.js` yields:

```
Title: My DAISY Book
Author: Jane Author
Total time: 2:15:30
Spine items: 1
Duration in ms: 8130000
```

## API

### `parseOpf(xml: string): OpfData`

Parse a DAISY v3 OPF XML string into structured metadata, manifest, and spine.

### `parseNcx(xml: string): NcxData`

Parse a DAISY v3 NCX XML string into navigation structure and metadata.

### `parseSmil(xml: string, filename: string): SmilData`

Parse a DAISY v3 SMIL XML string and extract audio timing and metadata.

### `parseDtb(xml: string): DtbData`

Parse a DAISY DTBook or OPF XML string and extract metadata and tree.

### `splitDaisyTreeByTag(tree: Element, test: Test): DaisyTreeSplitResult`

Split a DAISY XML tree into parts by a unist-util-visit Test (object, array, or function).

### `paginateDaisyTree({ tree, itemsPerPage, tagName = 'p', basePath = '/' }: { tree: Element, itemsPerPage: number, tagName?: string | string[], basePath?: string }): Page<Root>[]`

Paginate a DAISY XML tree into pages by splitting on one or more tag names.

### `updateOpfMetadataFromTree(tree: Root, newMetadata: Partial<OpfMetadata>, options?: { createIfMissing?: boolean }): void`

Update OPF metadata in-place on a parsed xast tree.

### `updateNcxMetadataFromTree(tree: Root, newMetadata: Partial<NcxMetadata>, options?: { createIfMissing?: boolean }): void`

Update NCX metadata in-place on a parsed xast tree.

### `updateSmilMetadataFromTree(tree: Root, newMetadata: Partial<SmilMetadata>, options?: { createIfMissing?: boolean }): void`

Update SMIL metadata in-place on a parsed xast tree.

### `updateDtbMetadataFromTree(tree: Root, newMetadata: Record<string, string | string[]>, options?: { createIfMissing?: boolean }): void`

Update DTBook/OPF metadata in-place on a parsed xast tree.

### `parseXml(xml: string): Root`

Parse any XML string into an xast tree.

### `toXml(tree: Root): string`

Serialize an xast tree back to XML string.

### `extractMetadata(metaElements: Element[]): BaseMetadata`

Extract metadata key-value pairs from an array of <meta> elements.

### `parseTime(timeString: string): number`

Parse a DAISY v3 time string (e.g., `0:50:27.083`) to milliseconds.

### `formatTime(milliseconds: number): string`

Format milliseconds to an ISO time string.

### `calculateDuration(start: string, end: string): number`

Calculate duration in milliseconds between two DAISY time strings.

## Examples

```js
import {
  parseOpf,
  parseNcx,
  parseSmil,
  parseDtb,
  splitDaisyTreeByTag,
  paginateDaisyTree,
  parseXml,
  toXml,
  extractMetadata,
  parseTime,
  formatTime,
  calculateDuration,
} from '@clc-blind/daisy-util';

const opfXml = '<package>...</package>';
const opfData = parseOpf(opfXml);

const ncxXml = '<ncx>...</ncx>';
const ncxData = parseNcx(ncxXml);

const smilXml = '<smil>...</smil>';
const smilData = parseSmil(smilXml, 'chapter1.smil');

const dtbXml = '<dtbook>...</dtbook>';
const dtbData = parseDtb(dtbXml);

const { parts } = splitDaisyTreeByTag(someElement, {
  type: 'element',
  name: 'p',
});
const pages = paginateDaisyTree({
  tree: someElement,
  itemsPerPage: 10,
  tagName: ['p', 'div'],
});

const tree = parseXml('<root><child/></root>');
const xml = toXml(tree);
const meta = extractMetadata([
  /* meta elements */
]);
const ms = parseTime('0:50:27.083');
const iso = formatTime(5250);
const duration = calculateDuration('0:00:10.500', '0:00:15.750');
```

## Types

- `BaseMetadata`: `{ [key: string]: string | undefined }` — Base metadata for all DAISY files.
- `OpfMetadata`, `NcxMetadata`, `SmilMetadata`, `DtbMetadata`: File-type-specific metadata.
- `ManifestItem`: `{ id: string, href: string, mediaType: string }` — OPF manifest entry.
- `SpineItem`: `{ idref: string }` — OPF spine entry.
- `OpfData`, `NcxData`, `SmilData`, `DtbData`: Parsed data structures for each file type.
- `NavPoint`: Navigation point in NCX.
- `AudioClip`: Audio timing info for SMIL.
- `DaisyTreeSplitResult`: `{ parts: Root[], totalParts: number }` — Result of splitting a tree.
- `Page<T>`: Paginated result structure.

## Compatibility

This package is compatible with Node.js 16+ and works with `xast-util-from-xml` version 4+.
It is designed to integrate with the broader unified/unist/xast ecosystem.

## Security

This utility processes XML content from DAISY files. When working with untrusted content, consider validating input files against DAISY DTDs and schemas.

The library performs XML parsing and extracts content including file paths and metadata. Ensure proper validation of extracted file paths and metadata when using this data in file system operations.

## Related

- [`xast-util-from-xml`](https://github.com/syntax-tree/xast-util-from-xml) — parse XML to xast
- [`unist-util-visit`](https://github.com/syntax-tree/unist-util-visit) — utility for traversing syntax trees
- [`date-fns`](https://github.com/date-fns/date-fns) — date manipulation library
- [`unified`](https://github.com/unifiedjs/unified) — interface for parsing, inspecting, transforming, and serializing content through syntax trees

## Contribute

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for ways to get started.
See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for how to interact with this project.

## License

[MIT](LICENSE) © clc-blind
