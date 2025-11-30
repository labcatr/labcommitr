# `@labcatr/labcommitr`

A solution for building standardized git commits!

**Labcommitr** is used internally for all @labcatr projects. However, feel free to use it for your own projects!

## Plans

**Command**: `labcommitr` (alias `lc`)

### Commands

`labcommitr commit` : Start a `labcommitr` commit builder.

`labcommitr init`, `-i`: Create a file called `.labcommitrc` in the root directory of the current git repo.

`labcommitr go <type> [...message]`: Quickly submit a commit of the specified type with a message. If a message is not specified, a generic one will be generated for you (it is not good practice, however its BLAZINGLY FAST).

## Development & Testing

### Testing Sandbox

For safe testing of Labcommitr commands without affecting your real repository, use the testing sandbox:

```bash
# Create sandbox with config (if available)
pnpm run test:sandbox

# Create sandbox without config (start from scratch)
pnpm run test:sandbox:bare

# Quick reset for iterative testing
pnpm run test:sandbox:reset

# Clean up
pnpm run test:sandbox:clean
```

See [`scripts/README.md`](scripts/README.md) for complete testing documentation.
