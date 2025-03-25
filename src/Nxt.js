// BrickBridge - Copyright (c) 2025 Roemer Peters - MIT License

import NxtUsbCommunication from "./NxtUsbCommunication.js";

/**
 * Main class for interacting with the brick
 */
export class Nxt {
  constructor() {
    this.connectedDevice;
  }

  /**
   * Connect to the nxt brick via USB or Bluetooth
   *
   * @async
   * @function connect
   * @memberof Nxt
   * @param {string} type // type can be "usb" or "bluetooth"
   * @returns {Promise<void>}
   */
  async connect(type) {
    switch (type) {
      case "usb":
        this.connectedDevice = new NxtUsbCommunication();
        break;
      case "bluetooth":
        throw new Error("Bluetooth not implemented");
      default:
        throw new Error("Invalid connection type");
    }

    await this.connectedDevice.connect();
  }

  /**
   * Get firmware and protocol version of connected brick
   *
   * @async
   * @function getFirmwareVersion
   * @memberof Nxt
   * @returns {Promise<{ minorProtocol: number, majorProtocol: number, minorFirmware: number, majorFirmware: number}>}
   * @throws {Error}
   */
  async getFirmwareVersion() {
    if (!this.connectedDevice) {
      throw new Error("No device connected");
    }

    await this.connectedDevice.sendCommand(new Uint8Array([0x01, 0x88])); // Get firmware version

    // Expected output:
    // 0: 0x02
    // 1: 0x88
    // 2: status, 0 equals success, otherwise indicates error message
    // 3: minor version of protocol
    // 4: major version of protocol
    // 5: minor version of firmware
    // 6: major version of firmware

    const data = await this.connectedDevice.receiveData();
    return {
      minorProtocol: data[3],
      majorProtocol: data[4],
      minorFirmware: data[5],
      majorFirmware: data[6],
    };
  }

