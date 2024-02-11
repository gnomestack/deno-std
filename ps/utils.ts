import { ProcessError } from "../errors/mod.ts";
import { ExecArgs, IChildProcess, ISplatOptions, StdInput } from "./types.ts";
import { dasherize, underscore } from "../text/inflections.ts";

const match = (array: unknown[], value: string) =>
    array.some((
        element,
    ) => (element instanceof RegExp ? element.test(value) : element === value));

/**
 * Converts an object to an `string[]` of command line arguments.
 * 
 * @description
 * This is a modified version of the dargs npm package.  Its useful for converting an object to an array of command line arguments
 * especially when using typescript interfaces to provide intellisense and type checking for command line arguments
 * for an executable or commands in an executable.
 * 
 * The code https://github.com/sindresorhus/dargs which is under under MIT License.
 * The original code is Copyrighted under (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 * @param object The object to convert
 * @param options The options to use
 * @returns An array of command line arguments
 * @example 
 * ```ts
 * const args = splat({ foo: "bar" });
 * console.log(args); // ["--foo", "bar"]
 * ```
 */
export function splat(
    object: Record<string, unknown>,
    options?: ISplatOptions,
) {
    const splat = [];
    let extraArguments = [];
    let separatedArguments = [];

    options = {
        shortFlag: true,
        prefix: "--",
        ...options,
    };

    const makeArguments = (key: string, value?: unknown) => {
        const prefix = options?.shortFlag && key.length === 1 ? "-" : options?.prefix;
        const theKey = options?.preserveCase ? key : dasherize(underscore(key));

        key = prefix + theKey;

        if (options?.assign) {
            splat.push(key + (value ? `${options.assign}${value}` : ""));
        } else {
            splat.push(key);

            if (value) {
                splat.push(value);
            }
        }
    };

    const makeAliasArg = (key: string, value?: unknown) => {
        splat.push(`-${key}`);

        if (value) {
            splat.push(value);
        }
    };

    let argz: unknown[] = [];
    if (object.arguments && Array.isArray(object.arguments)) {
        argz = object.arguments;
    } else if (options.arguments?.length) {
        argz.length = options.arguments.length;
    }

    if (options?.command?.length) {
        splat.push(...options.command);
    }

    for (let [key, value] of Object.entries(object)) {
        let pushArguments = makeArguments;

        if (options.arguments?.length && options.arguments.includes(key)) {
            // ensure the order of the arguments
            const index = options.arguments.indexOf(key);
            if (value) {
                argz[index] = value;
            }

            continue;
        }

        if (Array.isArray(options.excludes) && match(options.excludes, key)) {
            continue;
        }

        if (Array.isArray(options.includes) && !match(options.includes, key)) {
            continue;
        }

        if (typeof options.aliases === "object" && options.aliases[key]) {
            key = options.aliases[key];
            pushArguments = makeAliasArg;
        }

        if (key === "--") {
            if (!Array.isArray(value)) {
                throw new TypeError(
                    `Expected key \`--\` to be Array, got ${typeof value}`,
                );
            }

            separatedArguments = value;
            continue;
        }

        if (key === "_") {
            if (typeof value === "string") {
                extraArguments = [value];
                continue;
            }

            if (!Array.isArray(value)) {
                throw new TypeError(
                    `Expected key \`_\` to be Array, got ${typeof value}`,
                );
            }

            extraArguments = value;
            continue;
        }

        if (value === true && !options.ignoreTrue) {
            pushArguments(key, "");
        }

        if (value === false && !options.ignoreFalse) {
            pushArguments(`no-${key}`);
        }

        if (typeof value === "string") {
            pushArguments(key, value);
        }

        if (typeof value === "number" && !Number.isNaN(value)) {
            pushArguments(key, String(value));
        }

        if (Array.isArray(value)) {
            for (const arrayValue of value) {
                pushArguments(key, arrayValue);
            }
        }
    }

    for (const argument of extraArguments) {
        splat.unshift(String(argument));
    }

    if (separatedArguments.length > 0) {
        splat.push("--");
    }

    for (const argument of separatedArguments) {
        splat.push(String(argument));
    }

    if (argz.length) {
        const unwrapped: string[] = [];
        // ensure the order of the arguments
        for (const arg of argz) {
            if (arg) {
                if (Array.isArray(arg)) {
                    unwrapped.push(...arg.map((a) => String(a)));
                } else {
                    unwrapped.push(String(arg));
                }
            }
        }

        if (options.appendArguments) {
            splat.push(...unwrapped);
        } else {
            splat.splice(0, 0, ...unwrapped);
        }
    }

    return splat;
}

