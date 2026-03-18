import bridge from "@jonce/emdc-bridge";

// Set item
bridge.setItem("profile", { name: "Alice" });

// Get item by key
const info = bridge.getItem("profile");
console.log("getInfo", info);

// Clear item by key
bridge.clearItem("profile");

// Start assistant work
bridge.startAssistantWork();

// Device info
const device = bridge.getDeviceInfo();
console.log("getDeviceInfo", device);

// Listen to Android events
bridge.on("deviceEvent", (data) => {
  console.log("deviceEvent", data);
});

// Android pushes:
// window.EmdcBridgeWeb.callback({ type: "deviceEvent", data: { ... } })
