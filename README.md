# Gnomestack Standard Lib for Deno

Work less. Do more.

![logo](./.eng/assets/icon.png)

Gnome stacks for Deno extends and normalizes the deno standard ("std") library with a focus on scripting and automation.

## Nonexhaustive list

- **collections** provides a case insenstive map.
- **errors** common errors that exend a `SystemError` that makes it eaiser to work with stack traces.
- **fmt** provides support-colors from npm and a HostWriter class that can be swapped for differently implementations
  e.g. writing error, warnings in a continous integration pipeline like github or azure devops.
- **fs** file system functionality. Normalizes naming.
- **path** handle dealing with file paths.
- **primitives** provides result and option functions and classes, str functions.
- **ps** provides many functions to make it easier to execute child processes, capture output, determine if an
  executable is on the path, or convert an object to an executable's command line parameters.
- **os** a layer to deal with differences in operating systems and includes functions to work with environment variables
  and the env path variable.
- **runtime** provides information about the current javascript runtime. e.g. deno, node, bun, etc
- **scripting** provides simplier exports for fs, path, ps, os, env, and sh with a focus on writing scripts.
- **shell** provides functions to invoke shell files or shell scripts like pwsh, bash, deno, ruby, python, etc.
- **secrets** provides a secret generator function and class and masking capabilities.
- **text** provides a string builder class and inflections class.

## License

MIT
