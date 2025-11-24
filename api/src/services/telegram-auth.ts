import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import {
    generateTabNumber,
    generateOtpCode,
    generateEmailFromNickname,
    generateThematicNickname,
} from "./user-generation.js";

export type TelegramRegisterInput = {
    telegramId: string;
    firstName: string;
    lastName?: string;
    username?: string;
    phoneNumber?: string;
    email?: string;
    willDrinkAlcohol?: boolean;
    alcoholPreference?: string;
};

export type TelegramRegisterResult = {
    id: string;
    email: string;
    name: string;
    tabNumber: string;
    otpCode: string;
    role: "user" | "mod" | "admin";
    status: "active" | "pending";
};

/**
 * Регистрирует пользователя через Telegram
 */
export function registerTelegramUser(
    input: TelegramRegisterInput,
): TelegramRegisterResult {
    const userId = `telegram_${input.telegramId}`;

    // Проверяем, не зарегистрирован ли пользователь уже по telegramId
    const existingUserByTelegramId = db
        .select()
        .from(users)
        .where(eq(users.telegramId, input.telegramId))
        .get();

    if (existingUserByTelegramId) {
        // Пользователь уже зарегистрирован с этим telegramId
        return {
            id: existingUserByTelegramId.id,
            email: existingUserByTelegramId.email,
            name: existingUserByTelegramId.name,
            tabNumber: existingUserByTelegramId.tabNumber,
            otpCode: existingUserByTelegramId.otpCode,
            role: existingUserByTelegramId.role,
            status: (existingUserByTelegramId.status || "active") as "active" | "pending",
        };
    }

    // Также проверяем по ID (на случай, если пользователь был создан другим способом)
    const existingUserById = db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .get();

    if (existingUserById) {
        // Если пользователь существует по ID, но без telegramId, обновляем telegramId
        if (!existingUserById.telegramId || existingUserById.telegramId !== input.telegramId) {
            db.update(users)
                .set({
                    telegramId: input.telegramId,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId))
                .run();
        }

        return {
            id: existingUserById.id,
            email: existingUserById.email,
            name: existingUserById.name,
            tabNumber: existingUserById.tabNumber,
            otpCode: existingUserById.otpCode,
            role: existingUserById.role,
            status: (existingUserById.status || "active") as "active" | "pending",
        };
    }

    // Формируем имя пользователя из имени и фамилии Telegram
    let fullName = input.lastName
        ? `${input.firstName} ${input.lastName}`.trim()
        : input.firstName;

    // Получаем все существующие имена и табельные номера для проверки уникальности
    const existingUsers = db.select({
        tabNumber: users.tabNumber,
        name: users.name
    }).from(users).all();
    const existingTabNumbers = existingUsers.map((u: { tabNumber: string }) => u.tabNumber);
    const existingNames = existingUsers.map((u: { name: string }) => u.name);

    // Проверяем уникальность имени и генерируем тематический ник, если имя занято
    let finalName = fullName;
    if (existingNames.includes(fullName)) {
        // Если имя занято, генерируем тематический ник
        finalName = generateThematicNickname(existingNames);

        // Дополнительная проверка на случай, если тематический ник тоже занят
        let nameAttempts = 0;
        while (existingNames.includes(finalName) && nameAttempts < 100) {
            finalName = generateThematicNickname(existingNames);
            nameAttempts++;

            // Если все равно не уникально после многих попыток, добавляем суффикс
            if (nameAttempts > 50 && existingNames.includes(finalName)) {
                const suffix = input.telegramId.slice(-4);
                finalName = `${fullName}-${suffix}`;
                break;
            }
        }
    }

    // Финальная проверка уникальности имени перед вставкой
    const existingUserByName = db
        .select()
        .from(users)
        .where(eq(users.name, finalName))
        .get();

    if (existingUserByName) {
        // Генерируем уникальный ник с суффиксом на основе telegramId и timestamp
        const suffix = input.telegramId.slice(-4);
        const timestamp = Date.now().toString().slice(-4);
        finalName = `${fullName}-${suffix}-${timestamp}`;
    }

    fullName = finalName;

    // Генерируем email, если не предоставлен
    let emailToUse = input.email || generateEmailFromNickname(fullName);

    // Проверяем уникальность email и генерируем новый, если нужно
    let attempts = 0;
    while (attempts < 10) {
        const existingUserByEmail = db
            .select()
            .from(users)
            .where(eq(users.email, emailToUse))
            .get();

        if (!existingUserByEmail) {
            break;
        }

        // Если email занят, генерируем новый на основе telegramId
        emailToUse = `telegram_${input.telegramId}_${Date.now()}@evm.local`;
        attempts++;
    }

    // Генерируем данные
    const tabNumber = generateTabNumber(existingTabNumbers);
    const otpCode = generateOtpCode();
    const now = new Date();

    // Сохраняем пользователя с Telegram ID
    db.insert(users)
        .values({
            id: userId,
            email: emailToUse,
            name: fullName,
            role: "user",
            teamId: null,
            title: null,
            avatarUrl: null,
            tabNumber,
            otpCode,
            status: "active",
            telegramId: input.telegramId,
            willDrinkAlcohol: input.willDrinkAlcohol ?? null,
            alcoholPreference: input.alcoholPreference ?? null,
            createdAt: now,
            updatedAt: now,
        })
        .run();

    const created = db.select().from(users).where(eq(users.id, userId)).get();

    if (!created) {
        throw new Error("Не удалось создать пользователя");
    }

    return {
        id: created.id,
        email: created.email,
        name: created.name,
        tabNumber: created.tabNumber,
        otpCode: created.otpCode,
        role: created.role,
        status: (created.status || "active") as "active" | "pending",
    };
}

