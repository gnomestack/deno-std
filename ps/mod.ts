import { NotFoundOnPathError } from "../errors/mod.ts";
import { Ps, ps, preCallHooks, postCallHooks } from "./ps.ts";
import { findExe, findExeSync, registerExe } from "./registry.ts";
import { splat, splitArguments, normalizeExecArgs } from "./utils.ts";
import { ExecArgs, IExecOptions, IExecSyncOptions, IPsStartInfo, ISplatOptions, IPipe, IPsOutput, IChildProcess, IPsOutputArgs, IPsPostHook, IPsPreHook } from "./types.ts";
export * from "./_base.ts";
export * from "./write_command.ts";
export * from "./which.ts";

export {
    NotFoundOnPathError,
    findExe,
    findExeSync,
    registerExe,
    normalizeExecArgs,
    splat,
    splitArguments,
    Ps, 
    ps,
    preCallHooks,
    postCallHooks
};
export type {
    ExecArgs,
    IExecOptions,
    IExecSyncOptions,
    IPsStartInfo,
    ISplatOptions,
    IPipe,
    IPsOutput,
    IPsPostHook,
    IChildProcess,
    IPsOutputArgs,
    IPsPreHook
};

/**
 * A one shot function that runs an executable and returns the output such as code,
 * name, and output.  Stdout and stderr are inherited.
 * 
 * @param name The name of the executable to run.
 * @param args The arguments to pass to the executable.
 * @param options The options to use when running the executable.
 * @returns a promise that resolves to the output of the executable.
 * @example
 * ```ts
 *  const o = await run("echo", ["hello"], { cwd: "/tmp" });
 *  console.log(o.code);
 * ```
 */
export function run(
    name: string | URL,
    args?: ExecArgs,
    options?: Omit<IExecOptions, "stdout" | "stderr">,
) {
    const o: IExecOptions = {
        ...options,
        stdout: "inherit",
        stderr: "inherit",
    };

   return ps(name, args, o).output();
}

/**
 * A one shot function that runs an executable and returns the output such as code,
 * name, and output.  Stdout and stderr are inherited.
 * 
 * @param name The name of the executable to run.
 * @param args The arguments to pass to the executable.
 * @param options The options to use when running the executable.
 * @returns the output of the executable.
 * @example
 * ```ts
 * const o = runSync("echo", ["hello"], { cwd: "/tmp" });
 * console.log(o.code);
 * ```
 */
export function runSync(
    name: string,
    args?: ExecArgs,
    options?: Omit<IExecSyncOptions, "stdout" | "stderr">,
) {
    const o: IExecSyncOptions = {
        ...options,
        stdout: "piped",
        stderr: "piped",
    };

    return ps(name, args, o).outputSync();
}

/**
 * A one shot function that runs an executable and returns the output such as code,
 * name, and output.  Stdout and stderr are captured.
 * 
 * @param name The name of the executable to run.
 * @param args The arguments to pass to the executable.
 * @param options The options to use when running the executable.
 * @returns a promise that resolves to the output of the executable.
 * @example
 * ```ts
 * const o = await capture("echo", ["hello"], { cwd: "/tmp" });
 * console.log(o.code);
 * console.log(o.stdoutText);
 * ```
 */
export function quietRun(
    name: string,
    args?: ExecArgs,
    options?: Omit<IExecOptions, "stdout" | "stderr">,
) {
    const o: IExecOptions = {
        ...options,
        stdout: "piped",
        stderr: "piped",
    };

    return ps(name, args, o).output();
}

/**
 * A one shot function that runs an executable and returns the output such as code,
 * name, and output.  Stdout and stderr are captured.
 * 
 * @param name The name of the executable to run.
 * @param args The arguments to pass to the executable.
 * @param options The options to use when running the executable.
 * @returns the output of the executable.
 * @example
 * ```ts
 * const o = captureSync("echo", ["hello"], { cwd: "/tmp" });
 * console.log(o.code);
 * console.log(o.stdoutText);
 * ```
 */
export function quietRunSync(
    name: string,
    args?: ExecArgs,
    options?: Omit<IExecSyncOptions, "stdout" | "stderr">,
) {
    const o: IExecSyncOptions = {
        ...options,
        stdout: "piped",
        stderr: "piped",
    };

    return ps(name, args, o).outputSync();
}
