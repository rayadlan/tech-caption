// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
describe("real AudioWorklet source PCM resampling", () => {
  for (const rate of [16000, 44100, 48000])
    it(`converts ${rate} Hz to 16k without drift`, () => {
      const messages: (Float32Array | string)[] = [];
      let Processor: any;
      class Base {
        port = {
          onmessage: null as any,
          postMessage: (data: any) => messages.push(data),
        };
      }
      runInNewContext(readFileSync("public/audio-processor.js", "utf8"), {
        AudioWorkletProcessor: Base,
        sampleRate: rate,
        Float32Array,
        registerProcessor: (_name: string, p: any) => {
          Processor = p;
        },
      });
      const p = new Processor();
      let remaining = rate;
      while (remaining) {
        const n = Math.min(128, remaining);
        p.process([
          [new Float32Array(n).fill(0.25), new Float32Array(n).fill(0.75)],
        ]);
        remaining -= n;
      }
      p.port.onmessage({ data: "flush" });
      const arrays = messages.filter(
        (m) => typeof m !== "string",
      ) as Float32Array[];
      expect(arrays.reduce((sum, a) => sum + a.length, 0)).toBe(16000);
      for (const a of arrays)
        expect([...a].every((x) => Math.abs(x - 0.5) < 0.00001)).toBe(true);
      expect(messages.at(-1)).toBe("flushed");
      expect(p.process([])).toBe(false);
    });
});
