const dgram = require("dgram");
const crypto = require("./crypto");
const commands = require("./commands");

const remotePort = 7000;
const localPort = 48964;
const retryInterval = 5000;
const updateInterval = 1000;

class Device {
  constructor(log, config, updateCallback) {
    this.log = log;
    this.config = config;
    this.updateCallback = updateCallback || (() => {});
    this.bound = false;
    this.status = {};
    
    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    this.socket.on("message", (msg, rinfo) => {
      if (rinfo.address === config.address) {
        this._handleResponse(msg.toString());
      }
    });
    
    this._connect();
  }

  _connect() {
    try {
      this.log.debug(`Setup socket`);
      this.socket.bind(() => {
        const msg = JSON.stringify({ t: "scan" });
        this.log.debug(`Socket setup at ${this.socket.address().port}`);
        this.log.debug(`Scan for device at ${this.config.address}:${remotePort}`);
        this.socket.send(msg, remotePort, this.config.address);
      });
    } catch (error) {
      this.log.error(error);
      const that = this;
      setTimeout(() => {
        if (that.bound === false) {
          that._connect();
        }
      }, this.config.retryInterval || retryInterval);
    }
  }

  _bind() {
    const message = {
      mac: this.mac,
      t: "bind",
      uid: 0,
    };
    this.log.debug(`Bind to device: ${this.mac}`);
    this._sendRequest(message);
  }

  _updateStatus() {
    const cols = Object.keys(commands).map(k => commands[k].code);
    const message = {
      mac: this.mac,
      t: "status",
      cols
    };
    this.log.debug(`[${this.mac}] Update status for keys: ${cols}`);
    this._sendRequest(message);
  }

  sendCommands(commands) {
    const keys = Object.keys(commands);
    const values = keys.map(k => commands[k]);
    const message = {
      t: "cmd",
      opt: keys,
      p: values,
    };
    this.log.debug(`[${this.mac}] Send commands: %j`, commands);
    this._sendRequest(message);
  }

  _sendRequest(message) {
    const pack = crypto.encrypt(message, this.key);
    const request = {
      cid: "app",
      i: this.key == null ? 1 : 0,
      t: "pack",
      uid: 0,
      pack,
    };
    const msg = JSON.stringify(request);
    this.log.debug(`[${this.mac}] Send request: %j`, message);
    this.socket.send(msg, remotePort, this.config.address);
  }

  _handleResponse(message) {
    const pack = crypto.decrypt(JSON.parse(message).pack, this.key);
    switch (pack.t) {
      case "dev": // connect
        this.mac = pack.mac || pack.cid;
        this.log.debug(`Found device: ${this.mac}`);
        this._bind();
        break;
      case "bindok": // bound
        this.mac = pack.mac || pack.cid;
        this.key = pack.key;
        this.bound = true;
        this.log.info(`Bound to device: ${this.mac}`);
        setInterval(
          this._updateStatus.bind(this),
          this.config.updateInterval || updateInterval
        );
        break;
      case "dat": // status
        pack.cols.forEach((col, i) => {
          this.status[col] = pack.dat[i];
        });
        this.log.debug(`[${this.mac}] Status updated: %j`, this.status);
        this.updateCallback();
        break;
      case "res": // command response
        pack.opt.forEach((col, i) => {
          this.status[col] = pack.val[i];
        });
        this.log.debug(`[${this.mac}] Command responded: %j`, this.status);
        this.updateCallback();
        break;
    }
  }
}

module.exports = Device;
    
