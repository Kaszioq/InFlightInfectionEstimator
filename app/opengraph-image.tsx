import { ImageResponse } from "next/og";
import { simulate } from "@/lib/model";
import { DEFAULT_PARAMS, toModelInput } from "@/lib/state";

export const alt = "Ryzyko zakażenia w kabinie Boeinga 737: ryzyko w czasie przy różnej wentylacji";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = ["#2a78d6", "#eb6834", "#1b1b1a", "#1baf7a"];
const DASH = ["14 8", "4 8", "", "22 8 4 8"];
const ACH = [6, 10, 20, 30];

export default function Image() {
  const W = 980;
  const H = 300;
  const maxH = 8;
  const maxP = 30;
  const x = (t: number) => (t / maxH) * W;
  const y = (p: number) => H - (p / maxP) * H;
  const curves = ACH.map((ach) => {
    const r = simulate(toModelInput({ ...DEFAULT_PARAMS, ach }));
    return r.times
      .map((t, k) => [t, 100 * r.risk[k]![DEFAULT_PARAMS.me]!] as const)
      .filter(([t]) => t <= maxH)
      .map(([t, p]) => `${x(t).toFixed(1)},${y(p).toFixed(1)}`)
      .join(" ");
  });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fbfaf7",
          padding: "44px 70px",
          color: "#1b1b1a",
        }}
      >
        <div style={{ fontSize: 50, fontWeight: 700 }}>Ryzyko zakażenia w kabinie Boeinga 737</div>
        <div style={{ fontSize: 25, color: "#5c5b57", marginTop: 6 }}>
          COVID-19, 2 rzędy od chorego, ryzyko w czasie lotu (0 do 8 h)
        </div>
        <div style={{ display: "flex", marginTop: 28 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 70,
              height: H + 14,
              fontSize: 20,
              color: "#5c5b57",
              paddingRight: 10,
              alignItems: "flex-end",
            }}
          >
            <span>30%</span>
            <span>20%</span>
            <span>10%</span>
            <span>0%</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", borderBottom: "3px solid #1b1b1a", borderLeft: "3px solid #1b1b1a", marginTop: 7 }}>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                {[10, 20].map((p) => (
                  <line key={p} x1={0} x2={W} y1={y(p)} y2={y(p)} stroke="#e2e0da" strokeWidth={2} />
                ))}
                <line x1={x(2)} x2={x(2)} y1={0} y2={H} stroke="#1b1b1a" strokeWidth={2} />
                {curves.map((pts, i) => (
                  <polyline
                    key={i}
                    points={pts}
                    fill="none"
                    stroke={COLORS[i]}
                    strokeWidth={i === 2 ? 6 : 4}
                    strokeDasharray={DASH[i]}
                  />
                ))}
              </svg>
            </div>
            <div style={{ display: "flex", marginTop: 14, fontSize: 22, color: "#1b1b1a" }}>
              {ACH.map((a, i) => (
                <div key={a} style={{ display: "flex", alignItems: "center", marginRight: 34 }}>
                  <svg width={44} height={12} viewBox="0 0 44 12">
                    <line
                      x1={0}
                      x2={44}
                      y1={6}
                      y2={6}
                      stroke={COLORS[i]}
                      strokeWidth={i === 2 ? 6 : 4}
                      strokeDasharray={DASH[i]}
                    />
                  </svg>
                  <span style={{ marginLeft: 10 }}>{a} wymian/h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
