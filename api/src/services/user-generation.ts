/**
 * Сервис для генерации тематических ников и кодов доступа
 */

// Тематические префиксы для ников в стиле E.V.M.
const OPERATOR_PREFIXES = [
  "ОПЕРАТОР",
  "АГЕНТ",
  "ИНЖЕНЕР",
  "ТЕХНИК",
  "СПЕЦИАЛИСТ",
  "АНАЛИТИК",
  "КОНТРОЛЛЕР",
  "МОНИТОР",
  "ОБСЕРВЕР",
  "КУРАТОР",
  "КООРДИНАТОР",
  "ДИСПЕТЧЕР",
  "ОПЕРАТИВНИК",
  "ЭКСПЕРТ",
  "МАСТЕР",
];

// Суффиксы для ников
const OPERATOR_SUFFIXES = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
];

/**
 * Генерирует тематический ник в стиле E.V.M.
 */
export function generateThematicNickname(): string {
  const prefix = OPERATOR_PREFIXES[Math.floor(Math.random() * OPERATOR_PREFIXES.length)];
  const suffix = OPERATOR_SUFFIXES[Math.floor(Math.random() * OPERATOR_SUFFIXES.length)];
  return `${prefix}-${suffix}`;
}

/**
 * Генерирует уникальный табельный номер в формате XXXX-XX
 */
export function generateTabNumber(existingTabNumbers: string[]): string {
  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    const part1 = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
    const part2 = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");
    const tabNumber = `${part1}-${part2}`;

    if (!existingTabNumbers.includes(tabNumber)) {
      return tabNumber;
    }

    attempts++;
  }

  // Fallback: используем timestamp
  const timestamp = Date.now().toString().slice(-6);
  return `T${timestamp.slice(0, 4)}-${timestamp.slice(4)}`;
}

/**
 * Генерирует 6-значный OTP код
 */
export function generateOtpCode(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

/**
 * Генерирует email на основе ника
 */
export function generateEmailFromNickname(nickname: string): string {
  const normalized = nickname
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${normalized}@evm.local`;
}

