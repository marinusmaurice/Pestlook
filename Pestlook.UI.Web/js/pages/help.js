import { escapeHtml } from '../utils/helpers.js';

// ── Inline SVG Diagrams (keyed by section id) ─────────────────────────────────
const SVG = {

  'env-temp': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Temperature × Pest Activity — Chart Anatomy</div>
    <svg viewBox="0 0 460 190" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px;display:block;">
      <defs><style>text{font-family:Inter,sans-serif;}</style></defs>
      <rect width="460" height="190" rx="8" fill="#1a2e22"/>
      <!-- Axes -->
      <line x1="44" y1="18" x2="44"  y2="150" stroke="#3a5040" stroke-width="1"/>
      <line x1="44" y1="150" x2="448" y2="150" stroke="#3a5040" stroke-width="1"/>
      <!-- Y label -->
      <text x="38" y="150" text-anchor="end" fill="#475569" font-size="7">0</text>
      <text x="38" y="110" text-anchor="end" fill="#475569" font-size="7">25</text>
      <text x="38" y="70"  text-anchor="end" fill="#475569" font-size="7">50</text>
      <text x="38" y="30"  text-anchor="end" fill="#475569" font-size="7">75</text>
      <!-- H-grid -->
      <line x1="44" y1="110" x2="448" y2="110" stroke="#243428" stroke-width="0.8"/>
      <line x1="44" y1="70"  x2="448" y2="70"  stroke="#243428" stroke-width="0.8"/>
      <line x1="44" y1="30"  x2="448" y2="30"  stroke="#243428" stroke-width="0.8"/>
      <!-- X-axis temp bands -->
      <text x="78"  y="163" text-anchor="middle" fill="#475569" font-size="7">10–15°C</text>
      <text x="142" y="163" text-anchor="middle" fill="#475569" font-size="7">15–20°C</text>
      <text x="206" y="163" text-anchor="middle" fill="#475569" font-size="7">20–25°C</text>
      <text x="270" y="163" text-anchor="middle" fill="#475569" font-size="7">25–30°C</text>
      <text x="334" y="163" text-anchor="middle" fill="#475569" font-size="7">30–35°C</text>
      <text x="398" y="163" text-anchor="middle" fill="#475569" font-size="7">35–40°C</text>
      <!-- Bars — rising warm-favoring pest -->
      <rect x="52"  y="138" width="50" height="12" rx="2" fill="#c0392b88"/>
      <rect x="116" y="126" width="50" height="24" rx="2" fill="#c0392b88"/>
      <rect x="180" y="108" width="50" height="42" rx="2" fill="#c0392b88"/>
      <rect x="244" y="88"  width="50" height="62" rx="2" fill="#c0392b88"/>
      <rect x="308" y="66"  width="50" height="84" rx="2" fill="#c0392b88"/>
      <rect x="372" y="46"  width="50" height="104" rx="2" fill="#c0392b88"/>
      <!-- OLS trend line -->
      <line x1="77"  y1="144" x2="397" y2="48" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5,3"/>
      <!-- Annotations -->
      <rect x="290" y="20" width="130" height="36" rx="5" fill="#243428" stroke="#3a5040" stroke-width="0.8"/>
      <text x="298" y="33" fill="#94a3b8" font-size="7">Warm-Favoring · r = +0.87</text>
      <text x="298" y="44" fill="#fde68a" font-size="7">Slope: +4.2 per °C</text>
      <text x="298" y="55" fill="#fca5a5" font-size="7">Optimal: 35–40°C</text>
      <!-- Legend -->
      <rect x="48"  y="172" width="12" height="8" rx="2" fill="#c0392b88"/>
      <text x="64"  y="179" fill="#fca5a5" font-size="7">Avg count per temp band</text>
      <line x1="190" y1="176" x2="206" y2="176" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,2"/>
      <text x="210" y="179" fill="#fde68a" font-size="7">OLS trend (slope)</text>
    </svg>
  </div>`,

  'env-rainfall': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Rainfall Lag — Wet Event → Pest Spike Timeline</div>
    <svg viewBox="0 0 460 190" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px;display:block;">
      <defs><style>text{font-family:Inter,sans-serif;}</style></defs>
      <rect width="460" height="190" rx="8" fill="#1a2e22"/>
      <!-- Week labels -->
      <text x="58"  y="16" text-anchor="middle" fill="#475569" font-size="7">Wk 1</text>
      <text x="114" y="16" text-anchor="middle" fill="#475569" font-size="7">Wk 2</text>
      <text x="170" y="16" text-anchor="middle" fill="#475569" font-size="7">Wk 3</text>
      <text x="226" y="16" text-anchor="middle" fill="#475569" font-size="7">Wk 4</text>
      <text x="282" y="16" text-anchor="middle" fill="#475569" font-size="7">Wk 5</text>
      <text x="338" y="16" text-anchor="middle" fill="#475569" font-size="7">Wk 6</text>
      <text x="394" y="16" text-anchor="middle" fill="#475569" font-size="7">Wk 7</text>
      <!-- Temperature line (rolling avg) -->
      <polyline points="34,50 90,52 146,51 202,68 258,85 314,55 370,53 426,52" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
      <!-- Wet event marker — Wk 4 temp drop -->
      <line x1="202" y1="20" x2="202" y2="150" stroke="#2980b9" stroke-width="1" stroke-dasharray="4,3"/>
      <rect x="168" y="64" width="68" height="16" rx="4" fill="#2980b920" stroke="#2980b944"/>
      <text x="202" y="75" text-anchor="middle" fill="#93c5fd" font-size="7" font-weight="700">💧 Wet Event −4.1°C</text>
      <!-- Pest count bars — spike at Wk 6 (2 weeks after wet event) -->
      <rect x="34"  y="122" width="42" height="18" rx="2" fill="#c0392b66"/>
      <rect x="90"  y="118" width="42" height="22" rx="2" fill="#c0392b66"/>
      <rect x="146" y="120" width="42" height="20" rx="2" fill="#c0392b66"/>
      <rect x="202" y="116" width="42" height="24" rx="2" fill="#c0392b66"/>
      <rect x="258" y="100" width="42" height="40" rx="2" fill="#c0392b"/>
      <rect x="314" y="88"  width="42" height="52" rx="2" fill="#c0392b"/>
      <rect x="370" y="110" width="42" height="30" rx="2" fill="#c0392b66"/>
      <!-- Axis -->
      <line x1="26" y1="140" x2="448" y2="140" stroke="#3a5040" stroke-width="1"/>
      <!-- Spike annotation -->
      <line x1="335" y1="86" x2="335" y2="66" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
      <rect x="298" y="54" width="78" height="14" rx="3" fill="#78350f"/>
      <text x="337" y="64" text-anchor="middle" fill="#fde68a" font-size="7" font-weight="700">+68% spike · Lag 2 wks</text>
      <!-- Lag arrow -->
      <line x1="224" y1="132" x2="258" y2="132" stroke="#4ade80" stroke-width="1.2" marker-end="url(#arr)"/>
      <text x="241" y="145" text-anchor="middle" fill="#4ade80" font-size="6.5">14 day lag</text>
      <!-- Legend -->
      <line x1="30" y1="175" x2="46" y2="175" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="50"  y="178" fill="#93c5fd" font-size="7">Rolling avg temp</text>
      <rect x="140" y="171" width="12" height="8" rx="2" fill="#c0392b"/>
      <text x="156" y="178" fill="#fca5a5" font-size="7">Weekly pest count</text>
      <rect x="256" y="171" width="12" height="8" rx="2" fill="#2980b920" stroke="#2980b944"/>
      <text x="272" y="178" fill="#93c5fd" font-size="7">Wet event</text>
    </svg>
  </div>`,

  'env-drought': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Drought Stress — Breach Rate Comparison</div>
    <svg viewBox="0 0 460 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px;display:block;">
      <defs><style>text{font-family:Inter,sans-serif;}</style></defs>
      <rect width="460" height="180" rx="8" fill="#1a2e22"/>
      <text x="165" y="22" text-anchor="middle" fill="#f87171" font-size="8" font-weight="700">☀ Drought Periods</text>
      <text x="355" y="22" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="700">🌤 Normal Conditions</text>
      <line x1="30" y1="90" x2="430" y2="90" stroke="#475569" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="434" y="93" fill="#64748b" font-size="7">LTM</text>
      <text x="56"  y="37" text-anchor="middle" fill="#94a3b8" font-size="7">Aphids</text>
      <rect x="34"  y="40" width="44" height="85" rx="3" fill="#c0392b"/>
      <text x="56"  y="136" text-anchor="middle" fill="#fca5a5" font-size="7">72%</text>
      <text x="120" y="37" text-anchor="middle" fill="#94a3b8" font-size="7">Whitefly</text>
      <rect x="98"  y="66" width="44" height="59" rx="3" fill="#e67e22"/>
      <text x="120" y="136" text-anchor="middle" fill="#fed7aa" font-size="7">49%</text>
      <text x="184" y="37" text-anchor="middle" fill="#94a3b8" font-size="7">Cutworm</text>
      <rect x="162" y="53" width="44" height="72" rx="3" fill="#c0392b"/>
      <text x="184" y="136" text-anchor="middle" fill="#fca5a5" font-size="7">60%</text>
      <text x="312" y="37" text-anchor="middle" fill="#94a3b8" font-size="7">Aphids</text>
      <rect x="290" y="99" width="44" height="26" rx="3" fill="#27ae60"/>
      <text x="312" y="136" text-anchor="middle" fill="#86efac" font-size="7">22%</text>
      <text x="376" y="37" text-anchor="middle" fill="#94a3b8" font-size="7">Whitefly</text>
      <rect x="354" y="104" width="44" height="21" rx="3" fill="#27ae60"/>
      <text x="376" y="136" text-anchor="middle" fill="#86efac" font-size="7">18%</text>
      <line x1="250" y1="30" x2="250" y2="145" stroke="#3a5040" stroke-width="1.2" stroke-dasharray="5,3"/>
      <rect x="260" y="60" width="82" height="28" rx="5" fill="#243428" stroke="#3a5040" stroke-width="0.8"/>
      <text x="301" y="73" text-anchor="middle" fill="#fde68a" font-size="7">Aphids drought bias</text>
      <text x="301" y="83" text-anchor="middle" fill="#fca5a5" font-size="8" font-weight="700">+227% breach rate</text>
      <line x1="30" y1="125" x2="430" y2="125" stroke="#3a5040" stroke-width="1"/>
      <rect x="30"  y="155" width="12" height="8" rx="2" fill="#c0392b"/>
      <text x="46"  y="162" fill="#fca5a5" font-size="7">Strong drought stress</text>
      <rect x="165" y="155" width="12" height="8" rx="2" fill="#e67e22"/>
      <text x="181" y="162" fill="#fed7aa" font-size="7">Moderate</text>
      <rect x="260" y="155" width="12" height="8" rx="2" fill="#27ae60"/>
      <text x="276" y="162" fill="#86efac" font-size="7">Normal breach rate</text>
    </svg>
  </div>`,

  'cont-zones': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Containment Zone — Spread Vector & Perimeter</div>
    <svg viewBox="0 0 460 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px;display:block;">
      <defs><style>text{font-family:Inter,sans-serif;}</style></defs>
      <rect width="460" height="200" rx="8" fill="#1a2e22"/>
      <!-- Farm cluster -->
      <circle cx="120" cy="130" r="14" fill="#c0392b44" stroke="#c0392b" stroke-width="1.5"/>
      <text x="120" y="134" text-anchor="middle" fill="#fca5a5" font-size="8" font-weight="700">F1</text>
      <circle cx="175" cy="100" r="14" fill="#c0392b44" stroke="#c0392b" stroke-width="1.5"/>
      <text x="175" y="104" text-anchor="middle" fill="#fca5a5" font-size="8" font-weight="700">F2</text>
      <circle cx="230" cy="80" r="14" fill="#c0392b44" stroke="#c0392b" stroke-width="1.5"/>
      <text x="230" y="84" text-anchor="middle" fill="#fca5a5" font-size="8" font-weight="700">F3</text>
      <!-- Spread vector arrow -->
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b"/>
        </marker>
      </defs>
      <line x1="120" y1="130" x2="290" y2="50" stroke="#f59e0b" stroke-width="2" marker-end="url(#arr)" stroke-dasharray="6,3"/>
      <text x="205" y="95" fill="#fde68a" font-size="7" transform="rotate(-25,205,95)">Spread → NE · 2.4 km/wk</text>
      <!-- Current front -->
      <circle cx="230" cy="80" r="18" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="230" y="60" text-anchor="middle" fill="#fde68a" font-size="7">Current front</text>
      <!-- Perimeter radius -->
      <circle cx="230" cy="80" r="70" fill="none" stroke="#c0392b" stroke-width="1.2" stroke-dasharray="6,4" opacity="0.6"/>
      <text x="300" y="155" fill="#f87171" font-size="7">Perimeter (5 km)</text>
      <!-- Unaffected farms in path -->
      <circle cx="310" cy="55" r="14" fill="#f59e0b22" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="310" y="59" text-anchor="middle" fill="#fde68a" font-size="7.5" font-weight="700">🚨 F4</text>
      <circle cx="360" cy="90" r="14" fill="#e67e2222" stroke="#e67e22" stroke-width="1.5"/>
      <text x="360" y="94" text-anchor="middle" fill="#fed7aa" font-size="7.5">👁 F5</text>
      <!-- Labels -->
      <text x="18" y="18" fill="#4ade80" font-size="8" font-weight="700">🔴 Inside zone (affected)</text>
      <text x="18" y="30" fill="#fde68a" font-size="8" font-weight="700">🚨 High urgency (in spread path)</text>
      <text x="18" y="42" fill="#fed7aa" font-size="8" font-weight="700">👁 Monitor (nearby, off-axis)</text>
    </svg>
  </div>`,

  'cont-resistance': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Resistance Pattern — Multi-year Breach Rate Trend</div>
    <svg viewBox="0 0 460 185" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px;display:block;">
      <defs><style>text{font-family:Inter,sans-serif;}</style></defs>
      <rect width="460" height="185" rx="8" fill="#1a2e22"/>
      <!-- Axes -->
      <line x1="44" y1="18" x2="44"  y2="148" stroke="#3a5040" stroke-width="1"/>
      <line x1="44" y1="148" x2="448" y2="148" stroke="#3a5040" stroke-width="1"/>
      <text x="38" y="148" text-anchor="end" fill="#475569" font-size="7">0%</text>
      <text x="38" y="108" text-anchor="end" fill="#475569" font-size="7">25%</text>
      <text x="38" y="68"  text-anchor="end" fill="#475569" font-size="7">50%</text>
      <text x="38" y="28"  text-anchor="end" fill="#475569" font-size="7">75%</text>
      <line x1="44" y1="108" x2="448" y2="108" stroke="#243428" stroke-width="0.8"/>
      <line x1="44" y1="68"  x2="448" y2="68"  stroke="#243428" stroke-width="0.8"/>
      <!-- Year labels -->
      <text x="120" y="162" text-anchor="middle" fill="#475569" font-size="7">2022</text>
      <text x="220" y="162" text-anchor="middle" fill="#475569" font-size="7">2023</text>
      <text x="320" y="162" text-anchor="middle" fill="#475569" font-size="7">2024</text>
      <text x="420" y="162" text-anchor="middle" fill="#475569" font-size="7">2025</text>
      <!-- Bars — worsening trend -->
      <rect x="96"  y="128" width="50" height="20" rx="3" fill="#27ae60"/>
      <text x="121" y="124" text-anchor="middle" fill="#86efac" font-size="7">15%</text>
      <rect x="196" y="108" width="50" height="40" rx="3" fill="#e67e22"/>
      <text x="221" y="104" text-anchor="middle" fill="#fed7aa" font-size="7">31%</text>
      <rect x="296" y="88"  width="50" height="60" rx="3" fill="#c0392b"/>
      <text x="321" y="84"  text-anchor="middle" fill="#fca5a5" font-size="7">47%</text>
      <rect x="396" y="60"  width="50" height="88" rx="3" fill="#c0392b"/>
      <text x="421" y="56"  text-anchor="middle" fill="#fca5a5" font-size="7">68%</text>
      <!-- Trend line -->
      <line x1="121" y1="138" x2="421" y2="104" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5,3"/>
      <!-- Annotation -->
      <rect x="130" y="30" width="110" height="26" rx="5" fill="#3b1010" stroke="#c0392b44" stroke-width="0.8"/>
      <text x="185" y="43" text-anchor="middle" fill="#fca5a5" font-size="7">Worsening trend · +53 pp</text>
      <text x="185" y="53" text-anchor="middle" fill="#fde68a" font-size="7">⚠ Likely Resistance Risk</text>
      <!-- Legend -->
      <rect x="48" y="170" width="12" height="8" rx="2" fill="#27ae60"/>
      <text x="64" y="177" fill="#86efac" font-size="7">Improving year</text>
      <rect x="160" y="170" width="12" height="8" rx="2" fill="#c0392b"/>
      <text x="176" y="177" fill="#fca5a5" font-size="7">High breach rate</text>
      <line x1="270" y1="174" x2="286" y2="174" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,2"/>
      <text x="290" y="177" fill="#fde68a" font-size="7">OLS trend</text>
    </svg>
  </div>`,

  dashboard: `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Dashboard Layout</div>
    <svg viewBox="0 0 480 230" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px;display:block;">
      <defs><style>text{font-family:Inter,sans-serif;fill-rule:nonzero;}</style></defs>
      <!-- Stat cards -->
      <rect x="0"   y="0" width="108" height="52" rx="7" fill="#243428" stroke="#3a5040" stroke-width="1"/>
      <text x="54"  y="19" text-anchor="middle" fill="#86efac" font-size="8.5" font-weight="600">Active Farms</text>
      <text x="54"  y="39" text-anchor="middle" fill="#e2e8f0" font-size="18" font-weight="700">12</text>
      <rect x="114" y="0" width="108" height="52" rx="7" fill="#243428" stroke="#3a5040" stroke-width="1"/>
      <text x="168" y="19" text-anchor="middle" fill="#86efac" font-size="8.5" font-weight="600">Traps</text>
      <text x="168" y="39" text-anchor="middle" fill="#e2e8f0" font-size="18" font-weight="700">34</text>
      <rect x="228" y="0" width="108" height="52" rx="7" fill="#243428" stroke="#3a5040" stroke-width="1"/>
      <text x="282" y="19" text-anchor="middle" fill="#86efac" font-size="8.5" font-weight="600">Sessions</text>
      <text x="282" y="39" text-anchor="middle" fill="#e2e8f0" font-size="18" font-weight="700">248</text>
      <rect x="342" y="0" width="138" height="52" rx="7" fill="#243428" stroke="#3a5040" stroke-width="1"/>
      <text x="411" y="19" text-anchor="middle" fill="#86efac" font-size="8.5" font-weight="600">Observations</text>
      <text x="411" y="39" text-anchor="middle" fill="#e2e8f0" font-size="18" font-weight="700">1,842</text>
      <!-- Active sessions panel -->
      <rect x="0"   y="60" width="224" height="162" rx="7" fill="#243428" stroke="#3a5040" stroke-width="1"/>
      <text x="112" y="76" text-anchor="middle" fill="#86efac" font-size="8.5" font-weight="600">Active Sessions</text>
      <line x1="8" y1="82" x2="216" y2="82" stroke="#3a5040" stroke-width="1"/>
      <rect x="10" y="88"  width="204" height="18" rx="3" fill="#1e3028"/>
      <text x="18" y="100" fill="#94a3b8" font-size="7.5">North Farm — Scout A — 09:15</text>
      <rect x="10" y="110" width="204" height="18" rx="3" fill="#1e3028"/>
      <text x="18" y="122" fill="#94a3b8" font-size="7.5">South Paddock — Scout B — 10:40</text>
      <rect x="10" y="132" width="204" height="18" rx="3" fill="#1e3028"/>
      <text x="18" y="144" fill="#94a3b8" font-size="7.5">East Field — Scout C — 11:05</text>
      <text x="112" y="180" text-anchor="middle" fill="#3a5040" font-size="7.5">Activity Feed below ↓</text>
      <!-- Map panel -->
      <rect x="230" y="60" width="250" height="162" rx="7" fill="#243428" stroke="#3a5040" stroke-width="1"/>
      <text x="355" y="76" text-anchor="middle" fill="#86efac" font-size="8.5" font-weight="600">Trap Map</text>
      <line x1="238" y1="82" x2="472" y2="82" stroke="#3a5040" stroke-width="1"/>
      <rect x="238" y="86" width="234" height="128" rx="4" fill="#1a2e22"/>
      <line x1="238" y1="120" x2="472" y2="120" stroke="#2a3e30" stroke-width="0.5"/>
      <line x1="238" y1="154" x2="472" y2="154" stroke="#2a3e30" stroke-width="0.5"/>
      <line x1="316" y1="86" x2="316" y2="214" stroke="#2a3e30" stroke-width="0.5"/>
      <line x1="394" y1="86" x2="394" y2="214" stroke="#2a3e30" stroke-width="0.5"/>
      <circle cx="280" cy="108" r="7" fill="#4ade80" opacity="0.85"/>
      <circle cx="345" cy="133" r="7" fill="#f87171" opacity="0.85"/>
      <circle cx="415" cy="112" r="7" fill="#fbbf24" opacity="0.85"/>
      <circle cx="455" cy="170" r="7" fill="#4ade80" opacity="0.85"/>
      <circle cx="260" cy="175" r="7" fill="#4ade80" opacity="0.85"/>
      <!-- Map legend -->
      <circle cx="244" cy="208" r="4" fill="#4ade80"/><text x="252" y="211" fill="#86efac" font-size="6.5">Active</text>
      <circle cx="284" cy="208" r="4" fill="#f87171"/><text x="292" y="211" fill="#fca5a5" font-size="6.5">Inactive</text>
      <circle cx="328" cy="208" r="4" fill="#fbbf24"/><text x="336" y="211" fill="#fde68a" font-size="6.5">Maintenance</text>
    </svg>
  </div>`,

  sessions: `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Session Status Flow</div>
    <svg viewBox="0 0 440 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:440px;display:block;">
      <defs>
        <style>text{font-family:Inter,sans-serif;}</style>
        <marker id="sa1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4ade80"/></marker>
        <marker id="sa2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4ade80"/></marker>
      </defs>
      <rect x="0"   y="18" width="110" height="44" rx="8" fill="#f59e0b22" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="55"  y="36" text-anchor="middle" fill="#f59e0b" font-size="9.5" font-weight="700">PLANNED</text>
      <text x="55"  y="52" text-anchor="middle" fill="#fde68a" font-size="7.5" opacity="0.8">Scheduled date set</text>
      <line x1="110" y1="40" x2="158" y2="40" stroke="#4ade80" stroke-width="1.5" marker-end="url(#sa1)"/>
      <text x="134" y="34" text-anchor="middle" fill="#86efac" font-size="7.5" font-weight="600">▶ Start</text>
      <rect x="160" y="18" width="120" height="44" rx="8" fill="#3b82f622" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="220" y="36" text-anchor="middle" fill="#93c5fd" font-size="9.5" font-weight="700">IN PROGRESS</text>
      <text x="220" y="52" text-anchor="middle" fill="#93c5fd" font-size="7.5" opacity="0.8">Start time recorded</text>
      <line x1="280" y1="40" x2="328" y2="40" stroke="#4ade80" stroke-width="1.5" marker-end="url(#sa2)"/>
      <text x="304" y="34" text-anchor="middle" fill="#86efac" font-size="7.5" font-weight="600">✓ Complete</text>
      <rect x="330" y="18" width="110" height="44" rx="8" fill="#818cf822" stroke="#818cf8" stroke-width="1.5"/>
      <text x="385" y="36" text-anchor="middle" fill="#818cf8" font-size="9.5" font-weight="700">COMPLETED</text>
      <text x="385" y="52" text-anchor="middle" fill="#a5b4fc" font-size="7.5" opacity="0.8">End time recorded</text>
    </svg>
  </div>`,

  'intel-spread': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Spread Vector Map — How It Works</div>
    <svg viewBox="0 0 460 205" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px;display:block;">
      <defs>
        <style>text{font-family:Inter,sans-serif;}</style>
        <marker id="redV" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#f87171"/></marker>
        <marker id="ambV" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#f59e0b"/></marker>
        <marker id="grnV" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4ade80"/></marker>
      </defs>
      <rect width="460" height="205" rx="10" fill="#1a2e22"/>
      <line x1="0" y1="68"  x2="460" y2="68"  stroke="#243428" stroke-width="0.8"/>
      <line x1="0" y1="136" x2="460" y2="136" stroke="#243428" stroke-width="0.8"/>
      <line x1="115" y1="0" x2="115" y2="205" stroke="#243428" stroke-width="0.8"/>
      <line x1="230" y1="0" x2="230" y2="205" stroke="#243428" stroke-width="0.8"/>
      <line x1="345" y1="0" x2="345" y2="205" stroke="#243428" stroke-width="0.8"/>
      <!-- Field circles -->
      <circle cx="80"  cy="102" r="24" fill="#3b7db822" stroke="#3b7db8" stroke-width="1.2"/>
      <text x="80"  y="106" text-anchor="middle" fill="#7ab8e8" font-size="8">Field A</text>
      <circle cx="205" cy="58"  r="19" fill="#3b7db822" stroke="#3b7db8" stroke-width="1.2"/>
      <text x="205" y="62"  text-anchor="middle" fill="#7ab8e8" font-size="8">Field B</text>
      <circle cx="325" cy="78"  r="19" fill="#3b7db822" stroke="#3b7db8" stroke-width="1.2"/>
      <text x="325" y="82"  text-anchor="middle" fill="#7ab8e8" font-size="8">Field C</text>
      <circle cx="240" cy="158" r="19" fill="#3b7db822" stroke="#3b7db8" stroke-width="1.2"/>
      <text x="240" y="162" text-anchor="middle" fill="#7ab8e8" font-size="8">Field D</text>
      <circle cx="395" cy="148" r="19" fill="#3b7db822" stroke="#3b7db8" stroke-width="1.2"/>
      <text x="395" y="152" text-anchor="middle" fill="#7ab8e8" font-size="8">Field E</text>
      <!-- Fast spread: red (A → C) -->
      <line x1="103" y1="90" x2="298" y2="75" stroke="#f87171" stroke-width="1.8" stroke-dasharray="5,4" marker-end="url(#redV)"/>
      <circle cx="308" cy="74" r="7" fill="#f87171"/>
      <!-- Slow spread: amber (A → D) -->
      <line x1="100" y1="114" x2="218" y2="152" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5,4" marker-end="url(#ambV)"/>
      <circle cx="226" cy="155" r="7" fill="#f59e0b"/>
      <!-- Contained: green (B → E) -->
      <line x1="224" y1="63" x2="373" y2="141" stroke="#4ade80" stroke-width="1.8" stroke-dasharray="5,4" marker-end="url(#grnV)"/>
      <circle cx="381" cy="145" r="7" fill="#4ade80"/>
      <!-- Origin star on Field A -->
      <circle cx="80" cy="102" r="9" fill="none" stroke="#fff" stroke-width="2"/>
      <text x="80" y="106" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">★</text>
      <text x="80" y="133" text-anchor="middle" fill="#64748b" font-size="7.5">First observed</text>
      <!-- Legend box -->
      <rect x="8" y="8" width="142" height="56" rx="5" fill="#1e3028" opacity="0.92"/>
      <line x1="16" y1="23" x2="42" y2="23" stroke="#f87171" stroke-width="2" stroke-dasharray="4,3"/>
      <circle cx="46" cy="23" r="4" fill="#f87171"/>
      <text x="54" y="27" fill="#fca5a5" font-size="7.5">Fast spread (&gt;0.5/wk)</text>
      <line x1="16" y1="37" x2="42" y2="37" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,3"/>
      <circle cx="46" cy="37" r="4" fill="#f59e0b"/>
      <text x="54" y="41" fill="#fde68a" font-size="7.5">Slow spread</text>
      <line x1="16" y1="51" x2="42" y2="51" stroke="#4ade80" stroke-width="2" stroke-dasharray="4,3"/>
      <circle cx="46" cy="51" r="4" fill="#4ade80"/>
      <text x="54" y="55" fill="#86efac" font-size="7.5">Contained</text>
    </svg>
  </div>`,

  'intel-origin': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Infestation Spread Chain — Origin to Latest Field</div>
    <svg viewBox="0 0 440 88" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:440px;display:block;">
      <defs>
        <style>text{font-family:Inter,sans-serif;}</style>
        <marker id="cArr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#64748b"/></marker>
      </defs>
      <rect width="440" height="88" rx="8" fill="#1a2e22"/>
      <!-- Node 1: Origin red -->
      <circle cx="50"  cy="44" r="20" fill="#c7514699" stroke="#f87171" stroke-width="1.5"/>
      <text x="50"  y="40" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">1</text>
      <text x="50"  y="53" text-anchor="middle" fill="#fca5a5" font-size="6.5">ORIGIN</text>
      <text x="50"  y="74" text-anchor="middle" fill="#64748b" font-size="7">Day 0</text>
      <!-- Arrow -->
      <line x1="72" y1="44" x2="108" y2="44" stroke="#64748b" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#cArr)"/>
      <text x="90" y="37" text-anchor="middle" fill="#475569" font-size="6.5">+4 days</text>
      <!-- Node 2 -->
      <circle cx="130" cy="44" r="18" fill="#3b7db844" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="130" y="40" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">2</text>
      <text x="130" y="53" text-anchor="middle" fill="#93c5fd" font-size="6.5">Field B</text>
      <text x="130" y="74" text-anchor="middle" fill="#64748b" font-size="7">Day 4</text>
      <line x1="150" y1="44" x2="186" y2="44" stroke="#64748b" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#cArr)"/>
      <text x="168" y="37" text-anchor="middle" fill="#475569" font-size="6.5">+9 days</text>
      <!-- Node 3 -->
      <circle cx="208" cy="44" r="18" fill="#3b7db844" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="208" y="40" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">3</text>
      <text x="208" y="53" text-anchor="middle" fill="#93c5fd" font-size="6.5">Field C</text>
      <text x="208" y="74" text-anchor="middle" fill="#64748b" font-size="7">Day 13</text>
      <line x1="228" y1="44" x2="264" y2="44" stroke="#64748b" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#cArr)"/>
      <text x="246" y="37" text-anchor="middle" fill="#475569" font-size="6.5">+7 days</text>
      <!-- Node 4 -->
      <circle cx="286" cy="44" r="18" fill="#3b7db844" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="286" y="40" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">4</text>
      <text x="286" y="53" text-anchor="middle" fill="#93c5fd" font-size="6.5">Field D</text>
      <text x="286" y="74" text-anchor="middle" fill="#64748b" font-size="7">Day 20</text>
      <line x1="306" y1="44" x2="342" y2="44" stroke="#64748b" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#cArr)"/>
      <text x="324" y="37" text-anchor="middle" fill="#475569" font-size="6.5">+12 days</text>
      <!-- Node 5: Amber = most recent -->
      <circle cx="364" cy="44" r="18" fill="#f59e0b33" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="364" y="40" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">5</text>
      <text x="364" y="53" text-anchor="middle" fill="#fde68a" font-size="6.5">Latest</text>
      <text x="364" y="74" text-anchor="middle" fill="#64748b" font-size="7">Day 32</text>
    </svg>
  </div>`,

  'intel-velocity': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Velocity Sparkline — Reading Guide</div>
    <svg viewBox="0 0 420 125" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:420px;display:block;">
      <defs><style>text{font-family:Inter,sans-serif;}</style></defs>
      <rect width="420" height="125" rx="8" fill="#1a2e22"/>
      <!-- Y axis -->
      <line x1="55" y1="15" x2="55" y2="100" stroke="#3a5040" stroke-width="1"/>
      <!-- Zero line -->
      <line x1="55" y1="60" x2="415" y2="60" stroke="#3a5040" stroke-width="1.5"/>
      <text x="48" y="64" text-anchor="end" fill="#64748b" font-size="7.5">0</text>
      <text x="48" y="28" text-anchor="end" fill="#f87171" font-size="7.5">+5</text>
      <text x="48" y="97" text-anchor="end" fill="#4ade80" font-size="7.5">-4</text>
      <!-- Gaining label -->
      <text x="58" y="22" fill="#f87171" font-size="7">▲ Gaining fields</text>
      <text x="58" y="110" fill="#4ade80" font-size="7">▼ Losing fields</text>
      <!-- Bars: 8 weeks  heights above/below 60 -->
      <!-- W1+2 -->  <rect x="68"  y="44" width="26" height="16" rx="3" fill="#f8717166"/>
      <!-- W2+5 -->  <rect x="102" y="24" width="26" height="36" rx="3" fill="#f8717188"/>
      <!-- W3+3 -->  <rect x="136" y="36" width="26" height="24" rx="3" fill="#f8717166"/>
      <!-- W4 0  -->  <rect x="170" y="58" width="26" height="4"  rx="2" fill="#475569"/>
      <!-- W5-2 -->  <rect x="204" y="60" width="26" height="16" rx="3" fill="#4ade8066"/>
      <!-- W6-4 -->  <rect x="238" y="60" width="26" height="32" rx="3" fill="#4ade8088"/>
      <!-- W7-3 -->  <rect x="272" y="60" width="26" height="24" rx="3" fill="#4ade8066"/>
      <!-- W8 0  -->  <rect x="306" y="58" width="26" height="4"  rx="2" fill="#475569"/>
      <!-- Annotations -->
      <text x="81"  y="40" text-anchor="middle" fill="#fca5a5" font-size="7">+2</text>
      <text x="115" y="20" text-anchor="middle" fill="#fca5a5" font-size="7">+5 peak</text>
      <text x="251" y="100" text-anchor="middle" fill="#86efac" font-size="7">-4 retreat</text>
      <!-- Week labels -->
      <text x="81"  y="115" text-anchor="middle" fill="#475569" font-size="7">W1</text>
      <text x="115" y="115" text-anchor="middle" fill="#475569" font-size="7">W2</text>
      <text x="149" y="115" text-anchor="middle" fill="#475569" font-size="7">W3</text>
      <text x="183" y="115" text-anchor="middle" fill="#475569" font-size="7">W4</text>
      <text x="217" y="115" text-anchor="middle" fill="#475569" font-size="7">W5</text>
      <text x="251" y="115" text-anchor="middle" fill="#475569" font-size="7">W6</text>
      <text x="285" y="115" text-anchor="middle" fill="#475569" font-size="7">W7</text>
      <text x="319" y="115" text-anchor="middle" fill="#475569" font-size="7">W8</text>
      <!-- Status indicators -->
      <rect x="350" y="20" width="60" height="18" rx="4" fill="#f8717122" stroke="#f87171" stroke-width="1"/>
      <text x="380" y="32" text-anchor="middle" fill="#f87171" font-size="7" font-weight="600">Spreading</text>
      <rect x="350" y="44" width="60" height="18" rx="4" fill="#47556922" stroke="#475569" stroke-width="1"/>
      <text x="380" y="56" text-anchor="middle" fill="#94a3b8" font-size="7" font-weight="600">Contained</text>
      <rect x="350" y="68" width="60" height="18" rx="4" fill="#4ade8022" stroke="#4ade80" stroke-width="1"/>
      <text x="380" y="80" text-anchor="middle" fill="#4ade80" font-size="7" font-weight="600">Retreating</text>
    </svg>
  </div>`,

  'intel-forecast': `
  <div style="margin:16px 0 20px;padding:16px;background:#1a2820;border-radius:10px;overflow:hidden;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#4ade80;margin-bottom:12px;">Population Forecast — Chart Anatomy</div>
    <svg viewBox="0 0 460 185" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px;display:block;">
      <defs>
        <style>text{font-family:Inter,sans-serif;}</style>
        <linearGradient id="cb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.04"/>
        </linearGradient>
      </defs>
      <rect width="460" height="185" rx="8" fill="#1a2e22"/>
      <!-- Axes -->
      <line x1="44" y1="18" x2="44"  y2="150" stroke="#3a5040" stroke-width="1"/>
      <line x1="44" y1="150" x2="448" y2="150" stroke="#3a5040" stroke-width="1"/>
      <!-- Y labels -->
      <text x="38" y="150" text-anchor="end" fill="#475569" font-size="7">0</text>
      <text x="38" y="110" text-anchor="end" fill="#475569" font-size="7">25</text>
      <text x="38" y="70"  text-anchor="end" fill="#475569" font-size="7">50</text>
      <text x="38" y="30"  text-anchor="end" fill="#475569" font-size="7">75</text>
      <!-- H-grid -->
      <line x1="44" y1="110" x2="448" y2="110" stroke="#243428" stroke-width="0.8"/>
      <line x1="44" y1="70"  x2="448" y2="70"  stroke="#243428" stroke-width="0.8"/>
      <line x1="44" y1="30"  x2="448" y2="30"  stroke="#243428" stroke-width="0.8"/>
      <!-- Historical blue bars (w1–w8, val/75*132 height from 150) -->
      <rect x="50"  y="127" width="22" height="23" rx="2" fill="#3b82f688"/>
      <rect x="82"  y="118" width="22" height="32" rx="2" fill="#3b82f688"/>
      <rect x="114" y="121" width="22" height="29" rx="2" fill="#3b82f688"/>
      <rect x="146" y="114" width="22" height="36" rx="2" fill="#3b82f688"/>
      <rect x="178" y="104" width="22" height="46" rx="2" fill="#3b82f688"/>
      <rect x="210" y="109" width="22" height="41" rx="2" fill="#3b82f688"/>
      <rect x="242" y="98"  width="22" height="52" rx="2" fill="#3b82f688"/>
      <rect x="274" y="92"  width="22" height="58" rx="2" fill="#3b82f688"/>
      <!-- Vertical divider -->
      <line x1="308" y1="18" x2="308" y2="150" stroke="#475569" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="310" y="28" fill="#475569" font-size="7">Forecast →</text>
      <!-- Confidence band -->
      <polygon points="308,75 340,65 372,55 404,46 436,38  436,68 404,76 372,84 340,90 308,96" fill="url(#cb)"/>
      <!-- OLS trend line through history -->
      <line x1="50" y1="135" x2="295" y2="88" stroke="#94a3b8" stroke-width="1.5"/>
      <!-- Dashed amber forecast -->
      <line x1="295" y1="88" x2="322" y2="80" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5,3"/>
      <line x1="322" y1="80" x2="354" y2="72" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5,3"/>
      <line x1="354" y1="72" x2="386" y2="63" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5,3"/>
      <line x1="386" y1="63" x2="418" y2="54" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="5,3"/>
      <circle cx="322" cy="80" r="4" fill="#f59e0b"/>
      <circle cx="354" cy="72" r="4" fill="#f59e0b"/>
      <circle cx="386" cy="63" r="4" fill="#f59e0b"/>
      <circle cx="418" cy="54" r="4" fill="#f59e0b"/>
      <!-- Threshold line -->
      <line x1="44" y1="55" x2="448" y2="55" stroke="#f87171" stroke-width="1.2" stroke-dasharray="6,3"/>
      <text x="450" y="58" fill="#f87171" font-size="7">Threshold</text>
      <!-- Legend -->
      <rect x="48"  y="160" width="12" height="8" rx="2" fill="#3b82f688"/>
      <text x="64"  y="168" fill="#93c5fd" font-size="7">Observed</text>
      <line x1="112" y1="164" x2="128" y2="164" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="132" y="168" fill="#94a3b8" font-size="7">Trend line</text>
      <line x1="182" y1="164" x2="198" y2="164" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,2"/>
      <text x="202" y="168" fill="#fde68a" font-size="7">4-wk forecast</text>
      <rect x="264" y="160" width="12" height="8" rx="2" fill="#f59e0b22" stroke="#f59e0b66" stroke-width="0.8"/>
      <text x="280" y="168" fill="#fde68a" font-size="7">90% CI band</text>
      <line x1="342" y1="164" x2="358" y2="164" stroke="#f87171" stroke-width="1.5" stroke-dasharray="4,2"/>
      <text x="362" y="168" fill="#fca5a5" font-size="7">Action threshold</text>
    </svg>
  </div>`,
};

