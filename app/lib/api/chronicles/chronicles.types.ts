import type { UserSummary } from "~/lib/api/users/users.types";

export type ChronicleMemberRole = "NARRATOR" | "PLAYER";

export type ChronicleInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "CANCELLED"
  | "EXPIRED";

export interface ChronicleMember {
  id: string;
  role: ChronicleMemberRole;
  joinedAt: string;
  user: UserSummary;
}

export interface ChronicleInvitation {
  id: string;
  email: string;
  status: ChronicleInvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedUser: UserSummary | null;
}

export interface ChronicleListItem {
  id: string;
  name: string;
  description: string | null;
  setting: string | null;
  image: string | null;
  narratorId: string;
  narrator: UserSummary;
  members: ChronicleMember[];
  createdAt: string;
  updatedAt: string;
  _count: { members: number; invitations: number };
}

export interface Chronicle {
  id: string;
  name: string;
  description: string | null;
  setting: string | null;
  image: string | null;
  narratorId: string;
  narrator: UserSummary;
  members: ChronicleMember[];
  invitations: ChronicleInvitation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateChronicleInput {
  name: string;
  description?: string;
  setting?: string;
}

export interface UpdateChronicleInput {
  name?: string;
  description?: string;
  setting?: string;
}

export interface InvitationPreview {
  id: string;
  email: string;
  status: ChronicleInvitationStatus;
  expiresAt: string;
  chronicle: {
    id: string;
    name: string;
    description: string | null;
    setting: string | null;
  };
  invitedBy: UserSummary;
}

export interface MyInvitation {
  id: string;
  token: string;
  email: string;
  status: ChronicleInvitationStatus;
  expiresAt: string;
  createdAt: string;
  chronicle: { id: string; name: string; setting: string | null };
  invitedBy: { id: string; email: string; nickname: string };
}
