"use client";

import { Badge } from "@/components/ui/badge";

type BadgeListProps = {
  badges: Array<{ id: string; title: string; description?: string }>;
};

export function BadgeList({ badges }: BadgeListProps) {
  if (badges.length === 0) {
    return (
      <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
        Титулы ещё не получены.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="flex flex-col gap-1 rounded-md border border-evm-steel/40 bg-black/30 p-3"
        >
          <Badge>{badge.title}</Badge>
          {badge.description ? (
            <span className="text-[0.7rem] uppercase tracking-[0.18em] text-evm-muted">
              {badge.description}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

