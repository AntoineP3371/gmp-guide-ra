import PocketBase from "pocketbase";

// En dev, VITE_PB_URL vide → même origine, le proxy Vite route /api vers :8090.
// En prod, l'app est servie par PocketBase (backend/pb_public) → même origine aussi.
export const pb = new PocketBase(import.meta.env.VITE_PB_URL || window.location.origin);

pb.autoCancellation(false);
