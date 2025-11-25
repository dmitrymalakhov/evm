"use client";

type TeletypeTextProps = {
  text: string;
  speed?: number;
  loop?: boolean;
  className?: string;
};

export function TeletypeText({
  text,
  speed,
  loop,
  className,
}: TeletypeTextProps) {
  return (
    <span className={className}>
      {text}
    </span>
  );
}

