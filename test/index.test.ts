import { select, selectAll } from 'unist-util-select';
import { describe, expect, it } from 'vitest';
import type { Element, Text } from 'xast';
import {
  type OpfData,
  extractMetadata,
  formatTime,
  parseDtb,
  parseNcx,
  parseOpf,
  parseSmil,
  parseTime,
  parseXml,
  updateDtbMetadataFromTree,
  updateNcxMetadataFromTree,
  updateOpfMetadataFromTree,
  updateSmilMetadataFromTree,
} from '../lib';
import { paginateDaisyTree, splitDaisyTreeByTag } from '@/lib/dtb';

describe('paginateDaisyTree', () => {
  it('paginates a flat list of <p> elements into pages of given size', () => {
    const input: Element = {
      type: 'element',
      name: 'container',
      attributes: {},
      children: [
        { type: 'element', name: 'p', attributes: { id: 'a' }, children: [] },
        { type: 'element', name: 'p', attributes: { id: 'b' }, children: [] },
        { type: 'element', name: 'p', attributes: { id: 'c' }, children: [] },
        { type: 'element', name: 'p', attributes: { id: 'd' }, children: [] },
        { type: 'element', name: 'p', attributes: { id: 'e' }, children: [] },
      ],
    };
    const pages = paginateDaisyTree({
      tree: input,
      itemsPerPage: 2,
      tagName: 'p',
    });
    expect(pages).toHaveLength(3);
    expect(pages[0]).toBeDefined();
    expect(pages[1]).toBeDefined();
    expect(pages[2]).toBeDefined();
    if (pages[0] && pages[1] && pages[2]) {
      expect(pages[0].data).toHaveLength(2);
      expect((pages[0].data[0]?.children[0] as Element).attributes.id).toBe(
        'a',
      );
      expect((pages[0].data[1]?.children[0] as Element).attributes.id).toBe(
        'b',
      );
      expect(pages[1].data).toHaveLength(2);
      expect((pages[1].data[0]?.children[0] as Element).attributes.id).toBe(
        'c',
      );
      expect((pages[1].data[1]?.children[0] as Element).attributes.id).toBe(
        'd',
      );
      expect(pages[2].data).toHaveLength(1);
      expect((pages[2].data[0]?.children[0] as Element).attributes.id).toBe(
        'e',
      );
      expect(pages[0].currentPage).toBe(1);
      expect(pages[1].currentPage).toBe(2);
      expect(pages[2].currentPage).toBe(3);
      expect(pages[0].url.next).toBe('/2');
      expect(pages[2].url.next).toBeUndefined();
      expect(pages[0].url.prev).toBeUndefined();
      expect(pages[1].url.prev).toBe('/1');
    }
  });

  it('returns a single page with the original tree if there are no matching elements', () => {
    const input: Element = {
      type: 'element',
      name: 'container',
      attributes: {},
      children: [
        { type: 'element', name: 'div', attributes: {}, children: [] },
      ],
    };
    const pages = paginateDaisyTree({
      tree: input,
      itemsPerPage: 2,
      tagName: 'p',
    });
    expect(pages).toHaveLength(1);
    expect(pages[0]).toBeDefined();
    if (pages[0]) {
      expect(pages[0].data).toHaveLength(1);
      expect((pages[0].data[0]?.children[0] as Element).name).toBe('div');
      expect(pages[0].currentPage).toBe(1);
      expect(pages[0].lastPage).toBe(1);
    }
  });

  it('handles itemsPerPage greater than number of parts', () => {
    const input: Element = {
      type: 'element',
      name: 'container',
      attributes: {},
      children: [
        { type: 'element', name: 'p', attributes: { id: 'a' }, children: [] },
        { type: 'element', name: 'p', attributes: { id: 'b' }, children: [] },
      ],
    };
    const pages = paginateDaisyTree({
      tree: input,
      itemsPerPage: 10,
      tagName: 'p',
    });
    expect(pages).toHaveLength(1);
    expect(pages[0]).toBeDefined();
    if (pages[0]) {
      expect(pages[0].data).toHaveLength(2);
      expect((pages[0].data[0]?.children[0] as Element).attributes.id).toBe(
        'a',
      );
      expect((pages[0].data[1]?.children[0] as Element).attributes.id).toBe(
        'b',
      );
      expect(pages[0].currentPage).toBe(1);
      expect(pages[0].lastPage).toBe(1);
      expect(pages[0].url.next).toBeUndefined();
      expect(pages[0].url.prev).toBeUndefined();
    }
  });
});

