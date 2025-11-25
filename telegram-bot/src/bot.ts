import { Bot, Context, Keyboard, InlineKeyboard } from "grammy";
import { registerTelegramUser, getTelegramUsers, updateUserGrade } from "./api-client.js";

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

// Матрица оплаты по грейдам
const PAYMENT_MATRIX: Record<number, number> = {
  8: 7000,
  9: 7000,
  10: 10000,
  11: 10000,
  12: 15000,
  13: 20000,
};

// Состояние регистрации для каждого пользователя
type RegistrationState = {
  step: "waiting_for_contact" | "waiting_for_alcohol" | "waiting_for_alcohol_preference" | "registering" | "completed";
  data?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    phoneNumber?: string;
    willDrinkAlcohol?: boolean;
    alcoholPreference?: string;
  };
  registrationResult?: {
    tabNumber: string;
    otpCode: string;
    email: string;
    name: string;
  };
};

// Состояние для выбора грейда при оплате
type PaymentState = {
  step: "waiting_for_grade";
};

// Состояние админских операций
type AdminState = {
  step: "broadcast_waiting_message" | "broadcast_waiting_payment_filter";
  data?: {
    message?: string;
    type?: "text" | "photo" | "video" | "document";
    fileId?: string;
    fileUniqueId?: string;
    fileName?: string;
    hasPaidFilter?: boolean; // true - только оплатившие, false - только не оплатившие, undefined - все
  };
};

const userStates = new Map<number, RegistrationState>();
const adminStates = new Map<number, AdminState>();
const paymentStates = new Map<number, PaymentState>();

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

  // Сначала проверяем локальное состояние
  const existingInfo = getUserInfo(userId);
  if (existingInfo) {
    await sendRegisteredUserInstructions(ctx, existingInfo);
    return;
  }

  // Проверяем через API, зарегистрирован ли пользователь
  await ctx.reply("⏳ <i>Проверяю синхронизацию с матрицей E.V.M...</i>", { parse_mode: "HTML" });

  try {
    // Пытаемся получить данные через API - если пользователь уже существует, API вернет его данные
    const result = await registerTelegramUser({
      telegramId: userId.toString(),
      firstName: ctx.from.first_name || "Пользователь",
      lastName: ctx.from.last_name,
      username: ctx.from.username,
    });

    // Сохраняем результат в локальное состояние
    userStates.set(userId, {
      step: "completed",
      registrationResult: {
        tabNumber: result.tabNumber,
        otpCode: result.otpCode,
        email: result.email,
        name: result.name,
      },
    });

    // Пользователь уже зарегистрирован - выдаем инструкции
    await sendRegisteredUserInstructions(ctx, {
      tabNumber: result.tabNumber,
      otpCode: result.otpCode,
      email: result.email,
      name: result.name,
    });
    return;
  } catch (error) {
    // Если ошибка, возможно пользователь не зарегистрирован, продолжаем регистрацию
    console.log(`[BOT] User ${userId} not found or error:`, error);
  }

  // Сбрасываем состояние пользователя для новой регистрации
  userStates.delete(userId);

  const keyboard = new Keyboard()
    .requestContact("📱 Поделиться контактом")
    .resized()
    .oneTime();

  await ctx.reply(
    "📡 <b>Добро пожаловать в систему E.V.M.</b>\n\n" +
    "<i>Электронно-Вычислительная Матрица пробуждается...</i>\n\n" +
    "Для синхронизации вашего профиля необходимы данные из вашего Telegram.\n\n" +
    "📌 <b>Что будет использовано:</b>\n" +
    "• Имя и фамилия\n" +
    "• Номер телефона\n" +
    "• Username (если есть)\n\n" +
    "Нажмите кнопку ниже, чтобы поделиться своим контактом для идентификации в матрице:",
    {
      parse_mode: "HTML",
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
      "⏳ <i>Проверяю синхронизацию с матрицей E.V.M...</i>",
      {
        parse_mode: "HTML",
      },
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
        "❌ <b>Профиль не найден в матрице</b>\n\n" +
        "Используйте команду /start для начала синхронизации с системой E.V.M.",
        {
          parse_mode: "HTML",
          reply_markup: createMainKeyboard(),
        },
      );
    }
    return;
  }

  await sendUserCredentials(ctx, userInfo);
});

/**
 * Отправить инструкции для уже зарегистрированного пользователя
 */
