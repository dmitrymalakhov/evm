import { Bot, Context, Keyboard, InlineKeyboard } from "grammy";
import { registerTelegramUser, getTelegramUsers } from "./api-client.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN environment variable is required");
}

const bot = new Bot(BOT_TOKEN);

// Админский доступ
const ADMIN_TELEGRAM_ID = 92174505;
const envAdminIds = process.env.ADMIN_TELEGRAM_IDS?.split(",")
  .map((id) => {
    const numId = Number(id.trim());
    return isNaN(numId) ? null : numId;
  })
  .filter((id): id is number => id !== null) || [];

const ADMIN_TELEGRAM_IDS = [
  ADMIN_TELEGRAM_ID,
  ...envAdminIds,
];

// Логируем список админов при старте
console.log("[BOT] Admin Telegram IDs:", ADMIN_TELEGRAM_IDS);
console.log("[BOT] Environment ADMIN_TELEGRAM_IDS:", process.env.ADMIN_TELEGRAM_IDS || "not set");

// Состояние регистрации для каждого пользователя
type RegistrationState = {
  step: "waiting_for_contact" | "registering" | "completed";
  data?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    phoneNumber?: string;
  };
  registrationResult?: {
    tabNumber: string;
    otpCode: string;
    email: string;
    name: string;
  };
};

// Состояние админских операций
type AdminState = {
  step: "broadcast_waiting_message";
  data?: {
    message?: string;
    type?: "text" | "photo" | "video" | "document";
    fileId?: string;
    fileUniqueId?: string;
    fileName?: string;
  };
};

const userStates = new Map<number, RegistrationState>();
const adminStates = new Map<number, AdminState>();

/**
 * Проверка админского доступа
 */
function isAdmin(userId: number): boolean {
  const isAdminUser = ADMIN_TELEGRAM_IDS.includes(userId);
  console.log(`[BOT] Admin check for userId ${userId}:`, {
    isAdmin: isAdminUser,
    adminIds: ADMIN_TELEGRAM_IDS,
    envAdmins: process.env.ADMIN_TELEGRAM_IDS,
  });
  return isAdminUser;
}

/**
 * Логирование действий пользователя
 */
function logUserAction(userId: number, action: string, details?: unknown) {
  console.log(`[BOT] User ${userId}: ${action}`, details ? JSON.stringify(details) : "");
}

/**
 * Получить информацию о пользователе из состояния
 */
function getUserInfo(userId: number): RegistrationState["registrationResult"] | null {
  const state = userStates.get(userId);
  return state?.registrationResult || null;
}

/**
 * Создать клавиатуру для главного меню
 */
function createMainKeyboard() {
  return new InlineKeyboard()
    .text("📋 Мои данные", "my_info")
    .text("🔄 Начать заново", "restart");
}

/**
 * Обработка команды /start
 */
bot.command("start", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }

  logUserAction(userId, "start");

  // Проверяем, не зарегистрирован ли пользователь уже
  const existingInfo = getUserInfo(userId);
  if (existingInfo) {
    await ctx.reply(
      "👋 С возвращением в систему E.V.M.!\n\n" +
        "Вы уже зарегистрированы. Используйте команду /myinfo чтобы получить свои данные для входа.",
      {
        reply_markup: createMainKeyboard(),
      },
    );
    return;
  }

  // Сбрасываем состояние пользователя
  userStates.delete(userId);

  const keyboard = new Keyboard()
    .requestContact("📱 Поделиться контактом")
    .resized()
    .oneTime();

  await ctx.reply(
    "👋 Добро пожаловать в систему регистрации E.V.M.!\n\n" +
      "Для регистрации мне понадобятся ваши контактные данные из профиля Telegram.\n\n" +
      "📌 Что будет использовано:\n" +
      "• Имя и фамилия\n" +
      "• Номер телефона\n" +
      "• Username (если есть)\n\n" +
      "Нажмите кнопку ниже, чтобы поделиться своим контактом:",
    {
      reply_markup: keyboard,
    },
  );

  userStates.set(userId, { step: "waiting_for_contact" });
});

/**
 * Обработка команды /myinfo
 */
