"use client";

import { useEffect } from "react";

import { ThoughtsTicker } from "@/components/feed/thoughts-ticker";
import { FeedList } from "@/components/feed/feed-list";
import { AnonThoughtForm } from "@/components/feed/anon-thought-form";
import { useFeedStore } from "@/store/use-feed-store";

export default function FeedPage() {
  const { load } = useFeedStore();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold uppercase tracking-[0.28em]">
          Лента Матрицы
        </h2>
        <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          Канал связи с операторами сети E.V.M.
        </p>
        <ThoughtsTicker />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <FeedList />
        <AnonThoughtForm />
      </div>
    </div>
  );
}

