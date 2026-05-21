import type {
  AbilityCategory,
  CharacterAbility,
  CharacterInput,
} from "~/lib/api/characters/characters.types";

export const TALENTS = [
  "Alerta",
  "Atletismo",
  "Callejeo",
  "Empatía",
  "Esquivar",
  "Expresión",
  "Intimidación",
  "Liderazgo",
  "Pelea",
  "Subterfugio",
];

export const SKILLS = [
  "Armas C. C.",
  "Armas de Fuego",
  "Conducir",
  "Etiqueta",
  "Interpretación",
  "Pericias",
  "Seguridad",
  "Sigilo",
  "Supervivencia",
  "Trato con Animales",
];

export const KNOWLEDGES = [
  "Academicismo",
  "Ciencia",
  "Finanzas",
  "Informática",
  "Investigación",
  "Leyes",
  "Lingüística",
  "Medicina",
  "Ocultismo",
  "Política",
];

export interface AttributeDef {
  key:
    | "strength" | "dexterity" | "stamina"
    | "charisma" | "manipulation" | "appearance"
    | "perception" | "intelligence" | "wits";
  label: string;
  group: "physical" | "social" | "mental";
}

export const ATTRIBUTES: AttributeDef[] = [
  { key: "strength", label: "Fuerza", group: "physical" },
  { key: "dexterity", label: "Destreza", group: "physical" },
  { key: "stamina", label: "Resistencia", group: "physical" },
  { key: "charisma", label: "Carisma", group: "social" },
  { key: "manipulation", label: "Manipulación", group: "social" },
  { key: "appearance", label: "Apariencia", group: "social" },
  { key: "perception", label: "Percepción", group: "mental" },
  { key: "intelligence", label: "Inteligencia", group: "mental" },
  { key: "wits", label: "Astucia", group: "mental" },
];

export const HEALTH_LEVELS: {
  key: keyof Pick<
    CharacterInput,
    | "healthBruised"
    | "healthHurt"
    | "healthInjured"
    | "healthWounded"
    | "healthMauled"
    | "healthCrippled"
    | "healthIncapacitated"
  >;
  label: string;
  penalty: string;
}[] = [
  { key: "healthBruised", label: "Magullado", penalty: "0" },
  { key: "healthHurt", label: "Lastimado", penalty: "-1" },
  { key: "healthInjured", label: "Lesionado", penalty: "-1" },
  { key: "healthWounded", label: "Herido", penalty: "-2" },
  { key: "healthMauled", label: "Malherido", penalty: "-2" },
  { key: "healthCrippled", label: "Tullido", penalty: "-5" },
  { key: "healthIncapacitated", label: "Incapacitado", penalty: "—" },
];

/**
 * Inyecta los autocálculos V20 al combinar el estado actual con un patch
 * parcial del formulario:
 *
 *  - Voluntad permanente sigue a Coraje (y Voluntad actual sigue al máximo).
 *  - Humanidad / Senda sigue a Conciencia + Autocontrol.
 *  - Reserva de Sangre sigue a la Generación (Tabla de Generación V20).
 *
 * Solo se autocalcula cuando el valor mostrado coincide con la fórmula
 * previa: si el jugador ya editó manualmente Humanidad/Voluntad/Sangre,
 * respetamos su decisión. Esto evita pisarle ajustes legítimos cuando
 * vuelve a tocar la virtud o la generación.
 */
