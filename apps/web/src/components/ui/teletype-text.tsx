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
  const characters = useMemo(() => text.split(""), [text]);

  useEffect(() => {
    let active = true;
    let index = 0;

    function typeNext() {
      if (!active) return;
      setDisplayed((prev) => {
        const next = prev + characters[index];
        return next;
      });
      index += 1;
      if (index < characters.length) {
        setTimeout(typeNext, speed);
      } else if (loop) {
        setTimeout(() => {
          if (!active) return;
          setDisplayed("");
          index = 0;
          typeNext();
        }, 1200);
      }
    }

    setDisplayed("");
    typeNext();

    return () => {
      active = false;
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

