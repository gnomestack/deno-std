import { trim } from "../mod.ts";
import { IS_BROWSER } from "../runtime/mod.ts";
import { IS_DARWIN, IS_LINUX, IS_WINDOWS, OS_FAMILY, OS_RELEASE_VERISON } from "./constants.ts";
import { rtlGetVersion, WindowsProductType } from "./win/rtl-get-version.ts";

class OsRelease {
    id?: string;
    idLike?: string;

    name?: string;
    versionId?: string;
    versionCodename?: string;
    versionName?: string;
    prettyName?: string;
    version?: string;
    cpeName?: string;
    homeUrl?: string;
    documentationUrl?: string;
    supportUrl?: string;
    bugReportUrl?: string;
    privacyPolicyUrl?: string;
    buildId?: string;
    variant?: string;
    variantId?: string;
    map: Record<string, string> = {};

    get isWindows() {
        return this.id === "windows";
    }

    get isWindowsServer() {
        return this.isWindows && this.variantId === "server";
    }

    get isUbuntu() {
        return this.id === "ubuntu";
    }

    get isDebian() {
        return this.id === "debian";
    }

    get isDebianLike() {
        return this.idLike === "debian" || this.id === "debian";
    }

    get isDarwin() {
        return this.id === "macos";
    }
}

let release: OsRelease | undefined;

