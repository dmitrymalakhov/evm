"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/types/contracts";

type TaskSubmissionFormProps = {
  task: Task;
  onSubmit: (payload: {
    photos?: string[];
    survey?: Record<string, string>;
    text?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  onUploadFiles?: (files: File[]) => Promise<Array<{ filename: string; url: string; originalName: string; size: number; mimetype: string }>>;
};

export function TaskSubmissionForm({
  task,
  onSubmit,
  onCancel,
  isSubmitting = false,
  onUploadFiles,
}: TaskSubmissionFormProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
  const [textAnswer, setTextAnswer] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const taskConfig = task.config as {
    requiresPhoto?: boolean;
    requiresSurvey?: boolean;
    surveyQuestions?: Array<{ id: string; question: string; type: "text" | "textarea" }>;
    requiresText?: boolean;
    maxFiles?: number;
    acceptedTypes?: string[];
  };

  // For upload tasks, show photo upload
  const requiresPhoto = task.type === "upload" || taskConfig.requiresPhoto;
  const maxFiles = taskConfig.maxFiles ?? 5;
  const acceptedTypes = taskConfig.acceptedTypes?.join(",") ?? "image/*";

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter by accepted types if specified
    const filteredFiles = taskConfig.acceptedTypes
      ? files.filter((file) => taskConfig.acceptedTypes!.includes(file.type))
      : files;
    
    const newPhotos = [...photos, ...filteredFiles].slice(0, maxFiles);
    setPhotos(newPhotos);

    // Clean up old preview URLs
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));

    // Create previews
    const newPreviews = newPhotos.map((file) => URL.createObjectURL(file));
    previewUrlsRef.current = newPreviews;
    setPhotoPreviews(newPreviews);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    // Revoke object URL for removed photo
    URL.revokeObjectURL(photoPreviews[index]);
    
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    
    previewUrlsRef.current = newPreviews;
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };

  const handleSurveyChange = (questionId: string, value: string) => {
    setSurveyAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // Upload photos to server if we have files and upload function
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      if (!onUploadFiles) {
        console.error("onUploadFiles is not available", { photos: photos.length, onUploadFiles });
        throw new Error("Функция загрузки файлов не доступна. Пожалуйста, обновите страницу.");
      }
      try {
        console.log("Uploading files:", photos.length, "files");
        const uploadedFiles = await onUploadFiles(photos);
        console.log("Uploaded files:", uploadedFiles);
        photoUrls = uploadedFiles.map((file) => file.url);
        if (photoUrls.length === 0) {
          throw new Error("Не удалось загрузить файлы. Попробуйте еще раз.");
        }
        console.log("Photo URLs:", photoUrls);
      } catch (error) {
        console.error("Failed to upload files:", error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Не удалось загрузить файлы. Пожалуйста, попробуйте еще раз.";
        throw new Error(errorMessage);
      }
    }

    const payload = {
      photos: photoUrls.length > 0 ? photoUrls : undefined,
      survey: Object.keys(surveyAnswers).length > 0 ? surveyAnswers : undefined,
      text: textAnswer || undefined,
    };
    
    console.log("Submitting payload:", { ...payload, photos: payload.photos?.length });

    await onSubmit(payload);
  };

  const canSubmit = () => {
    // For upload tasks, require at least one photo
    if (requiresPhoto && photos.length === 0) return false;
    if (taskConfig.requiresSurvey && taskConfig.surveyQuestions) {
      const allAnswered = taskConfig.surveyQuestions.every(
        (q) => surveyAnswers[q.id] && surveyAnswers[q.id].trim() !== ""
      );
      if (!allAnswered) return false;
    }
    if (taskConfig.requiresText && !textAnswer.trim()) return false;
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Photo upload section */}
      {requiresPhoto && (
        <div className="space-y-2">
          <Label>Загрузить фото</Label>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              multiple={maxFiles > 1}
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= maxFiles || isSubmitting}
            >
              <Upload className="mr-2 h-4 w-4" />
              {photos.length === 0 ? "Выбрать фото" : `Выбрать фото (${photos.length}/${maxFiles})`}
            </Button>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-32 w-full rounded-md object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                      onClick={() => handleRemovePhoto(index)}
                      disabled={isSubmitting}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Survey section */}
      {taskConfig.requiresSurvey && taskConfig.surveyQuestions && (
        <div className="space-y-4">
          <Label>Опрос</Label>
          {taskConfig.surveyQuestions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label htmlFor={`survey-${question.id}`}>{question.question}</Label>
              {question.type === "textarea" ? (
                <Textarea
                  id={`survey-${question.id}`}
                  value={surveyAnswers[question.id] || ""}
                  onChange={(e) => handleSurveyChange(question.id, e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Введите ответ..."
                />
              ) : (
                <Input
                  id={`survey-${question.id}`}
                  value={surveyAnswers[question.id] || ""}
                  onChange={(e) => handleSurveyChange(question.id, e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Введите ответ..."
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Text answer section - show if required, or for upload tasks (optional), or if no other requirements exist */}
      {(taskConfig.requiresText || 
        (requiresPhoto && task.type === "upload") || 
        (!requiresPhoto && !taskConfig.requiresSurvey && !taskConfig.requiresText)) && (
        <div className="space-y-2">
          <Label htmlFor="text-answer">Ответ</Label>
          <Textarea
            id="text-answer"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={isSubmitting}
            placeholder="Введите ваш ответ..."
            rows={4}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Отмена
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit() || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Отправка...
            </>
          ) : (
            "Сдать на модерацию"
          )}
        </Button>
      </div>
    </div>
  );
}

