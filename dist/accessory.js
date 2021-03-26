"use strict";

const { version } = require("../package.json");
const Device = require("./device");
const commands = require("./commands");

let Service, Characteristic;

class GreeHeaterCooler {
  constructor(log, config) {
    this.log = log;
    this.config = {
      minimumTargetTemperature: 16,
      maximumTargetTemperature: 30,
      xFan: true,
      fakeSensor: false,
      sensorOffset: 0,
      ...config,
    };
    log.info(`Config loaded: ${JSON.stringify(config, null, 2)}`);
    
    this.informationService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, "Gree")
      .setCharacteristic(Characteristic.Model, config.model)
      .setCharacteristic(Characteristic.Name, config.name)
      .setCharacteristic(Characteristic.SerialNumber, config.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, version);
    
    this.deviceService = new Service.HeaterCooler(config.name);

    // Required
    this.deviceService
      .getCharacteristic(Characteristic.Active)
      .on("get", this.onGet.bind(this, "active"))
      .on("set", this.onSet.bind(this, "active"));
    this.deviceService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on("get", this.onGet.bind(this, "currentTemperature"));
    this.deviceService
      .getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .on("get", this.onGet.bind(this, "currentState"));
    this.deviceService
      .getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .on("get", this.onGet.bind(this, "targetState"))
      .on("set", this.onSet.bind(this, "targetState"));

