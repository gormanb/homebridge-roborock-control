/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import {API} from 'homebridge';
import {join} from 'path';

import {pyroborock} from '../roborock/roborock-api.js';
import {PLUGIN_NAME} from '../settings.js';

import {Log} from './log.js';

// Write LoginData.user_data to persistent storage for future sessions.
export async function writeUserData(api: API, pyLoginData: any) {
  const userJson =
      await pyroborock.json.dumps(await pyLoginData.user_data.as_dict());
  const dirPath = join(api.user.storagePath(), PLUGIN_NAME);
  const filePath = join(dirPath, await pyLoginData.email);
  Log.debug('Writing userData to ', filePath);
  try {
    fs.mkdirSync(dirPath, {recursive: true});
    fs.writeFileSync(filePath, userJson);
  } catch (ex) {
    Log.debug(`Failed to write userData to ${filePath}:`, ex);
  }
}

// Read LoginData.user_data from persistent storage and deserialize it.
export async function readUserData(api: API, email: string) {
  const filePath = join(api.user.storagePath(), PLUGIN_NAME, email);
  Log.debug('Reading userData from ', filePath);
  try {
    const userJson = fs.readFileSync(filePath).toString();
    return await pyroborock.UserData.from_dict(
        await pyroborock.json.loads(userJson));
  } catch (ex) {
    Log.debug(`Failed to read userData from ${filePath}:`, ex);
  }
  return null;
}