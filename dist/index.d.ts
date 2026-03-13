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
    saveInfo: (payload?: string | AnyObject) => unknown;
    getInfo: () => unknown;
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
export declare class EmdcBridgeCore {
    private debug;
    private timeout;
    private serialize;
    private listeners;
    private pending;
    private _installed;
    constructor(options?: BridgeOptions);
    private log;
    install(): void;
    isAndroidAvailable(): boolean;
    private callAndroid;
    request(methodName: keyof EmdcBridgeAndroid, payload: unknown, options?: {
        timeout?: number;
    }): Promise<unknown>;
    saveInfo(payload: unknown): unknown;
    getInfo(): unknown;
    getDeviceInfo(): unknown;
    on(type: string, handler: BridgeHandler): () => void;
    once(type: string, handler: BridgeHandler): () => void;
    off(type: string, handler: BridgeHandler): void;
    private emit;
    private _handleCallback;
}
declare const bridge: EmdcBridgeCore;
export default bridge;
