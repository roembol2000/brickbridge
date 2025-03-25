const { Nxt } = window.BrickBridge;
import { printToConsole, toHexString } from "./util.js";

const brick = new Nxt();

const btnConnectToNxt = document.querySelector("#btn_connect_to_nxt");
const btnGetFirmware = document.querySelector("#btn_get_firmware");
const btnGetDeviceInfo = document.querySelector("#btn_get_device_info");
const btnSetBrickName = document.querySelector("#btn_set_brick_name");
const btnUploadProgram = document.querySelector("#btn_upload_program");
const btnStopProgram = document.querySelector("#btn_stop_program");
const btnListFiles = document.querySelector("#btn_list_files");
const btnDeleteFile = document.querySelector("#btn_delete_file");

btnConnectToNxt.addEventListener("click", async () => {
  try {
    printToConsole("Attempting to connect...");
    await brick.connect("usb");
    const firmwareVersion = await brick.getFirmwareVersion();
    printToConsole(
      `Connected to brick with firmware version ${firmwareVersion.majorFirmware}.${firmwareVersion.minorFirmware}`
    );
    printToConsole();
  } catch (error) {
    printToConsole(error);
    printToConsole();
    throw error;
  }
});

btnGetFirmware.addEventListener("click", async () => {
  const firmwareVersion = await brick.getFirmwareVersion();
  printToConsole(JSON.stringify(firmwareVersion));
  printToConsole();
});

btnGetDeviceInfo.addEventListener("click", async () => {
  const deviceInfo = await brick.getDeviceInfo();
  printToConsole("Brick info:");
  printToConsole(`  Brick name:..................${deviceInfo.nxtName}`);
  // prettier-ignore
  printToConsole(`  Bluetooth address:...........${toHexString(deviceInfo.btAddress, ":")}`);
  printToConsole(
    `  Bluetooth signal strength:...${deviceInfo.btSignalStrength}`
  );
  printToConsole(
    `  Free user flash:.............${deviceInfo.freeUserFlash} bytes`
  );
  printToConsole();
});

btnSetBrickName.addEventListener("click", async () => {
  const brickName = document.querySelector("#input_brick_name").value;
  await brick.setBrickName(brickName);
  printToConsole(`Brick name set to: "${brickName}"`);
  printToConsole("Recommended to get device info to confirm!");
  printToConsole();
});

btnUploadProgram.addEventListener("click", async () => {
  const file = document.querySelector("#input_upload_program").files[0];
  if (!file) {
    printToConsole("No file selected");
    printToConsole();
    return;
  }

  printToConsole(`Name: ${file.name}`);
  printToConsole(`Size: ${file.size} bytes`);
  printToConsole("Uploading..");
  try {
    await brick.uploadProgram(file);
  } catch (error) {
    printToConsole(error);
    printToConsole();
    throw error;
  }

  printToConsole("Program uploaded");
  printToConsole();
});

btnStopProgram.addEventListener("click", async () => {
  try {
    await brick.stopProgram();
    printToConsole("Program stopped");
    printToConsole();
  } catch (error) {
    if (error.statusCode != 236) throw error;
    printToConsole("No program running");
    printToConsole();
  }
});

btnListFiles.addEventListener("click", async () => {
  try {
    const files = await brick.listFiles();
    printToConsole("NXT/");
    files.forEach((file) => {
      printToConsole(` ├─${file.name} (${file.size} bytes)`);
    });
    printToConsole();
  } catch (error) {
    printToConsole(error);
    printToConsole();
    throw error;
  }
});

btnDeleteFile.addEventListener("click", async () => {
  const fileName = document.querySelector("#input_delete_file").value;
  if (!fileName) {
    printToConsole("No file name provided");
    printToConsole();
    return;
  }

  try {
    await brick.deleteFile(fileName);
    printToConsole(`File "${fileName}" deleted`);
    printToConsole();
  } catch (error) {
    if ((error.statusCode = 135)) {
      printToConsole("File not found.");
      printToConsole();
      return;
    }
    printToConsole(error);
    printToConsole();
    throw error;
  }
});

printToConsole("This is the output console");
printToConsole();
