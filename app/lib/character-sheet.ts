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
  return {
    name: "",
    concept: "",
    chronicleName: "",
    haven: "",
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
    conscience: 1,
    selfControl: 1,
    courage: 1,
    humanity: 7,
    willpowerMax: 1,
    willpowerCurrent: 1,
    bloodPool: 10,
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
  };
}
