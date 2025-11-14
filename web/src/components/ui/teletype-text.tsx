"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

type TeletypeTextProps = {
  text: string;
  speed?: number;
  loop?: boolean;
  className?: string;
};

export function TeletypeText({
  text,
  speed = 22,
  loop = false,
  className,
}: TeletypeTextProps) {
  const [displayed, setDisplayed] = useState("");
  const characters = useMemo(() => Array.from(text ?? ""), [text]);

  useEffect(() => {
    let active = true;
    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function typeNext() {
      if (!active) return;
      const nextChar = characters[index];
      if (typeof nextChar === "string") {
        setDisplayed((prev) => prev + nextChar);
      }
      index += 1;
      if (index < characters.length) {
        timeoutId = setTimeout(typeNext, speed);
      } else if (loop) {
        timeoutId = setTimeout(() => {
          if (!active) return;
          setDisplayed("");
          index = 0;
          typeNext();
        }, 1200);
      }
    }

    setDisplayed("");
    if (characters.length > 0) {
      typeNext();
    }

    return () => {
      active = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [characters, speed, loop]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {displayed}
      <motion.span
        className="ml-1 inline-block h-4 w-2 translate-y-[1px] bg-evm-accent"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.9 }}
      />
    </motion.span>
  );
}

