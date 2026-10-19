import { z } from "zod";
import { ASR_ENGINE_VERSION, MODEL_REVISIONS } from "./model-config";
export const segmentSchema = z.object({
  id: z.number().int().nonnegative(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string().max(20000),
  final: z.boolean(),
  bookmark: z.boolean().default(false),
});
export const metricSchema = z.object({
  segmentId: z.number(),
  final: z.boolean(),
  audioSeconds: z.number(),
  inferenceMs: z.number(),
  queueMs: z.number(),
  updateDelayMs: z.number(),
  firstTextMs: z.number().nullable(),
  rtf: z.number(),
});
export const sessionSchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  createdAt: z.string(),
  language: z.enum(["indonesian", "english"]),
  model: z.enum(["tiny", "base"]),
  device: z.string(),
  engineVersion: z.string().default(ASR_ENGINE_VERSION),
  modelRevision: z.string().default("unrecorded"),
  demo: z.boolean(),
  duration: z.number(),
  segments: z.array(segmentSchema).max(10000),
  metrics: z.array(metricSchema).max(20000),
  notes: z.string().max(20000),
});
export const termSchema = z.object({
  term: z.string().min(1).max(80),
  definition: z.string().max(400),
});
export type Segment = z.infer<typeof segmentSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Term = z.infer<typeof termSchema>;
export type ModelSize = "tiny" | "base";
export type Language = "indonesian" | "english";
export type Device = "auto" | "wasm" | "webgpu";
export type Settings = {
  model: ModelSize;
  language: Language;
  device: Device;
  threshold: number;
};
export type AudioJob = {
  id: number;
  audio: Float32Array;
  start: number;
  end: number;
  final: boolean;
  capturedAt: number;
  segmentStartedAt: number;
};
export const defaultSettings: Settings = {
  model: "tiny",
  language: "indonesian",
  device: "auto",
  threshold: 0.008,
};
export function createSession(settings: Settings): Session {
  return {
    id: crypto.randomUUID(),
    title: "Kuliah tanpa judul",
    createdAt: new Date().toISOString(),
    language: settings.language,
    model: settings.model,
    device: "Belum dimuat",
    engineVersion: ASR_ENGINE_VERSION,
    modelRevision: MODEL_REVISIONS[settings.model],
    demo: false,
    duration: 0,
    segments: [],
    metrics: [],
    notes: "",
  };
}
