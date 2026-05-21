import { Loader2, UserCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";

interface MemberOption {
  id: string;
  nickname: string | null;
  email: string;
}

interface TransferCharacterDialogProps {
  open: boolean;
  characterName: string;
  /** Dueño actual; se excluye de las opciones disponibles. */
  currentOwnerId: string;
  /** Miembros de la crónica entre los que se puede elegir (incluido el actual; se filtra dentro). */
  members: MemberOption[];
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (targetUserId: string) => void;
}

/**
 * Dialog para reasignar un PC a otro miembro de la crónica.
 * Solo lo usa el narrador desde el detalle de la crónica.
 */
export function TransferCharacterDialog({
  open,
  characterName,
  currentOwnerId,
  members,
  loading = false,
  error = null,
  onCancel,
  onConfirm,
}: TransferCharacterDialogProps) {
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (!open) {
      setTargetId("");
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const candidates = members.filter((m) => m.id !== currentOwnerId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-dialog-title"
      className="fixed inset-0 z-60 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-blood/20 text-blood">
              <UserCog className="size-4" />
            </span>
            <h2
              id="transfer-dialog-title"
              className="font-heading text-lg uppercase tracking-wider text-foreground"
            >
              Transferir personaje
            </h2>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <p className="font-serif text-sm text-foreground/85">
            Cambia el dueño de{" "}
            <strong className="text-foreground">{characterName}</strong>. El
            jugador recibirá el personaje en su lista y podrá editarlo desde su
            hoja. La asociación con la crónica se mantiene.
          </p>

          {candidates.length === 0 ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[0.8rem] text-amber-200/90">
              No hay otros miembros disponibles. Invita primero a un jugador a
              la mesa.
            </p>
          ) : (
            <div className="space-y-1.5">
              <label
                htmlFor="transfer-target"
                className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground"
              >
                Nuevo dueño
              </label>
              <select
                id="transfer-target"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={loading}
                className={SELECT_DARK_CLASS}
              >
                <option value="">Selecciona un jugador...</option>
                {candidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nickname ? `${m.nickname} · ${m.email}` : m.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[0.8rem] text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/60 bg-background/40 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => targetId && onConfirm(targetId)}
            disabled={loading || !targetId}
            className="bg-blood text-blood-foreground hover:bg-blood/90"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserCog className="size-4" />
            )}
            Transferir
          </Button>
        </footer>
      </div>
    </div>
  );
}
