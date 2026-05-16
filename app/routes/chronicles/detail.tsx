import {
  BookOpen,
  Crown,
  Image as ImageIcon,
  Link2,
  Link2Off,
  Loader2,
  Mail,
  Plus,
  Send,
  Skull,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { ImageUploader } from "~/components/common/image-uploader";
import { CreateNpcDialog } from "~/components/character/create-npc-dialog";
import { PageHeader } from "~/components/common/page-header";
import { UserAutocomplete } from "~/components/common/user-autocomplete";
import { Button } from "~/components/ui/button";
import type { UserSummary } from "~/lib/api/users/users.types";
import { useConfirm } from "~/hooks/use-confirm";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import {
  linkCharacterToChronicle,
  listAssociableCharacters,
  listChronicleCharacters,
  unlinkCharacterFromChronicle,
  type AssociableCharacter,
  type ChronicleCharacterEntry,
} from "~/lib/api/characters/characters.api";
import {
  cancelInvitation,
  deleteChronicle,
  deleteChronicleImage,
  getChronicle,
  inviteToChronicle,
  removeMember,
  searchInvitableUsers,
  uploadChronicleImage,
} from "~/lib/api/chronicles/chronicles.api";
import type { Chronicle } from "~/lib/api/chronicles/chronicles.types";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Crónica · Distop-IA VTT" }];
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function ChronicleDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const { confirm, dialog } = useConfirm();

  const [chronicle, setChronicle] = useState<Chronicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteSelected, setInviteSelected] = useState<UserSummary | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [characters, setCharacters] = useState<ChronicleCharacterEntry[]>([]);
  const [associable, setAssociable] = useState<AssociableCharacter[]>([]);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [charsError, setCharsError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [npcDialogOpen, setNpcDialogOpen] = useState(false);

  async function reload() {
    if (!id) return;
    try {
      const [data, chars, options] = await Promise.all([
        getChronicle(id),
        listChronicleCharacters(id),
        listAssociableCharacters(id),
      ]);
      setChronicle(data);
      setCharacters(chars);
      setAssociable(options);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo cargar la crónica"));
    }
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getChronicle(id),
      listChronicleCharacters(id),
      listAssociableCharacters(id),
    ])
      .then(([data, chars, options]) => {
        setChronicle(data);
        setCharacters(chars);
        setAssociable(options);
      })
      .catch((err) => setError(extractAuthError(err, "No se pudo cargar la crónica")))
      .finally(() => setLoading(false));
  }, [id]);

  const inviteSearchFn = useCallback(
    (q: string) => (id ? searchInvitableUsers(id, q) : Promise.resolve([])),
    [id],
  );

  if (loading) {
    return (
      <p className="text-muted-foreground">Cargando crónica...</p>
    );
  }

  if (error || !chronicle) {
    return <FormAlert message={error ?? "Crónica no disponible"} />;
  }

  const isNarrator = chronicle.narratorId === user?.id;

  async function submitInvite(payload: { email?: string; userId?: string }) {
    if (!id) return;
    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoading(true);
    try {
      const inv = await inviteToChronicle(id, payload);
      setInviteSuccess(
        inv.invitedUser
          ? `Invitación enviada a ${inv.email} (usuario registrado).`
          : `Invitación enviada a ${inv.email}. Recibirá un enlace de registro.`,
      );
      setInviteQuery("");
      setInviteSelected(null);
      await reload();
    } catch (err) {
      setInviteError(extractAuthError(err, "No se pudo enviar la invitación"));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviteSelected) {
      await submitInvite({ userId: inviteSelected.id });
      return;
    }
    const email = inviteQuery.trim();
    if (!email) return;
    await submitInvite({ email });
  }

  async function handleCancel(invitationId: string, email: string) {
    if (!id) return;
    const ok = await confirm({
      title: "Cancelar invitación",
      description: (
        <>
          ¿Cancelar la invitación enviada a{" "}
          <strong className="text-foreground">{email}</strong>? El enlace dejará
          de funcionar.
        </>
      ),
      confirmLabel: "Cancelar invitación",
      cancelLabel: "Volver",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await cancelInvitation(id, invitationId);
      await reload();
    } catch (err) {
      setInviteError(extractAuthError(err, "No se pudo cancelar la invitación"));
    }
  }

  async function handleRemoveMember(userId: string, nickname: string) {
    if (!id) return;
    const ok = await confirm({
      title: "Expulsar miembro",
      description: (
        <>
          ¿Expulsar a{" "}
          <strong className="text-foreground">{nickname}</strong> de la crónica?
          Sus personajes asociados se mantendrán pero perderá acceso a la mesa.
        </>
      ),
      confirmLabel: "Expulsar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await removeMember(id, userId);
      await reload();
    } catch (err) {
      setError(extractAuthError(err, "No se pudo expulsar al miembro"));
    }
  }

  async function handleDelete() {
    if (!id) return;
    const ok = await confirm({
      title: "Disolver crónica",
      description:
        "¿Eliminar la crónica permanentemente? Esta acción no se puede deshacer y se perderán todos los miembros, invitaciones y vínculos a personajes.",
      confirmLabel: "Disolver",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteChronicle(id);
      navigate("/chronicles", { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo eliminar la crónica"));
    }
  }

  async function handleUploadImage(file: File) {
    if (!id) return;
    const updated = await uploadChronicleImage(id, file);
    setChronicle((prev) => (prev ? { ...prev, image: updated.image } : prev));
  }

  async function handleRemoveImage() {
    if (!id) return;
    const updated = await deleteChronicleImage(id);
    setChronicle((prev) => (prev ? { ...prev, image: updated.image } : prev));
  }

  async function handleLink() {
    if (!id || !linkTargetId) return;
    setCharsError(null);
    setLinking(true);
    try {
      await linkCharacterToChronicle(id, linkTargetId);
      setLinkTargetId("");
      await reload();
    } catch (err) {
      setCharsError(extractAuthError(err, "No se pudo asociar el personaje"));
    } finally {
      setLinking(false);
    }
  }

  async function handleDissociate(characterId: string, name: string, ownerId: string) {
    if (!id) return;
    const canRemove = isNarrator || ownerId === user?.id;
    if (!canRemove) return;
    const ok = await confirm({
      title: "Quitar de la mesa",
      description: (
        <>
          ¿Quitar a <strong className="text-foreground">{name}</strong> de esta
          crónica? El personaje seguirá existiendo en su perfil.
        </>
      ),
      confirmLabel: "Quitar",
      tone: "danger",
    });
    if (!ok) return;
    setCharsError(null);
    try {
      await unlinkCharacterFromChronicle(id, characterId);
      await reload();
    } catch (err) {
      setCharsError(extractAuthError(err, "No se pudo desasociar"));
    }
  }

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow={chronicle.setting || "Crónica"}
        title={chronicle.name}
        description={chronicle.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={`/chronicles/${chronicle.id}/journal`}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <BookOpen className="size-4" /> Bitácora
            </Link>
            {isNarrator ? (
              <Button
                variant="ghost"
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                Disolver
              </Button>
            ) : null}
          </div>
        }
      />

      {chronicle.image && !isNarrator ? (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <img
            src={chronicle.image}
            alt={`Cubierta de ${chronicle.name}`}
            className="aspect-video w-full object-cover"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              <Users className="size-4" /> Miembros ({chronicle.members.length})
            </h2>
            <ul className="space-y-2">
              {chronicle.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-blood/20 text-sm font-semibold uppercase text-blood">
                      {member.user.avatar ? (
                        <img
                          src={member.user.avatar}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        member.user.nickname.charAt(0)
                      )}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{member.user.nickname}</p>
                      <p className="font-serif text-xs italic text-muted-foreground">
                        {member.user.email} · se unió el {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === "NARRATOR" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blood/40 bg-blood/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blood">
                        <Crown className="size-3" /> Narrador
                      </span>
                    ) : (
                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Jugador
                      </span>
                    )}
                    {isNarrator && member.role !== "NARRATOR" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() =>
                          handleRemoveMember(
                            member.user.id,
                            member.user.nickname ?? member.user.email,
                          )
                        }
                        aria-label="Expulsar miembro"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
                <Skull className="size-4" /> Personajes de la mesa ({characters.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/characters/new?chronicleId=${chronicle.id}`}
                  title="Crear y asociar un personaje propio a esta crónica"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="border border-blood/40 text-blood hover:bg-blood/10"
                  >
                    <Plus className="size-4" /> Crear el mío
                  </Button>
                </Link>
                {isNarrator ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setNpcDialogOpen(true)}
                    className="bg-blood text-blood-foreground hover:bg-blood/90"
                    title="Crear PNJ o antagonista desde plantilla"
                  >
                    <Skull className="size-4" /> Crear PNJ / Antagonista
                  </Button>
                ) : null}
              </div>
            </header>

            {charsError ? <FormAlert message={charsError} /> : null}

            {associable.length > 0 ? (
              <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border/40 bg-background/40 p-3">
                <div className="flex-1 min-w-50 space-y-1">
                  <label className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                    {isNarrator
                      ? "Asociar personaje de la mesa"
                      : "Asociar uno de mis personajes"}
                  </label>
                  <select
                    value={linkTargetId}
                    onChange={(e) => setLinkTargetId(e.target.value)}
                    className={SELECT_DARK_CLASS}
                  >
                    <option value="">Selecciona un personaje...</option>
                    {isNarrator
                      ? Object.entries(
                          associable.reduce<Record<string, AssociableCharacter[]>>(
                            (acc, c) => {
                              const key = c.user.nickname ?? c.user.email;
                              (acc[key] ??= []).push(c);
                              return acc;
                            },
                            {},
                          ),
                        )
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([owner, list]) => (
                            <optgroup key={owner} label={owner}>
                              {list.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                  {c.clan?.name ? ` · ${c.clan.name}` : ""}
                                </option>
                              ))}
                            </optgroup>
                          ))
                      : associable.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.clan?.name ? ` · ${c.clan.name}` : ""}
                          </option>
                        ))}
                  </select>
                </div>
                <Button
                  type="button"
                  onClick={handleLink}
                  disabled={!linkTargetId || linking}
                  className="bg-blood text-blood-foreground hover:bg-blood/90"
                >
                  {linking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                  Asociar
                </Button>
              </div>
            ) : null}

            {characters.length === 0 ? (
              <p className="text-muted-foreground">
                Aún no hay personajes en esta mesa.
              </p>
            ) : (
              (() => {
                const pcs = characters.filter((c) => c.character.kind === "PC");
                const npcs = characters.filter(
                  (c) => c.character.kind === "NPC",
                );
                const antags = characters.filter(
                  (c) => c.character.kind === "ANTAGONIST",
                );

                function renderRow(entry: ChronicleCharacterEntry) {
                  const c = entry.character;
                  const isMine = c.userId === user?.id;
                  const canUnlink = isNarrator || isMine;
                  const kindBadge =
                    c.kind === "ANTAGONIST"
                      ? {
                          label: "Antagonista",
                          cls: "border-destructive/60 bg-destructive/10 text-destructive",
                        }
                      : c.kind === "NPC"
                        ? {
                            label: "PNJ",
                            cls: "border-amber-500/50 bg-amber-500/10 text-amber-300",
                          }
                        : null;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={isMine ? `/characters/${c.id}` : "#"}
                            className={`font-heading text-sm uppercase tracking-wide ${
                              isMine
                                ? "text-foreground hover:text-blood"
                                : "pointer-events-none text-foreground/80"
                            }`}
                          >
                            {c.name}
                          </Link>
                          {kindBadge ? (
                            <span
                              className={`rounded-full border px-2 py-0.5 font-heading text-[0.55rem] uppercase tracking-widest ${kindBadge.cls}`}
                            >
                              {kindBadge.label}
                            </span>
                          ) : null}
                        </div>
                        <p className="font-serif text-xs italic text-muted-foreground">
                          {c.clan?.name ?? "Sin clan"} ·{" "}
                          {c.concept ?? "Concepto sin definir"}
                        </p>
                        <p className="mt-0.5 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                          {c.kind === "PC" ? "Jugador: " : "Controlado por: "}
                          {c.user.nickname ?? c.user.email}
                          {isMine ? " · (tú)" : ""}
                        </p>
                      </div>
                      {canUnlink ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleDissociate(c.id, c.name, c.userId)}
                          aria-label={`Quitar ${c.name} de la mesa`}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Link2Off className="size-4" />
                        </Button>
                      ) : null}
                    </li>
                  );
                }

                function GroupHeading({
                  label,
                  count,
                }: {
                  label: string;
                  count: number;
                }) {
                  return (
                    <h3 className="mt-2 mb-1 font-heading text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                      {label} ({count})
                    </h3>
                  );
                }

                return (
                  <div className="space-y-4">
                    {pcs.length > 0 ? (
                      <div>
                        <GroupHeading label="Personajes jugadores" count={pcs.length} />
                        <ul className="space-y-2">{pcs.map(renderRow)}</ul>
                      </div>
                    ) : null}
                    {npcs.length > 0 ? (
                      <div>
                        <GroupHeading label="PNJs" count={npcs.length} />
                        <ul className="space-y-2">{npcs.map(renderRow)}</ul>
                      </div>
                    ) : null}
                    {antags.length > 0 ? (
                      <div>
                        <GroupHeading label="Antagonistas" count={antags.length} />
                        <ul className="space-y-2">{antags.map(renderRow)}</ul>
                      </div>
                    ) : null}
                  </div>
                );
              })()
            )}
          </article>

          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              <Mail className="size-4" /> Invitaciones pendientes ({chronicle.invitations.length})
            </h2>
            {chronicle.invitations.length === 0 ? (
              <p className="text-muted-foreground">
                Sin invitaciones pendientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {chronicle.invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">{inv.email}</p>
                      <p className="font-serif text-xs italic text-muted-foreground">
                        {inv.invitedUser
                          ? "Usuario registrado"
                          : "Pendiente de registro"}
                        {" · expira "}
                        {formatDate(inv.expiresAt)}
                      </p>
                    </div>
                    {isNarrator ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(inv.id, inv.email)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <aside className="space-y-6">
          {isNarrator ? (
            <article className="rounded-lg border border-border/60 bg-card/70 p-5">
              <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
                <ImageIcon className="size-4" /> Cubierta
              </h2>
              <p className="mb-4 font-serif text-sm italic text-muted-foreground">
                Sube una imagen representativa para la crónica (JPEG, PNG, WebP o GIF, máx. 8 MB).
              </p>
              <ImageUploader
                currentUrl={chronicle.image}
                onUpload={handleUploadImage}
                onRemove={handleRemoveImage}
                shape="rectangle"
                maxSizeMb={8}
                emptyHint="Sin cubierta"
                uploadLabel="Subir cubierta"
              />
            </article>
          ) : null}

          {isNarrator ? (
            <article className="rounded-lg border border-border/60 bg-card/70 p-5">
              <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
                <Send className="size-4" /> Invitar a la mesa
              </h2>
              <p className="mb-4 font-serif text-sm italic text-muted-foreground">
                Busca a un vástago por su nickname o correo. Si no aparece en
                el sistema, puedes invitarlo por correo y se le enviará un
                enlace de registro.
              </p>
              <form onSubmit={handleInvite} noValidate className="space-y-3">
                {inviteError ? <FormAlert message={inviteError} /> : null}
                {inviteSuccess ? <FormAlert kind="success" message={inviteSuccess} /> : null}
                <div className="space-y-1.5">
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    Jugador
                  </label>
                  <UserAutocomplete
                    value={inviteQuery}
                    onChange={(v) => {
                      setInviteQuery(v);
                      if (inviteSelected) setInviteSelected(null);
                    }}
                    onSelect={(u) => {
                      setInviteSelected(u);
                      setInviteQuery(u.email);
                    }}
                    searchFn={inviteSearchFn}
                    selectedLabel={
                      inviteSelected
                        ? `${inviteSelected.nickname} · ${inviteSelected.email}`
                        : null
                    }
                    onClearSelection={() => {
                      setInviteSelected(null);
                      setInviteQuery("");
                    }}
                    placeholder="Nickname o correo..."
                    disabled={inviteLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    {inviteSelected
                      ? "Se invitará al usuario registrado seleccionado."
                      : "Si el correo escrito no está registrado, se enviará una invitación de registro."}
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={
                    inviteLoading ||
                    (!inviteSelected && inviteQuery.trim().length === 0)
                  }
                  className="w-full bg-blood text-blood-foreground hover:bg-blood/90"
                >
                  {inviteLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {inviteSelected
                    ? "Invitar a la mesa"
                    : "Invitar por correo"}
                </Button>
              </form>
            </article>
          ) : null}

          <article className="rounded-lg border border-border/60 bg-card/70 p-5 text-sm">
            <h2 className="mb-3 font-heading text-xs uppercase tracking-[0.3em] text-blood">
              Datos
            </h2>
            <dl className="space-y-2 font-serif text-sm text-muted-foreground">
              <div>
                <dt className="text-xs uppercase tracking-widest">Narrador</dt>
                <dd className="text-foreground">{chronicle.narrator.nickname}</dd>
                <dd className="font-serif text-xs italic text-muted-foreground">
                  {chronicle.narrator.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest">Creada</dt>
                <dd>{formatDate(chronicle.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest">Actualizada</dt>
                <dd>{formatDate(chronicle.updatedAt)}</dd>
              </div>
            </dl>
          </article>
        </aside>
      </div>

      <CreateNpcDialog
        open={npcDialogOpen}
        chronicleId={chronicle.id}
        onClose={() => setNpcDialogOpen(false)}
      />

      {dialog}
    </section>
  );
}
