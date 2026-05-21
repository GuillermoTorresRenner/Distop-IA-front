/**
 * Convierte el estado terminado del wizard en un Partial<CharacterInput>
 * que se vuelca sobre `emptyCharacterInput()` antes de pasarlo a la hoja
 * `/characters/new`.
 */

import type {
  CharacterAbility,
  CharacterBackground,
  CharacterDiscipline,
  CharacterInput,
} from "~/lib/api/characters/characters.types";
import type { Background } from "~/lib/api/catalog/catalog.types";
import {
  bloodPoolForGeneration,
  defaultHumanityFor,
  defaultWillpowerMaxFor,
} from "~/lib/character-sheet";
import {
  ABILITY_NAMES_BY_CATEGORY,
  ATTRIBUTE_KEYS_BY_CATEGORY,
  derivedGeneration,
  isGenerationBackgroundKey,
  type WizardState,
} from "./wizard-state";

interface MapperContext {
  /** Catálogo de trasfondos (necesario para resolver key → nombre canónico). */
  backgrounds: Background[];
}

export function wizardStateToCharacterInput(
  state: WizardState,
  ctx: MapperContext,
): Partial<CharacterInput> {
  // ── Atributos finales: base de creación + freebies del paso 6.
  const finalAttrValues = computeFinalAttributes(state);
  // ── Habilidades finales: base + freebies.
  const abilities = buildAbilities(state);
  // ── Disciplinas finales (base + freebies).
  const disciplines = buildDisciplines(state);
  // ── Trasfondos finales (base + freebies + Generación, si aplica).
  const backgrounds = buildBackgrounds(state, ctx.backgrounds);
  // ── Virtudes finales.
  const conscience = state.virtues.conscience + (state.freebies.virtues.conscience ?? 0);
  const selfControl = state.virtues.selfControl + (state.freebies.virtues.selfControl ?? 0);
  const courage = state.virtues.courage + (state.freebies.virtues.courage ?? 0);

  // ── Derivados V20.
  // La generación final viene del wizard: arranca en 13 y baja un escalón
  // por cada punto del trasfondo «Generación» (base o freebies). El estado
  // `state.concept.generation` permanece fijo en 13 y solo sirve de ancla.
  const generation = derivedGeneration(state);
  const humanity = clamp(defaultHumanityFor(conscience, selfControl) + state.freebies.humanity, 0, 10);
  const willpowerMax = clamp(defaultWillpowerMaxFor(courage) + state.freebies.willpower, 1, 10);
  const bloodPool = bloodPoolForGeneration(generation) ?? 10;

  return {
    name: state.concept.name.trim(),
    concept: state.concept.concept.trim() || undefined,
    generation,
    clanId: state.concept.clanId ?? undefined,
    natureId: state.concept.natureId ?? undefined,
    demeanorId: state.concept.demeanorId ?? undefined,

    strength: finalAttrValues.strength,
    dexterity: finalAttrValues.dexterity,
    stamina: finalAttrValues.stamina,
    charisma: finalAttrValues.charisma,
    manipulation: finalAttrValues.manipulation,
    appearance: finalAttrValues.appearance,
    perception: finalAttrValues.perception,
    intelligence: finalAttrValues.intelligence,
    wits: finalAttrValues.wits,

    conscience,
    selfControl,
    courage,

    humanity,
    willpowerMax,
    willpowerCurrent: willpowerMax,
    bloodPool,

    abilities,
    backgrounds,
    disciplines,

    weapons: state.weapons.map((w) => ({ weaponId: w.weaponId })),
    armors: state.armors.map((a) => ({ armorId: a.armorId })),

    notes: state.notes.trim() || undefined,
    equipmentNotes: state.equipmentNotes.trim() || undefined,
  };
}

function computeFinalAttributes(state: WizardState) {
  const result: Record<string, number> = { ...state.attributes.values };
  for (const key of Object.keys(state.freebies.attributes)) {
    const add = state.freebies.attributes[key as keyof typeof state.freebies.attributes] ?? 0;
    result[key] = (result[key] ?? 1) + add;
  }
  // Devolvemos un objeto tipado con todas las keys posibles, todas garantizadas
  // por wizard-state (cada atributo arranca en 1).
  return result as {
    strength: number;
    dexterity: number;
    stamina: number;
    charisma: number;
    manipulation: number;
    appearance: number;
    perception: number;
    intelligence: number;
    wits: number;
  };
}

function buildAbilities(state: WizardState): CharacterAbility[] {
  const result: CharacterAbility[] = [];
  const categories = [
    { cat: "talents" as const, key: "TALENT" as const },
    { cat: "skills" as const, key: "SKILL" as const },
    { cat: "knowledges" as const, key: "KNOWLEDGE" as const },
  ];
  for (const { cat, key } of categories) {
    for (const name of ABILITY_NAMES_BY_CATEGORY[cat]) {
      const base = state.abilities.values[name] ?? 0;
      const extra = state.freebies.abilities[name] ?? 0;
      const value = base + extra;
      if (value > 0) {
        result.push({ category: key, name, value });
      }
    }
  }
  return result;
}

function buildDisciplines(state: WizardState): CharacterDiscipline[] {
  const byId = new Map<string, number>();
  for (const d of state.disciplines) {
    byId.set(d.disciplineId, (byId.get(d.disciplineId) ?? 0) + d.level);
  }
  for (const [disciplineId, extra] of Object.entries(state.freebies.disciplines)) {
    if (extra > 0) byId.set(disciplineId, (byId.get(disciplineId) ?? 0) + extra);
  }
  return Array.from(byId.entries())
    .filter(([, level]) => level > 0)
    .map(([disciplineId, level]) => ({ disciplineId, level }));
}

function buildBackgrounds(
  state: WizardState,
  catalog: Background[],
): CharacterBackground[] {
  const catalogByKey = new Map(catalog.map((b) => [b.key, b]));
  const byKey = new Map<string, number>();
  for (const b of state.backgrounds) {
    byKey.set(b.key, (byKey.get(b.key) ?? 0) + b.level);
  }
  for (const [key, extra] of Object.entries(state.freebies.backgrounds)) {
    if (extra > 0) byKey.set(key, (byKey.get(key) ?? 0) + extra);
  }
  return Array.from(byKey.entries())
    .filter(([, level]) => level > 0)
    .map(([key, level]) => {
      const fromCatalog = catalogByKey.get(key);
      const name = fromCatalog?.name ?? key;
      // El trasfondo Generación se permite hasta 9 (4ª gen), el resto
      // mantiene el tope canónico de 5.
      const max = isGenerationBackgroundKey(key) ? 9 : 5;
      return { name, level: clamp(level, 1, max) };
    });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
