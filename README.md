# `@labcatr/labcommitr`

A solution for building standardized git commits!

**Labcommitr** is used internally for all @labcatr projects. However, feel free to use it for your own projects!

## Plans

**Command**: `labcommitr` (alias `lc`)

### Commands

`labcommitr commit` : Start a `labcommitr` commit builder.

`labcommitr init`, `-i`: Create a file called `.labcommitrc` in the root directory of the current git repo.

weee `labcommitr go <type> [...message]`: Quickly submit a commit of the specified type with a message. If a message is not specified, a generic one will be generated for you (it is not good practice, however its BLAZINGLY FAST).