export function applyAutoStats(
  prev: CharacterInput,
  patch: Partial<CharacterInput>,
): Partial<CharacterInput> {
  const next: Partial<CharacterInput> = { ...patch };

  // ── Voluntad permanente ← Coraje
  if (typeof patch.courage === "number" && patch.courage !== prev.courage) {
    const expectedFromOldCourage = defaultWillpowerMaxFor(prev.courage);
    const currentWpMax = prev.willpowerMax ?? expectedFromOldCourage;
    if (currentWpMax === expectedFromOldCourage) {
      const newWpMax = defaultWillpowerMaxFor(patch.courage);
      next.willpowerMax = newWpMax;
      // Voluntad actual se ajusta sólo si estaba al máximo (flotando con el techo).
      const currentWp = prev.willpowerCurrent ?? expectedFromOldCourage;
      if (currentWp === expectedFromOldCourage) {
        next.willpowerCurrent = newWpMax;
      } else if (currentWp > newWpMax) {
        next.willpowerCurrent = newWpMax;
      }
    }
  }

  // ── Humanidad ← Conciencia + Autocontrol
  const conscienceChanged =
    typeof patch.conscience === "number" && patch.conscience !== prev.conscience;
  const selfControlChanged =
    typeof patch.selfControl === "number" &&
    patch.selfControl !== prev.selfControl;
  if (conscienceChanged || selfControlChanged) {
    const expectedFromOld = defaultHumanityFor(prev.conscience, prev.selfControl);
    const currentHumanity = prev.humanity ?? expectedFromOld;
    if (currentHumanity === expectedFromOld) {
      const newConscience = conscienceChanged
        ? patch.conscience
        : prev.conscience;
      const newSelfControl = selfControlChanged
        ? patch.selfControl
        : prev.selfControl;
      next.humanity = defaultHumanityFor(newConscience, newSelfControl);
    }
  }

  // ── Reserva de Sangre ← Generación
  if (
    "generation" in patch &&
    patch.generation !== prev.generation &&
    patch.generation != null
  ) {
    const expectedFromOld = bloodPoolForGeneration(prev.generation);
    const newPool = bloodPoolForGeneration(patch.generation);
    if (newPool != null) {
      // Solo si la reserva actual coincide con la fórmula previa (o si
      // todavía no se había fijado): respeta ajustes manuales del jugador.
      const currentBlood = prev.bloodPool ?? expectedFromOld ?? 0;
      if (expectedFromOld == null || currentBlood === expectedFromOld) {
        next.bloodPool = newPool;
      } else if (currentBlood > newPool) {
        // Si la nueva generación impone un techo menor, recortamos.
        next.bloodPool = newPool;
      }
    }
  }

  return next;
}

/**
 * Reserva máxima de Sangre según generación (V20, "Tabla de Generación",
 * columna "Reserva de Sangre"). La 3ª generación es indeterminada en el
 * manual; la dejamos sin valor (devolvemos null) para que el front no
 * autocalcule. De 13ª en adelante todas son 10.
 */
export function bloodPoolForGeneration(generation: number | null | undefined): number | null {
  if (generation == null || !Number.isFinite(generation)) return null;
  if (generation <= 3) return null; // 3ª: el manual indica '?' (indeterminada).
  if (generation === 4) return 50;
  if (generation === 5) return 40;
  if (generation === 6) return 30;
  if (generation === 7) return 20;
  if (generation === 8) return 15;
  if (generation === 9) return 14;
  if (generation === 10) return 13;
  if (generation === 11) return 12;
  if (generation === 12) return 11;
  return 10; // 13ª en adelante.
}

/**
 * Rasgo máximo por generación: el techo permanente de cualquier rasgo
 * (atributo, habilidad, disciplina), excluyendo Humanidad/Senda y la
 * Voluntad. Útil para validar autoincrementos. 3ª = 10; baja 1 por cada
 * generación hasta llegar a 5 desde la 8ª.
 */
export function maxTraitForGeneration(generation: number | null | undefined): number | null {
  if (generation == null || !Number.isFinite(generation)) return null;
  if (generation <= 3) return 10;
  if (generation === 4) return 9;
  if (generation === 5) return 8;
  if (generation === 6) return 7;
  if (generation === 7) return 6;
  return 5; // 8ª en adelante.
}

/**
 * Voluntad permanente recomendada al crear el personaje: igual a Coraje
 * (V20). El jugador puede modificarla luego.
 */
