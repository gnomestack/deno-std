import {
    args,
    capture,
    captureSync,
    chdir,
    cwd,
    exec,
    ExecArgs,
    execSync,
    exit,
    IExecOptions,
    IExecSyncOptions,
    isatty,
    ISplatOptions,
    Ps,
    ps as create,
    PsOutput,
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

    capture(exe: string, args?: ExecArgs, options?: Omit<IExecOptions, "stdout" | "stderr">): Promise<PsOutput>;

    captureSync(exe: string, args?: ExecArgs, options?: Omit<IExecSyncOptions, "stdout" | "stderr">): PsOutput;

    exec(exec: string, args?: ExecArgs, options?: IExecOptions): Promise<PsOutput>;

    execSync(exec: string, args?: ExecArgs, options?: IExecSyncOptions): PsOutput;

    isatty(rid: number): boolean;

    push(path: string): void;

    pop(): void;

    exit(code?: number): void;

    splat(object: Record<string, unknown>, options?: ISplatOptions): string[];

    which(exec: string): Promise<string | undefined>;

    whichSync(exec: string): string | undefined;
}

const defaultCwd = cwd();
const cwdHistory: string[] = [];

export const ps: IProcess = {
    args: args,
    /**
     * Gets or sets the current working directory of the process.
     */
    cwd: "",
    stdin,
    stdout,
    stderr,
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
    capture,
    captureSync,
    isatty,
    exec,
    execSync,
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
