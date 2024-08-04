/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import {PlatformAccessory, PlatformConfig, Service} from 'homebridge';

import {RoborockControllerPlatform} from '../platform';
import {Log} from '../util/log.js';

/**
 * Base class to implement functionality common to all accessories.
 */
export class BaseAccessory {
  protected static readonly kRefreshInterval = 5000;

  protected readonly config: PlatformConfig;

  protected currentState: any = {};
  protected device: any;

  constructor(
      protected readonly platform: RoborockControllerPlatform,
      protected readonly accessory: PlatformAccessory,
  ) {
    // Retrieve a reference to the device from the accessory.
    this.device = accessory.context.device;

    // Store a reference to the plugin configuration for later use.
    this.config = platform.config;

    // Begin monitoring the device for state changes.
    this.updateDeviceState();
    setInterval(() => this.updateDeviceState(), BaseAccessory.kRefreshInterval);
  }

  // Adds a new service to the device, and returns it.
  protected addService(
      type: typeof Service, name: string, subType: string,
      configuredName: string): Service {
    // Convenience references to Characteristic and Service.
    const Characteristic = this.platform.Characteristic;

    // Add the new service, then add ConfiguredName as a new Characteristic.
    const newService = this.accessory.addService(type, name, subType);
    newService.addOptionalCharacteristic(Characteristic.ConfiguredName);
    newService.setCharacteristic(Characteristic.ConfiguredName, configuredName);

    return newService;
  }

  // Get the device power state and push to Homekit when it changes.
  private async updateDeviceState() {
    // Update the device state from the source.

    // Check whether the derived class' services have been initialized.
    if (!this.servicesReady()) {
      Log.debug('Services not yet initialized:', this.accessory.displayName);
      return;
    }

    // Retrieve the newly-updated device data.
    const lastState = Object.assign({}, this.currentState);
    await this.updateDeviceAndCurrentState();

    // Check whether any attributes have changed.
    if (JSON.stringify(lastState) !== JSON.stringify(this.currentState)) {
      Log.debug(`Updating ${this.accessory.displayName}:`, this.currentState);
      this.updateHomekitState();
    }
  }

  // Implemented by subclasses. Confirms that all accessory services are ready.
  protected servicesReady(): boolean {
    return false;
  }

  // Implemented by subclasses. Updates this.hiveDevice and this.currentState
  // based on the recently-updated Hive data.
  protected async updateDeviceAndCurrentState() {
    // TBI
  }

  // Implemented by subclasses. Updates Homekit with the current state.
  protected async updateHomekitState() {
    // TBI
  }
}
