"use client";

import { cn } from "@/lib/utils";

type KeySlotsProps = {
    collected: string[];
    total?: number;
};

export function KeySlots({ collected, total = 6 }: KeySlotsProps) {
    const slots = Array.from({ length: total }, (_, index) => ({
        index,
        filled: Boolean(collected[index]),
        label: collected[index] ?? `Слот-${index + 1}`,
    }));

    return (
        <div className="grid grid-cols-3 gap-3">
            {slots.map((slot) => (
                <div
                    key={slot.index}
                    className={cn(
                        "flex h-20 flex-col justify-between rounded-md border border-dashed border-evm-steel/50 bg-black/25 p-3",
                        slot.filled &&
                        "border-evm-matrix/70 bg-evm-matrix/10 shadow-[0_0_14px_rgba(8,200,112,0.3)]",
                    )}
                >
                    <span className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                        Слот {slot.index + 1}
                    </span>
                    <span
                        className={cn(
                            "text-sm font-semibold tracking-[0.08em]",
                            slot.filled ? "text-evm-matrix" : "text-evm-muted",
                        )}
                    >
                        {slot.filled ? "Ключ сохранён" : "Пусто"}
                    </span>
                </div>
            ))}
        </div>
    );
}

