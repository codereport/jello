// Shared by the browser worker and the native/Wasm conformance tests.
export async function createEvaluator(bytes) {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const { memory, engine_alloc: allocate, engine_free: free, engine_evaluate: evaluate } = instance.exports;
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  return (request) => {
    const input = encoder.encode(JSON.stringify(request));
    const pointer = allocate(input.length);
    let outputPointer, outputLength;
    try {
      new Uint8Array(memory.buffer, pointer, input.length).set(input);
      const packed = BigInt.asUintN(64, evaluate(pointer, input.length));
      outputPointer = Number(packed >> 32n);
      outputLength = Number(packed & 0xffffffffn);
      return JSON.parse(decoder.decode(new Uint8Array(memory.buffer, outputPointer, outputLength)));
    } finally {
      // Evaluation can grow memory; always use the current buffer above.
      free(pointer, input.length);
      if (outputPointer !== undefined) free(outputPointer, outputLength);
    }
  };
}
