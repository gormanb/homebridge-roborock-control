/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable indent */
import {PlatformAccessory, Service} from 'homebridge';

import {RoborockControllerPlatform} from '../platform';
import {PyRoborockCmd, PyRoborockState, RoborockDeviceClient} from '../roborock/roborock-api.js';
import {Log} from '../util/log.js';

import {PollingAccessory} from './pollingAccessory.js';

const kVacuumState = 'state';
const kFanPower = 'fan_power';
const kBatteryLevel = 'battery';
const kCleaning = 'is_cleaning';
const kLowBattery = 'is_low_battery';
const kCharging = 'is_charging';

// An interface representing the device's state.
interface DeviceState {
  [kVacuumState]: number;
  [kFanPower]: number;
  [kBatteryLevel]: number;
  [kCleaning]: boolean;
  [kLowBattery]: boolean;
  [kCharging]: boolean;
}

/**
 * An instance of this class is created for each Roborock accessory.
 */
export class RoborockAccessory extends PollingAccessory<DeviceState> {
  private static kLowBatteryPercent = 15;

  private batteryService: Service;
  private fanService: Service;

  constructor(
      protected readonly platform: RoborockControllerPlatform,
      protected readonly accessory: PlatformAccessory,
      protected readonly rrClient: RoborockDeviceClient,
  ) {
    // Initialize the base class first, then initialize the services.
    super(platform, accessory);

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
    // Set up the handlers for each service and characteristic.
    //
    this.setupHandlers();
  }

  private async setupHandlers() {
    // Convenience references to Characteristic and Service.
    const Characteristic = this.platform.Characteristic;

    // Perform a refresh of the device to establish the initial state.
    await this.refreshDeviceState();

    // Register handlers for all dynamic characteristics.
    this.fanService.getCharacteristic(Characteristic.On)
        .onGet(() => this.currentState()[kCleaning])
        .onSet((active) => this.setDeviceState(!!active));

    this.batteryService.getCharacteristic(Characteristic.BatteryLevel)
        .onGet(() => this.currentState()[kBatteryLevel]);

    this.batteryService.getCharacteristic(Characteristic.ChargingState)
        .onGet(() => this.currentState()[kCharging]);

    this.batteryService.getCharacteristic(Characteristic.StatusLowBattery)
        .onGet(() => this.currentState()[kLowBattery]);
  }

  // Update the vacuum's state and make sure the change is reflected in Homekit.
  private async setDeviceState(active: boolean) {
    Log.debug(`Setting vacuum state to ${active ? 'active' : 'inactive'}`);
    await this.rrClient.sendCommand(
        active ? await PyRoborockCmd.APP_START :
                 await PyRoborockCmd.APP_CHARGE);
    this.refreshDeviceState();
  }

  //
  // Implementations of virtual superclass methods.
  //

  // Return true if services have been initialized.
  protected servicesReady(): boolean {
    return !!(this.fanService && this.batteryService);
  }

  // Obtain and return the device's current state.
  protected async getDeviceState(lastState: DeviceState): Promise<DeviceState> {
    const rawDeviceState = await this.rrClient.getStatus();
    const devState = <DeviceState>{
      [kVacuumState]: await rawDeviceState[kVacuumState],
      [kFanPower]: await rawDeviceState[kFanPower],
      [kBatteryLevel]: await rawDeviceState[kBatteryLevel],
    };
    devState[kCleaning] =
        (devState[kVacuumState] === await PyRoborockState.cleaning.valueOf());
    devState[kLowBattery] =
        (devState[kBatteryLevel] <= RoborockAccessory.kLowBatteryPercent);
    devState[kCharging] =
        (devState[kVacuumState] === await PyRoborockState.charging.valueOf());
    return devState;
  }

  // Push the current state to Homekit.
  protected async updateHomekitState(currentState: DeviceState) {
    this.fanService.updateCharacteristic(
        this.platform.Characteristic.On, currentState[kCleaning]);
    this.batteryService.updateCharacteristic(
        this.platform.Characteristic.BatteryLevel, currentState[kBatteryLevel]);
    this.batteryService.updateCharacteristic(
        this.platform.Characteristic.StatusLowBattery,
        currentState[kLowBattery]);
    this.batteryService.updateCharacteristic(
        this.platform.Characteristic.ChargingState, currentState[kCharging]);
  }
}
