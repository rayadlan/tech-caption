# TechCaption

**A Real-Time Local Speech Recognition Application for Technical Lecture Transcription.**

Aplikasi final project Speech Recognition untuk mahasiswa Computer Science. Suara dari mikrofon diproses langsung di browser menggunakan model Whisper multilingual. Vercel hanya menyajikan aplikasi statis; tidak menerima audio dan tidak menjalankan inference.

## Mulai dari sini

1. Pasang **Node.js 22 LTS (minimal 22.12)** atau Node.js 24 LTS.
2. Ekstrak paket, lalu buka folder `tech-caption` di VS Code.
3. Buka terminal pada folder yang berisi `package.json`:

```bash
npm ci
npm run dev
```

4. Buka alamat localhost yang tercetak pada terminal, biasanya `http://localhost:5173`.
5. Pilih bahasa, model **Tiny**, dan komputasi **Otomatis**. Klik **Siapkan model** dan tunggu unduhan selesai.
6. Klik **Mulai sesi**, izinkan mikrofon, lalu bicara. Teks sementara muncul setelah inference potongan pertama selesai.
7. Klik **Akhiri sesi**, tunggu antrean selesai, kemudian ekspor atau buka Evaluation Lab.

Jika PowerShell memblokir `npm.ps1`, gunakan terminal Command Prompt di VS Code, atau jalankan `npm.cmd ci` dan `npm.cmd run dev`. Tidak perlu mengubah kebijakan sistem.

## Deploy ke Vercel

**Tidak memerlukan API key, Python, database, atau environment variable.**

1. Buat repositori GitHub dan unggah isi folder `tech-caption`, termasuk `package.json`, `package-lock.json`, `.npmrc`, dan `vercel.json`. Jangan unggah `node_modules`, model cache, atau audio eksperimen pribadi.
2. Di Vercel, pilih **Add New → Project**, lalu import repositori tersebut.
3. Framework: **Vite**. Root Directory: folder yang berisi `package.json`. Jika semua berkas langsung di root repository, gunakan `./`.
4. Pengaturan build:

| Setting               | Value            |
| --------------------- | ---------------- |
| Node.js               | 22.x atau 24.x   |
| Install Command       | `npm ci`         |
| Build Command         | `npm run build`  |
| Output Directory      | `dist`           |
| Environment Variables | Tidak diperlukan |

5. Klik **Deploy**. Buka URL HTTPS hasil deployment dan lakukan checklist `docs/ACCEPTANCE_TEST.md`.

Alternatif melalui CLI, setelah login akun Vercel milikmu:

```bash
npx vercel
npx vercel --prod
```

`vercel.json` sudah mengatur build dan beberapa security headers. Aplikasi memakai navigasi internal pada satu URL root, sehingga tidak memerlukan rewrite SPA ke path lain. Mikrofon memerlukan HTTPS, kecuali localhost. Hosting Vercel yang disiapkan di sini belum diterbitkan ke akun pengguna.

## Fitur

- Input mikrofon kontinu menggunakan AudioWorklet; audio mono 16 kHz.
- Partial transcript selama ucapan berlangsung, dan final per segmen.
- Whisper Tiny/Base multilingual di Web Worker; WebGPU jika tersedia, fallback CPU/WASM saat model dimuat.
- Bahasa utama Indonesia atau Inggris; campuran bahasa tetap bisa keliru.
- Status model, unduhan per file, level suara, durasi, antrean dan metrik inference.
- Judul sesi, bookmark, pencarian, auto-scroll, catatan pribadi, mode fokus.
- Glosarium yang dapat ditambah/dihapus, pencocokan istilah dan definisi.
- Riwayat sesi otomatis di localStorage. Tidak ada login atau sinkronisasi lintas perangkat.
- Ekspor TXT, SRT, JSON; PDF melalui dialog **Cetak / simpan PDF** milik browser.
- Evaluation Lab: WER, alignment kesalahan, Technical Term Error Rate, metrik latency/RTF, serta formulir user testing dan ekspor CSV/JSON.
- UI responsif untuk desktop/mobile, navigasi keyboard, label aksesibel, reduced motion, dan mode cetak.
- Contoh transkrip berlabel **CONTOH UI**; tidak diklaim sebagai ASR dan tidak menghasilkan metrik.

## Mengapa berbeda dari usulan Faster-Whisper sebelumnya?

