import {API} from 'homebridge';

import {RoborockControllerPlatform} from './platform.js';
import {PLATFORM_NAME} from './settings.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, RoborockControllerPlatform);
};
