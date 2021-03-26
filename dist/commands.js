module.exports = {
  power: {
    code: "Pow",
    value: {
      off: 0,
      on: 1,
    }
  },
  mode: {
    code: "Mod",
    value: {
      auto: 0,
      cool: 1,
      dry: 2,
      fan: 3, 
      heat: 4,
    },
  },
  targetTemperature: {
    code: "SetTem",
  },
  temperature: {
    code: "TemSen",
  },
  units: {
    code: "TemUn",
    value: {
      celsius: 0,
      fahrenheit: 1,
    },
  },
  temperatureOffset: {
    code: "TemRec",
  },
  speed: {
    code: "WdSpd",
    value: {
      auto: 0,
      low: 1,
      mediumLow: 2,
      medium: 3,
      mediumHigh: 4,
      high: 5,
    },
  },
  swingMode: {
    code: "SwUpDn",
    value: {
      off: 0,
      on: 1,
    },
  },
  xFan: {        
    code: "Blo",
    value: {
      off: 0,
      on: 1,
    },
  },
};