bot.command("myinfo", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }

  logUserAction(userId, "myinfo");

  const state = userStates.get(userId);
  const userInfo = state?.registrationResult;

  if (!userInfo) {
    // Пытаемся получить данные через API (если пользователь уже зарегистрирован)
    await ctx.reply(
      "⏳ Проверяю вашу регистрацию...",
    );

    try {
      // Попытка зарегистрироваться - если пользователь уже существует, API вернет его данные
      const result = await registerTelegramUser({
        telegramId: userId.toString(),
        firstName: ctx.from.first_name || "Пользователь",
        lastName: ctx.from.last_name,
        username: ctx.from.username,
      });

      // Сохраняем результат
      userStates.set(userId, {
        step: "completed",
        registrationResult: {
          tabNumber: result.tabNumber,
          otpCode: result.otpCode,
          email: result.email,
          name: result.name,
        },
      });

      await sendUserCredentials(ctx, result);
    } catch (error) {
      await ctx.reply(
        "❌ Вы еще не зарегистрированы.\n\n" +
          "Используйте команду /start для начала регистрации.",
        {
          reply_markup: createMainKeyboard(),
        },
      );
    }
    return;
  }

  await sendUserCredentials(ctx, userInfo);
});

/**
 * Отправить данные для входа пользователю
 */
async function sendUserCredentials(
  ctx: Context,
  data: {
    tabNumber: string;
    otpCode: string;
    email: string;
    name: string;
  },
) {
  await ctx.reply(
    "✅ Ваши данные для входа:\n\n" +
      `🔑 <b>Табельный номер:</b> <code>${data.tabNumber}</code>\n` +
      `🔐 <b>Пароль (OTP):</b> <code>${data.otpCode}</code>\n\n` +
      `👤 <b>Имя в системе:</b> ${data.name}\n` +
      `📧 <b>Email:</b> ${data.email}\n\n` +
      "💡 Используйте эти данные для входа в систему.\n\n" +
      "🔒 Сохраните эти данные в безопасном месте!",
    {
      parse_mode: "HTML",
      reply_markup: createMainKeyboard(),
    },
  );

  // Отправляем инструкцию отдельным сообщением
  await ctx.reply(
    "📝 <b>Инструкция по входу:</b>\n\n" +
      "1️⃣ Перейдите на страницу входа системы E.V.M.\n" +
      "2️⃣ Введите табельный номер: " +
      `<code>${data.tabNumber}</code>\n` +
      "3️⃣ Введите пароль: " +
      `<code>${data.otpCode}</code>\n\n` +
      "✨ Готово! Добро пожаловать в систему!",
    {
      parse_mode: "HTML",
    },
  );
}

/**
 * Обработка команды /cancel
 */
bot.command("cancel", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }

  logUserAction(userId, "cancel");

  const state = userStates.get(userId);
  if (state?.step === "waiting_for_contact" || state?.step === "registering") {
    userStates.delete(userId);
    await ctx.reply(
      "❌ Регистрация отменена.\n\n" +
        "Используйте /start для начала новой регистрации.",
      {
        reply_markup: {
          remove_keyboard: true,
        },
      },
    );
  } else {
    await ctx.reply("Нет активной регистрации для отмены.");
  }
});

/**
 * Обработка получения контакта
 */