async function sendRegisteredUserInstructions(
  ctx: Context,
  data: {
    tabNumber: string;
    otpCode: string;
    email: string;
    name: string;
  },
) {
  await ctx.reply(
    "📡 <b>С возвращением в матрицу E.V.M.!</b>\n\n" +
    "<i>Ваш профиль уже синхронизирован с системой.</i>\n\n" +
    "Электронно-Вычислительная Матрица сохранила ваши данные.",
    {
      parse_mode: "HTML",
      reply_markup: createMainKeyboard(),
    },
  );

  // Отправляем данные для входа
  await sendUserCredentials(ctx, data);
}

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
    "✅ <b>Ваши идентификаторы доступа к матрице E.V.M.:</b>\n\n" +
    `🔑 <b>Идентификатор синхронизации:</b> <code>${data.tabNumber}</code>\n` +
    `🔐 <b>Ключ доступа:</b> <code>${data.otpCode}</code>\n\n` +
    `👤 <b>Имя в системе:</b> ${data.name}\n` +
    `📧 <b>Email:</b> ${data.email}\n\n` +
    "💡 Используйте эти данные для доступа к системе синхронизации.\n\n" +
    "🔒 <b>ВАЖНО:</b> Сохраните эти данные! Они необходимы для прохождения уровней синхронизации.",
    {
      parse_mode: "HTML",
      reply_markup: createMainKeyboard(),
    },
  );

  // Отправляем инструкцию отдельным сообщением
  await ctx.reply(
    "📝 <b>Протокол синхронизации:</b>\n\n" +
    "1️⃣ Перейдите на портал матрицы E.V.M.\n" +
    "2️⃣ Введите идентификатор синхронизации: " +
    `<code>${data.tabNumber}</code>\n` +
    "3️⃣ Введите ключ доступа: " +
    `<code>${data.otpCode}</code>\n\n` +
    "✨ <i>Инициализация завершена. Добро пожаловать в матрицу!</i>",
    {
      parse_mode: "HTML",
    },
  );

  // Отправляем сообщение о необходимости зайти на сайт с подробными инструкциями
  await ctx.reply(
    "🌐 <b>Следующий этап синхронизации:</b>\n\n" +
    "Для продолжения работы с матрицей и получения координат <b>КиберЁлки 2077</b> необходимо подключиться к основному порталу:\n\n" +
    "🔗 <b>http://207.154.207.198/</b>\n\n" +
    "⚡ <i>Система E.V.M. автоматически сгенерировала координаты узла матрицы.</i>\n" +
    "🌐 <i>Прямой доступ к ядру системы без DNS-маскировки для максимальной скорости синхронизации.</i>\n\n" +
    "📋 <b>Протокол подключения:</b>\n\n" +
    "1️⃣ Войдите на портал, используя ваши идентификаторы доступа\n" +
    "2️⃣ Изучите структуру матрицы и доступные уровни синхронизации\n" +
    "3️⃣ Пройдите через 6 уровней синхронизации сознания вместе с командой\n" +
    "4️⃣ Следите за уведомлениями в этом канале - здесь будут важные указания от системы\n\n" +
    "💬 <b>Через этот канал вы будете получать:</b>\n" +
    "• Критические уведомления матрицы\n" +
    "• Инструкции по прохождению уровней\n" +
    "• Координаты финальной точки эксперимента\n\n" +
    "📌 <b>ВАЖНО:</b> Не отключайте этот канал связи! Он необходим для получения ключа доступа к КиберЁлке 2077.",
    {
      parse_mode: "HTML",
    },
  );

  // Отправляем сообщение об оплате
  await ctx.reply(
    "💳 <b>Оплата участия в проекте</b>\n\n" +
    "Для полного доступа к проекту КиберЁлка 2077 необходимо произвести оплату участия.\n\n" +
    "💡 Используйте команду /pay для расчета суммы оплаты на основе вашего грейда.",
    {
      parse_mode: "HTML",
      reply_markup: createMainKeyboard(),
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
  if (state?.step === "waiting_for_contact" || state?.step === "waiting_for_alcohol" || state?.step === "waiting_for_alcohol_preference" || state?.step === "registering") {
    userStates.delete(userId);
    await ctx.reply(
      "❌ <b>Синхронизация прервана</b>\n\n" +
      "Используйте /start для новой попытки подключения к матрице E.V.M.",
      {
        parse_mode: "HTML",
        reply_markup: {
          remove_keyboard: true,
        },
      },
    );
  } else {
    await ctx.reply("Нет активной синхронизации для прерывания.", { parse_mode: "HTML" });
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
      "⚠️ <b>Ошибка синхронизации</b>\n\n" +
      "Пожалуйста, сначала отправьте команду /start для начала подключения к матрице E.V.M.",
      {
        parse_mode: "HTML",
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
      "❌ <b>Ошибка идентификации:</b> Пожалуйста, поделитесь своим собственным контактом.\n\n" +
      "Вы можете попробовать снова, используя /start",
      {
        parse_mode: "HTML",
      },
    );
    return;
  }

  // Валидация данных
  if (!contact.phone_number || !contact.first_name) {
    await ctx.reply(
      "❌ <b>Ошибка идентификации:</b> Контакт не содержит необходимых данных (имя или номер телефона).\n\n" +
      "Пожалуйста, убедитесь, что в вашем профиле Telegram заполнены имя и номер телефона.",
      {
        parse_mode: "HTML",
      },
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

  // Сохраняем состояние и переходим к вопросу об алкоголе
  userStates.set(userId, {
    step: "waiting_for_alcohol",
    data: {
      firstName,
      lastName,
      username,
      phoneNumber,
    },
  });

  // Отправляем сообщение о получении контакта и задаем вопрос об алкоголе
  await ctx.reply(
    "✅ <b>Профиль получен матрицей E.V.M.</b>\n\n" +
    `<i>Идентификация пользователя...</i>\n\n` +
    `📝 <b>Имя:</b> ${firstName}\n` +
    (lastName ? `📝 <b>Фамилия:</b> ${lastName}\n` : "") +
    (username ? `👤 <b>Username:</b> @${username}\n` : "") +
    `📱 <b>Канал связи:</b> ${phoneNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})/, "+$1 ($2) $3-$4-$5")}\n\n` +
    "🍷 <b>Системный запрос:</b>\n\n" +
    "Будете ли вы употреблять алкогольные напитки на мероприятии КиберЁлка 2077?",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("✅ Да", "alcohol_yes")
        .text("❌ Нет", "alcohol_no"),
    },
  );
});

/**
 * Функция для завершения регистрации пользователя с данными об алкоголе
 */
async function completeRegistration(
  ctx: Context,
  userId: number,
  state: RegistrationState,
) {
  if (!state.data) {
    await ctx.reply("❌ <b>Ошибка синхронизации:</b> Данные профиля не найдены. Используйте /start для новой попытки подключения к матрице.", { parse_mode: "HTML" });
    userStates.delete(userId);
    return;
  }

  const { firstName, lastName, username, phoneNumber, willDrinkAlcohol, alcoholPreference } = state.data;

  if (!firstName || !phoneNumber) {
    await ctx.reply("❌ <b>Ошибка синхронизации:</b> Отсутствуют необходимые данные. Используйте /start для новой попытки подключения к матрице.", { parse_mode: "HTML" });
    userStates.delete(userId);
    return;
  }

  // Обновляем состояние на "registering"
  userStates.set(userId, {
    ...state,
    step: "registering",
  });

  const statusMsg = await ctx.reply(
    "⏳ <i>Синхронизация с матрицей E.V.M...</i>\n\n" +
    "⏱️ Инициализация может занять несколько секунд.\n\n" +
    "<code>[SYSTEM] Подключение к серверу...</code>",
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
      willDrinkAlcohol,
      alcoholPreference,
    });

    logUserAction(userId, "registration_success", {
      tabNumber: result.tabNumber,
      willDrinkAlcohol,
      alcoholPreference,
    });

    // Сохраняем состояние как завершенное с результатами
    userStates.set(userId, {
      step: "completed",
      data: {
        firstName,
        lastName,
        username,
        phoneNumber,
        willDrinkAlcohol,
        alcoholPreference,
      },
      registrationResult: {
        tabNumber: result.tabNumber,
        otpCode: result.otpCode,
        email: result.email,
        name: result.name,
      },
    });

    // Удаляем сообщение о статусе
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch {
      // Игнорируем ошибку удаления
    }

    // Отправляем сообщение об успешной регистрации
    let registrationSummary = "✅ <b>Синхронизация завершена успешно!</b>\n\n" +
      `<i>Профиль активирован в матрице E.V.M.</i>\n\n` +
      `📝 <b>Имя:</b> ${firstName}\n` +
      (lastName ? `📝 <b>Фамилия:</b> ${lastName}\n` : "") +
      (username ? `👤 <b>Username:</b> @${username}\n` : "") +
      `📱 <b>Канал связи:</b> ${phoneNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})/, "+$1 ($2) $3-$4-$5")}\n`;

    if (willDrinkAlcohol !== undefined) {
      registrationSummary += `\n🍷 <b>Алкогольные напитки:</b> ${willDrinkAlcohol ? "✅ Да" : "❌ Нет"}\n`;
      if (willDrinkAlcohol && alcoholPreference) {
        registrationSummary += `🍹 <b>Предпочтение:</b> ${alcoholPreference}\n`;
      }
    }

    await ctx.reply(registrationSummary, {
      parse_mode: "HTML",
    });

    // Отправляем данные для входа
    await sendUserCredentials(ctx, {
      tabNumber: result.tabNumber,
      otpCode: result.otpCode,
      email: result.email,
      name: result.name,
    });

    // Отправляем сообщение об оплате
    await ctx.reply(
      "💳 <b>Оплата участия в проекте</b>\n\n" +
      "Для полного доступа к проекту КиберЁлка 2077 необходимо произвести оплату участия.\n\n" +
      "💡 Используйте команду /pay для расчета суммы оплаты на основе вашего грейда.",
      {
        parse_mode: "HTML",
        reply_markup: createMainKeyboard(),
      },
    );
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
      "❌ <b>Ошибка синхронизации с матрицей</b>\n\n" +
      `🔴 <code>[ERROR] ${errorMessage}</code>\n\n` +
      "💡 <b>Попробуйте:</b>\n" +
      "• Проверить подключение к сети\n" +
      "• Повторить попытку позже\n" +
      "• Использовать команду /start для новой попытки синхронизации\n\n" +
      "Если проблема повторяется, обратитесь к оператору системы.",
      {
        parse_mode: "HTML",
        reply_markup: createMainKeyboard(),
      },
    );

    // Сбрасываем состояние для повторной попытки
    userStates.delete(userId);
  }
}

