import bridge from "@jonce/emdc-bridge";

// Save info
bridge.saveInfo({
  type: "saveInfo",
  data: { name: "Alice" }
});

// Get info
const info = bridge.getInfo();
console.log("getInfo", info);

// Device info
const device = bridge.getDeviceInfo();
console.log("getDeviceInfo", device);

// Listen to Android events
bridge.on("deviceEvent", (data) => {
  console.log("deviceEvent", data);
});

// Android pushes:
// window.EmdcBridgeWeb.callback({ type: "deviceEvent", data: { ... } })
