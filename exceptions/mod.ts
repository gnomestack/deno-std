import { IError } from "../primitives/error.ts";

function from(e: Error): Exception {
    if (e instanceof AggregateException) {
        return AggregateException.from(e);
    }

    const exception = new Exception(e.message, e.cause);
    exception.stack = e.stack;
    return exception;
}

export class Exception extends Error {
    override name = "Exception";
    #innerError?: Exception;
    #code?: string;

    #target?: string;

    link?: string | URL;

    #stackLines?: string[];

    constructor(message: string, innerError?: Error | unknown) {
        super(message);

        this.cause = innerError;
        this.#code = this.name;
        if (this.cause instanceof Exception) {
            this.#innerError = this.cause;
        }

        if (this.cause instanceof Error) {
            this.#innerError = from(this.cause);
        }
    }

    get code(): string | undefined {
        return this.#code;
    }

    set code(value: string | undefined) {
        this.#code = value;
    }

    get target(): string | undefined {
        return this.target;
    }

    set target(value: string | undefined) {
        this.#target = value;
    }

    get innerException(): Exception | undefined {
        return this.#innerError;
    }

    set(props: Partial<this>) {
        for (const [key, value] of Object.entries(props)) {
            if (key === "name" || key === "stack") {
                continue;
            }

            if (Object.hasOwn(this, key)) {
                // @ts-ignore. between the Partial and Object.hasOwn, this is a valid property
                this[key] = value;
            }
        }

        return this;
    }

    set stack(value: string | undefined) {
        this.#stackLines = undefined;
        super.stack = value;
    }

    get stackTrace(): string[] {
        if (!this.#stackLines) {
            if (this.stack) {
                this.#stackLines = this.stack.split("\n").map((line) => line.trim()).filter((o) => o.startsWith("at "));
            } else {
                this.#stackLines = [];
            }
        }

        return this.#stackLines;
    }

    set stackTrace(value: string[]) {
        this.#stackLines = value;
        super.stack = value.join("\n");
    }

    toObject(): IError {
        return {
            message: this.message,
            code: this.code,
            target: this.target,
            innerError: this.innerException?.toObject(),
        };
    }
}

export class SystemException extends Exception {
    override name = "SystemException";

    constructor(message: string, innerError?: Error) {
        super(message, innerError);
    }
}

export function collectException(e: Error) {
    const errors: Error[] = [];

    walkException(e, (error) => errors.push(error));

    return errors;
}

export function walkException(e: Error, callback: (e: Error) => void): void {
    if (e instanceof AggregateError && e.errors) {
        for (const error of e.errors) {
            walkException(error, callback);
        }
    }

    if (e instanceof SystemException && e.innerException) {
        walkException(e.innerException, callback);
    }

    callback(e);
}

/**
 * Prints the error to the console and if an error derives from SystemError,
 * it will print the inner error as well.
 *
 * @param e The error to print to the console.
 * @param format Formats the error to the console.
 * @returns
 */
export function printError(e: Error, format?: (e: Error) => string): void {
    if (e instanceof AggregateError && e.errors) {
        for (const error of e.errors) {
            printError(error, format);
        }
    }

    if (e instanceof Exception && e.innerException) {
        printError(e.innerException, format);
    }

    if (format) {
        console.error(format(e));
        return;
    }

    console.error(e);
}

/**
 * A decorator for hiding a function from the stack trace.
 *
 * @returns {(target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor}}
 */
export function hideStack() {
    // deno-lint-ignore no-explicit-any
    return function (target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
        const original = descriptor.value;
        if (typeof original === "function") {
            descriptor.value = (...args: unknown[]) => {
                try {
                    return original.apply(target, args);
                } catch (e) {
                    if (e instanceof Exception && e.stack) {
                        // first line of stack trace is the message, though could be multiple lines
                        // if the dev used '\n' in the error message.
                        // todo: figure out messages can exceed the first line.
                        const lines = e.stack.split("\n");
                        const start = lines.indexOf("    at ");
                        if (start > -1) {
                            e.stack = e.stack.split("\n").splice(start, 1).join("\n");
                        }
                    }
                    throw e;
                }
            };
        }
        return descriptor;
    };
}

export class ArgumentException extends SystemException {
    parameterName: string | null;

    constructor(parameterName: string | null = null, message?: string) {
        super(message || `Argument ${parameterName} is invalid.`);
        this.parameterName = parameterName;
        this.name = "ArgumentException";
    }

    toObject(): IError {
        return {
            ...super.toObject(),
            parameterName: this.parameterName,
        };
    }
}

export class AggregateException extends SystemException {
    errors: Exception[];

    constructor(message?: string, errors?: Exception[], innerError?: Error) {
        super(message ?? "One or more errors occurred.", innerError);
        this.name = "AggregateException";
        this.errors = errors ?? [];
    }