const GROUPS = [
  {
    id: 'web',
    icon: '🌐',
    title: 'Web App',
    intro: 'The Pestlook web application runs in your browser and is the primary management interface for administrators, agronomists, and supervisors.',
    sections: [
  {
    id: 'dashboard',
    icon: '📊',
    title: 'Dashboard',
    intro: 'The Dashboard is your home screen — an at-a-glance view of everything happening across your farms right now.',
    items: [
      { heading: 'Stat Cards', body: 'Four summary tiles at the top show: <strong>Active Farms</strong> (total farms in your organisation), <strong>Traps</strong> (deployed traps, with enabled count), <strong>Scouting Sessions</strong> (total ever recorded), and <strong>Observations</strong> (total pest observations logged across all sessions).' },
      { heading: 'Active Sessions Panel', body: 'Lists sessions currently <em>In Progress</em>. Each row shows the farm, scout name, and start time. Click a row to open the full Session Detail page.' },
      { heading: 'Recent Activity Feed', body: 'A chronological feed of the most recent pest observations. Each entry shows the pest name, session, field, farm, count, and time logged. Useful for spotting emerging problems in near-real time.' },
      { heading: 'Map Panel', body: 'Plots all traps on an interactive map using GPS coordinates. Markers are colour-coded: <span style="color:#4ade80;">●</span> Green = Active, <span style="color:#f87171;">●</span> Red = Inactive, <span style="color:#fbbf24;">●</span> Yellow = Maintenance. Click a marker to see trap details.' },
      { heading: 'Top Pests Panel', body: 'Bar chart of the top 5 most frequently observed pest species in the current period. Use this to quickly identify which species to prioritise.' },
    ],
  },
  {
    id: 'farms',
    icon: '🌾',
    title: 'Farms & Fields',
    intro: 'Farms are the top-level organisational unit. Each farm has one or more fields where scouting and trapping takes place.',
    items: [
      { heading: 'Adding a Farm', body: 'Click <strong>＋ Add Farm</strong>, enter a Farm Name and optional Location, then click <strong>Save</strong>.' },
      { heading: 'Editing a Farm', body: 'Click the farm row (or the ✏️ edit icon), update the details, then click <strong>Save</strong>.' },
      { heading: 'Deleting a Farm', body: 'Click the 🗑️ delete icon and confirm. <strong>Warning:</strong> this also removes all fields, sessions, and associated data — it cannot be undone.' },
      { heading: 'Adding a Field', body: 'Select the parent farm first, then click <strong>＋ Add Field</strong>. Enter the Field Name and optional notes, then click <strong>Save</strong>.' },
      { heading: 'Editing / Deleting a Field', body: 'Click the ✏️ or 🗑️ icons on the field row. Deleting a field affects any traps and sessions attached to it.' },
    ],
  },
  {
    id: 'traps',
    icon: '🕸️',
    title: 'Traps',
    intro: 'Manage all physical monitoring traps deployed across your fields. You can search, filter by status, and sort the table by clicking column headers.',
    items: [
      { heading: 'Adding a Trap', body: 'Click <strong>＋ Add Trap</strong>. Select the Farm and Field, enter a Trap Name, choose a Trap Type (managed in Settings), set the Status, and optionally enter GPS coordinates for the map. Click <strong>Save</strong>.' },
      { heading: 'Editing a Trap', body: 'Click the ✏️ edit icon on the trap row, update the fields, then click <strong>Save</strong>.' },
      { heading: 'Activating / Deactivating', body: 'Change the Status dropdown in the edit modal between <strong>Active</strong> and <strong>Inactive</strong>. Inactive traps are excluded from performance analytics by default.' },
      { heading: 'Deleting a Trap', body: 'Click the 🗑️ icon and confirm. Historical catch data is retained in observations.' },
    ],
  },
  {
    id: 'sessions',
    icon: '🥾',
    title: 'Scouting Sessions',
    intro: 'Scouting Sessions are the core operational records. Each session is a structured field visit where a scout records pest observations. The grid is server-side paginated, sortable, searchable, and filterable.',
    items: [
      { heading: 'Searching & Filtering', body: 'Use the <strong>search box</strong> to filter by farm or scout name. Use the <strong>status dropdown</strong> to show only Planned, In Progress, or Completed sessions. Click any column header to sort; click again to reverse. Use the pagination controls at the bottom to navigate pages.' },
      { heading: 'Planning a Session', body: 'Click <strong>＋ Plan Session</strong>. Select the Farm and Fields, set a Scheduled Date, optionally assign a Scout and add Notes, then click <strong>Save</strong>. The session appears with status <em>Planned</em>.' },
      { heading: 'Editing a Planned Session', body: 'Click the ✏️ edit icon on a <em>Planned</em> row. Update any details and click <strong>Save</strong>.' },
      { heading: 'Starting a Session', body: 'Click <strong>▶ Start</strong> on a Planned session row. The status changes to <em>In Progress</em> and the start time is recorded.' },
      { heading: 'Session Detail Page', body: 'Click any session row to open the full detail page where you can view field maps with observation markers, add/edit/delete individual observations, and complete the session.' },
      { heading: 'Completing a Session', body: 'From the Session Detail page, review all observations then click <strong>Complete Session</strong> and confirm. The status changes to <em>Completed</em> and the end time is recorded.' },
      { heading: 'Date Pills', body: 'The date column shows a small coloured pill: <span style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);border-radius:20px;padding:1px 7px;font-size:0.72rem;">Scheduled</span> <span style="background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.4);border-radius:20px;padding:1px 7px;font-size:0.72rem;">Started</span> <span style="background:rgba(129,140,248,0.15);color:#818cf8;border:1px solid rgba(129,140,248,0.4);border-radius:20px;padding:1px 7px;font-size:0.72rem;">Completed</span> — showing which date field is being displayed.' },
    ],
  },
  {
    id: 'observation-log',
    icon: '📋',
    title: 'Observation Log',
    intro: 'The Observation Log is a cross-session observation explorer. Where the session detail page shows observations for a single session, the Observation Log lets you query and filter observations across all sessions at once — by date range, farm, field, trap, pest, or scout.',
    items: [
      {
        heading: 'Opening the page',
        body: 'Click <strong>Observation Log</strong> under Operations in the sidebar. The page loads all your farms, fields, traps, and pests automatically so you can filter without typing IDs.',
      },
      {
        heading: 'Date range filter',
        body: 'Use the <strong>From</strong> and <strong>To</strong> date pickers to limit results to a specific calendar window. Leave both blank to return all observations. Dates are interpreted in your local timezone.',
      },
      {
        heading: 'Farm & Field filters (cascading)',
        body: 'Selecting a farm automatically narrows the <strong>Field</strong> and <strong>Trap</strong> dropdowns to only show fields and traps that belong to that farm. This prevents selecting a field that doesn\'t exist on the chosen farm.',
      },
      {
        heading: 'Trap, Pest & Scout filters',
        body: 'Filter by a specific <strong>Trap</strong> (shows only observations against that trap), a specific <strong>Pest</strong> (only observations targeting that pest), or a <strong>Scout</strong> by name — partial names are supported and the search is case-insensitive.',
      },
      {
        heading: 'Applying and clearing filters',
        body: 'Click <strong>Apply</strong> to run the query with the current filter values. Click <strong>Clear</strong> to reset all filters and reload the full unfiltered set.',
      },
      {
        heading: 'Result table columns',
        body: 'Each row represents a single observation item. Columns are: <strong>#</strong> (row number for the current page), <strong>Date</strong> (ObservedAt timestamp if available, otherwise CreatedAt), <strong>Farm</strong>, <strong>Field</strong>, <strong>Scout</strong>, <strong>Type</strong> (Trap or AdHoc + Planned/Unplanned badge), <strong>Trap</strong>, <strong>Pest</strong>, <strong>Mode</strong> (Count or Presence), <strong>Count</strong> (red and bold if threshold exceeded), <strong>Threshold</strong>, <strong>Present</strong> (for presence-mode observations), <strong>Life Stage</strong>, <strong>Notes</strong>, <strong>Photos</strong>, and <strong>Session</strong> (link to the parent session).',
      },
      {
        heading: 'Threshold breaches',
        body: 'Rows where the observation count exceeds the pest\'s threshold are highlighted in red and the Count cell is shown in bold red. This lets you spot problem observations at a glance without needing to open individual sessions.',
      },
      {
        heading: 'Navigating to a session',
        body: 'The <strong>Session</strong> column shows the first 8 characters of the session ID as a link. Click it to jump directly to that session\'s detail page.',
      },
      {
        heading: 'Photo viewer',
        body: 'If photos were taken for an observation, a <strong>📷 N</strong> button appears in the Photos column. Click it to open an inline gallery showing all photos for that observation.',
      },
      {
        heading: 'Pagination',
        body: 'Results are returned 50 per page. Use the <strong>«</strong> / <strong>»</strong> buttons to jump to the first or last page, <strong>← Prev</strong> / <strong>Next →</strong> to step through pages, or type a page number directly into the input box and press Enter.',
      },
      {
        heading: 'Exporting to CSV',
        body: 'Click <strong>⬇ Export CSV</strong> at the top right to download every matching observation as a CSV file — all records, not just the current page. The export honours your active filters. The file is named with today\'s date.',
      },
    ],
  },
  {
    id: 'analytics',
    icon: '📈',
    title: 'Analytics',
    intro: 'The Analytics section has eleven report tabs. Every tab (except Field Coverage and Billing) shares the same date range, farm, field, and scout filters at the top-right. All tabs refresh when you change the filters. The default date range is the last 90 days.',
    items: [
      // ── Overview ──
      { heading: '📊 Overview — Threshold Breaches', body: 'The number of individual pest observations in the selected period where the count recorded by the scout exceeded the safe action threshold set for that pest. One session can contribute many breaches if multiple pests were over their limits. A value above 0 turns red — drill into the Threshold Alerts tab to see the full list.' },
      { heading: '📊 Overview — Session Compliance', body: 'The percentage of scouting sessions in the period that were completed, calculated as <em>completed sessions ÷ total sessions × 100</em>. Because the Overview filters by completion date, all sessions counted here are already completed, so this will normally read 100% — the more detailed per-scout breakdown is on the Sessions Summary tab.' },
      { heading: '📊 Overview — Active Traps', body: 'How many traps are currently switched on across the selected farm or field. This figure is <strong>not</strong> affected by the date range — it always shows the current state of your traps. The subtitle shows how many are disabled.' },
      { heading: '📊 Overview — Total Observations', body: 'The grand total of pests counted across all sessions in the period. Every observation record stores a <em>Count</em> (e.g. "12 aphids seen here") and this KPI adds all those counts together. It is <strong>not</strong> the number of observation records — it is the sum of the actual pest quantities. Three records of 50, 30, and 20 would give a Total Observations of 100, not 3. The trend arrow in the subtitle compares the last 4 weeks of the period to the first 4 weeks.' },
      { heading: '📊 Overview — Observation trend chart', body: 'A bar chart of total pest observations over time. The bucket size adjusts automatically: one bar per <strong>day</strong> when 14 days or fewer are selected, one bar per <strong>week</strong> for 15–180 days, and one bar per <strong>calendar month</strong> for longer periods. Taller bars mean more pest activity. Empty periods appear faded.' },
      { heading: '📊 Overview — Top 6 Pests chart', body: 'A horizontal bar chart ranking the 6 pest species with the highest total observation counts in the period. Unknown or unidentified pests are excluded. Use this to prioritise which species to focus control efforts on.' },

      // ── Threshold Alerts ──
      { heading: '🚨 Threshold Alerts — Breach list', body: 'Every observation in the selected period where <em>Count > Threshold</em>, ordered newest first. Each row shows the pest name, field and farm, how many pests were observed, the configured threshold, the scout who recorded it, and the session date. Unknown pests are excluded because they have no threshold defined.' },
      { heading: '🚨 Threshold Alerts — Repeat Offenders', body: 'A pest + field combination that appears <strong>2 or more times</strong> in the breach list. This flags situations where the same pest keeps exceeding its threshold on the same field — a sign that treatment is overdue or that the current control measures are not working.' },
      { heading: '🚨 Threshold Alerts — Weekly Breach Trend chart', body: 'Always shows the <strong>last 8 weeks</strong> regardless of your date filter. One bar per week counting all threshold breaches that week. A rising trend means the situation is getting worse; a falling trend means control measures are having an effect.' },

      // ── Pest Pressure ──
      { heading: '🌿 Pest Pressure — Sessions (per field)', body: 'The number of distinct scouting sessions that visited this field in the selected period.' },
      { heading: '🌿 Pest Pressure — Total Obs (per field)', body: 'The sum of all pest counts recorded on this field in the period. Fields are listed highest Total Obs first so the most pressured fields appear at the top.' },
      { heading: '🌿 Pest Pressure — Avg Obs / Session (per field)', body: 'Total observations divided by the number of sessions. A rising average means more pests are being found per visit — the field is getting worse even if the session count stays the same.' },
      { heading: '🌿 Pest Pressure — Breach Count (per field)', body: 'How many individual observations exceeded their configured threshold on this field in the period.' },
      { heading: '🌿 Pest Pressure — Top 3 Pests (per field)', body: 'The three pest species with the highest total counts on this field in the period, ranked by sum of observation counts.' },

      // ── Sessions Summary ──
      { heading: '📋 Sessions — Total', body: 'All sessions falling in the date range. Matched on whichever date is available: completion date, then start date, then scheduled date.' },
      { heading: '📋 Sessions — Completed', body: 'Sessions that have a completion date recorded.' },
      { heading: '📋 Sessions — Planned', body: 'Sessions that are scheduled for a future date and have not yet been started.' },
      { heading: '📋 Sessions — Overdue', body: 'Planned sessions whose scheduled date has already passed but were never started.' },
      { heading: '📋 Sessions — Active', body: 'Sessions that have been started but not yet completed.' },
      { heading: '📋 Sessions — Completion Rate', body: 'Completed ÷ Total × 100, rounded to one decimal place.' },
      { heading: '📋 Sessions — Avg / Min / Max Duration', body: 'Average, shortest, and longest session durations in minutes, calculated from start time to completion time. Only sessions where both timestamps were recorded are included. Very short durations may mean the session was closed early; very long ones may mean it was accidentally left open.' },
      { heading: '📋 Sessions — Scout Compliance table', body: 'One row per scout showing total sessions assigned, how many they completed, and a colour-coded percentage bar (green ≥ 80%, amber ≥ 50%, red below 50%). Use this to identify which team members are not meeting their scouting targets.' },
      { heading: '📋 Sessions — 8-week stacked chart', body: 'Always the last 8 weeks regardless of your date filter. Each bar is split into Completed (green), Planned (amber), and Overdue (red) sessions for that calendar week. Useful for spotting whether planned sessions are being carried out or falling overdue.' },

      // ── Top Pests ──
      { heading: '🐛 Top Pests — Total Count', body: 'The sum of all observation counts for this pest species across all sessions in the period. This is a sum of pest quantities, not a count of records.' },
      { heading: '🐛 Top Pests — Fields Affected', body: 'How many distinct fields this pest was recorded on in the period.' },
      { heading: '🐛 Top Pests — Sessions', body: 'How many distinct scouting sessions recorded this pest.' },
      { heading: '🐛 Top Pests — Breaches', body: 'How many times an observation of this pest exceeded its configured action threshold.' },
      { heading: '🐛 Top Pests — Threshold', body: 'The highest threshold value recorded for this pest across any observation in the period.' },
      { heading: '🐛 Top Pests — Top Life Stage', body: 'The life stage (e.g. Adult, Larva, Egg) recorded most frequently for this pest in the period, based on the number of observation records that noted a life stage.' },

      // ── Trap Performance ──
      { heading: '🕸️ Trap Performance — Active Traps', body: 'The number of traps that are currently enabled. Not affected by the date range. A disabled trap is not being checked and contributes no monitoring data — review the Traps page to re-enable or replace it.' },
      { heading: '🕸️ Trap Performance — Total Catches', body: 'The sum of all pest counts recorded on trap-type observations in the selected period.' },
      { heading: '🕸️ Trap Performance — Avg Catch Rate', body: 'Total Catches ÷ Total Checks across all traps, where one "check" equals one scouting session that included this trap. A rising catch rate means traps are catching more per visit — the infestation may be growing.' },
      { heading: '🕸️ Trap Performance — Overdue Checks', body: 'Active traps that have not been checked in more than 7 days, based on the date of their last recorded session. Shown in red when greater than 0. Overdue traps create gaps in your monitoring data.' },
      { heading: '🕸️ Trap Performance — Check Count (per trap)', body: 'How many distinct scouting sessions visited this trap in the selected period.' },
      { heading: '🕸️ Trap Performance — Catch Rate (per trap)', body: 'Total Catches ÷ Check Count for this individual trap, rounded to 2 decimal places.' },
      { heading: '🕸️ Trap Performance — Top Pest (per trap)', body: 'The pest species with the highest total catch count on this trap in the period.' },

      // ── Scout Productivity ──
      { heading: '👤 Scout Productivity — Total Sessions', body: 'All sessions assigned to this scout in the period, including planned, active, and completed.' },
      { heading: '👤 Scout Productivity — Completion Rate', body: 'Completed ÷ Total sessions × 100.' },
      { heading: '👤 Scout Productivity — Avg Duration', body: 'Average session length in minutes for completed sessions where both a start time and end time were recorded.' },
      { heading: '👤 Scout Productivity — Total Obs', body: 'The sum of all pest counts across this scout\'s sessions in the period.' },
      { heading: '👤 Scout Productivity — Obs / Session', body: 'Total Obs ÷ Completed Sessions. Measures how thorough each completed session was on average. A consistently low value may mean the scout is rushing or missing observations.' },
      { heading: '👤 Scout Productivity — Fields Visited', body: 'The number of distinct fields this scout visited in the period.' },
      { heading: '👤 Scout Productivity — Alerts', body: 'The total number of threshold breach observations recorded in this scout\'s sessions.' },
      { heading: '👤 Scout Productivity — Overdue', body: 'This scout\'s planned sessions that are past their scheduled date without being started.' },
      { heading: '👤 Scout Productivity — 8-week activity chart', body: 'Shows completed session counts per week for the <strong>top 5 scouts by total sessions</strong> over the last 8 weeks. Each colour represents a different scout. Useful for identifying who has had gaps in activity.' },

      // ── Seasonal Trends ──
      { heading: '📅 Seasonal Trends', body: 'This tab always covers the <strong>last 18 months</strong> and has no date range filter. It shows how pest pressure and session activity change across the seasons.' },
      { heading: '📅 Seasonal Trends — Session Count (per month)', body: 'How many scouting sessions were completed in that calendar month.' },
      { heading: '📅 Seasonal Trends — Total Obs (per month)', body: 'Sum of all pest observation counts in that month. Unknown/unidentified pests are excluded.' },
      { heading: '📅 Seasonal Trends — Avg Temp °C (per month)', body: 'Average temperature recorded during sessions in that month. Only sessions where a temperature was logged are included. Months with no temperature data show a blank.' },
      { heading: '📅 Seasonal Trends — Top 3 Pests (per month)', body: 'The three pest species with the highest total counts in that calendar month, calculated from the session data after it is loaded.' },

      // ── Unknown Pests ──
      { heading: '❓ Unknown Pests — Total', body: 'The number of observation records where the pest was flagged as unidentified and the session\'s completion date (or start date if not yet complete) falls in the selected period.' },
      { heading: '❓ Unknown Pests — With Photos', body: 'Of the unknown sightings, how many have at least one photo attached. An observation is counted as having photos when its stored photo list is not empty. Photos are the most useful tool for retrospective identification — send them to an agronomist or taxonomist.' },
      { heading: '❓ Unknown Pests — With Notes', body: 'Unknown sightings where the scout wrote a descriptive note. Notes combined with photos give the best chance of identification.' },
      { heading: '❓ Unknown Pests — Fields Affected', body: 'How many distinct fields recorded at least one unknown-pest sighting in the period.' },
      { heading: '❓ Unknown Pests — Priority flag', body: 'An observation is marked Priority when the count is 5 or more, or when a photo is attached. These are the records most in need of expert identification and should be submitted to your agronomist first.' },
      { heading: '❓ Unknown Pests — Weekly trend chart', body: 'Always the last 8 weeks. One bar per week showing how many unknown-pest observations were recorded. A rising trend may indicate scouts are encountering new or unfamiliar species, or that identification training is needed.' },

      // ── Field Coverage ──
      { heading: '🗺 Field Coverage', body: 'This tab has <strong>no date range filter</strong>. Sessions This Month counts from the 1st of the current calendar month. Total Sessions covers all time. The coverage target is 4 completed sessions per field per month.' },
      { heading: '🗺 Field Coverage — Sessions This Month', body: 'Completed scouting sessions on this field since the 1st of the current month.' },
      { heading: '🗺 Field Coverage — Total Sessions', body: 'All completed sessions ever recorded on this field, across all time.' },
      { heading: '🗺 Field Coverage — Coverage %', body: 'Sessions This Month ÷ 4 × 100, capped at 100%. Reaching 4 sessions gives 100% coverage. Fields are listed lowest coverage first so the most under-monitored fields always appear at the top.' },
      { heading: '🗺 Field Coverage — Days Since Last Session', body: 'How many days have passed since the most recent completed session on this field.' },
      { heading: '🗺 Field Coverage — Top Pest', body: 'The pest with the highest all-time sum of observation counts on this field, across all recorded history (not limited to the current month).' },

      // ── Billing ──
      { heading: '💳 Billing — Active Traps', body: 'The current number of enabled traps in your account. This is typically the basis for subscription pricing. Not filtered by date range.' },
      { heading: '💳 Billing — Billing Month', body: 'The month the snapshot applies to.' },
      { heading: '💳 Billing — Active Points', body: 'The count of active monitoring points recorded at the time of that billing snapshot. May differ from the current active trap count if traps were added or removed during the month.' },
      { heading: '💳 Billing — Amount', body: 'The charge for that month.' },
      { heading: '💳 Billing — Status', body: 'Whether that month\'s invoice is paid, pending, or overdue.' },
    ],
  },
  {
    id: 'pests',
    icon: '🦗',
    title: 'Pest Catalogue',
    intro: 'A reference library of all pest species configured in your organisation.',
    items: [
      { heading: 'Adding a Pest', body: 'Click <strong>＋ Add Pest</strong>. Enter the Common Name, optional Scientific Name, Category, and the <strong>Action Threshold</strong> (the count that triggers a breach alert). Add any notes and click <strong>Save</strong>.' },
      { heading: 'Editing a Pest', body: 'Click the ✏️ icon next to the pest. Update the fields and click <strong>Save</strong>. Changes apply immediately to future observations.' },
      { heading: 'Deleting a Pest', body: 'Click the 🗑️ icon and confirm. Existing observations retain the name but the pest no longer appears in the selection list for new observations.' },
    ],
  },
  {
    id: 'custom-reports',
    icon: '🔍',
    title: 'Custom Reports',
    intro: 'Custom Reports lets you build ad-hoc queries across your data without writing SQL. Every result is automatically scoped to your organisation — you can never accidentally see another tenant\'s data.',
    items: [
      {
        heading: 'Picking a table',
        body: 'Use the <strong>Table</strong> dropdown in the left panel to choose what data you want to query. The available tables are: <strong>Farms</strong>, <strong>Fields</strong>, <strong>Pests</strong>, <strong>Scouting Sessions</strong>, <strong>Session Observations</strong>, <strong>Traps</strong>, <strong>Trap Types</strong>, and <strong>Users</strong>. Once you pick a table the column list, filter builder, and sort options all update automatically.',
      },
      {
        heading: 'Columns',
        body: 'Tick the columns you want to see in the result. Leave all boxes unticked to return every column. The column list is grouped by the source of the data — for example, the <em>Session Observations</em> table includes columns from related tables such as <em>Farm</em>, <em>Field</em>, <em>Scout</em>, <em>Pest</em>, and <em>Trap</em> that are automatically joined for you.',
      },
      {
        heading: 'Joins are automatic',
        body: 'You do not need to join tables manually. Related data is already available as columns on the relevant table. For example, selecting <em>Session Observations</em> gives you <strong>Farm</strong>, <strong>Field</strong>, <strong>Scout</strong>, <strong>Pest</strong>, <strong>Trap</strong>, and <strong>Trap Type</strong> columns — all derived from the joined records behind the scenes.',
      },
      {
        heading: 'Filters',
        body: 'Click <strong>+ Add filter</strong> to add a condition. Each filter has three parts: the <strong>column</strong> to test, an <strong>operator</strong>, and a <strong>value</strong>. Available operators depend on the column type: text columns support <em>equals, not equals, contains, starts with, ends with, is empty, is not empty</em>; number and date columns support <em>equals, not equals, >, ≥, &lt;, ≤</em>; boolean columns support <em>equals / not equals</em>. Multiple filters are combined with AND — all conditions must be true for a row to appear.',
      },
      {
        heading: 'Group By & Aggregates',
        body: 'To summarise data, tick one or more columns under <strong>Group By</strong>, then click <strong>+ Add aggregate</strong> to define the calculation. Each aggregate has a <strong>function</strong> (<em>count, sum, avg, min, max</em>) and the <strong>column</strong> to apply it to. For example: group by <em>Farm Name</em> and aggregate <em>count</em> on <em>ID</em> to get the number of observations per farm. Group By and Aggregates only activate when you have set at least one column in each.',
      },
      {
        heading: 'Sort',
        body: 'Pick a column to sort by from the <strong>Sort</strong> dropdown and optionally tick <strong>Descending</strong>. You can also click any column header in the results table to sort by that column — click again to reverse the direction.',
      },
      {
        heading: 'Page size',
        body: 'Controls how many rows are returned per page. Options are 25, 50, 100, 250, and 500. Use a smaller page size for large tables to keep queries fast.',
      },
      {
        heading: 'Running a report',
        body: 'Click <strong>Run Report</strong> to execute the query. The result shows the total row count, current page, and all matching rows in a table. Date and time values are shown in your local timezone. Use the <strong>← Prev</strong> and <strong>Next →</strong> buttons to page through results.',
      },
      {
        heading: 'Exporting to CSV',
        body: 'Click <strong>Export CSV</strong> to download the full result set as a comma-separated file. The export applies your current filters, grouping, and sort — but returns all rows, ignoring the page size limit. The file is named with today\'s local date.',
      },
      {
        heading: 'Saving a report',
        body: 'Once your query is configured, click <strong>Save</strong>. Enter a name (required) and an optional description. The report definition is saved to your organisation — any admin or user with access can load it. Saved reports appear in the <strong>Saved Reports</strong> panel at the bottom of the left sidebar.',
      },
      {
        heading: 'Loading a saved report',
        body: 'Click any report name in the <strong>Saved Reports</strong> panel to restore its table, columns, filters, grouping, and sort. The query is not run automatically — review or adjust the settings then click <strong>Run Report</strong>.',
      },
      {
        heading: 'Updating a saved report',
        body: 'Load a saved report, make your changes, then click <strong>Update</strong> (the Save button changes label when a report is loaded). The existing definition is overwritten.',
      },
      {
        heading: 'Deleting a saved report',
        body: 'Click the <strong>×</strong> button next to the report name in the Saved Reports panel and confirm. This cannot be undone.',
      },
    ],
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Settings',
    intro: 'Manage your organisation preferences, trap types, and team members.',
    items: [
      { heading: 'Organisation Info', body: 'Displays your organisation name, plan tier, and contact details. Contact your administrator or Pestlook support to update these.' },
      { heading: 'Preferences', body: 'Set a Default Date Range for Analytics (7, 30, 90 days etc.) and toggle email / in-app notifications for threshold breaches. Click <strong>Save Preferences</strong> after making changes.' },
      { heading: 'Trap Types — Adding', body: 'Click <strong>＋ Add</strong> next to "Trap Types", enter the type name (e.g. "Delta Sticky"), and click <strong>Save</strong>. The new type appears in the Trap type dropdown when adding or editing traps.' },
      { heading: 'Trap Types — Editing / Deleting', body: 'Click the edit or delete icon next to any trap type. Deleting a type keeps the label on existing traps but removes it from future selections.' },
      { heading: 'Team Members — Roles', body: '<strong>Admin</strong> — full access including settings and team management. <strong>Scout</strong> — can start sessions and log observations, cannot manage settings or users. <strong>Viewer</strong> — read-only access to dashboard and analytics.' },
      { heading: 'Adding a Team Member', body: 'Click <strong>＋ Add Team Member</strong>, enter First Name, Last Name, Email, and select a Role, then click <strong>Save</strong>.' },
      { heading: 'Editing a Team Member', body: 'Click the edit icon on the team member row, change the role or name, and click <strong>Save</strong>.' },
    ],
  },
  ], // end Web App sections
  },
  {
    id: 'mobile',
    icon: '📱',
    title: 'Mobile App',
    intro: 'The Pestlook mobile app is designed for scouts in the field. It works on Android and connects to the same data as the web app. It is optimised for outdoor use — large touch targets, offline capability, and GPS integration.',
    sections: [
      {
        id: 'mob-overview',
        icon: '📱',
        title: 'Getting Started',
        intro: 'The mobile app is used by scouts to conduct scouting sessions, record pest observations, and check traps while in the field.',
        items: [
          { heading: 'Logging In', body: 'Open the app and enter your email and password. These are the same credentials used for the web app. Your session stays active until you sign out. If you see a "Tenant not found" error, contact your administrator to ensure your account has been assigned to an organisation.' },
          { heading: 'Online vs Offline Mode', body: 'The app detects your internet connection automatically. When <strong>online</strong>, all data syncs to the server in real time. When <strong>offline</strong> (e.g. in remote paddocks with no signal), observations are saved locally to the device. When connectivity is restored, the app automatically syncs the queued data to the server. A sync indicator in the header shows pending records.' },
          { heading: 'GPS & Location', body: 'The app uses your device\'s GPS to tag observations and trap checks with coordinates. When you start a session or add an observation, the app records your location automatically. Ensure you grant the app <strong>Location Permission</strong> during first launch. For best accuracy, enable High Accuracy (GPS + network) in your device settings.' },
        ],
      },
      {
        id: 'mob-sessions',
        icon: '🥾',
        title: 'Conducting a Scouting Session',
        intro: 'Scouting sessions on mobile work the same way as on the web, but are designed for one-handed field use.',
        items: [
          { heading: 'Viewing Planned Sessions', body: 'The home screen shows sessions assigned to you for today, sorted by scheduled time. Planned sessions from the web app appear here automatically — no manual entry needed. Tap a session to open it.' },
          { heading: 'Starting a Session', body: 'Tap a <em>Planned</em> session and press <strong>Start Session</strong>. The status changes to In Progress and the start time is recorded. If you need to start an unplanned (ad-hoc) session, tap <strong>New Session</strong> on the home screen, select the farm and field, and press Start.' },
          { heading: 'Adding Observations', body: 'Inside an active session, tap <strong>＋ Add Observation</strong>. Select the pest from the catalogue (or mark as Unknown if unidentified), enter the count, optionally select a life stage (adult, larva, egg, etc.), add notes, and tap <strong>Save</strong>. The observation is saved immediately — even offline.' },
          { heading: 'Taking Photos', body: 'When adding or editing an observation, tap the <strong>📷 Camera</strong> button to take a photo directly or choose from your gallery. Photos are attached to the observation and synced to the server when online. Photos of unknown pests are particularly valuable for identification.' },
          { heading: 'Checking Traps', body: 'During a session, tap <strong>Check Trap</strong> to record a trap inspection. Select the trap from the list (filtered to the current field), enter the catch count and pest species, and save. The app records the date, time, and your GPS location for the check.' },
          { heading: 'Completing a Session', body: 'When all observations have been recorded, tap <strong>Complete Session</strong> and confirm. The session is marked as Completed with the current time. If offline, the completion is queued and synced when connectivity returns.' },
          { heading: 'Editing / Deleting Observations', body: 'Swipe left on an observation row to reveal Edit and Delete options. You can edit observations in a completed session as long as you are the scout who recorded it, or you have Admin role.' },
        ],
      },
      {
        id: 'mob-sync',
        icon: '🔄',
        title: 'Sync & Data',
        intro: 'Understanding how data flows between the mobile app and the server.',
        items: [
          { heading: 'Automatic Sync', body: 'Whenever the app detects an internet connection, it automatically pushes any locally saved observations, session updates, and trap checks to the server. You do not need to do anything manually — the sync happens in the background.' },
          { heading: 'Manual Sync', body: 'To force an immediate sync, pull down on the home screen (pull-to-refresh) or tap the sync icon in the top-right corner. The icon spins while syncing and shows a ✓ tick when complete.' },
          { heading: 'Sync Conflicts', body: 'If the same record was edited on both the web and mobile while offline, the most recently modified version wins. You will see a notification banner if any conflicts were resolved. Review the affected session on the web app to verify the data is correct.' },
          { heading: 'Storage Usage', body: 'The app stores a local copy of your farm, field, trap, and pest reference data so it works offline. This cache is refreshed on every successful sync. If your reference data seems out of date (e.g. a new field is missing), force a sync or restart the app.' },
        ],
      },
      {
        id: 'mob-settings',
        icon: '⚙️',
        title: 'Mobile Settings',
        intro: 'App-level settings accessible from the profile icon or the Settings menu in the app.',
        items: [
          { heading: 'Account & Profile', body: 'View your name, email, role, and organisation. Tap <strong>Change Password</strong> to update your password (requires current password). Password changes apply to both the web and mobile app.' },
          { heading: 'Notification Preferences', body: 'Enable or disable push notifications for: new sessions assigned to you, threshold breach alerts for your fields, and sync error alerts. Notifications require the app to have notification permission granted in your device settings.' },
          { heading: 'GPS Accuracy Mode', body: 'Switch between <strong>High Accuracy</strong> (GPS + Wi-Fi + mobile data — best precision, uses more battery) and <strong>Battery Saving</strong> (network-based only — less accurate but longer battery life). Recommended: High Accuracy for trap checks and observation pinning; Battery Saving for general navigation.' },
          { heading: 'Temperature Units', body: 'Choose Celsius (°C) or Fahrenheit (°F) for temperature display. This setting is synced to your profile and also applies to the web app.' },
          { heading: 'Sign Out', body: 'Tap <strong>Sign Out</strong> at the bottom of settings. Any unsynced data will be synced before signing out if a connection is available. If offline, you will be warned that unsynced records may be lost.' },
        ],
      },
    ],
  },
  {
    id: 'intelligence',
    icon: '🧭',
    title: 'Spread & Movement Intelligence',
    intro: 'The Spread & Movement section uses GPS-tagged observation history to show how pest populations are physically moving across your farms — where outbreaks originate, which fields are at risk from a nearby breach, and when a simultaneous multi-farm spike signals a regional event.',
    sections: [
      {
        id:    'intel-spread',
        icon:  '🧭',
        title: 'Pest Spread Direction Mapping',
        intro: 'This page shows a live map and analysis of how each pest species is physically moving across your fields over time. All data is derived from GPS-tagged scouting observations.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Tracked</strong> — the number of pest species that have enough GPS observation history to compute a spread direction. <strong>Fields Affected</strong> — the total number of distinct fields where at least one observation was recorded in the selected period. <strong>Neighbour Risk</strong> — fields that are within 5 km of an active spread front but have not yet reported that pest; shown in amber when greater than 0. <strong>Fastest Spreading</strong> — the pest species gaining ground most rapidly, shown with its compass direction arrow and speed in new fields per week.',
          },
          {
            heading: 'Map — Blue circle markers',
            body: 'Each semi-transparent blue circle represents a field with GPS data. Click any circle to see the field name and farm. Fields without GPS coordinates (neither GPS-tagged observations nor a farm location set) will not appear on the map.',
          },
          {
            heading: 'Map — Coloured dashed lines',
            body: 'Each dashed line is a <em>spread vector</em> — it runs from the field where a pest was <strong>first observed</strong> to the centre-point (centroid) of all fields where it was <strong>most recently observed</strong>. The line colour shows how fast the pest is spreading: <span style="color:#4ade80;font-weight:600;">● Green</span> = contained or not spreading (0 or fewer new fields per week), <span style="color:#f59e0b;font-weight:600;">● Amber</span> = slow spread (less than 0.5 new fields per week), <span style="color:#f87171;font-weight:600;">● Red</span> = fast spread (0.5 or more new fields per week). Click a line to see the pest name, compass direction, and speed.',
          },
          {
            heading: 'Map — Filled circle at the tip of each line',
            body: 'This circle marks the current front of the spread — where the pest has reached most recently. It is the same colour as its dashed line (green / amber / red) so you can immediately see severity at a glance.',
          },
          {
            heading: '▶ Animate button',
            body: 'Pressing <strong>▶ Animate</strong> steps through each week of data in sequence, one week every 0.9 seconds, replaying how the infestation grew over time. During playback the map markers change to show only the fields active in that particular week. Press <strong>⏹ Stop</strong> at any moment to freeze the map on that week and inspect it in detail.',
          },
          {
            heading: 'Animation — Red field markers',
            body: 'During playback, a <span style="color:#c75146;font-weight:600;">red</span> circle on a field means at least one observation in that week recorded a count <strong>above the configured action threshold</strong> for that pest. These are your highest-priority fields — intervention is likely needed.',
          },
          {
            heading: 'Animation — Blue field markers',
            body: 'During playback, a <span style="color:#3b7db8;font-weight:600;">blue</span> circle means the pest was observed in that field that week but the count was still within the safe threshold. Monitor closely.',
          },
          {
            heading: 'Animation — Grey field markers',
            body: 'During playback, small grey circles indicate fields that had no observations recorded for the selected pest in that week. They remain visible so you can see the full farm layout at a glance.',
          },
          {
            heading: 'Spread Summary by Pest — compass arrow',
            body: 'Each pest card shows a large compass arrow (↑ ↗ → ↘ ↓ ↙ ← ↖) in the top-right corner. This is the overall bearing from the pest\'s origin field to its current spread front, snapped to the nearest of 8 compass directions. The full bearing in degrees and the text label (N / NE / E / SE etc.) are shown in the card body.',
          },
          {
            heading: 'Spread Summary by Pest — Velocity colour',
            body: 'The <em>Velocity</em> figure on each card is coloured the same way as the map lines: <span style="color:#4ade80;font-weight:600;">green</span> = contained, <span style="color:#f59e0b;font-weight:600;">amber</span> = slow, <span style="color:#f87171;font-weight:600;">red</span> = fast. Use the ‹ › buttons to page through all pest cards two at a time.',
          },
          {
            heading: '⚠ Neighbour Risk panel',
            body: 'This panel appears only when at least one field is at risk. It lists every field that is within <strong>5 km</strong> of an active pest spread front but has not yet had that pest recorded in any scouting session. These fields should be prioritised for an unplanned inspection — early detection at this stage can prevent the spread from taking hold.',
          },
          {
            heading: 'Weekly Field Exposure Timeline',
            body: 'A grid showing pest activity week by week. Rows are pest species; columns are the week start dates. The view shows 8 weeks at a time — use <strong>‹ Earlier</strong> and <strong>Later ›</strong> to navigate. A <span style="background:rgba(59,125,184,0.12);color:#3b7db8;font-weight:600;padding:1px 5px;border-radius:3px;">blue cell</span> means the pest was observed across one or more fields that week and counts were within threshold. A <span style="background:rgba(199,81,70,0.15);color:#c75146;font-weight:600;padding:1px 5px;border-radius:3px;">red-tinted cell</span> means at least one field exceeded its threshold that week. The large number is the total pest count (sum of all observation counts) and the small subtitle shows how many distinct fields reported that pest.',
          },
          {
            heading: 'Show Pest filter',
            body: 'The <em>Show Pest</em> dropdown at the top of the page re-fetches data filtered to a single pest species, making the map, vectors, and timeline easier to read when many pests are tracked. Selecting "All pests" returns the combined view.',
          },
          {
            heading: 'Data requirements',
            body: 'Spread direction mapping requires at least <strong>two weeks</strong> of observations with GPS coordinates for a meaningful vector to be calculated. If GPS coordinates are missing from observations, the system falls back to the farm\'s own latitude and longitude (set on the Farms page) and applies a small position offset per field so they appear as distinct dots rather than a single stacked point.',
          },
        ],
      },
      {
        id:    'intel-origin',
        icon:  '🔍',
        title: 'Infestation Origin Detection',
        intro: 'Works backwards through your scouting history to identify the most likely origin field for each pest outbreak — the field that first reported the species — then builds a chronological spread chain showing every subsequent field in the order it was reached.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Traced</strong> — the number of distinct pest species for which an origin field could be identified in the selected period. <strong>Multi-field Outbreaks</strong> — the count of pests that were detected on two or more fields, indicating genuine spread rather than an isolated sighting; shown in amber when greater than 0. <strong>Fastest Spread</strong> — the pest that reached a second field in the fewest days from the origin, shown in red as the highest-risk spreading species. <strong>Farthest Spread</strong> — the pest whose spread chain covers the greatest geographic distance from origin to furthest affected field (requires GPS data).',
          },
          {
            heading: 'Show Pest selector',
            body: 'Switches the map and spread chain panel to show a different pest species. The summary table at the bottom still shows all pests regardless of this selector. Clicking a row in the summary table also switches the active pest.',
          },
          {
            heading: 'Confidence badge',
            body: 'Shows how certain the system is that the identified origin field is the true outbreak source. <span style="color:#c75146;font-weight:600;">High</span> (≥ 70%) means the origin count was already above threshold and spread to a second field within 21 days — a strong outbreak signature. <span style="color:#e5a52f;font-weight:600;">Moderate</span> (40–69%) means one of those conditions is met. <span style="color:#2b6e4f;font-weight:600;">Low</span> (below 40%) means only one field reported the pest or counts were within threshold — possibly an isolated sighting rather than an outbreak.',
          },
          {
            heading: 'Map — numbered markers',
            body: 'Each circle is numbered in the order the pest was first detected: <span style="background:#c75146;color:#fff;border-radius:50%;padding:1px 7px;font-size:0.8rem;">1</span> is always the origin field (red). Subsequent fields are blue, and the most recently affected field is amber. Click any marker to see the field name, farm, first count, and how many days after the origin it was reached.',
          },
          {
            heading: 'Map — connecting dashed line',
            body: 'The grey dashed polyline connects each field in the spread chain in chronological order. It is not a route — it is a straight-line sequence showing the approximate path of spread. Fields without GPS coordinates are omitted from the map but still appear in the chain list on the right.',
          },
          {
            heading: 'Spread Chain list',
            body: 'The numbered list to the right of the map shows every field in the outbreak chain in order of first detection. Each entry shows the field and farm name, the date the pest was first recorded, the total count in that first week, whether it was above or below the configured threshold, and the distance from the origin field (when GPS is available). The <strong>ORIGIN</strong> badge marks step 1; subsequent steps show how many days after the origin they were reached.',
          },
          {
            heading: '⚠ Above threshold indicator',
            body: 'A red <strong>⚠ above threshold</strong> label means the first-week count on that field already exceeded the pest\'s configured action threshold at the time of initial detection. This is a strong signal that the infestation was already established by the time it was found — earlier detection or more frequent scouting of that field may have allowed earlier intervention.',
          },
          {
            heading: 'Summary table — Days to 2nd Field',
            body: 'The number of days between the origin field\'s first detection and the date the pest was first found on the next field. A short lag (3–7 days) suggests rapid active spread; a long lag (30+ days) may indicate independent introduction rather than spread from the origin.',
          },
          {
            heading: 'How the origin is determined',
            body: 'The system groups all observations for each pest by field and finds the earliest observation date per field. The field with the overall earliest date is designated the origin. If that field\'s first-week count was already above the action threshold, the confidence score rises because an established, above-threshold population is a stronger indicator of a true origin than a single incidental sighting.',
          },
          {
            heading: 'Data requirements and limitations',
            body: 'Origin detection assumes that the pest entered your farms within the selected date range. If the date range starts after the outbreak began, the system will identify the earliest sighting <em>within the range</em>, which may not be the true origin. Widening the date range improves accuracy. GPS coordinates on the Farms page are used as a fallback when individual observations do not include GPS tags.',
          },
        ],
      },
      {
        id:    'intel-neighbour',
        icon:  '🏘',
        title: 'Neighbour Risk Alert',
        intro: 'When a threshold breach is recorded on a field, every other field whose farm centroid lies within the configured search radius is automatically flagged as elevated-risk. The tab shows a map of the breach source and its at-risk neighbours, highlights fields that have not been scouted recently, and lists all neighbours in a sortable table.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Breached Fields</strong> — the number of distinct fields that recorded at least one observation above their action threshold in the selected period; shown in red. <strong>At-Risk Neighbours</strong> — the total count of neighbouring fields flagged as elevated-risk across all breaches; shown in amber when greater than 0. <strong>Unscouted Risk</strong> — the subset of at-risk neighbours that have not had a completed scouting session in the last 7 days (or have never been scouted); shown in red as the most urgent group. <strong>Search Radius</strong> — the current radius setting in kilometres.',
          },
          {
            heading: 'Radius selector',
            body: 'The <strong>Radius</strong> dropdown (3 / 5 / 10 / 20 km) changes the search radius used to find neighbour fields. Selecting a new value re-fetches the data immediately — no need to click a refresh button. A smaller radius focuses on immediate neighbours; a larger radius is appropriate for widely spaced farms or fast-spreading pests.',
          },
          {
            heading: 'Pest selector',
            body: 'When breaches involve more than one pest species, the <strong>Pest</strong> dropdown appears and lets you switch the map and alert cards to a different pest. The summary table at the bottom always shows all pests.',
          },
          {
            heading: 'Map — red source marker',
            body: 'The large red filled circle marks the breach source field — the field that exceeded its action threshold. Hovering or clicking the marker shows the field name, farm, peak count, action threshold, and the date of the most recent breach.',
          },
          {
            heading: 'Map — radius ring',
            body: 'A dashed red circle around the source field shows the exact search radius. Any field whose farm centroid falls inside this ring is considered an at-risk neighbour.',
          },
          {
            heading: 'Map — neighbour markers',
            body: '<span style="color:#f59e0b;font-weight:600;">Amber</span> markers are at-risk neighbours that have not been scouted in the past 7 days (or never scouted) — these are the highest priority. <span style="color:#4ade80;font-weight:600;">Green</span> markers are at-risk neighbours that were visited within the last 7 days and are considered monitored. Click any marker to see the field name, farm, distance from the breach source, and days since last scouting session.',
          },
          {
            heading: 'Map — dashed connector lines',
            body: 'Grey dashed lines connect the source field to each of its neighbours. They indicate proximity relationships, not roads or paths. Fields without GPS coordinates are omitted from the map but still appear in the neighbour list and summary table.',
          },
          {
            heading: 'Neighbour list panel',
            body: 'The scrollable panel to the right of the map lists every at-risk neighbour in order of distance from the breach source. Each card shows the field and farm name, the distance in kilometres, the number of days since the last completed session, and a colour-coded status: <span style="color:#f87171;font-weight:600;">red = critical / never scouted</span>, <span style="color:#f59e0b;font-weight:600;">amber = overdue (&gt; 7 days)</span>, <span style="color:#4ade80;font-weight:600;">green = recently visited</span>.',
          },
          {
            heading: 'All At-Risk Neighbours table',
            body: 'The table at the bottom of the page lists every flagged neighbour across all source fields for the selected pest, showing field, farm, which breach source triggered the alert, distance, last session date, and urgency status. Use this table to get a quick written overview when the map is not needed.',
          },
          {
            heading: 'How fields are matched',
            body: 'The system uses the GPS coordinates set on the <strong>Farm</strong> record as the centre point for each field. If a farm has no GPS coordinates set (latitude and longitude both 0), its fields will not appear on the map or in the neighbour list. Set farm GPS coordinates on the Farms page to ensure complete coverage.',
          },
          {
            heading: 'What "unscouted" means',
            body: 'A neighbour field is classified as <em>unscouted</em> if it has no completed scouting session in the last 7 days, or if it has never had a completed session at all. The 7-day window is a fixed threshold — a field scouted 8 days ago is considered overdue even if the breach only occurred yesterday. This errs on the side of caution to ensure neighbours are visited promptly after a breach is detected.',
          },
        ],
      },
      {
        id:    'intel-crossfarm',
        icon:  '🌍',
        title: 'Cross-Farm Outbreak Correlation',
        intro: 'Scans your observation history to identify weeks where the same pest species spiked simultaneously across two or more farms. A simultaneous multi-farm spike is flagged as a regional outbreak event — distinct from an isolated incident on a single farm. The tab shows outbreak summary cards per pest, a multi-line weekly chart, and a table of the specific spike weeks and which farms were affected.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Outbreak Pests</strong> — the number of distinct pest species that spiked on two or more farms in the same week within the selected period. <strong>Regional Outbreaks</strong> — the count of pests that satisfied the minimum-farms threshold, confirming a genuinely regional event rather than a coincidence across two nearby farms. <strong>Peak Farm Count</strong> — the single highest number of farms that simultaneously spiked for any one pest in any one week; the pest responsible is shown in the subtitle. <strong>Min Farms Threshold</strong> — indicates the current sensitivity setting, which can be changed using the selector below.',
          },
          {
            heading: 'Min Farms selector',
            body: 'The <strong>Min Farms</strong> dropdown sets how many farms must spike in the same week for the event to be counted as an outbreak. The default is 2 — any week where 2 or more farms spike qualifies. Raising it to 3 or 4 filters out coincidental two-farm spikes and shows only the most severe regional events. Changing this value re-fetches the data immediately.',
          },
          {
            heading: 'Pest selector',
            body: 'When multiple pests qualify as outbreak pests, the <strong>Pest</strong> dropdown (and the outbreak summary cards) let you switch the chart and spike-week table to a different species. Clicking an outbreak card also switches the active pest.',
          },
          {
            heading: 'Outbreak summary cards',
            body: 'One card per qualifying pest, ordered by severity (highest farm count first). Each card shows the pest name, a <span style="color:#f87171;font-weight:600;">🌍 Regional</span> or <span style="color:#f59e0b;font-weight:600;">🏠 Local</span> badge, the peak outbreak week, the number of outbreak weeks, and the combined observation count across all spiking farms. The active pest\'s card is highlighted with a blue border.',
          },
          {
            heading: 'Regional vs Local badge',
            body: '<span style="color:#f87171;font-weight:600;">🌍 Regional</span> means the peak-week farm count met or exceeded the Min Farms threshold — this is a genuine multi-farm simultaneous event worth treating as a regional alert. <span style="color:#f59e0b;font-weight:600;">🏠 Local</span> means the outbreak is isolated to fewer farms than the threshold and is likely a farm-specific pressure event rather than a regional introduction.',
          },
          {
            heading: 'Weekly Farm Counts chart',
            body: 'A multi-line chart where each line represents one farm. The x-axis is the week (Monday of each week), the y-axis is the total observation count for that pest on that farm in that week. <strong>Red shaded columns</strong> highlight weeks where the spike criterion was met on 2 or more farms simultaneously — these are the regional outbreak weeks. Hover over the chart to see all farm counts for a given week in a single tooltip, with a total and a "⚠ Regional spike week" flag when applicable.',
          },
          {
            heading: 'How a spike is defined',
            body: 'A spike is recorded for a farm in a given week when the total observation count for that week exceeds the <em>higher</em> of two thresholds: (1) the configured action threshold for the pest, or (2) 1.5× the farm\'s own median weekly count for that pest over the full selected period. Using the farm\'s own median prevents a naturally high-pressure farm from always appearing to spike relative to a low-pressure farm on the other side of the region.',
          },
          {
            heading: 'Simultaneous Spike Weeks table',
            body: 'Lists every week in the selected period where the spike criterion was met on two or more farms. Each row shows the week date, the number of farms that spiked (highlighted in red if 3 or more, amber if 2), the combined observation count, and the names of the farms involved. A <span style="color:#f87171;">⚠</span> icon next to a farm name means that farm\'s count was also above its configured action threshold that week — the most severe cases.',
          },
          {
            heading: 'How to use this view',
            body: 'A regional outbreak week is a signal to increase scouting frequency across <em>all</em> farms in your organisation — not just the farms already reporting counts. It may also warrant communication with neighbouring operations outside your tenancy. Use the date-range filter to narrow in on a specific season or to compare year-over-year outbreak patterns for the same pest.',
          },
          {
            heading: 'Data requirements',
            body: 'Cross-farm correlation requires completed scouting sessions with pest observations recorded across at least two farms. If all observations come from a single farm, no outbreaks will be detected regardless of count levels. The analysis uses a 12-month default date range — widening this to 18–24 months will capture seasonal patterns across multiple years.',
          },
        ],
      },
      {
        id:    'intel-velocity',
        icon:  '⚡',
        title: 'Spread Velocity Score',
        intro: 'Measures how fast each pest is actively spreading field-to-field right now, week by week. Instead of asking "where has this pest been?", this tab asks "is it spreading faster or slower this week compared to last week?" — giving you an early warning of accelerating outbreaks and confirmation that containment is working.',
        items: [
          {
            heading: 'What "velocity" means in plain terms',
            body: 'Velocity is simply the change in the number of fields reporting a pest from one week to the next. If aphids were found on 3 fields last week and 5 fields this week, the velocity is +2 — the pest gained two new fields in a week. If it drops from 5 to 3, the velocity is −2 — two fields went quiet, which usually means treatment or seasonal die-off. If the number stays the same, velocity is 0 — the pest is contained at its current level.',
          },
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Tracked</strong> — total pest species with at least one observation in the selected period. <strong>Actively Spreading</strong> — pests whose velocity this week is positive (more fields than last week); shown in red when greater than 0. <strong>Retreating</strong> — pests whose velocity is negative (fewer active fields than last week); shown in green as a good sign. <strong>Contained / Inactive</strong> — pests with zero velocity: either stable at a fixed number of fields, or with no observations at all in the most recent week.',
          },
          {
            heading: 'Status column — Spreading',
            body: '<span style="color:#f87171;font-weight:600;">Spreading</span> means the pest gained at least one new active field this week compared to last week. This is your highest-priority status — the pest is actively colonising new areas. Act quickly: check which fields are newly affected and inspect un-scouted neighbours.',
          },
          {
            heading: 'Status column — Retreating',
            body: '<span style="color:#4ade80;font-weight:600;">Retreating</span> means the pest lost active fields this week — fewer fields are reporting it than last week. This is generally positive: treatment may be working, or the pest population is declining naturally. Continue current management and monitor to confirm the trend continues.',
          },
          {
            heading: 'Status column — Contained',
            body: '<span style="color:#94a3b8;font-weight:600;">Contained</span> means the pest is present but the number of active fields has not changed this week. The pest is not spreading further, but it has not retreated either. Maintain current monitoring frequency to catch any change early.',
          },
          {
            heading: 'Status column — Inactive',
            body: '<span style="color:#475569;font-weight:600;">Inactive</span> means no fields reported this pest in the most recent week at all — the count is zero. Either the pest has been fully controlled, it is out of season, or scouts have not yet completed this week\'s visits. Check the scouting schedule before assuming the pest is gone.',
          },
          {
            heading: 'Trend column — Rising / Stable / Falling',
            body: '<strong>Rising</strong> means the overall direction across the full selected period is upward — more fields are being affected over time, even if this week\'s individual velocity dipped. <strong>Stable</strong> means no consistent directional movement. <strong>Falling</strong> means the overall trend is for fewer active fields over the period. Note: Status is about this week specifically; Trend is about the full period. A pest can be Spreading (this week) but Falling (overall).',
          },
          {
            heading: 'Current Active column',
            body: 'The number of distinct fields that recorded this pest in the most recent ISO week. This is not a cumulative count — it is a snapshot of which fields are <em>currently</em> affected right now.',
          },
          {
            heading: 'Peak Active column',
            body: 'The highest number of fields that simultaneously reported this pest in any single week within the selected period. Comparing Current Active to Peak Active tells you whether the pest is at its worst point or has been worse before — if Current equals Peak, the situation has never been more widespread.',
          },
          {
            heading: 'Current Velocity column',
            body: 'This week\'s change in active field count, shown with a sign: +3 means three new fields, −2 means two fields went quiet, 0 means no change. Positive values are coloured red, negative green, zero grey. This is the most actionable column — sort descending by this to see the fastest-spreading pests at the top.',
          },
          {
            heading: 'Peak Velocity column',
            body: 'The largest single-week field gain ever recorded for this pest in the selected period. A high peak velocity with a current velocity near zero may mean the pest had an explosive start but has since slowed. Useful context for understanding the pest\'s historical behaviour pattern.',
          },
          {
            heading: 'Velocity sparkline',
            body: 'The small bar chart in each row shows the week-by-week velocity over the full period. Bars above the centre line (red) mean the pest was gaining fields that week; bars below (green) mean it was losing fields. A sparkline that trends from left-high to right-low is a good sign of containment; one that is flat means the pest is holding steady; one spiking upward recently is a warning to act.',
          },
          {
            heading: 'What to do when you see a red Spreading status',
            body: '1. Click the row to expand the weekly history. 2. Identify which week the spread accelerated. 3. Cross-reference with the Spread Direction tab to see which compass direction the pest is moving. 4. Check the Neighbour Risk tab to see which un-scouted fields are closest to the current front. 5. Assign emergency inspections to those neighbour fields.',
          },
          {
            heading: 'Data requirements',
            body: 'Velocity requires at least two consecutive weeks of observation data to compute a change. A pest with only one week of data shows velocity 0 and status Contained by default. The selected date range determines the period analysed — a narrow range (e.g. 2 weeks) will show very limited velocity history.',
          },
        ],
      },
    ],
  },
  {
    id: 'predictive',
    icon: '📈',
    title: 'Predictive Intelligence',
    intro: 'The Predictive Intelligence section forecasts where pest populations are heading based on your historical observation data, so scouts and agronomists can act before a threshold breach occurs rather than reacting after.',
    sections: [
      {
        id:    'intel-forecast',
        icon:  '📈',
        title: 'Population Forecast',
        intro: 'Uses a linear regression model fitted to your weekly observation history to project pest counts for the next four weeks per pest per field. Each projection comes with a confidence interval and a breach probability score.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Tracked</strong> — the number of distinct pest species included in the forecast. <strong>Fields Covered</strong> — the number of distinct fields with enough observation history to produce a forecast. <strong>High Risk</strong> — the count of pest × field combinations where the breach probability is 60% or higher; shown in red when greater than 0. <strong>Fastest Rising</strong> — the pest and field combination currently showing the steepest upward trend with the highest breach probability.',
          },
          {
            heading: 'Risk table — Trend column',
            body: '<span style="color:#c75146;font-weight:700;">↑ Rising</span> means the weekly count is trending upward (regression slope > 0.5 per week). <span style="color:#e5a52f;font-weight:700;">→ Stable</span> means counts are broadly flat (slope between −0.5 and +0.5). <span style="color:#2b6e4f;font-weight:700;">↓ Falling</span> means counts are declining (slope below −0.5). Click the Trend column header to sort.',
          },
          {
            heading: 'Risk table — Historical peak',
            body: 'The highest single-week total observation count recorded for this pest on this field within the selected date range. This is the worst week seen so far, not an average.',
          },
          {
            heading: 'Risk table — Projected (4 wk)',
            body: 'The highest projected count in any of the next four weekly forecast points. If the projected value exceeds the historical peak it is shown in red — the model is predicting a new record high.',
          },
          {
            heading: 'Risk table — Breach risk bar',
            body: 'The percentage of the next four forecast weeks where the upper end of the confidence interval crosses the configured action threshold for this pest. <span style="color:#2b6e4f;font-weight:600;">Green</span> = below 30%, <span style="color:#e5a52f;font-weight:600;">Amber</span> = 30–59%, <span style="color:#c75146;font-weight:600;">Red</span> = 60% or higher. A red bar means a threshold breach is likely in the near term and the field should be prioritised for an inspection.',
          },
          {
            heading: 'Risk table — sorting and filtering',
            body: 'Click any column header to sort the table by that column; click again to reverse the direction. The default sort is highest breach risk first. Use the <strong>Pest</strong> dropdown to narrow the table to a single species, and the <strong>Show</strong> dropdown to show only Rising, Stable, or Falling trends.',
          },
          {
            heading: 'Detail chart — blue bars',
            body: 'The blue bars show the actual observed total pest count for each historical week. Each bar represents all observations of this pest on this field summed across any scouting sessions that were completed in that calendar week.',
          },
          {
            heading: 'Detail chart — grey trend line',
            body: 'The grey line is the ordinary least-squares (OLS) regression fit through the historical data. It shows the underlying linear trend, smoothing out week-to-week noise. Where the line is rising, the average direction of counts is upward even if individual weeks dip.',
          },
          {
            heading: 'Detail chart — dashed amber line',
            body: 'The dashed amber line is the forecast — the regression line extended into the future for the next four weeks. The amber dots mark each weekly projection point. Hover over a point to see the exact projected count for that week.',
          },
          {
            heading: 'Detail chart — shaded confidence band',
            body: 'The light amber band around the forecast line is the 90% confidence interval. It shows the plausible range of outcomes — the pest count is expected to fall inside this band nine times out of ten. A narrow band means the model is confident; a wide band means the history is noisy and the forecast is less certain.',
          },
          {
            heading: 'Detail chart — red dashed threshold line',
            body: 'The horizontal red dashed line marks the configured action threshold for this pest. When the confidence band crosses above this line, a threshold breach is considered likely. If no threshold is set for this pest, the line does not appear.',
          },
          {
            heading: 'Detail chart — vertical divider',
            body: 'The faint dashed vertical line separates the historical period (left) from the forecast period (right). Data to the left of this line comes from real scouting records; data to the right is model-generated.',
          },
          {
            heading: 'How the forecast is calculated',
            body: 'The system groups all observations for a pest × field combination into weekly totals (one value per Monday-to-Sunday window), then fits a straight-line trend through those values using ordinary least-squares regression. The line is extrapolated forward by the chosen number of weeks. The confidence interval width is derived from the residual standard error of the fit — how much the historical data scattered around the regression line. At least one week of observations is required; more weeks produce a more reliable forecast.',
          },
          {
            heading: 'Limitations',
            body: 'The forecast is a linear model — it assumes the trend continues in a straight line. It does not account for seasonal cycles, treatment events, weather changes, or data gaps. Use it as a leading indicator, not a guarantee. Always confirm rising forecasts with a physical field inspection before making treatment decisions.',
          },
        ],
      },
      {
        id:    'intel-breach',
        icon:  '🚦',
        title: 'Threshold Breach Probability',
        intro: 'Calculates the statistical probability that the very next scouting session on each field will record a pest count above the configured action threshold. Unlike the Population Forecast which shows trends over weeks, this tab focuses on one question: is this field likely to breach its threshold at the next visit?',
        items: [
          {
            heading: 'What is an action threshold?',
            body: 'An action threshold is the pest count above which the economic cost of crop damage exceeds the cost of treatment. For example, if the threshold for aphids on a field is 50, any single observation recording 51 or more aphids means control action is warranted. Thresholds are configured per pest in the Pest Catalogue.',
          },
          {
            heading: 'KPI Cards',
            body: '<strong>Combinations Assessed</strong> — the total number of pest × field pairs analysed. <strong>High Risk</strong> — pairs where breach probability is 60% or higher; shown in red. <strong>Medium Risk</strong> — pairs at 30–59%; shown in amber. <strong>Low Risk</strong> — pairs below 30%; shown in green.',
          },
          {
            heading: 'How breach probability is calculated',
            body: 'The system fits a linear trend through the weekly observation history for each pest × field pair (the same regression used in Population Forecast). It then projects the count for the next week and computes the probability that the true count will exceed the threshold, taking into account how much the historical data scattered around the trend line. A steep rising trend combined with counts already close to the threshold produces a high probability; a flat or falling trend far below the threshold produces a low probability.',
          },
          {
            heading: 'Breach Probability column',
            body: 'Shown as a percentage. <span style="color:#c75146;font-weight:600;">60%+</span> = High risk — treat this field as a priority for the next scouting run. <span style="color:#e5a52f;font-weight:600;">30–59%</span> = Medium risk — schedule a visit and monitor closely. <span style="color:#2b6e4f;font-weight:600;">Below 30%</span> = Low risk — maintain normal frequency. The column is sorted highest-first by default.',
          },
          {
            heading: 'Risk column',
            body: 'A quick colour-coded label: <span style="color:#c75146;font-weight:700;">High</span> / <span style="color:#e5a52f;font-weight:700;">Medium</span> / <span style="color:#2b6e4f;font-weight:700;">Low</span>. Click the Risk column header to group rows by risk level.',
          },
          {
            heading: 'Current Level column',
            body: 'The total pest count recorded in the most recent scouting week for this pest on this field. This is the last known real measurement — everything to the right of this is model-derived.',
          },
          {
            heading: 'Projected Next column',
            body: 'The model\'s best estimate of next week\'s count, based on the current trend. If this already exceeds the threshold, the pest has likely already breached — check when the last session was completed and whether a visit is overdue.',
          },
          {
            heading: 'Trend column',
            body: '<span style="color:#c75146;font-weight:700;">↑ Rising</span>, <span style="color:#94a3b8;font-weight:700;">→ Stable</span>, or <span style="color:#4ade80;font-weight:700;">↓ Falling</span> — the direction of the underlying trend line. A falling trend can still produce a high breach probability if the current level is already very close to the threshold.',
          },
          {
            heading: 'Days-to-Breach Estimate column',
            body: 'When the trend is rising and the current projected count is still below the threshold, this shows how many days it would take (at the current rate of growth) for the projected count to reach the threshold. A value of <strong>−1</strong> means the trend is falling — no breach is expected at the current trajectory. A value of <strong>0</strong> means the count is already at or above the threshold. Use this to schedule field visits before the breach date.',
          },
          {
            heading: 'Weekly History sparkline',
            body: 'Each row has a small bar chart showing the week-by-week history. A flat or declining sparkline with a high breach probability means the current level is persistently close to the threshold even without growing — no upward push is needed for the threshold to be crossed.',
          },
          {
            heading: 'What to do when a field is High Risk',
            body: '1. Look at the Days-to-Breach estimate — if it is less than 7, an urgent visit should be scheduled immediately. 2. Check the Population Forecast tab for this field to see the 4-week trajectory and confidence interval. 3. If the Trend is Rising, consider whether any recent scouting observations were taken during unusually favourable conditions for the pest (check the Weather Risk tab). 4. Consult your agronomist before initiating a treatment based solely on the model — always verify with a physical inspection.',
          },
          {
            heading: 'What if there is no threshold configured?',
            body: 'If a pest has no action threshold set in the Pest Catalogue, the system uses the rate of population change relative to the average count as a proxy risk score. The result is less precise. Set a threshold in the Pest Catalogue to get accurate probabilities for all pests.',
          },
        ],
      },
      {
        id:    'intel-scouting',
        icon:  '📅',
        title: 'Optimal Next Scouting Date',
        intro: 'Replaces the fixed weekly visit schedule with a data-driven recommendation for each field — telling you exactly how many days you can safely wait before the next inspection, based on how fast or slowly pest populations are growing on that field right now.',
        items: [
          {
            heading: 'Why a fixed weekly schedule is not always right',
            body: 'A field with a fast-doubling pest population needs a visit every 3–4 days. A field where every pest is in decline can safely wait 10 days. Visiting every field every 7 days wastes scout time on stable fields and under-resources fields that are deteriorating. This tab tells you where to send your scouts first.',
          },
          {
            heading: 'KPI Cards',
            body: '<strong>Urgent</strong> — fields where the recommended next visit is 3 days away or less (or already overdue); shown in red. <strong>Soon</strong> — fields with a recommended visit in 4–7 days; shown in amber. <strong>On Schedule</strong> — fields comfortable beyond 7 days; shown in green.',
          },
          {
            heading: 'How the recommended interval is calculated',
            body: 'The system takes the first and last weekly observation totals for each field (combining all pest species). The growth rate is the proportional change from first to last: (last week total − first week total) ÷ first week total. A field that went from 10 observations per week to 20 has a growth rate of +100% (doubled). A field that went from 20 to 10 has a growth rate of −50% (halved). The recommended interval is then: 3 days for ≥100% growth, 4 days for ≥50%, 5 days for ≥20%, 7 days (standard) for stable, 10 days for ≥20% decline.',
          },
          {
            heading: 'Urgency column',
            body: '<span style="color:#c75146;font-weight:700;">Critical</span> — population has doubled or more; visit within 3 days. <span style="color:#e5a52f;font-weight:700;">High</span> — rapid growth (50–99% increase); visit within 4 days. <span style="color:#f59e0b;font-weight:700;">Medium</span> — moderate growth (20–49%); 5-day interval. <span style="color:#4ade80;font-weight:700;">Low</span> — stable or declining; standard 7 or 10-day interval.',
          },
          {
            heading: 'Growth Rate column',
            body: 'Shown as a percentage, e.g. +47% or −23%. Positive values (red) mean pest populations are growing on this field. Negative values (green) mean they are declining. A value of +0% means either the population is flat, or there was only one week of data available (no comparison possible).',
          },
          {
            heading: 'Last Session column',
            body: 'The date of the most recent completed scouting session on this field. This is the starting point for the next-visit calculation.',
          },
          {
            heading: 'Days Since Last Session',
            body: 'How many calendar days have passed since the last visit. Fields where this number already exceeds the recommended interval are overdue.',
          },
          {
            heading: 'Next Recommended Date column',
            body: 'The calendar date by which the next visit should occur, calculated as Last Session + Recommended Interval. Dates in the past are shown in red and flagged as overdue.',
          },
          {
            heading: 'Days Until Next column',
            body: 'Days remaining until the next recommended visit. Negative numbers mean the field is overdue. Sort ascending by this column to see the most urgent fields at the top.',
          },
          {
            heading: 'Is Overdue flag',
            body: 'A red ✗ mark means the recommended date has already passed and the field has not been visited. These fields should be assigned a session immediately, regardless of their urgency level, because the growth rate data is now stale.',
          },
          {
            heading: 'Rationale column',
            body: 'A plain-English explanation of why this interval was recommended — e.g. "Population has doubled or more — visit within 3 days." Use this when explaining prioritisation decisions to scouts or farm managers who are not familiar with the scoring system.',
          },
          {
            heading: 'Fields not appearing in the list',
            body: 'A field only appears if it has at least one completed scouting session within the selected date range. Fields that have never been scouted, or whose last session predates the filter window, do not appear here. To get recommendations for all fields, widen the date range or schedule a baseline visit first.',
          },
          {
            heading: 'Using this tab for daily planning',
            body: 'Each morning, open this tab sorted by Days Until Next (ascending). Assign the scout team to the fields at the top of the list — especially any marked Overdue or Critical. Fields at the bottom of the list can wait. After sessions are completed the list will update automatically the next time it is loaded.',
          },
        ],
      },
      {
        id:    'intel-seasonal',
        icon:  '🌤',
        title: 'Seasonal Pressure Forecast',
        intro: 'Uses 18 months of historical observation data to build a monthly pressure profile for each pest species, then forecasts which pests are most likely to cause problems in each of the next six calendar months. Use this to plan scouting resources, pesticide procurement, and monitoring equipment before the season begins.',
        items: [
          {
            heading: 'Why seasonal forecasting matters',
            body: 'Most pest species follow predictable seasonal cycles — aphid populations peak in early summer, certain moths emerge in autumn, soil insects are active in spring. By knowing which pest is likely to be worst in which month, you can pre-position traps, schedule additional scouting visits, and order treatment products before demand peaks, rather than scrambling to respond mid-season.',
          },
          {
            heading: 'How the forecast is built',
            body: 'The system adds up all observation counts per pest per calendar month across the last 18 months of data. For months that appear in both years (e.g. March 2024 and March 2025), both years\' counts are combined. The expected count for each upcoming month is calculated as approximately half of this combined total — a rough per-year average. The month with the highest historical total is marked as the Peak Month for that pest.',
          },
          {
            heading: '6-Month Seasonal Calendar',
            body: 'The top section shows the next six calendar months in a grid. Each month shows the top 3 pest species expected to be most active, along with their historical observation count for that month. Pests are ranked by historical pressure so the most important species appear first. A <span style="background:rgba(199,81,70,0.12);color:#c75146;font-weight:600;padding:2px 8px;border-radius:4px;font-size:0.8rem;">PEAK</span> badge marks the species whose worst-ever historical month coincides with this upcoming month — these deserve extra attention.',
          },
          {
            heading: 'A month showing "No historical data"',
            body: 'When a calendar month has never had any observations recorded (e.g. the farm only started scouting 6 months ago, or a pest was only introduced recently), no pests will appear for that month. This does not mean no pests will be present — it means there is no history to base a prediction on. Treat these months as unknown and scout at a standard frequency.',
          },
          {
            heading: 'Peak Pests panel',
            body: 'The lower section lists the top 10 pest species ranked by their all-time single-month peak. Each entry shows the pest name, its peak calendar month (e.g. "October"), the peak total count, and a small monthly profile bar chart showing pressure across all 12 months of the year. Use this to understand each pest\'s seasonal shape — some are sharply seasonal (one big spike), others are broadly present year-round.',
          },
          {
            heading: 'Monthly Profile bar chart',
            body: 'Each pest in the Peak Pests panel has a 12-bar chart, one bar per calendar month (Jan–Dec). The tallest bar is the peak month. A pest with a single tall bar is highly seasonal; a pest with bars of similar height across all months is a year-round pressure. Seasonal pests are easier to pre-empt with targeted monitoring windows; year-round pests require consistent ongoing attention.',
          },
          {
            heading: 'Limitations and how to improve accuracy',
            body: 'Predictions are only as good as the data behind them. A farm that has been running for only 6 months will have incomplete seasonal profiles. The more historical scouting data you have — especially covering multiple years — the more reliable the seasonal forecasts become. Unusual weather years can distort the averages. Always cross-check seasonal forecasts with local agricultural extension advice and your own field experience.',
          },
          {
            heading: 'Practical uses for this tab',
            body: 'At the start of each season: (1) Open this tab to see which pests peak in the coming 3 months. (2) Ensure traps for those species are deployed and functioning. (3) Increase scouting frequency on fields historically associated with peak pests. (4) Order treatment products or biocontrol agents before peak demand. (5) Brief scouts on which species to look for, including identification features.',
          },
        ],
      },
      {
        id:    'intel-weather',
        icon:  '🌡',
        title: 'Weather-Correlated Risk Index',
        intro: 'Uses the temperature recorded during scouting sessions to measure how strongly each pest\'s observed counts correlate with ambient temperature — and then uses the most recently recorded temperatures to estimate current pest pressure. No external weather service is required; all data comes from temperatures your scouts already log during sessions.',
        items: [
          {
            heading: 'Why temperature matters for pest management',
            body: 'Pest development rate, reproduction speed, and population size are all strongly influenced by temperature. Many insects grow faster in warm conditions and their populations can double rapidly during a heat wave. Other pests (such as some aphid species) actually prefer cooler temperatures and spike during cool wet periods. Understanding which pests on your farm are temperature-sensitive allows you to raise the alert level automatically when conditions favour an outbreak.',
          },
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Assessed</strong> — the number of pest species with enough temperature data to compute a correlation (minimum 3 observations with temperature recorded). <strong>High Risk at Current Temp</strong> — pests whose projected count at today\'s temperature is 80% or more of their action threshold; shown in red. <strong>Total Data Points</strong> — the total number of temperature-linked observations used in the analysis. <strong>Current Temp Average</strong> — the average temperature recorded across the 10 most recent scouting sessions, used as the proxy for current conditions.',
          },
          {
            heading: 'Temperature Influence column',
            body: '<span style="color:#c75146;font-weight:600;">Positive</span> means warmer temperatures are associated with higher pest counts — this is a warm-season pest. Expect pressure to rise during summer heat waves. <span style="color:#3b7db8;font-weight:600;">Negative</span> means cooler temperatures are associated with higher counts — this is a cool-season pest. Monitor more closely during cold or wet periods. <span style="color:#94a3b8;font-weight:600;">None</span> means no clear linear relationship was found between temperature and count — the pest is driven by other factors (host plant stage, rainfall, natural enemies). A "None" result does not mean the pest is harmless; it just means temperature is not a reliable predictor for it.',
          },
          {
            heading: 'Correlation (r) column',
            body: 'A number between −1.0 and +1.0. Values close to +1.0 mean strong positive correlation (much warmer = many more pests). Values close to −1.0 mean strong negative correlation (colder = many more pests). Values close to 0 mean temperature has little effect. Values between −0.2 and +0.2 are classified as "None". As a rule of thumb: r > 0.5 or r < −0.5 indicates a practically meaningful relationship.',
          },
          {
            heading: 'Slope per °C column',
            body: 'How many additional pests the model expects per 1°C increase in temperature. For example, a slope of +4.2 means every extra degree Celsius is associated with 4 more pests per observation. A slope of −3.1 means every extra degree Celsius is associated with 3 fewer pests (a cool-season species). Only relevant when the Temperature Influence is Positive or Negative.',
          },
          {
            heading: 'Optimal Temperature Range column',
            body: 'The temperature range (in °C) at which this pest\'s counts were historically highest, derived from the 5 highest-count observations. Use this to understand under what conditions the pest thrives most, and to anticipate spikes when forecasts predict those temperatures.',
          },
          {
            heading: 'Current Temp Average column',
            body: 'The average temperature from the 10 most recent scouting sessions across your farm. This is used as the "current conditions" input to the model. If your scouts have not logged temperatures recently, this figure will be stale and the risk projections will be less accurate.',
          },
          {
            heading: 'Projected Count column',
            body: 'The model\'s estimate of how many pests would be observed at today\'s average temperature, based on the historical temperature-count relationship. This is what you might expect to find on your next scouting visit if conditions remain similar.',
          },
          {
            heading: 'Risk Index column',
            body: 'The projected count divided by the action threshold, capped at 2.0. A risk index of 1.0 means the model is projecting exactly the threshold. Values above 1.0 mean the projected count exceeds the threshold — treat this field and pest combination as high priority. Values below 0.4 are Low risk; 0.4–0.8 are Medium; 0.8 and above are High.',
          },
          {
            heading: 'Temperature Profile section',
            body: 'Each pest has a temperature profile table showing 5°C temperature bands and the average observed count in each band. For example, "25–30°C: avg count 42, 87 observations" means that when sessions were conducted between 25 and 30°C, an average of 42 pests were recorded, and 87 such sessions occurred. This gives you a concrete reference table: if tomorrow will be 28°C, what count should you expect?',
          },
          {
            heading: 'When Temperature Influence shows None for every pest',
            body: 'This can happen when: (1) Temperature data has not been logged consistently — if scouts don\'t enter the temperature, there is nothing to correlate. (2) The temperature range in your data is too narrow — if all sessions occurred in a similar temperature band, no relationship can be detected. (3) Pest counts on your farm are genuinely driven by other factors. Check that scouts are recording temperature in the session details, and consider widening the date range to capture more seasonal temperature variation.',
          },
          {
            heading: 'How to record temperature',
            body: 'Temperature is logged per scouting session, not per observation. When completing a session in the web app or the mobile app, there is a Temperature field (in °C) in the session details. Scouts should record the ambient air temperature at the time of the visit. Consistent temperature recording is what makes this tab useful.',
          },
        ],
      },
      {
        id:    'intel-saturation',
        icon:  '🕸',
        title: 'Trap Saturation Prediction',
        intro: 'Predicts when each monitoring trap will reach saturation — the point at which so many insects are being caught that the trap\'s physical capacity is being exceeded and counts start underreporting the true population. A saturated trap gives you false "low" readings and creates a dangerous blind spot in your monitoring. This tab helps you service traps before that happens.',
        items: [
          {
            heading: 'What is trap saturation?',
            body: 'A pheromone or sticky trap has a finite capacity. When the number of insects caught in a week approaches or exceeds that capacity, the trap can no longer catch additional insects efficiently — it is "full". A scout checking the trap then counts a lower number than actually arrived, underestimating the true infestation level. Saturation is most common during peak flight periods for highly mobile insects like moths and aphids.',
          },
          {
            heading: 'How the saturation threshold is set',
            body: 'Rather than using a fixed number (which would vary by trap model and pest species), the system uses a dynamic threshold: 20% above the highest weekly catch ever recorded for that trap, with a minimum floor of 500 catches per week. This means the alert is relative to each trap\'s own history — a trap that has only ever caught 20 insects per week won\'t trigger a saturation warning at 25, but one that regularly catches 400 will be watched closely as it approaches 480.',
          },
          {
            heading: 'KPI Cards',
            body: '<strong>Total Traps</strong> — the number of active, non-deleted traps being monitored. <strong>Critical</strong> — traps projected to reach saturation within 4 weeks; shown in red. <strong>High</strong> — traps projected within 5–12 weeks; shown in amber. <strong>Avg Catch Rate</strong> — the average projected weekly catch across all traps right now.',
          },
          {
            heading: 'Saturation Risk column',
            body: '<span style="color:#c75146;font-weight:700;">Critical</span> — projected to saturate within 4 weeks. Service immediately or it will start underreporting. <span style="color:#e5a52f;font-weight:700;">High</span> — projected to saturate in 5–12 weeks. Plan a maintenance visit this season. <span style="color:#f59e0b;font-weight:700;">Medium</span> — 13–26 weeks away. Monitor and schedule maintenance in the next planning cycle. <span style="color:#4ade80;font-weight:700;">Low</span> — more than 26 weeks away, or the catch rate is stable or falling. <span style="color:#94a3b8;font-weight:700;">Unknown</span> — no catch data in the selected period; verify the trap is being checked.',
          },
          {
            heading: 'Current Rate column',
            body: 'The model\'s fitted catch rate for the most recent week, based on a trend line through all weekly data. This may differ slightly from the raw count recorded in the last session because it smooths out week-to-week variation.',
          },
          {
            heading: 'Peak Rate column',
            body: 'The highest actual weekly catch ever recorded for this trap in the selected period. This is the raw data high point, not the model projection.',
          },
          {
            heading: 'Weeks to Peak column',
            body: 'How many weeks it will take for the current catch rate trajectory to reach the saturation threshold, at the current rate of growth. This is only computed when the catch rate is meaningfully increasing — traps with a flat or falling catch rate show a blank here because they are not trending toward saturation.',
          },
          {
            heading: 'Trend column',
            body: '<span style="color:#c75146;font-weight:700;">Rising</span> — catch rate is increasing week on week. This is the dangerous direction — a rising trap is heading toward saturation. <span style="color:#94a3b8;font-weight:700;">Stable</span> — no clear trend. <span style="color:#4ade80;font-weight:700;">Falling</span> — catch rate is declining; either the pest population is dropping or the trap has already begun underreporting due to saturation.',
          },
          {
            heading: 'Saturation Threshold column',
            body: 'The computed saturation ceiling for this trap — 120% of its highest recorded weekly catch, or 500, whichever is higher. When the catch rate crosses this value, the trap should be considered at capacity.',
          },
          {
            heading: 'Weekly History sparkline',
            body: 'The bar chart shows week-by-week catch totals. A steeply rising sparkline heading toward the right edge is the critical warning sign. A sparkline that suddenly drops from a high plateau may indicate the trap has already saturated and is now underreporting.',
          },
          {
            heading: 'What to do when a trap is Critical',
            body: '1. Visit the trap immediately to empty, clean, or replace the sticky insert. 2. After servicing, record a new catch count — this resets the baseline. 3. If the catch count immediately before servicing was unusually low despite a rising trend, assume some underreporting occurred and treat that field with extra caution. 4. If catches remain very high after servicing, consider deploying an additional trap at a second position in the field to spread the load.',
          },
          {
            heading: 'Trap showing Unknown / no data',
            body: 'An Unknown risk means the trap had no catch observations recorded in the selected period. This could mean: (1) scouts did not link their observations to this trap — check the observation entry in Session Detail and ensure the Trap field is selected. (2) The trap has not been visited. (3) The trap is catching nothing — which itself may be worth investigating if catches were high previously.',
          },
          {
            heading: 'Data requirements',
            body: 'At least 2 weeks of catch data are needed to compute a trend and project saturation. Traps with only a single week of data show current rate but no Weeks to Peak or meaningful risk classification.',
          },
        ],
      },
    ],
  },
  {
    id: 'actionable',
    icon: '🎯',
    title: 'Actionable Recommendations',
    intro: 'The Actionable Recommendations section turns intelligence data into concrete next steps — telling you when to spray, which fields to visit first, whether past treatments worked, which breaches are overdue for a follow-up, and where you have coverage blind spots.',
    sections: [
      {
        id:    'act-spray',
        icon:  '💉',
        title: 'Spray Timing Recommendation',
        intro: 'For each rising pest population with a configured action threshold, projects how many weeks until the population is expected to breach that threshold and recommends the optimal treatment window.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Total</strong> — the number of pest × field combinations with a rising trend and a threshold configured. <strong>Urgent</strong> — combinations where treatment is needed immediately or within 2 weeks (Immediate or Urgent urgency). <strong>Upcoming</strong> — combinations where treatment should be scheduled within 6 weeks. <strong>Monitor</strong> — combinations rising but not close to breach.',
          },
          {
            heading: 'Urgency levels',
            body: '<span style="color:#c75146;font-weight:700;">Immediate</span> — the population is already at or above threshold. Apply treatment now. <span style="color:#e5a52f;font-weight:700;">Urgent</span> — breach projected within 2 weeks. Act within the number of days shown. <span style="color:#f59e0b;font-weight:700;">Upcoming</span> — breach projected in 3–6 weeks. Schedule treatment to stay ahead. <span style="color:#4ade80;font-weight:700;">Monitor</span> — population is rising but a breach is not imminent. Continue regular monitoring.',
          },
          {
            heading: 'Progress bar — Current vs Threshold',
            body: 'The green/amber/red bar shows the current projected count as a percentage of the configured action threshold. When the bar is full and red, the population is at or above the threshold.',
          },
          {
            heading: 'Projected at 4 and 8 weeks',
            body: 'The model extends the current regression line forward to show where the count is expected to be in 4 and 8 weeks. The 8-week multiplier (e.g. 3.2×) shows how many times the threshold will be exceeded if no action is taken.',
          },
          {
            heading: 'How the model works',
            body: 'The system fits an OLS linear regression through weekly observation totals for each pest × field pair. It then solves for the week number at which the regression line crosses the threshold value. Only rising combinations (positive slope) or those already near threshold (≥70% of threshold) are surfaced.',
          },
          {
            heading: 'Combinations not appearing',
            body: 'A pest × field pair only appears if: (1) the pest has an action threshold configured, (2) there are at least 2 weeks of observation history, and (3) the trend is rising or the current level is already near threshold. Falling populations are excluded — they do not need spray intervention.',
          },
        ],
      },
      {
        id:    'act-priority',
        icon:  '📋',
        title: 'Scout Priority Queue',
        intro: 'Ranks every field by a composite risk score computed from three components: how fast pest populations are growing, how long it has been since the last visit, and how many threshold breaches have been recorded recently.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Total Fields</strong> — the number of fields assessed. <strong>Critical</strong> — fields scoring 70 or above; shown in red. <strong>High</strong> — fields scoring 45–69; shown in amber. <strong>Medium / Low</strong> — lower-priority fields.',
          },
          {
            heading: 'Priority Score breakdown',
            body: 'The score has three components, each capped at a maximum: <strong>Trend Score (0–40 pts)</strong> — based on the OLS growth rate across all pest observations on the field. A doubling population scores near 40. <strong>Recency Score (0–35 pts)</strong> — based on days since the last completed session, capped at 30 days (35 pts). A field never visited scores the full 35. <strong>Breach Score (0–25 pts)</strong> — 5 points per threshold breach recorded in the period, capped at 25.',
          },
          {
            heading: 'Rank badge',
            body: 'The large number in the top-left of each field card is the priority rank — 1 is the highest-priority field for the day. Send scouts to rank 1 first.',
          },
          {
            heading: 'Days Since Last Session',
            body: 'A value of −1 means the field has never had a completed session in the selected period. These fields score 35 recency points automatically and should be treated as unknown-risk.',
          },
          {
            heading: 'Fields missing from the list',
            body: 'A field only appears in the priority queue if it has at least one completed scouting session or at least one observation in the selected date range. Fields with no activity at all are not ranked — they should be visited as a baseline.',
          },
        ],
      },
      {
        id:    'act-effectiveness',
        icon:  '📊',
        title: 'Treatment Effectiveness',
        intro: 'Scores past treatment responses by comparing average pest counts in the two sessions before a threshold breach against the two sessions after. This tells you whether your control actions are actually working.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Effective</strong> — pest counts fell by 50% or more after the breach response. <strong>Partially Effective</strong> — counts fell by 20–49%. <strong>Ineffective</strong> — counts fell by less than 20% or continued to rise. <strong>Insufficient Data</strong> — no follow-up sessions were recorded after the breach.',
          },
          {
            heading: 'How effectiveness is scored',
            body: 'The system identifies the first threshold breach for each pest × field pair within the selected period. It then takes up to 2 sessions before that breach and up to 2 sessions after. The percentage change in average count from pre-breach to post-breach determines the score: ≤−50% = Effective, −20% to −50% = Partially Effective, above −20% = Ineffective.',
          },
          {
            heading: 'Before / After comparison bars',
            body: 'Each card shows two horizontal bars: the pre-breach average (amber) and the post-breach average (green if reduced, red if increased). The threshold is marked as a vertical line on the bar chart.',
          },
          {
            heading: 'Insufficient Data result',
            body: 'This means no scouting sessions were completed on the field after the threshold breach. It is not possible to know whether the treatment worked. Schedule a follow-up session to close the data gap.',
          },
          {
            heading: 'Data Quality note',
            body: 'The data quality note on each card indicates whether the score is based on the full 2 sessions before and after (Good) or fewer (Limited). A limited score is still shown but should be interpreted with caution.',
          },
          {
            heading: 'What to do with Ineffective results',
            body: 'An Ineffective score means the pest population did not meaningfully decline after a threshold breach response. Consider: (1) whether the treatment was applied within the recommended window, (2) whether resistance to the current product is developing (see the intelligence.md Resistance Pattern Detection section), (3) whether the dosage or coverage was adequate, and (4) whether re-infestation from a neighbouring field is occurring.',
          },
        ],
      },
      {
        id:    'act-overdue',
        icon:  '⏰',
        title: 'Overdue Action Alerts',
        intro: 'Identifies threshold breaches that did not receive a follow-up scouting session within the required response window. Severe breaches (count ≥ 2× threshold) have a 48-hour window; all others have a 7-day window.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Total Overdue</strong> — the number of breach events with no follow-up within the required window. <strong>Critical</strong> — severe breaches (count ≥ 2× threshold) that are overdue. <strong>High</strong> — standard breaches overdue by more than 72 hours. <strong>Medium</strong> — standard breaches overdue by less than 72 hours.',
          },
          {
            heading: 'Response window rules',
            body: 'If the peak count recorded during the breach was at least twice the configured threshold (a severe breach), the required follow-up window is <strong>48 hours</strong>. For all other breaches the window is <strong>7 days (168 hours)</strong>. If no follow-up session is completed on that field within the window, the breach becomes overdue.',
          },
          {
            heading: 'Days / Hours Overdue',
            body: 'Both are shown — hours for precision on recent breaches, days for readability on older ones. The clock starts from the deadline (breach date + response window), not the breach date itself.',
          },
          {
            heading: 'Scout Name',
            body: 'The scout who completed the breach session is shown where available. Use this to follow up directly with the scout if a response is overdue.',
          },
          {
            heading: 'What counts as a follow-up',
            body: 'Any completed scouting session on the same field after the breach date counts as a follow-up, regardless of which scout completed it or what was observed. The system does not require the follow-up to contain observations of the same pest.',
          },
          {
            heading: 'No alerts showing',
            body: 'No overdue alerts means all threshold breaches in the selected period received a follow-up session within the required window. This is the expected state for a well-managed operation.',
          },
        ],
      },
      {
        id:    'act-underscouted',
        icon:  '🔍',
        title: 'Blind Spots',
        intro: 'Cross-references fields with low scouting coverage against fields showing high pest pressure to identify intelligence blind spots — situations where you do not know what is happening in a field during a potentially dangerous period.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Under-scouted</strong> — total fields with fewer than 50% of the target 4 sessions this month. <strong>Critical Blind Spots</strong> — under-scouted fields that also have high pest pressure and recorded threshold breaches. <strong>High Risk</strong> — under-scouted fields with high pest pressure but no breaches yet. <strong>Low Risk</strong> — under-scouted fields with low pest activity.',
          },
          {
            heading: 'Coverage target',
            body: 'The system targets 4 scouting sessions per field per calendar month. A field with fewer than 2 sessions this month (50% of target) is flagged as under-scouted. Coverage is calculated on the current calendar month only, not a rolling 30-day window.',
          },
          {
            heading: 'High pest pressure definition',
            body: 'A field is considered high pressure if its total observation count in the selected period exceeds the median across all fields and is greater than zero. This is a relative measure — a field with fewer observations than average is not flagged even if it has some pest activity.',
          },
          {
            heading: 'Critical Blind Spot',
            body: 'A field is a Critical Blind Spot if it is under-scouted AND has both high pest pressure AND at least one threshold breach in the selected period. These fields are the highest priority — you are flying blind in a field where you already know pests are a serious problem.',
          },
          {
            heading: 'Coverage bar',
            body: 'The horizontal bar shows sessions this month as a percentage of the 4-session target. Green = 50% or above target. Amber = 25–49%. Red = below 25% (including zero).',
          },
          {
            heading: 'What to do',
            body: 'For Critical Blind Spots: schedule an immediate inspection and assign it to an available scout. For High Risk: add at least one additional session this month to close the coverage gap. For Low Risk: add a note to the next planning cycle to bring the field up to target coverage next month.',
          },
        ],
      },
    ],
  },
  {
    id:    'environmental',
    icon:  '🌡',
    title: 'Environmental Intelligence',
    intro: 'The Environmental Correlation Intelligence section identifies how ambient conditions — temperature, rainfall events, and drought periods — drive pest population pressure on your farms. All analysis is derived from temperatures your scouts already log during scouting sessions; no external weather service is required.',
    sections: [
      {
        id:    'env-temp',
        icon:  '🌡',
        title: 'Temperature × Pest Activity Index',
        intro: 'For every pest species with sufficient scouting data, this tab computes a Pearson correlation coefficient between ambient temperature and observed pest count, fits a linear slope (extra pests per °C), and shows the historical count broken into 5°C temperature bands. Use it to anticipate which pests will surge when a heat wave arrives — or which cool-season pests to watch during colder weeks.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Analysed</strong> — pest species with at least 3 temperature-linked observations in the selected period. <strong>Warm-Favoring</strong> — pests whose Pearson r is ≥ +0.2 (higher counts in warmer sessions). <strong>Cold-Favoring</strong> — pests whose Pearson r is ≤ −0.2 (higher counts in cooler sessions). <strong>Avg Temp (period)</strong> — the mean temperature across all temperature-recorded sessions in the date range, shown with total data-point count.',
          },
          {
            heading: 'Warm-Favoring vs Cold-Favoring badge',
            body: '<span style="color:#c0392b;font-weight:600;">Warm-Favoring</span> means warmer temperatures are associated with higher pest counts — a summer peak species. Expect pressure to rise during heat waves and fall during cold spells. <span style="color:#2980b9;font-weight:600;">Cold-Favoring</span> means cooler conditions drive higher counts — common in aphids and some mite species. Monitor these closely during cool, wet periods. <span style="color:#7f8c8d;font-weight:600;">None</span> means no clear linear relationship was detected; temperature alone is not a reliable predictor for this pest.',
          },
          {
            heading: 'Pearson r column',
            body: 'A value between −1.0 and +1.0. Values above +0.5 indicate a strong positive relationship (much warmer = many more pests). Values below −0.5 indicate a strong negative relationship. Values between −0.2 and +0.2 are classified as None. As a practical rule: r > 0.5 or r < −0.5 represents a relationship worth acting on in your scouting schedule.',
          },
          {
            heading: 'Slope per °C column',
            body: 'How many additional (or fewer) pests the model expects for every 1°C increase in ambient temperature. For example, a slope of +4.2 means every extra degree Celsius is associated with 4 more pests per observation. A slope of −3.1 means every extra degree Celsius is associated with 3 fewer pests — a cool-season species. Only practically meaningful when Temperature Influence is Warm-Favoring or Cold-Favoring.',
          },
          {
            heading: 'Optimal Temperature Range column',
            body: 'The 5°C temperature band in which this pest\'s historically highest average counts were recorded, derived from the band that produced the highest mean observation count. Use this to anticipate pressure peaks when weather forecasts show temperatures entering this range.',
          },
          {
            heading: 'Count by Temperature Band bars',
            body: 'Each pest card shows a series of horizontal bars — one per 5°C band — showing the average observed count when sessions occurred in that temperature range. The bar width is proportional to the highest-count band. This profile is more useful than the raw slope figure because it shows the actual distribution rather than a linear approximation.',
          },
          {
            heading: 'Global Temperature Heat Map',
            body: 'The table at the bottom aggregates all pests combined. It shows the average observation count, the number of sessions, and the number of distinct pest species recorded in each 5°C band across your entire farm. A band with a dramatically higher average count is the highest-risk temperature window across your whole pest community — consider increasing scouting frequency when the forecast enters that band.',
          },
          {
            heading: 'Data requirements',
            body: 'Temperature is recorded per scouting session (not per observation). If scouts do not log temperature, this tab will show no data. Ensure scouts record ambient air temperature when starting or completing each session. A minimum of 3 temperature-linked observations is required per pest for the correlation to be computed.',
          },
          {
            heading: 'Limitations',
            body: 'A linear Pearson correlation assumes a straight-line relationship between temperature and count. In reality, many pests have a parabolic response (activity peaks at an optimal temperature and falls on either side). The slope and r value capture the dominant trend but may understate risk at the extreme ends of the temperature range. Use the band bars for a more realistic picture of the full temperature response curve.',
          },
        ],
      },
      {
        id:    'env-rainfall',
        icon:  '🌧',
        title: 'Rainfall Lag Effect',
        intro: 'Many pest populations spike 7–21 days after significant rainfall — eggs hatch, larvae become active, or fungal-host plant stress conditions emerge following wet weather. Because Pestlook does not integrate a rainfall feed, the system approximates wet events as weeks where the average session temperature drops ≥ 3°C below the 4-week rolling average (a temperature drop typically accompanies rain systems). It then checks whether pest counts rose in the 1–3 weeks following each event.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Wet Events Detected</strong> — the number of weeks in the selected period where the rolling-average temperature proxy identified a significant cool/wet event. <strong>Pests Analysed</strong> — pests with enough weekly count data to compare before and after each event. <strong>Strong Lag Signal</strong> — pests where 3 or more wet events were each followed by a count spike of more than 50%. <strong>Moderate Lag Signal</strong> — pests with 2 or more spiked events.',
          },
          {
            heading: 'Data note banner',
            body: 'The amber information banner below the KPI cards explains the proxy method being used. It is important context: this is a temperature-based approximation, not actual rainfall data. The accuracy of wet-event detection depends on how consistently scouts record temperature. Consider this tab a directional signal rather than a precise rainfall correlation.',
          },
          {
            heading: 'Wet Event pills',
            body: 'The blue pills show each detected wet event — the week start date and the size of the temperature drop in °C. A drop of 4°C or more is a stronger rainfall proxy than a marginal 3°C drop. Events with larger drops are more likely to represent genuine rainfall, although a sudden cold front without rain can produce a similar temperature signature.',
          },
          {
            heading: 'Lag confidence badge',
            body: '<span style="color:#c0392b;font-weight:600;">🔴 Strong</span> — 3 or more wet events were followed by a spike > 50% above the 2-week baseline. Plan extra scouting visits in the 2–3 weeks following any future wet event for this pest. <span style="color:#e67e22;font-weight:600;">🟠 Moderate</span> — 2 events with a spike. Worth monitoring. <span style="color:#f1c40f;font-weight:600;">🟡 Weak</span> — only 1 event showed a spike. Could be coincidence; gather more data. <span style="color:#7f8c8d;font-weight:600;">⬜ None</span> — no consistent post-wet spike detected for this pest.',
          },
          {
            heading: 'Avg Lag and Avg Spike fields',
            body: '<strong>Avg lag</strong> is the average number of weeks (and days) between the wet event and the peak pest count in the following 3 weeks, calculated from events that did produce a spike. <strong>Avg spike</strong> is the percentage increase above the 2-week baseline count at that lag peak. A large average spike with a short lag (1 week, 7 days) means you have very little time to respond after a wet event — increase inspection frequency immediately rather than waiting for the next scheduled visit.',
          },
          {
            heading: 'Lag Detail table',
            body: 'Shows up to 5 of the most significant events for each pest: the wet event week, the temperature drop, which lag week had the peak, the baseline count (2-week average before the event), the peak count, and the spike percentage. Rows where spikePct > 50 are highlighted in red. This table lets you verify that the overall lag signal is consistent rather than driven by a single outlier event.',
          },
          {
            heading: 'Connecting to real rainfall data',
            body: 'The lag detection is more accurate when scouts log temperatures consistently. For farm-specific precision, consider adding actual rainfall recording (in mm) to the session form — a future enhancement described in the intelligence roadmap. An OpenWeatherMap integration would allow the system to use real precipitation data rather than the temperature proxy.',
          },
        ],
      },
      {
        id:    'env-drought',
        icon:  '☀',
        title: 'Drought Stress Correlation',
        intro: 'Identifies whether pest threshold breach rates are elevated during drought conditions — defined as 30-day windows where the average session temperature exceeds the long-term session mean by more than 2°C. Many pest species exploit plants weakened by heat or water stress. This tab calculates a separate breach rate for drought and normal periods per pest and flags significant differences.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Drought Days</strong> — the number of distinct session dates in the selected period that fell within a detected drought window (avg temp > LTM + 2°C). <strong>Normal Days</strong> — session dates within the long-term mean range. <strong>Long-Term Mean</strong> — the average temperature across all temperature-recorded sessions in the date range, used as the baseline. <strong>Drought-Stressed</strong> — the number of pest species showing a statistically meaningful elevation in breach rate during drought conditions.',
          },
          {
            heading: 'Long-Term Mean temperature',
            body: 'This is calculated from all sessions in the selected date range that have temperature recorded. It is not a fixed climate value — it is your farm\'s own session-temperature average. A farm in a tropical region will have a naturally higher LTM than one in a temperate climate. The drought threshold (LTM + 2°C) is therefore automatically calibrated to your local conditions.',
          },
          {
            heading: 'Drought Period pills',
            body: 'The red pills list each detected drought period — the start date, end date, and number of days. A single sustained drought shows as one long pill. Multiple shorter hot spells appear as separate pills. Short drought windows (fewer than 5 days) may produce unreliable breach-rate estimates because sample sizes are small — treat those results with caution.',
          },
          {
            heading: 'Breach Rate During Drought bar',
            body: 'The red bar shows the percentage of session-days in drought conditions where this pest exceeded its action threshold. A 72% drought breach rate means nearly three-quarters of scout visits during hot periods found pest counts above the threshold.',
          },
          {
            heading: 'Breach Rate in Normal Conditions bar',
            body: 'The green bar is the equivalent figure for non-drought sessions. The contrast between the red and green bars is the key visual signal. If both bars are similar, temperature is not elevating breach risk. If the red bar is substantially taller, you have a drought-stress species.',
          },
          {
            heading: 'Drought Bias percentage',
            body: 'The relative increase in breach rate during drought vs normal: (drought rate − normal rate) ÷ normal rate × 100. A drought bias of +150% means the pest breaches its threshold 2.5× more often during hot periods. A negative drought bias means the pest is actually less active during drought — possibly a cool-season species.',
          },
          {
            heading: 'Strong / Moderate / Weak / None stress link',
            body: '<span style="color:#c0392b;font-weight:600;">Strong</span> — drought bias ≥ 50% AND at least 3 drought breaches recorded. <span style="color:#e67e22;font-weight:600;">Moderate</span> — bias ≥ 20% with at least 2 breaches. <span style="color:#f1c40f;font-weight:600;">Weak</span> — bias ≥ 5% but not yet statistically convincing. <span style="color:#7f8c8d;font-weight:600;">None</span> — no meaningful elevation. For Strong-linked pests, proactively increase scouting frequency during forecast hot periods, even before a breach is recorded.',
          },
          {
            heading: 'Avg Count (Drought vs Normal)',
            body: 'The average raw pest count recorded per session during drought and normal periods respectively. This complements the breach rate by showing the magnitude of the count change, not just whether it crossed the threshold. A pest with avg count 80 in drought vs 20 in normal conditions is a critical drought risk even if the threshold is set high enough that neither value triggers a breach.',
          },
          {
            heading: 'Data requirements',
            body: 'Both drought and normal periods need at least 2 session-dates with threshold data for the breach rates to be meaningful. If your farm has only scouted during one temperature regime (e.g. only winter sessions recorded), the comparison will be unreliable. Widen the date range to capture both hot and cooler periods for best results.',
          },
        ],
      },
    ],
  },
  {
    id:    'containment',
    icon:  '🛡',
    title: 'Containment Intelligence',
    intro: 'The Containment Intelligence group helps you move from observation to action. It analyses where a pest is spreading, which farms are in its path, where it entered your operation, whether it is potentially resistant to your current control methods, and which newly detected species represent a genuine new introduction versus a routine new-to-field find. These four tabs are designed to be used together after any significant outbreak: start with Entry Point Analysis to understand where the pest came from, then check Containment Zones to see where it is heading, use Quarantine Flags to assess novelty, and finally run Resistance Patterns to evaluate whether your control programme is working over time.',
    sections: [
      {
        id:    'cont-zones',
        icon:  '🛡',
        title: 'Containment Zone Recommendation',
        intro: 'When a pest is spreading across multiple fields, this tab calculates a spread vector (direction and speed in km/week) from the weekly GPS centroids of all observations. It then projects a containment perimeter ahead of the current infestation front — identifying unaffected farms that are directly in the pest\'s path so you can intensify scouting and apply preventive measures before the pest arrives.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Spreading</strong> — the number of pest species for which a measurable spread vector was computed (requires at least 2 weeks of observations across different locations). <strong>Perimeter Zones</strong> — the total number of unaffected farms classified as High urgency — directly in the spread path. <strong>Inside Zone</strong> — the total number of fields already confirmed affected across all pests.',
          },
          {
            heading: 'Spread direction badge and arrow',
            body: 'The large directional icon (↗, →, ↓, etc.) and compass bearing show the computed direction of movement. This is derived by comparing the GPS centroid of observations in the earliest week against the centroid of the most recent week. The bearing is the great-circle heading from the first centroid to the last. The km/wk figure is the total distance divided by the number of weeks observed.',
          },
          {
            heading: 'Info bar — perimeter radius, bearing, current front',
            body: 'The grey info bar below the pest header shows three computed values. <strong>Perimeter radius</strong> — the search radius used to find candidate farms; it is set to 2× the average weekly spread distance, with a floor of 5 km to account for slow-moving or static infestations. <strong>Bearing</strong> — the spread direction in degrees (0° = North, 90° = East). <strong>Front at</strong> — the field name of the most recent weekly centroid; this is the leading edge of the known infestation.',
          },
          {
            heading: 'Affected Fields — Inside Zone table',
            body: 'The left-hand table lists every field that has already been observed with this pest during the selected date range. Columns: <strong>Field</strong>, <strong>Farm</strong>, <strong>First Seen</strong> (date of earliest observation), <strong>Peak Count</strong> (highest single-session count). Use this table to review whether all affected fields have received follow-up sessions and treatment decisions.',
          },
          {
            heading: 'Containment Perimeter table — 🚨 High vs 👁 Monitor',
            body: '<strong>🚨 High urgency</strong> — the farm is within the perimeter radius AND lies within ±60° of the spread bearing. These farms are directly in the pest\'s projected path. Schedule an inspection within the next scouting cycle and consider applying preventive measures on crop boundaries facing the infestation. <strong>👁 Monitor</strong> — the farm is within the perimeter radius but off-axis. It is less likely to be next but warrants additional vigilance. Columns show distance from the current front and the bearing from the front to that farm.',
          },
          {
            heading: 'No perimeter farms shown',
            body: 'If the perimeter list is empty, either all nearby farms are already affected (shown in the Inside Zone table) or no tenant farms have GPS coordinates set within range. Go to the Farms page and set GPS coordinates for all farms. Without coordinates, the system cannot calculate distances or identify which farms lie in the spread path.',
          },
          {
            heading: 'Data requirements',
            body: 'A spread vector requires GPS coordinates on farms and at least 2 distinct weekly observation buckets for the same pest. The vector is computed from session-level GPS (using the farm or field GPS coordinates attached to each session). If all sessions for a pest occurred in the same week, no vector can be computed and the pest will not appear on this tab.',
          },
        ],
      },
      {
        id:    'cont-quarantine',
        icon:  '🔬',
        title: 'Quarantine Field Flag',
        intro: 'This tab detects pest species that were recorded for the first time within the selected date range — either for the first time ever across your entire tenant (New to tenant) or for the first time on a specific field (New to field). Genuine new introductions require faster response than a pest simply spreading within a known population.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>New Introductions</strong> — total flags raised in the selected period. <strong>New to Tenant</strong> — the most critical category: a species that has never been recorded anywhere in your organisation before this period. <strong>New to Field</strong> — the species is known to your organisation but this is the first record on this specific field. <strong>Non-catalogued</strong> — flags involving a pest that is not part of the standard system pest library (tenant-defined pests), which may indicate a truly novel or exotic species.',
          },
          {
            heading: 'Data note banner',
            body: 'The banner below the KPI cards explains the detection logic: a flag is raised whenever a pest\'s first-ever observation on a field (or across the whole tenant) falls within the selected date range. Widening the range to include the full current season will give the most complete picture.',
          },
          {
            heading: 'Risk level badges — High / Elevated / Standard',
            body: '<span style="color:#c0392b;font-weight:600;">High</span> — the pest has never been recorded anywhere in your organisation (New to tenant). These require immediate attention, potential authority notification, and intensive perimeter monitoring. <span style="color:#e67e22;font-weight:600;">Elevated</span> — the pest is known to your organisation but is non-catalogued (tenant-defined), suggesting it may not be well understood. <span style="color:#7f8c8d;font-weight:600;">Standard</span> — new to this specific field but it is a well-known system pest already recorded on other fields. Still warrants increased scouting frequency.',
          },
          {
            heading: 'Non-catalogued badge',
            body: 'A yellow Non-catalogued badge appears alongside flags for pests that were created by your organisation rather than pulled from the built-in species library. These are pests without a validated species profile. If a cluster of unknown or non-catalogued pests appears in the same area around the same time, treat this as a potential exotic species introduction and consider sending a specimen to an identification service.',
          },
          {
            heading: 'Recommendation panel',
            body: 'Each flag card includes a tailored recommendation at the bottom. High-risk (new to tenant) flags prompt reporting to the local agricultural authority. New-to-field flags prompt comparison with neighbouring fields using the Entry Point Analysis tab. Follow these recommendations as part of your standard outbreak response procedure.',
          },
          {
            heading: 'Nothing shown on this tab',
            body: 'If no flags appear, no pest was recorded for the first time on any field within the selected date range. Shorten or widen the date range if you expected to see a recent new detection. Note that re-appearances of a pest after a season of absence are not flagged — the system uses the all-time first-seen date, not the most-recent-season first-seen date.',
          },
        ],
      },
      {
        id:    'cont-entry',
        icon:  '🔍',
        title: 'Entry Point Analysis',
        intro: 'Entry Point Analysis works backwards from your observation data to identify the most likely field and farm where each pest was first introduced. It then classifies the origin farm\'s position relative to your farm cluster to suggest whether the pest entered via a perimeter boundary (peripheral entry) or through internal movement such as shared equipment or plant material (central entry).',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Analysed</strong> — number of pest species with at least 2 affected fields, enabling an origin to be distinguished from downstream spread. <strong>Peripheral Entries</strong> — pests whose origin farm is farther from the tenant cluster centre than the median farm-to-centroid distance. These likely entered via a farm boundary, road, irrigation channel, or neighbouring property. <strong>Central Entries</strong> — origin farm is within the cluster; internal vectors (equipment, workers, transplants) are more probable. <strong>GPS Not Set</strong> — pests whose origin farm has no GPS coordinates, making vector classification impossible.',
          },
          {
            heading: 'Entry Vector badge — Peripheral / Central / GPS Unknown',
            body: '<span style="color:#c0392b;font-weight:600;">🔴 Peripheral Entry</span> — the origin farm is on the outer edge of your farm cluster. Inspect boundary hedges, roads, irrigation inlets, and neighbouring property boundaries for the likely entry route. Consider perimeter trapping on this and adjacent farms. <span style="color:#2980b9;font-weight:600;">🔵 Central Cluster</span> — the pest first appeared in a centrally located farm. This is more consistent with internal spread via shared equipment, workers, or contaminated plant material. Review hygiene protocols. <span style="color:#7f8c8d;font-weight:600;">⬜ GPS Unknown</span> — set GPS on the farm via the Farms page to enable classification.',
          },
          {
            heading: 'Origin distance from cluster centre',
            body: 'The grey info bar shows how far the origin farm is from the geometric centre of all your GPS-equipped farms, alongside the median farm-to-centroid distance. The peripherality threshold is the median: farms beyond the median distance are classified as peripheral. This is a relative measure — it adapts to your specific farm layout rather than using a fixed km cutoff.',
          },
          {
            heading: 'Entry Point Note',
            body: 'The coloured recommendation panel explains the classification in plain language and suggests practical containment steps. Peripheral entries recommend perimeter trapping and checking boundary vectors. Central entries recommend reviewing internal farm hygiene and equipment-sharing practices. GPS-unknown entries prompt coordinate entry.',
          },
          {
            heading: 'Spread Chain',
            body: 'The numbered timeline below the recommendation shows every affected field, ordered by first detection date. Field 1 is the origin (red circle). Subsequent fields show how many days after the origin they were first detected. A rapid chain (all fields within a few days) suggests fast active spread or a widespread simultaneous introduction. A slow chain (weeks between steps) suggests gradual field-by-field movement.',
          },
          {
            heading: 'Only 1 field in the chain',
            body: 'If a pest appears in only one field, there is no spread chain to analyse and it will not appear on this tab. Use the Quarantine Flags tab to assess whether this is a new introduction, and the Containment Zones tab to model where it might spread if counts continue to rise.',
          },
          {
            heading: 'Data requirements',
            body: 'GPS coordinates must be set on farms for the peripheral/central classification to work. The origin detection itself (earliest field) works without GPS. Set coordinates on the Farms page. The cluster centroid is calculated from all GPS-equipped farms in your tenant — adding more farm coordinates improves the accuracy of the peripherality scoring.',
          },
        ],
      },
      {
        id:    'cont-resistance',
        icon:  '🧬',
        title: 'Resistance Pattern Detection',
        intro: 'Resistance Pattern Detection identifies field × pest combinations where threshold breaches have recurred across multiple calendar years. Recurring breaches on the same field, for the same pest, season after season — especially at an increasing rate — may indicate that the current control programme is no longer effective, either due to pesticide resistance or persistent environmental conditions that are not being addressed.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Patterns Found</strong> — total field × pest combinations that breached their threshold in at least 2 distinct calendar years within the selected range. <strong>Likely Resistance</strong> — combinations with 3 or more breach years and a Worsening or Stable trend, or 2 breach years with a Worsening trend. <strong>Possible Resistance</strong> — 2 breach years with any trend. The years-analysed figure shows the span of the date range used.',
          },
          {
            heading: 'Resistance Risk badge — Likely / Possible / Monitor',
            body: '<span style="color:#c0392b;font-weight:600;">Likely</span> — this combination should be treated as a probable resistance case. Rotate mode-of-action immediately. Do not apply the same product group again until resistance testing or a full-season break has been completed. <span style="color:#e67e22;font-weight:600;">Possible</span> — two breach years observed. Could be seasonal variation or resistance beginning to develop. Evaluate whether the same control method was used each year and consider alternating. <span style="color:#7f8c8d;font-weight:600;">Monitor</span> — insufficient data to classify; continue observation.',
          },
          {
            heading: 'Trend badge — Worsening / Stable / Improving',
            body: '<span style="color:#c0392b;font-weight:600;">📈 Worsening</span> — the breach rate in the most recent year is at least 15 percentage points higher than in the first breach year. The rate change figure shows exactly how many percentage points the breach rate has increased. <span style="color:#27ae60;font-weight:600;">📉 Improving</span> — the breach rate has dropped by ≥ 15 pp, suggesting the current programme may be working. <span style="color:#e67e22;font-weight:600;">➡️ Stable</span> — breach rate is consistent year-on-year, indicating neither improvement nor deterioration.',
          },
          {
            heading: 'Breach Rate by Season bar chart',
            body: 'Each year in the pattern is shown as a horizontal bar. The bar width is proportional to the breach rate that year (as a percentage of total sessions). Bars are colour-coded: green below 30%, amber 30–59%, red 60% and above. A pattern of progressively wider, redder bars is the clearest visual signal of a resistance problem.',
          },
          {
            heading: 'Recommendation panel',
            body: 'Likely Resistance patterns show a recommendation to rotate mode-of-action, conduct resistance testing if available, and consider biocontrol or cultural controls. Possible Resistance patterns suggest evaluating current treatment effectiveness and alternating control methods. Review these recommendations with your agronomist before the next treatment window.',
          },
          {
            heading: 'No treatment records required',
            body: 'This analysis does not require treatment events to be logged in Pestlook. It is based entirely on whether the pest count exceeded the configured threshold in each session. This means it will flag recurring breaches even if no treatment was ever applied — which is itself a signal worth investigating.',
          },
          {
            heading: 'Nothing shown on this tab',
            body: 'Patterns require breach data across at least 2 distinct calendar years. The default date range for this tab is 2 years. If your data spans less than 2 years, or if thresholds have not been configured for your pests, no patterns will be detected. Set action thresholds on each pest via the Pests page and widen the date range if needed.',
          },
          {
            heading: 'Data requirements',
            body: 'Action thresholds (ThresholdCount) must be configured on observations for the breach detection to work. Sessions must be linked to a specific field (not just a farm-level session). The date range should cover at least 24 months to capture two full seasons — use the date pickers at the top of the page to adjust.',
          },
        ],
      },
    ],
  },
];

