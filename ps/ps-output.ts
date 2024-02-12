import { ProcessError } from "../errors/mod.ts";
import { IPsOutput, IPsOutputArgs, Signal } from "./types.ts";

export class PsOutput implements IPsOutput {
    #stdout: Uint8Array;
    #stderr: Uint8Array;
    #code: number;
    #signal?: Signal;
    #stdoutString?: string;
    #stderrString?: string;
    #stdoutLines?: string[];
    #stderrLines?: string[];
    #split?: string;
    #file: string | URL;
    #args?: string[];
    #start: Date;
    #end: Date;

    constructor(data: IPsOutputArgs) {
        this.#end = new Date();
        this.#start = data.start;
        this.#file = data.file;
        this.#stderr = data.stderr ?? new Uint8Array();
        this.#stdout = data.stdout ?? new Uint8Array();
        this.#args = data.args;
        this.#code = data.code;
        this.#signal = data.signal;
    }

    set split(value: string) {
        this.split = value;
    }

    get file() {
        return this.#file;
    }

    get args() {
        return this.#args;
    }

    get start() {
        return this.#start;
    }

    get end() {
        return this.#end;
    }

    get code() {
        return this.#code;
    }

    get signal() {
        return this.#signal as Signal;
    }

    get stdout() {
        return this.#stdout;
    }

    get stdoutText() {
        if (this.#stdoutString) {
            return this.#stdoutString;
        }

        if (this.#stdout.length) {
            this.#stdoutString = new TextDecoder().decode(this.#stdout);
        } else {
            this.#stdoutString = "";
        }

        return this.#stdoutString;
    }

    get stderr() {
        return this.#stderr;
    }

    get stderrText() {
        if (this.#stderrString) {
            return this.#stderrString;
        }

        if (this.#stderr.length) {
            this.#stderrString = new TextDecoder().decode(this.#stderr);
        } else {
            this.#stderrString = "";
        }

        return this.#stderrString;
    }

    get stdoutLines() {
        if (this.#stdoutLines) {
            return this.#stdoutLines;
        }

        if (this.stdout.length) {
            this.#stdoutLines = this.stdoutText.split(/\r\n|\n/);
            return this.#stdoutLines;
        }

        this.#stdoutLines = [];
        return this.#stdoutLines;
    }

    get stderrLines() {
        if (this.#stderrLines) {
            return this.#stderrLines;
        }

        if (this.stderr.length) {
            return this.#stderrLines = this.stderrText.split(/\r\n|\n/);
        }

        this.#stderrLines = [];
        return this.#stderrLines;
    }

    success(validate?: (code: number) => boolean) {
        if (!validate) {
            return this.code === 0;
        }

        return validate(this.code);
    }

    throwOrContinue(validate?: (code: number) => boolean): IPsOutput {
        if ((validate && !validate(this.code)) || this.code !== 0) {
            throw new ProcessError(
                `Process failed with code ${this.code} and signal ${this.signal}`,
            );
        }

        return this;
    }

    toString() {
        return this.stdoutText;
    }
}
