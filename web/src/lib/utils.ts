import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDateTime(date: string | number | Date): string {
  const d = new Date(date);
  return d.toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

export function formatRelative(date: string | number | Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) {
    return "только что";
  }
  if (diff < 3_600_000) {
    const minutes = Math.round(diff / 60_000);
    return `${minutes} мин назад`;
  }
  if (diff < 86_400_000) {
    const hours = Math.round(diff / 3_600_000);
    return `${hours} ч назад`;
  }
  const days = Math.round(diff / 86_400_000);
  return `${days} дн назад`;
}

export function formatTimer(ms: number): string {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  if (days > 0) {
    return `${days}д ${hours}:${minutes}:${seconds}`;
  }
  return `${hours}:${minutes}:${seconds}`;
}

type TeamTitle = {
  title: string;
  description: string;
  minPoints: number;
};

const TEAM_TITLES: TeamTitle[] = [
  {
    title: "Отряд новобранцев",
    description: "Начальный уровень подготовки",
    minPoints: 0,
  },
  {
    title: "Звено операторов",
    description: "Первые шаги в системе",
    minPoints: 50,
  },
  {
    title: "Группа дешифровщиков",
    description: "Освоение базовых протоколов",
    minPoints: 100,
  },
  {
    title: "Сектор аналитики",
    description: "Специализация в обработке данных",
    minPoints: 200,
  },
  {
    title: "Отдел киберопераций",
    description: "Продвинутый уровень взаимодействия",
    minPoints: 300,
  },
  {
    title: "Бюро специальных задач",
    description: "Высокий уровень компетенции",
    minPoints: 500,
  },
  {
    title: "Управление сетевой безопасности",
    description: "Экспертный уровень защиты",
    minPoints: 750,
  },
  {
    title: "Центр стратегического планирования",
    description: "Координация сложных операций",
    minPoints: 1000,
  },
  {
    title: "Штаб координации",
    description: "Высшее звено управления",
    minPoints: 1500,
  },
  {
    title: "Высший совет операторов",
    description: "Максимальный уровень доступа",
    minPoints: 2000,
  },
  {
    title: "Элитный отряд Матрицы",
    description: "Легендарный статус в системе",
    minPoints: 3000,
  },
];

export function getTeamTitle(points: number): TeamTitle {
  // Находим самый высокий титул, который соответствует баллам
  let currentTitle = TEAM_TITLES[0];
  for (const title of TEAM_TITLES) {
    if (points >= title.minPoints) {
      currentTitle = title;
    } else {
      break;
    }
  }
  return currentTitle;
}

export function getAllTeamTitles(): TeamTitle[] {
  return TEAM_TITLES;
}

export function getNextTeamTitle(points: number): TeamTitle | null {
  const currentTitle = getTeamTitle(points);
  const currentIndex = TEAM_TITLES.findIndex(
    (t) => t.minPoints === currentTitle.minPoints,
  );
  if (currentIndex < TEAM_TITLES.length - 1) {
    return TEAM_TITLES[currentIndex + 1];
  }
  return null;
}

