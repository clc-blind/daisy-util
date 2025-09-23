/**
 * TypeScript interfaces and types for DAISY v3 file parsing
 * According to DAISY 3 specifications with file-type-specific metadata
 */

import type { Root } from 'xast';

/**
 * Base metadata interface for all DAISY v3 files
 * Contains common fields that may appear in any file type
 */
export interface BaseMetadata {
  /** Additional metadata fields specific to each file type */
  [key: string]: string | string[] | undefined;
}

/**
 * OPF file metadata containing Dublin Core and DTB-specific elements
 * Based on DAISY 3 Package File specification section 3.2
 */
export interface OpfMetadata extends BaseMetadata {
  /** Dublin Core Identifier - unique identifier for the publication */
  identifier?: string;
  /** Dublin Core Title - the title of the publication */
  title?: string;
  /** Dublin Core Creator/Author - creator(s) of the publication */
  creator?: string | string[];
  /** Dublin Core Subject - subject or keywords */
  subject?: string | string[];
  /** Dublin Core Description - description of the publication */
  description?: string;
  /** Dublin Core Publisher - publisher of the publication */
  publisher?: string;
  /** Dublin Core Date - publication date (ISO 8601 format) */
  date?: string;
  /** Dublin Core Language - language of the publication (ISO 639-1) */
  language?: string;
  /** Dublin Core Source - ISBN or source reference */
  source?: string;
  /** Dublin Core Format - must be "ANSI/NISO Z39.86-2005" for DAISY v3 */
  format?: string;
  /** DTB multimedia type (audioOnly, audioNCX, etc.) */
  'dtb:multimediaType'?: string;
  /** DTB multimedia content (comma-delimited list: audio, text, image) */
  'dtb:multimediaContent'?: string;
  /** DTB total time - total playing time of all SMIL files */
  'dtb:totalTime'?: string;
  /** DTB producer - organization that created the DTB */
  'dtb:producer'?: string;
  /** DTB narrator - person whose voice is recorded */
  'dtb:narrator'?: string;
  /** DTB source date - publication date of original resource */
  'dtb:sourceDate'?: string;
  /** DTB source publisher - publisher of original resource */
  'dtb:sourcePublisher'?: string;
  /** DTB produced date - completion date of DTB production */
  'dtb:producedDate'?: string;
  /** DTB revision number */
  'dtb:revision'?: string;
  /** DTB audio format (MP3, WAV, etc.) */
  'dtb:audioFormat'?: string;
}

/**
 * NCX file metadata for navigation control
 * Based on DAISY 3 NCX specification section 8.4.1
 */
export interface NcxMetadata extends BaseMetadata {
  /** Globally unique identifier for the DTB (required) */
  'dtb:uid'?: string;
  /** Depth of structure exposed by the NCX (required) */
  'dtb:depth'?: string;
  /** Total number of pages in the DTB */
  'dtb:totalPageCount'?: string;
  /** Maximum page number in the DTB */
  'dtb:maxPageNumber'?: string;
  /** Software that generated the NCX */
  'dtb:generator'?: string;
}

/**
 * SMIL file metadata for timing and synchronization
 * Based on DAISY 3 SMIL specification section 7.5
 */
export interface SmilMetadata extends BaseMetadata {
  /** Globally unique identifier for the DTB (required) */
  'dtb:uid'?: string;
  /** Total elapsed time up to beginning of this SMIL file (required) */
  'dtb:totalElapsedTime'?: string;
  /** Software that generated the SMIL file */
  'dtb:generator'?: string;
}

/**
 * Represents a file in the OPF manifest
 */
export interface ManifestItem {
  /** Unique identifier for the manifest item */
  id: string;
  /** Relative path to the file */
  href: string;
  /** MIME type of the file */
  mediaType: string;
}

/**
 * Represents an item in the OPF spine (reading order)
 */
export interface SpineItem {
  /** Reference to a manifest item ID */
  idref: string;
}

/**
 * Complete structure extracted from an OPF file
 */
export interface OpfData {
  /** Metadata extracted from the OPF file */
  metadata: OpfMetadata;
  /** List of all files referenced in the manifest */
  manifest: ManifestItem[];
  /** Ordered list of SMIL files defining the reading sequence */
  spine: SpineItem[];
}

/**
 * Represents a navigation point in the NCX file
 */
export interface NavPoint {
  /** Unique identifier for the navigation point */
  id: string;
  /** Hierarchical level (1-based, where 1 is top level) */
  level: number;
  /** Navigation label/title */
  label: string;
  /** Reference to content (usually SMIL file with fragment) */
  src: string;
  /** Play order number for sequential navigation */
  playOrder: number;
}

/**
 * Complete structure extracted from an NCX file
 */
export interface NcxData {
  /** Metadata extracted from the NCX file */
  metadata: NcxMetadata;
  /** Flat list of navigation points with level information */
  navPoints: NavPoint[];
  /** Document title from NCX head */
  docTitle?: string;
}

/**
 * Represents audio timing information for a SMIL clip
 */
export interface AudioClip {
  /** Source audio file path */
  src: string;
  /** Start time in the audio file */
  clipBegin: string;
  /** End time in the audio file */
  clipEnd: string;
  /** Duration in milliseconds calculated from clipEnd - clipBegin */
  duration?: number;
}

/**
 * Complete structure extracted from a SMIL file
 * Key format: "smil_file_name#element_id" -> audio timing data
 */
export interface SmilData {
  /** Metadata extracted from the SMIL file */
  metadata: SmilMetadata;
  /** Object mapping from "smil_file_name#element_id" to audio clip data */
  elements: Record<string, AudioClip>;
}

/**
 * OPF file metadata containing Dublin Core and DTB-specific elements
 * Based on DAISY 3 Package File specification section 3.2
 */
export interface DtbMetadata extends BaseMetadata {
  /** Dublin Core Identifier - unique identifier for the publication */
  identifier?: string;
  /** Dublin Core Title - the title of the publication */
  title?: string;
  /** Dublin Core Creator/Author - creator(s) of the publication */
  creator?: string | string[];
  /** Dublin Core Subject - subject or keywords */
  subject?: string | string[];
  /** Dublin Core Description - description of the publication */
  description?: string;
  /** Dublin Core Publisher - publisher of the publication */
  publisher?: string;
  /** Dublin Core Date - publication date (ISO 8601 format) */
  date?: string;
  /** Dublin Core Language - language of the publication (ISO 639-1) */
  language?: string;
  /** Dublin Core Source - ISBN or source reference */
  source?: string;
  /** Dublin Core Format - must be "ANSI/NISO Z39.86-2005" for DAISY v3 */
  format?: string;
}

/**
 * Complete structure extract from a DAISY v3 XML file
 */
export interface DtbData {
  metadata: DtbMetadata;
  tree: Root;
}
