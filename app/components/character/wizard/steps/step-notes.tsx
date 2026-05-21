import { MarkdownEditor } from "~/components/common/markdown-editor";
import { WizardCard } from "../wizard-primitives";
import type { WizardState } from "../wizard-state";

interface StepNotesProps {
  state: WizardState;
  onChange: (notes: string) => void;
}



const HELP_TEXT = `
Aquí va todo lo que no entra en una casilla: trasfondo, motivaciones, vínculos,
secretos, metas. Es el espacio donde tu vástago deja de ser una hoja de
estadísticas y se vuelve una persona.

Puedes usar markdown: encabezados (\`##\`), listas, **negritas**, *cursivas*,
citas (\`>\`). Lo que escribas estará disponible en la pestaña «Notas» de la
hoja, lista para refinarse durante el juego.
`.trim();

export function StepNotes({ state, onChange }: StepNotesProps) {
  return (
    <WizardCard
      title="Paso ocho · Notas del personaje"
      subtitle="Lo que las casillas no pueden contar."
      description={
        <>
          Es el último paso antes de guardar. No es obligatorio rellenarlo, pero
          sí muy recomendable: te ayudará a interpretar al personaje y le dará
          al narrador material para tejer la crónica a tu alrededor.
        </>
      }
    >
      <details className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[0.75rem] text-muted-foreground">
        <summary className="cursor-pointer font-heading uppercase tracking-widest text-blood">
          ¿Qué escribir?
        </summary>
        <div className="markdown-content mt-2 font-serif text-foreground/85">
          {HELP_TEXT.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </details>

      <div className="h-128 overflow-hidden rounded-md border border-border bg-background/40">
        <MarkdownEditor
          value={state.notes}
          onChange={onChange}
          maxLength={8000}
        />
      </div>
    </WizardCard>
  );
}
