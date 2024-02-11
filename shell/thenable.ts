import { IExecOptions, PsOutput, exec } from "../ps/mod.ts";

export class ThenShell implements PromiseLike<(string | Uint8Array | string[] | PsOutput)>{
    #script: string;

    #shell: string;

    #options: IExecOptions;

    #output: 'text' | 'buffer' | 'psobject' | 'lines';


    constructor(script: string)
    {
        this.#script = script;
        this.#shell = "bash";
        this.#options = {};
        this.#output = 'psobject';
    }
    
    then<TResult1 = string | string[] | Uint8Array | PsOutput, TResult2 = never>(onfulfilled?: ((value: string | string[] | Uint8Array | PsOutput) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
        return exec(this.#script, this.#shell, this.#options).then(r => {
            switch (this.#output) {
                case 'text':
                    return r.stderrText;
                case 'buffer':
                    return r.stdout;
                case 'lines':
                    return r.stdoutLines;
                default:
                    return r;
            }
        }).then(onfulfilled, onrejected);
    }
    

    shell(shell: string) {
        this.#shell = shell;
        return this;
    }

    cwd(path: string) {
        this.#options.cwd = path;
        return this;
    }

    env(env: Record<string, string>) {
        this.#options.env = env;
        return this;
    }

    text() {
        this.#options.stdout = 'piped';
        this.#options.stderr = 'inherit';
        this.#output = 'text';
        return this;
    }

    buffer() {
        this.#options.stdout = 'piped';
        this.#options.stderr = 'inherit';
        this.#output = 'buffer';
        return this;
    }

    lines() {
        this.#options.stdout = 'piped';
        this.#options.stderr = 'inherit';
        this.#output = 'lines';
        return this;
    }
}

export function shell(script: string) {
    return new ThenShell(script);
}

const x = await shell('ls -l').text().then();
x.toString();