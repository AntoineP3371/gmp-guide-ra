import QRCode from "qrcode";
import type { Ecc } from "./types";

/** SVG string d'un QR code, sans dimensions fixes (mise à l'échelle par le conteneur). */
export async function qrSvg(text: string, ecc: Ecc = "H"): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: ecc,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  // retire width/height fixes pour laisser le CSS gérer la taille
  return svg.replace(/<svg[^>]*?>/, (m: string) =>
    m
      .replace(/\s(width|height)="[^"]*"/g, "")
      .replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"')
  );
}
