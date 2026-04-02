# EmdcBridge

A lightweight JSBridge wrapper for Web-to-Android communication.

## Install

```bash
npm i @jonce/emdc-bridge
```

## Usage

```ts
import bridge from "@jonce/emdc-bridge";

// Set item
bridge.setItem("profile", { name: "Alice" });

// Get item by key
const info = bridge.getItem("profile");

// Clear item by key
bridge.clearItem("profile");

// Start assistant work
bridge.startAssistantWork();

// Play video
bridge.playVideo("intro.mp4");

// Device info
const device = bridge.getDeviceInfo();

// Listen to Android events
bridge.on("event", (data) => {
  console.log("event", data);
});

// Android pushes:
// window.EmdcBridgeWeb.callback({ type: "event", data: { ... } })
```

## Advanced: request/response (optional)

```ts
bridge.request("getItem", { type: "getItem", data: { key: "profile" } })
  .then((data) => console.log(data))
  .catch(console.error);
```

## API

- `bridge.setItem(key, data)`
- `bridge.getItem(key)`
- `bridge.clearItem(key)`
- `bridge.startAssistantWork()`
- `bridge.playVideo(fileName)`
- `bridge.getDeviceInfo()`
- `bridge.isAndroidAvailable()`
- `bridge.request(methodName, payload, { timeout })`
- `bridge.on(type, handler)`
- `bridge.once(type, handler)`
- `bridge.off(type, handler)`

## Payload format

```json
{
  "key": "string",
  "data": {}
}
```

## Notes

- Payloads are JSON-stringified before sending to Android by default. If your Android bridge expects raw objects, create your own instance with `serialize: false`.

## Environment Check

Use `bridge.isAndroidAvailable()` to check whether the Android bridge has been injected before calling Android methods.

```ts
import { EmdcBridgeCore } from "@jonce/emdc-bridge";

const bridge = new EmdcBridgeCore({ serialize: false });
```
