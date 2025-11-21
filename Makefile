WASM_SCRIPT := ./wasm/build-lib.sh

.PHONY: wasm wasm-clean build

build: wasm

wasm:
	$(WASM_SCRIPT)

wasm-clean:
	rm -rf wasm/target
	rm -f build/m.js build/m_bg.wasm build/m.d.ts build/m_bg.wasm.d.ts
