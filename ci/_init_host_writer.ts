export * from "./constants.ts";
import { get, set } from "../os/env.ts";
import { AnsiLogLevel, ansiWriter, handleArguments, IAnsiWriter } from "../fmt/ansi-writer.ts";
import { isGithub, isTfBuild } from "./constants.ts";
import { writeTextFileSync } from "../fs/fs.ts";
import { sprintf } from "../deps.ts";

// TODO: parse stack trace and apply to line and column for warning and error
if (isTfBuild) {
    ansiWriter.startGroup = function (name: string): IAnsiWriter {
        this.writeLine(`##[group]${name}`);
        return this;
    };

    ansiWriter.endGroup = function (): IAnsiWriter {
        this.writeLine("##[endgroup]");
        return this;
    };

    ansiWriter.exportVariable = function (name: string, value: string, secret?: boolean): IAnsiWriter {
        set(name, value, secret ?? false);
        if (secret) {
            this.writeLine(`##[setVariable variable=${name};isSecret=true]${value}`);
            return this;
        }

        this.writeLine(`##[setVariable variable=${name}]${value}`);
        return this;
    };

    ansiWriter.warn = function (): IAnsiWriter {
        if (this.level < AnsiLogLevel.Warning) {
            return this;
        }

        const { msg, stack } = handleArguments(arguments);
        this.writeLine(`##[warning]${msg}`);
        if (stack) {
            this.writeLine(stack);
        }

        return this;
    };

    ansiWriter.error = function (): IAnsiWriter {
        if (this.level < AnsiLogLevel.Error) {
            return this;
        }

        const { msg, stack } = handleArguments(arguments);
        this.writeLine(`##[error]${msg}`);
        if (stack) {
            this.writeLine(stack);
        }

        return this;
    };

    ansiWriter.debug = function (message: string, ...args: unknown[]): IAnsiWriter {
        if (this.level < AnsiLogLevel.Debug) {
            return this;
        }

        if (args?.length > 0) {
            message = sprintf(message, ...args);
        }
        this.writeLine(`##[debug]${message}`);
        return this;
    };

    ansiWriter.command = function (command: string, args?: unknown[]): IAnsiWriter {
        if (this.level < AnsiLogLevel.Warning) {
            return this;
        }

        this.writeLine(`##[command]${command} ${args?.join(" ")}`);
        return this;
    };
}

if (isGithub) {
    ansiWriter.startGroup = function (name: string): IAnsiWriter {
        this.writeLine(`::group::${name}`);
        return this;
    };

    ansiWriter.endGroup = function (): IAnsiWriter {
        this.writeLine(`::endgroup::`);
        return this;
    };

    ansiWriter.exportVariable = function (name: string, value: string, secret?: boolean): IAnsiWriter {
        set(name, value, secret ?? false);
        if (secret) {
            this.writeLine(`::add-mask::${value}`);
            return this;
        }

        const file = get("GITHUB_ENV");
        if (file) {
            if (value.includes("\n")) {
                writeTextFileSync(file, `${name}<<EOF\n${value}\nEOF\n`, { append: true });
            } else {
                writeTextFileSync(file, `${name}=\"${value}\"\n`, { append: true });
            }
        }

        return this;
    };

    ansiWriter.warn = function (): IAnsiWriter {
        if (this.level < AnsiLogLevel.Warning) {
            return this;
        }

        const { msg, stack } = handleArguments(arguments);
        this.writeLine(`::warning::${msg}`);
        if (stack) {
            this.writeLine(`::warning::${stack}`);
        }

        return this;
    };

    ansiWriter.error = function (): IAnsiWriter {
        if (this.level < AnsiLogLevel.Error) {
            return this;
        }

        const { msg, stack } = handleArguments(arguments);
        this.writeLine(`::error::${msg}`);
        if (stack) {
            this.writeLine(`::error::${stack}`);
        }

        return this;
    };
}

export { ansiWriter };
