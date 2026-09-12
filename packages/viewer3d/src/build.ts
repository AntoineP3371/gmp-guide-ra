import * as THREE from "three";

// Le manifest est en repère MAIN DROITE (comme three.js) → aucune conversion ici.
// L'app Unity, elle, applique la conversion décrite dans docs/manifest-contract.md.

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];

interface Placement {
  position: Vec3;
  rotation: Quat;
  size?: [number, number];
  scale?: number;
  billboard?: "none" | "y" | "full";
}
interface ManifestObject {
  id: string;
  type: string;
  section: string;
  title?: Record<string, string>;
  placement: Placement;
  config: any;
}
export interface ScenarioStep {
  id: string;
  title?: Record<string, string>;
  objectIds: string[];
  advance?: { trigger: string; afterSeconds?: number };
}
export interface Scenario {
  mode: "freeform" | "guided";
  alwaysVisible?: string[];
  steps?: ScenarioStep[];
}
export interface Manifest {
  machine: { name: string };
  qr: { physicalSizeMeters: number };
  scenario?: Scenario;
  objects: ManifestObject[];
}

const SECTION_COLOR: Record<string, number> = {
  usage: 0x4c8dff,
  maintenance: 0x3ecf8e,
  capabilities: 0xffc857,
  safety: 0xff5c5c,
};

const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin("anonymous");

export function buildObjects(manifest: Manifest, group: THREE.Group, camera: THREE.Camera): string[] {
  const warnings: string[] = [];
  while (group.children.length) group.remove(group.children[0]);

  for (const o of manifest.objects) {
    const node = new THREE.Group();
    node.userData.objectId = o.id;
    node.position.fromArray(o.placement.position);
    node.quaternion.fromArray(o.placement.rotation);
    const [w, h] = o.placement.size ?? [0.3, 0.2];
    const color = SECTION_COLOR[o.section] ?? 0x8892a0;

    switch (o.type) {
      case "image":
      case "pdf": {
        const url = o.type === "pdf" ? o.config?.pages?.[0] : o.config?.src;
        node.add(texturedPlane(w, h, color, url, warnings, o.id));
        break;
      }
      case "video": {
        node.add(videoPlane(w, h, color, o.config?.src, warnings, o.id));
        break;
      }
      case "text": {
        const txt = o.config?.content?.fr ?? o.config?.content?.en ?? "(texte)";
        node.add(canvasTextPlane(w, h, txt));
        break;
      }
      case "model": {
        const s = o.placement.scale ?? 1;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.2 * s, 0.2 * s, 0.2 * s),
          new THREE.MeshStandardMaterial({ color, wireframe: true })
        );
        node.add(box);
        node.add(label(o.title?.fr ?? "modèle 3D", 0.14 * s));
        warnings.push(`${o.id} : modèle 3D affiché en boîte proxy (glTF non chargé dans le viewer)`);
        break;
      }
      case "callout": {
        const target = new THREE.Vector3().fromArray(o.config?.target ?? [0, 0, 0.1]);
        const localTarget = target.clone().sub(node.position);
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), localTarget]);
        node.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.008),
          new THREE.MeshBasicMaterial({ color })
        );
        dot.position.copy(localTarget);
        node.add(dot);
        node.add(label(o.config?.label?.fr ?? o.title?.fr ?? "callout", 0.06));
        break;
      }
      case "hotspot": {
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(0.03, 24),
          new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
        );
        node.add(disc);
        break;
      }
      default:
        warnings.push(`${o.id} : type inconnu « ${o.type} » ignoré`);
        continue;
    }

    if (o.placement.billboard === "full") {
      node.onBeforeRender = () => node.quaternion.copy(camera.quaternion);
    } else if (o.placement.billboard === "y") {
      node.onBeforeRender = () => {
        const p = new THREE.Vector3();
        camera.getWorldPosition(p);
        node.lookAt(p.x, node.getWorldPosition(new THREE.Vector3()).y, p.z);
      };
    }

    group.add(node);
  }
  return warnings;
}

/**
 * Applique la visibilité selon le scénario : `freeform` -> tout visible ; `guided` -> seulement
 * `alwaysVisible` + les objets de l'étape `stepIndex`. Les nœuds sont retrouvés via
 * `userData.objectId` posé par `buildObjects`.
 */
export function applyScenarioVisibility(manifest: Manifest, group: THREE.Group, stepIndex: number): void {
  const scenario = manifest.scenario;
  if (!scenario || scenario.mode !== "guided") {
    for (const child of group.children) child.visible = true;
    return;
  }
  const always = new Set(scenario.alwaysVisible ?? []);
  const step = (scenario.steps ?? [])[stepIndex];
  const active = new Set(step?.objectIds ?? []);
  for (const child of group.children) {
    const id = child.userData.objectId as string | undefined;
    child.visible = !!id && (always.has(id) || active.has(id));
  }
}

function texturedPlane(
  w: number,
  h: number,
  color: number,
  url: string | undefined,
  warnings: string[],
  id: string
): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  if (url) {
    texLoader.load(
      url,
      (t) => {
        mat.map = t;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      },
      undefined,
      () => warnings.push(`${id} : image non chargée (${url})`)
    );
  } else {
    warnings.push(`${id} : pas de source média`);
  }
  return mesh;
}

function videoPlane(
  w: number,
  h: number,
  color: number,
  url: string | undefined,
  warnings: string[],
  id: string
): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  if (!url) {
    warnings.push(`${id} : vidéo sans source`);
    return mesh;
  }
  const v = document.createElement("video");
  v.src = url;
  v.crossOrigin = "anonymous";
  v.loop = true;
  v.muted = true;
  v.playsInline = true;
  v.play().catch(() => warnings.push(`${id} : lecture vidéo bloquée`));
  const t = new THREE.VideoTexture(v);
  mat.map = t;
  mat.color.set(0xffffff);
  return mesh;
}

function canvasTextPlane(w: number, h: number, text: string): THREE.Mesh {
  const px = 512;
  const c = document.createElement("canvas");
  c.width = px;
  c.height = Math.round((px * h) / w);
  const g = c.getContext("2d")!;
  g.fillStyle = "#181b22";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#e6e8ec";
  g.font = "24px system-ui, sans-serif";
  text.split("\n").forEach((line, i) => g.fillText(line.replace(/\*\*/g, ""), 20, 44 + i * 32));
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
}

function label(text: string, worldWidth = 0.1): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(15,17,21,0.85)";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#fff";
  g.font = "22px system-ui, sans-serif";
  g.fillText(text.slice(0, 22), 10, 40);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  spr.scale.set(worldWidth, worldWidth / 4, 1);
  spr.position.y = 0.06;
  return spr;
}
