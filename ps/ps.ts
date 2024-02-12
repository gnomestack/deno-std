import { OptionError, NotFoundOnPathError } from "../errors/mod.ts";
import {
    ExecArgs,
    IChildProcess,
    IExecOptions,
    IPipe,
    IPsCommand,
    IPsOutput,
    IPsPostHook,
    IPsPreHook,
    IPsStartInfo,
    Signal,
    StdInput,
    Stdio,
} from "./types.ts";
import { normalizeExecArgs } from "./utils.ts";
import { PsOutput } from "./ps-output.ts";
import { createPipeFactory } from "./pipe.ts";
import { ChildProcess } from "./child-process.ts";
import { findExe, findExeSync } from "./registry.ts";
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

    protected get startInfo() {
        return this.#startInfo;
    }

    /**
     * Thenable method that allows the Ps object to be used as a promise which calls the `output` method.
     * It is not recommended to use this method directly. Instead, use the `output` method.
     * 
     * @example
     * ```ts
     * const result = await ps("echo", "hello world", { stdout: 'piped' });
     * console.log(result.code);
     * console.log(result.stdoutText);
     * ```
     */
    then<TResult1 = IPsOutput, TResult2 = never>(
        onfulfilled?: ((value: IPsOutput) => TResult1 | PromiseLike<TResult1>) | null | undefined, 
        // deno-lint-ignore no-explicit-any
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
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
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
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
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
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
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
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
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
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
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
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
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

    /**
     * Creates a child process and returns the `IChildProcess` object. The `IChildProcess` object can be used to
     * interact with the process such as reading and writing to the standard input, output, and error streams.
     * 
     * @description
     * Spawn is a low-level method that is used to create a child process. It is recommended to use the `output` or `outputSync`
     * or the methods like `text`, `json`, `blob`, `arrayBuffer`, `lines`, or `quiet` to execute the process. You should only use 
     * methods unless you have direct need to interact with standard input, output, and error streams or need to call `ref` or
     * `unref` on the process.
     * 
     * The method calls `findExeSync` to find the executable on the path. If the executable is not found, then a `NotFoundOnPathError` is thrown.
     * 
     * @returns `IChildProcess` object.
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
     * @example 
     * ```ts
     * const child = ps("echo").stdin('piped').stdout('piped').spawn();
     * child.ref();
     * const writer = child.stdin.getWriter();
     * writer.write(new TextEncoder().encode("hello world"));
     * writer.close();
     * writer.releaseLock();
     * const reader = child.stdout.getReader();
     * const { done, value } = await reader.read();
     * console.log(new TextDecoder().decode(value));
     * reader.releaseLock();
     * child.unref();
     * ```
     */
    spawn() {
        if (this.#child) {
            return this.#child;
        }

        if (preCallHooks.length > 0) {
            preCallHooks.forEach((hook) => {
                hook(this.#startInfo);
            });
        }

        const path = findExeSync(this.#startInfo.file);
        if (!path) {
            throw new NotFoundOnPathError(path);
        }

        const start = new Date();
        const cmd = new Deno.Command(path, this.#startInfo);
        return new ChildProcess(cmd.spawn(), this.#startInfo, pipeFactory, start);
    }

    /**
     * Executes the process and returns the standard output and error streams as a `Uint8Array` using the `IPsOutput` object which
     * includes the code and signal of the process.
     * 
     * @description
     * The output method can handle setting data to the stdin stream using the input method or input property on startInfo.
     * `findExe` is called to find the executable on the path. If the executable is not found, then a `NotFoundOnPathError` is thrown.
     * 
     * @returns a promise that resolves to a `PsOutput` object.
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
     * @example
     * ```ts
     * const result = ps("echo", "hello world").stdout('piped').outputSync();
     * console.log(result.code);
     * console.log(result.stdoutText);
     * ```
     */
    async output() {
       
        if (preCallHooks.length > 0) {
            preCallHooks.forEach((hook) => {
                hook(this.#startInfo);
            });
        }

        const path = await findExe(this.#startInfo.file);
        if (!path) {
            throw new NotFoundOnPathError(path);
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

    /**
     * Executes the process and returns the standard output and error streams as a `Uint8Array` using the `IPsOutput` object which
     * includes the code and signal of the process.
     * 
     * @description
     * The output method can **not** handle setting data to the stdin stream using the input method or input property on startInfo. This
     * limitation exists because the stdin uses is a WriteableStream which only works in an async context. 
     * `findExeSync` is called to find the executable on the path. If the executable is not found, then a `NotFoundOnPathError` is thrown.
     * 
     * @returns a `PsOutput` object.
     * @throws NotFoundOnPathError - thrown if the executable is not found on the path.
     * @example
     * ```ts
     * const result = ps("echo", "hello world", { stdout: 'piped' }).outputSync();
     * console.log(result.code);
     * console.log(result.stdoutText);
     * ```
     */
    outputSync() {
       

        if (preCallHooks.length > 0) {
            preCallHooks.forEach((hook) => {
                hook(this.#startInfo);
            });
        }

        const path = findExeSync(this.#startInfo.file);
        if (!path) {
            throw new NotFoundOnPathError(path);
        }

        const cmd = new Deno.Command(path, this.#startInfo);
        const result = cmd.outputSync();
        const date = new Date();
        const output = new PsOutput({
            file: path,
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

/**
 * Creates a new `Ps` object and returns it. The `Ps` object can be used to run an executable and interact with the standard input, output, and error streams.
 * 
 * @description
 * The function is a convenience function that creates a new `Ps` object and defaults the streams to 'inherit' if they are not set as
 * part of the options. The `normalizeExecArgs` is called to convert the args to a `string[]` if they are not already an array.
 * 
 * @param name The file name or name of the executable to run.
 * @param args The arguments to pass to the executable. Can be `string[]`, `string`, or `Record<string, unknown>`.
 * @param options The options to use when running the executable such as setting the cwd or env variables.
 * @returns a new `Ps` object.
 */
export function ps(name: string | URL, args?: ExecArgs, options?: IExecOptions) {
    const a = normalizeExecArgs(args, options?.splat);

    const si: IPsStartInfo = {
        ...options,
        file: name,
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