/**
 * Caché en memoria de los catálogos del juego para alimentar al InfoModal.
 *
 * Los catálogos rara vez cambian durante una sesión (los pueblan los seeds
 * del backend, no la UI). Cargarlos una vez por sesión es suficiente y
 * evita un round-trip por cada click en el modal.
 *
 * Si en el futuro un colaborador edita el vault y rehace el seed mientras
 * la UI está abierta, `invalidate()` permite forzar la recarga.
 */
import {
  listAbilitiesInfo,
  listArmors,
  listAttributesInfo,
  listBackgrounds,
  listClans,
  listDisciplines,
  listHealthLevelsInfo,
  listMeritsFlaws,
  listWeapons,
} from "~/lib/api/catalog/catalog.api";
import type {
  AbilityInfo,
  Armor,
  AttributeInfo,
  Background,
  Clan,
  Discipline,
  HealthLevelInfo,
  MeritFlaw,
  Weapon,
} from "~/lib/api/catalog/catalog.types";

interface Bundle {
  attributes: AttributeInfo[];
  abilities: AbilityInfo[];
  healthLevels: HealthLevelInfo[];
  disciplines: Discipline[];
  meritsFlaws: MeritFlaw[];
  backgrounds: Background[];
  clans: Clan[];
  weapons: Weapon[];
  armors: Armor[];
}

let cache: Bundle | null = null;
let inflight: Promise<Bundle> | null = null;

export async function loadCatalogBundle(): Promise<Bundle> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const [
      attributes,
      abilities,
      healthLevels,
      disciplines,
      meritsFlaws,
      backgrounds,
      clans,
      weapons,
      armors,
    ] = await Promise.all([
      listAttributesInfo(),
      listAbilitiesInfo(),
      listHealthLevelsInfo(),
      listDisciplines(),
      listMeritsFlaws(),
      listBackgrounds(),
      listClans(),
      listWeapons(),
      listArmors(),
    ]);
    cache = {
      attributes,
      abilities,
      healthLevels,
      disciplines,
      meritsFlaws,
      backgrounds,
      clans,
      weapons,
      armors,
    };
    inflight = null;
    return cache;
  })();
  return inflight;
}

export function invalidateCatalogCache() {
  cache = null;
  inflight = null;
}

// ─── Resolución por kind + identificador ────────────────────────

export type InfoKind =
  | "attribute"
  | "ability"
  | "discipline"
  | "discipline-power"
  | "merit-flaw"
  | "background"
  | "clan"
  | "weapon"
  | "armor"
  | "health-level";

export interface InfoEntry {
  title: string;
  subtitle?: string;
  body: string | null;
  /** Información meta a mostrar en chips arriba del cuerpo (opcional). */
  chips?: string[];
}

/**
 * Resuelve una entrada del catálogo a partir del kind + un identificador.
 * El identificador suele ser el `name` o `key` ya en uso en el resto del
 * sistema (mantener compat con el modelo Character).
 */
