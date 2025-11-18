"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type PDFDownloadButtonProps = {
  href: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export function PDFDownloadButton({ href }: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      // Формируем полный URL
      const fullUrl = href.startsWith("http://") || href.startsWith("https://")
        ? href
        : `${API_BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

      // Получаем токен из localStorage
      const TOKEN_STORAGE_KEY = "evm.auth";
      const tokens = typeof window !== "undefined"
        ? window.localStorage.getItem(TOKEN_STORAGE_KEY)
        : null;
      const accessToken = tokens ? (JSON.parse(tokens) as { accessToken?: string }).accessToken : null;

      // Загружаем PDF с авторизацией
      const response = await fetch(fullUrl, {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {},
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить PDF");
      }

      // Создаем blob и скачиваем
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Не удалось скачать PDF. Проверьте авторизацию.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {isDownloading ? "Загрузка..." : "Скачать PDF"}
    </Button>
  );
}

