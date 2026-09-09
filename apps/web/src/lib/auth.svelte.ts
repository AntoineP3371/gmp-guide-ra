import { pb } from "./pb";
import type { Role } from "./types";

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name?: string;
}

function currentUser(): AuthUser | null {
  const r = pb.authStore.record;
  if (!r) return null;
  return { id: r.id, email: r.email, role: (r.role as Role) ?? "viewer", name: r.name };
}

export const auth = $state<{ user: AuthUser | null }>({ user: currentUser() });

pb.authStore.onChange(() => {
  auth.user = currentUser();
});

export async function login(email: string, password: string): Promise<void> {
  await pb.collection("users").authWithPassword(email, password);
}

export function logout(): void {
  pb.authStore.clear();
}

export function canEdit(): boolean {
  return auth.user?.role === "admin" || auth.user?.role === "author";
}
