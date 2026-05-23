export interface AdminOverviewStats {
  users: { total: number; active: number; admins: number; online: number };
  chronicles: { total: number; withMembers: number };
  characters: {
    total: number;
    byKind: { PC: number; NPC: number; ANTAGONIST: number };
  };
  invitations: { pending: number; accepted: number };
  messages: { total: number };
  diceRolls: { total: number };
}

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface OnlineUserSummary {
  id: string;
  email: string;
  nickname: string;
  avatar: string | null;
}

export interface OnlineSnapshot {
  count: number;
  socketCount: number;
  users: OnlineUserSummary[];
}
