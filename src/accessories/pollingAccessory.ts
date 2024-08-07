/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable indent */
import {PlatformAccessory, PlatformConfig} from 'homebridge';
import {PlatformPlugin} from 'homebridge/lib/api.js';

import {Log} from '../util/log.js';

/**
 * Base class to implement common polling functionality for accessories.
 */
export class PollingAccessory<DeviceState> {
  protected static readonly kDefaultRefreshInterval = 10000;

  private _currentState: DeviceState = <DeviceState>{};

  constructor(
      protected readonly platform: PlatformPlugin,
      protected readonly accessory: PlatformAccessory,
      protected readonly refreshInterval:
          number = PollingAccessory.kDefaultRefreshInterval,
  ) {
    // Begin monitoring the device for state changes.
    setInterval(() => this.refreshDeviceState(), this.refreshInterval);
  }

  // Get the device state and push to Homekit if it has changed. This is called
  // periodically to keep the state fresh, and can also be invoked by subclasses
  // when (for instance) Homekit sets a new value for a device's properties.
  protected async refreshDeviceState() {
    // Retrieve the most recent device data.
    const lastState = structuredClone(this._currentState);
    this._currentState = await this.getDeviceState(lastState);

    // Check whether the derived class' services have been initialized.
    if (!this.servicesReady()) {
      Log.debug('Services not yet initialized:', this.accessory.displayName);
      return;
    }

    // Check whether any attributes have changed.
    if (JSON.stringify(lastState) !== JSON.stringify(this._currentState)) {
      Log.debug(`Updating ${this.accessory.displayName}:`, this._currentState);
      this.updateHomekitState(this.currentState());
    }
  }

  // Returns a clone of the current state object.
  protected currentState(): DeviceState {
    return structuredClone(this._currentState);
  }

  // Implemented by subclasses. Confirms that all accessory services are ready.
  protected servicesReady(): boolean {
    return false;
  }

  // Implemented by subclasses. Returns an object with the current device state.
  protected async getDeviceState(lastState: DeviceState): Promise<DeviceState> {
    return <DeviceState>{};
  }

  // Implemented by subclasses. Updates Homekit with the current state.
  protected async updateHomekitState(currentState: DeviceState) {
    // TBI
  }
}
