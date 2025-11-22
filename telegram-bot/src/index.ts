import { bot } from "./bot.js";

// Проверяем, что токен установлен
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN environment variable is required");
  console.error("   Please set BOT_TOKEN in your .env file or environment variables");
  process.exit(1);
}

// Проверяем формат токена (должен быть вида "123456:ABC-DEF...")
if (!BOT_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
  console.error("❌ BOT_TOKEN has invalid format. Expected format: '123456:ABC-DEF...'");
  console.error(`   Current token length: ${BOT_TOKEN.length} characters`);
  console.error(`   Token preview: ${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 5)}`);
  console.error("   Please check your BOT_TOKEN in docker-compose.yml or .env file");
  process.exit(1);
}

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
console.log(`🔗 API Base URL: ${API_BASE_URL}`);

// Функция для запуска бота с обработкой ошибок
async function startBot() {
  try {
    // Проверяем подключение к Telegram API перед запуском
    console.log("🔄 Checking Telegram API connection...");
    
    // Пытаемся получить информацию о боте для проверки токена
    try {
      const botInfo = await bot.api.getMe();
      console.log(`✅ Bot token is valid!`);
      console.log(`   📱 Username: @${botInfo.username}`);
      console.log(`   🆔 Bot ID: ${botInfo.id}`);
      console.log(`   👤 Name: ${botInfo.first_name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to verify bot token:", errorMessage);
      
      if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
        console.error("\n❌ Telegram API returned 404. This usually means:");
        console.error("   1. BOT_TOKEN is invalid or incorrect");
        console.error("   2. The bot token doesn't exist or was revoked");
        console.error("   3. Check your .env file or environment variables");
        console.error(`   4. Current token format: ${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 5)}\n`);
        console.error("⚠️  Bot will continue to run, but may not function correctly.\n");
        // Не завершаем процесс, продолжаем работу
      } else {
        throw error;
      }
    }
    
    await bot.start({
      onStart: (botInfo) => {
        console.log(`\n✅ Telegram bot started successfully!`);
        console.log(`   📱 Username: @${botInfo.username}`);
        console.log(`   🆔 Bot ID: ${botInfo.id}`);
        console.log(`   👤 Name: ${botInfo.first_name}`);
        console.log(`   🔗 API: ${API_BASE_URL}\n`);
      },
    });

    console.log(`🚀 Telegram bot server is running...`);
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    
    // Если это ошибка 404, это обычно означает неверный токен
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
      console.error("\n❌ Telegram API returned 404. This usually means:");
      console.error("   1. BOT_TOKEN is invalid or incorrect");
      console.error("   2. The bot token doesn't exist or was revoked");
      console.error("   3. Check your .env file or environment variables\n");
    }
    
    // Не завершаем процесс, чтобы контейнер не перезапускался постоянно
    // Вместо этого ждем и пытаемся переподключиться
    console.log("⏳ Will retry in 30 seconds...");
    setTimeout(() => {
      startBot().catch((err) => {
        console.error("❌ Retry failed:", err);
      });
    }, 30000);
  }
}

// Запускаем бота
startBot();

// Обработка graceful shutdown
process.once("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  try {
    await bot.stop();
    console.log("✅ Bot stopped");
  } catch (error) {
    console.error("❌ Error stopping bot:", error);
  }
  process.exit(0);
});

process.once("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  try {
    await bot.stop();
    console.log("✅ Bot stopped");
  } catch (error) {
    console.error("❌ Error stopping bot:", error);
  }
  process.exit(0);
});

// Обработка необработанных ошибок
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
  // Не завершаем процесс для ошибок Grammy, чтобы контейнер не перезапускался
  if (error instanceof Error && error.message.includes("GrammyError")) {
    console.error("⚠️  Grammy error detected, but continuing...");
  }
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  // Для критических ошибок все равно завершаем процесс
  process.exit(1);
});

