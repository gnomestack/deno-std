import { HOME_VAR_NAME, HOST_VAR_NAME, IS_WINDOWS, TEMP_VAR_NAME, USER_VAR_NAME } from "./constants.ts";
import { get, getRequired } from "./env.ts";
import { isProcessElevated as isWindowsAdmin } from "./win/is-process-elevated.ts";
export { osRelease } from "./release.ts";

export function endianness(): "BE" | "LE" {
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView#Endianness
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
    // Int16Array uses the platform's endianness.
    return new Int16Array(buffer)[0] === 256 ? "LE" : "BE";
}

// TODO: add ffi bindings for uname, hostname, etc.
export function username(): string | undefined {
    return getRequired(USER_VAR_NAME);
}

export function hostname(): string {
    return getRequired(HOST_VAR_NAME);
}

export function homeDir(): string {
    return getRequired(HOME_VAR_NAME);
}

export function tmpDir(): string {
    return get(TEMP_VAR_NAME) ?? "/tmp";
}

export function uid(): number | null {
    return Deno.uid();
}

export function gid(): number | null {
    return Deno.gid();
}

export function isProcessElevated(): boolean {
    if (IS_WINDOWS) {
        return isWindowsAdmin();
    }

    return uid() === 0;
}
