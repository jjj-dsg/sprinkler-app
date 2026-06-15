/**
 * PDF blueprint generation for the Pro Plan deliverable.
 * Split into pure calculation functions (testable) + jsPDF rendering (side-effect).
 * jsPDF is dynamically imported at render time to keep the initial JS bundle small.
 */
import type { jsPDF as JsPDF } from 'jspdf';
import { HEADS, ZONE_TYPES } from './data';
import { polyAreaFt, pipPx } from './geometry';
import type { Head, HeadKey, RateProfile, Zone, ZoneTypeKey } from './types';

// ET fraction (0–1) each zone type needs relative to reference ET
const ZONE_ET_FACTORS: Record<ZoneTypeKey, number> = {
  premium_lawn: 1.0,
  standard_lawn: 0.85,
  kurapia: 0.45,
  shade_bed: 0.30,
};

// Average application rate in inches/hour per head type
const APP_RATE: Record<HeadKey, number> = {
  mp_rotator: 0.4,
  popup_spray: 1.5,
  rotor: 0.3,
  drip: 0.6,
};

const CYCLES_PER_WEEK = 3;

export interface ValveRow {
  zone: number;
  type: string;
  area: number;        // ft²
  heads: number;
  headTypes: string;   // e.g. "2× MP Rotator, 1× Drip"
  minPerCycle: number;
  daysPerWeek: number;
}

export interface MaterialRow {
  brand: string;
  model: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface PdfPlanData {
  address: string;
  muni: RateProfile;
  zones: Zone[];
  heads: Head[];
  savings: { dollarsSaved: number; saved: number; effCost: number };
  partsTotal: number;
  pxPerFt: number;
  generatedAt: string; // pre-formatted date string
  recommendations: { type: 'warn' | 'tip'; text: string }[];
}

// ─── Pure calculation exports (unit-testable, no jsPDF dependency) ────────────

export function buildValveSchedule(
  zones: Zone[],
  heads: Head[],
  pxPerFt: number,
  et: number,
): ValveRow[] {
  const weeklyEt = et / 52;
  return zones.map((z, i) => {
    const zHds = heads.filter((h) => pipPx({ x: h.x, y: h.y }, z.pts));
    const area = Math.round(polyAreaFt(z.pts, pxPerFt));
    const zLabel = ZONE_TYPES[z.type as ZoneTypeKey]?.label ?? z.type;
    const etFactor = ZONE_ET_FACTORS[z.type as ZoneTypeKey] ?? 0.85;

    const typeCounts = zHds.reduce<Record<string, number>>((a, h) => {
      a[h.type] = (a[h.type] || 0) + 1;
      return a;
    }, {});

    const dominantType = (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'mp_rotator') as HeadKey;
    const appRate = APP_RATE[dominantType];
    const weeklyNeed = weeklyEt * etFactor;
    const minPerWeek = (weeklyNeed / appRate) * 60;
    const minPerCycle = Math.max(3, Math.round(minPerWeek / CYCLES_PER_WEEK));

    const headTypeNames = Object.entries(typeCounts)
      .map(([k, n]) => `${n}× ${HEADS[k as HeadKey]?.name ?? k}`)
      .join(', ');

    return {
      zone: i + 1,
      type: zLabel,
      area,
      heads: zHds.length,
      headTypes: headTypeNames || 'none',
      minPerCycle,
      daysPerWeek: CYCLES_PER_WEEK,
    };
  });
}

export function buildMaterialsRows(heads: Head[]): MaterialRow[] {
  const counts = heads.reduce<Record<string, number>>((a, h) => {
    a[h.type] = (a[h.type] || 0) + 1;
    return a;
  }, {});
  return Object.entries(counts).map(([k, qty]) => {
    const spec = HEADS[k as HeadKey];
    return { brand: spec.brand, model: spec.name, qty, unitPrice: spec.price, total: spec.price * qty };
  });
}

export function calcPaybackYears(partsTotal: number, dollarsSaved: number): number | null {
  if (dollarsSaved <= 0) return null;
  return Math.round((partsTotal / dollarsSaved) * 10) / 10;
}

// ─── jsPDF rendering ──────────────────────────────────────────────────────────

const TEAL = [15, 118, 110] as const;    // emerald-700
const TEAL_LIGHT = [204, 251, 241] as const;  // emerald-100
const SLATE = [30, 41, 59] as const;     // slate-800
const GRAY = [100, 116, 139] as const;   // slate-500
const WHITE = [255, 255, 255] as const;
const AMBER = [180, 83, 9] as const;     // amber-800

type RGB = readonly [number, number, number];

function hex(doc: JsPDF, fill: RGB) {
  doc.setFillColor(fill[0], fill[1], fill[2]);
}

function color(doc: JsPDF, fill: RGB) {
  doc.setTextColor(fill[0], fill[1], fill[2]);
}

/** Draws a simple table, returns the y position after the last row. */
function drawTable(
  doc: JsPDF,
  headers: string[],
  rows: string[][],
  x: number,
  y: number,
  colWidths: number[],
  totalWidth: number,
): number {
  const ROW_H = 7.5;
  const HEAD_H = 8.5;

  // header row
  hex(doc, TEAL);
  doc.rect(x, y, totalWidth, HEAD_H, 'F');
  color(doc, WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let cx = x + 2;
  headers.forEach((h, i) => {
    doc.text(h, cx, y + 5.8);
    cx += colWidths[i];
  });

  // data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  rows.forEach((row, ri) => {
    const ry = y + HEAD_H + ri * ROW_H;
    if (ri % 2 === 0) {
      hex(doc, TEAL_LIGHT);
      doc.rect(x, ry, totalWidth, ROW_H, 'F');
    }
    color(doc, SLATE);
    cx = x + 2;
    row.forEach((cell, ci) => {
      doc.text(String(cell), cx, ry + 5.2);
      cx += colWidths[ci];
    });
  });

