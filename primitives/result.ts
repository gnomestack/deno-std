import { ResultError } from "../errors/mod.ts";
import { NONE, Option, SOME } from "./option.ts";

export const ERR = Symbol("ERR");
export const OK = Symbol("OK");

export class Result<T = void, E = Error> {
    #ok: T | undefined;
    #error: E | undefined;
    #symbol: symbol;

    constructor(
        ok: T | undefined,
        error: E | undefined,
        symbol: typeof OK | typeof ERR = OK,
    ) {
        this.#ok = ok;
        this.#error = error;
        this.#symbol = symbol;
    }

    get isOk(): boolean {
        return this.#symbol === OK;
    }

    get isError(): boolean {
        return this.#symbol === ERR;
    }

    get value(): T {
        this.throwOnError();
        return this.#ok!;
    }

    get error(): E {
        if (this.#symbol === ERR) {
            return this.#error!;
        }

        throw new ResultError("Result is ok.");
    }

    static try<T = void, E = Error>(fn: () => T, map?: (e: unknown) => E) {
        try {
            const x = fn();
            return new Result<T, E>(x, undefined, OK);
        } catch (e) {
            if (map) {
                return new Result<T, E>(undefined, map(e), ERR);
            }

            new Result<T, E>(undefined, e!, ERR);
        }
    }

    and(value: Result<T, E>): Result<T, E>;
    and(value: T): Result<T, E>;
    and(fn: () => T): Result<T, E>;
    and(): Result<T, E> {
        if (arguments.length == 0) {
            return this;
        }

        if (this.#symbol === ERR) {
            return this;
        }

        const value = arguments[0];

        if (value instanceof Result) {
            return value;
        }

        if (typeof value == "function") {
            return new Result<T, E>(value(), undefined, OK);
        }

        return new Result<T, E>(value, undefined, OK);
    }

    toValue(): Option<T> {
        return this.#symbol === OK ? new Option(this.#ok, SOME) : new Option<T>(undefined, NONE);
    }

    resolve() {
        return Promise.resolve(this);
    }

    promise() {
        return new Promise<T>((resolve, reject) => {
            if (this.#symbol === OK) {
                resolve(this.#ok!);
            } else {
                reject(this.#error);
            }
        });
    }

    toError(): Option<E> {
        return this.#symbol === ERR ? new Option(this.#error, SOME) : new Option<E>(undefined, NONE);
    }

    equals(other: E): boolean;
    equals(other: Result<T, E>): boolean;
    equals(other: T): boolean;
    equals(): boolean {
        if (arguments.length == 0) {
            return false;
        }

        const other = arguments[0];
        if (other === undefined || other === null) {
            return false;
        }

        if (other instanceof Result) {
            return this.#symbol === other.#symbol && this.#ok === other.#ok && this.#error === other.#error;
        }

        if (this.#symbol === ERR) {
            return this.#error === other;
        }

        return this.#ok === other;
    }

    expect(message: string): T {
        if (this.#symbol === OK) {
            return this.#ok!;
        }

        const e = this.#error;
        if (e instanceof Error) {
            e.message = `${message}: ${e.message}`;
            throw e;
        }

        throw new ResultError(`${message}: ${e}`);
    }

    inspect(fn: (value: T) => void): Result<T, E> {
        if (this.#symbol === OK) {
            fn(this.#ok!);
        }

        return this;
    }

    test(predicate: (value: T) => boolean): boolean {
        return this.#symbol === OK && predicate(this.#ok!);
    }

    testError(predicate: (value: E) => void): void {
        if (this.#symbol === ERR) {
            predicate(this.#error!);
        }
    }

    when(predicate: (value: T) => boolean, fn: (value: T) => void): Result<T, E> {
        if (this.#symbol === OK && predicate(this.#ok!)) {
            fn(this.#ok!);
        }

        return this;
    }

    whenError(predicate: (value: E) => boolean, fn: (value: E) => void): Result<T, E> {
        if (this.#symbol === ERR && predicate(this.#error!)) {
            fn(this.#error!);
        }

        return this;
    }

    map<U>(fn: (value: T) => U, defaultValue?: () => U | U): Result<U, E> {
        if (this.#ok == undefined) {
            if (defaultValue != undefined) {
                if (typeof defaultValue == "function") {
                    return new Result<U, E>(defaultValue(), undefined, OK);
                }

                return new Result<U, E>(fn(defaultValue), undefined);
            }

            return new Result<U, E>(undefined, this.#error, ERR);
        }

        return new Result<U, E>(fn(this.#ok), undefined);
    }

    mapError<U>(fn: (value: E) => U, defaultValue?: () => U | U): Result<T, U> {
        if (this.#symbol === ERR) {
            return new Result<T, U>(undefined, fn(this.#error!), ERR);
        }

        if (arguments.length === 0) {
            throw new ResultError("Result is ok.");
        }

        if (typeof defaultValue === "function") {
            return new Result<T, U>(undefined, defaultValue(), ERR);
        }

        return new Result<T, U>(undefined, defaultValue, ERR);
    }

    or(value: () => T): Result<T, E>;
    or(value: T): Result<T, E>;
    or(value: Result<T, E>): Result<T, E>;
    or(): Result<T, E> {
        if (arguments.length == 0) {
            return this;
        }

        if (this.#symbol === OK) {
            return this;
        }

        const value = arguments[0];
        if (value instanceof Result) {
            return value;
        }

        if (typeof value == "function") {
            return new Result<T, E>(value(), undefined, OK);
        }

        return new Result<T, E>(value, undefined, OK);
    }

    replace(value: T): Result<T, E> {
        this.#ok = value;
        this.#error = undefined;
        this.#symbol = OK;

        return this;
    }

    replaceError(value: E): Result<T, E> {
        this.#error = value;
        this.#ok = undefined;
        this.#symbol = ERR;

        return this;
    }

    throwOnError(): Result<T, E> {
        if (this.#symbol === ERR) {
            if (this.#error instanceof Error) {
                throw this.#error;
            }

            if (typeof this.#error == "string") {
                throw new ResultError(this.#error);
            }

            throw new ResultError("Result is error" + this.#error?.toString());
        }

        return this;
    }

    unwrap(defaultValue: T): T;
    unwrap(generate: () => T): T;
    unwrap(): T;
    unwrap(): T {
        if (this.#symbol === ERR) {
            if (arguments.length == 1) {
                if (typeof arguments[0] == "function") {
                    return arguments[0]();
                }

                if (arguments[0] != undefined) {
                    return arguments[0];
                }
            }

            throw new ResultError("Result is error");
        }

        return this.#ok!;
    }

    unwrapError(defaultValue: E): E;
    unwrapError(generate: () => E): E;
    unwrapError(): E;
    unwrapError(): E {
        if (this.#symbol === OK) {
            if (arguments.length == 0) {
                throw new ResultError("Result is ok");
            }

            const value = arguments[0];
            if (typeof value == "function") {
                return value();
            }

            return value;
        }

        return this.#error!;
    }
}

export function ok<T = void, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(value, undefined, OK);
}

export function fail<T = void, E = Error>(value: E): Result<T, E> {
    return new Result<T, E>(undefined, value, ERR);
}

// deno-lint-ignore no-explicit-any
export function fromError<T = void>(e?: any): Result<T, Error> {
    if (e instanceof Error)
        return new Result<T, Error>(undefined, e, ERR);

    if (typeof e === "string")
        return new Result<T, Error>(undefined, new Error(e), ERR);

    return new Result<T, Error>(undefined, new Error(`Unknown Error ${e}`), ERR);
}