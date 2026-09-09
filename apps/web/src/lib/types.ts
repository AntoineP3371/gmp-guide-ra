export type Role = "admin" | "author" | "viewer";
export type Ecc = "L" | "M" | "Q" | "H";
export type Section = "usage" | "maintenance" | "capabilities" | "safety";
export type ObjectType = "video" | "pdf" | "image" | "model" | "callout" | "text" | "hotspot";
export type MachineStatus = "draft" | "review" | "published";

export interface Machine {
  id: string;
  name: string;
  slug: string;
  category?: string;
  location?: string;
  languages?: string[];
  description?: string;
  photos?: string[];
  qr_code: string;
  qr_payload?: string;
  qr_size_m: number;
  qr_ecc: Ecc;
  status: MachineStatus;
  current_revision: number;
  created: string;
  updated: string;
}

export interface ContentItem {
  id: string;
  machine: string;
  type: ObjectType;
  section: Section;
  title?: Record<string, string>;
  config?: Record<string, unknown>;
  media?: string;
  media_pages?: string[];
  thumbnail?: string;
  sort: number;
}

export interface Placement {
  id: string;
  content_item: string;
  anchor_mode: "qr-relative" | "world";
  position: [number, number, number];
  rotation: [number, number, number, number];
  size?: [number, number] | null;
  scale?: number;
  billboard?: "none" | "y" | "full";
  source: "photo2d" | "headset";
  updated: string;
}

export interface ManifestRecord {
  id: string;
  machine: string;
  revision: number;
  data: unknown;
  published: string;
}
