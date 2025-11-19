"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConsoleFrame } from "@/components/ui/console-frame";
import { QRTile } from "@/components/tickets/qr-tile";
import { PDFDownloadButton } from "@/components/tickets/pdf-download-button";
import { api } from "@/services/api";

type TicketState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      payload: Awaited<ReturnType<typeof api.getTicket>>;
    };

export default function TicketsPage() {
  const [state, setState] = useState<TicketState>({ status: "loading" });

  useEffect(() => {
    async function load() {
      try {
        const ticket = await api.getTicket();
        setState({ status: "loaded", payload: ticket });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ошибка получения билета";
        toast.error("Матрица не выдала билет", { description: message });
        setState({ status: "error", message });
      }
    }
    void load();
  }, []);

  if (state.status === "loading") {
    return (
      <ConsoleFrame className="flex h-[420px] items-center justify-center text-xs uppercase tracking-[0.24em] text-evm-muted">
        Загрузка билета...
      </ConsoleFrame>
    );
  }

  if (state.status === "error") {
    return (
      <ConsoleFrame className="space-y-4 text-center">
        <h2 className="text-lg uppercase tracking-[0.28em] text-evm-accent">
          Ошибка получения билета
        </h2>
        <p className="text-sm uppercase tracking-[0.2em] text-evm-muted">
          {state.message}
        </p>
      </ConsoleFrame>
    );
  }

  const ticket = state.payload;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          Пропуск оператора
        </p>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
          Ваш билет в E.V.M.
        </h2>
      </div>
      <ConsoleFrame className="flex flex-col items-center gap-6 px-10 py-12 text-center">
        <QRTile code={ticket.qr} />
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-evm-muted">
            Статус: {ticket.status === "issued" ? "выдан" : "не готов"}
          </p>
          <PDFDownloadButton ticketId={ticket.id} />
        </div>
      </ConsoleFrame>
    </div>
  );
}

