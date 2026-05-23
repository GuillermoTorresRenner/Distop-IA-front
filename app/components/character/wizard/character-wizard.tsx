import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { useInfoModal } from "~/components/common/info-modal";
import { useConfirm } from "~/hooks/use-confirm";
import type {
  AbilityInfo,
  Archetype,
  Armor,
  AttributeInfo,
  Background,
  Clan,
  Discipline,
  Virtue,
  Weapon,
  WeaponCategory,
} from "~/lib/api/catalog/catalog.types";
import type { CharacterInput } from "~/lib/api/characters/characters.types";
import type { InfoKind } from "~/lib/catalog-cache";
import { cn } from "~/lib/utils";
import { StepAbilities } from "./steps/step-abilities";
import { StepAttributes } from "./steps/step-attributes";
import { StepBackgrounds } from "./steps/step-backgrounds";
import { StepConcept } from "./steps/step-concept";
import { StepDisciplines } from "./steps/step-disciplines";
import { StepEquipment } from "./steps/step-equipment";
import { StepFinishing } from "./steps/step-finishing";
import { StepFreebies } from "./steps/step-freebies";
import { StepNotes } from "./steps/step-notes";
import { StepVirtues } from "./steps/step-virtues";
import { wizardStateToCharacterInput } from "./wizard-mapper";
import { WizardStepper } from "./wizard-stepper";
import {
  canAdvance,
  emptyWizardState,
  validationIssues,
  WIZARD_STEPS,
  WIZARD_STEP_COUNT,
  type WizardState,
} from "./wizard-state";

/** Extras producidos por el wizard que no caben en `CharacterInput`. */
export interface WizardCompleteExtras {
  /**
   * Retrato elegido en el paso de Concepto. El padre debe subirlo con
   * `uploadCharacterAvatar(createdId, avatarFile)` **después** de crear el
   * personaje, ya que el endpoint exige `characterId`. `null` si el jugador
   * no eligió imagen.
   */
  avatarFile: File | null;
}

interface CharacterWizardProps {
  open: boolean;
  /**
   * Llamado al terminar con el `Partial<CharacterInput>` resultante.
   *
   * El padre debe persistir el personaje y cerrar el wizard (`open=false`).
   * Mientras el guardado está en curso, pasar `saving=true`; si falla,
   * pasar `saveError` con el mensaje para que el wizard lo muestre dentro
   * del modal final sin cerrarse.
   *
   * `extras` contiene cosas que no son parte del `CharacterInput` (hoy solo
   * el `avatarFile` opcional, que el padre debe subir tras crear el PJ).
   */
  onComplete: (
    input: Partial<CharacterInput>,
    extras: WizardCompleteExtras,
  ) => void;
  /** Callback al cancelar el wizard (saldrá de la creación). */
  onCancel: () => void;
  /** Si el padre está guardando, el modal final muestra spinner. */
  saving?: boolean;
  /** Mensaje de error del guardado; se muestra dentro del modal final. */
  saveError?: string | null;
  clans: Clan[];
  archetypes: Archetype[];
  disciplines: Discipline[];
  backgrounds: Background[];
  /** Catálogo de atributos para tooltips/info (opcional). */
  attributesInfo?: AttributeInfo[];
  /** Catálogo de habilidades para tooltips/info (opcional). */
  abilitiesInfo?: AbilityInfo[];
  /** Catálogo de virtudes para tooltips/info (opcional). */
  virtuesInfo?: Virtue[];
  /** Catálogo de armas para el paso "Equipo". */
  weapons?: Weapon[];
  /** Catálogo de categorías de armas (agrupado en el select). */
  weaponCategories?: WeaponCategory[];
  /** Catálogo de armaduras para el paso "Equipo". */
  armors?: Armor[];
}

/** Callback compartido para abrir el InfoModal del catálogo. */
export type OpenCatalogInfo = (
  kind: InfoKind,
  identifier: string,
  fallbackTitle?: string,
) => void;

/**
 * Wizard fullscreen para crear un personaje V20.
 *
 * Mantiene su propio estado y al terminar produce un `Partial<CharacterInput>`
 * que la ruta `/characters/new` vuelca sobre el formulario para que el
 * jugador revise y guarde. No persiste nada en backend por sí mismo.
 */
