/* eslint-disable indent */
import {API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service} from 'homebridge';

import {RoborockAccessory} from './accessories/roborockAccessory.js';
import {makeRoborockDeviceClient, startRoborockSession} from './roborock/roborock-api.js';
import {PLATFORM_NAME, PLUGIN_NAME} from './settings.js';
import {Log} from './util/log.js';
import {readUserData, writeUserData} from './util/user-cache.js';

// How long we wait after a failed discovery attempt before retrying.
const kDiscoveryRefreshInterval = 5000;

/**
 * This class is the entry point for the plugin. It is responsible for parsing
 * the user config, discovering accessories, and registering them.
 */
export class RoborockControllerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // This array is used to track restored cached accessories.
  public readonly cachedAccessories: PlatformAccessory[] = [];

  // This array records the handlers which wrap each accessory.
  public readonly accessoryHandlers: RoborockAccessory[] = [];

  constructor(
      public readonly log: Logging,
      public readonly config: PlatformConfig,
      public readonly api: API,
  ) {
    // Configure the custom log with the Homebridge logger and debug config.
    Log.configure(log, config.enableDebugLog);

    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    // If the config is not valid, bail out immediately. We will not discover
    // any new accessories or register any handlers for cached accessories.
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      Log.error('Plugin suspended. Invalid configuration:', validationErrors);
      return;
    }

    // Notify the user that we have completed platform initialization.
    Log.debug('Finished initializing platform');

    // This event is fired when Homebridge has restored all cached accessories.
    // We must add handlers for these, and check for any new accessories.
    this.api.on('didFinishLaunching', () => {
      Log.debug('Finished restoring all cached accessories from disk');
      this.discoverDevices();
    });
  }

  // Validate that the plugin configuration conforms to the expected format.
  private validateConfig(config: PlatformConfig): string[] {
    const validationErrors: string[] = [];
    if (!config.username) {
      validationErrors.push('No Roborock username specified');
    }
    if (!config.password) {
      validationErrors.push('No Roborock password specified');
    }
    return validationErrors;
  }

  /**
   * This function is invoked for each cached accessory that homebridge restores
   * from disk at startup. Here we add the cached accessories to a list which
   * will be examined later during the 'discoverDevices' phase.
   */
  public configureAccessory(accessory: PlatformAccessory) {
    Log.info('Loading accessory from cache:', accessory.displayName);
    this.cachedAccessories.push(accessory);
  }

  /**
   * Discover and register accessories. Accessories must only be registered
   * once; previously created accessories must not be registered again, to
   * avoid "duplicate UUID" errors.
   */
  private async discoverDevices() {
    // Attempt to load cached userData from persistent storage.
    const userData = await readUserData(this.api, this.config.username);
    Log.debug('Loaded userData:', userData);

    // Discover accessories. If we fail to discover anything, schedule another
    // discovery attempt in the future.
    const rrSession = await startRoborockSession(
        this.config.username, this.config.password, userData);

    if (!rrSession) {
      Log.error('Login failed. Please check your credentials.');
      return;
    }

    // Write the user data out to persistent storage.
    writeUserData(this.api, rrSession);

    const deviceList = await rrSession.home_data.get_all_devices();
    Log.debug('Discovered devices:', deviceList);

    // Iterate over the discovered devices and create handlers for each.
    for await (const device of deviceList) {
      // Generate a unique id for the accessory from its device ID.
      const uuid = this.api.hap.uuid.generate(await device['duid']);
      const displayName = await device['name'];

      // Try to create a client for the device, skip if it fails.
      const rrClient = await makeRoborockDeviceClient(rrSession, device);
      if (!rrClient) {
        Log.info('Could not create client for device:', device);
        continue;
      }

      // See if an accessory with the same uuid already exists.
      let accessory =
          this.cachedAccessories.find(accessory => accessory.UUID === uuid);

      // If the accessory does not yet exist, we need to create it.
      if (!accessory) {
        Log.info('Adding new accessory:', displayName);
        accessory = new this.api.platformAccessory(displayName, uuid);
        this.api.registerPlatformAccessories(
            PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      // Make sure the accessory stays in sync with any device config changes.
      accessory.context.device = device;
      this.api.updatePlatformAccessories([accessory]);

      // Create the accessory handler for this accessory.
      this.accessoryHandlers.push(
          new RoborockAccessory(this, accessory, rrClient));
    }

    if (this.accessoryHandlers.length === 0) {
      Log.warn(
          'Failed to find devices. Retry in', kDiscoveryRefreshInterval, 'ms');
      setTimeout(() => this.discoverDevices(), kDiscoveryRefreshInterval);
    }
  }
}
