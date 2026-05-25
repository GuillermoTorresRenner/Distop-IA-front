import type { Archetype, Clan } from "~/lib/api/catalog/catalog.types";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import { ImageUploader } from "~/components/common/image-uploader";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import type { OpenCatalogInfo } from "../character-wizard";
import { WizardInfoButton } from "../wizard-info";
import { WizardCard } from "../wizard-primitives";
import type { WizardConcept } from "../wizard-state";

interface StepConceptProps {
  value: WizardConcept;
  onChange: (next: WizardConcept) => void;
  clans: Clan[];
  archetypes: Archetype[];
  openCatalog: OpenCatalogInfo;
}

const GENERATION_INFO_BODY = `
La **generación** mide cuán cerca estás del primer vampiro, Caín. Cuanto más
baja sea tu generación, más sangre cabe en tu cuerpo y más alto puede subir
cualquier rasgo. La generación se modela en el sistema como un **trasfondo**:
cada nivel por debajo de la 13.ª consume puntos de trasfondo, y si no
alcanzas, se paga con puntos gratuitos.

**En este asistente, todos los personajes arrancan en la 13.ª generación**
(neonato común). Si quieres una generación más baja, podrás comprarla
después: en el paso de **Trasfondos** asignando puntos al rasgo Generación,
o gastando **puntos gratuitos** en el último paso. También puedes ajustarla
manualmente desde la hoja una vez termines el wizard.

- **13.ª** — neonato común. Reserva 10, máximo de rasgo 5.
- **12.ª** — cuesta 1 punto de trasfondo. Reserva 11.
- **11.ª** — cuesta 2. Reserva 12.
- **10.ª** — cuesta 3. Reserva 13.
- **9.ª** — cuesta 4. Reserva 14.
- **8.ª** — cuesta 5. Reserva 15.

Más allá de la 8.ª, el coste es exclusivo de **puntos gratuitos**: cada paso
adicional cuesta 2 puntos más.
`.trim();

const NATURE_INFO_BODY = `
La **Naturaleza** es la verdad íntima de tu vástago, su yo real cuando no
está mostrando una máscara al mundo. Recobras un punto de **Voluntad** cada
vez que actúas conforme a tu Naturaleza en un momento dramático.

Mira el listado de arquetipos y elige el que describa qué motiva a tu
personaje cuando nadie mira.
`.trim();

const DEMEANOR_INFO_BODY = `
La **Conducta** es la máscara con la que tu vástago se presenta ante los
demás. No tiene por qué coincidir con la Naturaleza —de hecho, suele ser su
contrapeso—. La Conducta no otorga beneficios mecánicos directos, pero
guía el roleo y cómo los demás te leen.
`.trim();

