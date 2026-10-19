import { useCallback, useEffect, useRef, useState } from "react";
import { InferenceQueue, Segmenter } from "../lib/streaming";
import type { AudioJob, Metric, Segment, Settings } from "../lib/types";
export type Phase =
  | "idle"
  | "loading"
  | "ready"
  | "listening"
  | "finishing"
  | "error";
type Callbacks = {
  onSegment: (segment: Segment) => void;
  onMetric: (metric: Metric) => void;
  onEnd: (seconds: number) => void;
};
export function useTranscriber(callbacks: Callbacks) {
  const cb = useRef(callbacks);
  cb.current = callbacks;
  const mounted = useRef(true);
  const [phase, setPhase] = useState<Phase>("idle"),
    [message, setMessage] = useState(""),
    [progress, setProgress] = useState({ file: "", value: 0 }),
    [device, setDevice] = useState(""),
    [level, setLevel] = useState(0),
    [seconds, setSeconds] = useState(0),
    [pending, setPending] = useState(0);
  const worker = useRef<Worker | null>(null),
    loaded = useRef(""),
    settings = useRef<Settings | null>(null);
  const audio = useRef<{
    context: AudioContext;
    stream: MediaStream;
    node: AudioWorkletNode;
    source: MediaStreamAudioSourceNode;
    gain: GainNode;
  } | null>(null);
  const active = useRef(false),
    starting = useRef(false),
    finishing = useRef(false),
    flushing = useRef(false),
    segmenter = useRef<Segmenter | null>(null),
    queue = useRef(new InferenceQueue());
  const flight = useRef<{
      job: AudioJob;
      sent: number;
      requestId: number;
    } | null>(null),
    request = useRef(0),
    firstText = useRef(new Set<number>()),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useRef<(() => void) | null>(null);
  const stopRef = useRef<() => Promise<void>>(async () => {});
  const cleanup = useCallback(() => {
    const a = audio.current;
    audio.current = null;
    if (a) {
      a.node.port.onmessage = null;
      a.node.disconnect();
      a.source.disconnect();
      a.gain.disconnect();
      a.stream.getTracks().forEach((t) => t.stop());
      void a.context.close();
    }
    setLevel(0);
  }, []);
  const complete = useCallback(() => {
    if (
      finishing.current &&
      !flushing.current &&
      !flight.current &&
      !queue.current.size
    ) {
      finishing.current = false;
      setPhase("ready");
      setPending(0);
      cb.current.onEnd(segmenter.current?.seconds ?? 0);
    }
  }, []);
  const fail = useCallback(
    (text: string) => {
      const wasRecording = active.current || finishing.current;
      active.current = false;
      starting.current = false;
      finishing.current = false;
      flushing.current = false;
      cleanup();
      queue.current.clear();
      flight.current = null;
      if (timer.current) clearTimeout(timer.current);
      worker.current?.terminate();
      worker.current = null;
      loaded.current = "";
      setPending(0);
      setMessage(
        text +
          " Audio yang belum selesai diproses tidak disimpan; segmen sementara mungkin belum lengkap.",
      );
      setPhase("error");
      if (wasRecording) cb.current.onEnd(segmenter.current?.seconds ?? 0);
    },
    [cleanup],
  );
  const pumpRef = useRef<() => void>(() => {});
  pumpRef.current = () => {
    if (flight.current || !worker.current) return;
    const job = queue.current.next();
    setPending(queue.current.size);
    if (!job) {
      complete();
      return;
    }
    const requestId = ++request.current;
    flight.current = { job, sent: performance.now(), requestId };
    timer.current = setTimeout(
      () =>
        fail(
          "Inference melewati batas 120 detik. Audio dihentikan; teks yang sudah muncul tetap tersedia. Coba model Tiny dengan CPU atau perangkat lebih cepat.",
        ),
      120000,
    );
    worker.current.postMessage({
      type: "transcribe",
      job,
      requestId,
      language: settings.current?.language,
    });
  };
  const ensureWorker = useCallback(() => {
    if (worker.current) return worker.current;
    const w = new Worker(new URL("../workers/asr.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onerror = () =>
      fail(
        "Worker ASR gagal. Muat ulang model atau gunakan browser desktop Chrome/Edge terbaru.",
      );
    w.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.type === "progress")
        setProgress({ file: d.file, value: Math.round(d.progress ?? 0) });
      if (d.type === "fallback")
        setMessage(
          "WebGPU gagal di perangkat ini. Model sedang dimuat ulang menggunakan CPU.",
        );
      if (d.type === "ready") {
        if (timer.current) clearTimeout(timer.current);
        loaded.current = settings.current!.model + settings.current!.device;
        setDevice(d.device);
        setPhase("ready");
        setProgress({ file: "Siap", value: 100 });
      }
      if (d.type === "error")
        fail(
          `ASR gagal: ${String(d.message).slice(0, 350)}. Periksa koneksi unduhan, memori, atau pilih CPU.`,
        );
      if (d.type === "result") {
        const f = flight.current;
        if (!f || f.requestId !== d.requestId) return;
        if (timer.current) clearTimeout(timer.current);
        const now = performance.now(),
          job = f.job;
        cb.current.onSegment({
          id: job.id,
          start: job.start,
          end: job.end,
          text: d.text,
          final: job.final,
          bookmark: false,
        });
        const first =
          d.text && !firstText.current.has(job.id)
            ? now - job.segmentStartedAt
            : null;
        if (d.text) firstText.current.add(job.id);
        cb.current.onMetric({
          segmentId: job.id,
          final: job.final,
          audioSeconds: job.audio.length / 16000,
          inferenceMs: d.inferenceMs,
          queueMs: f.sent - job.capturedAt,
          updateDelayMs: now - job.capturedAt,
          firstTextMs: first,
          rtf: d.inferenceMs / (job.audio.length / 16),
        });
        flight.current = null;
        pumpRef.current();
      }
    };
    return w;
  }, [fail]);
  const load = useCallback(
    (s: Settings) => {
      if (active.current || starting.current || finishing.current) return;
      settings.current = s;
      setMessage("");
      setPhase("loading");
      setProgress({ file: "Menghubungkan ke sumber model…", value: 0 });
      const w = ensureWorker();
      timer.current = setTimeout(
        () =>
          fail(
            "Unduhan model melewati batas 5 menit. Periksa internet lalu coba kembali.",
          ),
        300000,
      );
      w.postMessage({ type: "load", settings: s });
    },
    [ensureWorker, fail],
  );
  const cancelLoad = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
    loaded.current = "";
    if (timer.current) clearTimeout(timer.current);
    setPhase("idle");
    setMessage("Pemuatan dibatalkan.");
  }, []);
  const stop = useCallback(async () => {
    if (!active.current) return;
    active.current = false;
    finishing.current = true;
    flushing.current = true;
    setPhase("finishing");
    const a = audio.current;
    if (a)
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          flush.current = null;
          resolve();
        };
        flush.current = finish;
        a.node.port.postMessage("flush");
        setTimeout(finish, 500);
      });
    cleanup();
    segmenter.current?.finish(performance.now());
    flushing.current = false;
    pumpRef.current();
    complete();
  }, [cleanup, complete]);
  stopRef.current = stop;
  const start = useCallback(
    async (s: Settings) => {
      if (active.current || starting.current || finishing.current) return false;
      if (loaded.current !== s.model + s.device) {
        setMessage("Muat model sesuai pengaturan terlebih dahulu.");
        return false;
      }
      starting.current = true;
      setMessage("");
      let stream: MediaStream | null = null;
      let context: AudioContext | null = null;
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Mikrofon memerlukan HTTPS atau localhost serta browser yang mendukung.",
          );
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        if (!mounted.current) {
          stream.getTracks().forEach((t) => t.stop());
          return false;
        }
        context = new AudioContext({ sampleRate: 16000 });
        await context.resume();
        await context.audioWorklet.addModule("/audio-processor.js");
        if (!mounted.current) {
          stream.getTracks().forEach((t) => t.stop());
          void context.close();
          return false;
        }
        if (context.state !== "running")
          throw new Error("AudioContext tidak aktif. Klik Mulai sesi lagi.");
        const node = new AudioWorkletNode(context, "pcm-processor");
        const source = context.createMediaStreamSource(stream);
        const gain = context.createGain();
        gain.gain.value = 0;
        audio.current = { context, stream, node, source, gain };
        settings.current = s;
        queue.current.clear();
        firstText.current.clear();
        setSeconds(0);
        setPending(0);
        segmenter.current = new Segmenter((job) => {
          queue.current.push(job);
          setPending(queue.current.size);
          pumpRef.current();
          if (queue.current.finals.length >= 3 && active.current) {
            setMessage(
              "Perangkat tertinggal memproses audio. Perekaman dihentikan otomatis agar antrean dapat diselesaikan. Gunakan Tiny / WebGPU untuk sesi berikutnya.",
            );
            void stopRef.current();
          }
        }, s.threshold);
        node.port.onmessage = (e: MessageEvent) => {
          if (e.data === "flushed") {
            flush.current?.();
            return;
          }
          if (!(e.data instanceof Float32Array)) return;
          const data = e.data;
          segmenter.current?.feed(data, performance.now());
          setSeconds(segmenter.current?.seconds ?? 0);
          setLevel(
            Math.min(
              1,
              Math.sqrt(data.reduce((v, x) => v + x * x, 0) / data.length) * 8,
            ),
          );
        };
        stream.getAudioTracks().forEach((t) =>
          t.addEventListener(
            "ended",
            () => {
              setMessage("Mikrofon terputus. Sesi diakhiri.");
              void stopRef.current();
            },
            { once: true },
          ),
        );
        context.onstatechange = () => {
          if (context?.state === "suspended" && active.current) {
            setMessage(
              "Audio dijeda oleh browser. Sesi diakhiri agar tidak ada jeda yang tersembunyi.",
            );
            void stopRef.current();
          }
        };
        active.current = true;
        starting.current = false;
        source.connect(node);
        node.connect(gain);
        gain.connect(context.destination);
        setPhase("listening");
        return true;
      } catch (error) {
        stream?.getTracks().forEach((t) => t.stop());
        if (context && context.state !== "closed") void context.close();
        starting.current = false;
        cleanup();
        const err = error as Error;
        setMessage(
          err.name === "NotAllowedError"
            ? "Akses mikrofon ditolak. Izinkan mikrofon di pengaturan situs lalu coba lagi."
            : err.name === "NotFoundError"
              ? "Mikrofon tidak ditemukan. Hubungkan mikrofon lalu coba lagi."
              : err.message,
        );
        setPhase("ready");
        return false;
      }
    },
    [cleanup],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current = false;
      worker.current?.terminate();
      worker.current = null;
      loaded.current = "";
      if (timer.current) clearTimeout(timer.current);
      const a = audio.current;
      if (a) {
        a.stream.getTracks().forEach((t) => t.stop());
        void a.context.close();
        audio.current = null;
      }
    };
  }, []);
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (active.current || finishing.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);
  return {
    phase,
    message,
    progress,
    device,
    level,
    seconds,
    pending,
    load,
    start,
    stop,
    cancelLoad,
    modelReady: (s: Settings) => loaded.current === s.model + s.device,
  };
}
