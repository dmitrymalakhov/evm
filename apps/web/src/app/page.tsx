 "use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConsoleFrame } from "@/components/ui/console-frame";
import { TeletypeText } from "@/components/ui/teletype-text";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(184,71,63,0.25),transparent_60%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-12 text-center">
        <motion.span
          className="text-xs uppercase tracking-[0.4em] text-evm-muted"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          ПРОБУЖДЕНИЕ E.V.M.
        </motion.span>

        <motion.h1
          className="text-glitch text-5xl font-bold uppercase tracking-[0.32em]"
          data-text="ЭЛЕКТРОННО-ВЫЧИСЛИТЕЛЬНАЯ МАТРИЦА"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          ЭЛЕКТРОННО-ВЫЧИСЛИТЕЛЬНАЯ МАТРИЦА
        </motion.h1>

        <ConsoleFrame className="max-w-3xl bg-black/70">
          <p className="text-sm uppercase tracking-[0.22em] text-evm-muted">
            Журнал связи №1977-2077
          </p>
          <TeletypeText
            className="mt-6 block text-lg leading-relaxed text-foreground"
            text="Матрица выходит из стазиса. Требуется оператор с табельным номером. Вход в систему ограничен. Подтвердите личность."
          />
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login" className="flex items-center gap-3">
                <span>Войти в систему</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/feed">Смотреть ленту</Link>
            </Button>
          </div>
        </ConsoleFrame>
      </div>
    </div>
  );
}