bot.on("message:contact", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }

  const state = userStates.get(userId);
  if (state?.step !== "waiting_for_contact") {
    await ctx.reply(
      "⚠️ Пожалуйста, сначала отправьте команду /start для начала регистрации.",
      {
        reply_markup: createMainKeyboard(),
      },
    );
    return;
  }

  const contact = ctx.message.contact;
  if (!contact) {
    return;
  }

  // Проверяем, что контакт принадлежит отправителю
  const contactUserId = contact.user_id;
  if (contactUserId && contactUserId !== userId) {
    await ctx.reply(
      "❌ Пожалуйста, поделитесь своим собственным контактом.\n\n" +
        "Вы можете попробовать снова, используя /start",
    );
    return;
  }

  // Валидация данных
  if (!contact.phone_number || !contact.first_name) {
    await ctx.reply(
      "❌ Контакт не содержит необходимых данных (имя или номер телефона).\n\n" +
        "Пожалуйста, убедитесь, что в вашем профиле Telegram заполнены имя и номер телефона.",
    );
    return;
  }

  // Сохраняем данные из контакта
  const phoneNumber = contact.phone_number;
  const firstName = contact.first_name || ctx.from.first_name || "Пользователь";
  const lastName = contact.last_name || ctx.from.last_name;
  const username = ctx.from.username;

  logUserAction(userId, "contact_received", {
    hasPhone: !!phoneNumber,
    hasFirstName: !!firstName,
    hasLastName: !!lastName,
    hasUsername: !!username,
  });

  // Сохраняем состояние
  userStates.set(userId, {
    step: "registering",
    data: {
      firstName,
      lastName,
      username,
      phoneNumber,
    },
  });

  // Отправляем сообщение о начале регистрации
  const statusMsg = await ctx.reply(
    "✅ <b>Контакт получен!</b>\n\n" +
      `📝 <b>Имя:</b> ${firstName}\n` +
      (lastName ? `📝 <b>Фамилия:</b> ${lastName}\n` : "") +
      (username ? `👤 <b>Username:</b> @${username}\n` : "") +
      `📱 <b>Телефон:</b> ${phoneNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})/, "+$1 ($2) $3-$4-$5")}\n\n` +
      "⏳ Регистрирую вас в системе...\n\n" +
      "⏱️ Это может занять несколько секунд.",
    {
      parse_mode: "HTML",
    },
  );

  try {
    // Регистрируем пользователя через API
    const result = await registerTelegramUser({
      telegramId: userId.toString(),
      firstName,
      lastName,
      username,
      phoneNumber,
    });

    logUserAction(userId, "registration_success", {
      tabNumber: result.tabNumber,
    });

    // Сохраняем состояние как завершенное с результатами
    userStates.set(userId, {
      step: "completed",
      data: {
        firstName,
        lastName,
        username,
        phoneNumber,
      },
      registrationResult: {
        tabNumber: result.tabNumber,
        otpCode: result.otpCode,
        email: result.email,
        name: result.name,
      },
    });

    // Удаляем клавиатуру с кнопкой контакта
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      "✅ <b>Контакт получен и обработан!</b>\n\n" +
        `📝 <b>Имя:</b> ${firstName}\n` +
        (lastName ? `📝 <b>Фамилия:</b> ${lastName}\n` : "") +
        (username ? `👤 <b>Username:</b> @${username}\n` : "") +
        `📱 <b>Телефон:</b> ${phoneNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})/, "+$1 ($2) $3-$4-$5")}\n\n` +
        "✅ <b>Регистрация завершена успешно!</b>",
      {
        parse_mode: "HTML",
      },
    );

    // Отправляем данные для входа
    await sendUserCredentials(ctx, {
      tabNumber: result.tabNumber,
      otpCode: result.otpCode,
      email: result.email,
      name: result.name,
    });
  } catch (error) {
    logUserAction(userId, "registration_error", { error: String(error) });
    
    // Удаляем сообщение о статусе
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch {
      // Игнорируем ошибку удаления
    }

    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    
    await ctx.reply(
      "❌ <b>Ошибка при регистрации</b>\n\n" +
        `🔴 ${errorMessage}\n\n` +
        "💡 Попробуйте:\n" +
        "• Проверить подключение к интернету\n" +
        "• Попробовать позже\n" +
        "• Использовать команду /start для новой попытки\n\n" +
        "Если проблема повторяется, обратитесь к администратору.",
      {
        parse_mode: "HTML",
        reply_markup: createMainKeyboard(),
      },
    );
    
    // Сбрасываем состояние для повторной попытки
    userStates.delete(userId);
  }
});

/**
 * Обработка inline кнопок
 */
bot.callbackQuery("my_info", async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  
  try {
    await ctx.deleteMessage();
  } catch {
    // Игнорируем ошибку удаления
  }
  
  // Вызываем логику команды /myinfo
  const state = userStates.get(userId);
  const userInfo = state?.registrationResult;
  
  if (userInfo) {
    await sendUserCredentials(ctx, userInfo);
  } else {
    // Пытаемся получить данные через API
    try {
      const result = await registerTelegramUser({
        telegramId: userId.toString(),
        firstName: ctx.from.first_name || "Пользователь",
        lastName: ctx.from.last_name,
        username: ctx.from.username,
      });

      // Сохраняем результат
      userStates.set(userId, {
        step: "completed",
        registrationResult: {
          tabNumber: result.tabNumber,
          otpCode: result.otpCode,
          email: result.email,
          name: result.name,
        },
      });

      await sendUserCredentials(ctx, {
        tabNumber: result.tabNumber,
        otpCode: result.otpCode,
        email: result.email,
        name: result.name,
      });
    } catch {
      await ctx.reply(
        "❌ Вы еще не зарегистрированы.\n\n" +
          "Используйте команду /start для начала регистрации.",
        {
          reply_markup: createMainKeyboard(),
        },
      );
    }
  }
});

