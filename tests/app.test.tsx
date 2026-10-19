import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { readSessions } from "../src/lib/storage";
describe("student workflows (UI fixture, not real ASR)", () => {
  it("opens labelled demo, bookmarks, stores notes and reopens session", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("button", { name: "Siapkan model" })).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: /Lihat contoh transkrip/ }),
    );
    expect(screen.getByText(/CONTOH UI · Teks ilustrasi/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Bookmark 00:00" }));
    fireEvent.change(screen.getByLabelText("Catatan pribadi"), {
      target: { value: "Tanya dosen tentang gradien." },
    });
    await waitFor(() =>
      expect(readSessions()[0]?.notes).toBe("Tanya dosen tentang gradien."),
    );
    expect(readSessions()[0].segments[0].bookmark).toBe(true);
    await user.click(screen.getByRole("button", { name: /Sesi tersimpan/ }));
    expect(screen.getByRole("button", { name: /Buka sesi/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Buka sesi/ }));
    expect(
      (screen.getByLabelText("Catatan pribadi") as HTMLTextAreaElement).value,
    ).toBe("Tanya dosen tentang gradien.");
  });
  it("adds a glossary entry and prevents duplicate terms", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Glosarium" }));
    await user.type(screen.getByLabelText("Istilah teknis"), "vector database");
    await user.type(
      screen.getByLabelText("Definisi singkat"),
      "Penyimpanan vektor",
    );
    await user.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect(screen.getByText("Penyimpanan vektor")).toBeTruthy();
    await user.type(screen.getByLabelText("Istilah teknis"), "VECTOR DATABASE");
    await user.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect(screen.getByText("Istilah ini sudah ada.")).toBeTruthy();
  });
  it("computes real WER from user text and stores an evaluation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Evaluation lab" }));
    fireEvent.change(screen.getByLabelText("Kode sampel"), {
      target: { value: "U01-clean" },
    });
    fireEvent.change(
      screen.getByLabelText("Referensi yang sudah diverifikasi"),
      { target: { value: "this is speech recognition" } },
    );
    fireEvent.change(screen.getByLabelText("Hasil ASR asli"), {
      target: { value: "this is speech" },
    });
    await user.click(screen.getByRole("button", { name: "Hitung & simpan" }));
    expect(screen.getByText("25.0%")).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("techcaption.evaluations.v1")!)[0].D,
    ).toBe(1);
  });
  it("focus mode exits on Escape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Mode fokus" }));
    expect(document.querySelector(".focus-mode")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(document.querySelector(".focus-mode")).toBeNull();
  });
  it("renders a storage warning without silently losing corrupt data", () => {
    localStorage.setItem("techcaption.sessions.v1", "not-json");
    render(<App />);
    expect(screen.getByRole("alert").textContent).toContain(
      "tidak dapat dibaca",
    );
  });
});
