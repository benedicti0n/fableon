# Vendored Rigby2D

This directory contains the source subset required to run the Rigby2D MCP server.

- Upstream: `https://github.com/jaisurya-dev-art/rigby2d`
- Pinned commit: `307f7bf00d086a776b4a3c88c6fcca6fab97c531`
- Version: `0.5.1`
- License: MIT OR Apache-2.0 (see `LICENSE-MIT`, `LICENSE-APACHE`)
- Vendored: `src/`, `package.json`, license files, third-party notices.

The Fableon runtime verifies `PINNED_COMMIT`, `package.json` version, and `SOURCE_SHA256` before
spawning the server. Do not edit the vendored source without updating the pin and hash.

Only the MCP stdio server is used. The Tauri desktop shell, editor UI, Pyodide scripting runtime,
and local Whisper worker are not part of the Fableon integration.
