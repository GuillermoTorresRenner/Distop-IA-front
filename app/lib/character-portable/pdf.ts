import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Character } from "~/lib/api/characters/characters.types";
import {
  ATTRIBUTES,
  ATTR_GROUP_LABEL,
  TALENTS,
  SKILLS,
  KNOWLEDGES,
} from "~/lib/vtm/abilities";
import { platformAttribution } from "./platform";

/**
 * Genera un PDF de la hoja de personaje apegado al espíritu del manual V20.
 *
 * Diseño:
 *   - A4 vertical, márgenes amplios.
 *   - Helvetica (fuente "core" portable de pdf-lib sin embed).
 *   - Cada `drawXxx(topY)` devuelve el `bottomY` real consumido para que
 *     la siguiente sección arranque sin solapamientos, incluyendo cuando
 *     hay especialidades o líneas extra.
 *   - Las habilidades del catálogo se imprimen siempre (las de valor 0
 *     quedan con 5 círculos vacíos), tal como pide la hoja oficial.
 *   - Si la hoja excede el A4, agrega páginas adicionales automáticamente
 *     (notas) sin solapar.
 */
export async function characterToPdf(c: Character): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Hoja · ${c.name}`);
  pdf.setSubject("Vampiro: la Mascarada V20");
  pdf.setCreator("Distop-IA VTT");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const page = pdf.addPage([595.28, 841.89]); // A4
  const ctx: DrawCtx = {
    page,
    font,
    bold,
    italic,
    margin: 36,
    width: 595.28,
    height: 841.89,
  };

  // Top de página = height - margin superior. Cada sección recibe el topY
  // y devuelve el bottomY real (más bajo, números menores).
  let y = ctx.height - ctx.margin;
  y = drawHeader(ctx, c, y);
  y = drawIdentity(ctx, c, y);
  y = drawAttributes(ctx, c, y);
  y = drawAbilities(ctx, c, y);
  y = drawAdvantages(ctx, c, y);
  y = drawState(ctx, c, y);
  y = drawHealth(ctx, c, y);
  y = drawEquipment(ctx, c, y);

  if ((c.notes ?? "").trim().length > 0) {
    drawNotes(pdf, font, bold, italic, c.notes ?? "");
  }

  // Footer "by distop-ia.com" en todas las páginas. Los visores de PDF
  // detectan automáticamente URLs en el texto como enlaces; además
  // registramos una anotación link explícita para hacerlo robusto.
  stampFooter(pdf, font, italic);

  return pdf.save();
}

/**
 * Sella un footer común a todas las páginas con la atribución a la
 * plataforma (texto + link clickeable). La URL se lee del entorno via
 * `platformAttribution()`.
 */
function stampFooter(pdf: PDFDocument, font: PDFFont, italic: PDFFont) {
  const { label, url } = platformAttribution();
  const text = `Generado por Distop-IA VTT · ${label}`;
  const size = 8;
  const margin = 36;
  for (const page of pdf.getPages()) {
    const { width } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = (width - textWidth) / 2;
    const y = margin / 2;
    page.drawText(text, {
      x,
      y,
      size,
      font: italic,
      color: COLOR_MUTED,
    });
    // Anotación de enlace clickeable sobre el bounding box del texto.
    try {
      const linkAnnot = pdf.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [x, y - 2, x + textWidth, y + size + 2],
        Border: [0, 0, 0],
        A: {
          Type: "Action",
          S: "URI",
          URI: url,
        },
      });
      const linkRef = pdf.context.register(linkAnnot);
      const node = page.node;
      const existing = node.Annots();
      if (existing) {
        existing.push(linkRef);
      } else {
        node.set(pdf.context.obj("Annots"), pdf.context.obj([linkRef]));
      }
    } catch {
      // Si la API de bajo nivel cambia, el texto sigue visible aunque
      // no sea clickeable. No bloqueamos la exportación por esto.
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos y constantes de dibujo
// ─────────────────────────────────────────────────────────────────────────────

interface DrawCtx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  margin: number;
  width: number;
  height: number;
}

const COLOR_BLOOD = rgb(0.55, 0.04, 0.08);
const COLOR_INK = rgb(0.08, 0.06, 0.05);
const COLOR_MUTED = rgb(0.4, 0.36, 0.34);
const COLOR_BORDER = rgb(0.7, 0.65, 0.6);

// Altura visual aproximada de cada elemento:
const SECTION_HEADER_TOP_GAP = 8; // espacio antes del título de sección
const SECTION_HEADER_HEIGHT = 14; // título + línea + respiro
const ROW_HEIGHT = 12; // fila de "label + dots"
const SPECIALTY_LINE_HEIGHT = 9; // línea de especialidad bajo el label

// ─────────────────────────────────────────────────────────────────────────────
// Helpers básicos
// ─────────────────────────────────────────────────────────────────────────────

function text(
  ctx: DrawCtx,
  s: string,
  x: number,
  y: number,
  opts: { size?: number; color?: ReturnType<typeof rgb>; font?: PDFFont } = {},
) {
  ctx.page.drawText(s, {
    x,
    y,
    size: opts.size ?? 9,
    color: opts.color ?? COLOR_INK,
    font: opts.font ?? ctx.font,
  });
}

function line(
  ctx: DrawCtx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = COLOR_BORDER,
) {
  ctx.page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    color,
    thickness: 0.5,
  });
}

function rect(
  ctx: DrawCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  color = COLOR_BORDER,
) {
  ctx.page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: color,
    borderWidth: 0.5,
  });
}

/** Círculos clásicos V20: filled hasta `value`, ringed el resto hasta `max`.
 *  Devuelve el ancho total ocupado para que el caller pueda alinearlo. */
function dots(
  ctx: DrawCtx,
  x: number,
  y: number,
  value: number,
  max = 5,
  radius = 2.4,
): number {
  const gap = 1.8;
  for (let i = 0; i < max; i++) {
    const cx = x + i * (radius * 2 + gap) + radius;
    const filled = i < value;
    ctx.page.drawCircle({
      x: cx,
      y,
      size: radius,
      color: filled ? COLOR_INK : undefined,
      borderColor: COLOR_INK,
      borderWidth: 0.6,
    });
  }
  return max * (radius * 2 + gap) - gap;
}

/** Ancho aproximado de un bloque de `max` dots con el radio default. */
function dotsWidth(max: number, radius = 2.4): number {
  const gap = 1.8;
  return max * (radius * 2 + gap) - gap;
}

/**
 * Sub-encabezado de sección (negrita, oscuro). Usado para Físicos/Sociales/
 * Mentales, Talentos/Técnicas/Conocimientos, Trasfondos/Disciplinas/etc.
 */
function subSectionLabel(
  ctx: DrawCtx,
  label: string,
  x: number,
  y: number,
) {
  text(ctx, label, x, y, {
    size: 8.5,
    color: COLOR_INK,
    font: ctx.bold,
  });
}

/**
 * Encabezado de sección rojo + línea horizontal. Devuelve el Y donde puede
 * empezar el contenido de la sección.
 */
function sectionHeader(ctx: DrawCtx, label: string, topY: number): number {
  // Respiro arriba del título.
  const titleY = topY - SECTION_HEADER_TOP_GAP;
  text(ctx, label.toUpperCase(), ctx.margin, titleY, {
    size: 9,
    color: COLOR_BLOOD,
    font: ctx.bold,
  });
  const lineY = titleY - 3;
  line(ctx, ctx.margin, lineY, ctx.width - ctx.margin, lineY, COLOR_BLOOD);
  return lineY - SECTION_HEADER_HEIGHT;
}

/** Campo con label arriba en versalita pequeña y subrayado. */
function labeledField(
  ctx: DrawCtx,
  label: string,
  value: string | null | undefined,
  x: number,
  y: number,
  width: number,
) {
  text(ctx, label.toUpperCase(), x, y + 10, { size: 6.5, color: COLOR_MUTED });
  line(ctx, x, y, x + width, y);
  text(ctx, value ?? "—", x + 2, y + 2, { size: 9 });
}

/**
 * Fila "label en la izquierda, dots a la derecha" dentro de un ancho.
 * Para evitar que los dots pisen la siguiente columna, reservamos un
 * padding derecho fijo (`COL_RIGHT_PAD`). El label se trunca si es muy
 * largo para no chocar contra los dots.
 */
const COL_RIGHT_PAD = 6;
const LABEL_DOTS_GAP = 4;

function labeledDots(
  ctx: DrawCtx,
  label: string,
  value: number,
  x: number,
  y: number,
  width: number,
  max = 5,
) {
  const dw = dotsWidth(max);
  const dotsX = x + width - COL_RIGHT_PAD - dw;
  const labelMaxX = dotsX - LABEL_DOTS_GAP;
  const labelWidth = labelMaxX - x;
  text(ctx, truncateToWidth(ctx.font, label, 8, labelWidth), x, y, {
    size: 8,
  });
  dots(ctx, dotsX, y + 3, value, max);
}

/** Recorta un texto añadiendo "…" si excede `maxWidth` puntos. */
function truncateToWidth(
  font: PDFFont,
  s: string,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(s, size) <= maxWidth) return s;
  const ellipsis = "…";
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = s.slice(0, mid) + ellipsis;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo) + ellipsis;
}

// ─────────────────────────────────────────────────────────────────────────────
// Secciones (todas devuelven el bottomY)
// ─────────────────────────────────────────────────────────────────────────────

function drawHeader(ctx: DrawCtx, c: Character, topY: number): number {
  let y = topY;
  text(ctx, "VAMPIRO LA MASCARADA · HOJA DE PERSONAJE", ctx.margin, y, {
    size: 8,
    color: COLOR_MUTED,
    font: ctx.bold,
  });
  y -= 18;
  text(ctx, c.name.toUpperCase(), ctx.margin, y, {
    size: 18,
    color: COLOR_BLOOD,
    font: ctx.bold,
  });
  y -= 14;
  if (c.concept) {
    text(ctx, c.concept, ctx.margin, y, {
      size: 9,
      color: COLOR_MUTED,
      font: ctx.italic,
    });
    y -= 4;
  }
  return y - 6;
}

function drawIdentity(ctx: DrawCtx, c: Character, topY: number): number {
  let y = sectionHeader(ctx, "Identidad", topY);
  // Aire extra entre el header rojo y la primera fila: `labeledField`
  // dibuja la etiqueta en y+10, así que sin este respiro las pequeñas
  // versalitas (JUGADOR, CRÓNICA, CLAN) tocan la línea de la sección.
  y -= 8;
  const colW = (ctx.width - 2 * ctx.margin - 16) / 3;
  const ROW = 28;

  // Fila 1
  labeledField(ctx, "Jugador", c.user?.nickname ?? c.user?.email ?? "—", ctx.margin, y, colW);
  labeledField(ctx, "Crónica", c.chronicleName ?? "—", ctx.margin + colW + 8, y, colW);
  labeledField(ctx, "Clan", c.clan?.name ?? "—", ctx.margin + (colW + 8) * 2, y, colW);
  y -= ROW;

  // Fila 2
  labeledField(ctx, "Naturaleza", c.nature?.name ?? "—", ctx.margin, y, colW);
  labeledField(ctx, "Conducta", c.demeanor?.name ?? "—", ctx.margin + colW + 8, y, colW);
  labeledField(
    ctx,
    "Generación",
    c.generation != null ? String(c.generation) : "—",
    ctx.margin + (colW + 8) * 2,
    y,
    colW,
  );
  y -= ROW;

  // Fila 3 (refugio a todo el ancho)
  labeledField(ctx, "Refugio", c.haven ?? "—", ctx.margin, y, ctx.width - 2 * ctx.margin);
  y -= ROW;

  return y;
}

function drawAttributes(ctx: DrawCtx, c: Character, topY: number): number {
  let y = sectionHeader(ctx, "Atributos", topY);
  const groups = ["physical", "social", "mental"] as const;
  const colW = (ctx.width - 2 * ctx.margin - 16) / 3;
  const groupTopY = y;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const x = ctx.margin + (colW + 8) * i;
    let cy = groupTopY;
    subSectionLabel(ctx, ATTR_GROUP_LABEL[g], x, cy);
    cy -= ROW_HEIGHT;
    for (const a of ATTRIBUTES.filter((at) => at.group === g)) {
      const v = (c as unknown as Record<string, number>)[a.key] ?? 0;
      labeledDots(ctx, a.label, v, x, cy, colW);
      cy -= ROW_HEIGHT;
    }
  }
  // 3 atributos por grupo + título + 1 respiro
  return groupTopY - ROW_HEIGHT * 4 - 4;
}

function drawAbilities(ctx: DrawCtx, c: Character, topY: number): number {
  let y = sectionHeader(ctx, "Habilidades", topY);
  const cats = [
    { title: "Talentos", names: TALENTS, key: "TALENT" as const },
    { title: "Técnicas", names: SKILLS, key: "SKILL" as const },
    { title: "Conocimientos", names: KNOWLEDGES, key: "KNOWLEDGE" as const },
  ];
  const colW = (ctx.width - 2 * ctx.margin - 16) / 3;
  const startY = y;

  // Cada columna avanza independientemente; el bottom de la sección es el
  // menor (más bajo) de las tres columnas.
  const bottoms: number[] = [];
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const x = ctx.margin + (colW + 8) * i;
    let cy = startY;

    subSectionLabel(ctx, cat.title, x, cy);
    cy -= ROW_HEIGHT;

    for (const name of cat.names) {
      const a = c.abilities.find(
        (ab) => ab.category === cat.key && ab.name === name,
      );
      // Importante: imprimir TODAS las habilidades, aunque value=0 (la hoja
      // oficial las lista para que el jugador vea la lista completa).
      labeledDots(ctx, name, a?.value ?? 0, x, cy, colW);
      cy -= ROW_HEIGHT;

      // Si hay especialidad declarada, una línea pequeña debajo del label.
      if (a?.specialty && a.specialty.trim().length > 0) {
        const preview = a.specialty
          .replace(/[*_`#>~\[\]\n]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 36);
        text(ctx, `· ${preview}`, x + 6, cy + 2, {
          size: 6.5,
          color: COLOR_MUTED,
          font: ctx.italic,
        });
        cy -= SPECIALTY_LINE_HEIGHT;
      }
    }
    bottoms.push(cy);
  }
  return Math.min(...bottoms) - 4;
}

