import { OptionError, NotFoundOnPathError, ArgumentError, ProcessError } from "../errors/mod.ts";
import { readLines } from "../io/read-lines.ts";
import {
    ExecArgs,
    IChildProcess,
    IExecOptions,
    IExecSyncOptions,
    IPipe,
    IPsCommand,
    IPsOutput,
    IPsOutputArgs,
    IPsPostHook,
    IPsPreHook,
    IPsStartInfo,
    ISplatOptions,
    Signal,
    StdInput,
    Stdio,
} from "./types.ts";
import { findExe, findExeSync } from "./registry.ts";
import { splat } from "./splat.ts";
import { splitArguments } from "./split_arguments.ts";
import { PsOutput } from "./ps-output.ts";
import { createPipeFactory } from "./pipe.ts";
import { ChildProcess } from "./child-process.ts";
export type { IChildProcess, IPsStartInfo, Signal };
export { PsOutput };


export const preCallHooks: IPsPreHook[] = [];
export const postCallHooks: IPsPostHook[] = [];

export type OutputKind = "text" | "buffer" | "lines" | 'default' | 'json';

export class Ps implements IPsCommand , PromiseLike<IPsOutput> {
    #startInfo: IPsStartInfo;
    #child?: IChildProcess;
    #kind: OutputKind = 'default';
    #validate?: (code: number) => boolean;

    constructor(startInfo?: IPsStartInfo) {
        this.#startInfo = startInfo ??
            { file: "", stdout: "piped", stderr: "piped" };
        if (!this.#startInfo.stdout) {
            this.#startInfo.stdout = "piped";
        }

        if (!this.#startInfo.stderr) {
            this.#startInfo.stderr = "piped";
        }
    }

    then<TResult1 = IPsOutput, TResult2 = never>(
        onfulfilled?: ((value: IPsOutput) => TResult1 | PromiseLike<TResult1>) | null | undefined, 
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
        return this.output().then(onfulfilled, onrejected)
    }

    /**
     * Sets the filepath to the executable to run.
     * @param file Sets the file to run.
     * @returns self
     */
    file(file: string | URL) {
        this.#startInfo.file = file;
        return this;
    }

    /**
     * Sets the environment variables for the executable.
     * @param env The environment variables to set for the executable.
     * @returns self.
     */
    env(env: Record<string, string>) {
        if (this.#startInfo.env == undefined) {
            this.#startInfo.env = env;
            return this;
        }

        for (const key in env) {
            this.#startInfo.env[key] = env[key];
        }

        return this;
    }

    /**
     * Sets the current working directory for the executable.
     * @param cwd The current working directory for the executable.
     * @returns self.
     */
    cwd(cwd: string  | undefined) {
        this.#startInfo.cwd = cwd;
        return this;
    }

    /**
     * Sets the arguments to pass to the executable.
     * @param args The args to pass to the executable. Can be `string[]`, `string`, or `Record<string, unknown>`.
     * @returns self
     */
    args(args?: ExecArgs) {
        this.#startInfo.args = normalizeExecArgs(args);
        return this;
    }

    /**
     * Sets data to be written to the standard input stream.
     * @param input The input to copy to the standard input stream.
     * @returns self.
     */
    input(input?: StdInput) {
        this.#startInfo.input = input;
        this.#startInfo.stdin = "piped";
        return this;
    }

    /**
     * Sets the Stdio modifier for standard input stream. e.g. 'inherit', 'piped', or 'null'.
     * @param stdin The Stdio type to use. 
     * @returns self
     */
    stdin(stdin: Stdio) {
        this.#startInfo.stdin = stdin;
        return this;
    }

    /**
     * Sets the Stdio modifier for standard output stream. e.g. 'inherit', 'piped', or 'null'.
     * @param stdout The Stdio type to use.
     * @returns self
     */
    stdout(stdout: Stdio) {
        this.#startInfo.stdout = stdout;
        return this;
    }

    /**
     * Sets the Stdio modifier for standard error stream. e.g. 'inherit', 'piped', or 'null'.
     * @param stdout The Stdio type to use.
     * @returns self
     */
    stderr(stderr: Stdio) {
        this.#startInfo.stderr = stderr;
        return this;
    }

