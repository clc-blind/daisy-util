import { describe, expect, it } from 'vitest';
import {
  formatTime,
  parseNcx,
  parseOpf,
  parseSmil,
  parseTime,
} from '../lib/index';

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

  describe('parseOpf', () => {
    const sampleOpf = `<?xml version="1.0" encoding="UTF-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
        <metadata>
          <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Sample Book</dc:title>
          <dc:identifier xmlns:dc="http://purl.org/dc/elements/1.1/" id="bookid">12345</dc:identifier>
          <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">John Doe</dc:creator>
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

    it('should parse OPF file correctly', () => {
      const result = parseOpf(sampleOpf);

      expect(result.metadata.title).toBe('Sample Book');
      expect(result.metadata.creator).toBe('John Doe');
      expect(result.manifest).toHaveLength(3);
      expect(result.spine).toHaveLength(1);
      expect(result.spine[0]?.idref).toBe('chapter1');
    });

    it('should extract manifest items correctly', () => {
      const result = parseOpf(sampleOpf);
      const ncxItem = result.manifest.find((item) => item.id === 'ncx');

      expect(ncxItem).toBeDefined();
      expect(ncxItem?.href).toBe('navigation.ncx');
      expect(ncxItem?.mediaType).toBe('application/x-dtbncx+xml');
    });
  });

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

    it('should parse NCX file correctly', () => {
      const result = parseNcx(sampleNcx);

      expect(result.docTitle).toBe('Sample Book');
      expect(result.navPoints).toHaveLength(2);
    });

    it('should maintain hierarchy levels', () => {
      const result = parseNcx(sampleNcx);

      expect(result.navPoints[0]?.level).toBe(1);
      expect(result.navPoints[0]?.label).toBe('Chapter 1');
      expect(result.navPoints[1]?.level).toBe(2);
      expect(result.navPoints[1]?.label).toBe('Section 1.1');
    });
  });

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

    it('should parse SMIL file correctly', () => {
      const result = parseSmil(sampleSmil, 'chapter1.smil');

      expect(result.totalElapsedTime).toBe('0:00:00');
      expect(Object.keys(result.elements)).toHaveLength(2);
    });

    it('should create correct element keys', () => {
      const result = parseSmil(sampleSmil, 'chapter1.smil');

      expect(result.elements['chapter1.smil#tcp1']).toBeDefined();
      expect(result.elements['chapter1.smil#tcp2']).toBeDefined();
    });

    it('should extract audio timing correctly', () => {
      const result = parseSmil(sampleSmil, 'chapter1.smil');
      const tcp1 = result.elements['chapter1.smil#tcp1'];

      expect(tcp1).toBeDefined();
      expect(tcp1?.src).toBe('audio01.mp3');
      expect(tcp1?.clipBegin).toBe('0:00:00');
      expect(tcp1?.clipEnd).toBe('0:00:02.029');
      expect(tcp1?.duration).toBe(2029); // 2.029 seconds = 2029 milliseconds
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
});
