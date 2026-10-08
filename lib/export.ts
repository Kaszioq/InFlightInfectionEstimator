function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadCsv(rows: (string | number)[][], name: string) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Średnik i BOM: plik otwiera się poprawnie w polskim Excelu.
  const body = "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Zapisuje element (wykres SVG razem z legendą HTML) jako PNG. */
export async function downloadPng(el: HTMLElement, name: string, title: string, background: string, ink: string) {
  const svg = el.querySelector("svg.recharts-surface, svg[data-export]") as SVGSVGElement | null;
  if (!svg) return;
  const scale = 2;
  const box = svg.getBoundingClientRect();
  const legend = el.querySelector("[data-legend]") as HTMLElement | null;
  const legendItems = legend
    ? Array.from(legend.querySelectorAll<HTMLElement>("[data-legend-item]")).map((n) => ({
        text: n.innerText.replace(/\s+/g, " ").trim(),
        color: n.dataset.color ?? ink,
        dash: (n.dataset.dash ?? "").split(" ").filter(Boolean).map(Number),
        width: Number(n.dataset.width ?? 2),
      }))
    : [];
  const pad = 24;
  const titleH = 36;
  const legendH = legendItems.length * 22 + (legendItems.length ? 12 : 0);
  const serif = getComputedStyle(document.documentElement).getPropertyValue("--serif").trim() || "Georgia, serif";
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `bold 18px ${serif}`;
  const W = Math.max(box.width, measure.measureText(title).width, 520) + pad * 2;
  const H = box.height + pad * 2 + titleH + legendH;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(box.width));
  clone.setAttribute("height", String(box.height));
  // Skopiuj obliczone style tekstu, bo plik SVG nie zna arkuszy strony.
  clone.querySelectorAll("text").forEach((t) => {
    t.setAttribute("font-family", "Cambria, Georgia, serif");
  });
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ink;
  ctx.font = `bold 18px ${serif}`;
  ctx.fillText(title, pad, pad + 16);
  ctx.drawImage(img, pad, pad + titleH, box.width, box.height);
  ctx.font = "14px system-ui, sans-serif";
  legendItems.forEach((it, i) => {
    const y = pad + titleH + box.height + 24 + i * 22;
    ctx.strokeStyle = it.color;
    ctx.lineWidth = it.width;
    ctx.setLineDash(it.dash);
    ctx.beginPath();
    ctx.moveTo(pad, y - 5);
    ctx.lineTo(pad + 32, y - 5);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.fillText(it.text, pad + 42, y);
  });
  download(canvas.toDataURL("image/png"), name);
}