/**
 * Получает список всех пользователей, зарегистрированных через Telegram
 * Возвращает только пользователей, у которых есть telegramId в базе данных (подписанных на бота)
 * Это поле используется для рассылок через Telegram бота
 * @param hasPaidFilter - фильтр по статусу оплаты: true - только оплатившие, false - только не оплатившие, undefined - все
 */
export function getTelegramUsers(hasPaidFilter?: boolean): Array<{
    id: string;
    telegramId: string;
    name: string;
    email: string;
    tabNumber: string;
    status: string;
    hasPaid: boolean | null;
    createdAt: Date;
}> {
    // Получаем всех пользователей с telegramId (не null и не пустой строкой)
    // Используем прямое поле telegramId из базы данных, не вычисляем его из id
    const allUsers = db
        .select({
            id: users.id,
            telegramId: users.telegramId,
            name: users.name,
            email: users.email,
            tabNumber: users.tabNumber,
            status: users.status,
            hasPaid: users.hasPaid,
            createdAt: users.createdAt,
        })
        .from(users)
        .all();

    // Фильтруем только пользователей с заполненным telegramId (подписанных на бота)
    let telegramUsers = allUsers.filter(
        (user) => user.telegramId && user.telegramId.trim() !== "",
    );

    // Применяем фильтр по статусу оплаты, если указан
    if (hasPaidFilter !== undefined) {
        telegramUsers = telegramUsers.filter((user) => {
            if (hasPaidFilter === true) {
                // Только оплатившие (hasPaid === true)
                return user.hasPaid === true;
            } else {
                // Только не оплатившие (hasPaid === false или null)
                return user.hasPaid !== true;
            }
        });
    }

    console.log(
        `[TELEGRAM-AUTH] Found ${telegramUsers.length} users with telegramId${hasPaidFilter !== undefined ? ` (hasPaid=${hasPaidFilter})` : ""} out of ${allUsers.length} total users`,
    );

    return telegramUsers.map((user) => ({
        id: user.id,
        telegramId: user.telegramId!, // Гарантированно не null после фильтрации
        name: user.name,
        email: user.email,
        tabNumber: user.tabNumber,
        status: user.status || "active",
        hasPaid: user.hasPaid ?? null,
        createdAt: user.createdAt,
    }));
}

/**
 * Обновляет грейд пользователя по telegramId
 */
export function updateUserGradeByTelegramId(
    telegramId: string,
    grade: number,
): boolean {
    const user = db
        .select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .get();

    if (!user) {
        return false;
    }

    db.update(users)
        .set({
            grade,
            updatedAt: new Date(),
        })
        .where(eq(users.telegramId, telegramId))
        .run();

    return true;
}

