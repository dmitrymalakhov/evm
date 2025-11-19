"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type PDFDownloadButtonProps = {
  ticketId: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export function PDFDownloadButton({ ticketId }: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      // Формируем URL для скачивания PDF по ID билета
      const fullUrl = `${API_BASE_URL}/tickets/${ticketId}/pdf`;

      // Получаем токен из localStorage через API helper
      const TOKEN_STORAGE_KEY = "evm.auth";
      let accessToken: string | null = null;
      
      if (typeof window !== "undefined") {
        try {
          const tokens = window.localStorage.getItem(TOKEN_STORAGE_KEY);
          if (tokens) {
            const parsed = JSON.parse(tokens) as { accessToken?: string; expiresAt?: number };
            // Проверяем, не истек ли токен
            if (parsed.accessToken && parsed.expiresAt && parsed.expiresAt > Date.now()) {
              accessToken = parsed.accessToken;
            }
          }
        } catch (error) {
          console.error("Error reading auth token:", error);
        }
      }

      // Загружаем PDF с авторизацией
      const headers: HeadersInit = {
        "Accept": "application/pdf",
      };
      
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(fullUrl, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Не удалось загрузить PDF";
        
        if (response.status === 401) {
          errorMessage = "Требуется авторизация";
        } else if (response.status === 403) {
          errorMessage = "Доступ запрещен";
        } else if (response.status === 404) {
          errorMessage = "PDF не найден";
        } else if (response.status >= 500) {
          errorMessage = "Ошибка сервера при генерации PDF";
        }
        
        throw new Error(errorMessage);
      }

      // Проверяем, что это действительно PDF
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/pdf")) {
        throw new Error("Получен файл неверного формата");
      }

      // Создаем blob и скачиваем
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Очищаем ресурсы
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast.success("PDF билета скачан");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "Не удалось скачать PDF";
      toast.error("Ошибка скачивания", {
        description: errorMessage,
      });
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

