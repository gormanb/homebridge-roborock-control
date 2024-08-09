/* eslint-disable @typescript-eslint/no-explicit-any */

import {Log} from './log.js';

// Helper function to safely parse a possibly-invalid JSON string.
export function tryParse(jsonStr: string) {
  try {
    return JSON.parse(jsonStr);
  } catch (ex: any) {
    Log.debug('Invalid JSON:', [jsonStr, ex.message]);
    return undefined;
  }
}