export function CharacterWizard({
  open,
  onComplete,
  onCancel,
  saving = false,
  saveError = null,
  clans,
  archetypes,
  disciplines,
  backgrounds,
  attributesInfo = [],
  abilitiesInfo = [],
  virtuesInfo = [],
  weapons = [],
  weaponCategories = [],
  armors = [],
}: CharacterWizardProps) {
  const [state, setState] = useState<WizardState>(() => emptyWizardState());
  // Issues mostrados al usuario tras intentar avanzar con el paso incompleto.
  // Se limpian al cambiar de paso o cuando el paso pasa a ser válido.
  const [showIssues, setShowIssues] = useState(false);
  // Modal de cierre: anuncio "personaje listo" antes de guardar.
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { open: openCatalog, modal: infoModal } = useInfoModal();

  // Bloquea scroll del body mientras el wizard está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Si el usuario hizo aparecer el banner de issues y luego completó lo que
  // faltaba, ocultamos automáticamente el banner (sin obligarle a cerrarlo).
  useEffect(() => {
    if (!showIssues) return;
    if (canAdvance(state, state.step)) setShowIssues(false);
  }, [showIssues, state]);

  // Al disparar el banner, asegurar que sea visible: scroll del main al tope
  // y foco en el banner para lectores de pantalla.
  useEffect(() => {
    if (!showIssues) return;
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    bannerRef.current?.focus();
  }, [showIssues]);

  if (!open) return null;

  const step = state.step;
  const stepMeta = WIZARD_STEPS[step];
  const isLast = step === WIZARD_STEP_COUNT - 1;
  const canNext = canAdvance(state, step);
  // Issues actuales del paso. Solo se muestran al usuario si pulsó "Siguiente"
  // estando incompleto (`showIssues`), pero los calculamos en cada render para
  // ocultar el banner automáticamente apenas el paso queda válido.
  const issues = validationIssues(state, step);

  function goPrev() {
    setShowIssues(false);
    setState((s) => ({ ...s, step: Math.max(0, s.step - 1) }));
  }

  function goNext() {
    if (!canNext) {
      // El usuario intentó avanzar con el paso incompleto: mostramos el
      // listado de issues para que sepa qué le falta.
      setShowIssues(true);
      return;
    }
    setShowIssues(false);
    if (isLast) {
      // Último paso: en vez de cerrar directamente, mostramos el modal de
      // confirmación que avisa al jugador que el personaje base está listo
      // y que de aquí en adelante las mejoras se conversan con el narrador.
      setShowCompleteModal(true);
      return;
    }
    setState((s) => ({ ...s, step: Math.min(WIZARD_STEP_COUNT - 1, s.step + 1) }));
  }

  function handleConfirmComplete() {
    const mapped = wizardStateToCharacterInput(state, { backgrounds });
    onComplete(mapped, { avatarFile: state.concept.avatarFile ?? null });
  }

  async function handleExit() {
    const ok = await confirm({
      title: "Salir de la creación",
      description:
        "Vas a cerrar el asistente y volver a tu lista de personajes. Perderás todo lo que has avanzado aquí.",
      confirmLabel: "Salir",
      cancelLabel: "Seguir creando",
      tone: "danger",
    });
    if (ok) onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Padding lateral unificado con el resto del app: `px-3` en mobile
          y `sm:px-[5vw]` para dejar 90vw útiles, igual que `layouts/private.tsx`. */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card/40 px-3 py-3 sm:px-[5vw]">
        <div className="min-w-0">
          <p className="font-heading text-[0.6rem] uppercase tracking-[0.3em] text-blood sm:text-[0.65rem]">
            Creación · V20
          </p>
          <h1 className="font-display text-base text-foreground sm:text-xl">
            Paso {step + 1} de {WIZARD_STEP_COUNT} · {stepMeta.title}
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={handleExit}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" /> Salir
        </Button>
      </header>

      <div className="border-b border-border/60 bg-background/60 px-3 py-3 sm:px-[5vw]">
        <WizardStepper current={step} />
      </div>

      <main
        ref={mainRef}
        className="w-full flex-1 overflow-y-auto px-3 py-6 sm:px-[5vw]"
      >
        {showIssues && issues.length > 0 ? (
          <ValidationBanner
            ref={bannerRef}
            stepTitle={stepMeta.title}
            issues={issues}
            onDismiss={() => setShowIssues(false)}
          />
        ) : null}
        {renderStep(state, setState, {
          clans,
          archetypes,
          disciplines,
          backgrounds,
          attributesInfo,
          abilitiesInfo,
          virtuesInfo,
          weapons,
          weaponCategories,
          armors,
          openCatalog,
        })}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card/40 px-3 py-3 sm:px-[5vw]">
        <Button
          type="button"
          variant="ghost"
          onClick={goPrev}
          disabled={step === 0}
        >
          <ArrowLeft className="size-4" /> Anterior
        </Button>
        <div className="flex items-center gap-3">
          {!canNext ? (
            <span
              className="hidden max-w-md items-center gap-1.5 text-right text-xs text-amber-300 sm:inline-flex"
              title={issues.join(" · ")}
            >
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="truncate">
                {issues[0] ?? "Completa este paso para avanzar."}
                {issues.length > 1 ? ` (+${issues.length - 1} más)` : ""}
              </span>
            </span>
          ) : null}
          {/* No deshabilitamos el botón cuando el paso es inválido: al
              clickearlo disparamos el banner con los issues, mejor feedback
              que un botón muerto sin pistas. */}
          <Button
            type="button"
            onClick={goNext}
            aria-disabled={!canNext}
            className={cn(
              "bg-blood text-blood-foreground hover:bg-blood/90",
              !canNext && "opacity-60 hover:bg-blood/60",
            )}
          >
            {isLast ? (
              <>
                <Check className="size-4" /> Finalizar personaje
              </>
            ) : (
              <>
                Siguiente <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </footer>

      {confirmDialog}
      {infoModal}
      <CompletionDialog
        open={showCompleteModal}
        characterName={state.concept.name.trim()}
        saving={saving}
        error={saveError}
        onCancel={() => setShowCompleteModal(false)}
        onConfirm={handleConfirmComplete}
      />
    </div>
  );
}

interface ValidationBannerProps {
  stepTitle: string;
  issues: string[];
  onDismiss: () => void;
}

const ValidationBanner = forwardRef<HTMLDivElement, ValidationBannerProps>(
  function ValidationBanner({ stepTitle, issues, onDismiss }, ref) {
    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        tabIndex={-1}
        className="mb-6 flex items-start gap-3 rounded-lg border border-blood/60 bg-blood/15 px-4 py-3 text-sm text-foreground shadow-lg shadow-blood/20 outline-none ring-blood/40 focus-visible:ring-2"
      >
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-blood/30 text-blood">
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-heading text-xs uppercase tracking-widest text-blood">
            No puedes avanzar todavía — falta completar «{stepTitle}»
          </p>
          <p className="font-serif text-[0.8rem] text-foreground/80">
            {issues.length === 1
              ? "Antes de seguir, resuelve lo siguiente:"
              : `Antes de seguir, resuelve los ${issues.length} puntos siguientes:`}
          </p>
          <ul className="ml-4 list-disc space-y-0.5 font-serif text-foreground/90">
            {issues.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="text-muted-foreground transition hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  },
);

interface CompletionDialogProps {
  open: boolean;
  characterName: string;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function CompletionDialog({
  open,
  characterName,
  saving,
  error,
  onConfirm,
  onCancel,
}: CompletionDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onCancel]);

  if (!open) return null;

  const displayName = characterName || "Tu vástago";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-complete-title"
      className="fixed inset-0 z-60 flex items-center justify-center bg-background/85 px-4 backdrop-blur-sm"
      onClick={() => {
        if (!saving) onCancel();
      }}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-blood/50 bg-card shadow-2xl shadow-blood/30"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-border/60 bg-linear-to-br from-blood/20 via-blood/10 to-transparent px-5 py-4">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-blood/25 text-blood">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-[0.65rem] uppercase tracking-[0.3em] text-blood">
              Personaje completo
            </p>
            <h2
              id="wizard-complete-title"
              className="font-display text-xl text-foreground"
            >
              {displayName} ha despertado
            </h2>
          </div>
        </header>

        <div className="space-y-3 px-5 py-4 font-serif text-sm leading-relaxed text-foreground/85">
          <p>
            Has terminado la creación de tu personaje base según el manual V20.
            Atributos, habilidades, disciplinas, virtudes, trasfondos y notas
            quedan listos para entrar a la crónica.
          </p>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[0.8rem] text-amber-200/90">
            <p className="font-heading text-[0.65rem] uppercase tracking-widest text-amber-300">
              Aviso del Narrador
            </p>
            <p className="mt-1">
              A partir de este punto, <strong>cualquier mejora</strong> sobre la
              ficha (subir atributos, comprar disciplinas, añadir trasfondos,
              cambiar virtudes o equipo significativo) debe{" "}
              <strong>conversarse con tu narrador</strong>. Las hojas vivas se
              modifican durante el juego con experiencia y aprobación de la
              mesa.
            </p>
          </div>
          <p className="text-[0.8rem] text-muted-foreground">
            Al confirmar se guardará el personaje y serás llevado a su hoja.
            Después podrás afinar detalles menores (notas, equipo descriptivo)
            cuando quieras.
          </p>
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[0.8rem] text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/60 bg-background/40 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
          >
            Revisar de nuevo
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="bg-blood text-blood-foreground hover:bg-blood/90"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {saving ? "Guardando..." : "Guardar y entrar"}
          </Button>
        </footer>
      </div>
    </div>
  );
}

interface RenderContext {
  clans: Clan[];
  archetypes: Archetype[];
  disciplines: Discipline[];
  backgrounds: Background[];
  attributesInfo: AttributeInfo[];
  abilitiesInfo: AbilityInfo[];
  virtuesInfo: Virtue[];
  weapons: Weapon[];
  weaponCategories: WeaponCategory[];
  armors: Armor[];
  openCatalog: OpenCatalogInfo;
}

function renderStep(
  state: WizardState,
  setState: React.Dispatch<React.SetStateAction<WizardState>>,
  ctx: RenderContext,
) {
  switch (state.step) {
    case 0:
      return (
        <StepConcept
          value={state.concept}
          onChange={(concept) => setState((s) => ({ ...s, concept }))}
          clans={ctx.clans}
          archetypes={ctx.archetypes}
          openCatalog={ctx.openCatalog}
        />
      );
    case 1:
      return (
        <StepAttributes
          state={state}
          onChange={(attributes) => setState((s) => ({ ...s, attributes }))}
          attributesInfo={ctx.attributesInfo}
          openCatalog={ctx.openCatalog}
        />
      );
    case 2:
      return (
        <StepAbilities
          state={state}
          onChange={(abilities) => setState((s) => ({ ...s, abilities }))}
          abilitiesInfo={ctx.abilitiesInfo}
          openCatalog={ctx.openCatalog}
        />
      );
    case 3:
      return (
        <StepDisciplines
          state={state}
          disciplines={ctx.disciplines}
          clans={ctx.clans}
          onChange={(disciplines) => setState((s) => ({ ...s, disciplines }))}
          openCatalog={ctx.openCatalog}
        />
      );
    case 4:
      return (
        <StepBackgrounds
          state={state}
          backgrounds={ctx.backgrounds}
          onChange={(backgrounds) => setState((s) => ({ ...s, backgrounds }))}
          openCatalog={ctx.openCatalog}
        />
      );
    case 5:
      return (
        <StepVirtues
          state={state}
          onChange={(virtues) => setState((s) => ({ ...s, virtues }))}
          virtuesInfo={ctx.virtuesInfo}
        />
      );
    case 6:
      return <StepFinishing state={state} />;
    case 7:
      return (
        <StepFreebies
          state={state}
          disciplines={ctx.disciplines}
          backgrounds={ctx.backgrounds}
          onChange={(freebies) => setState((s) => ({ ...s, freebies }))}
          attributesInfo={ctx.attributesInfo}
          abilitiesInfo={ctx.abilitiesInfo}
          virtuesInfo={ctx.virtuesInfo}
          openCatalog={ctx.openCatalog}
        />
      );
    case 8:
      return (
        <StepEquipment
          state={state}
          onChangeNotes={(equipmentNotes) =>
            setState((s) => ({ ...s, equipmentNotes }))
          }
          onChangeWeapons={(weapons) => setState((s) => ({ ...s, weapons }))}
          onChangeArmors={(armors) => setState((s) => ({ ...s, armors }))}
          weapons={ctx.weapons}
          weaponCategories={ctx.weaponCategories}
          armors={ctx.armors}
        />
      );
    case 9:
      return (
        <StepNotes
          state={state}
          onChange={(notes) => setState((s) => ({ ...s, notes }))}
        />
      );
    default:
      return null;
  }
}
