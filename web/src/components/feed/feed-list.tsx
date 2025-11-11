"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFeedStore } from "@/store/use-feed-store";
import { formatRelative } from "@/lib/utils";

export function FeedList() {
  const { comments, load, isLoading } = useFeedStore();

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Лента сообщений</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
            Загрузка событий...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (comments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Лента сообщений</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
            Матрица не зарегистрировала активности.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Лента сообщений</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.map((comment, index) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-md border border-evm-steel/40 bg-black/30 p-4"
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline">{comment.entityType}</Badge>
              <span className="text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
                {formatRelative(comment.createdAt)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {comment.body}
            </p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