describe('DAISY v3 Utility Library', () => {
  describe('parseTime', () => {
    it('should parse DAISY v3 time formats from real sample files', () => {
      // Real formats from speechgen.opf and speechgen.ncx
      expect(parseTime('0:50:27.083')).toBe(3027083); // dtb:totalTime from OPF
      expect(parseTime('0:00:02.029')).toBe(2029); // clipBegin/clipEnd from NCX/SMIL
      expect(parseTime('0:00:04.878')).toBe(4878); // clipEnd from NCX/SMIL
      expect(parseTime('0:00:05.939')).toBe(5939); // clipEnd from NCX

      // Real format from ncc.html (DAISY v3 without milliseconds)
      expect(parseTime('40:08:40')).toBe(144520000); // 40 hours 8 minutes 40 seconds
      expect(parseTime('0:01:30')).toBe(90000); // 1 minute 30 seconds
      expect(parseTime('1:23:45')).toBe(5025000); // 1 hour 23 minutes 45 seconds
      expect(parseTime('1.178s')).toBe(1178); // 1.178 seconds with 's' suffix
      expect(parseTime('245.793s')).toBe(245793); // 245.793 seconds with 's' suffix
    });

    it('should handle empty or invalid strings', () => {
      expect(parseTime('')).toBe(0);
      expect(parseTime('invalid')).toBe(0);
      expect(parseTime('not:a:time')).toBe(0);
      expect(parseTime('25:61:61')).toBe(0); // Invalid time values
    });
  });

  describe('formatTime', () => {
    it('should format time using ISO format', () => {
      const result = formatTime(90000); // 90 seconds in milliseconds
      expect(result).toContain('1970'); // ISO format includes year
    });
  });

  // Only keep one representative parseOpf test
  describe('parseOpf', () => {
    const sampleOpf = `<?xml version="1.0" encoding="UTF-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
        <metadata>
         <dc-metadata>
            <dc:Title xmlns:dc="http://purl.org/dc/elements/1.1/">Sample Book</dc:Title>
            <dc:Identifier xmlns:dc="http://purl.org/dc/elements/1.1/" id="bookid">12345</dc:Identifier>
            <dc:Creator xmlns:dc="http://purl.org/dc/elements/1.1/">John Doe</dc:Creator>
         </dc-metadata>
        </metadata>
        <manifest>
          <item id="ncx" href="navigation.ncx" media-type="application/x-dtbncx+xml"/>
          <item id="chapter1" href="chapter1.smil" media-type="application/smil+xml"/>
          <item id="audio1" href="audio01.mp3" media-type="audio/mpeg"/>
        </manifest>
        <spine>
          <itemref idref="chapter1"/>
        </spine>
      </package>`;

    it('should parse OPF file and extract manifest items', () => {
      const result = parseOpf(sampleOpf);
      expect(result.metadata.title).toBe('Sample Book');
      expect(result.metadata.creator).toBe('John Doe');
      expect(result.manifest).toHaveLength(3);
      const ncxItem = result.manifest.find((item) => item.id === 'ncx');
      expect(ncxItem).toBeDefined();
      expect(ncxItem?.href).toBe('navigation.ncx');
      expect(ncxItem?.mediaType).toBe('application/x-dtbncx+xml');
      expect(result.spine).toHaveLength(1);
      expect(result.spine[0]?.idref).toBe('chapter1');
    });
  });

  // Only keep one representative parseNcx test
  describe('parseNcx', () => {
    const sampleNcx = `<?xml version="1.0" encoding="UTF-8"?>
      <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
        <head>
          <meta name="dtb:uid" content="12345"/>
          <meta name="dtb:depth" content="2"/>
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
            <navPoint id="navpoint2" playOrder="2">
              <navLabel>
                <text>Section 1.1</text>
              </navLabel>
              <content src="chapter1.smil#tcp2"/>
            </navPoint>
          </navPoint>
        </navMap>
      </ncx>`;

    it('should parse NCX file and maintain hierarchy', () => {
      const result = parseNcx(sampleNcx);
      expect(result.docTitle).toBe('Sample Book');
      expect(result.navPoints).toHaveLength(2);
      expect(result.navPoints[0]?.level).toBe(1);
      expect(result.navPoints[0]?.label).toBe('Chapter 1');
      expect(result.navPoints[1]?.level).toBe(2);
      expect(result.navPoints[1]?.label).toBe('Section 1.1');
    });
  });

  // Only keep one representative parseSmil test
  describe('parseSmil', () => {
    const sampleSmil = `<?xml version="1.0" encoding="UTF-8"?>
      <smil xmlns="http://www.w3.org/2001/SMIL20/">
        <head>
          <title>Chapter 1</title>
          <meta name="dtb:totalElapsedTime" content="0:00:00"/>
        </head>
        <body>
          <seq dur="0:00:04.878" fill="remove" id="mseq">
            <par id="tcp1">
              <text src="chapter1.xml#dtb1"/>
              <audio clipBegin="0:00:00" clipEnd="0:00:02.029" src="audio01.mp3"/>
            </par>
            <par id="tcp2">
              <text src="chapter1.xml#dtb2"/>
              <audio clipBegin="0:00:02.029" clipEnd="0:00:04.878" src="audio01.mp3"/>
            </par>
          </seq>
        </body>
      </smil>`;

    it('should parse SMIL file and extract audio timing', () => {
      const result = parseSmil(sampleSmil, 'chapter1.smil');
      expect(Object.keys(result.elements)).toHaveLength(2);
      expect(result.elements['chapter1.smil#tcp1']).toBeDefined();
      expect(result.elements['chapter1.smil#tcp2']).toBeDefined();
      const tcp1 = result.elements['chapter1.smil#tcp1'];
      expect(tcp1?.src).toBe('audio01.mp3');
      expect(tcp1?.clipBegin).toBe('0:00:00');
      expect(tcp1?.clipEnd).toBe('0:00:02.029');
      expect(tcp1?.duration).toBe(2029);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid XML', () => {
      expect(() => parseOpf('invalid xml')).toThrow();
      expect(() => parseNcx('invalid xml')).toThrow();
      expect(() => parseSmil('invalid xml', 'test.smil')).toThrow();
    });

    it('should throw error for missing required elements', () => {
      expect(() => parseOpf('<root></root>')).toThrow();
      expect(() => parseNcx('<root></root>')).toThrow();
      expect(() => parseSmil('<root></root>', 'test.smil')).toThrow();
    });
  });

  // --- dtb.ts tests ---
  const dtbXml = `<?xml version="1.0" encoding="utf-8"?>
  <!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-3//EN" "http://www.daisy.org/z3986/2005/dtbook-2005-3.dtd">
  <dtbook
  	xmlns="http://www.daisy.org/z3986/2005/dtbook/" xml:lang="vi-VN" version="2005-3">
  	<head>
  		<meta content="AUTO-UID-7090184476171985458-packaged" name="dtb:uid"></meta>
  		<meta content="DAISY Pipeline 2 word-to-dtbook 1.0.0" name="dtb:generator"></meta>
  		<meta content="Bỉ Vỏ" name="dc:Title"></meta>
  		<meta content="Nguyên Hồng" name="dc:Creator"></meta>
  		<meta content="1937" name="dc:Date"></meta>
  		<meta content="Tiểu thuyết đầu tay của Nguyên Hồng kể về Tám Bính – cô gái quê bị lừa và xô đẩy vào đời sống tội lỗi, trở thành “bỉ vỏ” – kẻ ăn cắp chuyên nghiệp. Tác phẩm phản ánh bi kịch một lớp người sống dưới đáy xã hội phong kiến, tố cáo xã hội tàn nhẫn và thiếu lòng bao dung." name="dc:Description"></meta>
  		<meta content="AUTO-UID-7090184476171985458-packaged" name="dc:Identifier"></meta>
  		<meta content="vi" name="dc:Language"></meta>
  	</head>
  </dtbook>`;

  describe('parseDtb', () => {
    it('parses valid OPF XML to DtbData', () => {
      const dtb = parseDtb(dtbXml);
      expect(dtb).toHaveProperty('tree');
      expect(dtb).toHaveProperty('metadata');
    });
  });

  describe('updateDtbMetadataFromTree', () => {
    it('updates DTB metadata in <head> correctly', () => {
      const dtb = parseDtb(dtbXml);
      updateDtbMetadataFromTree(dtb.tree, {
        'dc:Title': 'Updated Title',
        'dc:Creator': 'Updated Author',
        'dtb:totalTime': '3:00:00',
      });
      // Extract updated metadata from head
      const metaElements = selectAll(
        'element[name=meta]',
        dtb.tree,
      ) as Element[];
      const metadata = extractMetadata(metaElements);
      expect(metadata['dc:Title']).toBe('Updated Title');
      expect(metadata['dc:Creator']).toBe('Updated Author');
      expect(metadata['dtb:totalTime']).toBe('3:00:00');
    });
  });

  // --- opf.ts tests ---
  const opfXml2 = `<?xml version="1.0" encoding="UTF-8"?>
  <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
    <metadata>
      <dc-metadata>
        <dc:Title xmlns:dc="http://purl.org/dc/elements/1.1/">My DAISY Book</dc:Title>
        <dc:Creator xmlns:dc="http://purl.org/dc/elements/1.1/">Jane Author</dc:Creator>
      </dc-metadata>
      <x-metadata>
        <meta name="dtb:totalTime" content="2:15:30"/>
      </x-metadata>
    </metadata>
    <manifest>
      <item id="ncx" href="navigation.ncx" media-type="application/x-dtbncx+xml"/>
    </manifest>
    <spine>
      <itemref idref="ncx"/>
    </spine>
  </package>`;

  describe('parseOpf', () => {
    it('parses OPF XML and extracts metadata', () => {
      const data: OpfData = parseOpf(opfXml2);
      expect(data.metadata.title).toBe('My DAISY Book');
      expect(data.metadata.creator).toBe('Jane Author');
      expect(data.metadata['dtb:totalTime']).toBe('2:15:30');
      expect(data.manifest.length).toBe(1);
      expect(data.spine.length).toBe(1);
    });
  });

  describe('updateOpfMetadataFromTree', () => {
    it('updates OPF metadata in dc-metadata/x-metadata correctly', () => {
      const opfTree = parseXml(opfXml2);
      updateOpfMetadataFromTree(opfTree, {
        'dc:Title': 'Updated Title',
        'dc:Creator': 'Updated Author',
        'dtb:totalTime': '3:00:00',
      });
      const title = (
        select(
          'element[name=dc-metadata] > element[name="dc:Title"] > text',
          opfTree,
        ) as Text
      ).value;
      const creator = (
        select(
          'element[name=dc-metadata] > element[name="dc:Creator"] > text',
          opfTree,
        ) as Text
      ).value;
      const dtbTotalTime = (
        selectAll(
          'element[name=x-metadata] > element[name=meta]',
          opfTree,
        ) as Element[]
      ).find((el) => el.attributes.name === 'dtb:totalTime')?.attributes
        .content;

      expect(title).toBe('Updated Title');
      expect(creator).toBe('Updated Author');
      expect(dtbTotalTime).toBe('3:00:00');
    });
  });

  // --- ncx.ts tests ---
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

  describe('updateNcxMetadataFromTree', () => {
    it('updates NCX metadata in <metadata> correctly', () => {
      const ncxTree = parseXml(ncxXml);
      updateNcxMetadataFromTree(ncxTree, {
        'dtb:uid': 'updated-uid',
      });
      // Extract updated metadata from <metadata>
      const metaElements = selectAll(
        'element[name=meta]',
        ncxTree,
      ) as Element[];
      const meta = extractMetadata(metaElements);
      const dtbUid = meta['dtb:uid'];

      expect(dtbUid).toBe('updated-uid');
    });
  });

  // --- smil.ts tests ---
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

  describe('updateSmilMetadataFromTree', () => {
    it('updates SMIL metadata in <metadata> correctly', () => {
      const smilTree = parseXml(smilXml);
      updateSmilMetadataFromTree(smilTree, {
        'dtb:totalElapsedTime': '1:23:45',
      });
      // Extract updated metadata from <metadata>
      const metaElements = selectAll(
        'element[name=meta]',
        smilTree,
      ) as Element[];
      const meta = extractMetadata(metaElements);
      const dtbTotalElapsedTime = meta['dtb:totalElapsedTime'];
      expect(dtbTotalElapsedTime).toBe('1:23:45');
    });
  });
});

