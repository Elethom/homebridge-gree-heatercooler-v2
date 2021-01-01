const crypto = require("crypto");

const genericKey = "a3K8Bx%2r8Y7#xDh";

module.exports = {
  encrypt: (data, key = genericKey) => {
    const string = JSON.stringify(data);
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    return cipher.update(string, "utf8", "base64") + cipher.final("base64");
  },
  decrypt: (data, key = genericKey) => {
    const decipher = crypto.createDecipheriv("aes-128-ecb", key, null);
    return JSON.parse(decipher.update(data, "base64", "utf8") + decipher.final("utf8"));
  },
};
