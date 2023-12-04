import { get, has, set } from "../os/env.ts";
import { AnsiSettings } from "./ansi-settings.ts";
import { args, isatty, stdout } from "../ps/_base.ts";
import { blue, cyan, gray, green, magenta, red, sprintf, yellow } from "../deps.ts";
import { secretMasker } from "../secrets/masker.ts";
import { AnsiLogLevel } from "./enums.ts";

export { AnsiLogLevel, AnsiSettings };

function handleStack(stack?: string) {
    stack = stack ?? "";
    const index = stack.indexOf("\n");
    if (index === -1) {
        return stack;
    }

    return stack.substring(index + 1);
}

export function handleArguments(args: IArguments) {
    let msg: string | undefined = undefined;
    let stack: string | undefined = undefined;

    switch (args.length) {
        case 0:
            return { msg, stack };
        case 1: {
            if (args[0] instanceof Exception) {
                const e = args[0] as Error;
                msg = e.message;
                stack = handleStack(e.stack);
            } else {
                msg = args[0] as string;
            }

            return { msg, stack };
        }

        case 2: {
            if (args[0] instanceof Exception) {
                const e = args[0] as Error;
                const message = args[1] as string;
                msg = message;
                stack = handleStack(e.stack);
            } else {
                const message = args[0] as string;
                const splat = Array.from(args).slice(1);
                msg = sprintf(message, ...splat);
            }
            return { msg, stack };
        }

        default: {
            if (args[0] instanceof Exception) {
                const e = args[0] as Error;
                const message = args[1] as string;
                const splat = Array.from(args).slice(2);
                msg = sprintf(message, ...splat);
                stack = handleStack(e.stack);
            } else {
                const message = args[0] as string;
                const splat = Array.from(args).slice(1);
                msg = sprintf(message, ...splat);
            }

            return { msg, stack };
        }
    }
}

export interface IAnsiWriter {
    readonly interactive: boolean;

    readonly settings: AnsiSettings;

    enabled(level: AnsiLogLevel): boolean;

    startGroup(name: string): IAnsiWriter;

    endGroup(): IAnsiWriter;

    success(message: string, ...args: unknown[]): IAnsiWriter;

    progress(name: string, value: number): IAnsiWriter;

    command(message: string, ...args: unknown[]): IAnsiWriter;

    debug(message: string, ...args: unknown[]): IAnsiWriter;

    trace(message: string, ...args: unknown[]): IAnsiWriter;

    info(message: string, ...args: unknown[]): IAnsiWriter;

    error(e: Error, message?: string, ...args: unknown[]): IAnsiWriter;
    error(message: string, ...args: unknown[]): IAnsiWriter;

    warn(e: Error, message?: string, ...args: unknown[]): IAnsiWriter;
    warn(message: string, ...args: unknown[]): IAnsiWriter;

    write(message?: string, ...args: unknown[]): IAnsiWriter;

    writeLine(message?: string, ...args: unknown[]): IAnsiWriter;

    exportVariable(name: string, value: string, secret: boolean): IAnsiWriter;
}

export class AnsiWriter implements IAnsiWriter {
    #interactive?: boolean;
    #level: AnsiLogLevel;

    constructor(level?: AnsiLogLevel) {
        this.#level = level ?? AnsiLogLevel.Debug;
    }

    get level(): AnsiLogLevel {
        return this.#level;
    }

    set level(value: AnsiLogLevel) {
        this.#level = value;
    }

    enabled(level: AnsiLogLevel): boolean {
        return this.#level >= level;
    }

    get interactive(): boolean {
        if (this.#interactive !== undefined) {
            return this.#interactive;
        }

        if (get("CI") === "true") {
            this.#interactive = false;
            return false;
        }

        const isCi = [
            "CI",
            "GITHUB_ACTIONS",
            "GITLAB_CI",
            "CIRCLECI",
            "BITBUCKET_BUILD_NUMBER",
            "TF_BUILD",
            "JENKINS_URL",
        ].some((o) => has(o));

        if (isCi) {
            this.#interactive = false;
            return false;
        }

        if (get("DEBIAN_FRONTEND") === "noninteractive") {
            this.#interactive = false;
        }

        if (args.includes("-NonInteractive") || args.includes("--non-interactive")) {
            this.#interactive = false;
        }

        this.#interactive = isatty(stdout.rid);
        return this.#interactive;
    }

    get settings(): AnsiSettings {
        return AnsiSettings.current;
    }

    progress(name: string, value: number): IAnsiWriter {
        this.write(`${name}: ${value.toString().padStart(2)}% \r`);
        return this;
    }

