# Gnomestack Standard Lib for Deno

Work less. Do more.

![logo](./.eng/assets/icon.png)

Gnome stacks for Deno extends and normalizes the deno standard ("std") library to help create deno, bun, and node
modules with a focus on automation.

## Nonexhaustive list

- **collections** provides a case insenstive map.
- **errors** common errors that exend a `SystemError` that makes it eaiser to work with stack traces.
- **fs** file system functionality
- **path** handle dealing with file paths.
- **ps** provides many functions to make it easier to execute child processes, capture output, determine if an
  executable is on the path, or convert an object to an executable's command line parameters.
- **os** a layer to deal with differences in operating systems and includes functions to work with environment variables
  and the env path variable.
- **secrets** provides a secret generator function and class and masking capabilities.
- **runtime** provides information about the current javascript runtime. e.g. deno, node, bun, etc
- **optional** provides result and option functions and classes.
- **fmt** provides support-colors from npm and a HostWriter class that can be swapped for differently implementations
  e.g. writing error, warnings in a continous integration pipeline like github or azure devops.
- **text** provides enhanced functions for dealing with characters or strings including things like case insenstive
  equals, trim, trimStart, trimEnd, indexOf and provides a string bulder class to hopefully reduce allocations.

## License

MIT
