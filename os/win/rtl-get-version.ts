import { InvalidOperationError, PlatformNotSupportedError } from "../../errors/mod.ts";
import { IS_WINDOWS } from "../constants.ts";

class OSVERSIONINFOEXWView {
    private readonly view: DataView;
    constructor(private readonly buf: Uint8Array) {
        this.view = new DataView(buf.buffer);
    }

    get buffer(): Uint8Array {
        return this.buf;
    }

    // 0x00: u32
    get dwOSVersionInfoSize(): number {
        return this.view.getUint32(0, true);
    }

    // 0x00: u32
    set dwOSVersionInfoSize(value: number) {
        this.view.setUint32(0, value, true);
    }

    // 0x04: u32
    get dwMajorVersion(): number {
        return this.view.getUint32(4, true);
    }

    // 0x04: u32
    set dwMajorVersion(value: number) {
        this.view.setUint32(4, value, true);
    }

    // 0x08: u32
    get dwMinorVersion(): number {
        return this.view.getUint32(8, true);
    }

    // 0x08: u32
    set dwMinorVersion(value: number) {
        this.view.setUint32(8, value, true);
    }

    // 0x0c: u32
    get dwBuildNumber(): number {
        return this.view.getUint32(12, true);
    }

    // 0x0c: u32
    set dwBuildNumber(value: number) {
        this.view.setUint32(12, value, true);
    }

    // 0x10: u32
    get dwPlatformId(): number {
        return this.view.getUint32(16, true);
    }

    // 0x10: u32
    set dwPlatformId(value: number) {
        this.view.setUint32(16, value, true);
    }

    // WCHAR[128]
    get szCSDVersion(): Uint8Array {
        return new Uint8Array(this.view.buffer.slice(20, 128 * 2));
    }

    // WCHAR[128]
    set szCSDVersion(value: Uint8Array) {
        for (let i = 0; i < value.length; i++) {
            this.view.setUint8(20 + i, value[i]);
        }
    }

    // 0x20: u16
    get wServicePackMajor(): number {
        return this.view.getUint16(276, true);
    }

    // 0x20: u16
    set wServicePackMajor(value: number) {
        this.view.setUint16(276, value, true);
    }

    // 0x22: u16
    get wServicePackMinor(): number {
        return this.view.getUint16(278, true);
    }

    set wServicePackMinor(value: number) {
        this.view.setUint16(278, value, true);
    }

    get wSuiteMask(): number {
        return this.view.getUint16(280, true);
    }

    set wSuiteMask(value: number) {
        this.view.setUint16(36, value, true);
    }

    // 0x26: u8
    get wProductType(): number {
        return this.view.getUint8(281);
    }

    // 0x26: u8
    set wProductType(value: number) {
        this.view.setUint8(281, value);
    }

    // 0x27: u8
    get wReserved(): number {
        return this.view.getUint8(282);
    }

    // 0x27: u8
    set wReserved(value: number) {
        this.view.setUint8(282, value);
    }
}

interface OSVERSIONINFOEXW {
    /** u32 */
    dwOSVersionInfoSize: number;
    /** u32 */
    dwMajorVersion: number;
    /** u32 */
    dwMinorVersion: number;
    /** u32 */
    dwBuildNumber: number;
    /** u32 */
    dwPlatformId: number;
    /** array */
    szCSDVersion: Deno.PointerValue;
    /** u16 */
    wServicePackMajor: number;
    /** u16 */
    wServicePackMinor: number;
    /** u16 */
    wSuiteMask: number;
    /** u8 */
    wProductType: number;
    /** u8 */
    wReserved: number;
}

export enum WindowsProductType {
    WorkStation = 1,
    DomainController = 2,
    Server = 3,
}

let view: OSVERSIONINFOEXWView | undefined = undefined;

export function rtlGetVersion() {
    if (view !== undefined) {
        return view;
    }
    if (!IS_WINDOWS) {
        throw new PlatformNotSupportedError(
            "This function is only supported on Windows.",
        );
    }

    const OSVERSIONINFOEX_SIZE = 284;
    const buffer = new ArrayBuffer(284);
    const dv = new DataView(buffer);
    // Set the size of the structure
    dv.setUint32(0, OSVERSIONINFOEX_SIZE, true);

    let status = -1;

    const ntdll = Deno.dlopen("ntdll.dll", {
        RtlGetVersion: {
            parameters: ["buffer"],
            result: "u32",
        },
    });

    try {
        status = ntdll.symbols.RtlGetVersion(buffer);
    } catch (e: unknown) {
        ntdll.close();
        throw e;
    }

    // Check the status
    if (status !== 0) {
        throw new InvalidOperationError(
            `RtlGetVersion failed with status: ${status}`,
        );
    }

    // Create a view for the returned data
    const returnedData = new Uint8Array(buffer);
    view = new OSVERSIONINFOEXWView(returnedData);
    return view;
}
