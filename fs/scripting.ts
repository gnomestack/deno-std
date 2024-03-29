import {
    ICreateDirectoryOptions,
    IDirectoryInfo,
    IFileInfo,
    IMakeTempOptions,
    IReadOptions,
    IRemoveOptions,
    ISymlinkOptions,
    IWriteOptions,
} from "./_interfaces.ts";
import * as fs2 from "./fs.ts";

export interface IFileSystem {
    chmod(path: string | URL, mode: number): Promise<void>;

    chown(path: string | URL, uid: number, gid: number): Promise<void>;

    copy(src: string | URL, dest: string | URL): Promise<void>;

    copySync(src: string | URL, dest: string | URL): void;

    emptyDir(path: string | URL): Promise<void>;

    emptyDirSync(path: string | URL): void;

    ensureFile(path: string | URL): Promise<void>;

    ensureFileSync(path: string | URL): void;

    ensureDir(path: string | URL): Promise<void>;

    ensureDirSync(path: string | URL): void;

    expandGlob(
        glob: string | URL,
        {
            root,
            exclude,
            includeDirs,
            extended,
            globstar,
            caseInsensitive,
            followSymlinks,
        }?: fs2.ExpandGlobOptions,
    ): AsyncIterableIterator<fs2.WalkEntry>;

    expandGlobSync(
        glob: string | URL,
        {
            root,
            exclude,
            includeDirs,
            extended,
            globstar,
            caseInsensitive,
            followSymlinks,
        }?: fs2.ExpandGlobOptions,
    ): IterableIterator<fs2.WalkEntry>;

    exists(path: string): Promise<boolean>;

    existsSync(path: string): boolean;

    makeDir(
        path: string | URL,
        options?: ICreateDirectoryOptions | undefined,
    ): Promise<void>;

    makeTempDir(options?: IMakeTempOptions): Promise<string>;

    makeTempDirSync(options?: IMakeTempOptions): string;

    makeTempFile(options?: IMakeTempOptions): Promise<string>;

    makeTempFileSync(options?: IMakeTempOptions): string;

    move(src: string | URL, dest: string | URL): Promise<void>;

    moveSync(src: string | URL, dest: string | URL): void;

    stat(path: string | URL): Promise<IFileInfo>;

    statSync(path: string | URL): IFileInfo;

    isDir(path: string | URL): Promise<boolean>;

    isDirSync(path: string | URL): boolean;

    isFile(path: string | URL): Promise<boolean>;

    isFileSync(path: string | URL): boolean;

    link(oldPath: string, newPath: string): Promise<void>;

    linkSync(oldPath: string, newPath: string): void;

    lstat(path: string | URL): Promise<IFileInfo>;

    lstatSync(path: string | URL): IFileInfo;

    readDir(path: string | URL): AsyncIterable<IDirectoryInfo>;

    readDirSync(path: string | URL): Iterable<IDirectoryInfo>;

    readLink(path: string | URL): Promise<string>;

    readFile(path: string | URL, options?: IReadOptions): Promise<Uint8Array>;

    readFileSync(path: string | URL): Uint8Array;

    readTextFile(path: string | URL, options?: IReadOptions): Promise<string>;

    readTextFileSync(path: string | URL): string;

    remove(path: string | URL, options?: IRemoveOptions): Promise<void>;

    removeSync(path: string | URL, options?: IRemoveOptions): void;

    rename(oldPath: string | URL, newPath: string | URL): Promise<void>;

    renameSync(oldPath: string | URL, newPath: string | URL): void;

    symlink(
        target: string | URL,
        path: string | URL,
        type?: ISymlinkOptions,
    ): Promise<void>;

    symlinkSync(
        target: string | URL,
        path: string | URL,
        type?: ISymlinkOptions,
    ): void;

    writeTextFile(
        path: string | URL,
        data: string,
        options?: IWriteOptions,
    ): Promise<void>;

    writeTextFileSync(
        path: string | URL,
        data: string,
        options?: IWriteOptions,
    ): void;

    writeFile(
        path: string | URL,
        data: Uint8Array | ReadableStream<Uint8Array>,
        options?: IWriteOptions | undefined,
    ): Promise<void>;

    writeFileSync(
        path: string | URL,
        data: Uint8Array | ReadableStream<Uint8Array>,
        options?: IWriteOptions | undefined,
    ): void;
}

export const fs: IFileSystem = fs2;
