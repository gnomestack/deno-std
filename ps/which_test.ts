import { assert, test } from "../testing/mod.ts";
import { isEnvEnabled, isReadEnabled } from "../testing/deno_permissions.ts";
import { which, whichSync } from "./which.ts";

const hasEnv = await isEnvEnabled();
const hasRead = await isReadEnabled();

test.when(hasEnv && hasRead, "which: found", async () => {
    const gitPath = await which("git");
    assert.exists(gitPath);
});

test.when(hasEnv && hasRead, "which: linked", async () => {
    const python3 = await which("python3");
    assert.exists(python3);
});

test.when(hasEnv && hasRead, "whichSync: linked", () => {
    const python3 = whichSync("python3");
    assert.exists(python3);
});

test.when(hasEnv && hasRead, "which: not found", async () => {
    const pwsh = await which("pwsh");
    assert.exists(pwsh);
    assert.truthy(pwsh.endsWith("pwsh.exe") || pwsh.endsWith("pwsh"));
});

test.when(hasEnv && hasRead, "which: not found", async () => {
    const gitPath = await which("git-not-found");
    assert.falsey(gitPath, "git-not-found should not be found");
});

test.when(hasEnv && hasRead, "whichSync: found", () => {
    const gitPath = whichSync("git");
    assert.exists(gitPath);
});

test.when(hasEnv && hasRead, "whichSync: not found", () => {
    const gitPath = whichSync("git-not-found");
    assert.falsey(gitPath, "git-not-found should not be found");
});
