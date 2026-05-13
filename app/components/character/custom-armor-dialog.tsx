import { Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { createArmor } from "~/lib/api/catalog/catalog.api";
import type { Armor } from "~/lib/api/catalog/catalog.types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (armor: Armor) => void;
}

export function CustomArmorDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(2);
  const [penalty, setPenalty] = useState(1);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setRating(2);
    setPenalty(1);
    setDescription("");
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

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createArmor({
        name: name.trim(),
        rating,
        penalty,
        description: description.trim() || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo crear la armadura"));
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
        className="relative w-full max-w-lg rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
          <h2 className="font-heading text-lg uppercase tracking-wider text-foreground">
            Nueva armadura personalizada
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

        <div className="space-y-3 px-5 py-4">
          {error ? <FormAlert message={error} /> : null}

          <FormField
            label="Nombre"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            containerClassName="w-full"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              label="Absorción (+)"
              name="rating"
              type="number"
              min={0}
              max={10}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value) || 0)}
              hint="Manual: clase 1 → +1, clase 5 → +5"
              containerClassName="w-full"
            />
            <FormField
              label="Penalización Destreza (−)"
              name="penalty"
              type="number"
              min={0}
              max={10}
              value={penalty}
              onChange={(e) => setPenalty(Number(e.target.value) || 0)}
              containerClassName="w-full"
            />
          </div>

          <label className="block space-y-1">
            <span className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Descripción
            </span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
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
            Crear armadura
          </Button>
        </footer>
      </form>
    </div>
  );
}
