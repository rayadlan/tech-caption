import { useState } from "react";
import {
  BarChart3,
  Download,
  FlaskConical,
  ArrowRight,
  Check,
  Users,
} from "lucide-react";
import { wordErrorRate, technicalTermError, percentile } from "../lib/metrics";
import { csv, download, exportMetrics } from "../lib/export";
import type { Session, Term } from "../lib/types";
type Props = {
  session: Session;
  terms: Term[];
  notify: (text: string) => void;
};
export default function Evaluation({ session, terms, notify }: Props) {
  const [reference, setReference] = useState(""),
    [hypothesis, setHypothesis] = useState(""),
    [condition, setCondition] = useState("baseline"),
    [sample, setSample] = useState(""),
    [result, setResult] = useState<ReturnType<typeof wordErrorRate> | null>(
      null,
    ),
    [termResult, setTermResult] = useState<ReturnType<
      typeof technicalTermError
    > | null>(null),
    [error, setError] = useState("");
  const [participant, setParticipant] = useState(""),
    [task, setTask] = useState(""),
    [ratings, setRatings] = useState(["", "", "", ""]),
    [observation, setObservation] = useState(""),
    [feedback, setFeedback] = useState("");
  function calculate() {
    try {
      if (!sample.trim())
        throw new Error("Isi kode sampel agar hasil dapat ditelusuri.");
      const r = wordErrorRate(reference, hypothesis);
      const t = technicalTermError(
        r.alignment,
        terms.map((t) => t.term),
      );
      setResult(r);
      setTermResult(t);
      setError("");
      const raw = JSON.parse(
        localStorage.getItem("techcaption.evaluations.v1") || "[]",
      );
      if (!Array.isArray(raw))
        throw new Error("Format riwayat evaluasi tidak valid.");
      const rows = [
        ...raw,
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          sample,
          condition,
          reference,
          hypothesis,
          ...r,
          technicalTerms: t,
        },
      ];
      if (rows.length > 200)
        throw new Error(
          "Batas 200 pengukuran tercapai. Ekspor data lalu kelola penyimpanan browser.",
        );
      localStorage.setItem("techcaption.evaluations.v1", JSON.stringify(rows));
      notify("Hasil evaluasi disimpan di browser.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function exportEvaluations() {
    try {
      const rows = JSON.parse(
        localStorage.getItem("techcaption.evaluations.v1") || "[]",
      );
      if (!rows.length) {
        notify("Belum ada hasil evaluasi.");
        return;
      }
      download(
        "TechCaption-evaluations.json",
        JSON.stringify({ schemaVersion: 1, measurements: rows }, null, 2),
        "application/json",
      );
    } catch {
      notify("Data evaluasi tidak dapat dibaca.");
    }
  }
  function saveFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (
      !participant.trim() ||
      !task.trim() ||
      !observation.trim() ||
      !feedback.trim()
    ) {
      notify("Lengkapi semua kolom dengan jawaban peserta yang sebenarnya.");
      return;
    }
    try {
      const rows = JSON.parse(
        localStorage.getItem("techcaption.feedback.v1") || "[]",
      );
      if (!Array.isArray(rows)) throw new Error("Format feedback tidak valid.");
      if (rows.length >= 200) throw new Error("Batas feedback tercapai.");
      const row = {
        date: new Date().toISOString(),
        participant: participant.trim(),
        task: task.trim(),
        ease: Number(ratings[0]),
        responsiveness: Number(ratings[1]),
        quality: Number(ratings[2]),
        satisfaction: Number(ratings[3]),
        observation: observation.trim(),
        feedback: feedback.trim(),
      };
      localStorage.setItem(
        "techcaption.feedback.v1",
        JSON.stringify([...rows, row]),
      );
      setParticipant("");
      setRatings(["", "", "", ""]);
      setObservation("");
      setFeedback("");
      notify("Feedback disimpan. Gunakan kode berbeda untuk setiap peserta.");
    } catch (e) {
      notify("Feedback belum tersimpan: " + (e as Error).message);
    }
  }
  function exportFeedback() {
    try {
      const rows = JSON.parse(
        localStorage.getItem("techcaption.feedback.v1") || "[]",
      );
      if (!rows.length) {
        notify("Belum ada feedback.");
        return;
      }
      download(
        "TechCaption-user-testing.csv",
        csv([
          [
            "date",
            "participant",
            "task",
            "ease",
            "responsiveness",
            "quality",
            "satisfaction",
            "observation",
            "feedback",
          ],
          ...rows.map((r: Record<string, string | number>) => [
            r.date,
            r.participant,
            r.task,
            r.ease,
            r.responsiveness,
            r.quality,
            r.satisfaction,
            r.observation,
            r.feedback,
          ]),
        ]),
        "text/csv;charset=utf-8",
      );
    } catch {
      notify("Feedback tidak dapat dibaca.");
    }
  }
  const metrics = session.demo ? [] : session.metrics;
  const p50 = percentile(
      metrics.map((m) => m.updateDelayMs),
      0.5,
    ),
    p95 = percentile(
      metrics.map((m) => m.updateDelayMs),
      0.95,
    ),
    first = percentile(
      metrics.filter((m) => m.firstTextMs !== null).map((m) => m.firstTextMs!),
      0.5,
    );
  return (
    <div className="page-body">
      <div className="page-intro">
        <div>
          <span className="eyebrow">MEASURE, THEN IMPROVE</span>
          <h1>
            Evaluation lab<span>.</span>
          </h1>
          <p>Ukur akurasi, respons sistem, dan pengalaman pengguna.</p>
        </div>
        <div className="round-symbol">
          <FlaskConical size={30} />
        </div>
      </div>
      <div className="metric-grid">
        <div className="stat-card">
          <span>Update delay · median</span>
          <strong>{p50 === null ? "—" : (p50 / 1000).toFixed(2) + " s"}</strong>
          <small>Dari audio terakhir pada snapshot ke teks tampil</small>
        </div>
        <div className="stat-card">
          <span>Update delay · P95</span>
          <strong>{p95 === null ? "—" : (p95 / 1000).toFixed(2) + " s"}</strong>
          <small>{metrics.length} inference pada sesi aktif</small>
        </div>
        <div className="stat-card">
          <span>Teks pertama · median</span>
          <strong>
            {first === null ? "—" : (first / 1000).toFixed(2) + " s"}
          </strong>
          <small>Dari awal segmen, termasuk buffering</small>
        </div>
      </div>
      <div className="panel metric-note">
        <p>
          Metrik dari <b>{session.title}</b>. Delay pembaruan bukan latency per
          kata. Ekspor mencakup waktu antrean, inference, dan RTF per snapshot.
        </p>
        <button
          className="button secondary"
          disabled={!metrics.length}
          onClick={() => exportMetrics(session)}
        >
          <Download size={16} /> Ekspor metrik
        </button>
      </div>
      <div className="evaluation-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              <BarChart3 size={18} /> Akurasi transkripsi
            </h2>
            <span className="badge">WER + istilah teknis</span>
          </div>
          <div className="panel-content stack">
            <div className="two-cols">
              <label>
                Kode sampel
                <input
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                  placeholder="U01-clean-01"
                  maxLength={80}
                />
              </label>
              <label>
                Kondisi
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="baseline">Baseline · ruangan tenang</option>
                  <option value="noise">Background noise</option>
                  <option value="speed">Bicara cepat</option>
                  <option value="distance">Jarak mikrofon</option>
                  <option value="technical">Istilah teknis</option>
                </select>
              </label>
            </div>
            <label>
              Referensi yang sudah diverifikasi
              <textarea
                rows={5}
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  setResult(null);
                }}
                placeholder="Ketik transkripsi manual dari ucapan sebenarnya…"
                maxLength={18000}
              />
            </label>
            <label>
              Hasil ASR asli
              <textarea
                rows={5}
                value={hypothesis}
                onChange={(e) => {
                  setHypothesis(e.target.value);
                  setResult(null);
                }}
                placeholder="Tempel keluaran model tanpa koreksi…"
                maxLength={18000}
              />
            </label>
            <div className="button-row">
              <button
                className="button text"
                disabled={session.demo || !session.segments.length}
                onClick={() => {
                  setHypothesis(
                    session.segments
                      .filter((s) => s.final)
                      .map((s) => s.text)
                      .join(" "),
                  );
                  setResult(null);
                }}
              >
                Ambil dari sesi aktif <ArrowRight size={15} />
              </button>
              <button className="button primary" onClick={calculate}>
                Hitung & simpan
              </button>
            </div>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            {result && (
              <div className="results" aria-live="polite">
                <div className="result-values">
                  <div>
                    <small>WORD ERROR RATE</small>
                    <strong>{(result.wer * 100).toFixed(1)}%</strong>
                  </div>
                  <div>
                    <small>TECHNICAL TERM ERROR</small>
                    <strong>
                      {termResult?.rate === null
                        ? "N/A"
                        : ((termResult?.rate ?? 0) * 100).toFixed(1) + "%"}
                    </strong>
                  </div>
                </div>
                <p>
                  {result.S} substitusi + {result.D} penghapusan + {result.I}{" "}
                  penambahan / {result.N} kata referensi.
                </p>
                <p>
                  {termResult?.errors} dari {termResult?.total} kemunculan
                  istilah salah. WER dapat melebihi 100% jika banyak penambahan.
                </p>
                <div className="alignment">
                  {result.alignment.map((a, i) => (
                    <span
                      className={a.op}
                      key={i}
                      title={`${a.op}: ${a.ref || "∅"} → ${a.hyp || "∅"}`}
                    >
                      {a.op === "equal"
                        ? a.hyp
                        : a.op === "deletion"
                          ? `− ${a.ref}`
                          : a.op === "insertion"
                            ? `+ ${a.hyp}`
                            : `${a.ref} → ${a.hyp}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="small muted">
              Huruf diseragamkan menjadi kecil; tanda baca diabaikan, kecuali +
              dan #. Technical Term Error Rate menghitung istilah referensi yang
              terkena edit pada alignment. Maksimal 1.500 kata per sampel.
            </p>
            <button className="button secondary" onClick={exportEvaluations}>
              <Download size={16} /> Ekspor riwayat evaluasi JSON
            </button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>
              <Users size={18} /> User testing
            </h2>
            <span className="badge">Minimal 5 pengguna</span>
          </div>
          <form className="panel-content stack" onSubmit={saveFeedback}>
            <p className="muted small">
              Untuk mahasiswa CS yang benar-benar mencoba aplikasi. Gunakan kode
              peserta, bukan nama lengkap. Data hanya tersimpan di browser ini.
            </p>
            <label>
              Kode peserta
              <input
                required
                value={participant}
                onChange={(e) => setParticipant(e.target.value)}
                maxLength={60}
                placeholder="U01"
              />
            </label>
            <label>
              Tugas yang dikerjakan
              <input
                required
                value={task}
                onChange={(e) => setTask(e.target.value)}
                maxLength={300}
                placeholder="Transkripsi kuliah 2 menit, bookmark, dan ekspor"
              />
            </label>
            <div className="rating-grid">
              {[
                "Kemudahan penggunaan",
                "Respons transkripsi",
                "Kualitas transkripsi",
                "Kepuasan keseluruhan",
              ].map((label, i) => (
                <label key={label}>
                  {label}
                  <select
                    required
                    value={ratings[i]}
                    onChange={(e) =>
                      setRatings((r) =>
                        r.map((v, n) => (n === i ? e.target.value : v)),
                      )
                    }
                  >
                    <option value="">Pilih nilai</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                        {n === 1
                          ? " · sangat kurang"
                          : n === 5
                            ? " · sangat baik"
                            : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label>
              Observasi peneliti
              <textarea
                required
                rows={3}
                maxLength={2000}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Catat kesulitan dan perilaku yang diamati…"
              />
            </label>
            <label>
              Feedback dari peserta
              <textarea
                required
                rows={3}
                maxLength={2000}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Apa yang membantu? Apa yang perlu diperbaiki?"
              />
            </label>
            <button className="button primary" type="submit">
              <Check size={16} /> Simpan feedback
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={exportFeedback}
            >
              <Download size={16} /> Ekspor feedback CSV
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
