import PDFDocument from "pdfkit";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { tickets, users, userWeekProgress } from "../db/schema.js";

// Простая функция транслитерации для кириллицы
function transliterate(text: string): string {
  const cyrillicToLatin: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya",
    А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "Yo", Ж: "Zh",
    З: "Z", И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O",
    П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F", Х: "H", Ц: "Ts",
    Ч: "Ch", Ш: "Sh", Щ: "Sch", Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu",
    Я: "Ya",
  };

  return text
    .split("")
    .map((char) => cyrillicToLatin[char] || char)
    .join("")
    .toUpperCase();
}

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

      // Получаем персональные баллы пользователя из userWeekProgress
      // Персональные баллы хранятся в pointsEarned для каждой недели
      const userProgress = db
        .select({
          pointsEarned: userWeekProgress.pointsEarned,
          week: userWeekProgress.week,
        })
        .from(userWeekProgress)
        .where(eq(userWeekProgress.userId, user.id))
        .all();

      // Суммируем все персональные баллы пользователя из всех недель
      const totalPoints = userProgress.reduce(
        (sum, progress) => sum + (progress.pointsEarned || 0),
        0,
      );

      // Создаем PDF документ с поддержкой Unicode
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        autoFirstPage: true,
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

      // Новогодний фон (темный с градиентом)
      doc.rect(0, 0, pageWidth, pageHeight).fillColor("#0a0a0a").fill();
      
      // Декоративные новогодние элементы - снежинки
      const drawSnowflake = (x: number, y: number, size: number) => {
        doc.save();
        doc.translate(x, y);
        doc.strokeColor("#ffffff").lineWidth(0.5);
        for (let i = 0; i < 6; i++) {
          doc.rotate(60);
          doc.moveTo(0, 0).lineTo(0, size);
          doc.moveTo(-size * 0.3, size * 0.3).lineTo(size * 0.3, -size * 0.3);
          doc.stroke();
        }
        doc.restore();
      };

      // Рисуем снежинки по краям
      drawSnowflake(80, 100, 8);
      drawSnowflake(pageWidth - 80, 120, 6);
      drawSnowflake(100, pageHeight - 150, 7);
      drawSnowflake(pageWidth - 100, pageHeight - 100, 5);
      drawSnowflake(150, 300, 6);
      drawSnowflake(pageWidth - 150, 400, 7);

      // Звезды
      const drawStar = (x: number, y: number, size: number, color: string) => {
        doc.save();
        doc.translate(x, y);
        doc.fillColor(color).strokeColor(color).lineWidth(1);
        const points = 5;
        const outerRadius = size;
        const innerRadius = size * 0.4;
        doc.path(`M 0,${-outerRadius}`);
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const px = Math.sin(angle) * radius;
          const py = -Math.cos(angle) * radius;
          doc.lineTo(px, py);
        }
        doc.closePath().fill();
        doc.restore();
      };

      // Рисуем золотые звезды
      drawStar(pageWidth / 2, 80, 12, "#FFD700");
      drawStar(120, 200, 8, "#FFD700");
      drawStar(pageWidth - 120, 250, 9, "#FFD700");

      // Новогодний заголовок с эффектом
      doc
        .fontSize(36)
        .font("Helvetica-Bold")
        .fillColor("#FFD700")
        .text("E.V.M.", margin, margin + 15, { align: "center" });

      // Подзаголовок - новогодний стиль
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#FF0000")
        .text("NEW YEAR 2025", margin, margin + 55, { align: "center" });
      
      doc
        .fontSize(14)
        .font("Helvetica")
        .fillColor("#00FF00")
        .text("PROPUSK OPERATORA", margin, margin + 75, { align: "center" });

      // Новогодние разделительные линии (красная и золотая)
      doc
        .moveTo(margin, margin + 105)
        .lineTo(pageWidth - margin, margin + 105)
        .strokeColor("#FF0000")
        .lineWidth(2)
        .stroke();
      
      doc
        .moveTo(margin, margin + 110)
        .lineTo(pageWidth - margin, margin + 110)
        .strokeColor("#FFD700")
        .lineWidth(1)
        .stroke();

      // Информация о пользователе
      let yPos = margin + 140;

      // Елочные игрушки как декоративные элементы
      const drawOrnament = (x: number, y: number, color: string) => {
        doc.circle(x, y, 5).fillColor(color).fill();
        doc.circle(x, y, 3).fillColor("#FFD700").fill();
      };

      // Информация о пользователе с новогодним стилем
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#FFD700");
      doc.text("OPERATOR:", margin, yPos);
      drawOrnament(margin + 100, yPos + 5, "#FF0000");
      doc
        .font("Helvetica-Bold")
        .fillColor("#00FF00");
      const userName = user.name ? transliterate(user.name) : "UNKNOWN";
      doc.text(userName, margin + 120, yPos);
      yPos += 35;

      doc
        .font("Helvetica")
        .fillColor("#FFD700");
      doc.text("TABELNYI NOMER:", margin, yPos);
      drawOrnament(margin + 160, yPos + 5, "#00FF00");
      doc
        .font("Helvetica-Bold")
        .fillColor("#FFD700");
      doc.text(user.tabNumber, margin + 180, yPos);
      yPos += 35;

      // Баллы (выделяем новогодним стилем)
      doc
        .font("Helvetica")
        .fillColor("#FFD700");
      doc.text("ZARABOTANO BALLOV:", margin, yPos);
      drawStar(margin + 190, yPos + 8, 6, "#FFD700");
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor("#FF0000");
      doc.text(totalPoints.toString(), margin + 200, yPos - 3);
      yPos += 50;

      // Новогодние разделительные линии
      doc
        .moveTo(margin, yPos)
        .lineTo(pageWidth - margin, yPos)
        .strokeColor("#00FF00")
        .lineWidth(2)
        .stroke();
      
      doc
        .moveTo(margin, yPos + 5)
        .lineTo(pageWidth - margin, yPos + 5)
        .strokeColor("#FFD700")
        .lineWidth(1)
        .stroke();

      yPos += 40;

      // Новогоднее поздравление
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#FFD700");
      doc.text("S NOVYM GODOM 2025!", margin, yPos, { align: "center" });
      yPos += 25;

      // QR код с новогодним оформлением
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#FFD700");
      doc.text("QR CODE:", margin, yPos);
      drawOrnament(margin + 90, yPos + 5, "#FF0000");
      doc
        .font("Helvetica-Bold")
        .fillColor("#00FF00");
      doc.text(ticket.qr, margin + 100, yPos);
      yPos += 50;

      // Дата выдачи в новогоднем стиле
      const issueDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#FFD700");
      doc.text(`Issued: ${issueDate}`, margin, yPos, { align: "center" });
      yPos += 20;

      // Новогодние украшения внизу
      drawOrnament(margin + 30, pageHeight - margin - 30, "#FF0000");
      drawOrnament(pageWidth - margin - 30, pageHeight - margin - 30, "#00FF00");
      drawStar(pageWidth / 2, pageHeight - margin - 30, 10, "#FFD700");

      // Подвал с новогодним поздравлением
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#FFD700");
      doc.text(
        "This pass grants access to the E.V.M. system.",
        margin,
        pageHeight - margin - 50,
        { align: "center" },
      );
      
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#00FF00");
      doc.text(
        "Happy New Year! May your code be bug-free!",
        margin,
        pageHeight - margin - 35,
        { align: "center" },
      );

      // Завершаем документ
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