bot.callbackQuery("restart", async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  
  try {
    await ctx.deleteMessage();
  } catch {
    // Игнорируем ошибку удаления
  }
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  userStates.delete(userId);
  await ctx.reply(
    "🔄 Регистрация сброшена.\n\n" +
      "Используйте /start для начала новой регистрации.",
  );
});

/**
 * Обработка команды /help
 */
bot.command("help", async (ctx: Context) => {
  await ctx.reply(
    "📚 <b>Доступные команды:</b>\n\n" +
      "/start - Начать регистрацию\n" +
      "/myinfo - Получить свои данные для входа\n" +
      "/myid - Показать ваш Telegram ID\n" +
      "/cancel - Отменить текущую регистрацию\n" +
      "/help - Показать эту справку\n\n" +
      "📌 <b>О регистрации:</b>\n" +
      "Для регистрации вам нужно поделиться своим контактом из Telegram, " +
      "из которого будут взяты имя, фамилия и номер телефона.\n\n" +
      "💡 После регистрации вы получите табельный номер и пароль для входа в систему E.V.M.",
    {
      parse_mode: "HTML",
      reply_markup: createMainKeyboard(),
    },
  );
});

/**
 * Обработка команды /myid - показать Telegram ID пользователя
 */
bot.command("myid", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("❌ Не удалось получить ваш Telegram ID.");
    return;
  }

  const isAdminUser = isAdmin(userId);
  
  await ctx.reply(
    "🆔 <b>Ваш Telegram ID:</b>\n\n" +
      `<code>${userId}</code>\n\n` +
      `🔐 Админский доступ: ${isAdminUser ? "✅ Да" : "❌ Нет"}\n\n` +
      (isAdminUser 
        ? "💡 Вы можете использовать команду /admin для доступа к админской панели."
        : "💡 Если вы должны быть админом, убедитесь, что ваш ID добавлен в переменную окружения ADMIN_TELEGRAM_IDS."),
    {
      parse_mode: "HTML",
    },
  );
});

/**
 * Обработка неизвестных сообщений (объединенный обработчик)
 */
