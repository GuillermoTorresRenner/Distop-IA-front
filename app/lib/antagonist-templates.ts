import type {
  CharacterAbility,
  CharacterInput,
  CharacterKind,
} from "~/lib/api/characters/characters.types";

/**
 * Templates rápidos para PNJs y antagonistas comunes de V20.
 * Fuente: Vampiro: La Mascarada · Capítulo Nueve: Antagonistas (págs. 270-282).
 *
 * Cada template aplica atributos, habilidades, humanidad, fuerza de voluntad,
 * notas y (cuando aplica) `chronicleName`/`concept` razonables. NO toca el `name`
 * del personaje — eso lo escribe el narrador.
 *
 * Las Disciplinas vienen como notas porque sus ids vivirán en el catálogo de
 * disciplinas seedeado; el narrador puede añadirlas a mano tras crear el
 * personaje. Esto evita acoplar los templates a IDs específicos del back.
 */

export type AntagonistGroup =
  | "Cazadores"
  | "Ghouls"
  | "Hombres lobo"
  | "Magos"
  | "Hadas"
  | "Fantasmas"
  | "Mortales";

export interface AntagonistTemplate {
  /** id estable para selects */
  id: string;
  /** Nombre del template (Inquisidor, Lupino Veterano…) */
  label: string;
  group: AntagonistGroup;
  /** Tipo sugerido — el narrador puede cambiarlo en el dialog. */
  defaultKind: CharacterKind;
  /** Descripción corta para tooltip / preview. */
  description: string;
  /** Concepto que se aplica al personaje (campo `concept`). */
  concept: string;
  /** Texto a colocar en notas (disciplinas, equipo, fuente). */
  notesTemplate: string;
  /** Función pura que recibe un `CharacterInput` base y devuelve uno con stats. */
  apply: (base: CharacterInput) => CharacterInput;
}

// ────────────────────────────────────────────────────────────────────
// Helpers de construcción
// ────────────────────────────────────────────────────────────────────

interface Stats {
  // Físicos
  strength: number;
  dexterity: number;
  stamina: number;
  // Sociales
  charisma: number;
  manipulation: number;
  appearance: number;
  // Mentales
  perception: number;
  intelligence: number;
  wits: number;

  // Virtudes / estado
  conscience?: number;
  selfControl?: number;
  courage?: number;
  humanity: number;
  willpowerMax: number;
  willpowerCurrent?: number;
  bloodPool?: number;
}

function ability(
  category: CharacterAbility["category"],
  name: string,
  value: number,
): CharacterAbility {
  return { category, name, value };
}

function buildTemplate(
  meta: Omit<AntagonistTemplate, "apply"> & {
    stats: Stats;
    abilities: CharacterAbility[];
  },
): AntagonistTemplate {
  const { stats, abilities, ...rest } = meta;
  return {
    ...rest,
    apply: (base) => ({
      ...base,
      kind: rest.defaultKind,
      concept: rest.concept,
      notes: rest.notesTemplate,
      strength: stats.strength,
      dexterity: stats.dexterity,
      stamina: stats.stamina,
      charisma: stats.charisma,
      manipulation: stats.manipulation,
      appearance: stats.appearance,
      perception: stats.perception,
      intelligence: stats.intelligence,
      wits: stats.wits,
      conscience: stats.conscience ?? 3,
      selfControl: stats.selfControl ?? 3,
      courage: stats.courage ?? 3,
      humanity: stats.humanity,
      willpowerMax: stats.willpowerMax,
      willpowerCurrent: stats.willpowerCurrent ?? stats.willpowerMax,
      bloodPool: stats.bloodPool ?? 0,
      abilities,
    }),
  };
}

// ────────────────────────────────────────────────────────────────────
// Templates
// ────────────────────────────────────────────────────────────────────

