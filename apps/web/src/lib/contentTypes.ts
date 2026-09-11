import type { ObjectType, Section } from "./types";

export const OBJECT_TYPES: { value: ObjectType; label: string; planar: boolean }[] = [
  { value: "text", label: "Texte / specs", planar: true },
  { value: "image", label: "Image", planar: true },
  { value: "video", label: "Vidéo", planar: true },
  { value: "pdf", label: "PDF (pages)", planar: true },
  { value: "model", label: "Modèle 3D", planar: false },
  { value: "callout", label: "Call-out (désigne un point)", planar: false },
  { value: "hotspot", label: "Point chaud", planar: true },
];

export const SECTIONS: { value: Section; label: string }[] = [
  { value: "usage", label: "Utilisation" },
  { value: "maintenance", label: "Entretien" },
  { value: "capabilities", label: "Capacités" },
  { value: "safety", label: "Sécurité" },
];

/** Config par défaut à l'écriture — les champs sont ensuite édités via le formulaire. */
export function defaultConfig(type: ObjectType): Record<string, unknown> {
  switch (type) {
    case "video":
      return { src: "", loop: false, muted: false, autoplay: false };
    case "pdf":
      return { src: "", pages: [] };
    case "image":
      return { src: "" };
    case "model":
      return { src: "", autoRotate: false };
    case "callout":
      return { target: [0, 0, 0.1], label: {}, style: "leader" };
    case "text":
      return { format: "plain", content: {} };
    case "hotspot":
      return { icon: "", expands: "" };
  }
}

/** Placement par défaut posé à la création — affiné ensuite dans l'éditeur 2D / au casque. */
export function defaultPlacement(type: ObjectType) {
  const planar = OBJECT_TYPES.find((t) => t.value === type)?.planar ?? true;
  return {
    anchor_mode: "qr-relative" as const,
    position: [0, 0, 0.05],
    rotation: [0, 0, 0, 1],
    size: planar && type !== "callout" ? [0.3, 0.2] : null,
    scale: type === "model" ? 1 : undefined,
    billboard: "none" as const,
    source: "photo2d" as const,
  };
}