describe('splitDaisyTreeByTag', () => {
  it('returns one part for tree with only non-element children', () => {
    const input: Element = {
      type: 'element',
      name: 'root',
      attributes: {},
      children: [
        { type: 'text', value: 'Just text' },
        { type: 'comment', value: 'A comment' },
      ],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(1);
    expect(parts).toHaveLength(1);
    expect(parts[0]?.children?.length).toBe(2);
    expect(parts[0]?.children?.[0]?.type).toBe('text');
    expect(parts[0]?.children?.[1]?.type).toBe('comment');
  });

  it('returns one part for tree where all children match', () => {
    const input: Element = {
      type: 'element',
      name: 'root',
      attributes: {},
      children: [
        { type: 'element', name: 'p', attributes: { id: '1' }, children: [] },
        { type: 'element', name: 'p', attributes: { id: '2' }, children: [] },
        { type: 'element', name: 'p', attributes: { id: '3' }, children: [] },
      ],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(3);
    expect(parts[0]?.children?.length).toBe(1);
    expect((parts[0]?.children?.[0] as Element).attributes.id).toBe('1');
    expect((parts[1]?.children?.[0] as Element).attributes.id).toBe('2');
    expect((parts[2]?.children?.[0] as Element).attributes.id).toBe('3');
  });

  it('splits interleaved matches and non-matches correctly', () => {
    const input: Element = {
      type: 'element',
      name: 'root',
      attributes: {},
      children: [
        { type: 'element', name: 'a', attributes: {}, children: [] },
        { type: 'element', name: 'p', attributes: { id: 'x' }, children: [] },
        { type: 'element', name: 'b', attributes: {}, children: [] },
        { type: 'element', name: 'p', attributes: { id: 'y' }, children: [] },
        { type: 'element', name: 'c', attributes: {}, children: [] },
      ],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(3);
    expect(parts[0]?.children?.length).toBe(2);
    expect((parts[0]?.children?.[0] as Element).name).toBe('a');
    expect((parts[0]?.children?.[1] as Element).name).toBe('p');
    expect((parts[1]?.children?.[0] as Element).name).toBe('b');
    expect((parts[1]?.children?.[1] as Element).name).toBe('p');
    expect(parts[2]?.children?.length).toBe(1);
    expect((parts[2]?.children?.[0] as Element).name).toBe('c');
  });

  it('handles tree with only one matching element', () => {
    const input: Element = {
      type: 'element',
      name: 'root',
      attributes: {},
      children: [
        { type: 'element', name: 'a', attributes: {}, children: [] },
        {
          type: 'element',
          name: 'p',
          attributes: { id: 'only' },
          children: [],
        },
        { type: 'element', name: 'b', attributes: {}, children: [] },
      ],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(2);
    expect(parts[0]?.children?.length).toBe(2);
    expect((parts[0]?.children?.[0] as Element).name).toBe('a');
    expect((parts[0]?.children?.[1] as Element).name).toBe('p');
    expect((parts[1]?.children?.[0] as Element).name).toBe('b');
  });
  it('splits direct children by tag name, collects up to and including each match', () => {
    const input: Element = {
      type: 'element',
      name: 'section',
      attributes: {},
      children: [
        {
          type: 'element',
          name: 'p',
          attributes: { id: 'p1' },
          children: [{ type: 'text', value: 'Paragraph 1' }],
        },
        {
          type: 'element',
          name: 'p',
          attributes: { id: 'p2' },
          children: [{ type: 'text', value: 'Paragraph 2' }],
        },
        {
          type: 'element',
          name: 'div',
          attributes: {},
          children: [
            {
              type: 'element',
              name: 'p',
              attributes: { id: 'p3' },
              children: [{ type: 'text', value: 'Paragraph 3' }],
            },
          ],
        },
      ],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(3);
    expect(parts).toHaveLength(3);
    expect(parts[0]?.children?.length).toBe(1);
    expect((parts[0]?.children?.[0] as Element).attributes.id).toBe('p1');
    expect(parts[1]?.children?.length).toBe(1);
    expect((parts[1]?.children?.[0] as Element).name).toBe('p');
  });

  it('returns the original tree as a single part if no splitTag is found', () => {
    const input: Element = {
      type: 'element',
      name: 'section',
      attributes: {},
      children: [
        {
          type: 'element',
          name: 'div',
          attributes: {},
          children: [
            {
              type: 'element',
              name: 'span',
              attributes: {},
              children: [{ type: 'text', value: 'No split here' }],
            },
          ],
        },
      ],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(1);
    expect(parts).toHaveLength(1);
    expect((parts[0]?.children?.[0] as Element).name).toBe('div');
  });

  it('returns empty if tree has no children', () => {
    const input: Element = {
      type: 'element',
      name: 'empty',
      attributes: {},
      children: [],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(0);
    expect(parts).toHaveLength(0);
  });

  it('splits only at root level, not nested', () => {
    const input: Element = {
      type: 'element',
      name: 'main',
      attributes: {},
      children: [
        {
          type: 'element',
          name: 'section',
          attributes: {},
          children: [
            {
              type: 'element',
              name: 'p',
              attributes: { id: 'a' },
              children: [{ type: 'text', value: 'A' }],
            },
            {
              type: 'element',
              name: 'p',
              attributes: { id: 'b' },
              children: [{ type: 'text', value: 'B' }],
            },
          ],
        },
        {
          type: 'element',
          name: 'section',
          attributes: {},
          children: [
            {
              type: 'element',
              name: 'p',
              attributes: { id: 'c' },
              children: [{ type: 'text', value: 'C' }],
            },
          ],
        },
      ],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(1);
    expect(parts[0]?.children?.length).toBe(2);
    expect((parts[0]?.children?.[0] as Element).name).toBe('section');
    expect((parts[0]?.children?.[1] as Element).name).toBe('section');
  });

  it('splits a flat list of ps into one part per p', () => {
    const input: Element = {
      type: 'element',
      name: 'container',
      attributes: {},
      children: [
        {
          type: 'element',
          name: 'p',
          attributes: { id: 'a' },
          children: [{ type: 'text', value: 'A' }],
        },
        {
          type: 'element',
          name: 'p',
          attributes: { id: 'b' },
          children: [{ type: 'text', value: 'B' }],
        },
        {
          type: 'element',
          name: 'p',
          attributes: { id: 'c' },
          children: [{ type: 'text', value: 'C' }],
        },
      ],
    };
    const { parts, totalParts } = splitDaisyTreeByTag(input, {
      type: 'element',
      name: 'p',
    });
    expect(totalParts).toBe(3);
    expect(parts[0]?.children?.length).toBe(1);
    expect((parts[0]?.children?.[0] as Element).attributes.id).toBe('a');
    expect((parts[1]?.children?.[0] as Element).attributes.id).toBe('b');
    expect((parts[2]?.children?.[0] as Element).attributes.id).toBe('c');
  });
});
