const DEFAULT_TIMEOUT = 8000;

type AnyObject = Record<string, unknown>;

export interface BridgePayload {
  type: string;
  data: AnyObject | unknown;
  requestId?: string;
}

export interface BridgeOptions {
  debug?: boolean;
  timeout?: number;
  autoInstall?: boolean;
  serialize?: boolean;
}

export type BridgeHandler = (data: unknown, raw: BridgePayload) => void;

interface EmdcBridgeAndroid {
  setItem: (...args: unknown[]) => unknown;
  getItem: (...args: unknown[]) => unknown;
  clearItem: (...args: unknown[]) => unknown;
  getDeviceInfo: () => unknown;
}

declare global {
  interface Window {
    EmdcBridge?: EmdcBridgeAndroid;
    EmdcBridgeWeb?: {
      callback?: (payload: unknown) => void;
    };
  }
}

function safeParseJSON(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function normalizePayload(input: unknown, fallbackType: string): BridgePayload {
  if (
    input &&
    typeof input === "object" &&
    "type" in input &&
    "data" in input
  ) {
    return input as BridgePayload;
  }
  return {
    type: fallbackType,
    data: input ?? {}
  };
}

export class EmdcBridgeCore {
  private debug: boolean;
  private timeout: number;
  private serialize: boolean;
  private listeners: Map<string, Set<BridgeHandler>>;
  private pending: Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void; timer: number }>;
  private _installed: boolean;

  constructor(options: BridgeOptions = {}) {
    this.debug = Boolean(options.debug);
    this.timeout = Number.isFinite(options.timeout) ? (options.timeout as number) : DEFAULT_TIMEOUT;
    this.serialize = options.serialize !== false;
    this.listeners = new Map();
    this.pending = new Map();
    this._installed = false;

    if (options.autoInstall !== false) {
      this.install();
    }
  }

  private log(...args: unknown[]) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log("[EmdcBridge]", ...args);
    }
  }

  install() {
    if (typeof window === "undefined") return;
    const self = this;
    window.EmdcBridgeWeb = window.EmdcBridgeWeb || {};
    window.EmdcBridgeWeb.callback = function callback(payload: unknown) {
      self._handleCallback(payload);
    };
    this._installed = true;
    this.log("EmdcBridgeWeb.callback installed");
  }

  isAndroidAvailable(): boolean {
    return typeof window !== "undefined" && Boolean(window.EmdcBridge);
  }

  private callAndroid(methodName: keyof EmdcBridgeAndroid, payload?: unknown) {
    if (!this.isAndroidAvailable() || typeof window.EmdcBridge?.[methodName] !== "function") {
      throw new Error(`Android bridge method not available: ${String(methodName)}`);
    }

    const body = this.serialize && payload !== undefined && typeof payload === "object"
      ? JSON.stringify(payload)
      : payload;

    try {
      if (payload === undefined) {
        const result = (window.EmdcBridge as EmdcBridgeAndroid)[methodName]();
        return safeParseJSON(result);
      }

      const result = (window.EmdcBridge as EmdcBridgeAndroid)[methodName](body as string | AnyObject | undefined);
      return safeParseJSON(result);
    } catch (err) {
      // Some Android bridges expose only a String-arg signature. If we called
      // a no-arg method and it failed, retry with an empty JSON payload.
      if (payload === undefined && this.serialize) {
        const result = (window.EmdcBridge as EmdcBridgeAndroid)[methodName](JSON.stringify({}));
        return safeParseJSON(result);
      }
      throw err as Error;
    }
  }

  private callAndroidArgs(methodName: keyof EmdcBridgeAndroid, args: unknown[]) {
    if (!this.isAndroidAvailable() || typeof window.EmdcBridge?.[methodName] !== "function") {
      throw new Error(`Android bridge method not available: ${String(methodName)}`);
    }

    const normalizedArgs = this.serialize
      ? args.map((arg) => (arg !== null && typeof arg === "object" ? JSON.stringify(arg) : arg))
      : args;

    const result = (window.EmdcBridge as EmdcBridgeAndroid)[methodName](...normalizedArgs);
    return safeParseJSON(result);
  }

  request(methodName: keyof EmdcBridgeAndroid, payload: unknown, options: { timeout?: number } = {}) {
    const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const timeoutMs = Number.isFinite(options.timeout) ? (options.timeout as number) : this.timeout;
    const normalized = normalizePayload(payload, String(methodName));
    normalized.requestId = requestId;

    return new Promise<unknown>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`EmdcBridge request timeout: ${String(methodName)}`));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });

      try {
        const result = this.callAndroid(methodName, normalized);
        if (result !== undefined) {
          // If Android returns immediately, resolve and clear pending.
          clearTimeout(timer);
          this.pending.delete(requestId);
          resolve(result);
        }
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(err as Error);
      }
    });
  }

  setItem(key: string, data: unknown) {
    return this.callAndroidArgs("setItem", [key, data]);
  }

  getItem(key: string) {
    return this.callAndroidArgs("getItem", [key]);
  }

  clearItem(key: string) {
    return this.callAndroidArgs("clearItem", [key]);
  }

  getDeviceInfo() {
    return this.callAndroid("getDeviceInfo");
  }

  on(type: string, handler: BridgeHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(handler);
    return () => this.off(type, handler);
  }

  once(type: string, handler: BridgeHandler) {
    const off = this.on(type, (data, raw) => {
      off();
      handler(data, raw);
    });
    return off;
  }

  off(type: string, handler: BridgeHandler) {
    const set = this.listeners.get(type);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.listeners.delete(type);
  }

  private emit(type: string, data: unknown, raw: BridgePayload) {
    const specific = this.listeners.get(type);
    if (specific) {
      for (const handler of specific) handler(data, raw);
    }
    const wildcard = this.listeners.get("*");
    if (wildcard) {
      for (const handler of wildcard) handler(data, raw);
    }
  }

  private _handleCallback(payload: unknown) {
    const raw = safeParseJSON(payload);
    const message = raw && typeof raw === "object"
      ? (raw as BridgePayload)
      : ({ type: "unknown", data: raw } as BridgePayload);

    const { type, data, requestId } = message;

    if (requestId && this.pending.has(requestId)) {
      const pending = this.pending.get(requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.resolve(data);
        return;
      }
    }

    if (!type) {
      this.log("callback missing type", message);
      return;
    }

    this.emit(type, data, message);
  }
}

const bridge = new EmdcBridgeCore();

export default bridge;