export function osRelease(): OsRelease {
    if (release) {
        return release;
    }

    release = new OsRelease();
    if (IS_LINUX) {
        const data = Deno.readTextFileSync("/etc/os-release");

        const lines = data.split("\n");

        for (const line of lines) {
            const [key, value] = line.split("=");

            if (key && value) {
                release.map[key] = trim(value, '"');
            }
        }

        release.id = release.map["ID"];
        release.idLike = release.map["ID_LIKE"];
        release.name = release.map["NAME"];
        release.versionId = release.map["VERSION_ID"];
        release.versionCodename = release.map["VERSION_CODENAME"];
        release.versionName = release.map["VERSION_NAME"];
        release.prettyName = release.map["PRETTY_NAME"];
        release.version = release.map["VERSION"];
        release.cpeName = release.map["CPE_NAME"];
        release.homeUrl = release.map["HOME_URL"];
        release.documentationUrl = release.map["DOCUMENTATION_URL"];
        release.supportUrl = release.map["SUPPORT_URL"];
        release.bugReportUrl = release.map["BUG_REPORT_URL"];
        release.privacyPolicyUrl = release.map["PRIVACY_POLICY_URL"];
        release.buildId = release.map["BUILD_ID"];
        release.variant = release.map["VARIANT"];
        release.variantId = release.map["VARIANT_ID"];

        return release;
    }

    if (IS_WINDOWS) {
        const view = rtlGetVersion();
        const isServer = view.wProductType !== WindowsProductType.WorkStation;
        release.id = "windows";
        release.idLike = "windows";
        release.name = "Windows";

        const major = view.dwMajorVersion;
        const minor = view.dwMinorVersion;
        const build = view.dwBuildNumber;

        release.buildId = `${major}.${minor}.${build}`;
        if (isServer) {
            release.variant = "Server";
            release.variantId = "server";
        } else {
            release.variant = "Workstation";
            release.variantId = "workstation";
        }

        switch (major) {
            case 10:
                if (isServer) {
                    if (build >= 20348) {
                        release.version = "Server 2022";
                        release.versionId = "2022";
                    } else if (build >= 19043) {
                        release.version = "Server 2022";
                        release.versionId = "2022";
                    } else if (build >= 17763) {
                        release.version = "Server 2019";
                        release.versionId = "2019";
                    } else {
                        release.version = "Server 2016";
                        release.versionId = "2016";
                        release.versionCodename = "Redstone 1";
                    }
                } else {
                    if (build >= 20000) {
                        release.version = "11";
                        release.versionId = "11";
                    } else {
                        release.version = "10";
                        release.versionId = "10";
                    }
                }

                break;

            case 6:
                if (isServer) {
                    switch (minor) {
                        case 0:
                            release.version = "Server 2008";
                            release.versionId = "2008";
                            release.versionCodename = "Longhorn";
                            break;

                        case 1:
                            release.version = "Server 2008 R2";
                            release.versionId = "2008r2";
                            release.versionCodename = "Longhorn R2";
                            break;

                        case 2:
                            release.version = "Server 2012";
                            release.versionId = "2012";
                            release.versionCodename = "Windows Server 8";
                            break;

                        case 3:
                            release.version = "Server 2012 R2";
                            release.versionId = "2012r2";
                            release.versionCodename = "Windows Server Blue";
                            break;

                        default:
                            throw new Error("Unknown Windows Server version.");
                    }
                } else {
                    switch (minor) {
                        case 0:
                            release.version = "Vista";
                            release.versionId = "vista";
                            release.versionCodename = "Longhorn";
                            break;

                        case 1:
                            release.version = "7";
                            release.versionId = "7";
                            release.versionCodename = "Vienna";
                            break;

                        case 2:
                            release.version = "8";
                            release.versionId = "8";
                            release.versionCodename = "Windows 8";
                            break;

                        case 3:
                            release.version = "8.1";
                            release.versionId = "8.1";
                            release.versionCodename = "Windows Blue";
                            break;

                        default:
                            throw new Error("Unknown Windows version.");
                    }
                }

                release.prettyName = `${release.name} ${release.version} (${release.buildId})`;
        }

        return release;
    }

    if (IS_DARWIN) {
        // source from https://www.npmjs.com/package/macos-release
        const nameMap = new Map([
            [23, ["Sonoma", "14"]],
            [22, ["Ventura", "13"]],
            [21, ["Monterey", "12"]],
            [20, ["Big Sur", "11"]],
            [19, ["Catalina", "10.15"]],
            [18, ["Mojave", "10.14"]],
            [17, ["High Sierra", "10.13"]],
            [16, ["Sierra", "10.12"]],
            [15, ["El Capitan", "10.11"]],
            [14, ["Yosemite", "10.10"]],
            [13, ["Mavericks", "10.9"]],
            [12, ["Mountain Lion", "10.8"]],
            [11, ["Lion", "10.7"]],
            [10, ["Snow Leopard", "10.6"]],
            [9, ["Leopard", "10.5"]],
            [8, ["Tiger", "10.4"]],
            [7, ["Panther", "10.3"]],
            [6, ["Jaguar", "10.2"]],
            [5, ["Puma", "10.1"]],
        ]);

        const v = Number(Deno.osRelease().split(".")[0]);
        const [name, version] = nameMap.get(v) || ["Unknown", ""];

        release.versionCodename = name;
        release.versionId = version;
        release.id = "macos";
        release.idLike = "darwin";
        release.name = "macOS";
        release.prettyName = `macOS ${version} (${name})`;
        release.homeUrl = "https://www.apple.com/macos/";
        release.documentationUrl = "https://support.apple.com";
        release.supportUrl = "https://support.apple.com";
        release.bugReportUrl = "https://support.apple.com";
        release.privacyPolicyUrl = "https://www.apple.com/legal/privacy";
        return release;
    }

    if (IS_BROWSER) {
        release.id = "browser";
        release.idLike = "browser";
        release.name = "Browser";
        release.prettyName = "Browser";
        const r = release;
        if (navigator) {
            // deno-lint-ignore no-explicit-any
            const nav = navigator as any;
            if (nav.userAgentData) {
                r.id = nav.userAgentData.platform;
                r.idLike = nav.userAgentData.platform;
                nav.userAgentData.getHighEntropyValues(
                    ["architecture", "model", "platform", "platformVersion", "uaFullVersion"],
                )
                    // deno-lint-ignore no-explicit-any
                    .then((ua: any) => {
                        r.id = ua.platform;
                        r.idLike = ua.platform;
                        r.versionId = ua.platformVersion;
                        r.version = `${ua.platform} (${ua.version})`;
                    });
            }
        }

        return release;
    }

    release.id = OS_FAMILY;
    release.idLike = OS_FAMILY;
    release.name = OS_FAMILY;
    release.version = OS_RELEASE_VERISON;

    return release;
}