function drawAdvantages(ctx: DrawCtx, c: Character, topY: number): number {
  let y = sectionHeader(ctx, "Ventajas", topY);
  const colW = (ctx.width - 2 * ctx.margin - 16) / 3;
  const startY = y;
  const bottoms: number[] = [];

  // Trasfondos
  let yA = startY;
  subSectionLabel(ctx, "Trasfondos", ctx.margin, yA);
  yA -= ROW_HEIGHT;
  if (c.backgrounds.length === 0) {
    text(ctx, "—", ctx.margin, yA, { size: 8, color: COLOR_MUTED });
    yA -= ROW_HEIGHT;
  } else {
    for (const b of c.backgrounds.slice(0, 8)) {
      labeledDots(ctx, b.name, b.level, ctx.margin, yA, colW);
      yA -= ROW_HEIGHT;
    }
  }
  bottoms.push(yA);

  // Disciplinas
  const xD = ctx.margin + colW + 8;
  let yD = startY;
  subSectionLabel(ctx, "Disciplinas", xD, yD);
  yD -= ROW_HEIGHT;
  if (c.disciplines.length === 0) {
    text(ctx, "—", xD, yD, { size: 8, color: COLOR_MUTED });
    yD -= ROW_HEIGHT;
  } else {
    for (const d of c.disciplines.slice(0, 8)) {
      const name = d.discipline?.name ?? "—";
      labeledDots(ctx, name, d.level, xD, yD, colW);
      yD -= ROW_HEIGHT;
    }
  }
  bottoms.push(yD);

  // Méritos / Defectos
  const xM = ctx.margin + (colW + 8) * 2;
  let yM = startY;
  subSectionLabel(ctx, "Méritos · Defectos", xM, yM);
  yM -= ROW_HEIGHT;
  if (c.meritsFlaws.length === 0) {
    text(ctx, "—", xM, yM, { size: 8, color: COLOR_MUTED });
    yM -= ROW_HEIGHT;
  } else {
    for (const mf of c.meritsFlaws.slice(0, 8)) {
      const name = mf.meritFlaw?.name ?? "—";
      const kindLetter = mf.meritFlaw?.kind === "FLAW" ? " (D)" : " (M)";
      const value = mf.meritFlaw?.value ?? 0;
      text(ctx, `${name}${kindLetter}`, xM, yM, { size: 8 });
      const sign = value > 0 ? `+${value}` : String(value);
      text(ctx, sign, xM + colW - 16, yM, {
        size: 8,
        color: value < 0 ? COLOR_BLOOD : COLOR_INK,
      });
      yM -= ROW_HEIGHT;
    }
  }
  bottoms.push(yM);

  return Math.min(...bottoms) - 6;
}