    /**
     * Pipes the output of the current process to another process. This is similar
     * to the `|` operator in Unix or the `|` operator in PowerShell. 
     * @param name The filename of the executable to run.
     * @param args The arguments to pass to the executable. Can be `string[]`, `string`, or `Record<string, unknown>`.
     * @param options The options to use when running the executable such as setting the cwd or env variables.
     * @example 
     * ```ts
     *  const result = await ps("echo", "my test")
     *      .pipe("grep", "test")
     *      .pipe("cat")
     *      .output();
     * 
     * ```
     */
    pipe(name: string, args?: ExecArgs, options?: Omit<IExecOptions, 'stdin' | 'stdout' | 'stderr'>): IPipe;
    /**
     * Pipes the output of the current process to another process. This is similar
     * to the `|` operator in Unix or the `|` operator in PowerShell.
     * @param name 
     * @param args 
     * @param options 
     * @example 
     * ```ts
     *  const result = await ps("echo", "my test")
     *      .pipe(ps("grep", "test"))
     *      .pipe(ps("cat"))
     *      .output();
     * ```
     */
    pipe(next: IChildProcess | Ps): IPipe;
    pipe(): IPipe {
        this.#startInfo.stdout = "piped";
        this.#startInfo.stderr = "inherit";

        if (arguments.length === 0) {
            throw new OptionError("Invalid arguments");
        }

        let next: IChildProcess | Ps;
        if (typeof arguments[0] === "string") {
            const args = arguments[1] as ExecArgs;
            const options = arguments[2] as IExecOptions;
            next = ps(arguments[0], args, options);
            next.stdout("piped");
        } else {
            next = arguments[0];
        }

        return pipeFactory.create(this.spawn()).pipe(next);
    }