  return y + HEAD_H + rows.length * ROW_H + 2;
}

/** Generates and immediately triggers download of the PDF blueprint. */
export async function generatePdf(data: PdfPlanData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = 215.9;
  const MARGIN = 14;
  const CW = W - MARGIN * 2;
  let y = 0;

  // ── Header bar ───────────────────────────────────────────────────────────────
  hex(doc, TEAL);
  doc.rect(0, 0, W, 26, 'F');
  color(doc, WHITE);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('SprinklerSmart', MARGIN, 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Irrigation Blueprint  ·  Smart Water Planning Report', MARGIN, 18);
  color(doc, [180, 238, 220] as const);
  doc.setFontSize(7.5);
  doc.text(`Generated ${data.generatedAt}`, W - MARGIN, 18, { align: 'right' });

  y = 32;

  // ── Property / municipality block ─────────────────────────────────────────
  color(doc, SLATE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Overview', MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  color(doc, GRAY);
  if (data.address.trim()) {
    doc.text(`Address:  ${data.address}`, MARGIN, y);
    y += 5;
  }
  doc.text(`Municipality:  ${data.muni.name}    Water Rate:  $${data.muni.rate.toFixed(2)} / 1,000 gal`, MARGIN, y);
  y += 5;

  // ── Summary stat boxes ────────────────────────────────────────────────────
  y += 3;
  const BOX_W = CW / 3 - 2;
  const BOX_H = 18;
  const stats = [
    { label: 'Total Area', value: `${Math.round(data.zones.reduce((s, z) => s + polyAreaFt(z.pts, data.pxPerFt), 0)).toLocaleString()} ft²` },
    { label: 'Sprinkler Heads', value: String(data.heads.length) },
    { label: 'Zones', value: String(data.zones.length) },
    { label: 'Annual Water Cost', value: `$${Math.round(data.savings.effCost).toLocaleString()}` },
    { label: 'Annual Savings', value: `$${Math.round(data.savings.dollarsSaved).toLocaleString()}` },
    { label: 'Est. Payback', value: calcPaybackYears(data.partsTotal, data.savings.dollarsSaved) != null ? `${calcPaybackYears(data.partsTotal, data.savings.dollarsSaved)} yrs` : '—' },
  ];

  const STAT_COLS = 3;
  stats.forEach((s, i) => {
    const col = i % STAT_COLS;
    const row = Math.floor(i / STAT_COLS);
    const bx = MARGIN + col * (BOX_W + 2);
    const by = y + row * (BOX_H + 2);
    hex(doc, TEAL_LIGHT);
    doc.rect(bx, by, BOX_W, BOX_H, 'F');
    color(doc, GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label.toUpperCase(), bx + 4, by + 5.5);
    color(doc, SLATE);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(s.value, bx + 4, by + 13.5);
  });

  y += Math.ceil(stats.length / STAT_COLS) * (BOX_H + 2) + 6;

  // ── Valve schedule ────────────────────────────────────────────────────────
  color(doc, SLATE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Valve Schedule', MARGIN, y);
  y += 5;

  const valveRows = buildValveSchedule(data.zones, data.heads, data.pxPerFt, data.muni.et);
  if (valveRows.length === 0) {
    color(doc, GRAY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.text('No zones drawn — schedule will appear once zones are added.', MARGIN, y);
    y += 8;
  } else {
    const vsHeaders = ['Zone', 'Type', 'Area (ft²)', 'Heads', 'Head Types', 'Min/Cycle', 'Days/Wk'];
    const vsColW = [12, 36, 22, 14, 62, 22, 18];
    const vsRows = valveRows.map((r) => [
      String(r.zone),
      r.type,
      r.area.toLocaleString(),
      String(r.heads),
      r.headTypes,
      String(r.minPerCycle),
      String(r.daysPerWeek),
    ]);
    y = drawTable(doc, vsHeaders, vsRows, MARGIN, y, vsColW, CW);
    y += 4;
  }

  // ── Page 2 if needed ──────────────────────────────────────────────────────
  if (y > 195) {
    doc.addPage();
    y = 15;
  }

  // ── Materials list ────────────────────────────────────────────────────────
  color(doc, SLATE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Materials & Cost Estimate', MARGIN, y);
  y += 5;

  const mats = buildMaterialsRows(data.heads);
  if (mats.length === 0) {
    color(doc, GRAY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.text('No heads placed — parts list will appear once heads are added.', MARGIN, y);
    y += 8;
  } else {
    const matHeaders = ['Brand / Model', 'Qty', 'Unit Price', 'Line Total'];
    const matColW = [100, 18, 28, 42];
    const matRows = mats.map((r) => [r.brand, String(r.qty), `$${r.unitPrice.toFixed(2)}`, `$${r.total.toFixed(2)}`]);
    matRows.push(['', '', 'TOTAL', `$${data.partsTotal.toFixed(2)}`]);
    y = drawTable(doc, matHeaders, matRows, MARGIN, y, matColW, CW);
    y += 4;
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  if (data.recommendations.length > 0) {
    if (y > 210) { doc.addPage(); y = 15; }
    color(doc, SLATE);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Smart Recommendations', MARGIN, y);
    y += 5;
    data.recommendations.forEach((r) => {
      if (y > 255) { doc.addPage(); y = 15; }
      color(doc, r.type === 'warn' ? AMBER : TEAL);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(r.type === 'warn' ? '⚠' : '✓', MARGIN, y);
      color(doc, SLATE);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(r.text, CW - 8);
      doc.text(lines, MARGIN + 5, y);
      y += lines.length * 4.5 + 2;
    });
    y += 3;
  }

  // ── Rebate notice ─────────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 15; }
  hex(doc, [248, 250, 252] as const);
  doc.rect(MARGIN, y, CW, 22, 'F');
  color(doc, TEAL);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Water Efficiency Rebate Opportunity', MARGIN + 4, y + 7);
  color(doc, GRAY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const rebateText = `${data.muni.name} may offer water-efficiency rebates for irrigation upgrades. Contact your local water authority to verify eligibility. Bring this blueprint and your materials receipts when applying.`;
  const rebateLines = doc.splitTextToSize(rebateText, CW - 8);
  doc.text(rebateLines, MARGIN + 4, y + 13);
  y += 28;

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    color(doc, GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SprinklerSmart.app  ·  Smart Irrigation Planning', MARGIN, 275);
    doc.text(`Page ${p} of ${pageCount}`, W - MARGIN, 275, { align: 'right' });
    hex(doc, TEAL);
    doc.rect(0, 278, W, 1.5, 'F');
  }

  const filename = data.address.trim()
    ? `sprinkler-plan-${data.address.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}.pdf`
    : `sprinkler-plan-${data.muni.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;

  doc.save(filename);
}
