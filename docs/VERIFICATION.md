# Hasil verifikasi paket awal

Tanggal pemeriksaan: 14 Oktober 2026. Lingkungan build/test: Linux, Node.js 24.19.0. Ini adalah hasil pemeriksaan pengembangan, bukan hasil eksperimen mahasiswa atau user testing.

## Pemeriksaan yang sudah dilakukan

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript strict (`tsc -b`) | Lulus |
| Production build (`npm run build`) | Lulus, Vite 8.3.4 |
| Automated tests (`npm test`) | 33 lulus, 4 file test, Vitest 5.0.4 |
| Dependency audit (`npm audit`) | 0 temuan pada saat pemeriksaan; bukan jaminan bebas seluruh masalah keamanan |
| Whisper Tiny q8, native Node CPU, audio nyata | Berhasil mengeluarkan transkripsi dari sampel 11 detik |

## Cakupan 33 test

- 20 core tests: WER S/D/I, normalisasi, referensi kosong, hypothesis kosong, batas input, WER >100%, technical term errors, streaming partial/final, silence suppression, pre-roll, batas segmen, short speech flush, antrean, session persistence/corrupt storage, timestamp SRT, CSV escaping, glossary boundaries dan regex escaping.
- 3 AudioWorklet tests: sumber processor yang sama dijalankan pada fixture VM dengan sample rate 16.000, 44.100, dan 48.000 Hz; output satu detik adalah 16.000 sampel mono dan flush berfungsi.
- 5 UI workflow tests: demo berlabel, bookmark dan notes, reopen session, glossary tambah/duplikat, WER dari input pengguna, focus/Escape, dan pesan storage rusak (beberapa assertion dalam satu test).
- 5 lifecycle tests: partial saat listening lalu final saat stop, mic permission ditolak, worker gagal, cleanup unmount, dan race antara hasil inference dengan flush AudioWorklet.

Fixture UI menggunakan jsdom. Mikrofon, AudioContext dan Worker pada lifecycle tests adalah mock. Hasilnya tidak boleh ditulis sebagai pengujian ASR browser yang sebenarnya.

## Native ASR smoke test

Sampel: `jfk.wav` dari dataset dokumentasi Transformers.js, tersedia di https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav.

Audio diubah menjadi mono float32 16 kHz menggunakan FFmpeg, lalu diproses oleh Transformers.js 4.3.1, `onnx-community/whisper-tiny`, dtype q8, device CPU, bahasa Inggris. Durasi audio 11 detik; inference tercatat sekitar 781 ms dalam satu run setelah model dimuat. Transkripsi kalimat sampel berhasil dihasilkan.

Angka tersebut adalah satu smoke test native CPU di lingkungan pengembangan. Jangan menggunakannya sebagai latency browser, latency mikrofon, hasil bahasa Indonesia, benchmark kecepatan universal, atau hasil user testing. Model loading tidak termasuk waktu inference tersebut. Native CPU juga dapat memakai konfigurasi thread berbeda dari WASM satu thread.

## Belum diverifikasi

- Mikrofon nyata dan pipeline browser secara end-to-end.
- Loading/inference WebGPU di GPU pengguna.
- ASR model Base secara nyata (berkas konfigurasi/bobot yang diperlukan teridentifikasi, tetapi inference belum diuji).
- Rendering screenshot desktop/mobile, print PDF, serta screen reader pada browser nyata. Browser QA tidak tersedia dalam lingkungan pengerjaan.
- Deployment produksi pada akun Vercel pengguna.
- Kinerja bahasa Indonesia/campuran bahasa, noise, speaking speed, WER dataset eksperimen.
- User testing minimal 5 mahasiswa yang nyata.

Selesaikan `ACCEPTANCE_TEST.md` di URL Vercel dan ikuti `EXPERIMENT_PROTOCOL.md` sebelum menulis kesimpulan akademik. Paket mencakup perangkat evaluasi dan protokolnya, bukan hasil penelitian yang belum dilaksanakan.
