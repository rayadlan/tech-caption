import { describe, it, expect } from "vitest";
import { wordErrorRate, technicalTermError } from "../src/lib/metrics";
import { Segmenter, InferenceQueue } from "../src/lib/streaming";
import { termParts } from "../src/lib/glossary";
import { csv, srtTime, exportSession } from "../src/lib/export";
import {
  createSession,
  defaultSettings,
  type AudioJob,
} from "../src/lib/types";
import {
  saveSession,
  readSessions,
  deleteSession,
  SESSION_KEY,
} from "../src/lib/storage";
describe("word error alignment", () => {
  it("normalizes case and punctuation", () =>
    expect(wordErrorRate("Hello, World!", "hello world").wer).toBe(0));
  it("counts substitution deletion insertion", () => {
    const r = wordErrorRate("a b c d", "a x c e f");
    expect(r.S).toBe(2);
    expect(r.I).toBe(1);
    expect(r.D).toBe(0);
    expect(r.wer).toBe(0.75);
  });
  it("counts missing speech and empty hypotheses", () => {
    expect(wordErrorRate("neural network", "").D).toBe(2);
    expect(wordErrorRate("a b c", "a c").D).toBe(1);
  });
  it("does not clamp WER to 100%", () =>
    expect(wordErrorRate("a", "a b c").wer).toBe(2));
  it("rejects an empty reference and oversized inputs", () => {
    expect(() => wordErrorRate("", "a")).toThrow();
    expect(() => wordErrorRate("a ".repeat(1501), "a")).toThrow();
  });
  it("reports technical multiword errors including internal insertions", () => {
    const r = wordErrorRate(
      "use machine learning and neural network",
      "use machine fast learning and neural networks",
    );
    expect(
      technicalTermError(r.alignment, ["machine learning", "neural network"]),
    ).toEqual({ total: 2, errors: 2, rate: 1 });
  });
  it("reports N/A when reference has no glossary terms", () =>
    expect(
      technicalTermError(wordErrorRate("a", "a").alignment, ["network"]).rate,
    ).toBeNull());
});
describe("streaming segmentation", () => {
  const speech = () => new Float32Array(1600).fill(0.1),
    silence = () => new Float32Array(1600);
  it("emits partials during continuous speech, before final", () => {
    const jobs: AudioJob[] = [];
    const s = new Segmenter((j) => jobs.push(j));
    for (let i = 0; i < 45; i++) s.feed(speech(), i * 100);
    expect(jobs.map((j) => j.final)).toEqual([false, false]);
    expect(jobs.map((j) => j.audio.length)).toEqual([32000, 64000]);
    s.finish(4500);
    expect(jobs.at(-1)!.final).toBe(true);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(1);
  });
  it("does not transcribe silence", () => {
    const jobs: AudioJob[] = [];
    const s = new Segmenter((j) => jobs.push(j));
    for (let i = 0; i < 100; i++) s.feed(silence(), i * 100);
    s.finish(10000);
    expect(jobs).toHaveLength(0);
    expect(s.seconds).toBe(10);
  });
  it("commits an utterance after 800ms silence with pre-roll", () => {
    const jobs: AudioJob[] = [];
    const s = new Segmenter((j) => jobs.push(j));
    for (let i = 0; i < 10; i++) s.feed(silence(), i * 100);
    for (let i = 0; i < 10; i++) s.feed(speech(), 1000 + i * 100);
    for (let i = 0; i < 8; i++) s.feed(silence(), 2000 + i * 100);
    expect(jobs.at(-1)?.final).toBe(true);
    expect(jobs.at(-1)?.start).toBe(0.7);
    expect(jobs.at(-1)?.end).toBeCloseTo(2.8);
  });
  it("bounds continuous utterances to 12 seconds and advances IDs", () => {
    const jobs: AudioJob[] = [];
    const s = new Segmenter((j) => jobs.push(j));
    for (let i = 0; i < 140; i++) s.feed(speech(), i * 100);
    expect(jobs.filter((j) => j.final)).toHaveLength(1);
    expect(jobs.find((j) => j.final)?.audio.length).toBe(192000);
    expect(jobs.at(-1)?.id).toBe(1);
    expect(jobs.at(-1)?.start).toBe(12);
  });
  it("keeps short final speech on stop", () => {
    const jobs: AudioJob[] = [];
    const s = new Segmenter((j) => jobs.push(j));
    s.feed(speech(), 100);
    s.feed(speech(), 200);
    s.finish(200);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].audio.length).toBe(3200);
  });
  it("preserves every final while coalescing partial snapshots", () => {
    const q = new InferenceQueue();
    const j = (id: number, final: boolean): AudioJob => ({
      id,
      final,
      audio: speech(),
      start: 0,
      end: 1,
      capturedAt: 0,
      segmentStartedAt: 0,
    });
    q.push(j(0, false));
    q.push(j(0, false));
    expect(q.size).toBe(1);
    q.push(j(0, true));
    q.push(j(1, false));
    q.push(j(1, true));
    q.push(j(2, false));
    expect(q.size).toBe(3);
    expect([q.next()?.id, q.next()?.id, q.next()?.id]).toEqual([0, 1, 2]);
  });
});
describe("local persistence and export", () => {
  it("roundtrips notes, bookmarks, and raw metrics without duplication", () => {
    const s = createSession(defaultSettings);
    s.notes = "test";
    saveSession(s);
    s.notes = "updated";
    saveSession(s);
    expect(readSessions()).toHaveLength(1);
    expect(readSessions()[0].notes).toBe("updated");
    deleteSession(s.id);
    expect(readSessions()).toEqual([]);
  });
  it("does not overwrite malformed existing storage", () => {
    localStorage.setItem(SESSION_KEY, "broken");
    expect(() => saveSession(createSession(defaultSettings))).toThrow();
    expect(localStorage.getItem(SESSION_KEY)).toBe("broken");
  });
  it("preserves SRT hours and millisecond carry", () => {
    expect(srtTime(3661.234)).toBe("01:01:01,234");
    expect(srtTime(59.9999)).toBe("00:01:00,000");
  });
  it("escapes CSV and neutralizes spreadsheet formulas", () => {
    expect(csv([["=1+2", 'hello,"world"']])).toContain(
      '"\'=1+2","hello,""world"""',
    );
  });
  it("exports are available without a server", () =>
    expect(typeof exportSession).toBe("function"));
});
describe("glossary matching", () => {
  it("matches full terms without changing text or accidental substring matches", () => {
    const parts = termParts("API, rapid API and C++", [
      { term: "API", definition: "test" },
      { term: "C++", definition: "language" },
    ]);
    expect(parts.map((p) => p.text).join("")).toBe("API, rapid API and C++");
    expect(parts.filter((p) => p.term)).toHaveLength(3);
  });
  it("handles regex symbols and chooses longest match", () => {
    expect(
      termParts("neural network", [
        { term: "neural", definition: "" },
        { term: "neural network", definition: "" },
      ]).filter((p) => p.term),
    ).toHaveLength(1);
  });
});
