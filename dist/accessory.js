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
      oscillation: {
        on: {
          horizontal: "full",
          vertical: "fallback",
        },
        off: {
          horizontal: "default",
          vertical: "fallback",
        },
      },
      autoOscillation: {
        auto: {
          horizontal: "default",
          vertical: "default",
        },
        cool: {
          horizontal: "default",
          vertical: "fixedHighest",
        },
        heat: {
          horizontal: "default",
          vertical: "fixedLowest",
        },
        fan: {
          horizontal: "default",
          vertical: "full",
        },
        dry: {
          horizontal: "default",
          vertical: "full",
        },
      },
      xFan: true,
      lightControl: false,
      fakeSensor: false,
      sensorOffset: 0,
      ...config,
    };
    log.info(`Config loaded: ${JSON.stringify(this.config, null, 2)}`);
    
    this.state = {
      lastKnownACState: commands.mode.value.auto,
      lastKnownFanState: commands.mode.value.fan,
    };
    
    this.informationService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, "Gree")
      .setCharacteristic(Characteristic.Model, this.config.model)
      .setCharacteristic(Characteristic.Name, this.config.name)
      .setCharacteristic(Characteristic.SerialNumber, this.config.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, version);
    
    this.deviceService = new Service.HeaterCooler(this.config.name);

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
        minValue: this.config.minimumTargetTemperature,
        maxValue: this.config.maximumTargetTemperature,
        minStep: 0.1,
      })
      .on("get", this.onGet.bind(this, "targetTemperature"))
      .on("set", this.onSet.bind(this, "targetTemperature"));
    this.deviceService
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .setProps({
        minValue: this.config.minimumTargetTemperature,
        maxValue: this.config.maximumTargetTemperature,
        minStep: 0.1,
      })
      .on("get", this.onGet.bind(this, "targetTemperature"))
      .on("set", this.onSet.bind(this, "targetTemperature"));
    
    this.fanService = new Service.Fanv2(this.config.nameFan || `${this.config.name} Fan`);
    this.fanService
      .getCharacteristic(Characteristic.Active)
      .on("get", this.onGet.bind(this, "fan_active"))
      .on("set", this.onSet.bind(this, "fan_active"));
    this.fanService
      .getCharacteristic(Characteristic.RotationDirection)
      .on("get", this.onGet.bind(this, "fan_mode"))
      .on("set", this.onSet.bind(this, "fan_mode"));
    this.fanService
      .getCharacteristic(Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 6,
        minStep: 1,
      })
      .on("get", this.onGet.bind(this, "speed"))
      .on("set", this.onSet.bind(this, "speed"));
    
    this.lightSwitchService = new Service.Switch(`${this.config.name} Light`);
    this.lightSwitchService
      .getCharacteristic(Characteristic.On)
      .on("get", this.onGet.bind(this, "light"))
      .on("set", this.onSet.bind(this, "light"));

    this.device = new Device(log, this.config, () => {
      this.deviceService.getCharacteristic(Characteristic.Active).updateValue(this.active);
      this.deviceService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.currentTemperature);
      this.deviceService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(this.currentState);
      this.deviceService.getCharacteristic(Characteristic.TargetHeaterCoolerState).updateValue(this.targetState);
      this.deviceService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.speed);
      this.deviceService.getCharacteristic(Characteristic.TemperatureDisplayUnits).updateValue(this.units);
      this.deviceService.getCharacteristic(Characteristic.SwingMode).updateValue(this.swingMode);
      this.deviceService.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(this.targetTemperature);
      this.deviceService.getCharacteristic(Characteristic.HeatingThresholdTemperature).updateValue(this.targetTemperature);
      this.fanService.getCharacteristic(Characteristic.Active).updateValue(this.fan_active);
      this.fanService.getCharacteristic(Characteristic.RotationDirection).updateValue(this.fan_mode);
      this.fanService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.speed);
      this.lightSwitchService.getCharacteristic(Characteristic.On).updateValue(this.light);
    });
  }

  get active() {
    switch (this.device.status[commands.power.code]) {
      case commands.power.value.on:
        switch (this.device.status[commands.mode.code]) {
          case commands.mode.value.auto:
          case commands.mode.value.cool:
          case commands.mode.value.heat:
            return Characteristic.Active.ACTIVE;
          default:
            return Characteristic.Active.INACTIVE;
        }
      case commands.power.value.off:
        return Characteristic.Active.INACTIVE;
    }
  }
  
  get fan_active() {
    switch (this.device.status[commands.power.code]) {
      case commands.power.value.on:
        switch (this.device.status[commands.mode.code]) {
          case commands.mode.value.dry:
          case commands.mode.value.fan:
            return Characteristic.Active.ACTIVE;
          default:
            return Characteristic.Active.INACTIVE;
        }
      case commands.power.value.off:
        return Characteristic.Active.INACTIVE;
    }
  }

  set active(value) {
    if (value === this.active) return;
    
    const power = (() => {
      switch (value) {
        case Characteristic.Active.ACTIVE:
          return commands.power.value.on;
        case Characteristic.Active.INACTIVE:
          return commands.power.value.off;
      }
    })();
    const command = { [commands.power.code] : power };
    if (this.device.status[commands.mode.code] !== this.state.lastKnownACState) {
      Object.assign(command, { [commands.mode.code] : this.state.lastKnownACState });
    }
    this.device.sendCommands(command);
  }

  set fan_active(value) {
    if (value === this.fan_active) return;
    
    const power = (() => {
      switch (value) {
        case Characteristic.Active.ACTIVE:
          return commands.power.value.on;
        case Characteristic.Active.INACTIVE:
          return commands.power.value.off;
      }
    })();
    const command = { [commands.power.code] : power };
    if (this.device.status[commands.mode.code] !== this.state.lastKnownFanState) {
      Object.assign(command, { [commands.mode.code] : this.state.lastKnownFanState });
    }
    this.device.sendCommands(command);
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
      case commands.mode.value.auto:
        this.state.lastKnownACState = mode;
        return Characteristic.TargetHeaterCoolerState.AUTO;
      case commands.mode.value.cool:
        this.state.lastKnownACState = mode;
        return Characteristic.TargetHeaterCoolerState.COOL;
      case commands.mode.value.heat:
        this.state.lastKnownACState = mode;
        return Characteristic.TargetHeaterCoolerState.HEAT;
    }
  }
  
  get fan_mode() {
    const mode = this.device.status[commands.mode.code];
    if (mode === undefined) return;
    switch (mode) {
      case commands.mode.value.dry:
        this.state.lastKnownFanState = mode;
        return Characteristic.RotationDirection.COUNTER_CLOCKWISE;
      case commands.mode.value.fan:
        this.state.lastKnownFanState = mode;
        return Characteristic.RotationDirection.CLOCKWISE;
    }
  }
  
  set targetState(value) { // mode
    const mode = (() => {
      switch (value) {
        case Characteristic.TargetHeaterCoolerState.AUTO:
          return commands.mode.value.auto;
        case Characteristic.TargetHeaterCoolerState.HEAT:
          return commands.mode.value.heat;
        case Characteristic.TargetHeaterCoolerState.COOL:
          return commands.mode.value.cool;
      }
    })();
    if (mode === this.device.status[commands.mode.code]) return;
    
    this._setMode(mode);
  }
  
  set fan_mode(value) {
    const mode = (() => {
      switch (value) {
        case Characteristic.RotationDirection.COUNTER_CLOCKWISE:
          return commands.mode.value.dry;
        case Characteristic.RotationDirection.CLOCKWISE:
          return commands.mode.value.fan;
      }
    })();
    if (mode === this.device.status[commands.mode.code]) return;
    
    this._setMode(mode);
  }
  
  _setMode(mode) {
    const swingModes = this._swingModesForMode(mode);
    const swingConfig = (() => {
      switch (this.swingMode) {
        case Characteristic.SwingMode.SWING_DISABLED:
          return swingModes.off;
        case Characteristic.SwingMode.SWING_ENABLED:
          return swingModes.on;
      }
    })();
    const command = {
      [commands.mode.code] : mode,
      [commands.swingHorizontal.code] : swingConfig.horizontal,
      [commands.swingVertical.code] : swingConfig.vertical,
    };
    
    const xFan = this.config.xFan ? commands.xFan.value.on : commands.xFan.value.off;
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
  
  _swingModesForMode(mode) {
    const autoConfig = (() => {
      switch (mode) {
        case commands.mode.value.auto:
          return this.config.autoOscillation.auto;
        case commands.mode.value.cool:
          return this.config.autoOscillation.cool;
        case commands.mode.value.heat:
          return this.config.autoOscillation.heat;
        case commands.mode.value.fan:
          return this.config.autoOscillation.fan;
        case commands.mode.value.dry:
          return this.config.autoOscillation.dry;
        default:
          return this.config.oscillation.off;
      }
    })();
    return {
      off: {
        horizontal:
        commands.swingHorizontal.value[this.config.oscillation.off.horizontal]
        || commands.swingHorizontal.value[autoConfig.horizontal]
        || commands.swingHorizontal.value.default,
        vertical:
        commands.swingVertical.value[this.config.oscillation.off.vertical]
        || commands.swingVertical.value[autoConfig.vertical]
        || commands.swingVertical.value.default,
      },
      on: {
        horizontal:
        commands.swingHorizontal.value[this.config.oscillation.on.horizontal]
        || commands.swingHorizontal.value[autoConfig.horizontal]
        || commands.swingHorizontal.value.default,
        vertical:
        commands.swingVertical.value[this.config.oscillation.on.vertical]
        || commands.swingVertical.value[autoConfig.vertical]
        || commands.swingVertical.value.default,
      },
    };
  }

  get swingMode() {
    const swingHorizontal = this.device.status[commands.swingHorizontal.code];
    const swingVertical = this.device.status[commands.swingVertical.code];
    if (swingHorizontal === undefined || swingVertical === undefined) return;
    
    const mode = this._swingModesForMode(this.device.status[commands.mode.code]);
    if (swingHorizontal === mode.off.horizontal && swingVertical === mode.off.vertical) {
      return Characteristic.SwingMode.SWING_DISABLED;
    }
    return Characteristic.SwingMode.SWING_ENABLED;
  }

  set swingMode(value) {
    const modes = this._swingModesForMode(this.device.status[commands.mode.code]);
    const config = (() => {
      switch (value) {
        case Characteristic.SwingMode.SWING_DISABLED:
          return modes.off;
        case Characteristic.SwingMode.SWING_ENABLED:
          return modes.on;
      }
    })();
    this.device.sendCommands({
      [commands.swingHorizontal.code] : config.horizontal,
      [commands.swingVertical.code] : config.vertical,
    });
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
  
  get light() {
    switch (this.device.status[commands.light.code]) {
      case commands.light.value.on:
        return true;
      case commands.light.value.off:
        return false;
    }
  }

  set light(value) {
    if (value === this.light) return;
    
    const command = value ? commands.light.value.on : commands.light.value.off;
    this.device.sendCommands({ [commands.light.code] : command });
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
    const services = [
      this.informationService,
      this.deviceService,
      this.fanService,
    ];
    if (this.config.lightControl) {
      services.push(this.lightSwitchService);
    }
    return services;
  }
}

module.exports = api => {
  Service = api.hap.Service;
  Characteristic = api.hap.Characteristic;
  return GreeHeaterCooler;
};
