# homebridge-gree-heatercooler-v2

![version](https://img.shields.io/npm/v/homebridge-gree-heatercooler-v2) ![license](https://img.shields.io/npm/l/homebridge-gree-heatercooler-v2) ![stats](https://img.shields.io/npm/dw/homebridge-gree-heatercooler-v2)

Homebridge plugin for Gree air conditioners.

## Install

```shell
$ npm install -g homebridge-gree-heatercooler-v2
```

## Features

* Info (get/set in config): model, name, serial number
* Mode (get/set): auto, heat, cool(, fan, dry), off
    * Note: Fan & Dry features are controlled over a separate "fan" device, while clockwise means fan and counter clockwise means dry
* Current temperature (get)
* Target temperature (get/set): granularity of 0.5 °C or 1 °F
* Display units (get/set): celsius, fahrenheit
* Oscillate (get/set)
* Auto oscillation by mode
* X-Fan (set in config)
* Light (get/set), as a standalone control

### Limitations

* Sensor: Gree's AC units don't update sensor data very often, sometimes interactions may be needed to refresh it
* Status: Gree's AC units don't provide current status, it's calculated by comparing current temperature and target temperature
* X-Fan: can only be set in config

## Config

### Params

* `accessory`: Accessory name to load. Not compatible with other plugins with the same name.
* `address`: Local IP address of the AC unit. It has to be connected to local network before using this plugin.
* `mac`: Physical (MAC) address of the AC unit. Required by some AC models, try to set this if you see "Device not found at..." error in the log. It must be just lower case letters and/or numbers.  
* `model`, `name`, `serialNumber`: Information of the AC unit. Does not affect functions.
* `nameFan`: Name for fan device.
* `minimumTargetTemperature`, `maximumTargetTemperature`: (in °C, default to 16-30) Range of target temperature supported by the AC unit. May vary depending on your model.
* `oscillation`, `autoOscillation`: Oscillation settings. `autoOscillation` is for automation, for example: blow downwards automatically when switching to cool mode.
  * Valid modes
    * For oscillation: `on`, `off`
    * For auto oscillation: `auto`, `cool`, `heat`, `fan`, `dry`
  * Valid values:
    * For horizontal: `default`, `full`, `left`, `centerLeft`, `center`, `centerRight`, `right`
    * For vertical: `default`, `full`, `fixedHighest`, `fixedHigher`, `fixedMiddle`, `fixedLower`, `fixedLowest`, `swingLowest`, `swingLower`, `swingMiddle`, `swingHigher`, `swingHighest`
    * `fallback`: Use to fallback to auto oscillation settings. Only available in `oscillation`
  * Default:
    * Oscillation switch only controls horizontal oscillation between full range (`full`) and off (`default`)
    * When switching to auto mode, do not swing vertically (`default`)
    * When switching to cool mode, blow downwards (`fixedLowest`)
    * When switching to heat mode, blow upwards (`fixedHighest`)
    * When switching to fan and dry modes, swing vertically on full range (`full`)
* `xFan`: (true | false, default to true) Keep the fan running for a while after shutting down from Dry or Cool mode. This helps to keep the filter from being damp, which could lead to mold growing on it. Recommend to leave on.
* `lightControl`: (true | false, default to false) Show light control as a switch.
* `fakeSensor`: (true | false, default to false) For those models without built-in temperature sensor. This option enables a fake sensor using target temperature as current. Use of this option disables detection of whether AC is actively heating/cooling or being idle at target temperature.
* `sensorOffset`: (0 or 40, default to 0) Some models have an offset of 40 on temperature sensor to avoid negative values. If the temperature shown is abnormally high, set it to `40`.
* `updateInterval`: (in ms, default to 1000) Interval for refreshing current status of the AC unit.
* `retryInterval`: (in ms, default to 5000) Retry interval when connnection fails.

### Example

```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "accessories": [
    {
      "accessory": "GreeHeaterCooler",
      "address": "10.0.1.128",
      "mac": "f4911e504354",    
      "model": "KFR-35GW(35592)FNhAc-A1(WIFI)",
      "name": "Living Room AC",
      "nameFan": "Living Room Fan",
      "serialNumber": "4R0099H012345",
      "minimumTargetTemperature": 16,
      "maximumTargetTemperature": 30,
      "oscillation": {
        "on": {
          "horizontal": "full",
          "vertical": "fallback"
        },
        "off": {
          "horizontal": "default",
          "vertical": "fallback"
        }
      },
      "autoOscillation": {
        "auto": {
          "horizontal": "default",
          "vertical": "default"
        },
        "cool": {
          "horizontal": "default",
          "vertical": "fixedHighest"
        },
        "heat": {
          "horizontal": "default",
          "vertical": "fixedLowest"
        },
        "fan": {
          "horizontal": "default",
          "vertical": "full"
        },
        "dry": {
          "horizontal": "default",
          "vertical": "full"
        }
      },
      "xFan": true,
      "lightControl": false,
      "fakeSensor": false,
      "sensorOffset": 0,
      "updateInterval": 1000,
      "retryInterval": 5000
    }
  ]
}
```

## License

This project is released under the terms and conditions of the [GPL license](https://www.gnu.org/licenses/#GPL). See [LICENSE](/LICENSE) for details.

## Contact

This project is designed and developed by [Elethom Hunter](http://github.com/Elethom). You can reach me via:

* Email: elethomhunter@gmail.com
* Telegram: [@elethom](http://telegram.me/elethom)

## Credits

* Based on: [gree-remote](https://github.com/tomikaa87/gree-remote)
* Inspired by: [homebridge-gree-heatercooler](https://github.com/ddenisyuk/homebridge-gree-heatercooler)
