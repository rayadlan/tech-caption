import type { AudioJob } from "./types";
export const SAMPLE_RATE = 16000;
/** Bounded utterances; partial snapshots replace the same segment, never append. */
export class Segmenter {
  private parts: Float32Array[] = [];
  private length = 0;
  private silence = 0;
  private voiced = 0;
  private lastPartial = 0;
  private offset = 0;
  private start = 0;
  private id = 0;
  private started = 0;
  private pre: Float32Array[] = [];
  constructor(
    private emit: (job: AudioJob) => void,
    private threshold = 0.008,
  ) {}
  feed(samples: Float32Array, now: number) {
    const rms = Math.sqrt(
      samples.reduce((s, v) => s + v * v, 0) / samples.length,
    );
    const speech = rms >= this.threshold;
    if (!this.length && !speech) {
      this.pre.push(samples);
      if (this.pre.length > 3) this.pre.shift();
      this.offset += samples.length;
      return;
    }
    if (!this.length) {
      const prefix = this.pre.reduce((s, p) => s + p.length, 0);
      this.start = (this.offset - prefix) / SAMPLE_RATE;
      this.started = now - ((prefix + samples.length) / SAMPLE_RATE) * 1000;
      this.parts = this.pre;
      this.pre = [];
      this.length = prefix;
    }
    this.parts.push(samples);
    this.length += samples.length;
    this.offset += samples.length;
    if (speech) {
      this.silence = 0;
      this.voiced += samples.length;
    } else this.silence += samples.length;
    if (this.length >= 12 * SAMPLE_RATE || this.silence >= 0.8 * SAMPLE_RATE) {
      this.finish(now);
    } else if (
      this.voiced >= 0.25 * SAMPLE_RATE &&
      this.length - this.lastPartial >= 2 * SAMPLE_RATE
    ) {
      this.emitJob(false, now);
      this.lastPartial = this.length;
    }
  }
  private emitJob(final: boolean, now: number) {
    const audio = new Float32Array(this.length);
    let p = 0;
    for (const part of this.parts) {
      audio.set(part, p);
      p += part.length;
    }
    this.emit({
      id: this.id,
      audio,
      start: this.start,
      end: this.start + audio.length / SAMPLE_RATE,
      final,
      capturedAt: now,
      segmentStartedAt: this.started,
    });
  }
  finish(now: number) {
    if (this.length && this.voiced >= 0.15 * SAMPLE_RATE)
      this.emitJob(true, now);
    this.parts = [];
    this.length = 0;
    this.voiced = 0;
    this.silence = 0;
    this.lastPartial = 0;
    this.id++;
  }
  get seconds() {
    return this.offset / SAMPLE_RATE;
  }
}
/** Final jobs are never replaced. Only the latest partial per segment is kept. */
export class InferenceQueue {
  finals: AudioJob[] = [];
  partial: AudioJob | null = null;
  push(job: AudioJob) {
    if (job.final) {
      this.finals.push(job);
      if (this.partial?.id === job.id) this.partial = null;
    } else this.partial = job;
  }
  next() {
    return this.finals.shift() ?? this.takePartial();
  }
  private takePartial() {
    const p = this.partial;
    this.partial = null;
    return p;
  }
  get size() {
    return this.finals.length + (this.partial ? 1 : 0);
  }
  clear() {
    this.finals = [];
    this.partial = null;
  }
}