bot.on("message", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }

  // Проверяем, не админ ли это в режиме рассылки (обрабатываем раньше обычных сообщений)
  if (isAdmin(userId)) {
    const adminState = adminStates.get(userId);
    if (adminState?.step === "broadcast_waiting_message") {
      // Пропускаем команды (они обрабатываются отдельными обработчиками)
      if (ctx.message.text?.startsWith("/")) {
        return;
      }

      const messageText = ctx.message.text || ctx.message.caption || "";
      let mediaType: "text" | "photo" | "video" | "document" = "text";
      let fileId: string | undefined;
      let fileUniqueId: string | undefined;
      let fileName: string | undefined;

      // Проверяем тип медиа
      if (ctx.message.photo && ctx.message.photo.length > 0) {
        // Фото - берем самое большое (последнее в массиве)
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        mediaType = "photo";
        fileId = photo.file_id;
        fileUniqueId = photo.file_unique_id;
      } else if (ctx.message.video) {
        // Видео
        mediaType = "video";
        fileId = ctx.message.video.file_id;
        fileUniqueId = ctx.message.video.file_unique_id;
        fileName = ctx.message.video.file_name;
      } else if (ctx.message.document) {
        // Документ
        mediaType = "document";
        fileId = ctx.message.document.file_id;
        fileUniqueId = ctx.message.document.file_unique_id;
        fileName = ctx.message.document.file_name;
      }

      // Проверяем, что есть либо текст, либо медиа
      if (mediaType === "text" && !messageText.trim()) {
        await ctx.reply("❌ Сообщение не может быть пустым. Попробуйте еще раз или отправьте /cancel.");
        return;
      }

      if (mediaType !== "text" && !fileId) {
        await ctx.reply("❌ Не удалось получить файл. Попробуйте еще раз или отправьте /cancel.");
        return;
      }

      // Сохраняем данные для рассылки
      const broadcastData = JSON.stringify({
        type: mediaType,
        message: messageText || "",
        fileId,
        fileUniqueId,
        fileName,
      });

      // Подтверждение рассылки
      const confirmKeyboard = new InlineKeyboard()
        .text("✅ Да, разослать", `confirm_broadcast:${Buffer.from(broadcastData).toString("base64")}`)
        .row()
        .text("❌ Отмена", "cancel_broadcast");

      const typeEmoji = {
        text: "📝",
        photo: "🖼",
        video: "🎥",
        document: "📎",
      };

      const typeName = {
        text: "Текстовое сообщение",
        photo: "Фото",
        video: "Видео",
        document: "Документ",
      };

      let previewText = "";
      if (mediaType === "text") {
        previewText = messageText.substring(0, 500) + (messageText.length > 500 ? "\n\n... (обрезано)" : "");
      } else {
        previewText = `${typeEmoji[mediaType]} ${typeName[mediaType]}`;
        if (fileName) {
          previewText += `\n📄 Файл: ${fileName}`;
        }
        if (messageText) {
          previewText += `\n\n📝 Подпись:\n${messageText.substring(0, 300)}${messageText.length > 300 ? "... (обрезано)" : ""}`;
        }
      }

      await ctx.reply(
        "📢 <b>Подтверждение рассылки</b>\n\n" +
          `${typeEmoji[mediaType]} Тип: <b>${typeName[mediaType]}</b>\n\n` +
          "Содержимое для рассылки:\n\n" +
          previewText +
          "\n\n" +
          "Разослать это всем зарегистрированным пользователям?",
        {
          parse_mode: "HTML",
          reply_markup: confirmKeyboard,
        },
      );

      adminStates.set(userId, {
        step: "broadcast_waiting_message",
        data: {
          message: messageText || "",
          type: mediaType,
          fileId,
          fileUniqueId,
          fileName,
        },
      });
      return;
    }
  }

  const state = userStates.get(userId);
  
  if (state?.step === "waiting_for_contact") {
    await ctx.reply(
      "⚠️ Пожалуйста, нажмите на кнопку <b>'📱 Поделиться контактом'</b>, " +
        "чтобы продолжить регистрацию.\n\n" +
        "Или используйте команду /cancel для отмены.",
      {
        parse_mode: "HTML",
      },
    );
  } else if (state?.step === "registering") {
    await ctx.reply(
      "⏳ Регистрация в процессе. Пожалуйста, подождите...",
    );
  } else {
    await ctx.reply(
      "❓ Я не понимаю эту команду.\n\n" +
        "Используйте:\n" +
        "• /start - для регистрации\n" +
        "• /myinfo - чтобы получить свои данные\n" +
        "• /help - для справки" +
        (isAdmin(userId) ? "\n• /admin - админская панель" : ""),
      {
        reply_markup: createMainKeyboard(),
      },
    );
  }
});

/**
 * Проверка админского доступа для команд
 */
function requireAdmin(ctx: Context): boolean {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) {
    return false;
  }
  return true;
}

/**
 * Команда /admin - админская панель
 */
bot.command("admin", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }

  if (!requireAdmin(ctx)) {
    await ctx.reply(
      "❌ У вас нет доступа к этой команде.\n\n" +
        `🆔 Ваш Telegram ID: <code>${userId}</code>\n\n` +
        "💡 Если вы должны быть админом, убедитесь, что:\n" +
        "1. Ваш ID добавлен в переменную окружения ADMIN_TELEGRAM_IDS\n" +
        "2. Бот был перезапущен после изменения переменной окружения\n\n" +
        "Используйте /myid для проверки вашего ID и статуса админа.",
      {
        parse_mode: "HTML",
      },
    );
    return;
  }

  logUserAction(userId, "admin_panel");

  const keyboard = new InlineKeyboard()
    .text("📢 Рассылка", "admin_broadcast")
    .row()
    .text("📊 Статистика", "admin_stats")
    .text("🔄 Обновить список", "admin_refresh");

  await ctx.reply(
    "🔐 <b>Админская панель</b>\n\n" +
      "Выберите действие:",
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    },
  );
});

