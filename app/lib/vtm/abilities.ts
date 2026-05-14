/**
 * Habilidades canónicas V20 con su categoría.
 * Las habilidades vienen del back en `Character.abilities[]` y respetan estos nombres.
 */

export type AbilityCategory = "TALENT" | "SKILL" | "KNOWLEDGE";

export const TALENTS = [
  "Alerta",
  "Atletismo",
  "Conocimiento de la Calle",
  "Empatía",
  "Esquivar",
  "Expresión",
  "Intimidación",
  "Liderazgo",
  "Pelea Callejera",
  "Subterfugio",
] as const;

export const SKILLS = [
  "Animales",
  "Armas Cuerpo a Cuerpo",
  "Artesanía",
  "Conducir",
  "Etiqueta",
  "Interpretación",
  "Pelea con Armas",
  "Sigilo",
  "Supervivencia",
  "Tiroteo",
] as const;

export const KNOWLEDGES = [
  "Academicismo",
  "Ciencias",
  "Finanzas",
  "Informática",
  "Investigación",
  "Leyes",
  "Lingüística",
  "Medicina",
  "Ocultismo",
  "Política",
] as const;

export function categoryLabel(cat: AbilityCategory): string {
  switch (cat) {
    case "TALENT":
      return "Talentos";
    case "SKILL":
      return "Técnicas";
    case "KNOWLEDGE":
      return "Conocimientos";
  }
}

// Atributos en orden canónico V20.
export const ATTRIBUTES = [
  { key: "strength", label: "Fuerza", group: "physical" as const },
  { key: "dexterity", label: "Destreza", group: "physical" as const },
  { key: "stamina", label: "Resistencia", group: "physical" as const },
  { key: "charisma", label: "Carisma", group: "social" as const },
  { key: "manipulation", label: "Manipulación", group: "social" as const },
  { key: "appearance", label: "Apariencia", group: "social" as const },
  { key: "perception", label: "Percepción", group: "mental" as const },
  { key: "intelligence", label: "Inteligencia", group: "mental" as const },
  { key: "wits", label: "Astucia", group: "mental" as const },
] as const;

export type AttributeKey = (typeof ATTRIBUTES)[number]["key"];

export function attributeLabel(key: AttributeKey): string {
  const found = ATTRIBUTES.find((a) => a.key === key);
  return found?.label ?? key;
}

export const ATTR_GROUP_LABEL = {
  physical: "Físicos",
  social: "Sociales",
  mental: "Mentales",
} as const;