/**
 * Обработка inline кнопок для вопроса об алкоголе
 */
bot.callbackQuery("alcohol_yes", async (ctx: Context) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.deleteMessage();
  } catch {
    // Игнорируем ошибку удаления
  }

  const state = userStates.get(userId);
  if (!state || state.step !== "waiting_for_alcohol") {
    await ctx.reply("❌ <b>Ошибка синхронизации:</b> Неверное состояние подключения. Используйте /start для новой попытки.", { parse_mode: "HTML" });
    return;
  }

  // Обновляем состояние: пользователь будет пить алкоголь
  userStates.set(userId, {
    ...state,
    step: "waiting_for_alcohol_preference",
    data: {
      ...state.data,
      willDrinkAlcohol: true,
    },
  });

  // Показываем варианты алкоголя
  const alcoholKeyboard = new InlineKeyboard()
    .text("🍺 Пиво", "alcohol_beer")
    .text("🍷 Вино", "alcohol_wine")
    .row()
    .text("🥃 Водка", "alcohol_vodka")
    .text("🥂 Шампанское", "alcohol_champagne")
    .row()
    .text("🥃 Виски", "alcohol_whiskey")
    .text("🥃 Коньяк", "alcohol_cognac")
    .row()
    .text("✏️ Свой вариант", "alcohol_custom");

  await ctx.reply(
    "🍷 <b>Запрос принят матрицей</b>\n\n" +
    "Что вы предпочитаете для мероприятия КиберЁлка 2077?\n\n" +
    "Выберите один из вариантов или введите свой:",
    {
      parse_mode: "HTML",
      reply_markup: alcoholKeyboard,
    },
  );
});

