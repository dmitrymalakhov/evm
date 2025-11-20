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
  "СТРАТЕГ",
  "КОМАНДИР",
  "ЛИДЕР",
  "ПИЛОТ",
  "ШТУРМАН",
  "МЕХАНИК",
  "ПРОГРАММИСТ",
  "РАЗВЕДЧИК",
  "СКАНЕР",
  "ДЕКОДЕР",
  "ПРОВЕРЯЮЩИЙ",
  "ТЕСТЕР",
  "ВОИН",
  "ЗАЩИТНИК",
  "НАСТАВНИК",
  "МЕНТОР",
  "ПРОВОДНИК",
  "ПОВОДАРЬ",
  "ПАТРУЛЬ",
  "ОХРАННИК",
];

// Суффиксы для ников (расширенный диапазон)
const OPERATOR_SUFFIXES = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
  "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
  "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
  "51", "52", "53", "54", "55", "56", "57", "58", "59", "60",
  "61", "62", "63", "64", "65", "66", "67", "68", "69", "70",
  "71", "72", "73", "74", "75", "76", "77", "78", "79", "80",
  "81", "82", "83", "84", "85", "86", "87", "88", "89", "90",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
];

/**
 * Генерирует тематический ник в стиле E.V.M.
 * @param existingNames - массив уже существующих ников для проверки уникальности
 * @returns уникальный ник
 */
export function generateThematicNickname(
  existingNames: string[] = [],
): string {
  const maxAttempts = 1000;
  let attempts = 0;

  // Перемешиваем массивы для случайности
  const shuffledPrefixes = [...OPERATOR_PREFIXES].sort(() => Math.random() - 0.5);
  const shuffledSuffixes = [...OPERATOR_SUFFIXES].sort(() => Math.random() - 0.5);

  while (attempts < maxAttempts) {
    const prefix = shuffledPrefixes[attempts % shuffledPrefixes.length];
    const suffix = shuffledSuffixes[attempts % shuffledSuffixes.length];
    const nickname = `${prefix}-${suffix}`;

    if (!existingNames.includes(nickname)) {
      return nickname;
    }

    attempts++;
  }

  // Fallback: если не удалось найти уникальный, добавляем timestamp
  const randomPrefix = OPERATOR_PREFIXES[Math.floor(Math.random() * OPERATOR_PREFIXES.length)];
  const timestamp = Date.now().toString().slice(-6);
  return `${randomPrefix}-${timestamp}`;
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

