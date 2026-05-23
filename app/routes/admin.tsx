import { Activity, Crown, Dice5, Mail, MessageSquare, Skull, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { redirect, useLoaderData } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "~/components/common/page-header";
import { getAuthSession } from "~/lib/api/auth/auth.server";
import {
  getAdminOverview,
  getDiceRollsSeries,
  getOnlineSnapshot,
  getRegistrationsSeries,
} from "~/lib/api/admin/admin.api";
import type {
  AdminOverviewStats,
  OnlineSnapshot,
  TimeSeriesPoint,
} from "~/lib/api/admin/admin.types";
import { createServerClient } from "~/lib/api/client";

export function meta() {
  return [{ title: "Panel de Administración · Distop-IA VTT" }];
}

interface AdminLoaderData {
  overview: AdminOverviewStats;
  registrations: TimeSeriesPoint[];
  diceRolls: TimeSeriesPoint[];
  online: OnlineSnapshot;
}

export async function loader({ request }: { request: Request }) {
  const { user } = await getAuthSession(request);
  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/");

  const client = createServerClient(request.headers.get("cookie"));

  // Paraleliza las cuatro llamadas. Si el backend falla en alguna devolvemos
  // payload vacío para no romper la render entera del panel.
  const [overview, registrations, diceRolls, online] = await Promise.all([
    getAdminOverview(client).catch(() => emptyOverview()),
    getRegistrationsSeries(30, client).catch(() => []),
    getDiceRollsSeries(30, client).catch(() => []),
    getOnlineSnapshot(client).catch(() => ({ count: 0, socketCount: 0, users: [] })),
  ]);

  return { overview, registrations, diceRolls, online } satisfies AdminLoaderData;
}

function emptyOverview(): AdminOverviewStats {
  return {
    users: { total: 0, active: 0, admins: 0, online: 0 },
    chronicles: { total: 0, withMembers: 0 },
    characters: { total: 0, byKind: { PC: 0, NPC: 0, ANTAGONIST: 0 } },
    invitations: { pending: 0, accepted: 0 },
    messages: { total: 0 },
    diceRolls: { total: 0 },
  };
}

// Paleta sangrienta: rojos, ámbar y violeta para diferenciar series.
const COLOR_BLOOD = "oklch(0.55 0.22 25)";
const COLOR_AMBER = "oklch(0.78 0.16 75)";
const COLOR_VIOLET = "oklch(0.6 0.18 300)";
const COLOR_ASH = "oklch(0.6 0.01 40)";
const PIE_COLORS = [COLOR_BLOOD, COLOR_AMBER, COLOR_VIOLET];

export default function AdminRoute() {
  const initial = useLoaderData() as AdminLoaderData;
  const [overview, setOverview] = useState(initial.overview);
  const [online, setOnline] = useState(initial.online);

  // Refresca KPIs + conectados cada 15s. Las series temporales no cambian
  // dentro del mismo día tan rápido como para justificar otro poll.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [next, snap] = await Promise.all([
          getAdminOverview(),
          getOnlineSnapshot(),
        ]);
        setOverview(next);
        setOnline(snap);
      } catch {
        // tolerate
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  const charactersByKind = [
    { name: "PC", value: overview.characters.byKind.PC },
    { name: "NPC", value: overview.characters.byKind.NPC },
    { name: "Antagonistas", value: overview.characters.byKind.ANTAGONIST },
  ].filter((d) => d.value > 0);

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Cámara del Príncipe"
        title="Panel de Administración"
        description={`Métricas globales de Distop-IA. ${online.count} usuario${
          online.count === 1 ? "" : "s"
        } conectado${online.count === 1 ? "" : "s"} ahora.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Usuarios totales"
          value={overview.users.total}
          hint={`${overview.users.active} activos · ${overview.users.admins} admin`}
        />
        <KpiCard
          icon={Activity}
          label="En línea ahora"
          value={online.count}
          hint={`${online.socketCount} pestañas`}
          accent
        />
        <KpiCard
          icon={Crown}
          label="Crónicas"
          value={overview.chronicles.total}
          hint={`${overview.chronicles.withMembers} con jugadores`}
        />
        <KpiCard
          icon={Skull}
          label="Personajes"
          value={overview.characters.total}
          hint={`${overview.characters.byKind.PC} PC · ${overview.characters.byKind.NPC} NPC`}
        />
        <KpiCard
          icon={Mail}
          label="Invitaciones"
          value={overview.invitations.pending + overview.invitations.accepted}
          hint={`${overview.invitations.pending} pendientes`}
        />
        <KpiCard
          icon={MessageSquare}
          label="Mensajes directos"
          value={overview.messages.total}
        />
        <KpiCard
          icon={Dice5}
          label="Tiradas registradas"
          value={overview.diceRolls.total}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Registros últimos 30 días"
          subtitle="Nuevos usuarios por día"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={initial.registrations}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: "currentColor", fontSize: 11 }}
                stroke="currentColor"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "currentColor", fontSize: 11 }}
                stroke="currentColor"
              />
              <RechartsTooltip
                content={<DarkTooltip />}
                cursor={{ fill: "rgba(160,18,28,0.08)" }}
              />
              <Bar dataKey="count" fill={COLOR_BLOOD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Tiradas últimos 30 días"
          subtitle="Volumen diario en mesa virtual"
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={initial.diceRolls}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: "currentColor", fontSize: 11 }}
                stroke="currentColor"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "currentColor", fontSize: 11 }}
                stroke="currentColor"
              />
              <RechartsTooltip
                content={<DarkTooltip />}
                cursor={{ stroke: COLOR_AMBER, strokeDasharray: "3 3" }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={COLOR_AMBER}
                strokeWidth={2}
                dot={{ r: 3, fill: COLOR_AMBER }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Distribución de personajes"
          subtitle="PC vs NPC vs Antagonistas"
        >
          {charactersByKind.length === 0 ? (
            <EmptyState>Aún no hay personajes creados.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={charactersByKind}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {charactersByKind.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip content={<DarkTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "currentColor" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Conectados ahora"
          subtitle={`${online.count} usuario${online.count === 1 ? "" : "s"}`}
        >
          {online.users.length === 0 ? (
            <EmptyState>Nadie conectado en este momento.</EmptyState>
          ) : (
            <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {online.users.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-md border border-border/50 bg-background/40 px-3 py-2 text-sm"
                >
                  <span className="inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(80,255,170,0.7)]" />
                  <span className="font-medium text-foreground">
                    {u.nickname}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {u.email}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function shortDate(iso: string): string {
  // "2026-05-22" → "22/05"
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}

function KpiCard({ icon: Icon, label, value, hint, accent = false }: KpiCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-card/80 p-4 shadow-sm ${
        accent
          ? "border-blood/60 ring-1 ring-blood/30"
          : "border-border/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <Icon
          className={`size-4 ${accent ? "text-blood" : "text-muted-foreground"}`}
        />
      </div>
      <div
        className={`mt-2 font-heading text-3xl tabular-nums ${
          accent ? "text-blood" : "text-foreground"
        }`}
      >
        {value.toLocaleString()}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="font-heading text-base uppercase tracking-wider text-foreground">
          {title}
        </h3>
        {subtitle ? (
          <p className="text-xs italic text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

interface DarkTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}

function DarkTooltip({ active, payload, label }: DarkTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-blood/40 bg-popover px-3 py-2 text-xs shadow-lg">
      {label ? (
        <div className="mb-1 font-heading uppercase tracking-wider text-foreground">
          {label}
        </div>
      ) : null}
      {payload.map((entry, i) => (
        <div
          key={i}
          className="flex items-center gap-2 text-popover-foreground"
        >
          <span
            className="inline-flex size-2 rounded-full"
            style={{ backgroundColor: entry.color ?? COLOR_ASH }}
          />
          <span>
            {entry.name ?? "valor"}: <strong>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm italic text-muted-foreground">
      {children}
    </div>
  );
}
