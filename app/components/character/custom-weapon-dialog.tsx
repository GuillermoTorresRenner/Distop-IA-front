import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { createWeapon } from "~/lib/api/catalog/catalog.api";
import type {
  Weapon,
  WeaponCategory,
  WeaponDamageBase,
  WeaponKind,
} from "~/lib/api/catalog/catalog.types";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";

interface Props {
  open: boolean;
  categories: WeaponCategory[];
  onClose: () => void;
  onCreated: (weapon: Weapon) => void;
}

export function CustomWeaponDialog({
  open,
  categories,
  onClose,
  onCreated,
}: Props) {
  const [kind, setKind] = useState<WeaponKind>("MELEE");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [damageBase, setDamageBase] = useState<WeaponDamageBase>("STRENGTH");
  const [damageBonus, setDamageBonus] = useState(1);
  const [lethal, setLethal] = useState(false);
  const [aggravated, setAggravated] = useState(false);
  const [bluntPlus, setBluntPlus] = useState(false);
  const [range, setRange] = useState<string>("");
  const [rate, setRate] = useState("");
  const [magazine, setMagazine] = useState<string>("");
  const [concealment, setConcealment] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind],
  );

  useEffect(() => {
    if (!open) return;
    // reset al abrir
    setKind("MELEE");
    setCategoryId("");
    setName("");
    setDamageBase("STRENGTH");
    setDamageBonus(1);
    setLethal(false);
    setAggravated(false);
    setBluntPlus(false);
    setRange("");
    setRate("");
    setMagazine("");
    setConcealment("");
    setNotes("");
    setError(null);
    setSubmitting(false);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Para distancia, default damageBase = FLAT
  useEffect(() => {
    if (kind === "RANGED") setDamageBase("FLAT");
    else setDamageBase("STRENGTH");
  }, [kind]);

  // Reset category cuando cambia kind
  useEffect(() => {
    setCategoryId("");
  }, [kind]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!categoryId) {
      setError("Selecciona una categoría.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createWeapon({
        name: name.trim(),
        kind,
        categoryId,
        damageBase,
        damageBonus,
        lethal,
        aggravated,
        bluntPlus,
        range: range ? Number(range) : undefined,
        rate: rate.trim() || undefined,
        magazine: magazine ? Number(magazine) : undefined,
        concealment: concealment.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo crear el arma"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
          <h2 className="font-heading text-lg uppercase tracking-wider text-foreground">
            Nueva arma personalizada
          </h2>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="space-y-4 px-5 py-4">
          {error ? <FormAlert message={error} /> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                Tipo
              </span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as WeaponKind)}
                className={SELECT_DARK_CLASS}
              >
                <option value="MELEE">Cuerpo a cuerpo</option>
                <option value="RANGED">A distancia</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                Categoría
              </span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={SELECT_DARK_CLASS}
                required
              >
                <option value="">Selecciona...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <FormField
              label="Nombre"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              containerClassName="w-full md:col-span-2"
            />
          </div>

          <fieldset className="grid gap-3 md:grid-cols-3">
            <label className="block space-y-1">
              <span className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                Base del daño
              </span>
              <select
                value={damageBase}
                onChange={(e) => setDamageBase(e.target.value as WeaponDamageBase)}
                className={SELECT_DARK_CLASS}
              >
                <option value="STRENGTH">Fuerza + bono</option>
                <option value="FLAT">Valor fijo</option>
              </select>
            </label>

            <FormField
              label={damageBase === "STRENGTH" ? "Bono" : "Daño"}
              name="damageBonus"
              type="number"
              min={0}
              max={20}
              value={damageBonus}
              onChange={(e) => setDamageBonus(Number(e.target.value) || 0)}
              containerClassName="w-full"
            />

            <FormField
              label="Ocultación"
              name="concealment"
              value={concealment}
              onChange={(e) => setConcealment(e.target.value)}
              hint="Código del manual (B, P, J, G, N…)"
              containerClassName="w-full"
            />
          </fieldset>

          <fieldset className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 font-serif text-sm">
              <input
                type="checkbox"
                checked={lethal}
                onChange={(e) => setLethal(e.target.checked)}
                className="size-4 accent-blood"
              />
              Letal
            </label>
            <label className="flex items-center gap-2 font-serif text-sm">
              <input
                type="checkbox"
                checked={aggravated}
                onChange={(e) => setAggravated(e.target.checked)}
                className="size-4 accent-blood"
              />
              Agravado
            </label>
            <label className="flex items-center gap-2 font-serif text-sm">
              <input
                type="checkbox"
                checked={bluntPlus}
                onChange={(e) => setBluntPlus(e.target.checked)}
                className="size-4 accent-blood"
              />
              Contundente "+" (letal si apunta a la cabeza)
            </label>
          </fieldset>

          {kind === "RANGED" ? (
            <fieldset className="grid gap-3 md:grid-cols-3">
              <FormField
                label="Alcance (m)"
                name="range"
                type="number"
                min={0}
                value={range}
                onChange={(e) => setRange(e.target.value)}
                containerClassName="w-full"
              />
              <FormField
                label="Cadencia"
                name="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                hint="Ej: 3, 1*, 10+"
                containerClassName="w-full"
              />
              <FormField
                label="Cargador"
                name="magazine"
                type="number"
                min={0}
                value={magazine}
                onChange={(e) => setMagazine(e.target.value)}
                containerClassName="w-full"
              />
            </fieldset>
          ) : null}

          <label className="block space-y-1">
            <span className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Notas (opcional)
            </span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Particularidades del arma..."
            />
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/60 bg-background/40 px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-blood text-blood-foreground hover:bg-blood/90"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Crear arma
          </Button>
        </footer>
      </form>
    </div>
  );
}
