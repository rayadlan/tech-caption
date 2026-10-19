import type { Term } from "./types";
export const defaultTerms: Term[] = [
  {
    term: "machine learning",
    definition:
      "Metode yang mempelajari pola dari data untuk membuat prediksi.",
  },
  {
    term: "neural network",
    definition:
      "Model dengan lapisan neuron buatan untuk mempelajari representasi data.",
  },
  {
    term: "deep learning",
    definition: "Machine learning menggunakan neural network berlapis.",
  },
  {
    term: "backpropagation",
    definition: "Perhitungan gradien dari keluaran menuju lapisan sebelumnya.",
  },
  {
    term: "gradient descent",
    definition:
      "Optimisasi parameter dengan bergerak berlawanan arah gradien loss.",
  },
  {
    term: "overfitting",
    definition:
      "Model terlalu sesuai dengan data latih sehingga generalisasinya buruk.",
  },
  {
    term: "transformer",
    definition:
      "Arsitektur yang menggunakan attention untuk mengolah urutan token.",
  },
  {
    term: "attention",
    definition: "Mekanisme pembobotan hubungan antarbagian input.",
  },
  {
    term: "dataset",
    definition: "Kumpulan data yang digunakan untuk pelatihan atau evaluasi.",
  },
  {
    term: "speech recognition",
    definition: "Proses mengubah sinyal ucapan menjadi teks.",
  },
  {
    term: "inference",
    definition: "Menjalankan model terlatih untuk menghasilkan prediksi.",
  },
  {
    term: "API",
    definition: "Antarmuka yang menghubungkan komponen perangkat lunak.",
  },
  {
    term: "algoritma",
    definition: "Urutan langkah terstruktur untuk menyelesaikan masalah.",
  },
  {
    term: "database",
    definition:
      "Kumpulan data yang disimpan dan diorganisasi untuk diakses kembali.",
  },
];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function termParts(
  text: string,
  terms: Term[],
): { text: string; term?: Term }[] {
  if (!terms.length) return [{ text }];
  const names = [...terms].sort((a, b) => b.term.length - a.term.length);
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${names.map((t) => escape(t.term)).join("|")})(?![\\p{L}\\p{N}_])`,
    "giu",
  );
  const parts: { text: string; term?: Term }[] = [];
  let pos = 0;
  for (const m of text.matchAll(re)) {
    const index = m.index!;
    if (index > pos) parts.push({ text: text.slice(pos, index) });
    parts.push({
      text: m[0],
      term: names.find((t) => t.term.toLowerCase() === m[0].toLowerCase()),
    });
    pos = index + m[0].length;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos) });
  return parts;
}
