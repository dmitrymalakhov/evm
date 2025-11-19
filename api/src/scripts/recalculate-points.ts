// Инициализируем базу данных перед использованием
import "../db/client.js";
import { recalculateAllUsersPoints } from "../services/admin.js";

console.log("Starting recalculation of all user points...");
try {
  const usersCount = recalculateAllUsersPoints();
  console.log(`Recalculation completed for ${usersCount} users.`);
  process.exit(0);
} catch (error) {
  console.error("Error during recalculation:", error);
  process.exit(1);
}

