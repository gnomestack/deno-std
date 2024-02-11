import { ISecretMasker, secretMasker } from "../secrets/masker.ts";
import { stdout } from "./_base.ts";
import { cyan } from "../fmt/colors.ts";

export const writeCommandOptions = {
    enabled: true,
    masker: secretMasker as ISecretMasker,
};

/**
 * Write a command to the console and mask any secrets registered with the
 * secret masker.
 * @param fileName The name of the file to run. 
 * @param args The arguments to pass to the file.
 * @returns void
 */
export function writeCommand(fileName: string, args: string[]) {
    // write commands to the console to make it easier to follow along
    // with what is being executed
    if (!writeCommandOptions.enabled) {
        return;
    }

    const masker = writeCommandOptions.masker;
    const joined = args.map(o => {
        if (o.includes(" ")) {
            return `"${o}"`;
        }

        return o;
    }).join(" ");
    let cmd = `${fileName} ${joined}`;

    // mask any secrets written to the console
    cmd = masker.mask(cmd) as string;

    // @p42-ignore-next-line
    stdout.writeSync(new TextEncoder().encode(cyan(cmd) + "\n"));
}
