import { ProcessError } from "../errors/mod.ts";
import { IChildProcess, StdInput } from "./types.ts";

export async function pipeInput(input: StdInput, child: IChildProcess | Deno.ChildProcess, throwOnError?: boolean) {
    if (input && !child.stdin.locked) {
        if (typeof input === 'object' && 'stdout' in input) {
            const stdout = input.stdout;
            if (stdout instanceof Uint8Array) {
                input = input.stdout;
            } else if (input.stdout instanceof ReadableStream) {
                input = input.stdout;
            }
        }

        if (input instanceof Uint8Array) {
            const writer = child.stdin.getWriter();
            await writer.write(input);
            await writer.close();
            writer.releaseLock();
            return true;
        }

        if (input instanceof ReadableStream) {
            const writer = child.stdin.getWriter();
            const reader = input.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                await writer.write(value);
            }
            await writer.close();
            writer.releaseLock();
            await reader.closed;
            reader.releaseLock();
            return true;
        }

        if (typeof input === "string") {
            const writer = child.stdin.getWriter();
            await writer.write(new TextEncoder().encode(input));
            await writer.close();
            writer.releaseLock();
            return true;
        }

        if (throwOnError) {
            throw new ProcessError(undefined, -1, "Invalid input type " + Object.prototype.toString.call(input));
        }

        return false;
    }
}