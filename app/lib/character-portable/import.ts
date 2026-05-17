import { ZodError } from "zod";
import type {
  Archetype,
  Armor,
  Clan,
  Discipline,
  MeritFlaw,
  Weapon,
} from "~/lib/api/catalog/catalog.types";
import type { CharacterInput } from "~/lib/api/characters/characters.types";
import {
  PortableCharacterSchema,
  type PortableCharacter,
} from "./schema";

export interface PortableCatalogs {
  clans: Clan[];
  archetypes: Archetype[];
  disciplines: Discipline[];
  meritsFlaws: MeritFlaw[];
  weapons: Weapon[];
  armors: Armor[];
}

export type WarningSeverity = "error" | "warning" | "info";

export interface ImportWarning {
  /** Severidad: 'error' bloquea, 'warning' continúa, 'info' solo notifica. */
  severity: WarningSeverity;
  /** Sección/campo afectado para agrupar visualmente. */
  field: string;
  /** Mensaje al usuario. */
  message: string;
}

export interface ImportResult {
  input: CharacterInput;
  warnings: ImportWarning[];
  /** True si hay al menos un warning de severidad 'error'. */
  hasBlockingErrors: boolean;
}

/**
 * Errores de parseo (JSON mal formado o Zod). Distintos de los warnings
 * normales: un parse fallido bloquea la importación sin opciones.
 */
