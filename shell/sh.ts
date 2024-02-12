import { extname } from "https://deno.land/std@0.208.0/path/extname.ts";
import { IExecOptions, IPsOutput, IPsStartInfo, Ps, findExeSync } from "../ps/mod.ts";
import { IS_WINDOWS } from "../os/constants.ts";
import { options, generateScriptFile, generateScriptFileSync, list } from "./sh_registry.ts";


let defaultShell = IS_WINDOWS ? "powershell" : "bash";

export function setDefaultShell(shell: string) {
    defaultShell = shell;
}

export function getDefaultShell() {
    return defaultShell;
}


export class Sh extends Ps 
{
    #inlineScript?: string;
    #scriptFile?: string;
    #shell?: string;
    #isTempFile = false;
    #mapped = false;


    constructor(startInfo?: IPsStartInfo) {
        super(startInfo);

        if (startInfo?.file) {
            const exe = startInfo.file.toString();
            if (exe.includes('/')) {
                const lastIndex = exe.lastIndexOf('/');
                if (lastIndex > 0)
                    this.#shell = exe.substring(lastIndex + 1);
            } else if (exe.includes('\\')) {
                const lastIndex = exe.lastIndexOf('\\');
                if (lastIndex > 0)
                    this.#shell = exe.substring(lastIndex + 1);
            } else {
                this.#shell = exe;
            }            

            if (extname(exe) === "") {
                this.#shell = exe;
            } else {
                const ext = extname(exe);
                this.#shell = exe.substring(0, exe.length - ext.length);
            }
        }
    }

    inline(script: string) {
        this.#inlineScript = script;
        return this;
    }

    file(scriptFile: string) {
        this.#scriptFile = scriptFile;
        return this;
    }

    shell(shell: string) {
        this.#shell = shell;
        return this;
    }

