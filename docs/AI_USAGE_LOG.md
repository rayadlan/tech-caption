# AI usage log dan verifikasi

Dokumen ini mencatat bantuan AI pada paket awal. Kolom verifikasi mahasiswa harus dilengkapi setelah Ray/tim benar-benar memeriksa dan menjalankan aplikasinya.

| Tool            | Tujuan                   | Ringkasan instruksi                                                                                            | Output digunakan             | Verifikasi tersedia                                                     | Verifikasi mahasiswa |
| --------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- | -------------------- |
| ChatGPT / Codex | Menyelaraskan kebutuhan  | Implementasikan TechCaption berdasarkan diskusi dan dokumen final project, deployable Vercel, perhatikan UI/UX | Arsitektur browser-local ASR | Dokumen tugas dibaca; larangan external ASR API diterapkan              | Belum diisi          |
| ChatGPT / Codex | Implementasi             | Bangun pipeline audio, model, UI, session storage, export                                                      | Source dalam paket           | TypeScript, production build, automated fixtures, native ASR smoke test | Belum diisi          |
| ChatGPT / Codex | Debugging dan verifikasi | Uji segmentasi, WER, microphone lifecycle, UI, dependency audit                                                | Tests dan perbaikan          | Lihat VERIFICATION.md                                                   | Belum diisi          |
| ChatGPT / Codex | Dokumentasi              | Susun panduan deploy dan protokol pengujian tanpa hasil fiktif                                                 | README dan docs              | Disesuaikan dengan kode dan ketentuan tugas                             | Belum diisi          |

## Keputusan yang perlu bisa dijelaskan mahasiswa

- Mengapa inference berada di browser, sementara Vercel hanya hosting?
- Apa perbedaan model Whisper dan wrapper streaming yang ditulis?
- Bagaimana PCM 16 kHz, energy gate, pre-roll, partial replacement, dan queue bekerja?
- Mengapa Tiny dipilih awal, dan apa konsekuensi Base/GPU/CPU?
- Apa yang dimaksud tiap metrik timing? Mana yang bukan end-to-end word latency?
- Mengapa glosarium tidak dianggap memperbaiki model?
- Bagaimana WER diperoleh lewat dynamic programming dan apa definisi term error di sini?
- Apa yang gagal di perangkat target, dan perbaikan apa yang dipilih setelah melihat bukti?

## Catatan tanggung jawab

Paket ini dibuat dengan bantuan AI secara substansial. Jangan mengklaim kode sepenuhnya ditulis tanpa bantuan. Tidak ada eksperimen peserta maupun hasil user testing yang dibuat oleh AI sebagai pengganti data asli. Pengujian fixture hanya memverifikasi bagian tertentu dan tidak menggantikan demonstrasi real-time.

## Template declaration

Gunakan setelah memastikan isinya sesuai proses sebenarnya, lalu sesuaikan dengan format dosen:

“I acknowledge that AI tools were used during the development of this project. I have disclosed the relevant AI tools and their purposes in the AI Usage Log. I remain responsible for the correctness of the application, experimental results, analysis, user testing, and conclusions presented in this report.”
