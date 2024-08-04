/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import {PlatformAccessory, Service} from 'homebridge';

import {RoborockControllerPlatform} from '../platform';
import {RoborockDeviceClient} from '../roborock/roborock-api';
import {Log} from '../util/log.js';

import {BaseAccessory} from './baseAccessory.js';

const kActive = 'in_cleaning';
const kFanPower = 'fan_power';
const kBattery = 'battery';
const kCharging = 'charge_status';

/**
 * An instance of this class is created for each Roborock accessory.
 */
export class RoborockAccessory extends BaseAccessory {
  private batteryService: Service;
  private fanService: Service;

  constructor(
      protected readonly platform: RoborockControllerPlatform,
      protected readonly accessory: PlatformAccessory,
      protected readonly rrClient: RoborockDeviceClient,
  ) {
    // Initialize the base class first, then initialize the services.
    super(platform, accessory);

    // Convenience references to Characteristic and Service.
    const Characteristic = this.platform.Characteristic;

    //
    // Create a Fan to control the main vacuum function.
    //
    this.fanService =
        (this.accessory.getService(this.platform.Service.Fan) ||
         this.accessory.addService(this.platform.Service.Fan));

    //
    // Add a service to report the battery level.
    //
    this.batteryService =
        this.accessory.getService(this.platform.Service.Battery) ||
        this.accessory.addService(this.platform.Service.Battery);

    //
    // Register handlers for all dynamic characteristics.
    //
    this.fanService.getCharacteristic(Characteristic.On)
        .onGet(() => !!this.currentState[kActive])
        .onSet((active) => this.setDeviceState(!!active));
  }

  // Return true if services have been initialized.
  protected servicesReady(): boolean {
    return !!(this.fanService && this.batteryService);
  }

  // Get the device power state and push to Homekit when it changes.
  protected async updateDeviceAndCurrentState() {
    const deviceState = await this.rrClient.getStatus();
    this.currentState[kActive] = await deviceState[kActive];
    this.currentState[kFanPower] = await deviceState[kFanPower];
    this.currentState[kBattery] = await deviceState[kBattery];
    this.currentState[kCharging] = await deviceState[kCharging];
  }

  // Push the current state to Homekit.
  protected async updateHomekitState() {
    this.fanService.updateCharacteristic(
        this.platform.Characteristic.On, this.currentState[kActive]);
    this.batteryService.updateCharacteristic(
        this.platform.Characteristic.BatteryLevel, this.currentState[kBattery]);
    this.batteryService.updateCharacteristic(
        this.platform.Characteristic.ChargingState,
        this.currentState[kCharging]);
  }

  private async setDeviceState(active: boolean) {
    await this.rrClient.sendCommand(active ? 'app_start' : 'app_charge');
    Log.debug(`Set vacuum to active: ${active}`);
    this.updateDeviceAndCurrentState();
  }
}
