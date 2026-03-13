const DEFAULT_TIMEOUT = 8000;
function safeParseJSON(value) {
    if (typeof value !== "string")
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
function normalizePayload(input, fallbackType) {
    if (input &&
        typeof input === "object" &&
        "type" in input &&
        "data" in input) {
        return input;
    }
    return {
        type: fallbackType,
        data: input !== null && input !== void 0 ? input : {}
    };
}
class EmdcBridgeCore {
    constructor(options = {}) {
        this.debug = Boolean(options.debug);
        this.timeout = Number.isFinite(options.timeout) ? options.timeout : DEFAULT_TIMEOUT;
        this.serialize = options.serialize !== false;
        this.listeners = new Map();
        this.pending = new Map();
        this._installed = false;
        if (options.autoInstall !== false) {
            this.install();
        }
    }
    log(...args) {
        if (this.debug) {
            // eslint-disable-next-line no-console
            console.log("[EmdcBridge]", ...args);
        }
    }
    install() {
        if (typeof window === "undefined")
            return;
        const self = this;
        window.EmdcBridgeWeb = window.EmdcBridgeWeb || {};
        window.EmdcBridgeWeb.callback = function callback(payload) {
            self._handleCallback(payload);
        };
        this._installed = true;
        this.log("EmdcBridgeWeb.callback installed");
    }
    isAndroidAvailable() {
        return typeof window !== "undefined" && Boolean(window.EmdcBridge);
    }
    callAndroid(methodName, payload) {
        var _a, _b;
        if (!this.isAndroidAvailable() || typeof ((_a = window.EmdcBridge) === null || _a === void 0 ? void 0 : _a[methodName]) !== "function") {
            throw new Error(`Android bridge method not available: ${String(methodName)}`);
        }
        const body = this.serialize && payload !== undefined && typeof payload === "object"
            ? JSON.stringify(payload)
            : payload;
        const result = (_b = window.EmdcBridge) === null || _b === void 0 ? void 0 : _b[methodName](body);
        return safeParseJSON(result);
    }
    request(methodName, payload, options = {}) {
        const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const timeoutMs = Number.isFinite(options.timeout) ? options.timeout : this.timeout;
        const normalized = normalizePayload(payload, String(methodName));
        normalized.requestId = requestId;
        return new Promise((resolve, reject) => {
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
            }
            catch (err) {
                clearTimeout(timer);
                this.pending.delete(requestId);
                reject(err);
            }
        });
    }
    saveInfo(payload) {
        const normalized = normalizePayload(payload, "saveInfo");
        return this.callAndroid("saveInfo", normalized);
    }
    getInfo() {
        return this.callAndroid("getInfo");
    }
    getDeviceInfo() {
        return this.callAndroid("getDeviceInfo");
    }
    on(type, handler) {
        var _a;
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        (_a = this.listeners.get(type)) === null || _a === void 0 ? void 0 : _a.add(handler);
        return () => this.off(type, handler);
    }
    once(type, handler) {
        const off = this.on(type, (data, raw) => {
            off();
            handler(data, raw);
        });
        return off;
    }
    off(type, handler) {
        const set = this.listeners.get(type);
        if (!set)
            return;
        set.delete(handler);
        if (set.size === 0)
            this.listeners.delete(type);
    }
    emit(type, data, raw) {
        const specific = this.listeners.get(type);
        if (specific) {
            for (const handler of specific)
                handler(data, raw);
        }
        const wildcard = this.listeners.get("*");
        if (wildcard) {
            for (const handler of wildcard)
                handler(data, raw);
        }
    }
    _handleCallback(payload) {
        const raw = safeParseJSON(payload);
        const message = raw && typeof raw === "object"
            ? raw
            : { type: "unknown", data: raw };
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

export { EmdcBridgeCore, bridge as default };
//# sourceMappingURL=index.esm.js.map
