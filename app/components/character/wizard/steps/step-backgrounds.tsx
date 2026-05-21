import { Trash2 } from "lucide-react";
import type { Background } from "~/lib/api/catalog/catalog.types";
import { Button } from "~/components/ui/button";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import type { OpenCatalogInfo } from "../character-wizard";
import { WizardInfoButton } from "../wizard-info";
import {
  BACKGROUND_POINTS,
  backgroundPoolStatus,
  derivedGeneration,
  isGenerationBackgroundKey,
  type WizardBackgroundPick,
  type WizardState,
} from "../wizard-state";
import {
  DotRatingRow,
  PointPool,
  WizardCard,
} from "../wizard-primitives";

interface StepBackgroundsProps {
  state: WizardState;
  backgrounds: Background[];
  onChange: (next: WizardBackgroundPick[]) => void;
  openCatalog: OpenCatalogInfo;
}

const BACKGROUND_INFO_BODY = `
Los **trasfondos** representan lo que tu vástago tiene en el mundo: contactos,
recursos, prestigio, criados. No son habilidades ni dones de sangre, sino
ventajas externas que arrastra desde su vida mortal o su existencia como
vampiro.

**Reglas de la creación**:

- Tienes **5 puntos** para repartir.
- Cada nivel cuesta 1 punto (máximo 5 por trasfondo).
- La **Generación** se modela como un trasfondo: cada punto baja un escalón
  desde la 13.ª (1 pto = 12.ª, 2 = 11.ª, 3 = 10.ª, 4 = 9.ª, 5 = 8.ª).
- Si te quedas corto, puedes pagar el resto con **puntos gratuitos** al
  final (1 pto por círculo).

Pulsa la **i** de cada trasfondo del catálogo para ver qué representa cada
nivel (un círculo de Recursos no es lo mismo que cinco).
`.trim();

export function StepBackgrounds({
  state,
  backgrounds,
  onChange,
  openCatalog,
}: StepBackgroundsProps) {
  const pool = backgroundPoolStatus(state);
  const generation = derivedGeneration(state);
  const usedKeys = new Set(state.backgrounds.map((b) => b.key));
  // El trasfondo Generación sí se ofrece en el select (es el mecanismo que
  // permite bajar la generación durante el wizard). El step de Concepto
  // mantiene la 13.ª como base y aquí se compran los escalones.
  const remaining = backgrounds.filter((b) => !usedKeys.has(b.key));

  function setLevel(key: string, level: number) {
    const next = state.backgrounds
      .map((b) => (b.key === key ? { ...b, level: clamp(level, 0, 5) } : b))
      .filter((b) => b.level > 0);
    onChange(next);
  }

  function addBackground(key: string) {
    if (!key) return;
    if (state.backgrounds.some((b) => b.key === key)) return;
    if (pool.remaining <= 0) return;
    onChange([...state.backgrounds, { key, level: 1 }]);
  }

  function remove(key: string) {
    onChange(state.backgrounds.filter((b) => b.key !== key));
  }

  return (
    <WizardCard
      title="Paso 4b · Trasfondos"
      subtitle={`Reparte ${BACKGROUND_POINTS} puntos entre tus trasfondos.`}
      description={
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            Tus aliados, recursos y vínculos cuentan tanto como tus colmillos.
            Si quieres bajar tu generación desde la 13.ª, añade el trasfondo
            <strong> Generación</strong>: cada punto baja un escalón. Si te
            quedas corto, podrás seguir comprándolos con puntos gratuitos al
            final.
          </span>
          <WizardInfoButton
            tooltip="Cómo funcionan los trasfondos"
            inline={{
              title: "Trasfondos (V20)",
              subtitle: "Paso 4b · Ventajas",
              body: BACKGROUND_INFO_BODY,
            }}
            ariaLabel="Información sobre los trasfondos"
          />
        </span>
      }
      aside={
        <div className="space-y-2">
          <PointPool
            label="Trasfondos"
            spent={pool.spent}
            total={pool.total}
            remaining={pool.remaining}
          />
          <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[0.7rem] text-muted-foreground">
            <div className="flex justify-between">
              <span>Generación actual</span>
              <span className="font-display text-foreground">
                {generation}.ª
              </span>
            </div>
            {generation === 13 ? (
              <p className="mt-1 italic">
                Añade puntos al trasfondo «Generación» para bajarla.
              </p>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        {state.backgrounds.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-background/40 px-3 py-4 text-center text-xs text-muted-foreground">
            Añade tu primer trasfondo.
          </p>
        ) : (
          state.backgrounds.map((pick) => {
            const def = backgrounds.find((b) => b.key === pick.key);
            // Techo dinámico: no permite subir más allá de los puntos que
            // quedan en el pool (5 base + lo ya gastado en esta fila). Si
            // remaining es negativo (déficit por generación) se trata como 0
            // para no liberar subidas extra; el déficit se paga en freebies.
            const dynamicMax = Math.min(
              5,
              pick.level + Math.max(0, pool.remaining),
            );
            return (
              <div key={pick.key} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DotRatingRow
                    label={def?.name ?? pick.key}
                    info={
                      def ? (
                        <WizardInfoButton
                          tooltip={def.tooltip ?? `Detalle de ${def.name}`}
                          kind="background"
                          identifier={def.key}
                          fallbackTitle={def.name}
                          onOpenCatalog={openCatalog}
                          ariaLabel={`Información del trasfondo ${def.name}`}
                        />
                      ) : null
                    }
                    value={pick.level}
                    min={1}
                    max={dynamicMax}
                    dotsTotal={5}
                    onChange={(v) => setLevel(pick.key, v)}
                  />
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => remove(pick.key)}
                  aria-label="Quitar"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          className={SELECT_DARK_CLASS}
          value=""
          onChange={(e) => addBackground(e.target.value)}
          disabled={pool.remaining <= 0 || remaining.length === 0}
        >
          <option value="" disabled>
            Añadir trasfondo…
          </option>
          {remaining.map((b) => (
            <option key={b.key} value={b.key}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </WizardCard>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