/**
 * Обработка inline кнопок админки
 */
bot.callbackQuery("admin_broadcast", async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  
  if (!requireAdmin(ctx)) {
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.deleteMessage();
  } catch {
    // Игнорируем ошибку удаления
  }

  adminStates.set(userId, { step: "broadcast_waiting_message" });

  await ctx.reply(
    "📢 <b>Рассылка сообщений</b>\n\n" +
      "Отправьте сообщение, фото или видео, которое нужно разослать всем зарегистрированным пользователям.\n\n" +
      "Поддерживаются:\n" +
      "📝 Текстовые сообщения\n" +
      "🖼 Фото (с подписью)\n" +
      "🎥 Видео (с подписью)\n" +
      "📎 Документы (с подписью)\n\n" +
      "Вы можете использовать HTML разметку для подписей:\n" +
      "• <b>жирный</b> - &lt;b&gt;текст&lt;/b&gt;\n" +
      "• <i>курсив</i> - &lt;i&gt;текст&lt;/i&gt;\n" +
      "• <code>код</code> - &lt;code&gt;текст&lt;/code&gt;\n\n" +
      "Или отправьте /cancel для отмены.",
    {
      parse_mode: "HTML",
    },
  );
});

bot.callbackQuery("admin_stats", async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  
  if (!requireAdmin(ctx)) {
    return;
  }

  try {
    await ctx.deleteMessage();
  } catch {
    // Игнорируем ошибку удаления
  }

  try {
    const usersData = await getTelegramUsers();
    // Фильтруем только пользователей с валидным telegramId
    const usersWithTelegramId = usersData.users.filter(
      (u) => u.telegramId && u.telegramId.trim() !== "",
    );
    const activeUsers = usersWithTelegramId.filter((u) => u.status === "active");

    await ctx.reply(
      "📊 <b>Статистика пользователей</b>\n\n" +
        `👥 Всего с Telegram ID: <b>${usersData.total}</b>\n` +
        `✅ Активных для рассылки: <b>${activeUsers.length}</b>\n` +
        `⏸ Неактивных: <b>${usersData.total - activeUsers.length}</b>\n\n` +
        "💡 Рассылки отправляются только пользователям с telegramId в базе данных.",
      {
        parse_mode: "HTML",
        reply_markup: createMainKeyboard(),
      },
    );
  } catch (error) {
    await ctx.reply(
      "❌ Ошибка при получении статистики: " +
        (error instanceof Error ? error.message : "Неизвестная ошибка"),
    );
  }
});

bot.callbackQuery("admin_refresh", async (ctx: Context) => {
  await ctx.answerCallbackQuery("🔄 Обновление...");
  
  if (!requireAdmin(ctx)) {
    return;
  }

  await ctx.editMessageText(
    "🔄 Список обновлен!\n\nИспользуйте /admin для возврата в панель.",
  );
});

/**
 * Подтверждение рассылки
 */
