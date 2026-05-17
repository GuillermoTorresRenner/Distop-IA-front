import type {
  Character,
  CharacterAbility,
  CharacterArmor,
  CharacterBackground,
  CharacterDiscipline,
  CharacterMeritFlaw,
  CharacterWeapon,
} from "~/lib/api/characters/characters.types";
import { platformAttribution } from "./platform";
import type { PortableCharacter } from "./schema";

/**
 * Convierte un `Character` (forma del backend) al JSON portable.
 *
 * Reglas:
 *   - Catálogos por nombre, no por UUID.
 *   - Si el server no incluyó la relación (ej. discipline sin objeto poblado)
 *     intentamos resolver via fallback; si no hay forma, omitimos esa entrada.
 *   - Stats numéricos siempre se incluyen explícitamente para no perder
 *     "valor 0" como significado distinto de "campo ausente".
 */
export function characterToPortable(c: Character): PortableCharacter {
  const { url } = platformAttribution();
  return {
    $schema: "distop-ia.character.v1",
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedFrom: "Distop-IA VTT",
    platformUrl: url,

    name: c.name,
    concept: c.concept,
    chronicleName: c.chronicleName,
    generation: c.generation,
    haven: c.haven,
    clanName: c.clan?.name ?? null,
    natureName: c.nature?.name ?? null,
    demeanorName: c.demeanor?.name ?? null,

    strength: c.strength,
    dexterity: c.dexterity,
    stamina: c.stamina,
    charisma: c.charisma,
    manipulation: c.manipulation,
    appearance: c.appearance,
    perception: c.perception,
    intelligence: c.intelligence,
    wits: c.wits,

    virtueScheme: c.virtueScheme,
    conscience: c.conscience,
    selfControl: c.selfControl,
    courage: c.courage,

    humanity: c.humanity,
    willpowerMax: c.willpowerMax,
    willpowerCurrent: c.willpowerCurrent,
    bloodPool: c.bloodPool,

    healthBruised: c.healthBruised,
    healthHurt: c.healthHurt,
    healthInjured: c.healthInjured,
    healthWounded: c.healthWounded,
    healthMauled: c.healthMauled,
    healthCrippled: c.healthCrippled,
    healthIncapacitated: c.healthIncapacitated,

    experience: c.experience,
    notes: c.notes,

    abilities: c.abilities.map(serializeAbility),
    backgrounds: c.backgrounds.map(serializeBackground),
    disciplines: c.disciplines
      .map(serializeDiscipline)
      .filter((d): d is NonNullable<typeof d> => d !== null),
    meritsFlaws: c.meritsFlaws
      .map(serializeMeritFlaw)
      .filter((m): m is NonNullable<typeof m> => m !== null),
    weapons: c.weapons
      .map(serializeWeapon)
      .filter((w): w is NonNullable<typeof w> => w !== null),
    armors: c.armors
      .map(serializeArmor)
      .filter((a): a is NonNullable<typeof a> => a !== null),
  };
}

function serializeAbility(a: CharacterAbility) {
  return {
    category: a.category,
    name: a.name,
    value: a.value,
    specialty: a.specialty ?? null,
  };
}

function serializeBackground(b: CharacterBackground) {
  return {
    name: b.name,
    level: b.level,
    notes: b.notes ?? null,
  };
}

function serializeDiscipline(d: CharacterDiscipline) {
  const name = d.discipline?.name;
  if (!name) return null;
  return { name, level: d.level };
}

function serializeMeritFlaw(m: CharacterMeritFlaw) {
  const name = m.meritFlaw?.name;
  if (!name) return null;
  return { name, notes: m.notes ?? null };
}

function serializeWeapon(w: CharacterWeapon) {
  const name = w.weapon?.name;
  if (!name) return null;
  return {
    name,
    notes: w.notes ?? null,
    order: w.order,
  };
}

function serializeArmor(a: CharacterArmor) {
  const name = a.armor?.name;
  if (!name) return null;
  return {
    name,
    notes: a.notes ?? null,
    order: a.order,
  };
}

/**
 * Forma un nombre de archivo seguro para descargas.
 */
export function slugifyForFilename(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "personaje"
  );
}
