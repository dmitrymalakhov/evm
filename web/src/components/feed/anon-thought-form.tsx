"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFeedStore } from "@/store/use-feed-store";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";

export function AnonThoughtForm() {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { postThought } = useFeedStore();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    setIsSubmitting(true);
    try {
      const thought = await postThought(text.trim());
      toast.success("Мысль опубликована", {
        description: "Матрица зафиксировала вашу мысль.",
      });
      track(ANALYTICS_EVENTS.thoughtPosted, { id: thought.id });
      setText("");
    } catch (error) {
      toast.error("Матрица отклонила мысль", {
        description:
          error instanceof Error ? error.message : "Неизвестный сбой сети",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-evm-steel/40 bg-black/40 p-4"
    >
      <p className="text-xs uppercase tracking-[0.25em] text-evm-muted">
        Анонимная мысль · телетайп включен
      </p>
      <Textarea
        placeholder="Введите мысль, и она появится в ленте..."
        value={text}
        onChange={(event) => setText(event.target.value.toUpperCase())}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || text.trim().length < 3}>
          {isSubmitting ? "Передача..." : "Отправить"}
        </Button>
      </div>
    </form>
  );
}