function drawState(ctx: DrawCtx, c: Character, topY: number): number {
  let y = sectionHeader(ctx, "Estado", topY);
  // 3 columnas (Sangre / Humanidad-Senda / Voluntad), 10 dots cada una.
  // Experiencia va sola al final con su label fijo.
  const usable = ctx.width - 2 * ctx.margin;
  const colW = (usable - 16 - 90) / 3; // 90pt para "Experiencia: 9999"

  labeledDots(ctx, "Sangre", c.bloodPool, ctx.margin, y, colW, 10);
  labeledDots(
    ctx,
    c.virtueScheme === "PATH" ? "Senda" : "Humanidad",
    c.humanity,
    ctx.margin + colW + 8,
    y,
    colW,
    10,
  );
  labeledDots(
    ctx,
    `Voluntad ${c.willpowerCurrent}/${c.willpowerMax}`,
    c.willpowerCurrent,
    ctx.margin + (colW + 8) * 2,
    y,
    colW,
    10,
  );
  text(ctx, `Experiencia: ${c.experience}`, ctx.margin + (colW + 8) * 3, y, {
    size: 8,
  });
  y -= ROW_HEIGHT + 4;

  // Fila 2 — Virtudes (sólo en esquema Humanidad). 3 columnas anchas con 5 dots.
  if (c.virtueScheme === "HUMANITY") {
    const vColW = (usable - 16) / 3;
    labeledDots(ctx, "Conciencia", c.conscience, ctx.margin, y, vColW);
    labeledDots(
      ctx,
      "Autocontrol",
      c.selfControl,
      ctx.margin + vColW + 8,
      y,
      vColW,
    );
    labeledDots(
      ctx,
      "Valor",
      c.courage,
      ctx.margin + (vColW + 8) * 2,
      y,
      vColW,
    );
    y -= ROW_HEIGHT;
  }
  return y - 4;
}

