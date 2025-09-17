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

export { parseOpf } from '@/lib/opf';
export { parseNcx } from '@/lib/ncx';
export { parseSmil } from '@/lib/smil';

// Utility functions
export {
  findElement,
  findElements,
  findDirectChildren,
  getAttribute,
  getTextContent,
  extractMetadata,
  updateMetadata,
  parseTime,
  formatTime,
  calculateDuration,
} from '@/lib/utils';
