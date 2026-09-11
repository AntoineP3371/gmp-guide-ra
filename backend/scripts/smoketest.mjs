// Test de bout en bout jetable — pas dans le repo final, usage ponctuel de dev.
const B = "http://127.0.0.1:8090";

async function j(method, path, token, body) {
  const res = await fetch(B + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`FAIL ${method} ${path} -> ${res.status}`, JSON.stringify(data));
    throw new Error(`${method} ${path} failed`);
  }
  return data;
}

const su = await j("POST", "/api/collections/_superusers/auth-with-password", null, {
  identity: "admin@local.test",
  password: "adminpass123",
});
await j("POST", "/api/collections/users/records", su.token, {
  email: "author@local.test",
  password: "authorpass123",
  passwordConfirm: "authorpass123",
  role: "author",
  name: "Prep",
}).catch(() => {}); // peut déjà exister

const auth = await j("POST", "/api/collections/users/auth-with-password", null, {
  identity: "author@local.test",
  password: "authorpass123",
});
const AT = auth.token;

const machine = await j("POST", "/api/collections/machines/records", AT, {
  name: "Fraiseuse test",
  category: "Fraisage",
  location: "Atelier B",
  qr_size_m: 0.1,
});
console.log("machine:", { id: machine.id, qr_code: machine.qr_code, scenario_mode: machine.scenario_mode });

const item1 = await j("POST", "/api/collections/content_items/records", AT, {
  machine: machine.id,
  type: "text",
  section: "capabilities",
  title: { fr: "Specs" },
  config: { format: "plain", content: { fr: "Ø max 200mm" } },
  sort: 0,
});
console.log("content_item:", item1.id);

const item2 = await j("POST", "/api/collections/content_items/records", AT, {
  machine: machine.id,
  type: "video",
  section: "usage",
  title: { fr: "Intro" },
  config: { src: "placeholder.mp4", loop: false, muted: false, autoplay: false },
  sort: 0,
});
console.log("content_item2:", item2.id);

await j("POST", "/api/collections/placements/records", AT, {
  content_item: item1.id,
  anchor_mode: "qr-relative",
  position: [0.1, 0.1, 0.05],
  rotation: [0, 0, 0, 1],
  size: [0.3, 0.2],
  source: "photo2d",
});
await j("POST", "/api/collections/placements/records", AT, {
  content_item: item2.id,
  anchor_mode: "qr-relative",
  position: [-0.2, 0.1, 0.05],
  rotation: [0, 0, 0, 1],
  size: [0.4, 0.225],
  source: "photo2d",
});
console.log("placements OK");

await j("PATCH", `/api/collections/machines/records/${machine.id}`, AT, {
  scenario_mode: "guided",
  scenario_always_visible: [item1.id],
});

await j("POST", "/api/collections/scenario_steps/records", AT, {
  machine: machine.id,
  sort: 0,
  title: { fr: "Etape 1" },
  object_ids: [item2.id],
  advance_trigger: "media_end",
});
await j("POST", "/api/collections/scenario_steps/records", AT, {
  machine: machine.id,
  sort: 1,
  object_ids: [item1.id],
  advance_trigger: "timer",
  advance_after_seconds: 8,
});
console.log("steps OK");

const pub = await j("POST", `/api/publish/${machine.id}`, AT);
console.log("\n=== MANIFEST ===\n", JSON.stringify(pub.manifest, null, 2));

const fetched = await j("GET", `/api/manifest/${machine.qr_code}`, AT);
console.log("\n=== re-fetched, objects:", fetched.objects.length, "steps:", fetched.scenario.steps.length, "===");

// Vérifs de non-corruption
const ok =
  Array.isArray(fetched.scenario.alwaysVisible) &&
  fetched.scenario.alwaysVisible[0] === item1.id &&
  fetched.scenario.steps[0].objectIds[0] === item2.id &&
  fetched.objects.find((o) => o.id === item1.id).title.fr === "Specs" &&
  fetched.objects.find((o) => o.id === item1.id).placement.position[0] === 0.1;

console.log(ok ? "\n✅ TOUT EST CORRECT" : "\n❌ CORRUPTION DÉTECTÉE");
if (!ok) process.exit(1);
