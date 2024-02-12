// https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read
export async function* readLines(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const utf8Decoder = new TextDecoder("utf-8");
    let { value: chunk, done: readerDone } = await reader.read();
    let slice = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";

    const re = /\r\n|\n|\r/gm;
    let startIndex = 0;

    for (;;) {
        const result = re.exec(slice);
        if (!result) {
            if (readerDone) {
                break;
            }
            const remainder = slice.substring(startIndex);
            ({ value: chunk, done: readerDone } = await reader.read());
            slice = remainder + (chunk ? utf8Decoder.decode(chunk, { stream: true }) : "");
            startIndex = re.lastIndex = 0;
            continue;
        }
        yield slice.substring(startIndex, result.index);
        startIndex = re.lastIndex;
    }
    if (startIndex < slice.length) {
        // last line didn't end in a newline char
        yield slice.substring(startIndex);
    }

    // clear the decoder and flush the stream
    slice = utf8Decoder.decode();
    yield slice;
}

export async function* tryReadLines(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    setup?: Promise<void> | (() => Promise<void>),
    cleanup?: Promise<void> | (() => Promise<void>),
) {
    try {
        if (setup) {
            if (typeof setup === "function") {
                await setup();
            } else {
                await setup;
            }
        }

        yield* readLines(reader);
    } finally {
        if (cleanup) {
            if (typeof cleanup === "function") {
                await cleanup();
            } else {
                await cleanup;
            }
        }
    }
}
