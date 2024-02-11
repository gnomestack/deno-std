import {
    cwd,
    exec as exec2,
    execSync as execSync2,
    IExecOptions,
    IExecSyncOptions,
} from "../ps/mod.ts";
import { IS_WINDOWS } from "../os/constants.ts";
import { resolve } from "../path/mod.ts";
import { InvalidOperationError } from "../errors/mod.ts";
import { generateScriptFile, generateScriptFileSync, options } from "./executor_registry.ts";


export async function run(shell: string, file: string, execOptions?: IExecOptions & { args?: string[] }) {
    const o = options(shell);
    if (o === undefined) {
        throw new InvalidOperationError("${shell} not registered");
    }

    o.mapPath ??= (path: string) => { 
        path = resolve(cwd(), path);
        if (IS_WINDOWS) {
            path = path.replaceAll("\\", "/");
        }

        return Promise.resolve(path);
    };
    file = await o.mapPath(file);

    const splat = o.args?.concat([]) ?? [];
    splat.push(file);
    if (execOptions && execOptions.args) {
        splat.push(...execOptions.args);
        delete execOptions.args;
    }

    return await exec2(shell, splat, execOptions);
}

export function runSync(shell: string, file: string, execOptions?: IExecSyncOptions & { args?: string[] }) {
    const o = options(shell);
    if (o === undefined) {
        throw new InvalidOperationError("${shell} not registered");
    }

    const splat = o.args?.concat([]) ?? [];
    o.mapPathSync ??= (path: string) => { 
        path = resolve(cwd(), path);
        if (IS_WINDOWS) {
            path = path.replaceAll("\\", "/");
        }

        return path;
    };
    file = o.mapPathSync(file);

    splat.push(file);
    if (execOptions && execOptions.args) {
        splat.push(...execOptions.args);
        delete execOptions.args;
    }

    return execSync2(shell, splat, execOptions);
}

export async function exec(shell: string, inlineScript: string, execOptions?: IExecOptions) {
    const o = options(shell);
    if (o === undefined) {
        throw new InvalidOperationError("${shell} not registered");
    }

    const mkScript = o.generateScriptFile ?? generateScriptFile;
    const scriptFile = await mkScript(inlineScript, o.ext, undefined);
    return (await run(shell, scriptFile, execOptions));
}


export function execSync(shell: string, inlineScript: string, execOptions?: IExecSyncOptions) {
    const o = options(shell);
    if (o === undefined) {
        throw new InvalidOperationError("${shell} not registered");
    }

    const mkScript = o.generateScriptFileSync ?? generateScriptFileSync;
    const scriptFile = mkScript(inlineScript, o.ext, undefined);
    return runSync(shell, scriptFile, execOptions);
}