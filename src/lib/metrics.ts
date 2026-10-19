export type Edit = {
  op: "equal" | "substitution" | "deletion" | "insertion";
  ref: string;
  hyp: string;
};
export function tokens(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
export function wordErrorRate(reference: string, hypothesis: string) {
  const r = tokens(reference),
    h = tokens(hypothesis);
  if (!r.length) throw new Error("Teks referensi tidak boleh kosong.");
  if (r.length > 1500 || h.length > 1500)
    throw new Error(
      "Maksimal 1.500 kata per pengukuran. Pecah transkrip menjadi beberapa sampel.",
    );
  const width = h.length + 1,
    d = new Uint16Array((r.length + 1) * width);
  for (let i = 0; i <= r.length; i++) d[i * width] = i;
  for (let j = 0; j <= h.length; j++) d[j] = j;
  for (let i = 1; i <= r.length; i++)
    for (let j = 1; j <= h.length; j++)
      d[i * width + j] = Math.min(
        d[(i - 1) * width + j] + 1,
        d[i * width + j - 1] + 1,
        d[(i - 1) * width + j - 1] + Number(r[i - 1] !== h[j - 1]),
      );
  const alignment: Edit[] = [];
  let i = r.length,
    j = h.length,
    S = 0,
    D = 0,
    I = 0;
  while (i || j) {
    if (
      i &&
      j &&
      d[i * width + j] ===
        d[(i - 1) * width + j - 1] + Number(r[i - 1] !== h[j - 1])
    ) {
      const same = r[i - 1] === h[j - 1];
      alignment.push({
        op: same ? "equal" : "substitution",
        ref: r[--i],
        hyp: h[--j],
      });
      if (!same) S++;
    } else if (i && d[i * width + j] === d[(i - 1) * width + j] + 1) {
      alignment.push({ op: "deletion", ref: r[--i], hyp: "" });
      D++;
    } else {
      alignment.push({ op: "insertion", ref: "", hyp: h[--j] });
      I++;
    }
  }
  return {
    wer: (S + D + I) / r.length,
    S,
    D,
    I,
    N: r.length,
    alignment: alignment.reverse(),
  };
}
export function technicalTermError(alignment: Edit[], terms: string[]) {
  const refs = alignment.flatMap((e, i) =>
    e.ref ? [{ word: e.ref, index: i }] : [],
  );
  const choices = terms
    .map(tokens)
    .filter((t) => t.length)
    .sort((a, b) => b.length - a.length);
  let total = 0,
    errors = 0;
  for (let i = 0; i < refs.length; ) {
    const match = choices.find((t) =>
      t.every((w, j) => refs[i + j]?.word === w),
    );
    if (!match) {
      i++;
      continue;
    }
    total++;
    const from = refs[i].index,
      to = refs[i + match.length - 1].index;
    if (alignment.slice(from, to + 1).some((e) => e.op !== "equal")) errors++;
    i += match.length;
  }
  return { total, errors, rate: total ? errors / total : null };
}
export function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  return v[Math.max(0, Math.ceil(p * v.length) - 1)];
}
