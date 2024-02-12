import { IChildProcess, IPipe, IPipeFactory, IPsCommand, IPsOutput, IPsStartInfo, Signal } from "./types.ts";
import { PsOutput } from "./ps-output.ts";
import { ProcessError } from "../errors/mod.ts";
import { pipeInput } from "./utils.ts";
import { tryReadLines } from "../io/read-lines.ts";

export class ChildProcess implements IChildProcess {
    #piped: boolean;
    #start: Date;
    #closed: boolean;
    constructor(
        private readonly process: Deno.ChildProcess,
        private readonly si: IPsStartInfo,
        private readonly pipeFactory: IPipeFactory,
        start?: Date,
    ) {
        this.#closed = false;
        this.#piped = false;
        this.#start = start ?? new Date();
    }

    get pid() {
        return this.process.pid;
    }

    get file() {
        return this.si.file;
    }

    get args() {
        return this.si.args;
    }

    get status() {
        return this.process.status;
    }

    get stdin() {
        return this.process.stdin;
    }

    get stdout() {
        return this.process.stdout;
    }

    get stderr() {
        return this.process.stderr;
    }

    pipe(next: IChildProcess | IPsCommand): IPipe {
        this.#piped = true;
        return this.pipeFactory.create(this).pipe(next);
    }

    lines(): AsyncIterable<string> {
        if (this.#piped) {
            throw new ProcessError(this.si.file.toString(), -1, "Cannot call lines on a piped process");
        }

        if (this.#closed) {
            throw new ProcessError(this.si.file.toString(), -1, "Process already closed");
        }

        this.#closed = true;

        const setup = async () => {
            if (this.si.input && this.si.stdin === "piped" && !this.process.stdin.locked) {
                await pipeInput(this.si.input, this);
                await this.process.stdin.close();
            } else if (this.si.stdin === "piped" && !this.process.stdin.locked) {
                await this.process.stdin.close();
            }

            if (this.si.stderr === "piped") {
                await this.process.stderr.cancel();
            }
        };

        const reader = this.process.stdout.getReader();

        return tryReadLines(reader, setup, async () => {
            await reader.closed;
            reader.releaseLock();
            await this.process.status;
        });
    }

    async json() {
        if (this.#piped) {
            throw new ProcessError(this.si.file.toString(), -1, "Cannot call json on a piped process");
        }

        if (this.#closed) {
            throw new ProcessError(this.si.file.toString(), -1, "Process already closed");
        }

        this.#closed = true;
        if (this.si.input && this.si.stdin === "piped" && !this.process.stdin.locked) {
            await pipeInput(this.si.input, this);
            await this.process.stdin.close();
        } else if (this.si.stdin === "piped" && !this.process.stdin.locked) {
            await this.process.stdin.close();
        }

        const rsp = new Response(this.process.stdout);
        const json = await rsp.json();
        if (this.si.stderr === "piped") {
            await this.process.stderr.cancel();
        }

        const _ = await this.process.status;
        return json;
    }

    async blob() {
        if (this.#piped) {
            throw new ProcessError(this.si.file.toString(), -1, "Cannot call blob on a piped process");
        }

        if (this.#closed) {
            throw new ProcessError(this.si.file.toString(), -1, "Process already closed");
        }

        this.#closed = true;
        if (this.si.input && this.si.stdin === "piped" && !this.process.stdin.locked) {
            await pipeInput(this.si.input, this);
            await this.process.stdin.close();
        } else if (this.si.stdin === "piped" && !this.process.stdin.locked) {
            await this.process.stdin.close();
        }

        const rsp = new Response(this.process.stdout);
        const blob = await rsp.blob();
        if (this.si.stderr === "piped") {
            await this.process.stderr.cancel();
        }

        const _ = await this.process.status;
        return blob;
    }

    async arrayBuffer() {
        if (this.#piped) {
            throw new ProcessError(this.si.file.toString(), -1, "Cannot call arrayBuffer on a piped process");
        }

        if (this.#closed) {
            throw new ProcessError(this.si.file.toString(), -1, "Process already closed");
        }

        this.#closed = true;
        if (this.si.input && this.si.stdin === "piped" && !this.process.stdin.locked) {
            await pipeInput(this.si.input, this);
            await this.process.stdin.close();
        } else if (this.si.stdin === "piped" && !this.process.stdin.locked) {
            await this.process.stdin.close();
        }

        const rsp = new Response(this.process.stdout);
        const buffer = await rsp.arrayBuffer();
        if (this.si.stderr === "piped") {
            await this.process.stderr.cancel();
        }

        const _ = await this.process.status;
        return buffer;
    }

    async text() {
        if (this.#piped) {
            throw new ProcessError(this.si.file.toString(), -1, "Cannot call text on a piped process");
        }

        if (this.#closed) {
            throw new ProcessError(this.si.file.toString(), -1, "Process already closed");
        }

        this.#closed = true;
        if (this.si.input && this.si.stdin === "piped" && !this.process.stdin.locked) {
            await pipeInput(this.si.input, this.process);
            await this.process.stdin.close();
        } else if (this.si.stdin === "piped" && !this.process.stdin.locked) {
            await this.process.stdin.close();
        }

        const rsp = new Response(this.process.stdout);
        const text = await rsp.text();
        if (this.si.stderr === "piped") {
            await this.process.stderr.cancel();
        }

        const _ = await this.process.status;
        return text;
    }

    async output(): Promise<IPsOutput> {
        if (this.#closed) {
            throw new ProcessError(this.si.file.toString(), -1, "Process already closed");
        }

        this.#closed = true;
        const child = this.process;
        if (!this.#piped && this.si.input && !child.stdin.locked) {
            const input = this.si.input;
            await pipeInput(input, this.process);
        }

        const result = await this.process.output();
        const output = new PsOutput({
            file: this.si.file,
            args: this.si.args,
            stdout: this.si.stdout === "piped" ? result.stdout : new Uint8Array(),
            stderr: this.si.stderr === "piped" ? result.stderr : new Uint8Array(),
            code: result.code,
            signal: result.signal as Signal,
            start: this.#start,
            end: new Date(),
        });

        return output;
    }

    kill(signal?: Signal) {
        this.process.kill(signal);
    }

    ref() {
        this.process.ref();
    }

    unref() {
        this.process.unref();
    }
}
