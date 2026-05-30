# AGENTS.md

Guidance for AI agents working in the TouseOS repository.

## Project status

TouseOS is a **greenfield** repository. As of the initial commit, the only tracked file is `README.md` (title: `# TouseOS`). There is no application source, build system, tests, or service definitions yet.

## Cursor Cloud specific instructions

### What exists today

- No `package.json`, `Makefile`, `Cargo.toml`, Docker Compose, or CI configuration.
- No lint, test, build, or dev scripts in the repo.
- **No services to start** until project structure and a runtime (e.g. kernel + userspace, or another stack) are added.

### VM toolchain (prepared for OS-style development)

The cloud VM is expected to have a general native toolchain available without repo-specific install steps:

| Tool | Typical use |
|------|-------------|
| `gcc` / `g++` / `make` / `ld` | C/C++ builds |
| `nasm` | x86 assembly |
| `qemu-system-x86_64` | Boot/run images in emulation |
| `grub-pc-bin`, `xorriso`, `mtools` | Bootable ISO / disk image workflows |
| `python3`, `node`/`npm`, `rustc`/`cargo`, `go` | Auxiliary tooling when added to the project |

After the VM update script runs, there is **nothing to install from the repository** until dependency manifests or setup scripts are committed.

### Smoke verification (when no app exists yet)

If the repo still has no build targets, agents can confirm the environment with:

```bash
gcc -Wall -o /tmp/smoke /tmp/smoke.c   # after writing a minimal main()
/tmp/smoke
qemu-system-x86_64 --version
nasm --version
```

Do not treat this as running TouseOS itself—only as toolchain health checks.

### When code lands

Update this section with the real commands once the project adds them, for example:

- Dependency install (e.g. `make deps`, `npm install`, `cargo fetch`)
- Build: `make`, `cargo build`, etc.
- Test: `make test`, `cargo test`, etc.
- Run/boot: QEMU command line, dev server, etc.

Document which processes are **required** vs **optional** for end-to-end validation.
