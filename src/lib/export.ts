import type { Session } from "./types";
export function clock(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
}
export function srtTime(s: number) {
  const ms = Math.round(s * 1000);
  return `${Math.floor(ms / 3600000)
    .toString()
    .padStart(
      2,
      "0",
    )}:${Math.floor(ms / 60000) % 60 < 10 ? "0" : ""}${Math.floor(ms / 60000) % 60}:${Math.floor(ms / 1000) % 60 < 10 ? "0" : ""}${Math.floor(ms / 1000) % 60},${(ms % 1000).toString().padStart(3, "0")}`;
}
export function download(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function transcriptText(s: Session) {
  return (
    `${s.title}\n${new Date(s.createdAt).toLocaleString("id-ID")}\n${s.demo ? "CONTOH DEMO — bukan hasil ASR\n" : ""}Model: Whisper ${s.model} | ${s.language} | ${s.device}\n\n` +
    s.segments
      .map(
        (x) =>
          `[${clock(x.start)}] ${x.bookmark ? "★ " : ""}${x.text}${x.final ? "" : " [sementara]"}`,
      )
      .join("\n\n") +
    `\n\nCatatan\n${s.notes}`
  );
}
export function exportSession(s: Session, format: "txt" | "srt" | "json") {
  const name =
    s.title.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 60) || "TechCaption";
  if (format === "txt") download(`${name}.txt`, transcriptText(s));
  if (format === "json")
    download(
      `${name}.json`,
      JSON.stringify({ schemaVersion: 1, ...s }, null, 2),
      "application/json",
    );
  if (format === "srt")
    download(
      `${name}.srt`,
      s.segments
        .filter((x) => x.final && x.text.trim())
        .map(
          (x, i) =>
            `${i + 1}\n${srtTime(x.start)} --> ${srtTime(x.end)}\n${x.text}\n`,
        )
        .join("\n"),
    );
}
export function csv(rows: (string | number | null)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((v) => {
            let s = String(v ?? "");
            if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
            return '"' + s.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function exportMetrics(s: Session) {
  download(
    "TechCaption-metrics.csv",
    csv([
      [
        "session",
        "model",
        "device",
        "segment",
        "final",
        "audio_seconds",
        "inference_ms",
        "queue_ms",
        "update_delay_ms",
        "first_text_ms",
        "rtf",
      ],
      ...s.metrics.map((m) => [
        s.id,
        s.model,
        s.device,
        m.segmentId,
        String(m.final),
        m.audioSeconds,
        m.inferenceMs,
        m.queueMs,
        m.updateDelayMs,
        m.firstTextMs,
        m.rtf,
      ]),
    ]),
    "text/csv;charset=utf-8",
  );
}
