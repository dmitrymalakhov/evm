import PDFDocument from "pdfkit";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { tickets, users, userWeekProgress } from "../db/schema";

export function generateTicketPDF(ticketId: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Получаем билет
      const ticket = db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .get();

      if (!ticket) {
        reject(new Error("Билет не найден"));
        return;
      }

      // Получаем пользователя
      const user = db
        .select()
        .from(users)
        .where(eq(users.id, ticket.userId))
        .get();

      if (!user) {
        reject(new Error("Пользователь не найден"));
        return;
      }

      // Получаем общее количество баллов пользователя
      const allProgress = db
        .select({
          pointsEarned: userWeekProgress.pointsEarned,
        })
        .from(userWeekProgress)
        .where(eq(userWeekProgress.userId, user.id))
        .all();

      const totalPoints = allProgress.reduce(
        (sum, progress) => sum + (progress.pointsEarned || 0),
        0,
      );

      // Создаем PDF документ
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => {
        reject(error);
      });

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;

      // Фон (темный)
      doc.rect(0, 0, pageWidth, pageHeight).fillColor("#000000").fill();

      // Заголовок
      doc
        .fontSize(32)
        .font("Helvetica-Bold")
        .fillColor("#00ff00")
        .text("E.V.M.", margin, margin + 20, { align: "center" });

      // Подзаголовок
      doc
        .fontSize(16)
        .font("Helvetica")
        .fillColor("#00ff00")
        .text("ПРОПУСК ОПЕРАТОРА", margin, margin + 60, { align: "center" });

      // Разделительная линия
      doc
        .moveTo(margin, margin + 100)
        .lineTo(pageWidth - margin, margin + 100)
        .strokeColor("#00ff00")
        .lineWidth(1)
        .stroke();

      // Информация о пользователе
      let yPos = margin + 130;

      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#888888")
        .text("ОПЕРАТОР:", margin, yPos);
      doc
        .font("Helvetica-Bold")
        .fillColor("#00ff00")
        .text(user.name, margin + 120, yPos);
      yPos += 30;

      doc
        .font("Helvetica")
        .fillColor("#888888")
        .text("ТАБЕЛЬНЫЙ НОМЕР:", margin, yPos);
      doc
        .font("Helvetica-Bold")
        .fillColor("#00ff00")
        .text(user.tabNumber, margin + 180, yPos);
      yPos += 30;

      // Баллы (выделяем)
      doc
        .font("Helvetica")
        .fillColor("#888888")
        .text("ЗАРАБОТАНО БАЛЛОВ:", margin, yPos);
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#00ff00")
        .text(totalPoints.toString(), margin + 200, yPos - 3);
      yPos += 50;

      // Разделительная линия
      doc
        .moveTo(margin, yPos)
        .lineTo(pageWidth - margin, yPos)
        .strokeColor("#00ff00")
        .lineWidth(1)
        .stroke();

      yPos += 30;

      // QR код
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#888888")
        .text("QR КОД:", margin, yPos);
      doc
        .font("Helvetica-Bold")
        .fillColor("#00ff00")
        .text(ticket.qr, margin + 100, yPos);
      yPos += 50;

      // Дата выдачи
      const issueDate = new Date().toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666666")
        .text(`Выдан: ${issueDate}`, margin, yPos, { align: "center" });

      // Подвал
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#444444")
        .text(
          "Данный пропуск дает право доступа в систему E.V.M.",
          margin,
          pageHeight - margin - 20,
          { align: "center" },
        );

      // Завершаем документ
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

