import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  content: THREE.Group; // vider (ou déléguer à buildObjects) entre deux manifests
  /** Arrête la boucle de rendu, libère le contexte WebGL, retire le canvas du DOM. */
  dispose(): void;
}

export interface StageOptions {
  /** Élément dans lequel monter le canvas — dimensionné par son CSS (pas forcément le viewport). */
  container: HTMLElement;
  background?: number;
}

export function createStage(opts: StageOptions): Stage {
  const { container } = opts;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(opts.background ?? 0x0f1115);

  const w = () => Math.max(1, container.clientWidth);
  const h = () => Math.max(1, container.clientHeight);

  const camera = new THREE.PerspectiveCamera(55, w() / h(), 0.01, 100);
  camera.position.set(0.6, 0.4, 1.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(w(), h());
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(1, 2, 1.5);
  scene.add(dir);

  // ---- repère du QR : plan blanc + axes F_qr ------------------------------------
  const qr = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  qr.add(plate);
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true })
  );
  grid.position.z = 0.0005;
  qr.add(grid);
  qr.add(new THREE.AxesHelper(0.15)); // X rouge, Y vert, Z bleu
  scene.add(qr);

  const content = new THREE.Group();
  scene.add(content);

  const ro = new ResizeObserver(() => {
    camera.aspect = w() / h();
    camera.updateProjectionMatrix();
    renderer.setSize(w(), h());
  });
  ro.observe(container);

  let raf = 0;
  let disposed = false;
  function tick() {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
  }

  return { scene, camera, renderer, controls, content, dispose };
}
