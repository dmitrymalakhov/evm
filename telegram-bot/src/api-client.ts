/**
 * API клиент для работы с API сервера
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const API_TIMEOUT = Number(process.env.API_TIMEOUT || 10000); // 10 секунд по умолчанию
const API_RETRY_ATTEMPTS = Number(process.env.API_RETRY_ATTEMPTS || 3);
const API_RETRY_DELAY = Number(process.env.API_RETRY_DELAY || 1000); // 1 секунда

export type TelegramRegisterRequest = {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  willDrinkAlcohol?: boolean;
  alcoholPreference?: string;
};

export type TelegramRegisterResponse = {
  id: string;
  email: string;
  name: string;
  tabNumber: string;
  otpCode: string;
  role: "user" | "mod" | "admin";
  status: "active" | "pending";
};

/**
 * Выполняет fetch с таймаутом
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Запрос превысил время ожидания");
    }
    throw error;
  }
}

/**
 * Выполняет запрос с повторными попытками
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempts: number = API_RETRY_ATTEMPTS,
  delay: number = API_RETRY_DELAY,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, API_TIMEOUT);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < attempts) {
        console.warn(
          `API request failed (attempt ${attempt}/${attempts}), retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError || new Error("Неизвестная ошибка при выполнении запроса");
}

/**
 * Регистрирует пользователя через Telegram API
 */
export async function registerTelegramUser(
  data: TelegramRegisterRequest,
): Promise<TelegramRegisterResponse> {
  console.log(`[API] Registering user: ${data.telegramId}`);

  try {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/telegram/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      let errorMessage = "Неизвестная ошибка";
      
      try {
        const error = await response.json() as { message?: string };
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      console.error(`[API] Registration failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const result = await response.json() as TelegramRegisterResponse;
    console.log(`[API] User registered successfully: ${result.tabNumber}`);
    return result;
  } catch (error) {
    console.error(`[API] Registration error:`, error);
    
    if (error instanceof Error) {
      // Улучшаем сообщения об ошибках для пользователя
      if (error.message.includes("timeout") || error.message.includes("ожидания")) {
        throw new Error("Сервер не отвечает. Попробуйте позже.");
      }
      if (error.message.includes("fetch failed") || error.message.includes("network")) {
        throw new Error("Ошибка соединения с сервером. Проверьте подключение к интернету.");
      }
      throw error;
    }
    
    throw new Error("Неожиданная ошибка при регистрации");
  }
}

export type TelegramUser = {
  telegramId: string;
  name: string;
  email: string;
  tabNumber: string;
  status: string;
  createdAt: string;
};

export type TelegramUsersResponse = {
  users: TelegramUser[];
  total: number;
};

/**
 * Получает список всех пользователей, зарегистрированных через Telegram
 */
export async function getTelegramUsers(): Promise<TelegramUsersResponse> {
  console.log(`[API] Fetching Telegram users list`);

  try {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/telegram/users`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      let errorMessage = "Неизвестная ошибка";
      
      try {
        const error = await response.json() as { message?: string };
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      console.error(`[API] Failed to fetch users: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const result = await response.json() as TelegramUsersResponse;
    console.log(`[API] Fetched ${result.total} users`);
    return result;
  } catch (error) {
    console.error(`[API] Fetch users error:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("ожидания")) {
        throw new Error("Сервер не отвечает. Попробуйте позже.");
      }
      if (error.message.includes("fetch failed") || error.message.includes("network")) {
        throw new Error("Ошибка соединения с сервером. Проверьте подключение к интернету.");
      }
      throw error;
    }
    
    throw new Error("Неожиданная ошибка при получении списка пользователей");
  }
}