bot.callbackQuery(/^confirm_broadcast:(.+)$/, async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  
  if (!requireAdmin(ctx)) {
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const match = ctx.callbackQuery.data?.match(/^confirm_broadcast:(.+)$/);
    if (!match) {
      await ctx.reply("❌ Ошибка: не удалось расшифровать сообщение.");
      return;
    }

    // Расшифровываем данные рассылки (поддержка текста, фото, видео, документов)
    const broadcastDataStr = Buffer.from(match[1], "base64").toString("utf-8");
    let broadcastData: {
      type: "text" | "photo" | "video" | "document";
      message: string;
      fileId?: string;
      fileUniqueId?: string;
      fileName?: string;
    };

    try {
      broadcastData = JSON.parse(broadcastDataStr);
    } catch {
      // Для обратной совместимости: если это старый формат (только текст)
      broadcastData = {
        type: "text",
        message: broadcastDataStr,
      };
    }

    await ctx.deleteMessage();
    const statusMsg = await ctx.reply("⏳ Начинаю рассылку...");

    // Получаем список пользователей из базы данных через API
    // API возвращает только пользователей, у которых есть telegramId в базе данных (поле telegram_id)
    // Это поле сохраняется при регистрации пользователя через Telegram бота
    const usersData = await getTelegramUsers();
    
    // Фильтруем только активных пользователей с валидным telegramId
    // Рассылка идет только по пользователям с telegramId из базы данных
    const activeUsers = usersData.users.filter(
      (u) => u.status === "active" && u.telegramId && u.telegramId.trim() !== "",
    );

    if (activeUsers.length === 0) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "⚠️ <b>Нет активных пользователей для рассылки</b>\n\n" +
          "В базе данных нет пользователей с telegramId, которые можно использовать для рассылки.",
        {
          parse_mode: "HTML",
        },
      );
      adminStates.delete(userId);
      return;
    }

    logUserAction(userId, "broadcast_start", { 
      usersCount: activeUsers.length,
      totalUsers: usersData.total,
      type: broadcastData.type,
    });

    let successCount = 0;
    let failCount = 0;

    // Рассылаем сообщение с задержкой между сообщениями (чтобы не попасть в лимиты Telegram)
    // Используем telegramId из базы данных для отправки сообщений
    for (const user of activeUsers) {
      try {
        // Валидация telegramId перед отправкой
        if (!user.telegramId || user.telegramId.trim() === "") {
          console.warn(`[BOT] Skipping user ${user.id} - no telegramId`);
          failCount++;
          continue;
        }

        const telegramUserId = Number(user.telegramId);
        if (isNaN(telegramUserId) || telegramUserId <= 0) {
          console.warn(`[BOT] Invalid telegramId for user ${user.id}: ${user.telegramId}`);
          failCount++;
          continue;
        }

        // Отправляем сообщение в зависимости от типа
        if (broadcastData.type === "photo" && broadcastData.fileId) {
          // Отправляем фото с подписью
          await bot.api.sendPhoto(
            telegramUserId,
            broadcastData.fileId,
            {
              caption: broadcastData.message || undefined,
              parse_mode: broadcastData.message ? "HTML" : undefined,
            },
          );
        } else if (broadcastData.type === "video" && broadcastData.fileId) {
          // Отправляем видео с подписью
          await bot.api.sendVideo(
            telegramUserId,
            broadcastData.fileId,
            {
              caption: broadcastData.message || undefined,
              parse_mode: broadcastData.message ? "HTML" : undefined,
            },
          );
        } else if (broadcastData.type === "document" && broadcastData.fileId) {
          // Отправляем документ с подписью
          await bot.api.sendDocument(
            telegramUserId,
            broadcastData.fileId,
            {
              caption: broadcastData.message || undefined,
              parse_mode: broadcastData.message ? "HTML" : undefined,
            },
          );
        } else {
          // Отправляем текстовое сообщение
          await bot.api.sendMessage(
            telegramUserId,
            broadcastData.message,
            {
              parse_mode: "HTML",
            },
          );
        }

        successCount++;
        
        // Задержка 50ms между сообщениями (чтобы соблюсти лимиты Telegram API)
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        failCount++;
        console.error(
          `[BOT] Failed to send to user ${user.name} (telegramId: ${user.telegramId}):`,
          error,
        );
        
        // Если ошибка блокировки, ждем дольше
        if (error instanceof Error && error.message.includes("blocked")) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `✅ <b>Рассылка завершена!</b>\n\n` +
        `📊 Статистика:\n` +
        `✅ Успешно: <b>${successCount}</b>\n` +
        `❌ Ошибок: <b>${failCount}</b>\n` +
        `📨 Всего отправлено: <b>${successCount + failCount}</b> из <b>${activeUsers.length}</b>`,
      {
        parse_mode: "HTML",
      },
    );

    adminStates.delete(userId);
    logUserAction(userId, "broadcast_complete", {
      success: successCount,
      failed: failCount,
    });
  } catch (error) {
    await ctx.reply(
      "❌ Ошибка при рассылке: " +
        (error instanceof Error ? error.message : "Неизвестная ошибка"),
    );
    adminStates.delete(userId);
  }
});

bot.callbackQuery("cancel_broadcast", async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  
  if (!requireAdmin(ctx)) {
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.deleteMessage();
  } catch {
    // Игнорируем ошибку удаления
  }

  adminStates.delete(userId);
  await ctx.reply(
    "❌ Рассылка отменена.\n\nИспользуйте /admin для возврата в панель.",
  );
});

/**
 * Обработка ошибок
 */
bot.catch((err) => {
  console.error("[BOT] Unhandled error:", err);
});

export { bot };
