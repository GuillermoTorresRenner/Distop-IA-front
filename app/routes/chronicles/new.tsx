import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { PageHeader } from "~/components/common/page-header";
import { SubmitButton } from "~/components/common/submit-button";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { createChronicle } from "~/lib/api/chronicles/chronicles.api";

export function meta() {
  return [{ title: "Nueva crónica · Distop-IA VTT" }];
}

export default function NewChronicleRoute() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [setting, setSetting] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const chronicle = await createChronicle({
        name: name.trim(),
        setting: setting.trim() || undefined,
        description: description.trim() || undefined,
      });
      navigate(`/chronicles/${chronicle.id}`, { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo crear la crónica"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Nuevo pacto"
        title="Forjar una crónica"
        description="Como Narrador definirás el escenario y convocarás a tu manada."
      />

      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border border-border/60 bg-card/70 p-6 shadow-sm shadow-black/30"
      >
        {error ? <FormAlert message={error} /> : null}

        <FormField
          label="Nombre de la crónica"
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Noches de Chicago"
        />

        <FormField
          label="Ambientación"
          name="setting"
          maxLength={120}
          value={setting}
          onChange={(e) => setSetting(e.target.value)}
          hint="Opcional. Ej. Chicago 1998, Camarilla."
          placeholder="Chicago by Night"
        />

        <div className="space-y-1.5">
          <Label
            htmlFor="description"
            className="font-heading text-xs uppercase tracking-widest text-muted-foreground"
          >
            Descripción
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Plantea el tono, las facciones, los temas..."
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link to="/chronicles">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <SubmitButton loading={loading} loadingText="Sellando pacto..." className="w-auto px-8">
            Crear crónica
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
