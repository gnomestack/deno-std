import { Exception } from "../exceptions/mod.ts";

export class ReadOnlyArray<T> extends Array<T> {
    constructor(...items: T[]) {
        super(...items);
    }

    override set length(value: number) {
        throw new Exception("Cannot set length of readonly array");
    }

    override push(..._items: T[]): number {
        throw new Exception("Cannot push to readonly array");
    }

    override pop(): T | undefined {
        throw new Exception("Cannot pop from readonly array");
    }

    override shift(): T | undefined {
        throw new Exception("Cannot shift from readonly array");
    }

    override unshift(..._items: T[]): number {
        throw new Exception("Cannot unshift to readonly array");
    }

    override splice(_start: number, _deleteCount?: number): T[] {
        throw new Exception("Cannot splice readonly array");
    }

    override reverse(): T[] {
        throw new Exception("Cannot reverse readonly array");
    }

    override sort(_compareFn?: (a: T, b: T) => number): this {
        throw new Exception("Cannot sort readonly array");
    }

    override copyWithin(_target: number, _start: number, _end?: number): this {
        throw new Exception("Cannot copyWithin readonly array");
    }

    override fill(_value: T, _start?: number, _end?: number): this {
        throw new Exception("Cannot fill readonly array");
    }
}

const empty: ReadOnlyArray<never> = [] as ReadOnlyArray<never>;

export function emptyArray<T>(): ReadOnlyArray<T> {
    return empty as ReadOnlyArray<T>;
}
