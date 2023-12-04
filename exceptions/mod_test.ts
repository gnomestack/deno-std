import { assert, test } from "../testing/mod.ts";
import { NotFoundOnPathException, ProcessException } from "./mod.ts";

test("NotFoundOnPathError", () => {
    assert.throws<NotFoundOnPathException>(
        () => {
            throw new NotFoundOnPathException("test");
        },
        NotFoundOnPathException,
        `Executable test not found on PATH.`,
    );
});

test("ProcessError", () => {
    assert.throws<ProcessException>(
        () => {
            throw new ProcessException("test", 1);
        },
        ProcessException,
        `An error with a child process test occurred. exitCode: 1`,
    );
});
