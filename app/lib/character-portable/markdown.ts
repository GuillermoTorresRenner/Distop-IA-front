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
 * Genera un Markdown listo para pegar en Obsidian SIN plugins extra:
 *   - Frontmatter YAML con campos clave (Obsidian lo indexa para Bases/Dataview).
 *   - Tablas Markdown estándar para atributos / habilidades.
 *   - Puntos representados como ●○○○○ (caracteres Unicode) para que se vean
 *     legibles sin renderer custom.
 *   - Headings jerárquicos para el outline.
 *   - Notas del jugador al final.
 */
export function characterToMarkdown(c: Character): string {
  const lines: string[] = [];
  // ── Frontmatter ──────────────────────────────────────────────
  lines.push("---");
  lines.push(`title: "${escapeYaml(c.name)}"`);
  lines.push(`tags: [vampiro, mascarada, personaje]`);
  if (c.clan?.name) lines.push(`clan: "${escapeYaml(c.clan.name)}"`);
  if (c.chronicleName) lines.push(`cronica: "${escapeYaml(c.chronicleName)}"`);
  if (c.generation != null) lines.push(`generacion: ${c.generation}`);
  if (c.nature?.name) lines.push(`naturaleza: "${escapeYaml(c.nature.name)}"`);
  if (c.demeanor?.name) lines.push(`conducta: "${escapeYaml(c.demeanor.name)}"`);
  if (c.concept) lines.push(`concepto: "${escapeYaml(c.concept)}"`);
  lines.push(`exportado: "${new Date().toISOString()}"`);
  lines.push("---");
  lines.push("");

  // ── Encabezado ───────────────────────────────────────────────
  lines.push(`# ${c.name}`);
  if (c.concept) lines.push(`*${c.concept}*`);
  lines.push("");

  // ── Identidad ────────────────────────────────────────────────
  lines.push("## Identidad");
  lines.push("");
  lines.push("| Campo | Valor |");
  lines.push("|---|---|");
  lines.push(`| Jugador | ${c.user?.nickname ?? c.user?.email ?? "—"} |`);
  lines.push(`| Crónica | ${c.chronicleName ?? "—"} |`);
  lines.push(`| Clan | ${c.clan?.name ?? "—"} |`);
  lines.push(`| Naturaleza | ${c.nature?.name ?? "—"} |`);
  lines.push(`| Conducta | ${c.demeanor?.name ?? "—"} |`);
  lines.push(`| Generación | ${c.generation ?? "—"} |`);
  lines.push(`| Refugio | ${c.haven ?? "—"} |`);
  lines.push("");

  // ── Atributos ────────────────────────────────────────────────
  lines.push("## Atributos");
  lines.push("");
  lines.push("| Grupo | Atributo | Valor |");
  lines.push("|---|---|---|");
  for (const a of ATTRIBUTES) {
    const v = (c as unknown as Record<string, number>)[a.key] ?? 0;
    lines.push(`| ${ATTR_GROUP_LABEL[a.group]} | ${a.label} | ${dotsString(v)} |`);
  }
  lines.push("");

  // ── Habilidades ──────────────────────────────────────────────
  lines.push("## Habilidades");
  const abilityCats = [
    { title: "Talentos", names: TALENTS, key: "TALENT" as const },
    { title: "Técnicas", names: SKILLS, key: "SKILL" as const },
    { title: "Conocimientos", names: KNOWLEDGES, key: "KNOWLEDGE" as const },
  ];
  for (const cat of abilityCats) {
    lines.push("");
    lines.push(`### ${cat.title}`);
    lines.push("");
    lines.push("| Habilidad | Valor | Especialidad |");
    lines.push("|---|---|---|");
    for (const name of cat.names) {
      const a = c.abilities.find((ab) => ab.category === cat.key && ab.name === name);
      const val = a?.value ?? 0;
      const sp = (a?.specialty ?? "")
        .replace(/\n+/g, " ")
        .replace(/\|/g, "\\|")
        .trim();
      lines.push(`| ${name} | ${dotsString(val)} | ${sp || "—"} |`);
    }
  }
  lines.push("");

  // ── Ventajas ─────────────────────────────────────────────────
  lines.push("## Ventajas");
  lines.push("");
  lines.push("### Trasfondos");
  if (c.backgrounds.length === 0) {
    lines.push("");
    lines.push("*Sin trasfondos.*");
  } else {
    lines.push("");
    lines.push("| Trasfondo | Nivel | Notas |");
    lines.push("|---|---|---|");
    for (const b of c.backgrounds) {
      lines.push(
        `| ${b.name} | ${dotsString(b.level)} | ${escapeCell(b.notes ?? "—")} |`,
      );
    }
  }
  lines.push("");
  lines.push("### Disciplinas");
  if (c.disciplines.length === 0) {
    lines.push("");
    lines.push("*Sin disciplinas.*");
  } else {
    lines.push("");
    lines.push("| Disciplina | Nivel |");
    lines.push("|---|---|");
    for (const d of c.disciplines) {
      lines.push(`| ${d.discipline?.name ?? "—"} | ${dotsString(d.level)} |`);
    }
  }
  lines.push("");
  lines.push("### Méritos y Defectos");
  if (c.meritsFlaws.length === 0) {
    lines.push("");
    lines.push("*Sin méritos ni defectos.*");
  } else {
    lines.push("");
    lines.push("| Tipo | Nombre | Valor | Notas |");
    lines.push("|---|---|---|---|");
    for (const mf of c.meritsFlaws) {
      const m = mf.meritFlaw;
      const kind = m?.kind === "FLAW" ? "Defecto" : "Mérito";
      const v = m?.value ?? 0;
      const sign = v > 0 ? `+${v}` : String(v);
      lines.push(
        `| ${kind} | ${m?.name ?? "—"} | ${sign} | ${escapeCell(mf.notes ?? "—")} |`,
      );
    }
  }
  lines.push("");

  // ── Estado ───────────────────────────────────────────────────
  lines.push("## Estado");
  lines.push("");
  lines.push("| Campo | Valor |");
  lines.push("|---|---|");
  lines.push(`| Sangre | ${dotsString(c.bloodPool, 10)} |`);
  lines.push(
    `| Voluntad | ${dotsString(c.willpowerCurrent, 10)} (max ${c.willpowerMax}) |`,
  );
  lines.push(
    `| ${c.virtueScheme === "PATH" ? "Senda" : "Humanidad"} | ${dotsString(c.humanity, 10)} |`,
  );
  lines.push(`| Experiencia | ${c.experience} |`);
  if (c.virtueScheme === "HUMANITY") {
    lines.push(`| Conciencia | ${dotsString(c.conscience)} |`);
    lines.push(`| Autocontrol | ${dotsString(c.selfControl)} |`);
    lines.push(`| Valor | ${dotsString(c.courage)} |`);
  }
  lines.push("");

  // ── Salud ────────────────────────────────────────────────────
  lines.push("## Salud");
  lines.push("");
  lines.push("| Nivel | Penalizador | Estado |");
  lines.push("|---|---|---|");
  const healthRows: Array<{ key: keyof Character; label: string; hint: string }> = [
    { key: "healthBruised", label: "Contusionado", hint: "0" },
    { key: "healthHurt", label: "Magullado", hint: "-1" },
    { key: "healthInjured", label: "Herido", hint: "-1" },
    { key: "healthWounded", label: "Lesionado", hint: "-2" },
    { key: "healthMauled", label: "Malherido", hint: "-2" },
    { key: "healthCrippled", label: "Tullido", hint: "-5" },
    { key: "healthIncapacitated", label: "Incapacitado", hint: "—" },
  ];
  for (const lvl of healthRows) {
    const v = (c as unknown as Record<string, number>)[lvl.key as string] ?? 0;
    const glyph = v === 0 ? "☐" : v === 1 ? "◐" : "☒";
    lines.push(`| ${lvl.label} | ${lvl.hint} | ${glyph} |`);
  }
  lines.push("");

  // ── Equipo ───────────────────────────────────────────────────
  lines.push("## Equipo");
  lines.push("");
  lines.push("### Armas");
  if (c.weapons.length === 0) {
    lines.push("");
    lines.push("*Sin armas.*");
  } else {
    lines.push("");
    lines.push("| Nombre | Daño | Tipo | Notas |");
    lines.push("|---|---|---|---|");
    for (const w of c.weapons) {
      const w0 = w.weapon;
      const dmg = w0
        ? `${w0.damageBase === "STRENGTH" ? "Fue" : ""}${
            w0.damageBonus > 0 ? `+${w0.damageBonus}` : w0.damageBonus < 0 ? w0.damageBonus : ""
          }`
        : "—";
      const tipo = w0
        ? w0.aggravated
          ? "A"
          : w0.lethal
            ? "L"
            : "C"
        : "—";
      lines.push(
        `| ${w0?.name ?? "—"} | ${dmg} | ${tipo} | ${escapeCell(w.notes ?? "—")} |`,
      );
    }
  }
  lines.push("");
  lines.push("### Armaduras");
  if (c.armors.length === 0) {
    lines.push("");
    lines.push("*Sin armaduras.*");
  } else {
    lines.push("");
    lines.push("| Nombre | Puntuación | Penalización | Notas |");
    lines.push("|---|---|---|---|");
    for (const a of c.armors) {
      const a0 = a.armor;
      lines.push(
        `| ${a0?.name ?? "—"} | ${a0?.rating ?? "—"} | ${a0?.penalty ?? "—"} | ${escapeCell(a.notes ?? "—")} |`,
      );
    }
  }
  lines.push("");

  // ── Notas ────────────────────────────────────────────────────
  lines.push("## Notas");
  lines.push("");
  if (c.notes && c.notes.trim().length > 0) {
    lines.push(c.notes.trim());
  } else {
    lines.push("*Sin notas.*");
  }
  lines.push("");

  // Footer
  const { label, url } = platformAttribution();
  lines.push("---");
  lines.push("");
  lines.push(`*Generado por Distop-IA VTT · by [${label}](${url})*`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Devuelve una representación visual de los puntos (V20 dots) usando
 * caracteres Unicode. `value` filled, resto ringed; total `max`.
 */
function dotsString(value: number, max = 5): string {
  const v = Math.max(0, Math.min(max, value));
  return "●".repeat(v) + "○".repeat(max - v);
}

function escapeYaml(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeCell(s: string): string {
  return s
    .replace(/\n+/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}
