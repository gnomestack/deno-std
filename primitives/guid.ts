import { randomUUID } from "../random/mod.ts";
import { uuidV4 } from "../deps.ts";
import { Lazy } from "./lazy.ts";
import { OptionError } from "../errors/mod.ts";

const emptyValue = "00000000-0000-0000-0000-000000000000";
const emptyGuid = new Lazy<Guid>(() => new Guid(emptyValue));

export class Guid {
    #value: string;

    constructor(value: string);
    constructor();
    constructor() {
        if (arguments.length == 1 && typeof arguments[0] === "string") {
            if (!uuidV4.validate(arguments[0])) {
                throw new OptionError("Invalid Guid");
            }

            this.#value = arguments[0];
        }

        this.#value = randomUUID() as string;
    }

    get value(): string {
        return this.#value;
    }

    static empty(): Guid {
        return emptyGuid.value;
    }

    static newGuid(): Guid {
        return new Guid();
    }

    static parse(value: string): Guid {
        if (!uuidV4.validate(value)) {
            throw new OptionError(`Invalid Guid ${value}`);
        }

        return new Guid(value);
    }
}
