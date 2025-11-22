import { Router } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { tickets } from "../db/schema.js";
import { getRequestUser } from "../utils/get-request-user.js";
import { generateTicketPDF } from "../services/ticket-pdf.js";

const router = Router();

router.get("/me", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(404).json({ message: "Пользователь не найден" });
    }

    let ticket = db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, user.id))
      .get();

    // Если билета нет, создаем его автоматически со статусом "none"
    if (!ticket) {
      const ticketId = `tk-${user.id}`;
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const qrCode = `EVM-QR-${user.tabNumber.toUpperCase()}-${dateStr}`;
      const pdfUrl = `/tickets/${ticketId}/pdf`;

      db.insert(tickets)
        .values({
          id: ticketId,
          userId: user.id,
          qr: qrCode,
          pdfUrl: pdfUrl,
          status: "none",
        })
        .run();

      ticket = db
        .select()
        .from(tickets)
        .where(eq(tickets.userId, user.id))
        .get();
    }

    if (!ticket) {
      return response.status(500).json({
        message: "Не удалось создать билет пользователя",
      });
    }

    return response.json(ticket);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось получить билет пользователя",
    });
  }
});

router.get("/:id/pdf", async (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const ticketId = request.params.id;

    // Защита от конфликта с маршрутом /me
    if (ticketId === "me") {
      return response.status(400).json({ message: "Некорректный ID билета" });
    }

    // Проверяем, что билет принадлежит пользователю или пользователь - админ
    const ticket = db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .get();

    if (!ticket) {
      return response.status(404).json({ message: "Билет не найден" });
    }

    // Проверяем права доступа (только владелец билета или админ)
    if (ticket.userId !== user.id && user.role !== "admin") {
      return response.status(403).json({ message: "Доступ запрещен" });
    }

    // Генерируем PDF
    const pdfBuffer = await generateTicketPDF(ticketId);

    // Устанавливаем заголовки для скачивания PDF
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="ticket-${ticketId}.pdf"`,
    );
    response.setHeader("Content-Length", pdfBuffer.length.toString());

    // Отправляем PDF
    response.send(pdfBuffer);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    console.error("Error generating PDF:", error);
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось сгенерировать PDF билета",
    });
  }
});

export default router;

