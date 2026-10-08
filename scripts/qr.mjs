// Generuje kod QR do slajdu: npm run qr -- https://adres-aplikacji.vercel.app
import QRCode from "qrcode";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) {
  console.error("Użycie: npm run qr -- https://adres-aplikacji.vercel.app");
  process.exit(1);
}

const opts = { errorCorrectionLevel: "H", margin: 4, color: { dark: "#000000", light: "#ffffff" } };
await mkdir("qr", { recursive: true });
await writeFile("qr/qr.svg", await QRCode.toString(url, { ...opts, type: "svg" }));
await QRCode.toFile("qr/qr.png", url, { ...opts, type: "png", width: 1024 });
console.log(`Zapisano qr/qr.svg i qr/qr.png (1024 px, korekcja H) dla: ${url}`);