    // Optional
    this.deviceService
      .getCharacteristic(Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 6,
        minStep: 1,
      })
      .on("get", this.onGet.bind(this, "speed"))
      .on("set", this.onSet.bind(this, "speed"));
    this.deviceService
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on("get", this.onGet.bind(this, "units"))
      .on("set", this.onSet.bind(this, "units"));
    this.deviceService
      .getCharacteristic(Characteristic.SwingMode)
      .on("get", this.onGet.bind(this, "swingMode"))
      .on("set", this.onSet.bind(this, "swingMode"));
    this.deviceService
      .getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: config.minimumTargetTemperature || 16,
        maxValue: config.maximumTargetTemperature || 30,
        minStep: 0.1,
      })
      .on("get", this.onGet.bind(this, "targetTemperature"))
      .on("set", this.onSet.bind(this, "targetTemperature"));
    this.deviceService
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .setProps({
        minValue: config.minimumTargetTemperature || 16,
        maxValue: config.maximumTargetTemperature || 30,
        minStep: 0.1,
      })
      .on("get", this.onGet.bind(this, "targetTemperature"))
      .on("set", this.onSet.bind(this, "targetTemperature"));

    this.device = new Device(log, config, () => {
      this.deviceService.getCharacteristic(Characteristic.Active).updateValue(this.active);
      this.deviceService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.currentTemperature);
      this.deviceService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(this.currentState);
      this.deviceService.getCharacteristic(Characteristic.TargetHeaterCoolerState).updateValue(this.targetState);
      this.deviceService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.speed);
      this.deviceService.getCharacteristic(Characteristic.TemperatureDisplayUnits).updateValue(this.units);
      this.deviceService.getCharacteristic(Characteristic.SwingMode).updateValue(this.swingMode);
      this.deviceService.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(this.targetTemperature);
      this.deviceService.getCharacteristic(Characteristic.HeatingThresholdTemperature).updateValue(this.targetTemperature);
    });
  }

  get active() {
    switch (this.device.status[commands.power.code]) {
      case commands.power.value.on:
        return Characteristic.Active.ACTIVE;
      case commands.power.value.off:
        return Characteristic.Active.INACTIVE;
    }
  }

  set active(value) {
    if (value === this.active) return;
    
    const command = (() => {
      switch (value) {
        case Characteristic.Active.ACTIVE:
          return commands.power.value.on;
        case Characteristic.Active.INACTIVE:
          return commands.power.value.off;
      }
    })();
    this.device.sendCommands({ [commands.power.code] : command });
  }

  get currentTemperature() {
    if (this.config.fakeSensor) {
      return this.device.status[commands.targetTemperature.code];
    }
    
    return this.device.status[commands.temperature.code] - (this.config.sensorOffset || 0);
  }

  get currentState() { // actual state
    if (this.config.fakeSensor) {
      switch (this.device.status[commands.mode.code]) {
        case commands.mode.value.cool:
          return Characteristic.CurrentHeaterCoolerState.COOLING;
        case commands.mode.value.heat:
          return Characteristic.CurrentHeaterCoolerState.HEATING;
        default:
          return Characteristic.CurrentHeaterCoolerState.IDLE;
      }
    }
    
    const mode = this.device.status[commands.mode.code];
    const targetTemperature = this.device.status[commands.targetTemperature.code]; // Compare rounded value
    if (mode === undefined || targetTemperature === undefined) return;
    if (targetTemperature < this.currentTemperature
      && (mode === commands.mode.value.auto || mode === commands.mode.value.cool)) {
      return Characteristic.CurrentHeaterCoolerState.COOLING;
    }
    if (targetTemperature > this.currentTemperature
      && (mode === commands.mode.value.auto || mode === commands.mode.value.heat)) {
      return Characteristic.CurrentHeaterCoolerState.HEATING;
    }
    return Characteristic.CurrentHeaterCoolerState.IDLE;
  }
  
  get targetState() { // mode
    const mode = this.device.status[commands.mode.code];
    if (mode === undefined) return;
    switch (mode) {
      case commands.mode.value.cool:
        return Characteristic.TargetHeaterCoolerState.COOL;
      case commands.mode.value.heat:
        return Characteristic.TargetHeaterCoolerState.HEAT;
      default:
        return Characteristic.TargetHeaterCoolerState.COOL;
    }
  }
  
  set targetState(value) { // mode
    if (value === this.targetState) return;

    const state = (() => {
      switch (value) {
        case Characteristic.TargetHeaterCoolerState.AUTO:
          return commands.mode.value.auto;
        case Characteristic.TargetHeaterCoolerState.HEAT:
          return commands.mode.value.heat;
        case Characteristic.TargetHeaterCoolerState.COOL:
          return commands.mode.value.cool;
      }
    })();
    const xFan = this.config.xFan ? commands.xFan.value.on : commands.xFan.value.off;
    const command = { [commands.mode.code] : state };
    if (this.device.status[commands.xFan.code] !== xFan) {
      Object.assign(command, { [commands.xFan.code] : xFan });
    }
    this.device.sendCommands(command);
  }

  get speed() {
    const speed = this.device.status[commands.speed.code];
    switch (speed) {
      case commands.speed.value.auto:
        return 6;
      default:
        return speed;
    }
  }

  set speed(value) {
    if (value === 0 || value === this.speed) return;

    const command = (() => {
      switch (value) {
        case 6:
          return commands.speed.value.auto;
        default:
          return value;
      }
    })();
    this.device.sendCommands({ [commands.speed.code] : command });
  }

  get units() {
    switch (this.device.status[commands.units.code]) {
      case commands.units.value.fahrenheit:
        return Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
      case commands.units.value.celsius:
        return Characteristic.TemperatureDisplayUnits.CELSIUS;
    }
  }

  set units(value) {
    if (value === this.units) return;
    
    this.deviceService.getCharacteristic(Characteristic.TemperatureDisplayUnits).updateValue(this.units);

    const command = (() => {
    switch (value) {
      case Characteristic.TemperatureDisplayUnits.CELSIUS:
        return commands.units.value.celsius;
      case Characteristic.TemperatureDisplayUnits.FAHRENHEIT:
        return commands.units.value.fahrenheit;
    }
    })();
    this.device.sendCommands({ [commands.units.code] : command });
  }

  get swingMode() {
    const swingMode = this.device.status[commands.swingMode.code];
    if (swingMode === undefined) return;
    switch (swingMode) {
      case commands.swingMode.value.off:
        return Characteristic.SwingMode.SWING_DISABLED;
      case commands.swingMode.value.on:
        return Characteristic.SwingMode.SWING_ENABLED;
      default:
        return Characteristic.SwingMode.SWING_ENABLED;
    }
  }

  set swingMode(value) {
    if (value === this.swingMode) return;

    const command = (() => {
    switch (value) {
      case Characteristic.SwingMode.SWING_DISABLED:
        return commands.swingMode.value.off;
      case Characteristic.SwingMode.SWING_ENABLED:
        return commands.swingMode.value.on;
    }
    })();
    this.device.sendCommands({ [commands.swingMode.code] : command });
  }

  get targetTemperature() {
    const magicNumber = 0.24; // Magic number here, don't change. Why? Because Gree is stupid and I am a genius.
    const temperature = this.device.status[commands.targetTemperature.code];
    const offset = this.device.status[commands.temperatureOffset.code];
    if (temperature === undefined || offset === undefined) return;
    return Math.min(temperature + 0.5 * (offset - 1) + magicNumber, this.device.config.maximumTargetTemperature);
  }

  set targetTemperature(value) {
    if (value === this.targetTemperature) return;

    this.device.sendCommands({
      [commands.targetTemperature.code] : Math.round(value),
      [commands.temperatureOffset.code] : (value - Math.round(value)) >= 0 ? 1 : 0
    });
  }

  onGet(key, callback) {
    this.log.debug(`[${this.device.mac}] Get characteristic: ${key}`);
    const value = this[key];
    if (value == null || value !== value) { // NaN not equal to self
      callback(new Error(`Failed to get characteristic value for key: ${key}`));
    } else {
      callback(null, value);
    }
  }

  onSet(key, value, callback) {
    this.log.debug(`[${this.device.mac}] Set characteristic ${key} to value: ${value}`);
    this[key] = value;
    callback(null);
  }

  getServices() {
    return [
      this.informationService,
      this.deviceService
    ];
  }
}

module.exports = api => {
  Service = api.hap.Service;
  Characteristic = api.hap.Characteristic;
  return GreeHeaterCooler;
};