export function resolveInfoEntry(
  bundle: Bundle,
  kind: InfoKind,
  identifier: string,
): InfoEntry | null {
  switch (kind) {
    case "attribute": {
      const a =
        bundle.attributes.find((x) => x.key === identifier) ??
        bundle.attributes.find((x) => x.name === identifier);
      if (!a) return null;
      return {
        title: a.name,
        subtitle: categoryLabelAttr(a.category),
        body: a.description,
      };
    }
    case "ability": {
      const a =
        bundle.abilities.find((x) => x.name === identifier) ??
        bundle.abilities.find((x) => x.key === identifier);
      if (!a) return null;
      return {
        title: a.name,
        subtitle: categoryLabelAbi(a.category),
        body: a.description,
      };
    }
    case "discipline": {
      const d = bundle.disciplines.find((x) => x.name === identifier);
      if (!d) return null;
      return {
        title: d.name,
        subtitle: "Disciplina",
        body: d.description,
      };
    }
    case "discipline-power": {
      // identifier en formato "Nombre disciplina|N" o "Nombre disciplina|nombre poder"
      const [discName, levelOrName] = identifier.split("|");
      const d = bundle.disciplines.find((x) => x.name === discName);
      if (!d) return null;
      const lvl = Number(levelOrName);
      const power = Number.isFinite(lvl)
        ? d.powers.find((p) => p.level === lvl)
        : d.powers.find((p) => p.name === levelOrName);
      if (!power) return null;
      const chips: string[] = [];
      if (typeof power.bloodCost === "number") {
        chips.push(power.bloodCost === 0 ? "Sin coste" : `${power.bloodCost} sangre`);
      }
      if (power.rollAttribute || power.rollAbility) {
        const parts = [power.rollAttribute, power.rollAbility].filter(Boolean);
        chips.push(parts.join(" + "));
      }
      if (typeof power.rollDifficulty === "number") {
        chips.push(`Dif. ${power.rollDifficulty}`);
      }
      return {
        title: power.name,
        subtitle: `${d.name} · Nivel ${power.level}`,
        body: power.description || power.summary || null,
        chips,
      };
    }
    case "merit-flaw": {
      const m = bundle.meritsFlaws.find((x) => x.name === identifier);
      if (!m) return null;
      const sign = m.kind === "MERIT" ? "+" : "";
      return {
        title: m.name,
        subtitle: `${m.kind === "MERIT" ? "Mérito" : "Defecto"}${m.category ? ` · ${m.category}` : ""}`,
        body: m.description,
        chips: [`${sign}${m.value} pts`],
      };
    }
    case "background": {
      const b =
        bundle.backgrounds.find((x) => x.name === identifier) ??
        bundle.backgrounds.find((x) => x.key === identifier);
      if (!b) return null;
      return {
        title: b.name,
        subtitle: `Trasfondo${b.category ? ` · ${b.category}` : ""}`,
        body: b.description,
      };
    }
    case "clan": {
      const c = bundle.clans.find((x) => x.name === identifier);
      if (!c) return null;
      return {
        title: c.name,
        subtitle: c.sect ?? "Clan",
        body: c.description,
      };
    }
    case "weapon": {
      const w =
        bundle.weapons.find((x) => x.id === identifier) ??
        bundle.weapons.find((x) => x.name === identifier);
      if (!w) return null;
      const chips: string[] = [];
      if (w.lethal) chips.push("Letal");
      if (w.aggravated) chips.push("Agravado");
      if (w.bluntPlus) chips.push("Contundente+");
      chips.push(
        w.damageBase === "STRENGTH"
          ? `Fuerza +${w.damageBonus}`
          : `${w.damageBonus} dados`,
      );
      if (w.kind === "RANGED") {
        if (w.range != null) chips.push(`${w.range} m`);
        if (w.rate) chips.push(`Cad. ${w.rate}`);
        if (w.magazine != null) chips.push(`Cargador ${w.magazine}`);
      }
      return {
        title: w.name,
        subtitle:
          (w.kind === "MELEE" ? "Cuerpo a cuerpo" : "A distancia") +
          (w.category?.name ? ` · ${w.category.name}` : ""),
        body: w.notes,
        chips,
      };
    }
    case "armor": {
      const a =
        bundle.armors.find((x) => x.id === identifier) ??
        bundle.armors.find((x) => x.name === identifier);
      if (!a) return null;
      return {
        title: a.name,
        subtitle: "Armadura",
        body: a.description,
        chips: [`Absorción ${a.rating}`, `Pen. -${a.penalty} Destreza`],
      };
    }
    case "health-level": {
      const h =
        bundle.healthLevels.find((x) => x.key === identifier) ??
        bundle.healthLevels.find((x) => x.name === identifier);
      if (!h) return null;
      return {
        title: h.name,
        subtitle: "Nivel de salud",
        body: h.description,
        chips: [h.penalty === 0 ? "Sin penalización" : `${h.penalty} a reservas`],
      };
    }
  }
}

function categoryLabelAttr(c: AttributeInfo["category"]): string {
  switch (c) {
    case "PHYSICAL":
      return "Atributo Físico";
    case "SOCIAL":
      return "Atributo Social";
    case "MENTAL":
      return "Atributo Mental";
  }
}

function categoryLabelAbi(c: AbilityInfo["category"]): string {
  switch (c) {
    case "TALENT":
      return "Talento";
    case "SKILL":
      return "Técnica";
    case "KNOWLEDGE":
      return "Conocimiento";
  }
}