bot.callbackQuery("alcohol_no", async (ctx: Context) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.deleteMessage();
  } catch {
    // Игнорируем ошибку удаления
  }

  const state = userStates.get(userId);
  if (!state || state.step !== "waiting_for_alcohol") {
    await ctx.reply("❌ <b>Ошибка синхронизации:</b> Неверное состояние подключения. Используйте /start для новой попытки.", { parse_mode: "HTML" });
    return;
  }

  // Обновляем состояние: пользователь не будет пить алкоголь
  userStates.set(userId, {
    ...state,
    step: "registering",
    data: {
      ...state.data,
      willDrinkAlcohol: false,
    },
  });

  // Сразу регистрируем пользователя
  await completeRegistration(ctx, userId, userStates.get(userId)!);
});

// Обработчики выбора варианта алкоголя
const alcoholOptions: Record<string, string> = {
  alcohol_beer: "Пиво",
  alcohol_wine: "Вино",
  alcohol_vodka: "Водка",
  alcohol_champagne: "Шампанское",
  alcohol_whiskey: "Виски",
  alcohol_cognac: "Коньяк",
};

for (const [callback, label] of Object.entries(alcoholOptions)) {
  bot.callbackQuery(callback, async (ctx: Context) => {
    await ctx.answerCallbackQuery();

    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      await ctx.deleteMessage();
    } catch {
      // Игнорируем ошибку удаления
    }

    const state = userStates.get(userId);
    if (!state || state.step !== "waiting_for_alcohol_preference") {
      await ctx.reply("❌ <b>Ошибка синхронизации:</b> Неверное состояние подключения. Используйте /start для новой попытки.", { parse_mode: "HTML" });
      return;
    }

    // Обновляем состояние с выбранным вариантом
    userStates.set(userId, {
      ...state,
      step: "registering",
      data: {
        ...state.data,
        alcoholPreference: label,
      },
    });

    // Регистрируем пользователя
    await completeRegistration(ctx, userId, userStates.get(userId)!);
  });
}

// Обработчик для "свой вариант"
bot.callbackQuery("alcohol_custom", async (ctx: Context) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await ctx.deleteMessage();
  } catch {
    // Игнорируем ошибку удаления
  }

  const state = userStates.get(userId);
  if (!state || state.step !== "waiting_for_alcohol_preference") {
    await ctx.reply("❌ <b>Ошибка синхронизации:</b> Неверное состояние подключения. Используйте /start для новой попытки.", { parse_mode: "HTML" });
    return;
  }

  // Обновляем состояние: ожидаем текстовый ввод
  userStates.set(userId, {
    ...state,
    step: "waiting_for_alcohol_preference",
    data: {
      ...state.data,
    },
  });

  await ctx.reply(
    "✏️ <b>Кастомный запрос</b>\n\n" +
    "Введите свой вариант алкогольного напитка для мероприятия КиберЁлка 2077:",
    {
      parse_mode: "HTML",
    },
  );
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
        "❌ <b>Профиль не найден в матрице</b>\n\n" +
        "Используйте команду /start для начала синхронизации с системой E.V.M.",
        {
          parse_mode: "HTML",
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
    "🔄 <b>Синхронизация сброшена</b>\n\n" +
    "Используйте /start для новой попытки подключения к матрице E.V.M.",
    {
      parse_mode: "HTML",
    },
  );
});