// ── FAQ content shown on the last section of every group ─────────────────────
const FAQ = {
  web: [
    { q: 'Why do I see "No data for selected period" on Analytics?', a: 'Change the date range filter at the top of the Analytics page. If the range is too narrow there may be no sessions or observations recorded in that window.' },
    { q: 'How do I change the action threshold for a pest?', a: 'Go to <strong>Pest Catalogue</strong>, find the pest, click ✏️, and update the Action Threshold value.' },
    { q: 'A trap is showing in the wrong location on the map.', a: 'Go to <strong>Traps</strong>, edit the trap, and correct the GPS Latitude / Longitude values. The map updates immediately.' },
    { q: 'The dashboard activity feed is empty.', a: 'Observations are only shown once a session has been started and pest observations logged. Plan and start a session first.' },
  ],
  mobile: [
    { q: 'My mobile observations are not appearing on the web.', a: 'Check that the mobile app has synced — pull to refresh on the home screen. Ensure you have an active internet connection. If the issue persists, sign out and back in to force a full sync.' },
    { q: 'The app says "Tenant not found" when I log in.', a: 'Contact your administrator to ensure your account has been assigned to an organisation.' },
    { q: 'GPS coordinates are not being recorded for my observations.', a: 'Ensure you have granted the app Location Permission. On Android, go to Settings → Apps → Pestlook → Permissions → Location and set it to "Always" or "While in use". Enable High Accuracy mode in the app settings for best results.' },
  ],
  intelligence: [
    { q: 'A pest I know is spreading does not appear on the Spread Direction map.', a: 'At least two weeks of GPS-tagged observations are needed to compute a vector. Check that farm GPS coordinates are set on the Farms page — these are used as a fallback when individual observations lack GPS tags.' },
    { q: 'The Neighbour Risk panel shows 0 at-risk fields even though I have a breach.', a: 'Verify that the breaching field\'s farm has GPS coordinates set. Farms without coordinates cannot be matched against neighbours.' },
    { q: 'The Cross-Farm chart shows no outbreak weeks.', a: 'Try widening the date range to at least 12 months, or lower the Min Farms threshold to 2. All observations must come from at least two farms for cross-farm correlation to work.' },
  ],
  predictive: [
    { q: 'The Population Forecast shows a wide confidence band.', a: 'A wide band means the historical data is noisy — pest counts vary significantly week to week. More consistent scouting data (same fields, same intervals) will narrow the band over time.' },
    { q: 'A trap shows "Unknown" risk on the Trap Saturation page.', a: 'The trap had no catch observations in the selected period. Verify scouts are linking observations to the specific trap in Session Detail, and that the trap has been checked at least twice.' },
    { q: 'The scouting interval recommendation seems too short.', a: 'The recommended interval is based on the growth rate of pest populations on that field. A very rapid growth rate (≥100%) triggers a 3-day interval. If counts were unusually high in one week due to a data entry error, correct the observation and the interval will recalculate.' },
  ],
  actionable: [
    { q: 'A pest I know is near threshold does not appear on the Spray Timing page.', a: 'The pest must have an action threshold configured in the Pest Catalogue, at least 2 weeks of observation history, and a rising or near-threshold trend. Falling populations are excluded — no spray intervention is warranted.' },
    { q: 'The Scout Priority queue is showing a field I already visited today.', a: 'The priority score is calculated from the selected date range. If the session you completed today has not yet synced, or if the date range does not include today, the recency score will not yet reflect the visit. Wait for sync or widen the date range.' },
    { q: 'Treatment Effectiveness shows Insufficient Data for all entries.', a: 'The effectiveness score requires at least one completed scouting session after the threshold breach. If scouts have not returned to the field after a breach, no post-breach data is available. Ensure follow-up sessions are completed and observations recorded.' },
    { q: 'All my overdue alerts disappeared after I added a session.', a: 'As soon as a completed session is recorded on the breached field (even if it contains no observations), the breach is considered followed up and the alert is removed. This is correct behaviour — the alert exists to prompt a visit, not to track treatment.' },
    { q: 'The Blind Spots page shows fields I have visited this month.', a: 'Coverage is counted against the 4-session monthly target. If you have visited a field once or twice, it may still be flagged as under-scouted (below 50% = fewer than 2 sessions). Increase visit frequency to clear the flag.' },
  ],
  environmental: [
    { q: 'The Temperature Activity tab shows no pests.', a: 'Scouts must record a temperature value in the session details for observations to appear here. If no sessions have temperature logged in the selected date range, no correlation can be computed. Remind scouts to enter ambient temperature when starting or completing every session.' },
    { q: 'A pest I know is temperature-sensitive shows "None" for correlation.', a: 'The system needs at least 3 temperature-linked observations per pest. If the pest has few records, or if all sessions occurred in a very narrow temperature range (e.g. a single season), the correlation cannot be detected. Widen the date range to capture more seasonal variation.' },
    { q: 'No wet events appear on the Rainfall Lag tab even though it has rained recently.', a: 'Wet events are approximated as temperature drops ≥ 3°C below the 4-week rolling average. If scouts have not been recording temperatures, or if rain occurred without a significant temperature drop (e.g. a warm tropical downpour), the proxy will not detect it. Consistent temperature recording across all sessions is essential for this tab to work.' },
    { q: 'The Drought Stress tab shows 0 drought days.', a: 'No session-dates in the selected period had an average temperature more than 2°C above the long-term session mean. Either the date range does not include a hot period, or scouts only scouted during cooler parts of the year. Try widening the date range to cover a full annual cycle including any summer months.' },
    { q: 'A pest shows a negative drought bias — is that an error?', a: 'A negative drought bias means the pest breaches its threshold less often during hot/dry periods than in cooler conditions. This is expected for cool-season pests (e.g. certain aphid species) that are suppressed by heat. It is not an error — it confirms the pest is Cold-Favoring.' },
  ],
  containment: [
    { q: 'Containment Zones shows no pests with spread vectors.', a: 'A spread vector requires at least 2 distinct weekly observation buckets for the same pest across different GPS-tagged locations. If all observations for a pest occurred in the same week, or if no farms have GPS coordinates set, no vector can be computed. Go to the Farms page and set GPS coordinates, then widen the date range to cover at least 2–3 weeks of observations.' },
    { q: 'The Quarantine Flags tab shows nothing in a period where I know we saw a new pest.', a: 'Quarantine Flags only triggers when the first-ever observation on a field falls within the selected date range. If the pest was first recorded before the range start — even once — it will not be flagged again. Use the full-season date range to capture all first-detection events in the current season, or use All Time to see every first-detection ever recorded.' },
    { q: 'Entry Point Analysis shows "GPS Unknown" for all pests.', a: 'The peripheral vs central entry classification requires GPS coordinates on farms. Open the Farms page, select each farm, and enter its latitude and longitude. Once all farms have coordinates, the analysis will classify entries based on each farm\'s position relative to your farm cluster centroid. The spread chain (field order) will still display even without GPS.' },
    { q: 'Resistance Patterns shows no patterns even though I know we have had repeated breaches.', a: 'Patterns require threshold breaches in at least 2 distinct calendar years. Check that: (1) the date range covers at least 24 months — use the date pickers to extend it; (2) action thresholds are configured on your pests (set via the Pests page); (3) sessions are linked to specific fields rather than just a farm. If all three conditions are met, widen the range further.' },
    { q: 'A field shows Likely Resistance but we recently rotated our pesticide programme.', a: 'The analysis is based on historical breach rates and cannot yet see the effect of a recent change. After one full season of data with the new programme, re-run this tab. If the most recent year shows a falling breach rate, the trend will shift to Improving and the risk level will be reassessed. The system is purely observation-based — it does not require you to log treatment events.' },
    { q: 'The spread perimeter shows a farm as High urgency but it is on a completely different crop.', a: 'The containment perimeter is geometry-based — it identifies farms that are geographically in the spread path regardless of crop type. Crop type does not currently modify the urgency classification. Review the farm manually: if the pest is host-specific and the perimeter farm grows a non-host crop, you can deprioritise it, but still schedule a scouting visit to confirm no alternative hosts are present.' },
  ],
};

