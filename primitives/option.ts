// implement an option type

import { OptionError } from "../errors/mod.ts";

export const SOME = Symbol("SOME");
export const NONE = Symbol("NONE");

export class Option<T> {
    #value: T | undefined;
    #symbol: symbol;

    constructor(value: T | undefined, symbol: typeof SOME | typeof NONE = SOME) {
        this.#value = value;
        this.#symbol = symbol;
    }

    get hasValue(): boolean {
        return this.#symbol === SOME;
    }

    get value(): T | undefined {
        if (this.#symbol === NONE) {
            throw new OptionError("Option is None");
        }

        return this.#value;
    }

    static from<T>(value?: T): Option<T> {
        return new Option<T>(value, value === null || value === undefined ? NONE : SOME);
    }

    and(value: Option<T>): Option<T>;
    and(value: T): Option<T>;
    and(fn: () => T): Option<T>;
    and(): Option<T> {
        if (arguments.length == 0) {
            return this;
        }

        if (this.#symbol === NONE) {
            return this;
        }

        const value = arguments[0];

        if (value instanceof Option) {
            return value;
        }

        if (typeof value == "function") {
            return new Option<T>(value(), SOME);
        }

        return new Option(value, SOME);
    }

    resolve() {
        return Promise.resolve(this);
    }

    promise() {
        return new Promise<T>((resolve, reject) => {
            if (this.#symbol === SOME) {
                resolve(this.#value!);
            } else {
                reject(new OptionError("Option was NONE."));
            }
        });
    }

    expect(message: string): T {
        if (!this.hasValue) {
            throw new OptionError(message);
        }

        return this.#value!;
    }

    inspect(fn: (value: T) => void): Option<T> {
        if (this.#symbol === SOME) {
            fn(this.#value!);
        }

        return this;
    }

    map<U>(fn: (value: T) => U): Option<U> {
        if (this.#symbol === NONE) {
            return new Option<U>(undefined, NONE);
        }

        return new Option<U>(fn(this.#value!), SOME);
    }

    filter(predicate: (value: T) => boolean): Option<T> {
        if (this.#symbol === NONE) {
            return this;
        }

        if (predicate(this.#value!)) {
            return this;
        }

        return new Option<T>(undefined, NONE);
    }

    match<U>(some: (value: T) => U, none: () => U): U {
        if (this.#symbol === NONE) {
            return none();
        }

        return some(this.#value!);
    }

    when(predicate: (value: T) => boolean, fn: (value: T) => T): Option<T> {
        if (this.#symbol === NONE) {
            return this;
        }

        if (predicate(this.#value!)) {
            return new Option<T>(fn(this.#value!), SOME);
        }

        return this;
    }

    if(predicate: (value: T) => boolean): boolean {
        if (this.#symbol === NONE) {
            return false;
        }

        return predicate(this.#value!);
    }

    or(value: () => T): Option<T>;
    or(value: T): Option<T>;
    or(value: Option<T>): Option<T>;
    or(): Option<T> {
        if (arguments.length == 0) {
            return this;
        }

        if (this.#symbol === SOME) {
            return this;
        }

        const value = arguments[0];
        if (value instanceof Option) {
            return value;
        }

        if (typeof value == "function") {
            return new Option<T>(value(), SOME);
        }

        return new Option<T>(value, SOME);
    }

    replace(value: T) {
        this.#value = value;
        this.#symbol = SOME;
        return this;
    }

    take(): T {
        if (this.#symbol === NONE) {
            throw new OptionError("Option is None");
        }

        const value = this.#value!;
        this.#symbol = NONE;
        this.#value = undefined;
        return value;
    }

    unwrap(defaultValue: T): T;
    unwrap(generate: () => T): T;
    unwrap(): T;
    unwrap(): T {
        if (this.#symbol === NONE) {
            if (arguments.length == 1) {
                if (typeof arguments[0] == "function") {
                    return arguments[0]();
                }

                if (arguments[0] != undefined) {
                    return arguments[0];
                }
            }

            throw new OptionError("Option is None");
        }

        return this.#value!;
    }
}

export function some<T>(value: T): Option<T> {
    return new Option<T>(value, SOME);
}

export function none<T>(): Option<T> {
    return new Option<T>(undefined, NONE);
}