/**
 * Обработка команды /help
 */
bot.command("help", async (ctx: Context) => {
  await ctx.reply(
    "📚 <b>Доступные команды матрицы E.V.M.:</b>\n\n" +
    "/start - Инициализация подключения к матрице\n" +
    "/myinfo - Получить идентификаторы доступа\n" +
    "/myid - Показать ваш Telegram ID\n" +
    "/pay - Оплата участия в проекте\n" +
    "/cancel - Прервать текущую синхронизацию\n" +
    "/help - Показать эту справку\n\n" +
    "📌 <b>О синхронизации:</b>\n" +
    "Для подключения к матрице поделитесь своим контактом из Telegram. " +
    "Система использует имя, фамилию и номер телефона для идентификации.\n\n" +
    "💡 После синхронизации вы получите идентификатор доступа и ключ для входа в матрицу E.V.M.\n\n" +
    "🌐 <b>Важно:</b>\n" +
    "Для прохождения 6 уровней синхронизации и получения координат КиберЁлки 2077 зайдите на портал:\n" +
    "🔗 <b>http://207.154.207.198/</b>\n\n" +
    "⚡ <i>Система автоматически создала узел матрицы с прямыми координатами для максимальной скорости подключения.</i>",
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
    await ctx.reply("❌ <b>Ошибка:</b> Не удалось получить ваш идентификатор в матрице.", { parse_mode: "HTML" });
    return;
  }

  const isAdminUser = isAdmin(userId);

  await ctx.reply(
    "🆔 <b>Ваш идентификатор в матрице:</b>\n\n" +
    `<code>${userId}</code>\n\n` +
    `🔐 Статус оператора системы: ${isAdminUser ? "✅ Активен" : "❌ Неактивен"}\n\n` +
    (isAdminUser
      ? "💡 Вы можете использовать команду /admin для доступа к панели оператора матрицы E.V.M."
      : "💡 Если вы должны быть оператором системы, убедитесь, что ваш ID добавлен в переменную окружения ADMIN_TELEGRAM_IDS."),
    {
      parse_mode: "HTML",
    },
  );
});

/**
 * Получить сумму оплаты по грейду
 */
function getPaymentAmount(grade: number): number | null {
  return PAYMENT_MATRIX[grade] || null;
}

/**
 * Форматировать сумму оплаты
 */
