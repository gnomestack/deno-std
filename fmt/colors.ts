import {
    bgBlack as bgBlack2,
    bgBlue as bgBlue2,
    bgBrightBlack as bgBrightBlack2,
    bgBrightBlue as bgBrightBlue2,
    bgBrightCyan as bgBrightCyan2,
    bgBrightGreen as bgBrightGreen2,
    bgBrightMagenta as bgBrightMagenta2,
    bgBrightRed as bgBrightRed2,
    bgBrightWhite as bgBrightWhite2,
    bgBrightYellow as bgBrightYellow2,
    bgCyan as bgCyan2,
    bgGreen as bgGreen2,
    bgMagenta as bgMagenta2,
    bgRed as bgRed2,
    bgRgb24 as bgRgb24v2,
    bgRgb8 as bgRgb8v2,
    bgWhite as bgWhite2,
    bgYellow as bgYellow2,
    black as black2,
    blue as blue2,
    bold as bold2,
    brightBlack as brightBlack2,
    brightBlue as brightBlue2,
    brightCyan as brightCyan2,
    brightGreen as brightGreen2,
    brightMagenta as brightMagenta2,
    brightRed as brightRed2,
    brightWhite as brightWhite2,
    brightYellow as brightYellow2,
    cyan as cyan2,
    dim as dim2,
    gray as gray2,
    green as green2,
    italic as italic2,
    magenta as magenta2,
    red as red2,
    rgb24 as rgb24v2,
    rgb8 as rgb8v2,
    strikethrough as strikethrough2,
    underline as underline2,
    white as white2,
    yellow as yellow2,
} from "../deps.ts";
import { AnsiSettings } from "./ansi-settings.ts";

export type Rgb = { r: number; g: number; b: number };

export function rgb8(str: string, color: number) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return rgb8v2(str, color);
}

export function rgb24(str: string, color: number | Rgb) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return rgb24v2(str, color);
}

export function bgRgb8(str: string, color: number) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgRgb8v2(str, color);
}

export function bgRgb24(str: string, color: number | Rgb) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgRgb24v2(str, color);
}

export function red(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return red2(str);
}

export function black(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return black2(str);
}

export function gray(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return gray2(str);
}

export function bold(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bold2(str);
}

export function italic(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return italic2(str);
}

export function underline(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return underline2(str);
}

export function dim(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return dim2(str);
}

export function blue(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return blue2(str);
}

export function cyan(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return cyan2(str);
}

export function green(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return green2(str);
}

export function magenta(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return magenta2(str);
}

export function white(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return white2(str);
}

export function yellow(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return yellow2(str);
}

export function brightBlack(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return brightBlack2(str);
}

export function brightBlue(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return brightBlue2(str);
}

export function brightCyan(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return brightCyan2(str);
}

export function brightGreen(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return brightGreen2(str);
}

export function brightMagenta(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return brightMagenta2(str);
}

export function brightRed(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return brightRed2(str);
}

export function brightWhite(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return brightWhite2(str);
}

export function brightYellow(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return brightYellow2(str);
}

export function bgBlack(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBlack2(str);
}

export function bgBlue(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBlue2(str);
}

export function bgCyan(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgCyan2(str);
}

export function bgGreen(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgGreen2(str);
}

export function bgMagenta(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgMagenta2(str);
}

export function bgRed(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgRed2(str);
}

export function bgWhite(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgWhite2(str);
}

export function bgYellow(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgYellow2(str);
}

export function bgBrightBlack(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBrightBlack2(str);
}

export function bgBrightBlue(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBrightBlue2(str);
}

export function bgBrightCyan(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBrightCyan2(str);
}

export function bgBrightGreen(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBrightGreen2(str);
}

export function bgBrightMagenta(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBrightMagenta2(str);
}

export function bgBrightRed(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBrightRed2(str);
}

export function bgBrightWhite(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBrightWhite2(str);
}

export function bgBrightYellow(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return bgBrightYellow2(str);
}

export function strikethrough(str: string) {
    if (AnsiSettings.current.mode === 0) {
        return str;
    }

    return strikethrough2(str);
}