export const ANTAGONIST_TEMPLATES: AntagonistTemplate[] = [
  // ── Cazadores ───────────────────────────────────────────────
  buildTemplate({
    id: "inquisidor",
    label: "Inquisidor",
    group: "Cazadores",
    defaultKind: "ANTAGONIST",
    description:
      "Cazador veterano de la Sociedad de Leopoldo; fanático religioso entrenado contra los Condenados.",
    concept: "Cazador de la Sociedad de Leopoldo",
    notesTemplate:
      "Inquisidor de la Sociedad de Leopoldo (V20 p. 271).\n" +
      "Algunos tienen Fe Verdadera 1+; humanidad puede ir de 5 a 10.\n" +
      "Equipo: bastón-estoque, rosarios, crucifijos, estacas, Biblia, soplete de propano.",
    stats: {
      strength: 2, dexterity: 3, stamina: 3,
      charisma: 4, manipulation: 3, appearance: 2,
      perception: 3, intelligence: 3, wits: 3,
      conscience: 4, selfControl: 4, courage: 5,
      humanity: 7, willpowerMax: 9,
    },
    abilities: [
      ability("TALENT", "Alerta", 3),
      ability("TALENT", "Pelea", 2),
      ability("SKILL", "Armas C.C.", 3), // bastón-estoque
      ability("SKILL", "Conducir", 1),
      ability("SKILL", "Esquivar", 2),
      ability("SKILL", "Sigilo", 2),
      ability("KNOWLEDGE", "Ocultismo", 3),
      ability("KNOWLEDGE", "Investigación", 4),
      ability("KNOWLEDGE", "Teología", 3),
      ability("TALENT", "Expresión", 2),
    ],
  }),

  buildTemplate({
    id: "agente-gubernamental",
    label: "Agente Gubernamental",
    group: "Cazadores",
    defaultKind: "ANTAGONIST",
    description:
      "Operativo de la NSA / FBI con caoscopios; entrenado para infiltrar y eliminar criaturas sobrenaturales.",
    concept: "Agente federal con autorización paranormal",
    notesTemplate:
      "Ejemplo de Agente Gubernamental (V20 p. 273).\n" +
      "Equipo: pistola pesada, traje negro, gafas de sol, placa de identificación,\n" +
      "equipo de vigilancia electrónica, caoscopio para detectar vampiros.",
    stats: {
      strength: 3, dexterity: 3, stamina: 3,
      charisma: 3, manipulation: 3, appearance: 2,
      perception: 3, intelligence: 3, wits: 3,
      humanity: 7, willpowerMax: 7,
    },
    abilities: [
      ability("TALENT", "Alerta", 3),
      ability("SKILL", "Armas C.C.", 2),
      ability("SKILL", "Armas de Fuego", 3),
      ability("TALENT", "Atletismo", 2),
      ability("SKILL", "Conducir", 2),
      ability("SKILL", "Esquivar", 2),
      ability("KNOWLEDGE", "Informática", 2),
      ability("KNOWLEDGE", "Investigación", 4),
      ability("KNOWLEDGE", "Ocultismo", 1),
      ability("TALENT", "Pelea", 3),
      ability("KNOWLEDGE", "Política", 2),
      ability("TALENT", "Subterfugio", 2),
    ],
  }),

  buildTemplate({
    id: "erudito-arcanum",
    label: "Erudito del Arcanum",
    group: "Cazadores",
    defaultKind: "NPC",
    description:
      "Académico secreto que estudia lo sobrenatural; aliado intermitente, no siempre hostil.",
    concept: "Estudioso del Arcanum",
    notesTemplate:
      "Erudito del Arcanum (V20 p. 274).\n" +
      "Aliado neutral por defecto; puede colaborar o ser obstáculo según motivos.\n" +
      "Equipo: ordenador portátil, gran biblioteca, parafernalia ocultista,\n" +
      "cuenta bancaria importante.",
    stats: {
      strength: 2, dexterity: 2, stamina: 2,
      charisma: 2, manipulation: 2, appearance: 2,
      perception: 4, intelligence: 4, wits: 3,
      conscience: 4, selfControl: 3, courage: 3,
      humanity: 8, willpowerMax: 7,
    },
    abilities: [
      ability("SKILL", "Academicismo", 4),
      ability("TALENT", "Armas C.C.", 1),
      ability("KNOWLEDGE", "Ciencia", 3),
      ability("SKILL", "Conducir", 1),
      ability("SKILL", "Esquivar", 1),
      ability("KNOWLEDGE", "Etiqueta", 2),
      ability("TALENT", "Expresión", 2),
      ability("KNOWLEDGE", "Informática", 2),
      ability("KNOWLEDGE", "Investigación", 3),
      ability("KNOWLEDGE", "Lingüística", 2),
      ability("KNOWLEDGE", "Ocultismo", 4),
    ],
  }),

  // ── Mortales ────────────────────────────────────────────────
  buildTemplate({
    id: "jefe-criminal",
    label: "Jefe Criminal",
    group: "Mortales",
    defaultKind: "ANTAGONIST",
    description:
      "Capo de la mafia o líder de banda; duro, violento y con recursos.",
    concept: "Capo del crimen organizado",
    notesTemplate:
      "Jefe Criminal (V20 p. 275).\n" +
      "Equipo: ametralladora, chaleco antibalas, coche medio,\n" +
      "disquetes ocultos con las operaciones. Sus 'soldados' son menos formidables.",
    stats: {
      strength: 4, dexterity: 3, stamina: 3,
      charisma: 3, manipulation: 4, appearance: 1,
      perception: 2, intelligence: 2, wits: 3,
      conscience: 2, selfControl: 4, courage: 4,
      humanity: 4, willpowerMax: 6,
    },
    abilities: [
      ability("TALENT", "Alerta", 3),
      ability("SKILL", "Armas C.C.", 3),
      ability("SKILL", "Armas de Fuego", 3),
      ability("TALENT", "Atletismo", 1),
      ability("TALENT", "Callejeo", 3),
      ability("SKILL", "Conducir", 2),
      ability("SKILL", "Esquivar", 2),
      ability("KNOWLEDGE", "Finanzas", 2),
      ability("TALENT", "Pelea", 3),
      ability("SKILL", "Seguridad", 3),
      ability("SKILL", "Sigilo", 2),
      ability("TALENT", "Subterfugio", 3),
      ability("TALENT", "Intimidación", 4),
    ],
  }),

  // ── Ghouls ──────────────────────────────────────────────────
  buildTemplate({
    id: "ayuda-camara-ghoul",
    label: "Ayuda de Cámara (Ghoul)",
    group: "Ghouls",
    defaultKind: "NPC",
    description:
      "Sirviente refinado, asistente personal de un Vástago. Leal por vínculo de sangre.",
    concept: "Ghoul de confianza",
    notesTemplate:
      "Ayuda de Cámara (V20 p. 276).\n" +
      "Disciplinas: Potencia 1; posiblemente otra a nivel 1 según el clan del dómitor.\n" +
      "Vinculado por sangre; debe consumir vitae regularmente o envejecerá rápido.",
    stats: {
      strength: 2, dexterity: 3, stamina: 3,
      charisma: 3, manipulation: 3, appearance: 4,
      perception: 3, intelligence: 3, wits: 3,
      conscience: 4, selfControl: 3, courage: 3,
      humanity: 7, willpowerMax: 4,
    },
    abilities: [
      ability("SKILL", "Academicismo", 2),
      ability("TALENT", "Alerta", 2),
      ability("SKILL", "Armas C.C.", 2),
      ability("SKILL", "Armas de Fuego", 2),
      ability("SKILL", "Conducir", 2),
      ability("TALENT", "Empatía", 3),
      ability("SKILL", "Esquivar", 2),
      ability("KNOWLEDGE", "Etiqueta", 4),
      ability("KNOWLEDGE", "Finanzas", 2),
      ability("KNOWLEDGE", "Informática", 1),
      ability("KNOWLEDGE", "Liderazgo", 2),
      ability("KNOWLEDGE", "Lingüística", 1),
      ability("KNOWLEDGE", "Medicina", 2),
      ability("KNOWLEDGE", "Ocultismo", 1),
      ability("KNOWLEDGE", "Pericias", 2),
      ability("TALENT", "Subterfugio", 3),
    ],
  }),

  buildTemplate({
    id: "guardaespaldas-ghoul",
    label: "Guardaespaldas (Ghoul)",
    group: "Ghouls",
    defaultKind: "ANTAGONIST",
    description:
      "Ghoul de combate. Fortaleza + Potencia base; obediencia absoluta a su dómitor.",
    concept: "Ghoul de combate y protección",
    notesTemplate:
      "Guardaespaldas Ghoul (V20 p. 276).\n" +
      "Disciplinas: Fortaleza 1, Potencia 1; posiblemente otra a nivel 1.\n" +
      "Vinculado por sangre. Equipo típico: pistola pesada, chaleco antibalas.",
    stats: {
      strength: 4, dexterity: 3, stamina: 4,
      charisma: 2, manipulation: 2, appearance: 2,
      perception: 4, intelligence: 2, wits: 3,
      conscience: 2, selfControl: 3, courage: 4,
      humanity: 5, willpowerMax: 5,
    },
    abilities: [
      ability("TALENT", "Alerta", 4),
      ability("SKILL", "Armas C.C.", 3),
      ability("SKILL", "Armas de Fuego", 4),
      ability("TALENT", "Atletismo", 2),
      ability("TALENT", "Callejeo", 2),
      ability("SKILL", "Conducir", 2),
      ability("SKILL", "Esquivar", 3),
      ability("TALENT", "Intimidación", 3),
      ability("KNOWLEDGE", "Investigación", 2),
      ability("KNOWLEDGE", "Medicina", 1),
      ability("TALENT", "Pelea", 4),
      ability("SKILL", "Sigilo", 3),
    ],
  }),

  // ── Hombres lobo ────────────────────────────────────────────
  buildTemplate({
    id: "lupino-adolescente",
    label: "Hombre Lobo Adolescente",
    group: "Hombres lobo",
    defaultKind: "ANTAGONIST",
    description:
      "Lupino joven, peligroso pero verde. Frenesí fácil, sangre potente.",
    concept: "Lupino joven en territorio urbano",
    notesTemplate:
      "Hombre Lobo Adolescente (V20 p. 278).\n" +
      "Disciplinas equivalentes: Celeridad 3, Potencia 1, Protean 4.\n" +
      "Gnosis 4. En forma de batalla los Atributos Físicos se DOBLAN.\n" +
      "Se cura un nivel de salud por turno; vulnerable a plata y fuego.",
    stats: {
      strength: 3, dexterity: 3, stamina: 3,
      charisma: 2, manipulation: 2, appearance: 2,
      perception: 3, intelligence: 2, wits: 3,
      conscience: 3, selfControl: 2, courage: 4,
      humanity: 7, willpowerMax: 5,
    },
    abilities: [
      ability("TALENT", "Alerta", 3),
      ability("SKILL", "Armas C.C.", 2),
      ability("SKILL", "Armas de Fuego", 2),
      ability("TALENT", "Atletismo", 3),
      ability("SKILL", "Esquivar", 2),
      ability("TALENT", "Intimidación", 3),
      ability("KNOWLEDGE", "Investigación", 1),
      ability("KNOWLEDGE", "Liderazgo", 2),
      ability("KNOWLEDGE", "Lingüística", 1),
      ability("TALENT", "Pelea", 3),
      ability("SKILL", "Sigilo", 2),
      ability("SKILL", "Supervivencia", 3),
      ability("SKILL", "Trato con Animales", 2),
    ],
  }),

  buildTemplate({
    id: "lupino-veterano",
    label: "Lupino Veterano",
    group: "Hombres lobo",
    defaultKind: "ANTAGONIST",
    description:
      "Hombre lobo curtido. Cazador endurecido, instintos afilados, lleva cicatrices.",
    concept: "Lupino curtido en batalla",
    notesTemplate:
      "Lupino Veterano (V20 p. 278).\n" +
      "Disciplinas equivalentes: Celeridad 4, Potencia 2, Protean 4.\n" +
      "Gnosis 6. Sangre del Lupino veterano: muy peligrosa para los Vástagos.",
    stats: {
      strength: 4, dexterity: 3, stamina: 4,
      charisma: 3, manipulation: 2, appearance: 2,
      perception: 4, intelligence: 3, wits: 4,
      conscience: 3, selfControl: 3, courage: 5,
      humanity: 6, willpowerMax: 7,
    },
    abilities: [
      ability("TALENT", "Alerta", 4),
      ability("SKILL", "Armas C.C.", 3),
      ability("SKILL", "Armas de Fuego", 3),
      ability("TALENT", "Atletismo", 4),
      ability("SKILL", "Esquivar", 4),
      ability("TALENT", "Expresión", 1),
      ability("TALENT", "Intimidación", 4),
      ability("KNOWLEDGE", "Investigación", 2),
      ability("KNOWLEDGE", "Liderazgo", 2),
      ability("KNOWLEDGE", "Medicina", 1),
      ability("KNOWLEDGE", "Ocultismo", 4),
      ability("TALENT", "Pelea", 4),
      ability("KNOWLEDGE", "Pericias", 2),
      ability("SKILL", "Sigilo", 4),
      ability("SKILL", "Supervivencia", 5),
      ability("SKILL", "Trato con Animales", 4),
    ],
  }),

  // ── Magos ───────────────────────────────────────────────────
  buildTemplate({
    id: "joven-sectario",
    label: "Joven Sectario (Mago)",
    group: "Magos",
    defaultKind: "ANTAGONIST",
    description:
      "Mago iniciado; Disciplinas equivalentes nivel 1-2. Magia sutil + culto al ocultismo.",
    concept: "Mago novato en la Tradición",
    notesTemplate:
      "Joven Sectario (V20 p. 280).\n" +
      "Disciplinas equivalentes: Auspex 2, Dominación 2, Presencia 1, Protean 1,\n" +
      "Taumaturgia 3 (una o dos sendas).\n" +
      "Equipo: cuchillo, varias armas, instrumentos rituales (cirios, cuerdas, tiza,\n" +
      "túnicas, cálices), ropas intimidatorias, amigos.",
    stats: {
      strength: 3, dexterity: 3, stamina: 3,
      charisma: 3, manipulation: 4, appearance: 2,
      perception: 2, intelligence: 4, wits: 4,
      conscience: 3, selfControl: 4, courage: 3,
      humanity: 6, willpowerMax: 5,
    },
    abilities: [
      ability("SKILL", "Academicismo", 2),
      ability("TALENT", "Alerta", 3),
      ability("SKILL", "Armas C.C.", 2),
      ability("SKILL", "Armas de Fuego", 1),
      ability("TALENT", "Atletismo", 2),
      ability("TALENT", "Callejeo", 3),
      ability("SKILL", "Conducir", 2),
      ability("TALENT", "Empatía", 2),
      ability("SKILL", "Esquivar", 2),
      ability("TALENT", "Intimidación", 4),
      ability("KNOWLEDGE", "Ocultismo", 4),
      ability("TALENT", "Pelea", 2),
      ability("TALENT", "Subterfugio", 3),
    ],
  }),
];

export function findTemplate(id: string): AntagonistTemplate | undefined {
  return ANTAGONIST_TEMPLATES.find((t) => t.id === id);
}

export function groupTemplates(): Record<AntagonistGroup, AntagonistTemplate[]> {
  const acc = {} as Record<AntagonistGroup, AntagonistTemplate[]>;
  for (const t of ANTAGONIST_TEMPLATES) {
    (acc[t.group] ??= []).push(t);
  }
  return acc;
}