    /**
     * Executes and returns the standard output stream as a string. The standard error stream is ignored.
     * If input is set, then the standard input stream is piped.
     * 
     * @description
     * This is a convenience method to handle passing in stdout to `Response` and calling `text()`.
     * 
     * @returns the standard output stream as a string.
     */
    text() {
        this.#startInfo.stdout = "piped";
        this.#startInfo.stderr = 'null';
        if (this.#startInfo.input !== undefined)
            this.#startInfo.stdin = "piped";

        const spawn = this.spawn();
        return spawn.text();
    }

    /**
     * Executes and returns the standard output stream as a JSON object. The standard error stream is ignored.
     * If input is set, then the standard input stream is piped.
     * 
     * @description
     * This is a convenience method to handle passing in stdout to `Response` and calling `json()`.
     * 
     * @returns json as `any`.
     */
    json() {
        this.#startInfo.stdout = "piped";
        this.#startInfo.stderr = 'null';
        if (this.#startInfo.input !== undefined)
            this.#startInfo.stdin = "piped";

        const spawn = this.spawn();
        return spawn.json();
    }

    /**
     * Executes and returns the standard output stream as a `Uint8Array`. The standard error stream is ignored.
     * If input is set, then the standard input stream is piped.
     * 
     * @description
     * This is a convenience method to handle passing in stdout to `Response` and calling `blob()`.
     * 
     * @returns a blob object.
     */
    blob() {
        this.#startInfo.stdout = "piped";
        this.#startInfo.stderr = 'null';
        if (this.#startInfo.input !== undefined)
            this.#startInfo.stdin = "piped";

        const spawn = this.spawn();
        return spawn.blob();
    }

    /**
     * Executes and returns the standard output stream as a `ArrayBuffer`. The standard error stream is ignored.
     * If input is set, then the standard input stream is piped.
     * 
     * @description
     * This is a convenience method to handle passing in stdout to `Response` and calling `arrayBuffer()`.
     * 
     * @returns an `ArrayBuffer`.
     */
    arrayBuffer() {
        this.#startInfo.stdout = "piped";
        this.#startInfo.stderr = 'null';
        if (this.#startInfo.input !== undefined)
            this.#startInfo.stdin = "piped";

        const spawn = this.spawn();
        return spawn.arrayBuffer();
    }

     /**
     * Executes and returns the standard output stream as a `AsyncIterator<string>`. The standard error stream is ignored.
     * If input is set, then the standard input stream is piped.
     * 
     * @description
     * This is a convenience method that calls `tryReadLines` on the standard output stream and handles cleanup of the stdin
     * and stderr streams.
     * 
     * @returns an `ArrayBuffer`.
     * @example 
     * ```ts
     * 
     * for await (const line of ps("echo", "hello world").lines()) {
     *    console.log(line);
     * }
     */
    lines() {
        this.#startInfo.stdout = "piped";
        this.#startInfo.stderr = 'null';
        if (this.#startInfo.input !== undefined)
            this.#startInfo.stdin = "piped";

        const spawn = this.spawn();
        return spawn.lines();
    }

    /**
     * Executes and returns the standard output and error streams as a `Uint8Array` using the `IPsOutput` object which
     * includes the code and signal of the process. The method automatically sets the `stdout` and `stderr` to `piped`.
     * If input is set, then the standard input stream is piped.
     * 
     * @returns an `IPsOutput` object.
     * @see IPsOutput
     * @see PsOutput
     * @example 
     * ```ts
     * const result = await ps("echo", "hello world").quiet();
     * console.log(result.code);
     * console.log(result.stdoutText);
     * ```
     */
    quiet() {
        this.#startInfo.stdout = 'piped'
        this.#startInfo.stderr = 'piped';
        if (this.#startInfo.input !== undefined)
            this.#startInfo.stdin = "piped";

        return this.output();
    }

    spawn() {
        if (this.#child) {
            return this.#child;
        }

        if (preCallHooks.length > 0) {
            preCallHooks.forEach((hook) => {
                hook(this.#startInfo);
            });
        }

        const start = new Date();
        const cmd = new Deno.Command(this.#startInfo.file, this.#startInfo);
        return new ChildProcess(cmd.spawn(), this.#startInfo, pipeFactory, start);
    }

    async output() {
        if (preCallHooks.length > 0) {
            preCallHooks.forEach((hook) => {
                hook(this.#startInfo);
            });
        }

        if (!this.#startInfo.input) {
            console.log("no input");
            const start = new Date();
            const cmd2 = new Deno.Command(this.#startInfo.file, this.#startInfo);
            const result = await cmd2.output();
            const output = new PsOutput({
                file: this.#startInfo.file,
                args: this.#startInfo.args,
                stdout: this.#startInfo.stdout === "piped" ? result.stdout : new Uint8Array(),
                stderr: this.#startInfo.stderr === "piped" ? result.stderr : new Uint8Array(),
                code: result.code,
                signal: result.signal as Signal,
                start: start,
            });

            if (postCallHooks.length > 0) {
                postCallHooks.forEach((hook) => {
                    hook(this.#startInfo, output);
                });
            }

            return output;
        }

        const input = this.#startInfo.input;
        this.#startInfo.stdin = "piped";
        const cmd = new Deno.Command(this.#startInfo.file, this.#startInfo);
        const start = new Date();
        const child = cmd.spawn();
        if (this.#startInfo.input && !child.stdin.locked) {

            // the following must be done in order:
            // close the writer, release the lock, close the stream.
            // if you call output, then don't call stream.close
            if (input instanceof PsOutput) {
                const writer = child.stdin.getWriter();
                await writer.write(input.stdout);
                await writer.close();
                writer.releaseLock();
            }

            if (input instanceof Uint8Array) {
                const writer = child.stdin.getWriter();
                await writer.write(input);
                await writer.close();
                writer.releaseLock();
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
            }

            if (typeof input === "string") {
                console.log("input:", "string");
                const writer = child.stdin.getWriter();
                await writer.write(new TextEncoder().encode(input));

        
                await writer.close();
                writer.releaseLock();
            }
        }
    
  
        const output = await child.output();
        await child.status;
        const psOutput = new PsOutput({
            file: this.#startInfo.file,
            args: this.#startInfo.args,
            stdout: this.#startInfo.stdout === "piped" ? output.stdout : new Uint8Array(),
            stderr: this.#startInfo.stderr === "piped" ? output.stderr : new Uint8Array(),
            code: output.code,
            signal: output.signal as Signal,
            start: start,
            end: new Date(),
        });
        

        if (postCallHooks.length > 0) {
            postCallHooks.forEach((hook) => {
                hook(this.#startInfo, psOutput);
            });
        }

        return psOutput;
    }

    outputSync() {
        if (preCallHooks.length > 0) {
            preCallHooks.forEach((hook) => {
                hook(this.#startInfo);
            });
        }

        const cmd = new Deno.Command(this.#startInfo.file, this.#startInfo);
        const result = cmd.outputSync();
        const date = new Date();
        const output = new PsOutput({
            file: this.#startInfo.file,
            args: this.#startInfo.args,
            stdout: this.#startInfo.stdout === "piped" ? result.stdout : new Uint8Array(),
            stderr: this.#startInfo.stderr === "piped" ? result.stderr : new Uint8Array(),
            code: result.code,
            signal: result.signal as Signal,
            start: date,
        });

        if (postCallHooks.length > 0) {
            postCallHooks.forEach((hook) => {
                hook(this.#startInfo, output);
            });
        }

        return output;
    }
}

export function normalizeExecArgs(
    args?: ExecArgs,
    splatOptions?: ISplatOptions,
): string[] | undefined {
    if (!args) {
        return undefined;
    }

    if (Array.isArray(args)) {
        return args;
    }

    if (typeof args === "string") {
        return splitArguments(args);
    }

    return splat(args, splatOptions);
}

export function ps(name: string | URL, args?: ExecArgs, options?: IExecOptions) {
    if (name instanceof URL) {
        name = name.toString();
    }

    const path = findExeSync(name);
    if (!path) {
        throw new NotFoundOnPathError(name);
    }

    const a = normalizeExecArgs(args, options?.splat);

    const si: IPsStartInfo = {
        ...options,
        file: path,
        args: a,
    };

    if (si.stdout === undefined) {
        si.stdout = 'inherit';
    }

    if (si.stderr === undefined) {
        si.stderr = 'inherit';
    }

    if (options?.input || si.stdin === undefined) {
        si.stdin = 'inherit';
    }

    return new Ps(si);
}

const pipeFactory = createPipeFactory(ps);