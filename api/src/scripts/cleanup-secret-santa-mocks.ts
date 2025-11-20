// Скрипт для удаления тестовых данных тайного санты из базы данных
import "../db/client.js";
import { db } from "../db/client.js";
import { secretSantaParticipants } from "../db/schema.js";
import { inArray } from "drizzle-orm";

const mockIds = ["ss-u1", "ss-u2", "ss-u3"];

console.log("Удаление тестовых данных тайного санты из базы данных...");

try {
  const result = db
    .delete(secretSantaParticipants)
    .where(inArray(secretSantaParticipants.id, mockIds))
    .run();

  console.log(`Удалено записей: ${result.changes}`);
  
  if (result.changes > 0) {
    console.log(`Успешно удалены тестовые данные с ID: ${mockIds.join(", ")}`);
  } else {
    console.log("Тестовые данные не найдены в базе данных.");
  }
  
  process.exit(0);
} catch (error) {
  console.error("Ошибка при удалении тестовых данных:", error);
  process.exit(1);
}

