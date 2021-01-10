# homebridge-gree-heatercooler-v2

![version](https://img.shields.io/npm/v/homebridge-gree-heatercooler-v2) ![license](https://img.shields.io/npm/l/homebridge-gree-heatercooler-v2)

Homebridge plugin for Gree air conditioners.

## Install

```shell
$ npm install -g homebridge-gree-heatercooler-v2
```

## Config Example

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
      "model": "KFR-35GW(35592)FNhAc-A1(WIFI)",
      "name": "Living Room AC",
      "serialNumber": "4R0099H012345",
      "minimumTargetTemperature": 16,
      "maximumTargetTemperature": 30,
      "fakeSensor": false,
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