/**
 * Split a string into an array of arguments. The function will handle
 * arguments that are quoted, arguments that are separated by spaces, and multiline
 * strings that include a backslash (\\) or backtick (`) at the end of the line for cases
 * where the string uses bash or powershell multi line arguments.
 * @param value 
 * @returns a `string[]` of arguments.
 * @example
 * ```ts
 * const args0 = splitArguments("hello world");
 * console.log(args0); // ["hello", "world"]
 * 
 * const args1 = splitArguments("hello 'dog world'");
 * console.log(args1); // ["hello", "dog world"]
 * 
 * const args2 = splitArguments("hello \"cat world\"");
 * console.log(args2); // ["hello", "cat world"]
 * 
 * const myArgs = `--hello \
 * "world"`
 * const args3 = splitArguments(myArgs);
 * console.log(args3); // ["--hello", "world"]
 * ```
 */
export function splitArguments(value: string): string[] {
    enum Quote {
        None = 0,
        Single = 1,
        Double = 2,
    }

    let token = "";
    let quote = Quote.None;
    const tokens = [];

    for (let i = 0; i < value.length; i++) {
        const c = value[i];

        if (quote > Quote.None) {
            if (quote === Quote.Single && c === "'") {
                quote = Quote.None;
                tokens.push(token);
                token = "";
                continue;
            } else if (quote === Quote.Double && c === '"') {
                quote = Quote.None;
                tokens.push(token);
                token = "";
                continue;
            }

            token += c;
            continue;
        }

        if (c === " ") {
            const remaining = (value.length - 1) - i;
            if (remaining > 2) {
                // if the line ends with characters that normally allow for scripts with multiline
                // statements, consume token and skip characters.
                // ' \\\n'
                // ' \\\r\n'
                // ' `\n'
                // ' `\r\n'
                const j = value[i + 1];
                const k = value[i + 2];
                if (j === "'" || j === "`") {
                    if (k === "\n") {
                        i += 2;
                        if (token.length > 0) {
                            tokens.push(token);
                        }
                        token = "";
                        continue;
                    }

                    if (remaining > 3) {
                        const l = value[i + 3];
                        if (k === "\r" && l === "\n") {
                            i += 3;
                            if (token.length > 0) {
                                tokens.push(token);
                            }
                            token = "";
                            continue;
                        }
                    }
                }
            }

            if (token.length > 0) {
                tokens.push(token);
                token = "";
            }
            continue;
        }

        if (token.length === 0) {
            if (c === "'") {
                quote = Quote.Single;
                continue;
            }
            if (c === '"') {
                quote = Quote.Double;
                continue;
            }
        }

        token += c;
    }

    if (token.length > 0) {
        tokens.push(token);
    }

    return tokens;
}


/**
 * Normalizes arguments of the `ExecArgs` type which is 'string' | 'string[]' | Record<string, unknown> and converts
 * the arguments into an array which is what Deno, Node.js and other runtimes expect for executing a child process.
 * @param args The arguments to normalize.
 * @param splatOptions The options to use when normalizing the arguments from an object.
 * @see splat
 * @see splitArguments
 * @returns a `string[]` of normalized arguments.
 */
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

/**
 * Pipes input to a child process. The input can be a `string`, `Uint8Array`, or a `ReadableStream<Uint8Array>`.
 * If the input object is a `IChildProcess`, `Deno.ChildProcess` or `PsObject` object with a property called `stdout`
 * it will determine stdout is a `Uint8Array` or a `ReadableStream<Uint8Array>` and pipe the input to the child process.
 * 
 * The method is not meant to be called directly.  It is used internally by the `Ps` class and the `ChildProcess` class.
 * 
 * @param input The input data.
 * @param child The child process.
 * @param throwOnError If true, throws an error if the input is invalid.
 * @returns a boolean indicating if the input was piped to the child process.
 */
export async function pipeInput(input: StdInput, child: IChildProcess | Deno.ChildProcess, throwOnError?: boolean) {
    if (input && !child.stdin.locked) {
        if (typeof input === 'object' && 'stdout' in input) {
            const stdout = input.stdout;
            if (stdout instanceof Uint8Array) {
                input = input.stdout;
            } else if (input.stdout instanceof ReadableStream) {
                input = input.stdout;
            }
        }

        if (input instanceof Uint8Array) {
            const writer = child.stdin.getWriter();
            await writer.write(input);
            await writer.close();
            writer.releaseLock();
            return true;
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
            return true;
        }

        if (typeof input === "string") {
            const writer = child.stdin.getWriter();
            await writer.write(new TextEncoder().encode(input));
            await writer.close();
            writer.releaseLock();
            return true;
        }

        if (throwOnError) {
            throw new ProcessError(undefined, -1, "Invalid input type " + Object.prototype.toString.call(input));
        }

        return false;
    }
}