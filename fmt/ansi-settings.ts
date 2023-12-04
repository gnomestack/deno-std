import { Lazy } from "../primitives/lazy.ts";
import { isatty } from "../ps/_base.ts";
import { detectMode } from "./ansi-detector.ts";
import { AnsiMode } from "./enums.ts";

let settings = new Lazy<AnsiSettings>(() => new AnsiSettings(detectMode()));

export class AnsiSettings {
    #mode: AnsiMode;
    #links: boolean;

    constructor(mode: AnsiMode) {
        this.#mode = mode;
        this.#links = this.#mode === AnsiMode.TwentyFourBit;
    }

    static get current(): AnsiSettings {
        return settings.value;
    }

    static set current(value: AnsiSettings) {
        settings = new Lazy<AnsiSettings>(() => value);
    }

    get stdout(): boolean {
        return this.#mode > 0 && !isatty(Deno.stdout.rid);
    }

    get stderr(): boolean {
        return this.#mode > 0 && !isatty(Deno.stderr.rid);
    }

    get mode(): AnsiMode {
        return this.#mode;
    }

    set mode(value: AnsiMode) {
        this.#mode = value;
    }

    get links(): boolean {
        return this.#links;
    }

    set links(value: boolean) {
        this.#links = value;
    }
}
