import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AuthCard } from "~/components/common/auth-card";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { SubmitButton } from "~/components/common/submit-button";
import { extractAuthError } from "~/components/common/auth-error";
import { login } from "~/lib/api/auth/auth.api";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Acceder · Distop-IA VTT" }];
}

function isSafeNext(value: string | null): value is string {
  return !!value && value.startsWith("/") && !value.startsWith("//");
}

export default function LoginRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useUserStore((s) => s.setUser);
  const prefilledEmail = searchParams.get("email") ?? "";
  const registered = searchParams.get("registered") === "1";
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login({ email, password });
      setUser(user);
      const target = isSafeNext(nextParam) ? nextParam : "/";
      navigate(target, { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo iniciar sesión"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Entrar al círculo interior"
      description="Las sombras reconocen a los suyos. Ingresa tus credenciales."
      footer={
        <span>
          ¿Aún no formas parte?{" "}
          <Link
            to={
              nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : "/register"
            }
            className="font-medium text-blood hover:underline"
          >
            Solicita un sitio en la mesa
          </Link>
        </span>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        {registered ? (
          <FormAlert
            kind="success"
            message="Cuenta creada. Inicia sesión con tus credenciales."
          />
        ) : null}
        {error ? <FormAlert message={error} /> : null}
        <FormField
          label="Correo"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@dominio.com"
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-blood"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <SubmitButton loading={loading} loadingText="Invocando...">
          Acceder
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