function formatPaymentAmount(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

/**
 * Показать информацию об оплате с суммой
 */
async function showPaymentInfo(ctx: Context, amount: number) {
  await ctx.reply(
    "💳 <b>Оплата участия в проекте</b>\n\n" +
    `💰 <b>Сумма к оплате:</b> <code>${formatPaymentAmount(amount)}</code>\n\n` +
    "🔗 <b>Ссылка на оплату:</b>\n" +
    "https://messenger.online.sberbank.ru/sl/y9AMLFXWofQE7wm3v\n\n" +
    "💡 После оплаты вы сможете продолжить участие в проекте и получить доступ ко всем уровням синхронизации.",
    {
      parse_mode: "HTML",
      reply_markup: createMainKeyboard(),
    },
  );
}

/**
 * Обработка команды /pay - оплата участия в проекте
 */
bot.command("pay", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }

  logUserAction(userId, "pay_command");

  // Устанавливаем состояние ожидания ввода грейда
  paymentStates.set(userId, { step: "waiting_for_grade" });

  await ctx.reply(
    "💳 <b>Оплата участия в проекте</b>\n\n" +
    "Для расчета суммы оплаты необходимо указать ваш грейд.\n\n" +
    "📊 <b>Введите ваш грейд:</b>",
    {
      parse_mode: "HTML",
    },
  );
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
      "❌ <b>Доступ запрещен</b>\n\n" +
      "У вас нет прав оператора системы.\n\n" +
      `🆔 Ваш идентификатор: <code>${userId}</code>\n\n` +
      "💡 Если вы должны быть оператором матрицы, убедитесь, что:\n" +
      "1. Ваш ID добавлен в переменную окружения ADMIN_TELEGRAM_IDS\n" +
      "2. Система была перезапущена после изменения переменной окружения\n\n" +
      "Используйте /myid для проверки вашего ID и статуса оператора.",
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
    "🔐 <b>Панель оператора матрицы E.V.M.</b>\n\n" +
    "<i>Доступ к системным функциям...</i>\n\n" +
    "Выберите действие:",
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
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

  // Пропускаем команды (они обрабатываются отдельными обработчиками bot.command)
  // Это важно, чтобы команды не попадали в обработчик неизвестных сообщений
  if (ctx.message.text?.startsWith("/")) {
    return;
  }

  // Проверяем, не админ ли это в режиме рассылки (обрабатываем раньше обычных сообщений)
  if (isAdmin(userId)) {
    const adminState = adminStates.get(userId);
    if (adminState?.step === "broadcast_waiting_message") {

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
        await ctx.reply("❌ <b>Ошибка:</b> Сообщение не может быть пустым. Попробуйте еще раз или отправьте /cancel.", { parse_mode: "HTML" });
        return;
      }

      if (mediaType !== "text" && !fileId) {
        await ctx.reply("❌ <b>Ошибка:</b> Не удалось получить файл. Попробуйте еще раз или отправьте /cancel.", { parse_mode: "HTML" });
        return;
      }

      // Сохраняем данные для рассылки во временное состояние
      adminStates.set(userId, {
        step: "broadcast_waiting_payment_filter",
        data: {
          type: mediaType,
          message: messageText || "",
          fileId,
          fileUniqueId,
          fileName,
        },
      });

      // Выбор фильтра по оплате
      const filterKeyboard = new InlineKeyboard()
        .text("✅ Только оплатившие", "broadcast_filter:paid")
        .row()
        .text("❌ Только не оплатившие", "broadcast_filter:unpaid")
        .row()
        .text("👥 Всем", "broadcast_filter:all")
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
        "📢 <b>Выбор получателей рассылки</b>\n\n" +
        `<i>Матрица E.V.M. готова к отправке сообщения...</i>\n\n` +
        `${typeEmoji[mediaType]} <b>Тип:</b> ${typeName[mediaType]}\n\n` +
        "<b>Содержимое для рассылки:</b>\n\n" +
        previewText +
        "\n\n" +
        "💳 <b>Выберите получателей:</b>",
        {
          parse_mode: "HTML",
          reply_markup: filterKeyboard,
        },
      );

      // Обновляем состояние, сохраняя данные
      const currentState = adminStates.get(userId);
      adminStates.set(userId, {
        step: "broadcast_waiting_payment_filter",
        data: {
          ...currentState?.data,
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
  const paymentState = paymentStates.get(userId);

  // Проверяем состояние оплаты
  if (paymentState?.step === "waiting_for_grade") {
    const messageText = ctx.message.text?.trim();
    const grade = messageText ? parseInt(messageText, 10) : null;

    if (grade && !isNaN(grade)) {
      const amount = getPaymentAmount(grade);
      if (amount !== null) {
        logUserAction(userId, "grade_entered", { grade, amount });

        // Сохраняем грейд в базу данных
        try {
          await updateUserGrade(userId.toString(), grade);
          console.log(`[BOT] Grade ${grade} saved for user ${userId}`);
        } catch (error) {
          console.error(`[BOT] Failed to save grade for user ${userId}:`, error);
          // Не прерываем процесс, просто логируем ошибку
        }

        await showPaymentInfo(ctx, amount);
        paymentStates.delete(userId);
        return;
      } else {
        await ctx.reply(
          "❌ <b>Грейд не найден</b>\n\n" +
          "Пожалуйста, проверьте правильность введенного грейда и попробуйте снова.\n\n" +
          "Или используйте команду /pay для начала заново.",
          {
            parse_mode: "HTML",
          },
        );
        return;
      }
    }

    await ctx.reply(
      "⚠️ <b>Неверный формат</b>\n\n" +
      "Пожалуйста, введите ваш грейд числом.\n\n" +
      "Или используйте команду /pay для начала заново.",
      {
        parse_mode: "HTML",
      },
    );
    return;
  }

  if (state?.step === "waiting_for_contact") {
    await ctx.reply(
      "⚠️ <b>Требуется действие:</b>\n\n" +
      "Нажмите на кнопку <b>'📱 Поделиться контактом'</b>, " +
      "чтобы продолжить синхронизацию с матрицей E.V.M.\n\n" +
      "Или используйте команду /cancel для прерывания.",
      {
        parse_mode: "HTML",
      },
    );
  } else if (state?.step === "waiting_for_alcohol_preference") {
    // Обрабатываем текстовый ввод для "свой вариант" алкоголя
    const messageText = ctx.message.text?.trim();

    if (!messageText || messageText.length === 0) {
      await ctx.reply(
        "❌ <b>Ошибка ввода:</b> Пожалуйста, введите текст или выберите один из вариантов выше.",
        {
          parse_mode: "HTML",
        },
      );
      return;
    }

    if (messageText.length > 200) {
      await ctx.reply(
        "❌ <b>Ошибка ввода:</b> Текст слишком длинный. Пожалуйста, введите до 200 символов.",
        {
          parse_mode: "HTML",
        },
      );
      return;
    }

    // Обновляем состояние с введенным текстом
    userStates.set(userId, {
      ...state,
      step: "registering",
      data: {
        ...state.data,
        alcoholPreference: messageText,
      },
    });

    // Регистрируем пользователя
    await completeRegistration(ctx, userId, userStates.get(userId)!);
  } else if (state?.step === "waiting_for_alcohol") {
    // Пользователь должен выбрать вариант через кнопки
    await ctx.reply(
      "⚠️ <b>Требуется выбор:</b>\n\n" +
      "Пожалуйста, выберите один из вариантов выше:\n" +
      "• ✅ Да\n" +
      "• ❌ Нет",
      {
        parse_mode: "HTML",
      },
    );
  } else if (state?.step === "registering") {
    await ctx.reply(
      "⏳ <i>Синхронизация с матрицей в процессе...</i>\n\n" +
      "Пожалуйста, подождите завершения инициализации.",
      {
        parse_mode: "HTML",
      },
    );
  } else {
    await ctx.reply(
      "❓ <b>Команда не распознана матрицей</b>\n\n" +
      "Используйте:\n" +
      "• /start - для подключения к матрице\n" +
      "• /myinfo - чтобы получить идентификаторы доступа\n" +
      "• /pay - для оплаты участия в проекте\n" +
      "• /help - для справки" +
      (isAdmin(userId) ? "\n• /admin - панель оператора системы" : ""),
      {
        parse_mode: "HTML",
        reply_markup: createMainKeyboard(),
      },
    );
  }
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
    "📢 <b>Системная рассылка матрицы E.V.M.</b>\n\n" +
    "Отправьте сообщение, фото или видео для рассылки всем синхронизированным пользователям.\n\n" +
    "<b>Поддерживаемые типы:</b>\n" +
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
      "📊 <b>Статистика синхронизированных пользователей матрицы E.V.M.</b>\n\n" +
      `👥 Всего профилей с каналом связи: <b>${usersData.total}</b>\n` +
      `✅ Активных для рассылки: <b>${activeUsers.length}</b>\n` +
      `⏸ Неактивных: <b>${usersData.total - activeUsers.length}</b>\n\n` +
      "💡 Рассылки отправляются только пользователям с активным telegramId в базе данных матрицы.",
      {
        parse_mode: "HTML",
        reply_markup: createMainKeyboard(),
      },
    );
  } catch (error) {
    await ctx.reply(
      "❌ <b>Ошибка системы:</b> Не удалось получить статистику матрицы:\n\n" +
      `<code>${error instanceof Error ? error.message : "Неизвестная ошибка"}</code>`,
      {
        parse_mode: "HTML",
      },
    );
  }
});

