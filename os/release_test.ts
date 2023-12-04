import { assert, test } from "../testing/mod.ts";
import { osRelease } from "./release.ts";

test("osRelease", () => {
    const release = osRelease();
    assert.exists(release);

    assert.exists(release.id);
    assert.exists(release.idLike);
    assert.exists(release.name);
    console.log(release);
});