function drawHealth(ctx: DrawCtx, c: Character, topY: number): number {
  let y = sectionHeader(ctx, "Salud", topY);
  const levels: Array<{ key: keyof Character; label: string; hint: string }> = [
    { key: "healthBruised", label: "Contusionado", hint: "0" },
    { key: "healthHurt", label: "Magullado", hint: "-1" },
    { key: "healthInjured", label: "Herido", hint: "-1" },
    { key: "healthWounded", label: "Lesionado", hint: "-2" },
    { key: "healthMauled", label: "Malherido", hint: "-2" },
    { key: "healthCrippled", label: "Tullido", hint: "-5" },
    { key: "healthIncapacitated", label: "Incapacitado", hint: "—" },
  ];
  const rowH = 13;
  for (const lvl of levels) {
    const v = (c as unknown as Record<string, number>)[lvl.key as string] ?? 0;
    text(ctx, `${lvl.label}  (${lvl.hint})`, ctx.margin, y, { size: 8 });
    // Un solo recuadro por nivel. La glifo dentro indica el grado:
    // vacío = sin daño, "/" = contundente, "X" = letal/agravado.
    const boxX = ctx.margin + 180;
    rect(ctx, boxX, y - 1, 12, 9);
    if (v > 0) {
      const glyph = v === 1 ? "/" : "X";
      text(ctx, glyph, boxX + 3, y + 1, { size: 8, font: ctx.bold });
    }
    y -= rowH;
  }
  return y - 4;
}

