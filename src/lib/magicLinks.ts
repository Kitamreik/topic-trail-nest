// Magic links allow a webmaster to invite someone to claim an elevated role
// (admin or webmaster) without exposing self-selection at public signup.
// Tokens are single-use, role-scoped, and expire.
import type { UserRole } from "@/context/AuthContext";

const KEY = "cookielms-magic-links";

export type MagicLinkRole = Extract<UserRole, "admin" | "webmaster">;

export interface MagicLink {
  token: string;
  role: MagicLinkRole;
  note: string;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
}

function load(): MagicLink[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MagicLink[]) : [];
  } catch {
    return [];
  }
}

function save(links: MagicLink[]) {
  localStorage.setItem(KEY, JSON.stringify(links));
}

export function listMagicLinks(): MagicLink[] {
  return load().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createMagicLink(input: {
  role: MagicLinkRole;
  note?: string;
  createdBy: string;
  ttlHours: number;
}): MagicLink {
  const token = `${crypto.randomUUID().replace(/-/g, "")}${Date.now().toString(36)}`;
  const link: MagicLink = {
    token,
    role: input.role,
    note: input.note?.trim() || "",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    expiresAt: new Date(Date.now() + input.ttlHours * 3600 * 1000).toISOString(),
    usedAt: null,
    usedBy: null,
  };
  const links = load();
  links.push(link);
  save(links);
  return link;
}

export function revokeMagicLink(token: string) {
  save(load().filter(l => l.token !== token));
}

export function getMagicLink(token: string): MagicLink | null {
  return load().find(l => l.token === token) ?? null;
}

export function consumeMagicLink(token: string, usedBy: string): { success: boolean; error?: string; link?: MagicLink } {
  const links = load();
  const idx = links.findIndex(l => l.token === token);
  if (idx === -1) return { success: false, error: "Invalid invitation link." };
  const link = links[idx];
  if (link.usedAt) return { success: false, error: "This invitation has already been used." };
  if (new Date(link.expiresAt).getTime() < Date.now()) return { success: false, error: "This invitation has expired." };
  links[idx] = { ...link, usedAt: new Date().toISOString(), usedBy };
  save(links);
  return { success: true, link: links[idx] };
}

export function buildMagicLinkUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/claim-invite?token=${encodeURIComponent(token)}`;
}

export function isExpired(link: MagicLink): boolean {
  return new Date(link.expiresAt).getTime() < Date.now();
}
