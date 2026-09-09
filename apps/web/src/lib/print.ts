import { qrSvg } from "./qr";
import type { Machine } from "./types";

/**
 * Ouvre une fenêtre d'impression avec une étiquette à la taille physique exacte
 * (le QR mesure `qr_size_m` au réel). L'utilisateur choisit « Imprimer » ou
 * « Enregistrer en PDF ». Repères de coupe + consigne de plastification inclus.
 */
export async function printMachineLabel(machine: Machine, copies = 1): Promise<void> {
  const sizeMm = Math.round(machine.qr_size_m * 1000);
  const payload = machine.qr_payload || machine.qr_code;
  const svg = await qrSvg(payload, machine.qr_ecc);

  const label = `
    <div class="label">
      <div class="crop tl"></div><div class="crop tr"></div>
      <div class="crop bl"></div><div class="crop br"></div>
      <div class="qr" style="width:${sizeMm}mm;height:${sizeMm}mm">${svg}</div>
      <div class="meta">
        <strong>${escapeHtml(machine.name)}</strong>
        <span>${escapeHtml(machine.qr_code)}</span>
        <span class="hint">QR ${sizeMm}&nbsp;mm — imprimer à l'échelle 100&nbsp;%, plastifier mat</span>
      </div>
    </div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
    <title>Étiquette ${escapeHtml(machine.qr_code)}</title>
    <style>
      @page { margin: 12mm; }
      body { font-family: system-ui, sans-serif; margin: 0; }
      .label {
        position: relative;
        display: inline-flex; flex-direction: column; align-items: center;
        gap: 4mm; padding: 10mm; margin: 6mm;
        page-break-inside: avoid;
      }
      .qr svg { width: 100%; height: 100%; display: block; }
      .meta { text-align: center; display: flex; flex-direction: column; gap: 1mm; }
      .meta strong { font-size: 12pt; }
      .meta span { font-size: 9pt; color: #333; }
      .meta .hint { font-size: 7.5pt; color: #777; }
      .crop { position: absolute; width: 5mm; height: 5mm; border: 0.3mm solid #000; }
      .crop.tl { top: 0; left: 0; border-right: 0; border-bottom: 0; }
      .crop.tr { top: 0; right: 0; border-left: 0; border-bottom: 0; }
      .crop.bl { bottom: 0; left: 0; border-right: 0; border-top: 0; }
      .crop.br { bottom: 0; right: 0; border-left: 0; border-top: 0; }
      @media print { button { display: none; } }
    </style></head><body>
    <button onclick="window.print()" style="margin:8mm">Imprimer</button>
    ${Array.from({ length: Math.max(1, copies) }, () => label).join("")}
    </body></html>`;

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) {
    alert("Impossible d'ouvrir la fenêtre d'impression (popup bloquée ?).");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
