import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  AudioLines,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FlaskConical,
  FolderOpen,
  Headphones,
  HelpCircle,
  Maximize2,
  Mic,
  Minimize2,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { MODEL_REVISIONS } from "./lib/model-config";
import Evaluation from "./components/Evaluation";
import { useTranscriber } from "./hooks/useTranscriber";
import {
  createSession,
  defaultSettings,
  type Session,
  type Settings,
  type Term,
} from "./lib/types";
import { defaultTerms, termParts } from "./lib/glossary";
import {
  deleteSession,
  readSessions,
  readTerms,
  saveSession,
  saveTerms,
} from "./lib/storage";
import { clock, exportSession } from "./lib/export";
import { tokens } from "./lib/metrics";
type View = "studio" | "sessions" | "glossary" | "evaluation" | "guide";
function Highlight({ text, terms }: { text: string; terms: Term[] }) {
  return (
    <>
      {termParts(text, terms).map((p, i) =>
        p.term ? (
          <mark title={p.term.definition} key={i}>
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
function Logo() {
  return (
    <div className="brand">
      <div className="brand-icon">
        <AudioLines size={23} />
      </div>
      <span>
        tech<span className="brand-light">caption</span>
        <sup>●</sup>
      </span>
    </div>
  );
}
const dateLabel = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export default function App() {
  const [view, setView] = useState<View>("studio"),
    [settings, setSettings] = useState<Settings>(defaultSettings),
    [session, setSession] = useState<Session>(() =>
      createSession(defaultSettings),
    ),
    [history, setHistory] = useState<Session[]>([]),
    [terms, setTerms] = useState<Term[]>(defaultTerms),
    [toast, setToast] = useState(""),
    [storageError, setStorageError] = useState(""),
    [search, setSearch] = useState(""),
    [bookmarksOnly, setBookmarksOnly] = useState(false),
    [focus, setFocus] = useState(false),
    [exports, setExports] = useState(false),
    [termName, setTermName] = useState(""),
    [definition, setDefinition] = useState(""),
    [follow, setFollow] = useState(true),
    [requesting, setRequesting] = useState(false),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6000);
  };
  const transcriber = useTranscriber({
    onSegment: (segment) =>
      setSession((s) => {
        const old = s.segments.find((x) => x.id === segment.id);
        if (old?.final && !segment.final) return s;
        return {
          ...s,
          duration: Math.max(s.duration, segment.end),
          segments: [
            ...s.segments.filter((x) => x.id !== segment.id),
            { ...segment, bookmark: old?.bookmark ?? false },
          ].sort((a, b) => a.id - b.id),
        };
      }),
    onMetric: (metric) =>
      setSession((s) => ({ ...s, metrics: [...s.metrics, metric] })),
    onEnd: (duration) => setSession((s) => ({ ...s, duration })),
  });
  const busy =
    transcriber.phase === "listening" ||
    transcriber.phase === "finishing" ||
    requesting;
  const locked = busy || transcriber.phase === "loading";
  useEffect(() => {
    try {
      setHistory(readSessions());
      setTerms(readTerms() ?? defaultTerms);
    } catch {
      setStorageError(
        "Penyimpanan lokal tidak dapat dibaca. Data lama tidak ditimpa. Ekspor sesi saat ini sebelum menutup halaman.",
      );
    }
  }, []);
  useEffect(() => {
    if (!session.segments.length && !session.notes) return;
    try {
      saveSession(session);
      setHistory(readSessions());
      setStorageError("");
    } catch {
      setStorageError(
        "Sesi belum tersimpan: penyimpanan browser penuh atau tidak tersedia. Ekspor TXT/JSON sekarang.",
      );
    }
  }, [session]);
  useEffect(() => {
    if (follow && view === "studio" && session.segments.length)
      bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [session.segments, follow, view]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocus(false);
        setExports(false);
        setDeleteId(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  const newSession = () => {
    if (locked) return;
    setSession(createSession(settings));
    setView("studio");
    setSearch("");
    setBookmarksOnly(false);
  };
  const start = async () => {
    setRequesting(true);
    setSearch("");
    setBookmarksOnly(false);
    setFollow(true);
    setSession((s) =>
      s.segments.length || s.demo
        ? {
            ...createSession(settings),
            title:
              s.title === "Contoh: Dasar Machine Learning"
                ? "Kuliah tanpa judul"
                : s.title,
          }
        : {
            ...s,
            language: settings.language,
            model: settings.model,
            modelRevision: MODEL_REVISIONS[settings.model],
            device: transcriber.device,
          },
    );
    const ok = await transcriber.start(settings);
    if (ok) setSession((s) => ({ ...s, device: transcriber.device }));
    setRequesting(false);
  };
  const demo = () => {
    if (locked) return;
    const s = createSession(settings);
    setSession({
      ...s,
      title: "Contoh: Dasar Machine Learning",
      demo: true,
      duration: 38,
      device: "Demo UI",
      segments: [
        {
          id: 0,
          start: 0,
          end: 12,
          text: "Hari ini kita akan membahas machine learning, yaitu bagaimana komputer belajar dari data tanpa diprogram untuk setiap aturan.",
          final: true,
          bookmark: false,
        },
        {
          id: 1,
          start: 12,
          end: 24,
          text: "Pada neural network, proses backpropagation digunakan untuk menghitung gradien. Kemudian gradient descent memperbarui bobot model.",
          final: true,
          bookmark: true,
        },
        {
          id: 2,
          start: 24,
          end: 38,
          text: "Jika model terlalu menghafal dataset pelatihan, kita menyebutnya overfitting. Karena itu, evaluasi pada data baru sangat penting.",
          final: true,
          bookmark: false,
        },
      ],
    });
    notify(
      "Mode contoh UI. Teks ini bukan hasil pengenalan suara dan tidak menghasilkan metrik.",
    );
  };
  const modifyTerms = (next: Term[]) => {
    try {
      saveTerms(next);
      setTerms(next);
    } catch {
      notify("Glosarium belum tersimpan. Penyimpanan browser tidak tersedia.");
    }
  };
  const addTerm = (e: React.FormEvent) => {
    e.preventDefault();
    const term = termName.trim();
    if (!term) return;
    if (terms.length >= 150) {
      notify("Maksimal 150 istilah.");
      return;
    }
    if (terms.some((t) => t.term.toLowerCase() === term.toLowerCase())) {
      notify("Istilah ini sudah ada.");
      return;
    }
    modifyTerms([...terms, { term, definition: definition.trim() }]);
    setTermName("");
    setDefinition("");
  };
  const removeSession = (id: string) => {
    try {
      deleteSession(id);
      setHistory(readSessions());
      if (session.id === id) setSession(createSession(settings));
      setDeleteId(null);
      notify("Sesi dihapus dari browser ini.");
    } catch {
      notify("Sesi belum berhasil dihapus.");
    }
  };
  const rows = session.segments.filter(
    (s) =>
      (!bookmarksOnly || s.bookmark) &&
      (!search || s.text.toLowerCase().includes(search.toLowerCase())),
  );
  const allText = session.segments.map((s) => s.text).join(" "),
    wordCount = tokens(allText).length;
  const found = terms.filter((t) =>
    termParts(allText, [t]).some((p) => p.term),
  );
  const lastMetric = session.metrics.at(-1),
    duration = busy ? transcriber.seconds : session.duration;
  const status =
    transcriber.phase === "listening"
      ? "Listening"
      : transcriber.phase === "finishing"
        ? "Finishing"
        : transcriber.phase === "loading"
          ? "Loading model"
          : session.segments.length
            ? "Stopped"
            : transcriber.modelReady(settings)
              ? "Ready"
              : "Standby";
  const navItems: [View, typeof Mic, string][] = [
    ["studio", AudioLines, "Live studio"],
    ["sessions", FolderOpen, "Sesi tersimpan"],
    ["glossary", BookOpen, "Glosarium"],
    ["evaluation", FlaskConical, "Evaluation lab"],
  ];
  const ready = transcriber.modelReady(settings);
  return (
    <div className={`app-shell ${focus ? "focus-mode" : ""}`}>
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      <aside className="sidebar">
        <Logo />
        <div className="workspace-label">YOUR LEARNING WORKSPACE</div>
        <nav aria-label="Navigasi utama">
          {navItems.map(([id, Icon, label]) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => {
                setView(id);
                setSearch("");
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "studio" && <span className="nav-dot" />}
              {id === "sessions" && (
                <span className="nav-count">{history.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <ShieldCheck size={22} />
            <strong>Di perangkatmu.</strong>
            <p>
              Suara diproses lokal.
              <br />
              Fokus pada yang kamu pelajari.
            </p>
            <span>
              <i /> LOCAL INFERENCE
            </span>
          </div>
          <button
            className={`nav-item ${view === "guide" ? "active" : ""}`}
            onClick={() => setView("guide")}
          >
            <HelpCircle size={18} /> Panduan penggunaan
          </button>
          <div className="profile">
            <div className="avatar">TC</div>
            <div>
              <b>Student workspace</b>
              <small>Speech Recognition Project</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <b>
              {view === "guide"
                ? "Panduan"
                : navItems.find((n) => n[0] === view)?.[2]}
            </b>
          </div>
          <div className="top-actions">
            {busy ? (
              <button
                className="local-pill recording-pill"
                onClick={() => setView("studio")}
              >
                <span className="status-dot recording" /> Mikrofon ·{" "}
                {clock(transcriber.seconds)}
              </button>
            ) : (
              <span className="local-pill">
                <ShieldCheck size={14} /> Private by design
              </span>
            )}
            <button
              className="icon-button"
              aria-label="Buka panduan"
              onClick={() => setView("guide")}
            >
              <HelpCircle size={17} />
            </button>
            <button
              className="button small-button"
              disabled={locked}
              onClick={newSession}
            >
              <Plus size={16} /> Sesi baru
            </button>
          </div>
        </header>
        <main id="main">
          {storageError && (
            <div role="alert" className="notice warning">
              {storageError}
            </div>
          )}
          {view === "studio" && (
            <div className="page-body studio">
              <div className="page-intro">
                <div>
                  <span className="eyebrow">
                    LESS NOTE-TAKING. MORE UNDERSTANDING.
                  </span>
                  <h1>
                    Catch every concept<span>.</span>
                  </h1>
                  <p>
                    Ubah penjelasan teknis menjadi catatan yang bisa kamu
                    pelajari kembali.
                  </p>
                </div>
                <div className="session-index">
                  LIVE STUDIO <span>01 / TC</span>
                </div>
              </div>
              <div className="studio-layout">
                <div className="studio-main">
                  <section className="panel transcript-panel">
                    <div className="session-heading">
                      <div className="session-title-group">
                        <span
                          className={`status-dot ${busy ? "recording" : ""}`}
                        />
                        <input
                          className="session-title"
                          aria-label="Judul sesi"
                          value={session.title}
                          maxLength={200}
                          onChange={(e) =>
                            setSession((s) => ({ ...s, title: e.target.value }))
                          }
                        />
                        <span className="save-label">
                          {session.segments.length && !storageError ? (
                            <>
                              <Check size={12} /> Tersimpan lokal
                            </>
                          ) : (
                            dateLabel(session.createdAt)
                          )}
                        </span>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={focus ? "Keluar mode fokus" : "Mode fokus"}
                        onClick={() => setFocus(!focus)}
                      >
                        {focus ? (
                          <Minimize2 size={18} />
                        ) : (
                          <Maximize2 size={18} />
                        )}
                      </button>
                    </div>
                    <div className="transcript-toolbar">
                      <div className="tab-switch">
                        <button
                          className={!bookmarksOnly ? "selected" : ""}
                          onClick={() => setBookmarksOnly(false)}
                        >
                          Transkrip <span>{session.segments.length}</span>
                        </button>
                        <button
                          className={bookmarksOnly ? "selected" : ""}
                          onClick={() => setBookmarksOnly(true)}
                        >
                          <Bookmark size={14} /> Bookmark{" "}
                          <span>
                            {session.segments.filter((s) => s.bookmark).length}
                          </span>
                        </button>
                      </div>
                      <div className="toolbar-right">
                        <label className="search-box">
                          <Search size={15} />
                          <input
                            aria-label="Cari dalam transkrip"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari kata…"
                          />
                        </label>
                        <div className="export-wrap">
                          <button
                            className="icon-button"
                            aria-label="Opsi ekspor"
                            aria-expanded={exports}
                            disabled={!session.segments.length}
                            onClick={() => setExports(!exports)}
                          >
                            <Download size={18} />
                          </button>
                          {exports && (
                            <div className="dropdown">
                              {(["txt", "srt", "json"] as const).map(
                                (format) => (
                                  <button
                                    key={format}
                                    onClick={() => {
                                      exportSession(session, format);
                                      setExports(false);
                                    }}
                                  >
                                    Unduh {format.toUpperCase()}
                                  </button>
                                ),
                              )}
                              <button
                                onClick={() => {
                                  setExports(false);
                                  setTimeout(() => window.print(), 0);
                                }}
                              >
                                Cetak / simpan PDF
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {session.demo && (
                      <div className="demo-banner">
                        CONTOH UI · Teks ilustrasi, bukan hasil ASR atau data
                        eksperimen.
                      </div>
                    )}
                    <div
                      className={`transcript-scroll ${focus ? "large-caption" : ""}`}
                      onWheel={() => setFollow(false)}
                    >
                      {!session.segments.length ? (
                        <div className="empty-transcript">
                          <div className="mic-orbit">
                            <div className="orbit orbit-one" />
                            <div className="orbit orbit-two" />
                            <div className="mic-center">
                              <Mic size={31} />
                            </div>
                            <span className="orbit-label">
                              <AudioLines size={16} /> VOICE → KNOWLEDGE
                            </span>
                          </div>
                          <h2>
                            {busy
                              ? "Mendengarkan kuliahmu…"
                              : "Ready when you are."}
                          </h2>
                          <p>
                            {busy
                              ? "Mulai berbicara. Teks sementara akan muncul setelah potongan audio pertama diproses."
                              : "Siapkan model, nyalakan mikrofon, dan biarkan ide-ide penting tetap tercatat."}
                          </p>
                          {!busy && (
                            <button
                              className="button text demo-button"
                              disabled={locked}
                              onClick={demo}
                            >
                              Lihat contoh transkrip <ArrowRight size={15} />
                            </button>
                          )}
                          <div className="empty-features">
                            <span>
                              <Activity size={15} /> Live captions
                            </span>
                            <span>
                              <BookOpen size={15} /> Istilah teknis
                            </span>
                            <span>
                              <Bookmark size={15} /> Bookmark ide
                            </span>
                          </div>
                        </div>
                      ) : rows.length ? (
                        <div
                          className="transcript-lines"
                          role="log"
                          aria-label="Transkrip langsung"
                          aria-live="polite"
                          aria-relevant="additions text"
                          aria-atomic="false"
                        >
                          {rows.map((s) => (
                            <article
                              className={`transcript-line ${s.final ? "" : "interim"} ${s.bookmark ? "bookmarked" : ""}`}
                              key={s.id}
                            >
                              <div className="time-label">
                                {clock(s.start)}
                                {!s.final && <span>sementara</span>}
                              </div>
                              <p>
                                <Highlight
                                  text={
                                    s.text ||
                                    "Tidak ada teks terdeteksi pada segmen ini."
                                  }
                                  terms={terms}
                                />
                              </p>
                              <button
                                className="icon-button bookmark-button"
                                aria-label={
                                  s.bookmark
                                    ? `Hapus bookmark ${clock(s.start)}`
                                    : `Bookmark ${clock(s.start)}`
                                }
                                aria-pressed={s.bookmark}
                                onClick={() =>
                                  setSession((v) => ({
                                    ...v,
                                    segments: v.segments.map((x) =>
                                      x.id === s.id
                                        ? { ...x, bookmark: !x.bookmark }
                                        : x,
                                    ),
                                  }))
                                }
                              >
                                <Bookmark
                                  size={17}
                                  fill={s.bookmark ? "currentColor" : "none"}
                                />
                              </button>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-small">
                          <Search size={26} />
                          <h3>
                            {bookmarksOnly
                              ? "Belum ada bookmark yang cocok."
                              : "Kata tidak ditemukan."}
                          </h3>
                          <p>
                            Ubah pencarian atau tampilkan seluruh transkrip.
                          </p>
                        </div>
                      )}
                      <div ref={bottom} />
                    </div>
                    <div className="transcript-footer">
                      <span>
                        <span
                          className={`status-dot ${busy ? "recording" : ""}`}
                        />
                        {status}
                      </span>
                      <span>
                        {wordCount} kata <i>·</i> {found.length} istilah
                      </span>
                      <button
                        className={`follow-button ${follow ? "active" : ""}`}
                        onClick={() => {
                          setFollow(!follow);
                          bottom.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                        }}
                      >
                        <ArrowDown size={13} /> Auto-scroll{" "}
                        {follow ? "on" : "off"}
                      </button>
                    </div>
                  </section>
                  <section className="recorder panel">
                    <div className="audio-preview">
                      <div
                        className="waveform"
                        aria-label={`Level mikrofon ${Math.round(transcriber.level * 100)} persen`}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <i
                            key={i}
                            style={{
                              height: busy
                                ? `${6 + transcriber.level * (14 + ((i * 17) % 29))}px`
                                : `${[5, 8, 12, 7, 18, 25, 16, 10, 20, 31, 17, 11, 7, 13, 22, 17, 9, 5, 12, 19, 10, 6, 8, 5][i]}px`,
                            }}
                          />
                        ))}
                      </div>
                      <div>
                        <strong>{clock(duration)}</strong>
                        <small>{busy ? "Mikrofon aktif" : "Durasi sesi"}</small>
                      </div>
                    </div>
                    <div className="record-action">
                      {transcriber.phase === "loading" ? (
                        <button
                          className="button secondary"
                          onClick={transcriber.cancelLoad}
                        >
                          <X size={17} /> Batalkan unduhan
                        </button>
                      ) : busy ? (
                        <button
                          className="button stop"
                          disabled={
                            transcriber.phase === "finishing" || requesting
                          }
                          onClick={() => void transcriber.stop()}
                        >
                          <Square size={14} fill="currentColor" />
                          {requesting
                            ? "Membuka mikrofon…"
                            : transcriber.phase === "finishing"
                              ? "Menyelesaikan…"
                              : "Akhiri sesi"}
                        </button>
                      ) : !ready ? (
                        <button
                          className="button primary"
                          onClick={() => transcriber.load(settings)}
                        >
                          <Download size={17} /> Siapkan model
                        </button>
                      ) : (
                        <button
                          className="button primary"
                          onClick={() => void start()}
                        >
                          <Mic size={18} />{" "}
                          {session.segments.length
                            ? "Mulai sesi berikutnya"
                            : "Mulai sesi"}
                        </button>
                      )}
                    </div>
                  </section>
                  {transcriber.phase === "loading" && (
                    <div className="notice model-progress" role="status">
                      <div>
                        <b>Menyiapkan Whisper {settings.model}</b>
                        <span>
                          {transcriber.progress.value}% · file saat ini
                        </span>
                      </div>
                      <progress max={100} value={transcriber.progress.value} />
                      <small>
                        {transcriber.progress.file.split("/").at(-1)} · Unduhan
                        pertama dapat memerlukan beberapa menit.
                      </small>
                    </div>
                  )}
                  {transcriber.message && (
                    <div className="notice warning" role="status">
                      {transcriber.message}
                    </div>
                  )}
                  <div className="under-recorder">
                    <ShieldCheck size={14} />
                    <span>
                      Audio tidak diunggah atau disimpan. Model diunduh sekali
                      lalu digunakan lokal.
                    </span>
                  </div>
                  <section className="panel notes-panel">
                    <div className="panel-heading">
                      <h2>
                        <FileText size={17} /> Catatan pribadi
                      </h2>
                      <span className="muted small">
                        Tersimpan bersama sesi
                      </span>
                    </div>
                    <textarea
                      value={session.notes}
                      onChange={(e) =>
                        setSession((s) => ({ ...s, notes: e.target.value }))
                      }
                      maxLength={20000}
                      aria-label="Catatan pribadi"
                      placeholder="Pertanyaan, ide, atau hal yang ingin kamu pelajari lagi…"
                      rows={3}
                    />
                  </section>
                </div>
                <aside className="studio-side">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>
                        <Settings2 size={17} /> Pengaturan sesi
                      </h2>
                    </div>
                    <div className="panel-content stack">
                      <label>
                        Bahasa utama
                        <select
                          disabled={locked}
                          value={settings.language}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              language: e.target.value as Settings["language"],
                            }))
                          }
                        >
                          <option value="indonesian">Bahasa Indonesia</option>
                          <option value="english">English</option>
                        </select>
                      </label>
                      <label>
                        Model lokal
                        <select
                          disabled={locked}
                          value={settings.model}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              model: e.target.value as Settings["model"],
                            }))
                          }
                        >
                          <option value="tiny">Whisper Tiny · ringan</option>
                          <option value="base">
                            Whisper Base · lebih besar
                          </option>
                        </select>
                      </label>
                      <label>
                        Komputasi
                        <select
                          disabled={locked}
                          value={settings.device}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              device: e.target.value as Settings["device"],
                            }))
                          }
                        >
                          <option value="auto">Otomatis · GPU / CPU</option>
                          <option value="wasm">CPU · WebAssembly</option>
                          <option value="webgpu">GPU · WebGPU</option>
                        </select>
                      </label>
                      <details>
                        <summary>Sensitivitas mikrofon</summary>
                        <label className="threshold-label">
                          Ambang energi: {settings.threshold.toFixed(3)}
                          <input
                            aria-label="Ambang energi"
                            type="range"
                            min="0.002"
                            max="0.04"
                            step="0.002"
                            value={settings.threshold}
                            disabled={locked}
                            onChange={(e) =>
                              setSettings((s) => ({
                                ...s,
                                threshold: Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                        <p className="small muted">
                          Turunkan jika suara pelan tidak terdeteksi. Naikkan
                          jika noise memicu teks.
                        </p>
                      </details>
                      <div className={`model-state ${ready ? "is-ready" : ""}`}>
                        <span className="status-dot" />
                        <div>
                          <strong>
                            {ready
                              ? "Model siap digunakan"
                              : "Model belum disiapkan"}
                          </strong>
                          <small>
                            {ready
                              ? `Berjalan di ${transcriber.device.toUpperCase()}`
                              : "Tidak memerlukan API key"}
                          </small>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>
                        <Activity size={17} /> Respons sistem
                      </h2>
                    </div>
                    <div className="performance">
                      <div>
                        <span>Waktu inference</span>
                        <b>
                          {lastMetric
                            ? (lastMetric.inferenceMs / 1000).toFixed(2) + " s"
                            : "—"}
                        </b>
                      </div>
                      <div>
                        <span>Antrean potongan</span>
                        <b>{transcriber.pending}</b>
                      </div>
                      <div>
                        <span>RTF snapshot terakhir</span>
                        <b>
                          {lastMetric ? lastMetric.rtf.toFixed(2) + "×" : "—"}
                        </b>
                      </div>
                      <p>
                        Nilai diukur saat model berjalan. Target RTF di bawah 1
                        perlu diuji pada perangkatmu.
                      </p>
                    </div>
                  </section>
                  <section className="panel glossary-preview">
                    <div className="panel-heading">
                      <h2>
                        <BookOpen size={17} /> Istilah terdeteksi
                      </h2>
                      <span className="count-chip">{found.length}</span>
                    </div>
                    {found.length ? (
                      <div className="term-list">
                        {found.slice(0, 5).map((t) => (
                          <details key={t.term}>
                            <summary>
                              {t.term}
                              <Plus size={13} />
                            </summary>
                            <p>{t.definition}</p>
                          </details>
                        ))}
                      </div>
                    ) : (
                      <div className="term-empty">
                        <span className="example-term">neural network</span>
                        <p>
                          Istilah teknis akan disorot otomatis saat muncul dalam
                          transkrip.
                        </p>
                      </div>
                    )}
                    <button
                      className="link-row"
                      onClick={() => {
                        setView("glossary");
                        setSearch("");
                      }}
                    >
                      Kelola glosarium <ArrowRight size={15} />
                    </button>
                  </section>
                  <div className="tip">
                    <Headphones size={20} />
                    <div>
                      <strong>Sedikit persiapan, hasil lebih baik.</strong>
                      <p>
                        Gunakan mikrofon dekat pembicara dan ruangan tenang.
                        Pilih bahasa yang paling sering dipakai.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}
          {view === "sessions" && (
            <div className="page-body">
              <div className="page-intro">
                <div>
                  <span className="eyebrow">A PLACE FOR EVERY IDEA</span>
                  <h1>
                    Your learning library<span>.</span>
                  </h1>
                  <p>
                    Transkrip dan bookmark tersimpan di browser serta perangkat
                    ini.
                  </p>
                </div>
                <button
                  className="button primary"
                  disabled={locked}
                  onClick={newSession}
                >
                  <Plus size={17} /> Sesi baru
                </button>
              </div>
              <label className="search-box history-search">
                <Search size={18} />
                <input
                  aria-label="Cari sesi"
                  placeholder="Cari judul atau isi transkrip…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="session-grid">
                {history
                  .filter((s) =>
                    (s.title + " " + s.segments.map((x) => x.text).join(" "))
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((s) => (
                    <article className="panel saved-session" key={s.id}>
                      <div className="saved-session-top">
                        <div className="file-icon">
                          <FileText size={22} />
                        </div>
                        <span className="badge">
                          {s.demo
                            ? "Contoh UI"
                            : s.language === "indonesian"
                              ? "Indonesia"
                              : "English"}
                        </span>
                      </div>
                      <h2>{s.title}</h2>
                      <p>
                        {s.segments
                          .map((x) => x.text)
                          .join(" ")
                          .slice(0, 180) || "Catatan pribadi"}
                      </p>
                      <div className="session-meta">
                        <span>
                          <Clock size={13} /> {clock(s.duration)}
                        </span>
                        <span>{dateLabel(s.createdAt)}</span>
                      </div>
                      <div className="saved-actions">
                        <button
                          className="button text"
                          disabled={locked}
                          onClick={() => {
                            setSession(s);
                            setView("studio");
                            setSearch("");
                            setBookmarksOnly(false);
                          }}
                        >
                          Buka sesi <ArrowRight size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Ekspor ${s.title}`}
                          onClick={() => exportSession(s, "json")}
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={`Hapus ${s.title}`}
                          disabled={locked}
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
              {!history.length && (
                <div className="panel empty-large">
                  <FolderOpen size={40} />
                  <h2>Catatan kuliahmu dimulai di sini.</h2>
                  <p>Selesaikan sesi pertama atau jelajahi contoh transkrip.</p>
                  <button
                    className="button primary"
                    onClick={() => setView("studio")}
                  >
                    Buka live studio <ArrowRight size={16} />
                  </button>
                </div>
              )}
              <p className="small muted storage-reminder">
                Menghapus data situs atau berganti browser menghilangkan akses
                ke sesi lokal. Ekspor JSON/TXT untuk salinan arsip.
              </p>
            </div>
          )}
          {view === "glossary" && (
            <div className="page-body">
              <div className="page-intro">
                <div>
                  <span className="eyebrow">MAKE THE TECHNICAL FAMILIAR</span>
                  <h1>
                    A vocabulary that grows<span>.</span>
                  </h1>
                  <p>Kenali istilah penting tanpa kehilangan konteks kuliah.</p>
                </div>
                <span className="large-count">
                  {terms.length}
                  <small>istilah</small>
                </span>
              </div>
              <div className="notice neutral">
                <BookOpen size={18} />
                <span>
                  Glosarium menyorot dan menjelaskan istilah yang cocok. Fitur
                  ini tidak mengubah keluaran ASR atau melatih model.
                </span>
              </div>
              <div className="glossary-layout">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Daftar istilah</h2>
                    <label className="search-box">
                      <Search size={15} />
                      <input
                        aria-label="Cari istilah"
                        placeholder="Cari istilah…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="full-term-list">
                    {terms
                      .filter((t) =>
                        t.term.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((t) => (
                        <div className="term-row" key={t.term}>
                          <div>
                            <strong>{t.term}</strong>
                            <p>{t.definition || "Belum ada definisi."}</p>
                          </div>
                          <button
                            className="icon-button danger"
                            aria-label={`Hapus istilah ${t.term}`}
                            onClick={() =>
                              modifyTerms(
                                terms.filter((x) => x.term !== t.term),
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                </section>
                <form className="panel add-term" onSubmit={addTerm}>
                  <div className="panel-heading">
                    <h2>
                      <Plus size={17} /> Tambah istilah
                    </h2>
                  </div>
                  <div className="panel-content stack">
                    <label>
                      Istilah teknis
                      <input
                        required
                        maxLength={80}
                        value={termName}
                        onChange={(e) => setTermName(e.target.value)}
                        placeholder="Contoh: convolution"
                      />
                    </label>
                    <label>
                      Definisi singkat
                      <textarea
                        rows={4}
                        maxLength={400}
                        value={definition}
                        onChange={(e) => setDefinition(e.target.value)}
                        placeholder="Jelaskan dengan bahasamu sendiri…"
                      />
                    </label>
                    <button className="button primary" type="submit">
                      <Plus size={16} /> Tambahkan
                    </button>
                    <p className="small muted">
                      Pencocokan tidak membedakan huruf besar/kecil. Maksimal
                      150 istilah.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          )}
          {view === "evaluation" && (
            <Evaluation session={session} terms={terms} notify={notify} />
          )}
          {view === "guide" && (
            <div className="page-body guide">
              <div className="page-intro">
                <div>
                  <span className="eyebrow">
                    A LITTLE GUIDANCE GOES A LONG WAY
                  </span>
                  <h1>
                    From voice to understanding<span>.</span>
                  </h1>
                  <p>
                    TechCaption untuk mahasiswa yang mengikuti kuliah teknis.
                  </p>
                </div>
              </div>
              <div className="guide-grid">
                {[
                  {
                    n: "01",
                    title: "Siapkan model",
                    text: "Pilih bahasa dan model di Live Studio, lalu klik Siapkan model. Model diunduh dari Hugging Face. Proses pertama memerlukan internet dan penyimpanan browser. Setelah dimuat, inference berlangsung lokal.",
                  },
                  {
                    n: "02",
                    title: "Mulai mendengarkan",
                    text: "Klik Mulai sesi dan izinkan mikrofon. Bicara dengan jelas. Teks sementara diperbarui selama kamu berbicara; teks final muncul setelah jeda atau batas segmen tercapai.",
                  },
                  {
                    n: "03",
                    title: "Tandai yang penting",
                    text: "Gunakan ikon bookmark di samping teks, cari kata, dan lihat arti istilah yang disorot. Mode fokus memperbesar transkrip. Catatan pribadi tidak mengubah hasil model.",
                  },
                  {
                    n: "04",
                    title: "Simpan, ekspor, evaluasi",
                    text: "Akhiri sesi dan tunggu antrean selesai. Transkrip tersimpan otomatis. Unduh TXT, SRT, JSON atau pilih cetak untuk PDF. Gunakan Evaluation Lab untuk WER dan feedback peserta asli.",
                  },
                ].map((c) => (
                  <section className="panel guide-card" key={c.n}>
                    <span>{c.n}</span>
                    <h2>{c.title}</h2>
                    <p>{c.text}</p>
                  </section>
                ))}
              </div>
              <section className="panel panel-content stack">
                <h2>Hal yang perlu diketahui</h2>
                <details open>
                  <summary>Browser dan performa</summary>
                  <p>
                    Utamakan Chrome/Edge desktop terbaru, HTTPS, dan tab yang
                    tetap aktif. WebGPU dipakai jika tersedia, dengan fallback
                    CPU otomatis. Dukungan serta kecepatan bergantung perangkat.
                    Ponsel dan Safari perlu diuji secara terpisah. Tiny lebih
                    ringan; Base menggunakan lebih banyak sumber daya.
                  </p>
                </details>
                <details>
                  <summary>Privasi dan penyimpanan</summary>
                  <p>
                    Audio hanya berada di memori perangkat dan tidak disimpan
                    sebagai file. Aplikasi tidak mengirim audio atau transkrip
                    ke server. Koneksi jaringan digunakan untuk aset web dan
                    unduhan model. Transkrip, catatan, evaluasi, dan feedback
                    disimpan pada browser; pengguna lain pada profil browser
                    yang sama dapat mengaksesnya. Minta izin pembicara sebelum
                    mentranskripsikan kuliah.
                  </p>
                </details>
                <details>
                  <summary>Transkripsi bukan catatan yang selalu benar</summary>
                  <p>
                    Whisper dapat salah mengenali istilah, campuran bahasa,
                    suara pelan, dan noise. Periksa teks sebelum menggunakannya.
                    Glosarium hanya memberi sorotan, bukan memperbaiki kata.
                    Potongan maksimal 12 detik dapat memotong kata; timestamp
                    adalah batas segmen audio, bukan timestamp per kata.
                  </p>
                </details>
                <details>
                  <summary>Apa yang diukur di Evaluation Lab?</summary>
                  <p>
                    WER = (substitusi + penghapusan + penambahan) / kata
                    referensi. Metrik respons meliputi inference, antrean, delay
                    pembaruan, waktu teks pertama, serta RTF per snapshot.
                    Partial inference memproses ulang audio, sehingga RTF
                    snapshot bukan beban total pipeline.
                  </p>
                </details>
                <details>
                  <summary>Model gagal dimuat atau suara tidak muncul?</summary>
                  <p>
                    Periksa jaringan, izinkan mikrofon, tutup tab berat, lalu
                    pilih Tiny dan CPU. Turunkan ambang energi jika suara pelan
                    tidak terdeteksi. Coba muat ulang model bila unduhan
                    dibatalkan. Jika antrean tertinggal, aplikasi otomatis
                    menghentikan tangkapan untuk menyelesaikan audio yang sudah
                    diterima.
                  </p>
                </details>
              </section>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            TechCaption <i> / </i> Your lecture, captured.
          </span>
          <span>
            Built for curious minds <AudioLines size={14} />
          </span>
        </footer>
      </div>
      {focus && (
        <button
          className="exit-focus button secondary"
          onClick={() => setFocus(false)}
        >
          <Minimize2 size={16} /> Keluar fokus · Esc
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Tutup notifikasi"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {deleteId && (
        <div className="modal-backdrop">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="modal"
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const b =
                e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
              if (e.shiftKey && document.activeElement === b[0]) {
                e.preventDefault();
                b[b.length - 1].focus();
              } else if (
                !e.shiftKey &&
                document.activeElement === b[b.length - 1]
              ) {
                e.preventDefault();
                b[0].focus();
              }
            }}
          >
            <Trash2 size={25} />
            <h2 id="delete-title">Hapus sesi ini?</h2>
            <p>
              Sesi akan dihapus dari browser. Ekspor dahulu jika masih
              diperlukan.
            </p>
            <div className="button-row">
              <button
                autoFocus
                className="button secondary"
                onClick={() => setDeleteId(null)}
              >
                Batal
              </button>
              <button
                className="button stop"
                onClick={() => removeSession(deleteId)}
              >
                Hapus sesi
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="print-document">
        <Logo />
        <h1>{session.title}</h1>
        <p>
          {dateLabel(session.createdAt)} · Whisper {session.model} ·{" "}
          {session.language}
        </p>
        {session.demo && <p>CONTOH UI — bukan hasil ASR</p>}
        {session.segments.map((s) => (
          <div className="print-segment" key={s.id}>
            <small>
              {clock(s.start)} {s.bookmark ? "★" : ""}{" "}
              {!s.final ? "sementara" : ""}
            </small>
            <p>{s.text}</p>
          </div>
        ))}
        {session.notes && (
          <>
            <h2>Catatan pribadi</h2>
            <p className="pre-wrap">{session.notes}</p>
          </>
        )}
      </div>
    </div>
  );
}
