import { assert, test } from "../testing/mod.ts";
import { isEnvEnabled, isRunEnabled } from "../testing/deno_permissions.ts";
import { get } from "../os/env.ts";
import { HOME_VAR_NAME } from "../os/constants.ts";
import { ps, quietRun, quietRunSync, run, runSync, whichSync } from "./mod.ts";

const hasRun = await isRunEnabled();
const hasEnv = await isEnvEnabled();

const hasGit = hasRun && hasEnv && (whichSync("git")) !== undefined;
const hasCat = hasRun && hasEnv && (whichSync("cat")) !== undefined;
const hasEcho = hasRun && hasEnv && (whichSync("echo")) !== undefined;
const hasGrep = hasRun && hasEnv && (whichSync("grep")) !== undefined;

test.when(hasGit, "exec: success", async () => {
    const { code } = await run("git", "--version");
    assert.equals(code, 0);
});

test.when(hasEcho, "ps: text()", async () => {
    const result = await ps("echo", "my test").text();
    assert.equals(result, "my test\n");
});

test.when(hasGit, "exec: failure", async () => {
    const { code } = await run("git", "not-a-command");
    assert.equals(code, 1);
});

test.when(hasGit, "execSync: success", () => {
    const { code } = runSync("git", "--version");
    assert.equals(code, 0);
});

test.when(hasGit, "execSync: failure", () => {
    const { code } = runSync("git", "not-a-command");
    assert.equals(code, 1);
});

test.when(hasGit, "capture: success", async () => {
    const { code, stdoutText, stdout, args } = await quietRun("git", "--version");
    assert.equals(code, 0);
    console.log(args);
    console.log("stdout", stdoutText);
    console.log("stdout", stdout);
    assert.ok(stdoutText.includes("git version"));
    assert.stringIncludes(stdoutText, "git version");
});

test.when(hasGit, "capture: failure", async () => {
    const { code, stderrText, stdoutText } = await quietRun("git", "not-a-command");
    assert.equals(code, 1);
    console.log("out", stdoutText);
    console.log("err", stderrText);
    assert.stringIncludes(
        stderrText,
        "git: 'not-a-command' is not a git command. See 'git --help'.",
    );
});

test.when(hasGit, "captureSync: success", () => {
    const { code, stdoutText } = quietRunSync("git", "--version");
    assert.equals(code, 0);
    assert.stringIncludes(stdoutText, "git version");
});

test.when(hasGit, "captureSync: failure", () => {
    const { code, stderrText } = quietRunSync("git", "not-a-command");
    assert.equals(code, 1);
    assert.stringIncludes(
        stderrText,
        "git: 'not-a-command' is not a git command. See 'git --help'.",
    );
});

test.when(hasGit, "output: success with inherit pipe", async () => {
    const { code } = await run("git", "--version");
    assert.equals(code, 0);
});

test.when(hasGit, "output: success with capture pipe", async () => {
    const { code, stdoutText } = await quietRun("git", "--version");
    assert.equals(code, 0);
    assert.stringIncludes(stdoutText, "git version");
});

test.when(
    hasRun && hasEnv,
    "output: failure with inherit & different cwd",
    async () => {
        const home = get(HOME_VAR_NAME);
        const { code, args } = await run("git", "status -s", {
            cwd: home,
        });
        console.log(args);
        assert.equals(code, 128);
    },
);

test.when(
    hasRun && hasEnv,
    "output: failure with piped & different cwd",
    async () => {
        const home = get(HOME_VAR_NAME);
        const { code, stderrText } = await ps("git", ["status", "-s"])
            .cwd(home ?? "/home/")
            .stdout("piped")
            .stderr("piped");
        assert.equals(code, 128);
        assert.stringIncludes(
            stderrText,
            "fatal: not a git repository (or any of the parent directories): .git",
        );
    },
);

test.when(hasGit, "outputSync: success with inherit pipe", () => {
    const { code } = runSync("git", ["--version"]);
    assert.equals(code, 0);
});

test.when(hasGit, "outputSync: success with capture pipe", () => {
    const { code, stdoutText } = quietRunSync("git", ["--version"]);
    assert.equals(code, 0);
    assert.stringIncludes(stdoutText, "git version");
});

test.when(hasEcho && hasCat && hasGrep, "ps: can pipe", async () => {
    const result = await ps("echo", "my test")
        .pipe("grep", "test")
        .pipe("cat")
        .output();
    assert.equals(result.code, 0);
    console.log(result.stdoutText);
});

test.when(hasEcho, "ps: text()", async () => {
    const result = await ps("echo", "my test").text();
    assert.equals(result, "my test\n");
});

test.when(hasEcho, "ps: lines()", async () => {
    const lines: string[] = [];
    for await (const line of ps("echo", "my test").lines()) {
        console.log(line);
        lines.push(line);
    }
    assert.equals(lines, ["my test", ""]);
});

test.when(hasEcho, "ps: blob()", async () => {
    const blob = await ps("echo", "my test").blob();
    assert.instanceOf(blob, Blob);
    const text = await blob.text();
    console.log(text);
    assert.equals(text, "my test\n");
});

test.when(hasGit, "outputSync: success with capture pipe", () => {
    const { code, stdoutText } = quietRunSync("git", ["--version"]);
    assert.equals(code, 0);
    assert.stringIncludes(stdoutText, "git version");
});

test.when(hasCat, "ps: cat using input", async () => {
    const result = await ps("cat", [], { input: "my test", "stdout": "piped" });
    assert.equals(result.code, 0);
    console.log(result.stdoutText);
    assert.equals(result.stdoutText, "my test");
});

test.when(hasEcho, "splat arguments with extra arguments (string)", async () => {
    const result = await quietRun("echo", { _: "hello" });
    assert.equals(result.code, 0);
    assert.equals(result.stdoutText, "hello\n");
});

test.when(hasEcho, "splat arguments with extra arguments (array)", async () => {
    const result = await quietRun("echo", { _: ["hello"] });
    assert.equals(result.code, 0);
    assert.equals(result.stdoutText, "hello\n");
});

test.when(hasEcho, "splat arguments with ordered arguments", async () => {
    const result = await quietRun("echo", { text: "hello" }, {
        splat: { arguments: ["text"] },
    });
    assert.equals(result.code, 0);
    assert.equals(result.stdoutText, "hello\n");
});

test.when(hasEcho, "splat arguments with parameters", async () => {
    // converts version to --version
    const result2 = await quietRun("git", { "version": true });
    assert.equals(result2.code, 0);
    assert.stringIncludes(result2.stdoutText, "git version");
});

test.when(
    hasGit,
    "outputSync: failure with inherit & different cwd",
    () => {
        const home = get(HOME_VAR_NAME);
        const { code } = runSync("git", ["status", "-s"], { cwd: home });
        assert.equals(code, 128);
    },
);

test.when(
    hasGit,
    "outputSync: failure with piped & different cwd",
    () => {
        const home = get(HOME_VAR_NAME);
        const { code, stderrText } = quietRunSync("git", ["status", "-s"], { cwd: home });
        assert.equals(code, 128);
        assert.stringIncludes(
            stderrText,
            "fatal: not a git repository (or any of the parent directories): .git",
        );
    },
);