export class PortableParseError extends Error {
  warnings: ImportWarning[];
  constructor(message: string, warnings: ImportWarning[]) {
    super(message);
    this.warnings = warnings;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-validación: análisis del JSON crudo para detectar campos
// desconocidos, valores fuera de rango, claves faltantes, etc. antes
// del parse de Zod (que es más estricto y termina en una excepción).
// ─────────────────────────────────────────────────────────────────────────────

/** Lista canónica de campos top-level que conoce el schema. */
const KNOWN_TOP_KEYS = new Set([
  "$schema",
  "version",
  "exportedAt",
  "exportedFrom",
  "platformUrl",
  "name",
  "concept",
  "chronicleName",
  "generation",
  "haven",
  "clanName",
  "natureName",
  "demeanorName",
  "strength",
  "dexterity",
  "stamina",
  "charisma",
  "manipulation",
  "appearance",
  "perception",
  "intelligence",
  "wits",
  "virtueScheme",
  "conscience",
  "selfControl",
  "courage",
  "humanity",
  "willpowerMax",
  "willpowerCurrent",
  "bloodPool",
  "healthBruised",
  "healthHurt",
  "healthInjured",
  "healthWounded",
  "healthMauled",
  "healthCrippled",
  "healthIncapacitated",
  "experience",
  "notes",
  "abilities",
  "backgrounds",
  "disciplines",
  "meritsFlaws",
  "weapons",
  "armors",
]);

/** Campos obligatorios fuera de `version` (que se valida aparte). Si
 *  faltan o están vacíos => error bloqueante. */
const REQUIRED_FIELDS = ["name"];

/** Campos recomendados (no obligatorios). Si faltan, warning informativo. */
const RECOMMENDED_FIELDS: Array<{ key: string; label: string }> = [
  { key: "clanName", label: "Clan" },
  { key: "natureName", label: "Naturaleza" },
  { key: "demeanorName", label: "Conducta" },
  { key: "strength", label: "Fuerza" },
  { key: "dexterity", label: "Destreza" },
  { key: "stamina", label: "Resistencia" },
  { key: "charisma", label: "Carisma" },
  { key: "manipulation", label: "Manipulación" },
  { key: "appearance", label: "Apariencia" },
  { key: "perception", label: "Percepción" },
  { key: "intelligence", label: "Inteligencia" },
  { key: "wits", label: "Astucia" },
  { key: "willpowerMax", label: "Voluntad permanente" },
  { key: "willpowerCurrent", label: "Voluntad actual" },
  { key: "humanity", label: "Humanidad/Senda" },
  { key: "bloodPool", label: "Reserva de sangre" },
];

/**
 * Analiza el JSON crudo (antes de Zod) y devuelve warnings sobre campos
 * faltantes, tipos incorrectos, claves desconocidas, etc.
 */
function preValidate(raw: unknown): ImportWarning[] {
  const out: ImportWarning[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    out.push({
      severity: "error",
      field: "raíz",
      message: "El archivo no contiene un objeto JSON válido.",
    });
    return out;
  }
  const obj = raw as Record<string, unknown>;

  // Versión
  if (obj.version === undefined) {
    out.push({
      severity: "error",
      field: "version",
      message:
        "Falta `version`. El archivo no es un export válido de Distop-IA.",
    });
  } else if (obj.version !== 1) {
    out.push({
      severity: "error",
      field: "version",
      message: `Versión no soportada: ${JSON.stringify(obj.version)}. Sólo se soporta version 1.`,
    });
  }

  // Campos requeridos
  for (const k of REQUIRED_FIELDS) {
    if (obj[k] === undefined || obj[k] === null || obj[k] === "") {
      out.push({
        severity: "error",
        field: k,
        message: `Falta el campo obligatorio \`${k}\`.`,
      });
    }
  }

  // Campos recomendados ausentes
  for (const r of RECOMMENDED_FIELDS) {
    if (obj[r.key] === undefined || obj[r.key] === null) {
      out.push({
        severity: "warning",
        field: r.key,
        message: `Campo opcional ausente: ${r.label}. Se importará con valor por defecto (0 / vacío).`,
      });
    }
  }

  // Claves no reconocidas
  for (const k of Object.keys(obj)) {
    if (!KNOWN_TOP_KEYS.has(k)) {
      out.push({
        severity: "info",
        field: k,
        message: `Clave desconocida \`${k}\` ignorada.`,
      });
    }
  }

  // Análisis de arrays: cuántos items y si alguno es inválido a primera vista
  const arrayFields: Array<{
    key: string;
    label: string;
    requiredFields: string[];
  }> = [
    {
      key: "abilities",
      label: "Habilidades",
      requiredFields: ["category", "name", "value"],
    },
    {
      key: "backgrounds",
      label: "Trasfondos",
      requiredFields: ["name", "level"],
    },
    {
      key: "disciplines",
      label: "Disciplinas",
      requiredFields: ["name", "level"],
    },
    {
      key: "meritsFlaws",
      label: "Méritos/Defectos",
      requiredFields: ["name"],
    },
    { key: "weapons", label: "Armas", requiredFields: ["name"] },
    { key: "armors", label: "Armaduras", requiredFields: ["name"] },
  ];
  for (const af of arrayFields) {
    const v = obj[af.key];
    if (v === undefined || v === null) continue;
    if (!Array.isArray(v)) {
      out.push({
        severity: "error",
        field: af.key,
        message: `\`${af.key}\` debería ser un array, llegó ${typeof v}.`,
      });
      continue;
    }
    v.forEach((item, idx) => {
      if (!item || typeof item !== "object") {
        out.push({
          severity: "warning",
          field: `${af.key}[${idx}]`,
          message: `${af.label}: entrada #${idx + 1} no es un objeto, se descarta.`,
        });
        return;
      }
      const it = item as Record<string, unknown>;
      for (const rf of af.requiredFields) {
        if (it[rf] === undefined || it[rf] === null || it[rf] === "") {
          out.push({
            severity: "warning",
            field: `${af.key}[${idx}]`,
            message: `${af.label}: entrada #${idx + 1} sin \`${rf}\`. Se descartará.`,
          });
        }
      }
    });
  }

  return out;
}

/**
 * Parsea el JSON con Zod y emite warnings derivados del análisis previo.
 * Si Zod falla, lanza `PortableParseError` con los warnings acumulados.
 */
export function parsePortableJson(raw: unknown): {
  portable: PortableCharacter;
  warnings: ImportWarning[];
} {
  const warnings = preValidate(raw);

  // Si la pre-validación encontró errores fatales, abortamos.
  if (warnings.some((w) => w.severity === "error")) {
    throw new PortableParseError(
      "El archivo tiene errores que impiden la importación.",
      warnings,
    );
  }

  // Zod hace el cast final con coerción mínima y aplica los rangos.
  const result = PortableCharacterSchema.safeParse(raw);
  if (!result.success) {
    const zodWarnings = zodErrorToWarnings(result.error);
    throw new PortableParseError(
      "El archivo no cumple con el esquema esperado.",
      [...warnings, ...zodWarnings],
    );
  }

  return { portable: result.data, warnings };
}

function zodErrorToWarnings(err: ZodError): ImportWarning[] {
  return err.issues.map((iss) => ({
    severity: "error" as const,
    field: iss.path.length ? iss.path.join(".") : "raíz",
    message: iss.message,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolver de catálogos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resuelve nombres del JSON portable contra el catálogo del servidor y
 * devuelve un `CharacterInput` listo para `POST /characters`. Acumula
 * warnings adicionales generados durante la resolución (catálogos no
 * encontrados, items omitidos por nombre).
 */
export function resolvePortableToInput(
  portable: PortableCharacter,
  catalogs: PortableCatalogs,
  prevWarnings: ImportWarning[] = [],
): ImportResult {
  const warnings: ImportWarning[] = [...prevWarnings];

  const findByName = <T extends { id: string; name: string }>(
    list: T[],
    name: string,
  ): T | null =>
    list.find(
      (x) => x.name.localeCompare(name, "es", { sensitivity: "base" }) === 0,
    ) ?? null;

  // ── Identidad y catálogo principal ───────────────────────────
  let clanId: string | undefined;
  if (portable.clanName) {
    const clan = findByName(catalogs.clans, portable.clanName);
    if (clan) clanId = clan.id;
    else
      warnings.push({
        severity: "warning",
        field: "clanName",
        message: `Clan "${portable.clanName}" no existe en este catálogo. Se importa sin clan.`,
      });
  }

  let natureId: string | undefined;
  if (portable.natureName) {
    const arch = findByName(catalogs.archetypes, portable.natureName);
    if (arch) natureId = arch.id;
    else
      warnings.push({
        severity: "warning",
        field: "natureName",
        message: `Naturaleza "${portable.natureName}" no encontrada.`,
      });
  }

  let demeanorId: string | undefined;
  if (portable.demeanorName) {
    const arch = findByName(catalogs.archetypes, portable.demeanorName);
    if (arch) demeanorId = arch.id;
    else
      warnings.push({
        severity: "warning",
        field: "demeanorName",
        message: `Conducta "${portable.demeanorName}" no encontrada.`,
      });
  }

  // ── Disciplinas ──────────────────────────────────────────────
  const disciplines = (portable.disciplines ?? [])
    .map((d) => {
      const disc = findByName(catalogs.disciplines, d.name);
      if (!disc) {
        warnings.push({
          severity: "warning",
          field: "disciplines",
          message: `Disciplina "${d.name}" no existe en este catálogo. Se omite.`,
        });
        return null;
      }
      return { disciplineId: disc.id, level: d.level };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // ── Méritos y defectos ───────────────────────────────────────
  const meritsFlaws = (portable.meritsFlaws ?? [])
    .map((m) => {
      const mf = findByName(catalogs.meritsFlaws, m.name);
      if (!mf) {
        warnings.push({
          severity: "warning",
          field: "meritsFlaws",
          message: `Mérito/defecto "${m.name}" no existe. Se omite.`,
        });
        return null;
      }
      return { meritFlawId: mf.id, notes: m.notes ?? null };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // ── Armas ────────────────────────────────────────────────────
  const weapons = (portable.weapons ?? [])
    .map((w, idx) => {
      const wp = findByName(catalogs.weapons, w.name);
      if (!wp) {
        warnings.push({
          severity: "warning",
          field: "weapons",
          message: `Arma "${w.name}" no existe. Se omite.`,
        });
        return null;
      }
      return {
        weaponId: wp.id,
        notes: w.notes ?? null,
        order: w.order ?? idx,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // ── Armaduras ────────────────────────────────────────────────
  const armors = (portable.armors ?? [])
    .map((a, idx) => {
      const ar = findByName(catalogs.armors, a.name);
      if (!ar) {
        warnings.push({
          severity: "warning",
          field: "armors",
          message: `Armadura "${a.name}" no existe. Se omite.`,
        });
        return null;
      }
      return {
        armorId: ar.id,
        notes: a.notes ?? null,
        order: a.order ?? idx,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const input: CharacterInput = {
    name: portable.name,
    concept: portable.concept ?? undefined,
    chronicleName: portable.chronicleName ?? undefined,
    generation: portable.generation ?? undefined,
    haven: portable.haven ?? undefined,
    clanId,
    natureId,
    demeanorId,

    strength: portable.strength,
    dexterity: portable.dexterity,
    stamina: portable.stamina,
    charisma: portable.charisma,
    manipulation: portable.manipulation,
    appearance: portable.appearance,
    perception: portable.perception,
    intelligence: portable.intelligence,
    wits: portable.wits,

    virtueScheme: portable.virtueScheme,
    conscience: portable.conscience,
    selfControl: portable.selfControl,
    courage: portable.courage,

    humanity: portable.humanity,
    willpowerMax: portable.willpowerMax,
    willpowerCurrent: portable.willpowerCurrent,
    bloodPool: portable.bloodPool,

    healthBruised: portable.healthBruised,
    healthHurt: portable.healthHurt,
    healthInjured: portable.healthInjured,
    healthWounded: portable.healthWounded,
    healthMauled: portable.healthMauled,
    healthCrippled: portable.healthCrippled,
    healthIncapacitated: portable.healthIncapacitated,

    experience: portable.experience,
    notes: portable.notes ?? undefined,

    abilities: (portable.abilities ?? []).map((a) => ({
      category: a.category,
      name: a.name,
      value: a.value,
      specialty: a.specialty ?? null,
    })),
    backgrounds: (portable.backgrounds ?? []).map((b) => ({
      name: b.name,
      level: b.level,
      notes: b.notes ?? null,
    })),
    disciplines,
    meritsFlaws,
    weapons,
    armors,
  };

  const hasBlockingErrors = warnings.some((w) => w.severity === "error");
  return { input, warnings, hasBlockingErrors };
}