export function renderHelp(container) {
  let activeGroup = GROUPS[0].id;
  let activeSection = GROUPS[0].sections[0].id;

  function render() {
    const group   = GROUPS.find(g => g.id === activeGroup) || GROUPS[0];
    const section = group.sections.find(s => s.id === activeSection) || group.sections[0];

    // ── Tab bar ──────────────────────────────────────────────────────────────
    const tabsHtml = GROUPS.map(g => {
      const isActive = g.id === activeGroup;
      return `
        <button data-tab="${g.id}" style="
          display:inline-flex;align-items:center;gap:7px;
          padding:8px 18px;border-radius:8px;font-size:0.85rem;font-weight:${isActive ? '700' : '500'};
          border:1.5px solid ${isActive ? 'var(--accent,#4ade80)' : 'var(--border)'};
          background:${isActive ? 'var(--accent-dim,rgba(74,222,128,0.12))' : 'none'};
          color:${isActive ? 'var(--accent,#4ade80)' : 'var(--text-dim)'};
          cursor:pointer;transition:all 0.15s;white-space:nowrap;">
          <span style="font-size:1rem;">${g.icon}</span>${escapeHtml(g.title)}
        </button>`;
    }).join('');

    // ── Section sub-nav ──────────────────────────────────────────────────────
    const subNavHtml = group.sections.map(s => {
      const isActive = s.id === activeSection;
      return `
        <button data-section="${s.id}" style="
          display:flex;align-items:center;gap:8px;width:100%;text-align:left;
          padding:7px 12px;border-radius:7px;font-size:0.8rem;
          font-weight:${isActive ? '700' : '400'};
          background:${isActive ? 'var(--accent-dim,rgba(74,222,128,0.1))' : 'none'};
          color:${isActive ? 'var(--text)' : 'var(--text-dim)'};
          border:none;cursor:pointer;transition:background 0.12s;">
          <span style="font-size:0.9rem;">${s.icon}</span>${escapeHtml(s.title)}
        </button>`;
    }).join('');

    // ── Section content ──────────────────────────────────────────────────────
    const diagram  = SVG[section.id] || '';
    const itemsHtml = section.items.map(it => `
      <div style="border-left:3px solid var(--border);padding:10px 0 10px 18px;margin-bottom:2px;">
        <div style="font-weight:600;color:var(--text);font-size:0.9rem;margin-bottom:4px;">${escapeHtml(it.heading)}</div>
        <div style="color:var(--text-dim);font-size:0.85rem;line-height:1.65;">${it.body}</div>
      </div>`).join('');

    // FAQ — shown below items on the last section of each group
    const isLastSection = group.sections[group.sections.length - 1].id === section.id;
    const groupFaq      = FAQ[group.id] || [];
    const faqHtml = (isLastSection && groupFaq.length) ? `
      <div style="margin-top:28px;border-top:1px solid var(--border);padding-top:20px;">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-bottom:14px;">Frequently Asked Questions</div>
        ${groupFaq.map(faq => `
          <div style="margin-bottom:14px;">
            <div style="font-weight:600;color:var(--text);font-size:0.88rem;margin-bottom:3px;">Q: ${escapeHtml(faq.q)}</div>
            <div style="color:var(--text-dim);font-size:0.85rem;line-height:1.6;">${faq.a}</div>
          </div>`).join('')}
      </div>` : '';

    // ── Render ───────────────────────────────────────────────────────────────
    container.innerHTML = `
      <div style="margin-bottom:20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:600;color:var(--text);letter-spacing:-0.02em;">Help & User Guide 📖</div>
          <div style="font-size:0.85rem;color:var(--text-dim);">Everything you need to know about Pestlook</div>
        </div>
        <button id="retake-tour-btn" class="btn-outline" style="white-space:nowrap;flex-shrink:0;">🚀 Retake Tour</button>
      </div>

      <!-- Mobile app download -->
      <div class="card card-p" style="margin-bottom:22px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div style="font-size:2rem;">📱</div>
        <div style="flex:1;min-width:220px;">
          <div style="font-size:0.95rem;font-weight:700;color:var(--text);">PestLook for Android</div>
          <div style="font-size:0.8rem;color:var(--text-dim);margin-top:2px;">
            Scout offline in the field — GPS, photos, and barcode scanning. Sign in with the same account.
            Enable "Install unknown apps" when prompted; the Play Store listing is coming.
          </div>
        </div>
        <a href="/downloads/com.pestlook.ui.mobile-Signed.apk" download class="btn-outline" style="padding:9px 18px;white-space:nowrap;">⬇ Download .apk</a>
      </div>

      <!-- Tab bar -->
      <div style="display:flex;gap:8px;margin-bottom:22px;flex-wrap:wrap;">
        ${tabsHtml}
      </div>

      <!-- Two-column: sub-nav + content -->
      <div style="display:grid;grid-template-columns:195px 1fr;gap:20px;align-items:start;">

        <!-- Sticky sub-nav -->
        <div class="card card-p" style="position:sticky;top:16px;max-height:calc(100vh - 80px);overflow-y:auto;">
          <div style="display:flex;align-items:center;gap:8px;padding:10px 12px 12px;border-bottom:1px solid var(--border);margin-bottom:6px;">
            <span style="font-size:1.3rem;">${group.icon}</span>
            <div>
              <div style="font-size:0.82rem;font-weight:700;color:var(--text);">${escapeHtml(group.title)}</div>
              <div style="font-size:0.72rem;color:var(--text-dim);margin-top:1px;">${group.sections.length} section${group.sections.length > 1 ? 's' : ''}</div>
            </div>
          </div>
          <nav style="display:flex;flex-direction:column;gap:1px;">
            ${subNavHtml}
          </nav>
        </div>

        <!-- Main content -->
        <div class="card card-p" style="min-width:0;">
          <!-- Section heading -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid var(--border);">
            <span style="font-size:1.4rem;">${section.icon}</span>
            <div>
              <div style="font-family:'Fraunces',serif;font-size:1.1rem;font-weight:700;color:var(--text);letter-spacing:-0.01em;">${escapeHtml(section.title)}</div>
              <div style="font-size:0.8rem;color:var(--text-dim);margin-top:2px;">${escapeHtml(group.title)}</div>
            </div>
          </div>

          <p style="color:var(--text-dim);font-size:0.88rem;line-height:1.65;margin:0 0 14px;">${section.intro}</p>

          ${diagram}

          <div style="display:flex;flex-direction:column;gap:6px;">
            ${itemsHtml}
          </div>

          ${faqHtml}

          <!-- Prev / Next navigation -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:28px;padding-top:16px;border-top:1px solid var(--border);">
            ${buildPrevNext(group, section)}
          </div>
        </div>

      </div>
    `;

    // Wire tabs
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeGroup   = btn.dataset.tab;
        activeSection = GROUPS.find(g => g.id === activeGroup).sections[0].id;
        render();
        container.scrollTop = 0;
      });
    });

    // Wire section nav
    container.querySelectorAll('[data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSection = btn.dataset.section;
        render();
        container.scrollTop = 0;
      });
    });

    // Wire prev/next
    container.querySelectorAll('[data-nav-prev],[data-nav-next]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.navPrev || btn.dataset.navNext;
        const [gid, sid] = target.split('|');
        activeGroup   = gid;
        activeSection = sid;
        render();
        container.scrollTop = 0;
      });
    });

    // Wire retake tour button
    container.querySelector('#retake-tour-btn')?.addEventListener('click', () => {
      import('../utils/tour.js').then(({ startTour }) => startTour());
    });
  }

  // ── Prev/Next builder ─────────────────────────────────────────────────────
  function buildPrevNext(group, section) {
    // Flatten all sections across all groups
    const flat = [];
    for (const g of GROUPS) {
      for (const s of g.sections) flat.push({ gid: g.id, sid: s.id, icon: s.icon, title: s.title });
    }
    const idx  = flat.findIndex(x => x.gid === group.id && x.sid === section.id);
    const prev = flat[idx - 1];
    const next = flat[idx + 1];

    const btnStyle = `display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-size:0.8rem;font-weight:600;border:1.5px solid var(--border);background:none;color:var(--text-dim);cursor:pointer;transition:all 0.12s;`;

    const prevBtn = prev
      ? `<button data-nav-prev="${prev.gid}|${prev.sid}" style="${btnStyle}">← ${prev.icon} ${escapeHtml(prev.title)}</button>`
      : `<span></span>`;

    const nextBtn = next
      ? `<button data-nav-next="${next.gid}|${next.sid}" style="${btnStyle}">${next.icon} ${escapeHtml(next.title)} →</button>`
      : `<span></span>`;

    return `${prevBtn}${nextBtn}`;
  }

  render();
}
