import { bot } from "./bot.js";

// Проверяем, что токен установлен
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN environment variable is required");
  process.exit(1);
}

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
console.log(`🔗 API Base URL: ${API_BASE_URL}`);

// Запускаем бота
bot.start({
  onStart: (botInfo) => {
    console.log(`\n✅ Telegram bot started successfully!`);
    console.log(`   📱 Username: @${botInfo.username}`);
    console.log(`   🆔 Bot ID: ${botInfo.id}`);
    console.log(`   👤 Name: ${botInfo.first_name}`);
    console.log(`   🔗 API: ${API_BASE_URL}\n`);
  },
});

console.log(`🚀 Telegram bot server is running...`);

// Обработка graceful shutdown
process.once("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await bot.stop();
  console.log("✅ Bot stopped");
  process.exit(0);
});

process.once("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await bot.stop();
  console.log("✅ Bot stopped");
  process.exit(0);
});

// Обработка необработанных ошибок
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