function drawEquipment(ctx: DrawCtx, c: Character, topY: number): number {
  let y = sectionHeader(ctx, "Equipo", topY);
  const colW = (ctx.width - 2 * ctx.margin - 8) / 2;
  const startY = y;
  const bottoms: number[] = [];

  // Armas
  let yW = startY;
  subSectionLabel(ctx, "Armas", ctx.margin, yW);
  yW -= ROW_HEIGHT;
  if (c.weapons.length === 0) {
    text(ctx, "—", ctx.margin, yW, { size: 8, color: COLOR_MUTED });
    yW -= ROW_HEIGHT;
  } else {
    for (const w of c.weapons.slice(0, 6)) {
      const w0 = w.weapon;
      const name = w0?.name ?? "—";
      const dmg = w0
        ? `${w0.damageBase === "STRENGTH" ? "Fue" : ""}${
            w0.damageBonus > 0
              ? `+${w0.damageBonus}`
              : w0.damageBonus < 0
                ? w0.damageBonus
                : ""
          }`
        : "";
      text(ctx, `· ${name}`, ctx.margin + 2, yW, { size: 8 });
      if (dmg) text(ctx, dmg, ctx.margin + colW - 30, yW, { size: 8 });
      yW -= 11;
    }
  }
  bottoms.push(yW);

  // Armaduras
  const xA = ctx.margin + colW + 8;
  let yAr = startY;
  subSectionLabel(ctx, "Armaduras", xA, yAr);
  yAr -= ROW_HEIGHT;
  if (c.armors.length === 0) {
    text(ctx, "—", xA, yAr, { size: 8, color: COLOR_MUTED });
    yAr -= ROW_HEIGHT;
  } else {
    for (const a of c.armors.slice(0, 6)) {
      const a0 = a.armor;
      text(ctx, `· ${a0?.name ?? "—"}`, xA + 2, yAr, { size: 8 });
      if (a0) {
        text(ctx, `R${a0.rating} / Pen ${a0.penalty}`, xA + colW - 50, yAr, {
          size: 8,
        });
      }
      yAr -= 11;
    }
  }
  bottoms.push(yAr);

  return Math.min(...bottoms) - 4;
}

function drawNotes(
  pdf: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  italic: PDFFont,
  notes: string,
) {
  let page = pdf.addPage([595.28, 841.89]);
  const margin = 36;
  const pageHeight = 841.89;
  const pageWidth = 595.28;
  let y = pageHeight - margin;

  page.drawText("NOTAS", { x: margin, y, font: bold, size: 14, color: COLOR_BLOOD });
  y -= 18;
  page.drawText(
    "Texto libre del jugador. Markdown se exporta tal cual.",
    { x: margin, y, font: italic, size: 8, color: COLOR_MUTED },
  );
  y -= 16;

  const maxWidth = pageWidth - margin * 2;
  const fontSize = 10;
  const lineH = 13;

  for (const para of notes.split(/\n+/)) {
    const wrapped = wrapText(para, font, fontSize, maxWidth);
    for (const line of wrapped) {
      if (y < margin + lineH) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, font, size: fontSize, color: COLOR_INK });
      y -= lineH;
    }
    y -= 4;
  }
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  if (!text.trim()) return [""];
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}