    override toObject(): IError {
        return {
            ...super.toObject(),
            details: this.errors.map((o) => o.toObject()),
        };
    }

    static from(error: AggregateError) {
        const innerError = error.cause instanceof Error ? from(error.cause) : error;
        return new AggregateException(error.message, error.errors.map((o) => from(o)), innerError);
    }
}

export class AssertionException extends SystemException {
    constructor(message?: string) {
        super(message || "Assertion failed.");
        this.name = "AssertionException";
    }
}

export class PlatformNotSupportedException extends SystemException {
    constructor(message?: string) {
        super(message || "Platform is not supported.");
        this.name = "PlatformNotSupportedException";
    }
}

export class EnvVariableNotSetException extends SystemException {
    constructor(variableName: string, message?: string) {
        super(message || `Environment variable ${variableName} is not set.`);
        this.name = "EnvVariableNotSetException";
    }
}

export class FileNotFoundExeception extends SystemException {
    constructor(message?: string) {
        super(message || "File not found.");
        this.name = "FileNotFoundException";
    }
}

export class DirectoryNotFoundException extends SystemException {
    constructor(message?: string) {
        super(message || "Directory not found.");
        this.name = "DirectoryNotFoundException";
    }
}

export class ArgumentNullException extends ArgumentException {
    constructor(parameterName: string | null = null) {
        super(`Argument ${parameterName} must not be null or undefined.`);
        this.parameterName = parameterName;
        this.name = "ArgumentException";
    }

    static validate(value: unknown, parameterName: string) {
        if (value === null || value === undefined) {
            throw new ArgumentNullException(parameterName);
        }
    }
}

export class TimeoutException extends SystemException {
    constructor(message?: string) {
        super(message || "Operation timed out.");
        this.name = "TimeoutException";
    }
}

export class NotSupportedException extends SystemException {
    constructor(message?: string) {
        super(message || "Operation is not supported.");
        this.name = "NotSupportedException";
    }
}

export class ObjectDisposedException extends SystemException {
    constructor(message?: string, innerError?: Error) {
        super(message || "Object has been disposed.", innerError);
        this.name = "ObjectDisposedException";
    }
}

export class ArgumentEmptyException extends ArgumentException {
    constructor(parameterName: string | null = null) {
        super(`Argument ${parameterName} must not be null or empty.`);
        this.parameterName = parameterName;
        this.name = "ArgumentException";
    }
}

export class ArgumentWhiteSpaceException extends ArgumentException {
    constructor(parameterName: string | null = null) {
        super(
            `Argument ${parameterName} must not be null, empty, or whitespace.`,
        );
        this.parameterName = parameterName;
        this.name = "ArgumentException";
    }
}

export class ArgumentRangeException extends ArgumentException {
    constructor(parameterName: string | null = null, message?: string) {
        super(message || `Argument ${parameterName} is out of range.`);
        this.parameterName = parameterName;
        this.name = "ArgumentException";
    }
}

export class NotImplementedException extends SystemException {
    constructor(message?: string) {
        super(message || "Not implemented");
        this.name = "NotImplementedException";
    }
}

export class InvalidOperationException extends SystemException {
    constructor(message?: string) {
        super(message || "Invalid operation");
        this.name = "InvalidOperationException";
    }
}

export class InvalidCastException extends SystemException {
    constructor(message?: string) {
        super(message || "Invalid cast");
        this.name = "InvalidCastException";
    }
}

export class NullReferenceException extends SystemException {
    constructor(message?: string) {
        super(message || "Null or undefined reference");
        this.name = "NullReferenceException";
    }
}

export class FormatException extends SystemException {
    constructor(message?: string) {
        super(message || "Format Exception");
        this.name = "FormatException";
    }
}

export class NotFoundOnPathException extends SystemException {
    executable: string | undefined;
    constructor(executable?: string, message?: string, innerError?: Error) {
        super(message || `Executable ${executable} not found on PATH.`, innerError);
        this.name = "NotFoundOnPathException";
        this.executable = executable;
    }

    override toObject(): IError {
        return {
            ...super.toObject(),
            executable: this.executable,
        };
    }
}

export class ProcessException extends SystemException {
    fileName: string | undefined;

    exitCode: number;

    constructor(fileName?: string, exitCode?: number, message?: string, innerError?: Error) {
        super(message || `An error with a child process ${fileName} occurred. exitCode: ${exitCode}`, innerError);
        this.name = "ProcessException";
        this.exitCode = exitCode || 0;
        this.fileName = fileName;
    }

    override toObject(): IError {
        return {
            ...super.toObject(),
            fileName: this.fileName,
            exitCode: this.exitCode,
        };
    }
}
