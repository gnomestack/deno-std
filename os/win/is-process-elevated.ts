import { PlatformNotSupportedException } from "../../exceptions/mod.ts";
import { IS_WINDOWS } from "../constants.ts";

let isProcessElevatedValue: boolean | undefined = undefined;

export function isProcessElevated(onNativeError?: (e: unknown) => void): boolean {
    if (!IS_WINDOWS) {
        throw new PlatformNotSupportedException("This function is only supported on Windows.");
    }

    try {
        const shell32 = Deno.dlopen(
            "shell32.dll",
            {
                isUserAnAdmin: {
                    name: "IsUserAnAdmin",
                    parameters: [],
                    result: "bool",
                    nonblocking: false,
                },
            } as const,
        );

        isProcessElevatedValue = shell32.symbols.isUserAnAdmin();
        shell32.close();
        return isProcessElevatedValue;
    } catch (e: unknown) {
        if (onNativeError !== undefined) {
            onNativeError(e as Error);
        }
        isProcessElevatedValue = false;
        return isProcessElevatedValue;
    }
}
