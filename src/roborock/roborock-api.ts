/* eslint-disable indent */
import {dirname, join} from 'path';
import {python} from 'pythonia';
import {fileURLToPath} from 'url';

import {Log} from '../util/log.js';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: this is the recommended way to exit pythonia
process.on('exit', () => python.exit());

// Get the path of the directory where this file is located.
const __dirname = dirname(fileURLToPath(import.meta.url));
await (await python('sys')).path.append(join(__dirname, '..', '..', 'pylib'));

export const [pyroborock, pyasyncio] =
    [await python('roborock.cli'), await python('asyncio')];

// Returns a roborock.containers.LoginData with email, user and home data.
export async function startRoborockSession(username: string, password: string) {
  // Create a session, log in, and retrieve the user's home data.
  const cloudConn = await pyroborock.RoborockApiClient(username);
  const rrSession = await pyroborock.LoginData(null, username);
  try {
    rrSession.user_data =
        await pyasyncio.run(await cloudConn.pass_login(password));
    rrSession.home_data = await pyasyncio.run(
        await cloudConn.get_home_data(await rrSession.user_data));
  } catch (ex) {
    Log.info('Failed to start Roborock session:', ex);
    return null;
  }
  return rrSession;
}

export class RoborockDeviceClient {
  constructor(private readonly rrRawClient: any) {}

  public async getStatus() {
    return await this.sendCommand('get_status');
  }

  public async sendCommand(cmd: string, args?: any) {
    return await pyasyncio.run(await this.rrRawClient._send_command(cmd, args));
  }
}

// Create an MqttClient to communicate with the vacuum.
export async function makeRoborockDeviceClient(rrSession: any, device: any) {
  const productId = await device.product_id;
  for await (const product of await rrSession.home_data.products) {
    if (await product.id === productId) {
      const deviceData =
          await pyroborock.DeviceData(device, await product.model);
      const rrRawClient = await pyroborock.RoborockMqttClientV1(
          await rrSession.user_data, deviceData);
      return new RoborockDeviceClient(rrRawClient);
    }
  }
  Log.debug('Could not find device model for:', device);
  return null;
}
