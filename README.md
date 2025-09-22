# daisy-util

[![Build](https://github.com/clc-blind/daisy-util/actions/workflows/ci.yml/badge.svg)](https://github.com/clc-blind/daisy-util/actions)
[![Coverage](https://codecov.io/github/clc-blind/daisy-util/branch/main/graph/badge.svg)](https://codecov.io/github/clc-blind/daisy-util)
[![Downloads](https://img.shields.io/npm/dm/@clc-blind/daisy-util.svg)](https://www.npmjs.com/package/@clc-blind/daisy-util)
[![Size](https://bundlejs.com/?q=@clc-blind/daisy-util&badge=detailed)](https://bundlejs.com/?q=@clc-blind/daisy-util)

TypeScript library for parsing and extracting information from DAISY v3 files (OPF, NCX, SMIL) with strict specification compliance.

## Contents

- [What is this?](#what-is-this)
- [When should I use this?](#when-should-i-use-this)
- [Install](#install)
- [Use](#use)
- [API](#api)
  - [`parseOpf(xml)`](#parseopfxml)
  - [`parseNcx(xml)`](#parsencxxml)
  - [`parseSmil(xml, filename)`](#parsesmilxml-filename)
  - [`parseTime(timeString)`](#parsetimetimestring)
  - [`formatTime(milliseconds)`](#formattimemilliseconds)
  - [`calculateDuration(start, end)`](#calculatedurationstart-end)
- [Examples](#examples)
  - [Parsing OPF files](#parsing-opf-files)
  - [Parsing NCX files](#parsing-ncx-files)
  - [Parsing SMIL files](#parsing-smil-files)
  - [Working with time values](#working-with-time-values)
- [Types](#types)
  - [`BaseMetadata`](#basemetadata)
  - [`OpfMetadata`](#opfmetadata)
  - [`NcxMetadata`](#ncxmetadata)
  - [`SmilMetadata`](#smilmetadata)
  - [`OpfData`](#opfdata)
  - [`NcxData`](#ncxdata)
  - [`SmilData`](#smildata)
- [Compatibility](#compatibility)
- [Security](#security)
- [Related](#related)
- [Contribute](#contribute)
- [License](#license)

## What is this?

This package is a TypeScript library for parsing and extracting structured information from DAISY v3 (Digital Accessible Information System) files. It provides parsers for the three main DAISY v3 file types:

- **OPF (Open Packaging Format)**: Contains publication metadata, manifest of files, and reading order
- **NCX (Navigation Control for XML)**: Provides the navigation structure and table of contents
- **SMIL (Synchronized Multimedia Integration Language)**: Contains timing information for audio synchronization

The library features:

- **Strict DAISY v3 compliance**: Only supports authentic DAISY v3 formats and specifications
- **Custom time parsing**: Handles DAISY v3 time formats (`H:mm:ss.SSS` and `H:mm:ss`) with millisecond precision
- **TypeScript support**: Fully typed interfaces for all data structures
- **Audio timing**: Precise duration calculations from `clipBegin` and `clipEnd` attributes
- **Metadata extraction**: Dublin Core and DAISY-specific metadata preservation
- **Hierarchical navigation**: Maintains navigation structure with proper level handling

## When should I use this?

This library is ideal when you need to:

- Build accessible audiobook readers or players
- Extract metadata and structure from DAISY v3 publications
- Create navigation interfaces for DAISY content
- Parse audio timing information for synchronized playback
- Work with DAISY v3 files in web applications or Node.js
- Convert DAISY structure to other formats while preserving semantics

This is particularly valuable for accessibility applications, digital publishing platforms, educational technology, and any system that needs to work with DAISY audiobook standards.

## Install

This package is [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
In Node.js (version 16+), install with [npm](https://docs.npmjs.com/cli/install):

```sh
npm install @clc-blind/daisy-util
```

In Deno with [esm.sh](https://esm.sh/):

```js
import { fromDaisy } from 'https://esm.sh/@clc-blind/daisy-util@1';
```

In browsers with [esm.sh](https://esm.sh/):

```html
<script type="module">
  import { fromDaisy } from 'https://esm.sh/@clc-blind/daisy-util@1?bundle';
</script>
```

## Use

Say we have the following DAISY v3 OPF file `book.opf`:

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

And our module `example.js` looks as follows:

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

This package exports the following functions and types. There is no default export.

- [`parseOpf(xml)`](#parseopfxml)
- [`updateOpfMetadataFromTree(tree, newMetadata, options?)`](#updateopfmetadatafromtreetree-newmetadata-options)
- [`parseNcx(xml)`](#parsencxxml)
- [`updateNcxMetadataFromTree(tree, newMetadata, options?)`](#updatencxmetadatafromtreetree-newmetadata-options)
- [`parseSmil(xml, filename)`](#parsesmilxml-filename)
- [`updateSmilMetadataFromTree(tree, newMetadata, options?)`](#updatesmilmetadatafromtreetree-newmetadata-options)
- [`parseDtb(xml)`](#parsedtbxml)
- [`updateDtbMetadataFromTree(tree, newMetadata, options?)`](#updatedtbmetadatafromtreetree-newmetadata-options)
- [`parseXml(xml)`](#parsexmlxml)
- [`toXml(tree)`](#toxmltree)
- [`extractMetadata(metaElements)`](#extractmetadatametaelements)
- [`parseTime(timeString)`](#parsetimetimestring)
- [`formatTime(milliseconds)`](#formattimemilliseconds)
- [`calculateDuration(start, end)`](#calculatedurationstart-end)

### `parseOpf(xml)`

Parse a DAISY v3 OPF (Open Packaging Format) file and extract metadata, manifest, and spine information.

### `updateOpfMetadataFromTree(tree, newMetadata, options?)`

Update OPF metadata in-place on an xast tree. Accepts a parsed OPF tree, a metadata object, and optional options (e.g., `{ createIfMissing: true }`).

### `parseNcx(xml)`

Parse a DAISY v3 NCX (Navigation Control for XML) file and extract navigation structure.

### `updateNcxMetadataFromTree(tree, newMetadata, options?)`

Update NCX metadata in-place on an xast tree. Accepts a parsed NCX tree, a metadata object, and optional options.

### `parseSmil(xml, filename)`

Parse a DAISY v3 SMIL (Synchronized Multimedia Integration Language) file and extract audio timing information.

### `updateSmilMetadataFromTree(tree, newMetadata, options?)`

Update SMIL metadata in-place on an xast tree. Accepts a parsed SMIL tree, a metadata object, and optional options.

### `parseDtb(xml)`

Parse a DAISY DTBook or OPF XML file and extract metadata and tree.

### `updateDtbMetadataFromTree(tree, newMetadata, options?)`

Update DTB/OPF metadata in-place on an xast tree. Accepts a parsed tree, a metadata object, and optional options.

### `parseXml(xml)`

Parse any XML string into an xast tree. Throws on invalid XML.

### `toXml(tree)`

Serialize an xast tree back to XML string.

### `extractMetadata(metaElements)`

Extract metadata key-value pairs from an array of <meta> elements.

### `parseTime(timeString)`

Parse a DAISY v3 time string (e.g., `0:50:27.083`) and convert to milliseconds.

### `formatTime(milliseconds)`

Format milliseconds to an ISO time string.

### `calculateDuration(start, end)`

Calculate duration in milliseconds between two DAISY time strings.

### `findElement(tree, tagName)`

Find the first element with the given tag name in an xast tree.

### `findElements(tree, tagName)`

Find all elements with the given tag name (recursive) in an xast tree.

### `findDirectChildren(tree, tagName)`

Find all direct child elements with the given tag name (non-recursive).

### `getAttribute(element, attributeName)`

Get the value of an attribute from an xast element.

### `getTextContent(element)`

Get the concatenated text content from an xast element.

### `parseOpf(xml)`

Parse a DAISY v3 OPF (Open Packaging Format) file and extract metadata, manifest, and spine information.

###### Parameters

- `xml` (`string`) — Complete OPF XML document as string

###### Returns

OPF data structure ([`OpfData`](#opfdata)).

###### Example

```js
import { parseOpf } from '@clc-blind/daisy-util';

const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Sample Book</dc:title>
    <dc:identifier xmlns:dc="http://purl.org/dc/elements/1.1/" id="bookid">12345</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="navigation.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.smil" media-type="application/smil+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`;

const result = parseOpf(opfXml);

console.log(result.metadata.title); // => 'Sample Book'
console.log(result.manifest.length); // => 2
console.log(result.spine[0].idref); // => 'chapter1'
```

### `parseNcx(xml)`

Parse a DAISY v3 NCX (Navigation Control for XML) file and extract navigation structure.

###### Parameters

- `xml` (`string`) — Complete NCX XML document as string

###### Returns

NCX data structure ([`NcxData`](#ncxdata)).

###### Example

```js
import { parseNcx } from '@clc-blind/daisy-util';

const ncxXml = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="12345"/>
  </head>
  <docTitle>
    <text>Sample Book</text>
  </docTitle>
  <navMap>
    <navPoint id="navpoint1" playOrder="1">
      <navLabel>
        <text>Chapter 1</text>
      </navLabel>
      <content src="chapter1.smil#tcp1"/>
    </navPoint>
  </navMap>
</ncx>`;

const result = parseNcx(ncxXml);

console.log(result.docTitle); // => 'Sample Book'
console.log(result.navPoints[0].label); // => 'Chapter 1'
console.log(result.navPoints[0].level); // => 1
```

### `parseSmil(xml, filename)`

Parse a DAISY v3 SMIL (Synchronized Multimedia Integration Language) file and extract audio timing information.

###### Parameters

- `xml` (`string`) — Complete SMIL XML document as string
- `filename` (`string`) — Name of the SMIL file (used for element key generation)

###### Returns

SMIL data structure ([`SmilData`](#smildata)).

###### Example

```js
import { parseSmil } from '@clc-blind/daisy-util';

const smilXml = `<?xml version="1.0" encoding="UTF-8"?>
<smil xmlns="http://www.w3.org/2001/SMIL20/">
  <head>
    <meta name="dtb:totalElapsedTime" content="0:00:00"/>
  </head>
  <body>
    <seq>
      <par id="tcp1">
        <text src="chapter1.xml#dtb1"/>
        <audio clipBegin="0:00:00" clipEnd="0:00:02.029" src="audio01.mp3"/>
      </par>
    </seq>
  </body>
</smil>`;

const result = parseSmil(smilXml, 'chapter1.smil');

console.log(result.elements['chapter1.smil#tcp1'].src); // => 'audio01.mp3'
console.log(result.elements['chapter1.smil#tcp1'].duration); // => 2029
```

### `parseTime(timeString)`

Parse a DAISY v3 time string and convert to milliseconds.

###### Parameters

- `timeString` (`string`) — DAISY time format (`H:mm:ss.SSS` or `H:mm:ss`)

###### Returns

Duration in milliseconds (`number`).

###### Example

```js
import { parseTime } from '@clc-blind/daisy-util';

console.log(parseTime('0:50:27.083')); // => 3027083
console.log(parseTime('1:23:45')); // => 5025000
console.log(parseTime('40:08:40')); // => 144520000
```

### `formatTime(milliseconds)`

Format milliseconds to ISO time string.

###### Parameters

- `milliseconds` (`number`) — Duration in milliseconds

###### Returns

ISO formatted time string (`string`).

### `calculateDuration(start, end)`

Calculate duration between two DAISY time strings.

###### Parameters

- `start` (`string`) — Start time in DAISY format
- `end` (`string`) — End time in DAISY format

###### Returns

Duration in milliseconds (`number`).

## Examples

### Parsing OPF files

Extract metadata and file structure from OPF files:

```js
import { parseOpf } from '@clc-blind/daisy-util';
import { readFileSync } from 'node:fs';

const opfXml = readFileSync('book.opf', 'utf8');
const opfData = parseOpf(opfXml);

// Access metadata
console.log('Book Title:', opfData.metadata.title);
console.log('Author:', opfData.metadata.creator);
console.log('Publisher:', opfData.metadata.publisher);
console.log('Total Duration:', opfData.metadata.totalTime);

// Find specific files in manifest
const ncxFile = opfData.manifest.find(
  (item) => item.mediaType === 'application/x-dtbncx+xml',
);
console.log('NCX file:', ncxFile?.href);

const smilFiles = opfData.manifest.filter(
  (item) => item.mediaType === 'application/smil+xml',
);
console.log(
  'SMIL files:',
  smilFiles.map((f) => f.href),
);

// Reading order from spine
console.log('Reading order:');
opfData.spine.forEach((item, index) => {
  const manifestItem = opfData.manifest.find((m) => m.id === item.idref);
  console.log(`${index + 1}. ${manifestItem?.href}`);
});
```

### Parsing NCX files

Extract navigation structure from NCX files:

```js
import { parseNcx } from '@clc-blind/daisy-util';
import { readFileSync } from 'node:fs';

const ncxXml = readFileSync('navigation.ncx', 'utf8');
const ncxData = parseNcx(ncxXml);

console.log('Document Title:', ncxData.docTitle);

// Build table of contents
function buildTOC(navPoints, level = 0) {
  const indent = '  '.repeat(level);
  navPoints
    .filter((nav) => nav.level === level + 1)
    .forEach((nav) => {
      console.log(`${indent}${nav.playOrder}. ${nav.label}`);
      console.log(`${indent}   → ${nav.src}`);

      // Recursively show child navigation points
      const children = navPoints.filter(
        (child) =>
          child.level > nav.level &&
          child.playOrder > nav.playOrder &&
          (navPoints.find(
            (next) =>
              next.level === nav.level && next.playOrder > nav.playOrder,
          )?.playOrder ?? Infinity) > child.playOrder,
      );
      if (children.length > 0) {
        buildTOC(children, level + 1);
      }
    });
}

buildTOC(ncxData.navPoints);
```

### Parsing SMIL files

Extract audio timing information from SMIL files:

```js
import { parseSmil, parseTime, calculateDuration } from '@clc-blind/daisy-util';
import { readFileSync } from 'node:fs';

const smilXml = readFileSync('chapter1.smil', 'utf8');
const smilData = parseSmil(smilXml, 'chapter1.smil');

console.log('Total elapsed time:', smilData.totalElapsedTime);

// Process each audio clip
Object.entries(smilData.elements).forEach(([elementId, audioClip]) => {
  console.log(`Element: ${elementId}`);
  console.log(`  Audio: ${audioClip.src}`);
  console.log(`  Start: ${audioClip.clipBegin}`);
  console.log(`  End: ${audioClip.clipEnd}`);
  console.log(`  Duration: ${audioClip.duration}ms`);

  // Convert to seconds for display
  const durationSec = (audioClip.duration || 0) / 1000;
  console.log(`  Duration: ${durationSec.toFixed(3)}s`);
});

// Find longest audio clip
const longestClip = Object.values(smilData.elements).reduce(
  (longest, current) =>
    (current.duration || 0) > (longest.duration || 0) ? current : longest,
);

console.log('Longest clip:', longestClip.src, `(${longestClip.duration}ms)`);
```

### Working with time values

Handle DAISY v3 time formats and conversions:

```js
import {
  parseTime,
  formatTime,
  calculateDuration,
} from '@clc-blind/daisy-util';

// Parse different DAISY time formats
const time1 = parseTime('0:50:27.083'); // Hours:minutes:seconds.milliseconds
const time2 = parseTime('1:23:45'); // Hours:minutes:seconds
const time3 = parseTime('40:08:40'); // Long duration

console.log('Parsed times in milliseconds:');
console.log('50m 27s 83ms =', time1); // 3027083
console.log('1h 23m 45s =', time2); // 5025000
console.log('40h 8m 40s =', time3); // 144520000

// Calculate durations between time points
const start = '0:00:10.500';
const end = '0:00:15.750';
const duration = calculateDuration(start, end);
console.log(`Duration from ${start} to ${end}: ${duration}ms`);

// Format milliseconds back to time string
const formatted = formatTime(5250); // 5.25 seconds
console.log('5250ms formatted:', formatted);

// Working with audio clip durations
const clips = [
  { start: '0:00:00', end: '0:00:05.123' },
  { start: '0:00:05.123', end: '0:00:12.456' },
  { start: '0:00:12.456', end: '0:00:20.789' },
];

let totalDuration = 0;
clips.forEach((clip, index) => {
  const duration = calculateDuration(clip.start, clip.end);
  totalDuration += duration;
  console.log(`Clip ${index + 1}: ${duration}ms`);
});

console.log(`Total duration: ${totalDuration}ms (${totalDuration / 1000}s)`);
```

### Working with metadata

Extract and use metadata separately:

```js
import { fromDaisyXml, extractDaisyMetadata } from '@clc-blind/daisy-util';
import { fromXml } from 'xast-util-from-xml';

const daisyXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-1//EN"
  "http://www.daisy.org/z3986/2005/dtbook-2005-1.dtd">
<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="unique-book-id" />
    <meta name="dc:Title" content="Advanced Topics" />
    <meta name="dc:Language" content="en" />
    <meta name="dtb:totalTime" content="02:15:30" />
  </head>
  <book>
    <bodymatter>
      <level1>
        <hd>Introduction</hd>
        <p>Welcome to this comprehensive guide.</p>
      </level1>
    </bodymatter>
  </book>
</dtbook>`;

// Method 1: Using fromDaisyXml (recommended for complete documents)
const result = fromDaisyXml(daisyXml);
console.log('Complete transformation:', {
  metadata: result.metadata,
  hasContent: result.children.length > 0,
});

// Method 2: Extract metadata separately
const xast = fromXml(daisyXml);
const metadata = extractDaisyMetadata(xast);
console.log('Metadata only:', metadata);
```

### XAST tree conversion

Work with pre-parsed XAST trees:

```js
import { fromXml } from 'xast-util-from-xml';
import { fromDaisy, fromDaisyClone } from '@clc-blind/daisy-util';

const daisyFragment = `
  <level1>
    <hd>Chapter Title</hd>
    <p>This is a <strong>paragraph</strong> with <pagenum>42</pagenum> content.</p>
    <prodnote render="optional">Producer note here.</prodnote>
    <level2>
      <hd>Subsection</hd>
      <p>More content here.</p>
    </level2>
  </level1>
`;

const xast = fromXml(daisyFragment);

// Mutating conversion
const hast1 = fromDaisy(xast);

// Non-mutating conversion (original xast preserved)
const hast2 = fromDaisyClone(xast);

console.log(
  'Both results are equivalent:',
  JSON.stringify(hast1) === JSON.stringify(hast2),
);
```

### Custom mappings

Override default mappings for specific elements:

```js
import { fromDaisy } from '@clc-blind/daisy-util';

const customMappings = {
  // Convert custom DAISY elements
  'special-note': {
    tagName: 'aside',
    dataType: 'special-note',
    roleAttribute: 'note',
  },
  // Override default mapping for production notes
  prodnote: {
    tagName: 'div',
    dataType: 'producer-note',
    preserveAttributes: ['render', 'id'],
  },
};

const result = fromDaisy(xast, { customMappings });
```

## Types

This package is fully typed with [TypeScript](https://www.typescriptlang.org/).
It exports the types [`BaseMetadata`](#basemetadata), [`OpfMetadata`](#opfmetadata), [`NcxMetadata`](#ncxmetadata), [`SmilMetadata`](#smilmetadata), [`OpfData`](#opfdata), [`NcxData`](#ncxdata), [`SmilData`](#smildata), [`ManifestItem`](#manifestitem), [`SpineItem`](#spineitem), [`NavPoint`](#navpoint), and [`AudioClip`](#audioclip).

### `BaseMetadata`

Base metadata interface for all DAISY v3 files. Contains common fields that may appear in any file type.

###### Fields

- `[key: string]` (`string | string[]`, optional) — Additional metadata fields specific to each file type

### `OpfMetadata`

OPF file metadata containing Dublin Core and DTB-specific elements. Based on DAISY 3 Package File specification section 3.2.

###### Fields

- `identifier` (`string`, optional) — Dublin Core Identifier - unique identifier for the publication
- `title` (`string`, optional) — Dublin Core Title - the title of the publication
- `creator` (`string | string[]`, optional) — Dublin Core Creator/Author - creator(s) of the publication
- `subject` (`string | string[]`, optional) — Dublin Core Subject - subject or keywords
- `description` (`string`, optional) — Dublin Core Description - description of the publication
- `publisher` (`string`, optional) — Dublin Core Publisher - publisher of the publication
- `date` (`string`, optional) — Dublin Core Date - publication date (ISO 8601 format)
- `language` (`string`, optional) — Dublin Core Language - language of the publication (ISO 639-1)
- `source` (`string`, optional) — Dublin Core Source - ISBN or source reference
- `format` (`string`, optional) — Dublin Core Format - must be "ANSI/NISO Z39.86-2005" for DAISY v3
- `dtb:multimediaType` (`string`, optional) — DTB multimedia type (audioOnly, audioNCX, etc.)
- `dtb:multimediaContent` (`string`, optional) — DTB multimedia content (comma-delimited list: audio, text, image)
- `dtb:totalTime` (`string`, optional) — DTB total time - total playing time of all SMIL files
- `dtb:producer` (`string`, optional) — DTB producer - organization that created the DTB
- `dtb:narrator` (`string`, optional) — DTB narrator - person whose voice is recorded
- `dtb:sourceDate` (`string`, optional) — DTB source date - publication date of original resource
- `dtb:sourcePublisher` (`string`, optional) — DTB source publisher - publisher of original resource
- `dtb:producedDate` (`string`, optional) — DTB produced date - completion date of DTB production
- `dtb:revision` (`string`, optional) — DTB revision number
- `dtb:audioFormat` (`string`, optional) — DTB audio format (MP3, WAV, etc.)

### `NcxMetadata`

NCX file metadata for navigation control. Based on DAISY 3 NCX specification section 8.4.1.

###### Fields

- `dtb:uid` (`string`, optional) — Globally unique identifier for the DTB (required)
- `dtb:depth` (`string`, optional) — Depth of structure exposed by the NCX (required)
- `dtb:totalPageCount` (`string`, optional) — Total number of pages in the DTB
- `dtb:maxPageNumber` (`string`, optional) — Maximum page number in the DTB
- `dtb:generator` (`string`, optional) — Software that generated the NCX

### `SmilMetadata`

SMIL file metadata for timing and synchronization. Based on DAISY 3 SMIL specification section 7.5.

###### Fields

- `dtb:uid` (`string`, optional) — Globally unique identifier for the DTB (required)
- `dtb:totalElapsedTime` (`string`, optional) — Total elapsed time up to beginning of this SMIL file (required)
- `dtb:generator` (`string`, optional) — Software that generated the SMIL file

### `OpfData`

Complete structure extracted from an OPF file.

###### Fields

- `metadata` ([`OpfMetadata`](#opfmetadata)) — Metadata extracted from the OPF file
- `manifest` ([`ManifestItem[]`](#manifestitem)) — List of all files referenced in the manifest
- `spine` ([`SpineItem[]`](#spineitem)) — Ordered list of SMIL files defining the reading sequence

### `NcxData`

Complete structure extracted from an NCX file.

###### Fields

- `metadata` ([`NcxMetadata`](#ncxmetadata)) — Metadata extracted from the NCX file
- `navPoints` ([`NavPoint[]`](#navpoint)) — Flat list of navigation points with level information
- `docTitle` (`string`, optional) — Document title from NCX head

### `SmilData`

Complete structure extracted from a SMIL file.

###### Fields

- `metadata` ([`SmilMetadata`](#smilmetadata)) — Metadata extracted from the SMIL file
- `elements` (`Record<string, AudioClip>`) — Object mapping from "smil_file_name#element_id" to audio clip data
- `totalElapsedTime` (`string`, optional) — Total duration of the SMIL file

### `ManifestItem`

Represents a file in the OPF manifest.

###### Fields

- `id` (`string`) — Unique identifier for the manifest item
- `href` (`string`) — Relative path to the file
- `mediaType` (`string`) — MIME type of the file

### `SpineItem`

Represents an item in the OPF spine (reading order).

###### Fields

- `idref` (`string`) — Reference to a manifest item ID

### `NavPoint`

Represents a navigation point in the NCX file.

###### Fields

- `id` (`string`) — Unique identifier for the navigation point
- `level` (`number`) — Hierarchical level (1-based, where 1 is top level)
- `label` (`string`) — Navigation label/title
- `src` (`string`) — Reference to content (usually SMIL file with fragment)
- `playOrder` (`number`) — Play order number for sequential navigation

### `AudioClip`

Represents audio timing information for a SMIL clip.

###### Fields

- `src` (`string`) — Source audio file path
- `clipBegin` (`string`) — Start time in the audio file
- `clipEnd` (`string`) — End time in the audio file
- `duration` (`number`, optional) — Duration in milliseconds calculated from clipEnd - clipBegin

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

This package is compatible with Node.js 16+.
It works with `xast-util-from-xml` version 4+, and integrates well with XML parsing and processing workflows.

The library provides comprehensive DAISY v3 specification compliance with strict format validation, ensuring reliable parsing of authentic DAISY audiobook content.

## Security

This utility processes XML content from DAISY files. When working with
untrusted content, consider validating input files against DAISY DTDs and schemas.

The library performs XML parsing and extracts content including file paths and timing information. Ensure proper validation of extracted file paths and metadata when using this data in file system operations.

## Related

- [`xast-util-from-xml`](https://github.com/syntax-tree/xast-util-from-xml) —
  parse XML to xast (used internally)
- [`unist-util-visit`](https://github.com/syntax-tree/unist-util-visit) —
  utility for traversing syntax trees (used internally)
- [`date-fns`](https://github.com/date-fns/date-fns) —
  date manipulation library (used for time formatting)
- [`unified`](https://github.com/unifiedjs/unified) — interface for parsing,
  inspecting, transforming, and serializing content through syntax trees

## Contribute

See [`CONTRIBUTING.md`](CONTRIBUTING.md) in
[`clc-blind/daisy-util`](https://github.com/clc-blind/daisy-util)
for ways to get started.
See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for how to interact with this project.

## License

[MIT](LICENSE) © [clc-blind](https://github.com/clc-blind)
