# Protokol eksperimen dan user testing

Dokumen ini adalah rancangan pelaksanaan. Tidak ada hasil atau peserta fiktif yang dinyatakan sebagai data penelitian.

## Target

Rekrut minimal 5 mahasiswa Computer Science yang mengikuti kuliah dengan istilah teknis, misalnya mahasiswa kelas Speech Recognition/AI yang bisa ditemui. Catat kode U01–U05, semester, bahasa kuliah yang biasa digunakan, dan pengalaman dengan caption. Minta persetujuan penggunaan transkrip/feedback sebelum mulai; jangan mengumpulkan nama lengkap bila tidak dibutuhkan.

## Pertanyaan eksperimen

1. Seberapa besar WER pada kuliah teknis berbahasa Indonesia?
2. Bagaimana background noise memengaruhi WER dan latency?
3. Berapa banyak istilah teknis yang dikenali dengan benar?
4. Apakah teks muncul saat pembicara masih berbicara dan cukup membantu untuk mengikuti penjelasan?

## Rancangan minimal yang dianjurkan

- 5 pembicara × 3 materi singkat × 2 kondisi (clean dan noise) = 30 percobaan. Ini usulan rancangan, bukan data yang sudah tersedia.
- Masing-masing materi 30–60 detik. Sertakan kalimat umum dan istilah CS.
- Jaga model, backend, threshold, browser, jarak mic, dan volume speaker tetap sama saat membandingkan clean vs noise.
- Gunakan suara latar yang sama serta volume dan posisi sumber yang dicatat. Jika tidak memiliki pengukuran SNR terkalibrasi, jangan menyebut kondisi sebagai “10 dB SNR”.
- Untuk membandingkan model Tiny dan Base, ulangi materi/kondisi yang sama dan laporkan sebagai faktor terpisah. Quantization CPU dan GPU berbeda; jangan menyamakan konfigurasi tanpa mencatat dtype.
- Model cache dihangatkan sebelum pengukuran utama. Laporkan cold start/unduhan secara terpisah.
- Catat urutan pengujian; tukar urutan clean/noise antarpartisipan untuk mengurangi pengaruh latihan.

## Contoh naskah buatan untuk dibaca

Ini **stimulus uji buatan**, bukan dataset benchmark dan bukan hasil transkripsi.

A. “Machine learning mempelajari pola dari data untuk membuat prediksi. Dataset dibagi menjadi data pelatihan dan pengujian. Model yang baik harus mampu bekerja pada data yang belum pernah dilihat.”

B. “Neural network memiliki beberapa lapisan. Backpropagation menghitung gradien, sedangkan gradient descent memperbarui parameter model. Overfitting terjadi ketika model terlalu menghafal data pelatihan.”

C. “Speech recognition mengubah ucapan menjadi teks. Transformer menggunakan attention untuk mempelajari hubungan antarbagian input. Kualitas mikrofon, noise, dan kecepatan bicara dapat memengaruhi hasil inference.”

Reference untuk WER harus mengikuti **ucapan yang benar-benar disampaikan**, termasuk perbedaan dari naskah. Jangan otomatis menggunakan naskah sebagai ground truth jika pembicara mengubah kalimat. Untuk verifikasi, siapkan rekaman terpisah dengan persetujuan peserta; aplikasi ini tidak menyimpan audio mentah.

## Langkah per percobaan

1. Isi `experiment-manifest.csv`: kode, kondisi, perangkat, browser, backend aktual, model, threshold, setting mic dan catatan lingkungan.
2. Buat sesi baru dengan judul kode sampel, muat model, dan mulai mikrofon.
3. Bacakan naskah. Amati apakah partial muncul sebelum pembicara selesai. Catat hasil observasi ya/tidak serta masalah.
4. Akhiri sesi dan tunggu final. Ekspor JSON sesi, TXT transkrip, dan CSV metrik dari Evaluation Lab.
5. Verifikasi reference manual terhadap ucapan/audio sebenarnya.
6. Isi reference/hypothesis mentah, kode dan kondisi di Evaluation Lab. Hitung dan simpan WER; ekspor riwayat evaluasi JSON.
7. Simpan file ekspor beserta manifest sebagai bukti. Jangan mengoreksi hypothesis sebelum WER.

## Tugas usability

- Mulai transkripsi penjelasan selama 1–2 menit.
- Temukan satu istilah teknis dan buka definisinya.
- Bookmark satu bagian penting.
- Cari kata tertentu di transkrip.
- Tambahkan catatan, akhiri sesi, ekspor TXT/PDF, lalu buka kembali sesi.

Observer mencatat keberhasilan tiap task, kesalahan klik, bantuan yang dibutuhkan, dan waktu bila relevan. Jangan hanya menilai hasil akhir; catat kebingungan interaksi.

Setiap peserta memberi rating 1–5 untuk kemudahan, respons, kualitas transkrip, dan kepuasan. Form tidak diisi otomatis. Pertanyaan wawancara: fitur paling membantu, istilah yang salah, bagian yang membingungkan, dan satu perbaikan yang paling dibutuhkan.

## Analisis

- Laporkan WER tiap sampel, lalu aggregate `(ΣS + ΣD + ΣI) / ΣN` per kondisi. Jangan sekadar rata-rata persentase tanpa menjelaskan pembobotannya.
- Bandingkan pasangan clean/noise pada materi dan pembicara yang sama.
- Laporkan median dan P95 respons, waktu teks pertama, serta jumlah percobaan ketika caption tidak muncul saat bicara.
- RTF total workload = jumlah inferenceMs / durasi sesi (ms), bukan rata-rata RTF snapshot.
- Ambil contoh substitusi, deletion, dan insertion; identifikasi istilah teknis, campuran bahasa, noise, maupun batas segmen.
- Hubungkan keluhan pengguna dengan hasil kuantitatif. Contoh interpretasi hanya boleh ditulis jika didukung data asli.
- N=5 cocok sebagai formative usability study kecil. Jangan menggeneralisasi kepuasan ke seluruh mahasiswa tanpa batasan.

## Struktur technical report

1. Introduction: problem, target users, scenario, tujuan.
2. Speech recognition fundamentals: audio, sampling, log-Mel, Whisper encoder-decoder, token decoding.
3. System design: arsitektur, data flow, streaming wrapper, UI.
4. Implementation: library/version, hardware, keputusan dan batasan.
5. Technical experiment: sampel, baseline, kondisi, metrik, hasil asli, error analysis.
6. User testing: peserta nyata, tugas, observasi, feedback, temuan.
7. Discussion: gabungan evaluasi teknis dan pengalaman pengguna.
8. Conclusion: hasil yang terbukti, keterbatasan, perbaikan.
9. AI Usage Log dan declaration.

Sertakan screenshot yang kamu ambil saat aplikasi benar-benar dijalankan, bukti transcript, hasil metrik, dan feedback. Unit test bukan pengganti eksperimen ASR atau user testing.
