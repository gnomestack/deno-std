import { chmod, chmodSync, makeTempFile, makeTempFileSync, writeTextFile, writeTextFileSync } from "../fs/fs.ts";
import { IS_WINDOWS } from "../os/mod.ts";
import { resolve } from "../path/mod.ts";
import { cwd } from "../ps/mod.ts";
import { findExe, findExeSync, IPathFinderOptions, registerExe } from "../ps/registry.ts";

export function generateScriptFileSync(script: string, ext: string) {
    const scriptFile = makeTempFileSync({ prefix: "quasar_scripts", suffix: ext });
    writeTextFileSync(scriptFile, script);

    if (!IS_WINDOWS) {
        chmodSync(scriptFile, 0o777);
    }

    return scriptFile.replaceAll("\\", "/");
}

export async function generateScriptFile(script: string, ext: string, tpl?: string) {
    const scriptFile = await makeTempFile({ prefix: "quasar_scripts", suffix: ext });
    if (tpl) {
        await writeTextFile(scriptFile, tpl.replace("{{script}}", script));
    } else {
        await writeTextFile(scriptFile, script);
    }

    if (!IS_WINDOWS) {
        await chmod(scriptFile, 0o777);
    }

    return scriptFile.replaceAll("\\", "/");
}

export interface IShellOptions extends IPathFinderOptions {
    args?: string[];
    ext: string;
    requiresFile?: boolean;
    wrap?: (script: string) => string;
    generateScriptFile?: (script: string, ext: string, tpl?: string) => Promise<string>;
    generateScriptFileSync?: (script: string, ext: string, tpl?: string) => string;
    mapPath?: (path: string) => Promise<string>;
    mapPathSync?: (path: string) => string;
}

const registery: Record<string, IShellOptions | undefined> = {};

export function registerShell(shell: string, options: Omit<IShellOptions, "name">) {
    const opts = registerExe(shell, options);
    const o = {
        ...options,
        ...opts,
    };
    registery[shell] = o;
}

export function options(shell: string): IShellOptions | undefined {
    return registery[shell];
}

export function list(): string[] {
    return Object.keys(registery);
}

registerShell("cmd", {
    ext: ".cmd",
    args: ["/D", "/E:ON", "/V:OFF", "/S", "/C", "CALL"],
    windows: [
        "%SystemRoot%/System32/cmd.exe",
    ],
    wrap: (script: string) => {
        return `@echo off
${script}`;
    },
});

registerShell("bash", {
    ext: ".sh",
    args: ["-noprofile", "--norc", "-e", "-o", "pipefail", "-c"],
    windows: [
        "%ProgramFiles%\\Git\\bin\\bash.exe",
        "%ProgramFiles%\\Git\\usr\\bin\\bash.exe",
        "%ChocolateyInstall%\\msys2\\usr\\bin\\bash.exe",
        "%SystemDrive%\\msys64\\usr\\bin\\bash.exe",
        "%SystemDrive%\\msys\\usr\\bin\\bash.exe",
        "%SystemRoot%\\System32\\bash.exe",
    ],
    mapPath: async (path: string) => {
        path = resolve(cwd(), path);
        if (IS_WINDOWS) {
            path = path.replaceAll("\\", "/");
            const exe = await findExe("bash");
            if (exe?.endsWith("System32\\bash.exe") || exe?.endsWith("system32\\bash.exe")) {
                path = "/mnt/" + "c" + path.substring(1).replace(":", "");
            }
        }

        return path;
    },
    mapPathSync: (path: string) => {
        path = resolve(cwd(), path);
        if (IS_WINDOWS) {
            path = path.replaceAll("\\", "/");
            const exe = findExeSync("bash");
            if (exe?.endsWith("System32\\bash.exe") || exe?.endsWith("system32\\bash.exe")) {
                path = "/mnt/" + "c" + path.substring(1).replace(":", "");
            }
        }

        return path;
    },
});

registerShell("sh", {
    args: ["-e"],
    ext: ".sh",
    requiresFile: true,
    windows: [
        "%ProgramFiles%\\Git\\usr\\bin\\sh.exe",
        "%ChocolateyInstall%\\msys2\\usr\\bin\\sh.exe",
        "%SystemDrive%\\msys64\\usr\\bin\\sh.exe",
        "%SystemDrive%\\msys\\usr\\bin\\sh.exe",
    ],
});

registerShell("deno", {
    args: ["run", "-A", "--unstable"],
    ext: ".ts",
    requiresFile: true,
    windows: [
        "%UserProfile%\\.deno\\bin\\deno.exe",
        "%ChocolateyInstall%\\lib\\deno\\tools\\deno.exe",
    ],
    linux: [
        "$HOME/.deno/bin/deno",
    ],
});

registerShell("node", {
    args: [],
    ext: ".js",
    requiresFile: true,
    windows: [
        "%ProgramFiles%/nodejs/node.exe",
        "%ProgramFiles(x86)%/nodejs/node.exe",
    ],
    linux: [
        "/usr/bin/node",
    ],
});

registerShell("python", {
    args: [],
    ext: ".py",
    requiresFile: true,
    linux: [
        "/usr/bin/python3",
        "/usr/bin/python",
    ],
});

registerShell("ruby", {
    args: [],
    ext: ".rb",
    requiresFile: true,
    linux: [
        "/usr/bin/ruby",
    ],
});

registerShell("perl", {
    args: [],
    ext: ".pl",
    requiresFile: true,
    linux: [
        "/usr/bin/perl",
    ],
});

registerShell("dotnet-script", {
    args: [],
    ext: ".csx",
    requiresFile: true,
    linux: [
        "${HOME}/.dotnet/tools/dotnet-script",
    ],
    windows: [
        "%UserProfile%\\.dotnet\\tools\\dotnet-script.exe",
    ],
});

registerShell("powershell", {
    ext: ".ps1",
    args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Unrestricted", "-Command"],
    windows: [
        "%SystemRoot%/System32/WindowsPowerShell/v1.0/powershell.exe",
    ],
    mapPath: (path: string) => Promise.resolve(`. ${path}`),
    mapPathSync: (path: string) => `. ${path}`,
    wrap: (script: string) => {
        return `$ErrorActionPreference = 'Stop'
        ${script}
        if ((Test-Path -LiteralPath variable:\\LASTEXITCODE)) { exit $LASTEXITCODE }
`;
    },
});

registerShell("pwsh", {
    ext: ".ps1",
    args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Unrestricted", "-Command"],
    windows: [
        "%ProgramFiles%/PowerShell/7/pwsh.exe",
        "%ProgramFiles(x86)%/PowerShell/7/pwsh.exe",
        "%ProgramFiles%/PowerShell/6/pwsh.exe",
        "%ProgramFiles(x86)%/PowerShell/6/pwsh.exe",
    ],
    linux: [
        "/opt/microsoft/powershell/7/pwsh",
        "/opt/microsoft/powershell/6/pwsh",
    ],
    wrap: (script: string) => {
        return `$ErrorActionPreference = 'Stop'
        ${script}
        if ((Test-Path -LiteralPath variable:\\LASTEXITCODE)) { exit $LASTEXITCODE }
`;
    },
    mapPath: (path: string) => Promise.resolve(`. ${resolve(cwd(), path)}`),
    mapPathSync: (path: string) => `. ${resolve(cwd(), path)}`,
});
