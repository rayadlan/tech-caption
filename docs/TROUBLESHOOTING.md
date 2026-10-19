# Troubleshooting

| Gejala                                     | Pemeriksaan / tindakan                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm` tidak dikenali                       | Pasang Node.js 22/24, buka terminal baru, cek `node -v` dan `npm -v`.                                                            |
| PowerShell menolak npm.ps1                 | Gunakan Command Prompt atau `npm.cmd`.                                                                                           |
| Vercel tidak menemukan package.json        | Root Directory harus berada pada folder `tech-caption` bila repository membungkusnya dengan folder itu.                          |
| Install mencoba mengunduh CUDA             | Pastikan `.npmrc` ikut diupload dan berisi `ignore-scripts=true`; web app tidak memerlukan CUDA native.                          |
| Rolldown/esbuild missing binary            | Jangan gunakan `--omit=optional`. Jalankan `npm ci` dengan lockfile paket.                                                       |
| Model tidak selesai loading                | Internet diperlukan untuk bobot; periksa firewall/Hugging Face/CDN. Batalkan dan coba Tiny + CPU.                                |
| `no available backend`, WebGPU/device lost | Pilih CPU. Untuk GPU, perbarui browser/driver dan pastikan hardware acceleration aktif.                                          |
| Browser kehabisan memori                   | Pilih Tiny, tutup tab berat, dan hindari beberapa instance ASR sekaligus.                                                        |
| Tidak ada prompt mikrofon                  | Gunakan HTTPS atau localhost; periksa izin microphone di ikon pengaturan situs/browser.                                          |
| Teks tidak muncul dengan suara pelan       | Turunkan energy threshold sebelum mulai sesi, dekatkan mic, pastikan input OS benar.                                             |
| Teks muncul saat tidak bicara              | Tingkatkan threshold dan kurangi noise. Energy gate bukan VAD yang sempurna; Whisper dapat berhalusinasi pada noise.             |
| Hasil bahasa tidak sesuai                  | Pilih bahasa utama sesi; campuran Indonesia-Inggris tetap membutuhkan pengujian, bukan dijamin benar.                            |
| Sesi otomatis berhenti                     | Periksa peringatan antrean lambat, perangkat terputus, atau AudioContext suspend. Selesaikan queue, lalu mulai sesi baru.        |
| Font/model tidak termuat offline           | Font dibundel, tetapi aplikasi tidak memiliki service worker. Cache model membantu inference, bukan jaminan full offline reload. |
| Sesi tidak muncul di perangkat lain        | Sesi hanya disimpan pada localStorage browser dan origin yang sama.                                                              |
| Sesi hilang setelah clear site data        | Gunakan arsip ekspor. Aplikasi belum memiliki fitur import atau cloud backup.                                                    |
| Ekspor SRT terasa terlalu panjang          | Timestamp mengikuti segmen 0–12 detik, bukan per kata; edit segmentasi subtitle di tool terpisah bila perlu.                     |
| PDF belum terunduh                         | Tombol PDF membuka dialog cetak. Pilih Save as PDF, lalu Save; aplikasi tidak mengunggah file PDF.                               |

Jika perubahan kode diperlukan, simpan contoh audio dengan izin, konfigurasi, langkah reproduksi, error console, dan CSV metrik. Jangan mengirim audio atau transkrip sensitif tanpa persetujuan pemiliknya.
