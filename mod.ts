/**
 * The `gs_std` module provides an extended standard library for deno, the
 * main entry point for gs_std pulls in modules for scripting.
 *
 * @module gs_std
 */

export * from "./primitives/str.ts";
export * from "./os/scripting.ts";
export * from "./path/scripting.ts";
export * from "./ps/scripting.ts";
export * from "./fs/scripting.ts";
export * from "./secrets/mod.ts";