bot.callbackQuery("admin_refresh", async (ctx: Context) => {
  await ctx.answerCallbackQuery("🔄 Обновление...");

  if (!requireAdmin(ctx)) {
    return;
  }

  await ctx.editMessageText(
    "🔄 <b>Список обновлен!</b>\n\nИспользуйте /admin для возврата в панель оператора.",
    {
      parse_mode: "HTML",
    },
  );
});

/**
 * Обработка выбора фильтра оплаты для рассылки
 */
bot.callbackQuery(/^broadcast_filter:(paid|unpaid|all)$/, async (ctx: Context) => {
  await ctx.answerCallbackQuery();

  if (!requireAdmin(ctx)) {
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const match = ctx.callbackQuery.data?.match(/^broadcast_filter:(paid|unpaid|all)$/);
    if (!match) {
      await ctx.reply("❌ <b>Ошибка:</b> Неверный фильтр.", { parse_mode: "HTML" });
      return;
    }

    const filterType = match[1];
    const adminState = adminStates.get(userId);

    if (!adminState || !adminState.data) {
      await ctx.reply("❌ <b>Ошибка:</b> Данные рассылки не найдены. Начните заново.", { parse_mode: "HTML" });
      adminStates.delete(userId);
      return;
    }

    // Определяем фильтр по оплате
    let hasPaidFilter: boolean | undefined;
    let filterText: string;

    if (filterType === "paid") {
      hasPaidFilter = true;
      filterText = "✅ только оплатившим";
    } else if (filterType === "unpaid") {
      hasPaidFilter = false;
      filterText = "❌ только не оплатившим";
    } else {
      hasPaidFilter = undefined;
      filterText = "👥 всем";
    }

    // Сохраняем фильтр в состояние
    adminState.data.hasPaidFilter = hasPaidFilter;
    adminStates.set(userId, adminState);

    // Получаем статистику пользователей с учетом фильтра
    const usersData = await getTelegramUsers(hasPaidFilter);
    const activeUsers = usersData.users.filter(
      (u) => u.status === "active" && u.telegramId && u.telegramId.trim() !== "",
    );

    if (activeUsers.length === 0) {
      await ctx.editMessageText(
        "⚠️ <b>Нет пользователей для рассылки</b>\n\n" +
        `По выбранному фильтру (${filterText}) нет активных пользователей с telegramId для рассылки.`,
        {
          parse_mode: "HTML",
        },
      );
      adminStates.delete(userId);
      return;
    }

    // Формируем данные для рассылки
    const broadcastData = JSON.stringify({
      type: adminState.data.type,
      message: adminState.data.message || "",
      fileId: adminState.data.fileId,
      fileUniqueId: adminState.data.fileUniqueId,
      fileName: adminState.data.fileName,
      hasPaidFilter,
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
    if (adminState.data.type === "text") {
      previewText = (adminState.data.message || "").substring(0, 500) +
        ((adminState.data.message || "").length > 500 ? "\n\n... (обрезано)" : "");
    } else {
      previewText = `${typeEmoji[adminState.data.type]} ${typeName[adminState.data.type]}`;
      if (adminState.data.fileName) {
        previewText += `\n📄 Файл: ${adminState.data.fileName}`;
      }
      if (adminState.data.message) {
        previewText += `\n\n📝 Подпись:\n${adminState.data.message.substring(0, 300)}${adminState.data.message.length > 300 ? "... (обрезано)" : ""}`;
      }
    }

    await ctx.editMessageText(
      "📢 <b>Подтверждение системной рассылки</b>\n\n" +
      `<i>Матрица E.V.M. готова к отправке сообщения...</i>\n\n` +
      `${typeEmoji[adminState.data.type]} <b>Тип:</b> ${typeName[adminState.data.type]}\n` +
      `👥 <b>Получатели:</b> ${filterText}\n` +
      `📊 <b>Количество:</b> ${activeUsers.length} пользователей\n\n` +
      "<b>Содержимое для рассылки:</b>\n\n" +
      previewText +
      "\n\n" +
      "Разослать это сообщение?",
      {
        parse_mode: "HTML",
        reply_markup: confirmKeyboard,
      },
    );
  } catch (error) {
    await ctx.reply(
      "❌ <b>Ошибка:</b> Не удалось обработать выбор фильтра:\n\n" +
      `<code>${error instanceof Error ? error.message : "Неизвестная ошибка"}</code>`,
      {
        parse_mode: "HTML",
      },
    );
    adminStates.delete(userId);
  }
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
      await ctx.reply("❌ <b>Ошибка:</b> Не удалось расшифровать данные рассылки.", { parse_mode: "HTML" });
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
      hasPaidFilter?: boolean; // true - только оплатившие, false - только не оплатившие, undefined - все
    };

    try {
      broadcastData = JSON.parse(broadcastDataStr);
    } catch {
      // Для обратной совместимости: если это старый формат (только текст)
      broadcastData = {
        type: "text",
        message: broadcastDataStr,
        hasPaidFilter: undefined,
      };
    }

    await ctx.deleteMessage();
    const statusMsg = await ctx.reply("⏳ <i>Инициализация системной рассылки матрицы E.V.M...</i>", { parse_mode: "HTML" });

    // Получаем список пользователей из базы данных через API с учетом фильтра по оплате
    // API возвращает только пользователей, у которых есть telegramId в базе данных (поле telegram_id)
    // Это поле сохраняется при регистрации пользователя через Telegram бота
    const usersData = await getTelegramUsers(broadcastData.hasPaidFilter);

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
        "В базе данных матрицы E.V.M. нет пользователей с активным telegramId для рассылки.",
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
          console.warn(`[BOT] Skipping user ${user.tabNumber} - no telegramId`);
          failCount++;
          continue;
        }

        const telegramUserId = Number(user.telegramId);
        if (isNaN(telegramUserId) || telegramUserId <= 0) {
          console.warn(`[BOT] Invalid telegramId for user ${user.tabNumber}: ${user.telegramId}`);
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
      `✅ <b>Системная рассылка завершена!</b>\n\n` +
      `<i>Матрица E.V.M. обработала запрос...</i>\n\n` +
      `📊 <b>Статистика:</b>\n` +
      `✅ Успешно доставлено: <b>${successCount}</b>\n` +
      `❌ Ошибок доставки: <b>${failCount}</b>\n` +
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
      "❌ <b>Ошибка системной рассылки:</b>\n\n" +
      `<code>${error instanceof Error ? error.message : "Неизвестная ошибка"}</code>`,
      {
        parse_mode: "HTML",
      },
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
    "❌ <b>Рассылка отменена</b>\n\nИспользуйте /admin для возврата в панель оператора.",
    {
      parse_mode: "HTML",
    },
  );
});


/**
 * Обработка ошибок
 */
bot.catch((err) => {
  const errorMessage = err.error instanceof Error ? err.error.message : String(err.error);
  console.error("[BOT] Unhandled error:", errorMessage);

  // Для ошибок 404 (неверный токен) логируем более подробную информацию
  if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
    console.error("[BOT] ⚠️  Telegram API returned 404. This usually means:");
    console.error("[BOT]    - BOT_TOKEN is invalid or incorrect");
    console.error("[BOT]    - The bot token doesn't exist or was revoked");
    console.error("[BOT]    - Check your environment variables");
  }

  // Не пробрасываем ошибку дальше, чтобы бот продолжал работать
});

export { bot };
