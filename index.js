module.exports = api => {
  const GreeHeaterCooler = require("./dist/accessory")(api);
  api.registerAccessory(
    "GreeHeaterCooler",
    GreeHeaterCooler
  );
};