    override async text() {
        try {
            await this.map();
            return await super.text();
        } finally {
            if (this.#isTempFile) {
                if (this.#scriptFile) {
                    await Deno.remove(this.#scriptFile);
                }
            }
        }
    }

    override async json() {
        try {
            await this.map();
            return await super.json();
        } finally {
            if (this.#isTempFile) {
                if (this.#scriptFile) {
                    await Deno.remove(this.#scriptFile);
                }
            }
        }
    }

    override async arrayBuffer() {
        try {
            await this.map();
            return await super.arrayBuffer();
        } finally {
            if (this.#isTempFile) {
                if (this.#scriptFile) {
                    await Deno.remove(this.#scriptFile);
                }
            }
        }
    }

    override async blob() {
        try {
            await this.map();
            return await super.blob();
        } finally {
            if (this.#isTempFile) {
                if (this.#scriptFile) {
                    await Deno.remove(this.#scriptFile);
                }
            }
        }
    }

    override lines() {
        try {
            this.mapSync();
            return super.lines();
        } finally {
            if (this.#isTempFile) {
                if (this.#scriptFile) {
                    Deno.removeSync(this.#scriptFile);
                }
            }
        }
    }

    override spawn() {
        this.mapSync();
        return super.spawn();
    }

    override async output() {
        try {
            await this.map();
            return await super.output();
        } finally {
            if (this.#isTempFile) {
                if (this.#scriptFile) {
                    await Deno.remove(this.#scriptFile);
                }
            }
        }
    }

    override outputSync() {
        try {
            this.mapSync();
            return super.outputSync();
        } finally {
            if (this.#isTempFile) {
                if (this.#scriptFile) {
                    Deno.removeSync(this.#scriptFile);
                }
            }
        }
    }

    private mapSync() {
        if (this.#mapped)
        return;

        this.#mapped = true;

        if (!this.#shell) {
            this.#shell = getDefaultShell();
        }

        const o = options(this.#shell);
        if (o === undefined) {
            throw new Error(`${this.#shell} not registered`);
        }

        if (!this.#inlineScript && !this.#scriptFile) {
            throw new Error("no script or file");
        }

        this.startInfo.file = this.#shell;
    
        if (this.#inlineScript) {
            if (o.wrap) {
                this.#inlineScript = o.wrap(this.#inlineScript);
            }

            if (o.requiresFile) {
                this.#isTempFile = true;
                const mkscript = o.generateScriptFileSync ?? generateScriptFileSync;
                this.#scriptFile = mkscript(this.#inlineScript, o.ext);
                const splat = o.args?.concat([]) ?? [];
                let cmd = this.#scriptFile;
                if (o.mapPathSync) {
                    cmd = o.mapPathSync(this.#scriptFile);
                }

                splat.push(cmd);
                this.args(splat);
                return;
            }

            const splat = o.args?.concat([]) ?? [];
            splat.push(this.#inlineScript);
            this.args(splat);
            return;
        }

        const splat = o.args?.concat([]) ?? [];
        let cmd = this.#scriptFile!;
        if (o.mapPathSync)
            cmd = o.mapPathSync(cmd);
        
        splat.push(cmd);
        this.args(splat);
    }

    private async map() {
        if (this.#mapped)
            return;

        this.#mapped = true;

        if (!this.#shell) {
            this.#shell = getDefaultShell();
        }

        const o = options(this.#shell);
        if (o === undefined) {
            throw new Error(`${this.#shell} not registered`);
        }

        if (!this.#inlineScript && !this.#scriptFile) {
            throw new Error("no script or file");
        }

        this.startInfo.file = this.#shell;
       
        if (this.#inlineScript) {
            if (o.wrap) {
                this.#inlineScript = o.wrap(this.#inlineScript);
            }

            if (o.requiresFile) {
                this.#isTempFile = true;
                const mkscript = o.generateScriptFile ?? generateScriptFile;
                this.#scriptFile = await mkscript(this.#inlineScript, o.ext);
                const splat = o.args?.concat([]) ?? [];
                let cmd = this.#scriptFile;
                if (o.mapPath) {
                   cmd = await o.mapPath(this.#scriptFile);
                }

                splat.push(cmd);
                this.args(splat);
                return;
            }

            const splat = o.args?.concat([]) ?? [];
            splat.push(this.#inlineScript);
            this.args(splat);
            return;
        }

        const splat = o.args?.concat([]) ?? [];
        let cmd = this.#scriptFile!;
        if (o.mapPath)
            cmd = await o.mapPath(cmd);
        
        splat.push(cmd);
        this.args(splat);
    }
}

export function run(shell: string, script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh 
export function run(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh
export function run() {
    const args = Array.from(arguments);
    let shell = "notset"
    let inlineScript = "";
    let execOptions: IExecOptions | undefined = undefined;
    const arg0 = args[0];
    const arg1 = args.length > 1 ? args[1] : undefined;
    const arg2 = args.length > 2 ? args[2] : undefined;

    switch (args.length) {
        case 1:
            if (typeof arg0 === "string") {
                inlineScript = arg0;
            } else {
                execOptions = arg0;
            }
            break;
        case 2:
            if (typeof arg0 === "string") {
                shell = arg0;
                inlineScript = arg1;
            } else {
                inlineScript = arg0;
                execOptions = arg1;
            }
            break;
        case 3:
            shell = arg0;
            inlineScript = arg1;
            execOptions = arg2;
            break;
    }

    if (shell === "notset") {
        shell = getDefaultShell();
    }

    const o : IPsStartInfo = {
        ...execOptions,
        file: shell
    }

    const sh = new Sh(o);

    sh.inline(inlineScript);

    return sh;
}

export function runSync(shell: string, script: string, execOptions?: IExecOptions & { args?: string[] }) : IPsOutput 
export function runSync(script: string, execOptions?: IExecOptions & { args?: string[] }) : IPsOutput
export function runSync() {
    const args = Array.from(arguments);
    let shell = "notset"
    let inlineScript = "";
    let execOptions: IExecOptions | undefined = undefined;
    const arg0 = args[0];
    const arg1 = args.length > 1 ? args[1] : undefined;
    const arg2 = args.length > 2 ? args[2] : undefined;

    switch (args.length) {
        case 1:
            if (typeof arg0 === "string") {
                inlineScript = arg0;
            } else {
                execOptions = arg0;
            }
            break;
        case 2:
            if (typeof arg0 === "string") {
                shell = arg0;
                inlineScript = arg1;
            } else {
                inlineScript = arg0;
                execOptions = arg1;
            }
            break;
        case 3:
            shell = arg0;
            inlineScript = arg1;
            execOptions = arg2;
            break;
    }

    if (shell === "notset") {
        shell = getDefaultShell();
    }

    const o : IPsStartInfo = {
        ...execOptions,
        file: shell
    }

    const sh = new Sh(o);

    sh.inline(inlineScript);

    return sh.outputSync();
}



export function exec(shell: string, file: string, execOptions?: IExecOptions & { args?: string[] }) : Ps 
export function exec(file: string, execOptions?: IExecOptions & { args?: string[] }) : Ps
export function exec() : Ps  {
    const args = Array.from(arguments);
    let shell = "notset"
    let file = "";
    let execOptions: IExecOptions & { args?: string[] } | undefined = undefined;
    const arg0 = args[0];
    const arg1 = args.length > 1 ? args[1] : undefined;
    const arg2 = args.length > 2 ? args[2] : undefined;

    switch (args.length) {
        case 1:
            file = arg0;
            break;
        case 2:
            if (typeof arg0 === "string") {
                shell = arg0;
                file = arg1;
            } else {
                file = arg0;
                execOptions = arg1;
            }
            break;
        case 3:
            shell = arg0;
            file = arg1;
            execOptions = arg2;
            break;
    }

    if (shell === "notset") {
        const ext = extname(file);
        if (ext !== "") {
            for (const n of list()) {
                const o2 = options(n);
                if (o2?.ext === ext) {
                    if (o2.cached || findExeSync(n) !== undefined) {
                        shell = n;
                        break;
                    }
                }
            }
        }

        if (shell === "notset") {
            shell = getDefaultShell();
        }
    }

    const o : IPsStartInfo = {
        ...execOptions,
        file: shell
    }

    const sh = new Sh(o);
    sh.file(file);

    return sh;
}

export function execSync(shell: string, file: string, execOptions?: IExecOptions & { args?: string[] }) : IPsOutput
export function execSync(file: string, execOptions?: IExecOptions & { args?: string[] }) : IPsOutput
export function execSync() {
    const args = Array.from(arguments);
    let shell = "notset"
    let file = "";
    let execOptions: IExecOptions & { args?: string[] } | undefined = undefined;
    const arg0 = args[0];
    const arg1 = args.length > 1 ? args[1] : undefined;
    const arg2 = args.length > 2 ? args[2] : undefined;

    switch (args.length) {
        case 1:
            if (typeof arg0 === "string") {
                file = arg0;
            } else {
                execOptions = arg0;
            }
            break;
        case 2:
            if (typeof arg0 === "string") {
                shell = arg0;
                file = arg1;
            } else {
                file = arg0;
                execOptions = arg1;
            }
            break;
        case 3:
            shell = arg0;
            file = arg1;
            execOptions = arg2;
            break;
    }

    if (shell === "notset") {
        const ext = extname(file);
        if (ext !== "") {
            for (const n of list()) {
                const o2 = options(n);
                if (o2?.ext === ext) {
                    if (o2.cached || findExeSync(n) !== undefined) {
                        shell = n;
                        break;
                    }
                }
            }
        }

        if (shell === "notset") {
            shell = getDefaultShell();
        }
    }

    const o : IPsStartInfo = {
        ...execOptions,
        file: shell
    }

    const sh = new Sh(o);
    sh.file(file);

    return sh.outputSync();
}

export function sh(scripts: TemplateStringsArray, ...values: string[]) {
    const shell = getDefaultShell();

    const o : IPsStartInfo = {
        file: shell
    }

    let script = "";
    for (let i = 0; i < scripts.length; i++) {
        script += scripts[i];
        if (i < values.length) {
            script += values[i];
        }
    }

    const sh = new Sh(o);
    sh.inline(script);
    return sh;
}

sh.shell = function(shell?: string) {
    if (shell) {
        setDefaultShell(shell);
    }

    return getDefaultShell();
}

export function pwsh(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("pwsh", script, execOptions);
}

export function powershell(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("powershell", script, execOptions);
}

export function deno(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("deno", script, execOptions);
}

export function node(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("node", script, execOptions);
}

export function python(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("python", script, execOptions);
}

export function ruby(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("ruby", script, execOptions);
}

export function perl(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("perl", script, execOptions);
}

export function dotnet(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("dotnet", script, execOptions);
}

export function bash(script: string, execOptions?: IExecOptions & { args?: string[] }) : Sh {
    return run("bash", script, execOptions);
}

sh.run = run;
sh.runSync = runSync;
sh.exec = exec;
sh.execSync = execSync;
sh.pwsh = pwsh;
sh.powershell = powershell;
sh.deno = deno;
sh.node = node;
sh.python = python;
sh.ruby = ruby;
sh.perl = perl;
sh.dotnet = dotnet;
sh.bash = bash;
sh.sh = function (script: string, execOptions?: IExecOptions & { args?: string[] }) {
    return run("sh", script, execOptions);
}

export const $ = sh;