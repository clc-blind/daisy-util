/**
 * DAISY v3 utility library
 * Simplified implementation using unist-util-visit and date-fns
 */

export type {
  BaseMetadata,
  OpfMetadata,
  NcxMetadata,
  SmilMetadata,
  OpfData,
  ManifestItem,
  SpineItem,
  NcxData,
  NavPoint,
  SmilData,
  AudioClip,
} from '@/lib/types';

export { parseOpf, updateOpfMetadataFromTree } from '@/lib/opf';
export { parseNcx, updateNcxMetadataFromTree } from '@/lib/ncx';
export { parseSmil, updateSmilMetadataFromTree } from '@/lib/smil';
export { parseDtb, updateDtbMetadataFromTree } from '@/lib/dtb';

// Utility functions
export {
  parseXml,
  toXml,
  extractMetadata,
  parseTime,
  formatTime,
  calculateDuration,
} from '@/lib/utils';
