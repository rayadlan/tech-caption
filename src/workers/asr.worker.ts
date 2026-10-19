import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";
import { MODEL_REVISIONS } from "../lib/model-config";
import type { AudioJob, Settings } from "../lib/types";
env.allowLocalModels = false;
env.useBrowserCache = true;
// One WASM thread avoids relying on cross-origin isolation headers for model downloads.
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loadedKey = "";
let device = "wasm";
const send = (data: unknown) => self.postMessage(data);
self.onmessage = async (event: MessageEvent) => {
  const data = event.data;
  try {
    if (data.type === "load") {
      const settings = data.settings as Settings;
      const key = settings.model + settings.device;
      if (transcriber && key === loadedKey) {
        send({ type: "ready", device });
        return;
      }
      if (transcriber) {
        await transcriber.dispose();
        transcriber = null;
      }
      device =
        settings.device === "wasm"
          ? "wasm"
          : "gpu" in navigator
            ? "webgpu"
            : "wasm";
      if (settings.device === "webgpu" && device !== "webgpu")
        throw new Error("WebGPU tidak tersedia. Pilih Otomatis atau CPU.");
      const create = async (useGPU: boolean) =>
        pipeline(
          "automatic-speech-recognition",
          `onnx-community/whisper-${settings.model}`,
          {
            device: useGPU ? "webgpu" : "wasm",
            revision: MODEL_REVISIONS[settings.model],
            dtype: useGPU
              ? { encoder_model: "fp32", decoder_model_merged: "q4" }
              : "q8",
            progress_callback: (p) => {
              if (p.status === "progress")
                send({ type: "progress", file: p.file, progress: p.progress });
              else if (p.status === "initiate")
                send({ type: "progress", file: p.file, progress: 0 });
            },
          },
        );
      try {
        transcriber = await create(device === "webgpu");
      } catch (err) {
        if (settings.device !== "auto" || device === "wasm") throw err;
        device = "wasm";
        send({ type: "fallback" });
        transcriber = await create(false);
      }
      loadedKey = key;
      send({ type: "ready", device });
    }
    if (data.type === "transcribe") {
      if (!transcriber) throw new Error("Model belum siap.");
      const job = data.job as AudioJob;
      const t = performance.now();
      const result = await transcriber(job.audio, {
        language: data.language,
        task: "transcribe",
        return_timestamps: false,
        do_sample: false,
        num_beams: 1,
        max_new_tokens: 192,
      });
      const text = (
        Array.isArray(result) ? result[0].text : result.text
      ).trim();
      send({
        type: "result",
        requestId: data.requestId,
        text,
        inferenceMs: performance.now() - t,
      });
    }
  } catch (error) {
    send({
      type: "error",
      requestId: data.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