export function defaultWillpowerMaxFor(courage: number | null | undefined): number {
  const n = Number(courage);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10, Math.floor(n)));
}

/**
 * Humanidad recomendada al crear: Conciencia + Autocontrol. Se usa también
 * para "Senda" (mismo cálculo en V20). El jugador puede modificarla luego.
 */
export function defaultHumanityFor(
  conscience: number | null | undefined,
  selfControl: number | null | undefined,
): number {
  const a = Number(conscience);
  const b = Number(selfControl);
  const sum = (Number.isFinite(a) ? a : 0) + (Number.isFinite(b) ? b : 0);
  return Math.max(0, Math.min(10, Math.floor(sum)));
}

/**
 * Compara dos `CharacterInput` por valor y devuelve `true` si difieren.
 * Se usa para activar el guard de "cambios sin guardar" en la hoja.
 * No se compara `kind` ni metadata externa: solo lo que el formulario
 * realmente edita y envía al PATCH.
 *
 * Implementación: serialización JSON con orden estable de propiedades.
 * Es suficiente para los tamaños de hoja que manejamos (decenas de KB)
 * y evita tener que mantener una comparación manual campo a campo.
 */
export function isCharacterInputDirty(
  a: CharacterInput,
  b: CharacterInput,
): boolean {
  return stableStringify(a) !== stableStringify(b);
}

function stableStringify(input: unknown): string {
  if (input === null || typeof input !== "object") {
    return JSON.stringify(input);
  }
  if (Array.isArray(input)) {
    return `[${input.map(stableStringify).join(",")}]`;
  }
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined) continue; // ignora undefined para no diferenciar omitidos vs explícitos.
    parts.push(`${JSON.stringify(k)}:${stableStringify(v)}`);
  }
  return `{${parts.join(",")}}`;
}

export function buildInitialAbilities(): CharacterAbility[] {
  const make = (category: AbilityCategory, names: string[]): CharacterAbility[] =>
    names.map((name) => ({ category, name, value: 0 }));
  return [
    ...make("TALENT", TALENTS),
    ...make("SKILL", SKILLS),
    ...make("KNOWLEDGE", KNOWLEDGES),
  ];
}

export function emptyCharacterInput(): CharacterInput {
  // Defaults V20 al crear un personaje desde cero:
  //  - Virtudes: 1/1/1. → Voluntad permanente = Coraje = 1,
  //    Humanidad = Conciencia + Autocontrol = 2.
  //  - Generación: 13ª (la más común en crónicas modernas) → reserva 10.
  // El jugador puede ajustar cualquier valor luego; los autocálculos
  // viven en `applyAutoStats` y solo se aplican mientras el valor
  // mostrado coincide con la fórmula previa (no pisan ediciones manuales).
  const generation = 13;
  const conscience = 1;
  const selfControl = 1;
  const courage = 1;
  return {
    name: "",
    concept: "",
    chronicleName: "",
    haven: "",
    generation,
    strength: 1,
    dexterity: 1,
    stamina: 1,
    charisma: 1,
    manipulation: 1,
    appearance: 1,
    perception: 1,
    intelligence: 1,
    wits: 1,
    virtueScheme: "HUMANITY",
    conscience,
    selfControl,
    courage,
    humanity: defaultHumanityFor(conscience, selfControl),
    willpowerMax: defaultWillpowerMaxFor(courage),
    willpowerCurrent: defaultWillpowerMaxFor(courage),
    bloodPool: bloodPoolForGeneration(generation) ?? 10,
    experience: 0,
    healthBruised: 0,
    healthHurt: 0,
    healthInjured: 0,
    healthWounded: 0,
    healthMauled: 0,
    healthCrippled: 0,
    healthIncapacitated: 0,
    abilities: buildInitialAbilities(),
    backgrounds: [],
    disciplines: [],
    meritsFlaws: [],
    notes: "",
    equipmentNotes: "",
  };
}
