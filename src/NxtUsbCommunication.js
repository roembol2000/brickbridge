// BrickBridge - Copyright (c) 2025 Roemer Peters - MIT License

import NxtCommunication from "./NxtCommunication";

/**
 * Represents the USB interface
 *
 * @extends NxtCommunication
 */
class NxtUsbCommunication extends NxtCommunication {
  constructor() {
    super();
    this.device = null;
  }

  /**
   * Connect to the nxt brick via USB
   *
   * @async
   * @function connect
   * @memberof NxtUsbCommunication
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async connect() {
    this.device = await navigator.usb.requestDevice({
      filters: [{ vendorId: 0x0694 }], // LEGO
    });

    await this.device.open();

    if (this.device.configuration === null) {
      await this.device.selectConfiguration(1);
    }

    await this.device.claimInterface(0);
  }

  /**
   * Send a command to the nxt brick
   *
   * @async
   * @function sendCommand
   * @memberof NxtUsbCommunication
   * @param {Uint8Array} command
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async sendCommand(command) {
    if (!this.device) {
      throw new Error("No device connected");
    }

    await this.device.transferOut(1, command);
  }

  /**
   * Receive data from the nxt brick
   *
   * @async
   * @function receiveData
   * @memberof NxtUsbCommunication
   * @returns {Promise<Uint8Array>}
   * @throws {Error}
   */
  async receiveData() {
    if (!this.device) {
      throw new Error("No device connected");
    }

    const result = await this.device.transferIn(2, 64);

    if (!result.data) {
      throw new Error("No data received");
    }

    return new Uint8Array(result.data.buffer);
  }
}

export default NxtUsbCommunication;
