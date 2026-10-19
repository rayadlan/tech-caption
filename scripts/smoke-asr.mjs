// Optional native CPU smoke test. It does not verify browser WebGPU/microphone behavior.
// Input: raw mono 16 kHz little-endian float32 PCM, e.g. ffmpeg -i audio.wav -ar 16000 -ac 1 -f f32le audio.f32le
import { readFile } from "node:fs/promises";
import { pipeline, env } from "@huggingface/transformers";
if (!process.argv[2])
  throw new Error(
    "Usage: node scripts/smoke-asr.mjs audio.f32le [indonesian|english]",
  );
env.cacheDir = ".model-cache";
const bytes = await readFile(process.argv[2]);
const samples = new Float32Array(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
if (samples.length > 16000 * 30)
  throw new Error("Use an audio sample of at most 30 seconds.");
const model = await pipeline(
  "automatic-speech-recognition",
  "onnx-community/whisper-tiny",
  { device: "cpu", dtype: "q8" },
);
const t = performance.now();
const result = await model(samples, {
  language: process.argv[3] || "indonesian",
  task: "transcribe",
  return_timestamps: false,
  num_beams: 1,
  do_sample: false,
  max_new_tokens: 192,
});
console.log(
  JSON.stringify(
    {
      runtime: "Node CPU (not browser)",
      model: "onnx-community/whisper-tiny",
      dtype: "q8",
      audioSeconds: samples.length / 16000,
      inferenceMs: performance.now() - t,
      result,
    },
    null,
    2,
  ),
);
await model.dispose();
