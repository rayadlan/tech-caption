import { z } from "zod";
import { sessionSchema, termSchema, type Session, type Term } from "./types";
export const SESSION_KEY = "techcaption.sessions.v1";
export function readSessions(): Session[] {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return [];
  return z.array(sessionSchema).parse(JSON.parse(raw));
}
export function saveSession(session: Session) {
  const all = readSessions();
  const next = [session, ...all.filter((s) => s.id !== session.id)];
  if (next.length > 100)
    throw new Error("Batas 100 sesi tercapai. Ekspor lalu hapus sesi lama.");
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
}
export function deleteSession(id: string) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(readSessions().filter((s) => s.id !== id)),
  );
}
export function readTerms(): Term[] | null {
  const raw = localStorage.getItem("techcaption.terms.v1");
  return raw ? z.array(termSchema).max(150).parse(JSON.parse(raw)) : null;
}
export function saveTerms(terms: Term[]) {
  localStorage.setItem("techcaption.terms.v1", JSON.stringify(terms));
}
