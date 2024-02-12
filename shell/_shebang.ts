import { IS_WINDOWS } from "../os/constants.ts";
import { trim } from "../primitives/str.ts";
import { findExe } from "../ps/registry.ts";
import { splitArguments } from "../ps/utils.ts";

export interface IEnvironmentOptions {
    chdir?: string;
    env?: Record<string, string>;
    ignore?: boolean;
    unset?: string[];
    split?: string[];
    verbose?: boolean;
}

export interface IShebang {
    args: string[];
    shell?: string;
    options?: IEnvironmentOptions;
}
let envOnPath: string | undefined = undefined;
let testedEnvOnPath: boolean | undefined = undefined;

async function getEnvOnPath() {
    if (testedEnvOnPath === undefined) {
        envOnPath = await findExe("env");
        testedEnvOnPath = true;
    }

    return envOnPath;
}

export async function shebang(shebang: string) {
    // #!/usr/bin/env deno run --allow-read --allow-write
    if (shebang.startsWith("#!")) {
        shebang = shebang.substring(2);
    }
    const parts = splitArguments(shebang);
    const sb: IShebang = { args: parts };
    const envLine = "/usr/bin/env";
    if (parts.length === 0) {
        return sb;
    }

    // if the first part is not env, then we can assume its the shell
    if (parts[0] !== envLine) {
        sb.shell = parts[0];
        sb.args = parts.slice(1);

        let exe = sb.shell;
        if (exe.includes("/")) {
            const lastIndex = exe.lastIndexOf("/");
            if (lastIndex > 0) {
                exe = exe.substring(lastIndex + 1);
            }
        }

        const path = await findExe(exe);
        if (path) {
            sb.shell = path;
            return sb;
        }

        return sb;
    }

    // if its only '/usr/bin/env exe'; then we can
    // we can skip env on windows if the exe is found
    // for example #!/usr/bin/env deno
    if (parts.length === 2) {
        if (IS_WINDOWS) {
            // if this doesn't work, then let it fail and let the user sort it out
            const exe = await findExe(parts[1]);
            if (exe) {
                sb.shell = exe;
                sb.args = [];
                return sb;
            }
        }

        return sb;
    }

    // if env is found on the path, then we can use it
    // since the path may different on different systems, especially windows
    // then lets replace the env path with the found path
    const envPath = await getEnvOnPath();
    if (envPath) {
        // linux shebang line only supports one argument after the env command,
        // so env is fine with the rest of the arguments as a single string
        sb.shell = envPath;
        sb.args = [shebang.substring(envLine.length + 1)];
        return sb;
    }

    sb.options ??= {};

    let hasOptions = false;
    let hasCommand = false;
    for (let i = 1; i < parts.length; i++) {
        const next = parts[i];

        if (!hasCommand && !hasOptions && next.includes("=")) {
            hasOptions = true;

            const assignIndex = next.indexOf("=");
            const key = next.substring(0, assignIndex);
            const value = trim(next.substring(assignIndex + 1), "\"'");
            sb.options.env ??= {};
            sb.options.env[key] = value;
            continue;
        }

        if (hasOptions && !hasCommand && !next.startsWith("-")) {
            hasCommand = true;
            sb.shell = next;
            while ((i + 1) < parts.length) {
                sb.args.push(parts[++i]);
            }
            break;
        }

        if (!hasCommand && next.startsWith("-")) {
            hasOptions = true;
            if (next.startsWith("--chdir=")) {
                sb.options.chdir = trim(next.substring(8), "\"'");
                continue;
            }

            if (next.startsWith("--unset=")) {
                sb.options.unset ??= [];
                sb.options.unset.push(trim(next.substring(8), "\"'"));
                continue;
            }

            switch (next) {
                case "-i":
                case "--ignore-environment":
                case "-":
                    sb.options.ignore = true;
                    break;

                case "-u":
                    sb.options ??= {};
                    sb.options.unset ??= [];
                    sb.options.unset.push(parts[++i]);
                    break;

                case "-C":
                    sb.options ??= {};
                    sb.options.chdir = parts[++i];
                    break;

                case "-vS":
                case "-S":
                    {
                        hasCommand = true;
                        sb.options ??= {};
                        sb.args = [];
                        let hasInnerCommand = false;
                        while ((i + 1) < parts.length) {
                            const na = parts[++i];
                            if (hasInnerCommand) {
                                sb.args.push(na);
                                continue;
                            }

                            if (!na.includes("=")) {
                                hasInnerCommand = true;
                                sb.args.push(na);
                                continue;
                            }
                            if (!hasInnerCommand && na.includes("=")) {
                                const assignIndex = na.indexOf("=");
                                const key = na.substring(0, assignIndex);
                                const value = trim(na.substring(assignIndex + 1), "\"'");
                                sb.options.env ??= {};
                                sb.options.env[key] = value;
                                continue;
                            }

                            sb.args.push(na);
                        }
                    }
                    break;

                default:
                    throw new Error(`Unsupported option ${next}`);
            }
        }
    }

    return sb;
}