  /**
   * Check connection using the getFirmwareVersion command. Returns a boolean
   *
   * @async
   * @function checkConnection
   * @memberof Nxt
   * @returns {Promise<boolean>}
   * @throws {Error}
   */
  async checkConnection() {
    try {
      if (!this.connectedDevice) {
        throw new Error("No device connected");
      }
      await this.getFirmwareVersion();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get device info of connected brick
   *
   * @async
   * @function getDeviceInfo
   * @memberof Nxt
   * @returns {Promise<{ nxtName: string, btAddress: string, btSignalStrength: number, freeUserFlash: number }>}
   * @throws {Error}
   */
  async getDeviceInfo() {
    if (!this.connectedDevice) {
      throw new Error("No device connected");
    }

    await this.connectedDevice.sendCommand(new Uint8Array([0x01, 0x9b])); // Get device info

    // Expected output:
    // 0: 0x02
    // 1: 0x9B
    // 2: status, 0 equals success, otherwise indicates error message
    // 3-17: NXT name
    // 18-24: BT address
    // 25: lsb of BT signal strength
    // 28: msb of BT signal strength
    // 29: lsb of free user flash
    // 32: msb of free user flash

    const data = await this.connectedDevice.receiveData();

    const rawName = String.fromCharCode(...data.slice(3, 18));
    const nxtName = rawName.replace(/\u0000/g, ""); // Remove null characters

    const btAddress = data.slice(18, 24);

    // untested
    const btSignalStrength =
      data[25] | (data[26] << 8) | (data[27] << 16) | (data[28] << 24);

    const freeUserFlash =
      data[29] | (data[30] << 8) | (data[31] << 16) | (data[32] << 24);

    return {
      nxtName,
      btAddress,
      btSignalStrength,
      freeUserFlash,
    };
  }

  /**
   * Set brick name, max 15 chars
   *
   * @async
   * @function setBrickName
   * @memberof Nxt
   * @param {string} name
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async setBrickName(name) {
    if (!this.connectedDevice) {
      throw new Error("No device connected");
    }

    if (!(await this.checkConnection())) {
      throw new Error("No device connected");
    }

    if (name.length > 15) {
      throw new Error("Name must be 15 characters or less");
    }

    const nameArray = new Uint8Array(15);
    nameArray.set(name.split("").map((char) => char.charCodeAt(0)));

    await this.connectedDevice.sendCommand(
      new Uint8Array([0x01, 0x98, ...nameArray])
    );

    const data = await this.connectedDevice.receiveData();

    if (data[2] !== 0) {
      throw new Error(`Failed to set brick name, error code ${data[2]}`);
    }
  }

  /**
   * Open linear write
   *
   * Returns the handle number
   *
   * @private
   * @async
   * @function _openLinearWrite
   * @memberof Nxt
   * @param {string} name
   * @param {number} size
   * @returns {Promise<number>}
   */
  async _openLinearWrite(name, size) {
    if (name.length > 20) {
      throw new Error("Filesize too long");
    }

    const nameArray = new Uint8Array(20);
    nameArray.set(name.split("").map((char) => char.charCodeAt(0)));

    // Filesize in bytes, 4 bytes, least to most significant
    const sizeArray = new Uint8Array([
      size & 0xff,
      (size >> 8) & 0xff,
      (size >> 16) & 0xff,
      (size >> 24) & 0xff,
    ]);

    await this.connectedDevice.sendCommand(
      new Uint8Array([0x01, 0x89, ...nameArray, ...sizeArray])
    );

    const data = await this.connectedDevice.receiveData();

    if (data[2] !== 0) {
      throw new Error(`Failed to open linear write, error code ${data[2]}`);
    }

    return data[3];
  }

  /**
   * Write data to brick
   *
   * @private
   * @async
   * @function _write
   * @memberof Nxt
   * @param {number} handle
   * @param {Uint8Array} data
   * @param {boolean} requireResponse
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async _write(handle, data, requireResponse = false) {
    if (data.length > 64 - 3) {
      throw new Error("Data too long");
    }

    await this.connectedDevice.sendCommand(
      new Uint8Array([requireResponse ? 0x01 : 0x81, 0x83, handle, ...data])
    );

    if (requireResponse) {
      const response = await this.connectedDevice.receiveData();

      if (response[2] !== 0) {
        throw new Error(`Failed to write data, error code ${response[2]}`);
      }

      return response;
    }
  }

  /**
   * Upload file
   *
   * Will delete the file if it already exists.
   *
   * @async
   * @function uploadFile
   * @memberof Nxt
   * @param {File} file
   * @param {Boolean} stopProgram
   * @returns {Promise<void>}
   */
  async uploadFile(file, stopProgram) {
    if (!this.connectedDevice) {
      throw new Error("No device connected");
    }

    if (!(await this.checkConnection())) {
      throw new Error("No device connected");
    }

    if (!file) {
      throw new Error("No file selected");
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const packetChunkSize = 64;

    const firmwareVersion = await this.getFirmwareVersion();
    if (firmwareVersion.majorFirmware != 1) {
      throw new Error("Cannot verify firmware");
    }

    if (stopProgram) {
      try {
        await this.stopProgram();
      } catch (error) {
        console.log(error.statusCode);
        if (error.statusCode != 236) {
          throw error;
        }
      }
    }

    try {
      await this.deleteFile(file.name);
    } catch (error) {
      if (error.statusCode != 135) {
        throw error;
      }
    }

    const handle = await this._openLinearWrite("Untitled1.rxe", 244);

    let response;

    for (let i = 0; i < data.length; i += packetChunkSize - 3) {
      const chunk = data.slice(i, i + packetChunkSize - 3);
      const isLastChunk = i + packetChunkSize - 3 >= data.length;
      response = await this._write(handle, chunk, isLastChunk);
    }

    if (response[2] !== 0) {
      throw new Error(`Failed to upload file, error code ${response[2]}`);
    }

    // Close handle
    await this.connectedDevice.sendCommand(
      new Uint8Array([0x01, 0x84, handle])
    );
  }

  /**
   * Upload program
   *
   * @async
   * @function uploadProgram
   * @memberof Nxt
   * @param {File} file
   * @returns {Promise<void>}
   */
  async uploadProgram(file) {
    if (!file) {
      throw new Error("No file selected");
    }

    if (!file.name.toLowerCase().endsWith(".rxe")) {
      throw new Error("Invalid file format; file doesn't end with .rxe");
    }

    // Verify file is an NXT executable by ensuring it starts with exactly the following:
    // 4D 69 6E 64 73 74 6F 72 6D 73 4E 58 54
    // There are three bytes after that which indicate the version. These can change so they are not taken into consideration
    const expectedHeader = new Uint8Array([
      0x4d, 0x69, 0x6e, 0x64, 0x73, 0x74, 0x6f, 0x72, 0x6d, 0x73, 0x4e, 0x58,
      0x54,
    ]);

    const headerLength = expectedHeader.length;
    const fileSlice = file.slice(0, headerLength);
    const arrayBuffer = await fileSlice.arrayBuffer();
    const header = new Uint8Array(arrayBuffer);

    // Compare expected header vs header from file
    if (!header.every((value, index) => value === expectedHeader[index])) {
      throw new Error("Invalid file format");
    }

    try {
      await this.uploadFile(file, true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stop program
   *
   * @async
   * @function stopProgram
   * @memberof Nxt
   * @returns {Promise<void>}
   */
  async stopProgram() {
    if (!this.connectedDevice) {
      throw new Error("No device connected");
    }

    if (!(await this.checkConnection())) {
      throw new Error("No device connected");
    }

    await this.connectedDevice.sendCommand(new Uint8Array([0x00, 0x01])); // Direct command: Stop program

    const data = await this.connectedDevice.receiveData();

    const status = data[2];

    if (status !== 0) {
      const error = new Error(`Failed to stop program, error code ${status}`);
      error.statusCode = status;
      throw error;
    }
  }

  /** Handle find return packet. returns something like {name: "<filename>", size: <int>}
   *
   * @private
   * @function _handleFindReturnPacket
   * @memberof Nxt
   * @param {Uint8Array} data
   * @returns {{ handle: number, name: string, size: number }}
   */
  _handleFindReturnPacket(data) {
    const name = String.fromCharCode(...data.slice(4, 23)).replace(
      /\u0000/g,
      ""
    );

    // byte 24 to 27 is the filesize from least significant bit to most significant
    const fileSize =
      data[24] | (data[25] << 8) | (data[26] << 16) | (data[27] << 24);

    return {
      handle: data[3],
      name,
      fileSize,
    };
  }

  /**
   * List files
   *
   * @async
   * @function listFiles
   * @memberof Nxt
   * @returns {Promise<{ name: string, size: number }[]>}
   */
  async listFiles() {
    if (!this.connectedDevice) {
      throw new Error("No device connected");
    }

    if (!(await this.checkConnection())) {
      throw new Error("No device connected");
    }

    let data;
    let fileInfo;
    const files = [];

    // Search for wildcard *.*
    const fileName = new Uint8Array([
      0x2a, 0x2e, 0x2a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);

    await this.connectedDevice.sendCommand(
      new Uint8Array([0x01, 0x86, ...fileName]) // System command: Find first
    );

    data = await this.connectedDevice.receiveData();
    fileInfo = this._handleFindReturnPacket(data);

    const handle = fileInfo.handle;

    files.push({ name: fileInfo.name, size: fileInfo.fileSize });

    let lastFile = false;

    while (!lastFile) {
      await this.connectedDevice.sendCommand(
        new Uint8Array([0x01, 0x87, handle]) // System command: Find next
      );

      data = await this.connectedDevice.receiveData();

      if (data[2] === 0) {
        fileInfo = this._handleFindReturnPacket(data);
        files.push({ name: fileInfo.name, size: fileInfo.fileSize });
      } else {
        lastFile = true;
      }
    }

    // Close the handle
    await this.connectedDevice.sendCommand(
      new Uint8Array([0x01, 0x84, handle]) // System command: Close
    );

    data = await this.connectedDevice.receiveData();

    if (data[2] !== 0) {
      throw new Error(`Failed to close handle, error code ${data[2]}`);
    }

    return files;
  }

  /**
   * Delete file
   *
   * Throws an error with error.statusCode = 135 if the file isn't found.
   *
   * @async
   * @function deleteFile
   * @memberof Nxt
   * @param {string} fileName
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async deleteFile(fileName) {
    if (!this.connectedDevice) {
      throw new Error("No device connected");
    }

    if (!(await this.checkConnection())) {
      throw new Error("No device connected");
    }

    const fileNameArray = new Uint8Array(20);
    fileNameArray.set(fileName.split("").map((char) => char.charCodeAt(0)));

    await this.connectedDevice.sendCommand(
      new Uint8Array([0x01, 0x85, ...fileNameArray]) // System command: Delete
    );

    const data = await this.connectedDevice.receiveData();

    if (data[2] !== 0) {
      const error = new Error(`Failed to delete file, error code ${data[2]}`);
      error.statusCode = data[2];
      throw error;
    }
  }
}