    command(message: string, args: unknown[]): IAnsiWriter {
        if (this.#level < AnsiLogLevel.Warning) {
            return this;
        }
        const splat = secretMasker.mask(args.join(" "));
        const fmt = `$ ${message} ${splat}`;
        if (this.settings.mode > 0) {
            this.writeLine(cyan(fmt));
            return this;
        }

        this.writeLine(fmt);
        return this;
    }

    exportVariable(name: string, value: string, secret = false): IAnsiWriter {
        set(name, value, secret);
        return this;
    }

    trace(message: string, ...args: unknown[]): IAnsiWriter {
        if (this.#level > AnsiLogLevel.Debug) {
            return this;
        }

        const fmt = `TRC: ${args.length > 0 ? sprintf(message, ...args) : message}`;

        if (this.settings.mode > 0) {
            this.writeLine(gray(fmt));
            return this;
        }

        this.writeLine(fmt);
        return this;
    }

    debug(message: string, ...args: unknown[]): IAnsiWriter {
        if (this.#level < AnsiLogLevel.Debug) {
            return this;
        }

        const fmt = `DBG: ${args.length > 0 ? sprintf(message, ...args) : message}`;

        if (this.settings.stdout) {
            this.writeLine(gray(fmt));
            return this;
        }

        this.writeLine(fmt);
        return this;
    }

    warn(e: Error, message?: string, ...args: unknown[]): IAnsiWriter;
    warn(message: string, ...args: unknown[]): IAnsiWriter;
    warn(): IAnsiWriter {
        if (this.#level < AnsiLogLevel.Warning) {
            return this;
        }

        const { msg, stack } = handleArguments(arguments);
        const fmt = `WRN: ${msg}`;

        if (this.settings.stdout) {
            this.writeLine(yellow(fmt));
            if (stack) {
                this.writeLine(yellow(stack));
            }
            return this;
        }

        this.writeLine(fmt);
        if (stack) {
            this.writeLine(stack);
        }

        return this;
    }

    error(e: Error, message?: string, ...args: unknown[]): IAnsiWriter;
    error(message: string, ...args: unknown[]): IAnsiWriter;
    error(): IAnsiWriter {
        if (this.#level < AnsiLogLevel.Error) {
            return this;
        }

        const { msg, stack } = handleArguments(arguments);
        const fmt = `ERR: ${msg}`;

        if (this.settings.stdout) {
            this.writeLine(red(fmt));
            if (stack) {
                this.writeLine(red(stack));
            }
            return this;
        }

        this.writeLine(fmt);
        if (stack) {
            this.writeLine(stack);
        }

        return this;
    }

    success(message: string, ...args: unknown[]): IAnsiWriter {
        switch (arguments.length) {
            case 0:
                return this;

            case 1:
                {
                    if (this.settings.stdout) {
                        this.writeLine(green(`${message}`));
                    } else {
                        this.writeLine(`${message}`);
                    }
                }
                return this;

            default: {
                if (this.settings.stdout) {
                    this.writeLine(green(`${sprintf(message, ...args)}`));
                } else {
                    this.writeLine(`${sprintf(message, ...args)}`);
                }

                return this;
            }
        }
    }

    info(message: string, ...args: unknown[]): IAnsiWriter {
        if (this.#level < AnsiLogLevel.Information) {
            return this;
        }
        const fmt = `INF: ${args.length > 0 ? sprintf(message, ...args) : message}`;

        if (this.settings.stdout) {
            this.writeLine(blue(fmt));
            return this;
        }

        this.writeLine(fmt);
        return this;
    }

    write(message?: string, ...args: unknown[]): IAnsiWriter {
        if (message === undefined) {
            return this;
        }

        switch (arguments.length) {
            case 0:
                return this;

            case 1:
                stdout.writeSync(new TextEncoder().encode(message));
                break;

            default:
                {
                    const formatted = sprintf(message, ...args);
                    stdout.writeSync(new TextEncoder().encode(formatted));
                }

                break;
        }

        return this;
    }

    writeLine(message?: string, ...args: unknown[]): IAnsiWriter {
        switch (arguments.length) {
            case 0:
                stdout.writeSync(new TextEncoder().encode("\n"));
                break;

            case 1:
                stdout.writeSync(new TextEncoder().encode(`${message}\n`));
                break;

            default:
                {
                    const formatted = sprintf(`${message}\n`, ...args);
                    stdout.writeSync(new TextEncoder().encode(formatted));
                }

                break;
        }

        return this;
    }

    startGroup(name: string): IAnsiWriter {
        if (this.settings.stdout) {
            this.writeLine(magenta(`> ${name}`));
        } else {
            this.writeLine(`> ${name}`);
        }

        return this;
    }

    endGroup(): IAnsiWriter {
        this.writeLine();
        return this;
    }
}

export const ansiWriter = new AnsiWriter();
