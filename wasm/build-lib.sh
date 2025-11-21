#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CRATE_DIR="$ROOT_DIR/wasm"
TARGET_DIR="$CRATE_DIR/target/wasm32-unknown-unknown/release"
OUT_DIR="$ROOT_DIR/build"

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required to build the WASM module" >&2
  exit 1
fi

if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "wasm-bindgen CLI is required. Install it with 'cargo install wasm-bindgen-cli'." >&2
  exit 1
fi

rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true

export RUSTFLAGS="${RUSTFLAGS-} --cfg getrandom_backend=\"wasm_js\""

cargo build --manifest-path "$CRATE_DIR/Cargo.toml" --target wasm32-unknown-unknown --release

wasm-bindgen "$TARGET_DIR/m.wasm" --out-dir "$OUT_DIR" --target web
