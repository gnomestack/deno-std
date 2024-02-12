import { ArgumentError, ProcessError } from "../errors/mod.ts";
import {
    ExecArgs,
    IChildProcess,
    IExecOptions,
    IPipe,
    IPipeFactory,
    IPsCommand,
    IPsOutput,
    PsFactory,
} from "./types.ts";

export class Pipe implements IPipe {
    #promise: Promise<IChildProcess>;

    constructor(
        private readonly process: IChildProcess,
        private readonly processFactory: PsFactory,
    ) {
        this.#promise = Promise.resolve(process);
    }

    pipe(name: string, args?: ExecArgs, options?: IExecOptions): IPipe;
    pipe(next: IChildProcess | IPsCommand | IPsOutput): IPipe;
    pipe(): IPipe {
        if (arguments.length === 0) {
            throw new ArgumentError("Invalid arguments");
        }

        if (typeof arguments[0] === "string") {
            const args = arguments[1] as ExecArgs;
            const options = arguments[2] as IExecOptions;
            const next = this.processFactory(arguments[0], args, options);
            return this.pipe(next);
        }

        const next = arguments[0];

        this.#promise = this.#promise.then(async (process) => {
            let child = next as IChildProcess;
            if (typeof next === "object" && "spawn" in next) {
                if ("stdin" in next) {
                    next.stdin("piped");
                }
                child = next.spawn();
            }

            try {
                // force stdin to close
                await process.stdout.pipeTo(child.stdin, { preventClose: false });
                if (!process.stdout.locked) {
                    console.log("stdout", "cancelled");
                    await process.stdout.cancel();
                }

                // if (process.stderr.)
                //await process.stderr.cancel();

                const status = await process.status;
                if (status.success) {
                    console.log("status success");
                } else {
                    console.log("status failure");
                }
            } catch (ex) {
                throw new ProcessError(
                    `Pipe failed for ${process.file}: ${ex.message} ${ex.stack}`,
                );
            }

            return child;
        });
        return this;
    }

    async output(): Promise<IPsOutput> {
        const process = await this.#promise;
        return process.output();
    }
}

export class PipeFactory implements IPipeFactory {
    constructor(private readonly processFactory: PsFactory) {}

    create(process: IChildProcess): IPipe {
        return new Pipe(process, this.processFactory);
    }
}

export function createPipeFactory(processFactory: PsFactory): IPipeFactory {
    return new PipeFactory(processFactory);
}
