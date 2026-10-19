# Checklist setelah deployment

Gunakan browser desktop Chrome atau Edge, profil non-incognito, dan URL HTTPS. Ini daftar pemeriksaan yang harus dilaksanakan pada perangkat target, bukan daftar yang sudah dinyatakan lulus.

## Jalur normal

- [ ] Halaman termuat tanpa error console, model/worker/WASM tidak 404.
- [ ] Tiny + Otomatis selesai loading dan menampilkan backend aktual.
- [ ] Permintaan mikrofon muncul hanya setelah klik Mulai sesi.
- [ ] Indikator input dan timer berubah saat berbicara.
- [ ] Partial transcript muncul **sebelum** penjelasan 20–30 detik selesai.
- [ ] Jeda 800 ms menghasilkan segmen final, dengan ID tidak duplikat.
- [ ] Berbicara kontinu lebih dari 12 detik tidak menimbulkan buffer tak terbatas.
- [ ] Akhiri sesi berhenti memakai mikrofon, menyelesaikan antrean, dan kembali siap.
- [ ] Sesi berikutnya tidak berisi hasil worker dari sesi sebelumnya.
- [ ] Ulangi uji di bahasa Inggris dan dengan Whisper Base jika hardware memadai.

## UI dan data

- [ ] Bookmark, pencarian kata, auto-scroll, fokus, Esc, dan definisi istilah bekerja.
- [ ] Catatan dan judul kembali setelah reload.
- [ ] Demo ditandai dan tidak menyediakan metrik palsu.
- [ ] TXT/JSON memuat transkrip serta catatan; SRT berisi segmen final berurutan.
- [ ] PDF melalui dialog print terbaca tanpa sidebar atau kontrol rekam.
- [ ] Hapus sesi meminta konfirmasi, Batal tidak menghapus, Tab tetap dalam dialog.
- [ ] Tambah/hapus glosarium dan validasi istilah duplikat bekerja.
- [ ] WER kasus sederhana sesuai hitungan manual; hypothesis kosong menghasilkan deletion.
- [ ] Form user testing memerlukan input nyata, kemudian CSV memuat input yang benar.
- [ ] Desktop 1440 px, laptop 1024 px, dan mobile 390 px tidak overflow horizontal.
- [ ] Keyboard focus dan label pembaca layar bisa digunakan.

## Jalur error

- [ ] Tolak mikrofon: pesan jelas, aplikasi tidak tersangkut Listening.
- [ ] Cabut mikrofon saat sesi: tangkapan berhenti dan teks sebelumnya bertahan.
- [ ] Batalkan loading: worker dibersihkan dan model bisa dimuat ulang.
- [ ] Matikan jaringan sebelum model pertama dimuat: error/timeout dapat dipulihkan.
- [ ] Pilih GPU pada perangkat tanpa WebGPU: ada pesan memilih CPU.
- [ ] Jalankan CPU pada perangkat lambat: antrean ditampilkan; bila 3 final tertinggal, input berhenti otomatis.
- [ ] Pindah ke tab background/suspend audio: bila browser suspend AudioContext, sesi diakhiri dengan pemberitahuan.
- [ ] Storage diblokir/penuh: ada peringatan dan ekspor sesi masih dapat digunakan.
- [ ] Tombol reload/close saat rekam meminta konfirmasi browser bila didukung browser.

## Verifikasi privasi

Buka Network panel. Ketika berbicara, tidak boleh ada request yang membawa PCM, file rekaman, atau isi transkrip ke layanan ASR. Request model/runtime/aset statis saat loading adalah normal. Periksa juga indikator mikrofon browser sudah mati setelah stop.

## Kriteria yang tidak boleh diasumsikan

Layout responsif tidak menjamin dukungan ASR di semua mobile/Safari. Kecepatan smoke test server bukan kecepatan laptop pengguna. Model pretrained tidak menjamin istilah CS dikenali benar. Dokumen tugas meminta user testing asli dan analisis; aplikasi saja belum menyelesaikan laporan final.
