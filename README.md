# EmdcBridge

A lightweight JSBridge wrapper for Web-to-Android communication.

## Install

```bash
npm i @jonce/emdc-bridge
```

## Usage

```ts
import bridge from "@jonce/emdc-bridge";

// Set info
bridge.setInfo({
  type: "setInfo",
  data: { name: "Alice" }
});

// Get info
const info = bridge.getInfo();

// Device info
const device = bridge.getDeviceInfo();

// Listen to Android events
bridge.on("deviceEvent", (data) => {
  console.log("deviceEvent", data);
});

// Android pushes:
// window.EmdcBridgeWeb.callback({ type: "deviceEvent", data: { ... } })
```

## Advanced: request/response (optional)

```ts
bridge.request("getInfo", { type: "getInfo", data: {} })
  .then((data) => console.log(data))
  .catch(console.error);
```

## API

- `bridge.setInfo(payload)`
- `bridge.getInfo()`
- `bridge.getDeviceInfo()`
- `bridge.isAndroidAvailable()`
- `bridge.request(methodName, payload, { timeout })`
- `bridge.on(type, handler)`
- `bridge.once(type, handler)`
- `bridge.off(type, handler)`

## Payload format

```json
{
  "type": "string",
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
