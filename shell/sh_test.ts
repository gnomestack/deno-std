import { which } from "../ps/which.ts";
import { test, assert, isRunEnabled } from "../testing/mod.ts";
import { run } from "./sh.ts";

const hasRun = await isRunEnabled();
const hasEnv = await isRunEnabled();
const hasBash = hasRun && hasEnv && (await which("bash")) !== undefined;
const hasSh = hasRun && hasEnv && (await which("sh")) !== undefined;
const hasPwsh = hasRun && hasEnv && (await which("pwsh")) !== undefined;
const hasPowerShell = hasRun && hasEnv && (await which("powershell")) !== undefined;
const hasCmd = hasRun && hasEnv && (await which("cmd")) !== undefined;
const hasNode = hasRun && hasEnv && (await which("node")) !== undefined;
const hasDeno = hasRun && hasEnv && (await which("deno")) !== undefined;
const hasRuby = hasRun && hasEnv && (await which("ruby")) !== undefined;
const hasPython = hasRun && hasEnv && (await which("python")) !== undefined;

test.when(hasPowerShell || hasBash, "run: default", async () => {
    // echo is a built-in command in powershell that maps to write-host
    // so this should work on both powershell and bash
    const output = await run("echo 'hello world'").text();
    assert.equals(output, "hello world\n");
});


test.when(hasBash, "run: bash", async () => {
    const output = await run("bash", "echo 'hello world'").text();
    assert.equals(output, "hello world\n");
});

test.when(hasSh, "run: sh", async () => {
    const output = await run("sh", "echo 'hello world'").text();
    assert.equals(output, "hello world\n");
});

test.when(hasPwsh, "run: pwsh", async() => {
    const output = await run("pwsh", `Write-Host 'hello world'`).text();
    assert.equals(output, "hello world\n");
});

test.when(hasPowerShell, "run: powershell", async() => {
    const output = await run("powershell", `Write-Host 'hello world'`).text();
    assert.equals(output, "hello world\n");
});

test.when(hasCmd, "run: cmd", async() => {
    const output = await run("cmd", `echo hello world`).text();
    assert.equals(output, "hello world\r\n");
});

test.when(hasNode, "run: node", async() => {
    const output = await run("node", `console.log('hello world')`).text();
    assert.equals(output, "hello world\n");
});

test.when(hasDeno, "run: deno", async() => {
    const output = await run("deno", `console.log('hello world')`).text();
    assert.equals(output, "hello world\n");
});

test.when(hasRuby, "run: ruby", async() => {
    const output = await run("ruby", `-e "puts 'hello world'"`).text();
    assert.equals(output, "hello world\n");
});

test.when(hasPython, "run: python", async() => {
    const output = await run("python", `-c "print('hello world')"`).text();
    assert.equals(output, "hello world\n");
});