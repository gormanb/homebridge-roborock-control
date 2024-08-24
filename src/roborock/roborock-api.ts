/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import assert from 'node:assert';
import {dirname, join} from 'path';
import {python} from 'pythonia';
import {fileURLToPath} from 'url';

import {tryParse} from '../util/helpers.js';
import {Log} from '../util/log.js';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: this is the recommended way to exit pythonia
process.on('exit', () => python.exit());

// Get the path of the directory where this file is located.
const __dirname = dirname(fileURLToPath(import.meta.url));

// Append the 'pylib' path to the python search path.
await (await python('sys')).path.append(join(__dirname, '..', '..', 'pylib'));

// Load asyncio and roborock packages via the python bridge.
export const pyasyncio = await python('asyncio');
export const pyroborock =
    await python(join(__dirname, '..', 'python', 'pyimport.py'));

// State codes and commands for the vacuum from the python library.
export const PyRoborockState = await pyroborock.RoborockStateCode;
export const PyRoborockCmd = await pyroborock.RoborockCommand;

// Product categories which correspond to robot vacuum devices.
const kVacuumCategories = {
  VACUUM: 'robot.vacuum.cleaner',
};

// Enum of known protocol versions.
enum ProtocolVersion {
  V1 = '1.0',
  A01 = 'A01'
}

// For a given device, retrieve the corresponding HomeDataProduct entry.
export async function getProductForDevice(device: any, rrSession: any) {
  const productId = await device.product_id;
  for await (const product of await rrSession.home_data.products) {
    if (await product.id === productId) {
      return product;
    }
  }
  Log.debug(`No product info found for device ${await device.name}`);
  return null;
}

// Determine whether the device is a vacuum based on product category.
export async function isVacuumDevice(product: any) {
  const productJson =
      tryParse(await pyroborock.json.dumps(await product.as_dict()));
  return Object.values(kVacuumCategories).includes(productJson?.category);
}

// Returns a roborock.containers.LoginData with email, user and home data.
export async function startRoborockSession(
    username: string, authMode: string, password: string, pyUserData: any) {
  // Create a client to communicate with the cloud service.
  const cloudConn = await pyroborock.RoborockApiClient(username);

  // The session object that will be returned to the client.
  const rrSession = await pyroborock.LoginData(null, username);

  // Handle the situation where the user has requested OTP login.
  if (authMode === 'otp') {
    try {
      assert(pyUserData);
      rrSession.user_data = pyUserData;
      rrSession.home_data = await pyasyncio.run(
          await cloudConn.get_home_data(await rrSession.user_data));
      return rrSession;
    } catch (ex) {
      Log.error('Invalid or expired one-time-code login data:', ex);
      Log.error('Update the config and restart the plugin.');
      return null;
    }
  }
  // If we're here, then the user has requested password login.
  const tryPasswdLogin = async (userData: any) => {
    try {
      !userData && Log.debug('Missing or expired token data, refreshing login');
      rrSession.user_data =
          userData || await pyasyncio.run(await cloudConn.pass_login(password));
      rrSession.home_data = await pyasyncio.run(
          await cloudConn.get_home_data(await rrSession.user_data));
      return rrSession;
    } catch (ex) {
      Log.info('Error while logging in:', ex);
      return null;
    }
  };
  // Try to log in with the restored user data. If it fails, then force a
  // refresh of the user data and try to log in again.
  return tryPasswdLogin(pyUserData) || tryPasswdLogin(null);
}

// Class which wraps the python library to communicate with the vacuum.
export class RoborockDeviceClient {
  constructor(private readonly rrRawClient: any) {}

  // Returns an object of type Status as defined in containers.py.
  public async getStatus() {
    return await this.sendCommand(await PyRoborockCmd.GET_STATUS);
  }

  public async sendCommand(cmd: string, args?: any) {
    try {
      return await pyasyncio.run(
          await this.rrRawClient._send_command(cmd, args));
    } catch (ex) {
      Log.debug(`Error while sending command ${cmd}:`, ex);
      return null;
    }
  }
}

// Create an MqttClient to communicate with the vacuum.
export async function makeRoborockDeviceClient(
    userData: any, device: any, product: any) {
  const deviceData = await pyroborock.DeviceData(device, await product.model);
  const protocolVersion = await device.pv;
  switch (protocolVersion) {
    case ProtocolVersion.V1:
      return new RoborockDeviceClient(
          await pyroborock.RoborockMqttClientV1(userData, deviceData));
    case ProtocolVersion.A01:  // NYI
    // eslint-disable-next-line no-fallthrough
    default:
      Log.info(
          `Unknown protocol '${protocolVersion}' for '${await device.name}'`);
  }
  return null;
}
