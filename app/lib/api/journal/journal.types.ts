import type { UserSummary } from "~/lib/api/users/users.types";

export interface JournalEntry {
  id: string;
  chronicleId: string;
  title: string;
  body: string;
  sessionDate: string | null;
  createdAt: string;
  updatedAt: string;
  author: UserSummary;
}

export type JournalEntryKind = "CHRONICLE" | "CHARACTER";

export interface JournalFeedEntry {
  id: string;
  kind: JournalEntryKind;
  chronicle: { id: string; name: string };
  title: string;
  body: string;
  sessionDate: string | null;
  createdAt: string;
  updatedAt: string;
  author: UserSummary;
}

export interface MyJournalFeed {
  chronicle: JournalFeedEntry[];
  character: JournalFeedEntry[];
}

export interface JournalEntryInput {
  title: string;
  body: string;
  sessionDate?: string;
}
