import type { UserSummary } from "~/lib/api/users/users.types";

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type UserRelation =
  | "NONE"
  | "OUTGOING"
  | "INCOMING"
  | "FRIENDS"
  | "DECLINED";

export interface SearchableUser extends UserSummary {
  relation: UserRelation;
}

export interface SearchUsersResponse {
  data: SearchableUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Friendship {
  id: string;
  status: FriendshipStatus;
  createdAt: string;
  acceptedAt: string | null;
  requester: UserSummary;
  addressee: UserSummary;
}
