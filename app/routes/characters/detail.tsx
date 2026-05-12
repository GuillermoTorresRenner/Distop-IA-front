import { Link2, Link2Off, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { CharacterSheetForm } from "~/components/character/character-sheet-form";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import {
  listArchetypes,
  listDisciplines,
  listMeritsFlaws,
} from "~/lib/api/catalog/catalog.api";
import type {
  Archetype,
  Discipline,
  MeritFlaw,
} from "~/lib/api/catalog/catalog.types";
import {
  associateChronicle,
  deleteCharacter,
  dissociateChronicle,
  getCharacter,
  updateCharacter,
} from "~/lib/api/characters/characters.api";
import type {
  Character,
  CharacterInput,
} from "~/lib/api/characters/characters.types";
import { listMyChronicles } from "~/lib/api/chronicles/chronicles.api";
import type { ChronicleListItem } from "~/lib/api/chronicles/chronicles.types";

export function meta() {
  return [{ title: "Vástago · Distop-IA VTT" }];
}

function toInput(c: Character): CharacterInput {
  return {
    name: c.name,
    concept: c.concept ?? undefined,
    chronicleName: c.chronicleName ?? undefined,
    generation: c.generation ?? undefined,
    haven: c.haven ?? undefined,
    clan: c.clan ?? undefined,
    natureId: c.natureId ?? undefined,
    demeanorId: c.demeanorId ?? undefined,
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
    abilities: c.abilities.map((a) => ({
      category: a.category,
      name: a.name,
      value: a.value,
      specialty: a.specialty,
    })),
    backgrounds: c.backgrounds.map((b) => ({
      name: b.name,
      level: b.level,
      notes: b.notes,
    })),
    disciplines: c.disciplines.map((d) => ({
      disciplineId: d.disciplineId,
      level: d.level,
    })),
    meritsFlaws: c.meritsFlaws.map((m) => ({
      meritFlawId: m.meritFlawId,
      notes: m.notes,
    })),
  };
}

export default function CharacterDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [meritsFlaws, setMeritsFlaws] = useState<MeritFlaw[]>([]);
  const [chronicles, setChronicles] = useState<ChronicleListItem[]>([]);

  const [character, setCharacter] = useState<Character | null>(null);
  const [value, setValue] = useState<CharacterInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [linkTargetId, setLinkTargetId] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getCharacter(id),
      listArchetypes(),
      listDisciplines(),
      listMeritsFlaws(),
      listMyChronicles(),
    ])
      .then(([c, a, d, m, ch]) => {
        setCharacter(c);
        setValue(toInput(c));
        setArchetypes(a);
        setDisciplines(d);
        setMeritsFlaws(m);
        setChronicles(ch);
      })
      .catch((err) => setError(extractAuthError(err, "No se pudo cargar el personaje")))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !value) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload: Partial<CharacterInput> = {
        ...value,
        abilities: (value.abilities ?? []).filter((a) => a.value > 0),
      };
      const updated = await updateCharacter(id, payload);
      setCharacter(updated);
      setValue(toInput(updated));
      setSuccess("Cambios guardados.");
    } catch (err) {
      setError(extractAuthError(err, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !character) return;
    if (!confirm(`¿Eliminar a ${character.name}?`)) return;
    try {
      await deleteCharacter(id);
      navigate("/characters", { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo eliminar"));
    }
  }

  async function handleAssociate() {
    if (!id || !linkTargetId) return;
    setError(null);
    try {
      const updated = await associateChronicle(id, linkTargetId);
      setCharacter(updated);
      setLinkTargetId("");
    } catch (err) {
      setError(extractAuthError(err, "No se pudo asociar a la crónica"));
    }
  }

  async function handleDissociate(chronicleId: string) {
    if (!id) return;
    if (!confirm("¿Quitar al personaje de esta crónica?")) return;
    try {
      const updated = await dissociateChronicle(id, chronicleId);
      setCharacter(updated);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo desasociar"));
    }
  }

  if (loading || !value || !character) {
    return (
      <p className="font-serif italic text-muted-foreground">
        {error ?? "Cargando vástago..."}
      </p>
    );
  }

  const linkedIds = new Set(character.chronicles.map((c) => c.chronicleId));
  const availableChronicles = chronicles.filter((c) => !linkedIds.has(c.id));

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={character.clan ?? "Vástago"}
        title={character.name}
        description={character.concept ?? undefined}
        actions={
          <Button
            variant="ghost"
            onClick={handleDelete}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" /> Eliminar
          </Button>
        }
      />

      {error ? <FormAlert message={error} /> : null}
      {success ? <FormAlert kind="success" message={success} /> : null}

      <article className="rounded-lg border border-border/60 bg-card/70 p-4">
        <h2 className="mb-3 font-heading text-sm uppercase tracking-[0.3em] text-blood">
          Crónicas vinculadas
        </h2>
        {character.chronicles.length === 0 ? (
          <p className="font-serif text-sm italic text-muted-foreground">
            Aún no participa en ninguna crónica.
          </p>
        ) : (
          <ul className="mb-3 space-y-1">
            {character.chronicles.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/30 px-3 py-1.5"
              >
                <span className="font-serif text-sm">{link.chronicle.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDissociate(link.chronicleId)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Link2Off className="size-4" /> Quitar
                </Button>
              </li>
            ))}
          </ul>
        )}
        {availableChronicles.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              value={linkTargetId}
              onChange={(e) => setLinkTargetId(e.target.value)}
              className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">Selecciona una crónica donde participas...</option>
              {availableChronicles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handleAssociate}
              disabled={!linkTargetId}
              className="bg-blood text-blood-foreground hover:bg-blood/90"
            >
              <Link2 className="size-4" /> Asociar
            </Button>
          </div>
        ) : null}
      </article>

      <form onSubmit={handleSubmit} className="space-y-6">
        <CharacterSheetForm
          value={value}
          onChange={setValue}
          archetypes={archetypes}
          disciplines={disciplines}
          meritsFlaws={meritsFlaws}
        />
        <div className="flex items-center gap-3 border-t border-border/60 pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blood text-blood-foreground hover:bg-blood/90"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar cambios
          </Button>
        </div>
      </form>
    </section>
  );
}
