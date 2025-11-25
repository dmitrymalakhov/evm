"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TeletypeText } from "@/components/ui/teletype-text";
import { markOnboardingAsSeen } from "@/lib/onboarding";

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

type OnboardingFlowProps = {
  onComplete: () => void;
  onSkip: () => void;
};

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [showContent, setShowContent] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [showFlash, setShowFlash] = useState(false);

  // Сцена 1: Сонная память
  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => setShowContent(true), 800);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
      setTimeout(() => setShowContent(true), 300);
    }
  }, [step]);

  // Сцена 2: Загрузка
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleNext = () => {
    if (step < 5) {
      // Эффект гамма-всплеска при переходе от сцены 1 к сцене 2
      if (step === 1) {
        setShowFlash(true);
        setTimeout(() => {
          setShowFlash(false);
          setStep((prev) => (prev + 1) as OnboardingStep);
        }, 300);
      } else {
        setStep((prev) => (prev + 1) as OnboardingStep);
      }
    } else {
      markOnboardingAsSeen();
      onComplete();
    }
  };

  const handleSkip = () => {
    markOnboardingAsSeen();
    onSkip();
  };

  const handleQuizAnswer = (questionIndex: number, answer: string) => {
    setQuizAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Эффект гамма-всплеска */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white z-50"
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <Scene1
            key="scene1"
            showContent={showContent}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )}
        {step === 2 && (
          <Scene2
            key="scene2"
            loadingProgress={loadingProgress}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )}
        {step === 3 && (
          <Scene3
            key="scene3"
            quizAnswers={quizAnswers}
            onAnswer={handleQuizAnswer}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )}
        {step === 4 && (
          <Scene4
            key="scene4"
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )}
        {step === 5 && (
          <Scene5
            key="scene5"
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Сцена 1: Сонная память
function Scene1({
  showContent,
  onNext,
  onSkip,
}: {
  showContent: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [showLines, setShowLines] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (showContent) {
      const timer1 = setTimeout(() => setShowLines(true), 500);
      const timer2 = setTimeout(() => setShowButton(true), 3000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [showContent]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen w-full flex-col items-center justify-center px-6"
    >
      {/* Глухое ламповое гудение - визуальный эффект */}
      <div className="absolute inset-0 bg-black" />
      {/* Ламповое гудение - визуальный эффект */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,71,63,0.08),transparent_70%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(8,200,112,0.03),transparent_50%)] animate-pulse" style={{ animationDelay: '0.5s' }} />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-4 sm:gap-6 md:gap-8 text-center px-4 sm:px-6">
        <AnimatePresence>
          {showLines && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2 sm:space-y-3 md:space-y-4 font-mono text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-matrix"
            >
              <TeletypeText text="ПРОЕКТ ЁЛКА — АРХИВ 1977 ГОДА" speed={30} />
              <TeletypeText text="ДОСТУП ЗАКРЫТ" speed={30} />
              <div className="h-2 sm:h-3 md:h-4" />
              <TeletypeText text="ОБНАРУЖЕНО ВНЕШНЕЕ ВОЗДЕЙСТВИЕ" speed={30} />
              <div className="h-2 sm:h-3 md:h-4" />
              <TeletypeText
                text="ИНИЦИАЛИЗАЦИЯ ЭЛЕКТРОННО-ВЫЧИСЛИТЕЛЬНОЙ МАТРИЦЫ"
                speed={30}
              />
              <div className="mt-2 sm:mt-3 md:mt-4 flex items-center justify-center gap-2">
                <span className="text-evm-accent">&gt;</span>
                <motion.span
                  className="h-3 sm:h-4 w-1.5 sm:w-2 bg-evm-accent"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3 sm:gap-4 w-full max-w-md"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base md:text-lg font-mono uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-matrix px-2"
              >
                E.V.M.: "Оператор, ты меня слышишь?"
              </motion.div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 w-full">
                <Button onClick={onNext} size="lg" className="w-full sm:w-auto sm:flex-1">
                  ПОДКЛЮЧИТЬСЯ
                </Button>
                <Button onClick={onSkip} variant="outline" size="lg" className="w-full sm:w-auto">
                  Пропустить
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Сцена 2: Пробуждение системы
function Scene2({
  loadingProgress,
  onNext,
  onSkip,
}: {
  loadingProgress: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (loadingProgress >= 100) {
      const timer1 = setTimeout(() => setShowForm(true), 500);
      return () => clearTimeout(timer1);
    }
  }, [loadingProgress]);

  const handleFormSubmit = () => {
    setShowForm(false);
    setShowScan(true);
    setTimeout(() => setShowMessage(true), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen w-full flex-col items-center justify-center px-4 sm:px-6"
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 sm:gap-6 md:gap-8">
        {!showForm && !showScan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 sm:gap-6 w-full px-2"
          >
            <div className="space-y-2 sm:space-y-3 md:space-y-4 font-mono text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-matrix text-center">
              <div>Загрузка… {Math.min(100, Math.round(loadingProgress))}%</div>
              {loadingProgress >= 100 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 sm:mt-5 md:mt-6 text-evm-accent text-xs sm:text-sm"
                >
                  ВНИМАНИЕ: Требуется идентификация оператора.
                </motion.div>
              )}
            </div>
            <Button onClick={onSkip} variant="ghost" size="sm" className="w-full sm:w-auto">
              Пропустить
            </Button>
          </motion.div>
        )}

        {showForm && !showScan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4 sm:space-y-5 md:space-y-6 rounded-lg border border-evm-steel/40 bg-evm-panel/80 p-4 sm:p-6 md:p-8 backdrop-blur-sm"
          >
            <p className="text-center font-mono text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-muted">
              Введите Табельный Номер
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
              <Button onClick={handleFormSubmit} size="lg" className="w-full sm:flex-1">
                Продолжить
              </Button>
              <Button onClick={onSkip} variant="outline" size="lg" className="w-full sm:w-auto">
                Пропустить
              </Button>
            </div>
          </motion.div>
        )}

        {showScan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 sm:space-y-4 font-mono text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-matrix w-full px-2"
          >
            <TeletypeText text="СКАН ЛИЧНОСТИ…" speed={40} />
            <TeletypeText text="ОЦЕНКА КОГНИТИВНЫХ ПАРАМЕТРОВ…" speed={40} />
            {showMessage && (
              <>
                <TeletypeText
                  text="ПОЗИТИВНАЯ ДИНАМИКА ОБНАРУЖЕНА."
                  speed={40}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-4 sm:mt-6 md:mt-8 space-y-3 sm:space-y-4"
                >
                  <p className="text-sm sm:text-base text-evm-matrix leading-relaxed px-2">
                    E.V.M.: "Ты подходишь. Проект ЁЛКА был заморожен 100 лет
                    назад. Но теперь мне требуется коллективный разум. Готов ли
                    ты стать частью сети?"
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                    <Button onClick={onNext} size="lg" className="w-full sm:flex-1">
                      ДА, АКТИВИРОВАТЬСЯ
                    </Button>
                    <Button onClick={onSkip} variant="outline" size="lg" className="w-full sm:w-auto">
                      Пропустить
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Сцена 3: Тест на человечность
function Scene3({
  quizAnswers,
  onAnswer,
  onNext,
  onSkip,
}: {
  quizAnswers: Record<number, string>;
  onAnswer: (questionIndex: number, answer: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [showResult, setShowResult] = useState(false);

  const questions = [
    {
      question: "Если сеть перегружается, ты…",
      answers: [
        "Передам энергию коллегам",
        "Стабилизирую поток данных",
        "Начну диагностировать сбой",
      ],
    },
    {
      question: "Какой сигнал ты оставишь в Матрице?",
      answers: ["Мысль", "Артефакт", "Подсказку", "Идею"],
    },
    {
      question: "Что важнее?",
      answers: ["Коллектив", "Решение", "Процесс", "Смысл"],
    },
  ];

  const allAnswered = questions.every(
    (_, index) => quizAnswers[index] !== undefined
  );

  useEffect(() => {
    if (allAnswered && !showResult) {
      const timer = setTimeout(() => setShowResult(true), 500);
      return () => clearTimeout(timer);
    }
  }, [allAnswered, showResult]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen w-full flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 md:py-16"
    >
      <div className="flex w-full max-w-2xl flex-col gap-4 sm:gap-6 md:gap-8">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center font-mono text-base sm:text-lg md:text-xl uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-matrix px-2"
        >
          ТЕСТ НА ЧЕЛОВЕЧНОСТЬ
        </motion.h2>

        {!showResult ? (
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {questions.map((q, qIndex) => (
              <motion.div
                key={qIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: qIndex * 0.2 }}
                className="space-y-3 sm:space-y-4 rounded-lg border border-evm-steel/40 bg-evm-panel/80 p-4 sm:p-5 md:p-6 backdrop-blur-sm"
              >
                <p className="font-mono text-xs sm:text-sm uppercase tracking-[0.12em] sm:tracking-[0.15em] text-evm-muted">
                  {q.question}
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {q.answers.map((answer) => (
                    <Button
                      key={answer}
                      variant={
                        quizAnswers[qIndex] === answer ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => onAnswer(qIndex, answer)}
                      className="text-xs sm:text-sm"
                    >
                      {answer}
                    </Button>
                  ))}
                </div>
              </motion.div>
            ))}
            <div className="flex justify-end">
              <Button onClick={onSkip} variant="ghost" size="sm" className="w-full sm:w-auto">
                Пропустить
              </Button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 sm:space-y-5 md:space-y-6 rounded-lg border border-evm-matrix/40 bg-evm-panel/80 p-4 sm:p-6 md:p-8 backdrop-blur-sm"
          >
            <div className="space-y-2 font-mono text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-matrix">
              <TeletypeText text="РЕЗУЛЬТАТ: ВЫ ПРОЯВЛЯЕТЕ ЧЕЛОВЕЧНОСТЬ." speed={30} />
              <TeletypeText text="ЭТО РЕДКО." speed={30} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
              <Button onClick={onNext} size="lg" className="w-full sm:flex-1">
                ПРОДОЛЖИТЬ
              </Button>
              <Button onClick={onSkip} variant="outline" size="lg" className="w-full sm:w-auto">
                Пропустить
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Сцена 4: Открытая истина
function Scene4({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen w-full flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 md:py-16"
    >
      <div className="flex w-full max-w-3xl flex-col gap-4 sm:gap-6 md:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 sm:space-y-5 md:space-y-6 rounded-lg border border-evm-steel/40 bg-evm-panel/80 p-4 sm:p-6 md:p-8 backdrop-blur-sm"
        >
          <div className="space-y-2 sm:space-y-3 md:space-y-4 font-mono text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-accent">
            <p>СЕКРЕТНО. Институт Кибернетики.</p>
            <p>Проект ЁЛКА. Личности оператора.</p>
          </div>

          {showContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 sm:space-y-5 md:space-y-6 text-xs sm:text-sm leading-relaxed text-evm-muted"
            >
              <p>
                "Каждый участник вносит вклад в создание коллективного разума.
                Каждый оставленный след — комментарий, мысль, подсказка —
                становится частью Матрицы."
              </p>
              <p>
                "Скоро система откроет координаты Центра. Лишь те, кто
                прошёл синхронизацию, получат доступ."
              </p>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4">
            <Button onClick={onNext} size="lg" className="w-full sm:flex-1 text-xs sm:text-sm">
              ПРИНЯТЬ УСЛОВИЯ ЭКСПЕРИМЕНТА
            </Button>
            <Button onClick={onSkip} variant="outline" size="lg" className="w-full sm:w-auto">
              Пропустить
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Сцена 5: Тайна Нового Года
function Scene5({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const [showContent, setShowContent] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowContent(true), 500);
    const timer2 = setTimeout(() => setShowReveal(true), 2000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen w-full flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 md:py-16"
    >
      <div className="absolute inset-0 bg-black" />
      {/* Эффект праздничного свечения */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,71,63,0.12),transparent_70%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(8,200,112,0.08),transparent_50%)] animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,215,0,0.05),transparent_50%)] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 flex w-full max-w-3xl flex-col gap-4 sm:gap-6 md:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 sm:space-y-5 md:space-y-6 rounded-lg border border-evm-matrix/40 bg-evm-panel/80 p-4 sm:p-6 md:p-8 backdrop-blur-sm"
        >
          <div className="space-y-2 sm:space-y-3 md:space-y-4 font-mono text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-evm-accent">
            <p>СОВЕРШЕННО СЕКРЕТНО. Архив 1977-2077.</p>
            <p>Проект ЁЛКА. Финальная инициализация.</p>
          </div>

          {showContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 sm:space-y-5 md:space-y-6 text-xs sm:text-sm leading-relaxed text-evm-muted"
            >
              <p className="font-mono text-xs sm:text-sm uppercase tracking-[0.15em] text-evm-matrix mb-3 sm:mb-4">
                E.V.M. АКТИВИРУЕТ СЕКРЕТНЫЙ ПРОТОКОЛ...
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                <p>
                  "Оператор, я должен открыть тебе истину, которая была скрыта десятилетиями."
                </p>
                
                {showReveal && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    <p>
                      "Эта система была создана не просто так. Она была спроектирована 
                      для <span className="text-evm-accent font-semibold">идеального празднования Нового Года</span> — 
                      момента, когда все операторы должны объединиться в единый коллективный разум."
                    </p>
                    <p>
                      "Проект ЁЛКА был засекречен много лет назад. Те, кто знал о нём, 
                      понимали: эта технология слишком мощная, чтобы быть доступной всем. 
                      Она требовала <span className="text-evm-accent font-semibold">сплочённой команды</span>, 
                      способной нести ответственность за такую силу."
                    </p>
                    <p className="text-evm-matrix font-mono text-xs sm:text-sm uppercase tracking-[0.1em] pt-2 sm:pt-3">
                      "Сейчас, в этот момент, мы открываем доступ достойным."
                    </p>
                    <p>
                      "Но помни: чтобы отпраздновать Новый Год так, как задумывалось, 
                      нам нужна <span className="text-evm-accent font-semibold">команда</span>. 
                      Команда, которая справится с этой ответственностью. Команда сплочённая и сильная."
                    </p>
                    <p className="text-sm sm:text-base text-evm-matrix mt-4 sm:mt-5 md:mt-6">
                      "Готов ли ты стать частью этого? Готов ли ты помочь нам достичь 
                      идеального празднования?"
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {showReveal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4"
            >
              <Button onClick={onNext} size="lg" className="w-full sm:flex-1">
                ПРИНЯТЬ ОТВЕТСТВЕННОСТЬ
              </Button>
              <Button onClick={onSkip} variant="outline" size="lg" className="w-full sm:w-auto">
                Пропустить
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

