import { Loader2, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
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
import { createCharacter } from "~/lib/api/characters/characters.api";
import type { CharacterInput } from "~/lib/api/characters/characters.types";
import { emptyCharacterInput } from "~/lib/character-sheet";

export function meta() {
  return [{ title: "Forjar vástago · Distop-IA VTT" }];
}

export default function NewCharacterRoute() {
  const navigate = useNavigate();
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [meritsFlaws, setMeritsFlaws] = useState<MeritFlaw[]>([]);
  const [value, setValue] = useState<CharacterInput>(emptyCharacterInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listArchetypes(), listDisciplines(), listMeritsFlaws()])
      .then(([a, d, m]) => {
        setArchetypes(a);
        setDisciplines(d);
        setMeritsFlaws(m);
      })
      .catch((err) => setError(extractAuthError(err, "No se pudieron cargar los catálogos")))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!value.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      // Filtra abilities con value 0 para no enviar 30 filas vacías
      const payload: CharacterInput = {
        ...value,
        abilities: (value.abilities ?? []).filter((a) => a.value > 0),
      };
      const created = await createCharacter(payload);
      navigate(`/characters/${created.id}`, { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo crear el personaje"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="font-serif italic text-muted-foreground">Cargando catálogos...</p>;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Forja"
        title="Nuevo vástago"
        description="Completa la hoja del personaje. Más adelante podrás asociarlo a una crónica."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? <FormAlert message={error} /> : null}
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
            Crear personaje
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/characters")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </section>
  );
}