Faster-Whisper tetap cocok untuk aplikasi Python pada laptop/server GPU. Agar paket ini dapat di-deploy sebagai web Vercel dan tetap memenuhi larangan external Speech Recognition API, implementasi menggunakan **Whisper ONNX + Transformers.js dalam browser pengguna**. Vercel tidak dipakai sebagai mesin inference. Tiny merupakan pilihan awal yang lebih ringan; Base tersedia untuk eksperimen. Tidak ada fine-tuning atau model hasil pelatihan sendiri yang diklaim di sini.

## Pemeriksaan

```bash
npm test
npm run build
npm run preview
```

- Pengujian otomatis menggunakan fixture UI, audio sintetis, dan mock perangkat/worker. Detail hasil: `docs/VERIFICATION.md`.
- Uji native CPU atas audio nyata disediakan melalui `scripts/smoke-asr.mjs`; ini bukan uji browser. Gunakan file mono 16 kHz float32:

```bash
ffmpeg -i sample.wav -ar 16000 -ac 1 -f f32le sample.f32le
node scripts/smoke-asr.mjs sample.f32le indonesian
```

FFmpeg hanya untuk uji opsional tersebut, bukan prasyarat aplikasi web. Paket sengaja tidak membawa bobot model atau rekaman pengguna.

## Hal penting sebelum demo akademik

- Pengunduhan model memerlukan internet. Cache browser dapat dihapus/ditolak oleh browser. Memuat ulang aplikasi sepenuhnya tanpa internet tidak dijamin karena tidak ada service worker offline.
- Tidak ada external speech API maupun Web Speech Recognition API. Aset model berasal dari Hugging Face; runtime WASM dapat dimuat dari CDN ONNX/Transformers.js. Semua inference tetap berada di perangkat.
- Whisper merupakan model sequence-to-sequence, bukan decoder streaming native. Aplikasi melakukan inference ulang pada snapshot segmen berjalan setiap sekitar 2 detik; teks dapat direvisi. Cepat-lambatnya hasil tetap bergantung hardware.
- Tidak ada target latency atau akurasi yang dijamin. Uji minimal 5 mahasiswa CS yang nyata, baseline dan kondisi eksperimen, sebelum menyimpulkan project memenuhi kinerja real-time.
- Glosarium menyorot teks, **tidak memperbaiki hasil ASR**. Raw transcript tetap tersedia untuk evaluasi.
- Timestamp ekspor adalah batas segmen audio, bukan alignment kata. Maksimum segmen 12 detik dapat memotong kata di perbatasan.
- Jangan menutup tab saat proses berjalan. Jika memori/model gagal, audio yang belum diproses tidak dapat dipulihkan karena tidak disimpan.
- Autosave bersifat lokal, bukan backup cloud. Ekspor arsip secara berkala, terutama sebelum menghapus data situs.

## Isi proyek

| File/folder                     | Tanggung jawab                                           |
| ------------------------------- | -------------------------------------------------------- |
| `src/App.tsx`                   | Studio, sesi, glosarium, panduan, UI ekspor              |
| `src/hooks/useTranscriber.ts`   | Lifecycle model/mikrofon, antrean, status, metrik        |
| `src/workers/asr.worker.ts`     | Loading model dan inference lokal                        |
| `public/audio-processor.js`     | Tangkap PCM, mono, resampling, flush                     |
| `src/lib/streaming.ts`          | Segmentasi dan penjadwalan snapshot                      |
| `src/lib/metrics.ts`            | WER, alignment, Technical Term Error Rate                |
| `src/lib/model-config.ts`       | Versi engine dan revisi model yang dipin                 |
| `src/lib/storage.ts`            | Validasi dan penyimpanan sesi                            |
| `src/components/Evaluation.tsx` | Evaluasi dan feedback                                    |
| `tests/`                        | Unit dan workflow tests                                  |
| `docs/`                         | Arsitektur, deployment, eksperimen, AI usage, verifikasi |

`.npmrc` menonaktifkan lifecycle scripts dependency karena aplikasi menggunakan runtime browser. Ini menghindari unduhan CUDA/ONNX native yang tidak dibutuhkan oleh deployment. Build memakai binary bundler dari optional package yang disediakan npm. Jangan menghilangkan optional dependencies ketika menjalankan `npm ci`.

Dokumen tugas mengizinkan AI, tetapi mewajibkan disclosure, pemahaman kode, verifikasi, dan data pengguna/eksperimen asli. Lihat `docs/AI_USAGE_LOG.md` dan `docs/EXPERIMENT_PROTOCOL.md`.

## Sumber primer

- [Whisper paper](https://arxiv.org/abs/2212.04356)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Whisper Tiny ONNX](https://huggingface.co/onnx-community/whisper-tiny)
- [Whisper Base ONNX](https://huggingface.co/onnx-community/whisper-base)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
