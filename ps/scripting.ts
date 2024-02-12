import {
    chdir,
    cwd,
    ExecArgs,
    exit,
    IExecOptions,
    IExecSyncOptions,
    IPsOutput,
    isatty,
    ISplatOptions,
    Ps,
    ps as create,
    quietRun,
    quietRunSync,
    run,
    runSync,
    splat,
    stderr,
    stdin,
    stdout,
    which,
    whichSync,
} from "./mod.ts";
import { isProcessElevated } from "../os/os.ts";

export interface IProcess {
    readonly isElevated: boolean;

    /**
     * Gets or sets the current working directory of the process.
     */
    cwd: string;

    /**
     * Gets the arguments of the process.
     */
    readonly args: string[];

    /**
     * Gets the standard input stream.
     */
    readonly stdin: typeof stdin;

    /**
     * Gets the standard output stream.
     */
    readonly stdout: typeof stdout;

    /**
     * Gets the standard error stream.
     */
    readonly stderr: typeof stderr;

    create(exec: string, args?: ExecArgs, options?: IExecOptions): Ps;

    quietRun(
        exe: string,
        args?: ExecArgs,
        options?: Omit<IExecOptions, "stdout" | "stderr">,
    ): Promise<IPsOutput>;

    quietRunSync(
        exe: string,
        args?: ExecArgs,
        options?: Omit<IExecSyncOptions, "stdout" | "stderr">,
    ): IPsOutput;

    run(
        exec: string,
        args?: ExecArgs,
        options?: Omit<IExecOptions, "stdout" | "stderr">,
    ): Promise<IPsOutput>;

    runSync(exec: string, args?: ExecArgs, options?: Omit<IExecSyncOptions, "stdout" | "stderr">): IPsOutput;

    isatty(rid: number): boolean;

    push(path: string): void;

    pop(): void;

    exit(code?: number): void;

    splat(object: Record<string, unknown>, options?: ISplatOptions): string[];

    which(exec: string): Promise<string | undefined>;

    whichSync(exec: string): string | undefined;
}

const defaultCwd = (function () {
    try {
        return cwd();
    } catch {
        return "";
    }
})();
const cwdHistory: string[] = [];

let a: string[] = [];
try {
    if (Deno.permissions.querySync({ name: "read" }).state === "granted") {
        cwdHistory.push(cwd());
        a = Deno.args;
    }
} catch (e) {
    console.log(e);
    // do nothing
}

export const ps: IProcess = {
    args: a,
    /**
     * Gets or sets the current working directory of the process.
     */
    cwd: "",
    stdin: Deno.stdin,
    stdout: Deno.stdout,
    stderr: Deno.stderr,
    isElevated: isProcessElevated(),
    push(path: string) {
        cwdHistory.push(cwd());
        chdir(path);
    },
    pop() {
        const last = cwdHistory.pop() || defaultCwd;
        chdir(last);
        return last;
    },
    create,
    quietRun,
    quietRunSync,
    isatty,
    run,
    runSync,
    exit,
    which,
    whichSync,
    splat,
};

Reflect.defineProperty(ps, "cwd", {
    get: () => cwd(),
    set: (value: string) => chdir(value),
    enumerable: true,
    configurable: true,
});
