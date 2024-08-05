/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import {PlatformAccessory, PlatformConfig} from 'homebridge';

import {RoborockControllerPlatform} from '../platform.js';
import {Log} from '../util/log.js';

/**
 * Base class to implement common polling functionality for accessories.
 */
export class PollingAccessory {
  protected static readonly kDefaultRefreshInterval = 5000;

  private _currentState: any = {};

  constructor(
      protected readonly platform: RoborockControllerPlatform,
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
  protected currentState(): any {
    return structuredClone(this._currentState);
  }

  // Implemented by subclasses. Confirms that all accessory services are ready.
  protected servicesReady(): boolean {
    return false;
  }

  // Implemented by subclasses. Returns an object with the current device state.
  protected async getDeviceState(lastState: any): Promise<any> {
    // TBI
  }

  // Implemented by subclasses. Updates Homekit with the current state.
  protected async updateHomekitState(currentState: any) {
    // TBI
  }
}
