import { z } from "zod";

/**
 * Schema "portable" para serializar un personaje a JSON. Todos los catálogos
 * (clan, disciplinas, méritos, armas, armaduras) se referencian por NOMBRE
 * en lugar de UUID, así un PJ exportado en una instalación se puede importar
 * en otra aunque los UUIDs internos sean distintos.
 *
 * Limites pensados para protegerse de imports maliciosos (strings enormes,
 * arrays gigantes). Mantenerlos por encima del seed actual con margen.
 */
const STR = z.string().trim();

const AbilityCategory = z.enum(["TALENT", "SKILL", "KNOWLEDGE"]);
const VirtueScheme = z.enum(["HUMANITY", "PATH"]);

const PortableAbility = z.object({
  category: AbilityCategory,
  name: STR.min(1).max(80),
  value: z.number().int().min(0).max(5),
  specialty: STR.max(2000).nullable().optional(),
});

const PortableBackground = z.object({
  name: STR.min(1).max(80),
  level: z.number().int().min(0).max(5),
  notes: STR.max(2000).nullable().optional(),
});

const PortableDiscipline = z.object({
  /** Nombre canónico (ej. "Celeridad"). */
  name: STR.min(1).max(80),
  level: z.number().int().min(0).max(5),
});

const PortableMeritFlaw = z.object({
  /** Nombre canónico (ej. "Buen oído"). */
  name: STR.min(1).max(120),
  notes: STR.max(2000).nullable().optional(),
});

const PortableWeapon = z.object({
  /** Nombre canónico del arma (ej. "Espada"). */
  name: STR.min(1).max(120),
  notes: STR.max(2000).nullable().optional(),
  order: z.number().int().min(0).max(50).optional(),
});

const PortableArmor = z.object({
  /** Nombre canónico de la armadura. */
  name: STR.min(1).max(120),
  notes: STR.max(2000).nullable().optional(),
  order: z.number().int().min(0).max(50).optional(),
});

/**
 * Forma exacta del JSON exportado. Versionado para tolerar evoluciones
 * (`version: 1` hoy).
 */
export const PortableCharacterSchema = z
  .object({
    $schema: STR.optional(),
    version: z.literal(1),
    /** Metadatos de la exportación. No se importan al destino. */
    exportedAt: STR.optional(),
    exportedFrom: STR.max(120).optional(),
    /** URL de la plataforma desde la que se exportó (informativo). */
    platformUrl: STR.max(200).optional(),

    name: STR.min(1).max(120),
    concept: STR.max(200).nullable().optional(),
    chronicleName: STR.max(120).nullable().optional(),
    generation: z.number().int().min(0).max(15).nullable().optional(),
    haven: STR.max(200).nullable().optional(),
    /** Nombre del clan (resuelto contra catálogo al importar). */
    clanName: STR.max(80).nullable().optional(),
    /** Nombres de arquetipos. */
    natureName: STR.max(80).nullable().optional(),
    demeanorName: STR.max(80).nullable().optional(),

    // Atributos (todos opcionales, default a 0/1 si faltan).
    strength: z.number().int().min(0).max(10).optional(),
    dexterity: z.number().int().min(0).max(10).optional(),
    stamina: z.number().int().min(0).max(10).optional(),
    charisma: z.number().int().min(0).max(10).optional(),
    manipulation: z.number().int().min(0).max(10).optional(),
    appearance: z.number().int().min(0).max(10).optional(),
    perception: z.number().int().min(0).max(10).optional(),
    intelligence: z.number().int().min(0).max(10).optional(),
    wits: z.number().int().min(0).max(10).optional(),

    virtueScheme: VirtueScheme.optional(),
    conscience: z.number().int().min(0).max(10).optional(),
    selfControl: z.number().int().min(0).max(10).optional(),
    courage: z.number().int().min(0).max(10).optional(),

    humanity: z.number().int().min(0).max(10).optional(),
    willpowerMax: z.number().int().min(0).max(10).optional(),
    willpowerCurrent: z.number().int().min(0).max(10).optional(),
    bloodPool: z.number().int().min(0).max(50).optional(),

    healthBruised: z.number().int().min(0).max(2).optional(),
    healthHurt: z.number().int().min(0).max(2).optional(),
    healthInjured: z.number().int().min(0).max(2).optional(),
    healthWounded: z.number().int().min(0).max(2).optional(),
    healthMauled: z.number().int().min(0).max(2).optional(),
    healthCrippled: z.number().int().min(0).max(2).optional(),
    healthIncapacitated: z.number().int().min(0).max(2).optional(),

    experience: z.number().int().min(0).max(9999).optional(),

    notes: STR.max(20000).nullable().optional(),

    abilities: z.array(PortableAbility).max(100).optional(),
    backgrounds: z.array(PortableBackground).max(50).optional(),
    disciplines: z.array(PortableDiscipline).max(30).optional(),
    meritsFlaws: z.array(PortableMeritFlaw).max(50).optional(),
    weapons: z.array(PortableWeapon).max(50).optional(),
    armors: z.array(PortableArmor).max(20).optional(),
  })
  // Tolera campos extra para reenvíos futuros: se ignoran al parsear.
  .passthrough();

export type PortableCharacter = z.infer<typeof PortableCharacterSchema>;
export type PortableAbility = z.infer<typeof PortableAbility>;
export type PortableBackground = z.infer<typeof PortableBackground>;
export type PortableDiscipline = z.infer<typeof PortableDiscipline>;
export type PortableMeritFlaw = z.infer<typeof PortableMeritFlaw>;
export type PortableWeapon = z.infer<typeof PortableWeapon>;
export type PortableArmor = z.infer<typeof PortableArmor>;
