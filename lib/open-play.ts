import type { BadgeVariant } from "@/components/ui/badge";

export type OpenPlaySkillLevel = "beginner" | "intermediate" | "advanced";

export type OpenPlaySessionStatus = "scheduled" | "cancelled" | "completed";

export type OpenPlaySession = {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  skillLevel: OpenPlaySkillLevel;
  capacity: number;
  amountPhp: number;
  status: OpenPlaySessionStatus;
  registeredCount: number;
};

/** A row returned by get_open_play_sessions/get_open_play_session. */
export type OpenPlaySessionRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  skill_level: OpenPlaySkillLevel;
  capacity: number;
  amount_php: number | string;
  status: OpenPlaySessionStatus;
  registered_count: number;
};

export const OPEN_PLAY_LEVELS: Record<
  OpenPlaySkillLevel,
  { label: string; description: string; variant: BadgeVariant }
> = {
  beginner: {
    label: "Beginner",
    description: "New to pickleball or still building consistency.",
    variant: "lime",
  },
  intermediate: {
    label: "Intermediate",
    description: "Comfortable rallying, serving, and keeping score.",
    variant: "info",
  },
  advanced: {
    label: "Advanced",
    description: "Fast rallies and competitive, consistent play.",
    variant: "warning",
  },
};

export const OPEN_PLAY_STATUS: Record<
  OpenPlaySessionStatus,
  { label: string; variant: BadgeVariant }
> = {
  scheduled: { label: "Open", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  completed: { label: "Completed", variant: "info" },
};

export function openPlayLevelLabel(level: OpenPlaySkillLevel) {
  return OPEN_PLAY_LEVELS[level]?.label ?? level;
}

export function openPlayLevelMeta(level: OpenPlaySkillLevel) {
  return (
    OPEN_PLAY_LEVELS[level] ?? {
      label: level,
      description: "",
      variant: "neutral" as BadgeVariant,
    }
  );
}

export function openPlaySessionStatusMeta(status: OpenPlaySessionStatus) {
  return (
    OPEN_PLAY_STATUS[status] ?? {
      label: status,
      variant: "neutral" as BadgeVariant,
    }
  );
}

export function openPlaySpotsRemaining(session: OpenPlaySession) {
  return Math.max(session.capacity - session.registeredCount, 0);
}

export function isOpenPlaySessionFull(session: OpenPlaySession) {
  return openPlaySpotsRemaining(session) === 0;
}

export function mapOpenPlaySession(row: OpenPlaySessionRow): OpenPlaySession {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    durationMinutes: row.duration_minutes,
    skillLevel: row.skill_level,
    capacity: row.capacity,
    amountPhp: Number(row.amount_php),
    status: row.status,
    registeredCount: row.registered_count,
  };
}