export function StepConcept({
  value,
  onChange,
  clans,
  archetypes,
  openCatalog,
}: StepConceptProps) {
  function patch(p: Partial<WizardConcept>) {
    onChange({ ...value, ...p });
  }

  const selectedClan = clans.find((c) => c.id === value.clanId) ?? null;
  const selectedNature = archetypes.find((a) => a.id === value.natureId) ?? null;
  const selectedDemeanor = archetypes.find((a) => a.id === value.demeanorId) ?? null;

  const sortByName = <T extends { name: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );
  const clansSorted = sortByName(clans);
  const archetypesSorted = sortByName(archetypes);

  return (
    <WizardCard
      title="Paso uno · Concepto"
      subtitle="¿Quién fue tu vástago antes del Abrazo, y qué es ahora?"
      description={
        <>
          Define la identidad básica: cómo se llamaba en su vida mortal, el clan al que pertenece tras el Abrazo,
          su <strong>Naturaleza</strong> (lo que es por dentro), su <strong>Conducta</strong> (la máscara con la que se enfrenta a la noche),
          y la <strong>Generación</strong> que arrastra. Estos cinco rasgos condicionan todo el resto.
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Retrato (opcional)</Label>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ImageUploader
              currentUrl={value.avatarPreviewUrl ?? null}
              onUpload={async (file) => {
                // Liberamos el objectURL anterior si existía.
                if (value.avatarPreviewUrl) {
                  URL.revokeObjectURL(value.avatarPreviewUrl);
                }
                const url = URL.createObjectURL(file);
                patch({ avatarFile: file, avatarPreviewUrl: url });
              }}
              onRemove={async () => {
                if (value.avatarPreviewUrl) {
                  URL.revokeObjectURL(value.avatarPreviewUrl);
                }
                patch({ avatarFile: null, avatarPreviewUrl: null });
              }}
              shape="circle"
              maxSizeMb={5}
              uploadLabel="Subir retrato"
              changeLabel="Cambiar retrato"
              removeLabel="Quitar retrato"
              emptyHint="Sin retrato"
            />
            <p className="font-serif text-xs italic text-muted-foreground">
              JPEG, PNG, WebP o GIF, hasta 5&nbsp;MB. Se guardará cuando termines
              el asistente; se convierte a WebP 1024×1024 en el servidor.
            </p>
          </div>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="wizard-name">Nombre</Label>
          <Input
            id="wizard-name"
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Ej.: Lucien Marchand"
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="wizard-concept">Concepto</Label>
          <Textarea
            id="wizard-concept"
            value={value.concept}
            onChange={(e) => patch({ concept: e.target.value })}
            placeholder="Ej.: Periodista de investigación caído en desgracia y abrazado por venganza."
            maxLength={400}
            rows={2}
          />
          <p className="text-[0.7rem] text-muted-foreground">
            Una frase corta resume mejor que una página: oficio, motor y rasgo definitorio.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="wizard-clan">Clan</Label>
            {selectedClan ? (
              <WizardInfoButton
                tooltip={`Información sobre ${selectedClan.name}`}
                kind="clan"
                identifier={selectedClan.name}
                fallbackTitle={selectedClan.name}
                onOpenCatalog={openCatalog}
                ariaLabel={`Información del clan ${selectedClan.name}`}
              />
            ) : null}
          </div>
          <select
            id="wizard-clan"
            className={SELECT_DARK_CLASS}
            value={value.clanId ?? ""}
            onChange={(e) => patch({ clanId: e.target.value || null })}
          >
            <option value="" disabled>
              Selecciona un clan…
            </option>
            {clansSorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.sect ? ` · ${c.sect}` : ""}
              </option>
            ))}
          </select>
          {selectedClan?.weakness ? (
            <p className="text-[0.7rem] italic text-blood/80">
              Debilidad: {selectedClan.weakness}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="wizard-generation">Generación</Label>
            <WizardInfoButton
              tooltip="Cómo funciona la generación en V20"
              inline={{
                title: "Generación",
                subtitle: "Trasfondo del manual V20",
                body: GENERATION_INFO_BODY,
              }}
              ariaLabel="Información sobre la generación"
            />
          </div>
          <div
            id="wizard-generation"
            aria-readonly="true"
            className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-input/50 px-3 py-2 text-sm text-foreground"
          >
            <span className="font-display">13.ª generación</span>
            <span className="rounded border border-blood/40 px-1.5 py-0.5 font-heading text-[0.55rem] uppercase tracking-widest text-blood">
              Neonato común
            </span>
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            Todos los personajes empiezan en la 13.ª generación. Para bajarla
            asígnale puntos al trasfondo «Generación» (paso 4b) o cómprala con
            puntos gratuitos en el paso final. También podrás ajustarla a mano
            desde la hoja.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="wizard-nature">Naturaleza</Label>
            <div className="flex items-center gap-1">
              <WizardInfoButton
                tooltip="Qué es la Naturaleza"
                inline={{
                  title: "Naturaleza",
                  subtitle: "Arquetipo interno",
                  body: NATURE_INFO_BODY,
                }}
                ariaLabel="Información sobre la Naturaleza"
              />
              {selectedNature ? (
                <WizardInfoButton
                  tooltip={`Detalle de ${selectedNature.name}`}
                  inline={{
                    title: selectedNature.name,
                    subtitle: "Arquetipo · Naturaleza",
                    body: selectedNature.description,
                  }}
                  ariaLabel={`Información del arquetipo ${selectedNature.name}`}
                />
              ) : null}
            </div>
          </div>
          <select
            id="wizard-nature"
            className={SELECT_DARK_CLASS}
            value={value.natureId ?? ""}
            onChange={(e) => patch({ natureId: e.target.value || null })}
          >
            <option value="" disabled>
              Selecciona un arquetipo…
            </option>
            {archetypesSorted.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <p className="text-[0.7rem] text-muted-foreground">Su yo verdadero.</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="wizard-demeanor">Conducta</Label>
            <div className="flex items-center gap-1">
              <WizardInfoButton
                tooltip="Qué es la Conducta"
                inline={{
                  title: "Conducta",
                  subtitle: "Arquetipo público",
                  body: DEMEANOR_INFO_BODY,
                }}
                ariaLabel="Información sobre la Conducta"
              />
              {selectedDemeanor ? (
                <WizardInfoButton
                  tooltip={`Detalle de ${selectedDemeanor.name}`}
                  inline={{
                    title: selectedDemeanor.name,
                    subtitle: "Arquetipo · Conducta",
                    body: selectedDemeanor.description,
                  }}
                  ariaLabel={`Información del arquetipo ${selectedDemeanor.name}`}
                />
              ) : null}
            </div>
          </div>
          <select
            id="wizard-demeanor"
            className={cn(SELECT_DARK_CLASS)}
            value={value.demeanorId ?? ""}
            onChange={(e) => patch({ demeanorId: e.target.value || null })}
          >
            <option value="" disabled>
              Selecciona un arquetipo…
            </option>
            {archetypesSorted.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <p className="text-[0.7rem] text-muted-foreground">La máscara pública.</p>
        </div>
      </div>
    </WizardCard>
  );
}
