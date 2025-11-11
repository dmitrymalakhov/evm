"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type PDFDownloadButtonProps = {
  href: string;
};

export function PDFDownloadButton({ href }: PDFDownloadButtonProps) {
  return (
    <Button asChild className="gap-2">
      <a href={href} download target="_blank" rel="noopener noreferrer">
        <Download className="h-4 w-4" />
        Скачать PDF (mock)
      </a>
    </Button>
  );
}

