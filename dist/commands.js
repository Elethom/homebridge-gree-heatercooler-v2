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
  swingHorizontal: {
    code: "SwingLfRig",
    value: {
      default: 0,
      full: 1,
      left: 2,
      centerLeft: 3,
      center: 4,
      centerRight: 5,
      right: 6,
    },
  },
  swingVertical: {
    code: "SwUpDn",
    value: {
      default: 0,
      full: 1,
      fixedHighest: 2,
      fixedHigher: 3,
      fixedMiddle: 4,
      fixedLower: 5,
      fixedLowest: 6,
      swingLowest: 7,
      swingLower: 8,
      swingMiddle: 9,
      swingHigher: 10,
      swingHighest: 11,
    },
  },
  xFan: {        
    code: "Blo",
    value: {
      off: 0,
      on: 1,
    },
  },
  light: {
    code: "Lig",
    value: {
      off: 0,
      on: 1,
    },
  },
};
