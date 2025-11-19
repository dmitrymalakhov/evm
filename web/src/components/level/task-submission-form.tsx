"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const isSelectingFilesRef = useRef(false);

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
  
  // Debug logging
  useEffect(() => {
    console.log("TaskSubmissionForm render", {
      taskType: task.type,
      requiresPhoto,
      maxFiles,
      acceptedTypes,
      taskConfig: taskConfig,
      photosCount: photos.length,
      previewsCount: photoPreviews.length,
    });
  }, [task.type, requiresPhoto, maxFiles, acceptedTypes, photos.length, photoPreviews.length]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

  // Global error handler to prevent page reload on errors
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error("Global error caught:", e.error, e.message);
      if (isSelectingFilesRef.current) {
        console.log("Error occurred while selecting files - preventing default");
        e.preventDefault();
        return false;
      }
    };

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", e.reason);
      if (isSelectingFilesRef.current) {
        console.log("Promise rejection while selecting files");
        e.preventDefault();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Block form submission when selecting files - at document level
  useEffect(() => {
    console.log("🔵 [DOCUMENT LISTENER] Setting up document-level submit listener");
    const handleDocumentSubmit = (e: Event) => {
      console.log("🟡 [DOCUMENT SUBMIT] Document-level submit event caught");
      console.log("🟡 [DOCUMENT SUBMIT] Event details:", {
        type: e.type,
        target: e.target,
        currentTarget: e.currentTarget,
        isSelectingFiles: isSelectingFilesRef.current,
        timestamp: new Date().toISOString(),
      });
      if (isSelectingFilesRef.current) {
        console.log("🔴 [DOCUMENT SUBMIT] BLOCKED - files are being selected");
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        console.log("🔴 [DOCUMENT SUBMIT] Document-level submit prevented");
        return false;
      } else {
        console.log("🟢 [DOCUMENT SUBMIT] Not blocking - files not being selected");
      }
    };

    // Add listener at capture phase to catch all submits
    document.addEventListener("submit", handleDocumentSubmit, { capture: true });
    
    // Also prevent any navigation that might happen
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSelectingFilesRef.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      document.removeEventListener("submit", handleDocumentSubmit, { capture: true });
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Block form submission when selecting files - at form level
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      console.log("🟡 [FORM LISTENER] Form ref is null, skipping listener setup");
      return;
    }

    console.log("🔵 [FORM LISTENER] Setting up form-level submit listener", { formId: form.id });
    const handleFormSubmit = (e: SubmitEvent) => {
      console.log("🟡 [FORM LISTENER] Form-level submit event caught");
      console.log("🟡 [FORM LISTENER] Event details:", {
        type: e.type,
        target: e.target,
        currentTarget: e.currentTarget,
        submitter: e.submitter,
        isSelectingFiles: isSelectingFilesRef.current,
        timestamp: new Date().toISOString(),
      });
      if (isSelectingFilesRef.current) {
        console.log("🔴 [FORM LISTENER] BLOCKED - files are being selected");
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        console.log("🔴 [FORM LISTENER] Form-level submit prevented");
        return false;
      } else {
        console.log("🟢 [FORM LISTENER] Not blocking - files not being selected");
      }
    };

    form.addEventListener("submit", handleFormSubmit, { capture: true });
    return () => {
      form.removeEventListener("submit", handleFormSubmit, { capture: true });
    };
  }, []);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔵 [PHOTO SELECT] START - handlePhotoSelect called");
    console.log("🔵 [PHOTO SELECT] Event details:", {
      type: e.type,
      target: e.target,
      currentTarget: e.currentTarget,
      files: e.target.files,
      filesLength: e.target.files?.length,
    });
    
    // CRITICAL: Prevent any default behavior that might cause page reload
    console.log("🔵 [PHOTO SELECT] Calling preventDefault()");
    e.preventDefault();
    console.log("🔵 [PHOTO SELECT] Calling stopPropagation()");
    e.stopPropagation();
    // Use nativeEvent for stopImmediatePropagation if available
    if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
      console.log("🔵 [PHOTO SELECT] Calling nativeEvent.stopImmediatePropagation()");
      e.nativeEvent.stopImmediatePropagation();
    } else {
      console.log("🔵 [PHOTO SELECT] nativeEvent.stopImmediatePropagation() not available");
    }
    
    try {
      console.log("🔵 [PHOTO SELECT] Setting isSelectingFilesRef.current = true");
      // Mark that we're selecting files to prevent form submission
      isSelectingFilesRef.current = true;
      
    const files = Array.from(e.target.files || []);
      console.log("🔵 [PHOTO SELECT] Files array created:", {
        filesCount: files.length,
        fileNames: files.map(f => f.name),
        fileTypes: files.map(f => f.type),
        fileSizes: files.map(f => f.size),
      });
      
      console.log("🔵 [PHOTO SELECT] Current state:", { 
        filesCount: files.length, 
        acceptedTypes: taskConfig.acceptedTypes,
        maxFiles,
        currentPhotosCount: photos.length,
        currentPhotoPreviewsCount: photoPreviews.length,
      });
      
      if (files.length === 0) {
        console.log("🟡 [PHOTO SELECT] No files selected - returning early");
        isSelectingFilesRef.current = false;
        return;
      }
      console.log("🟢 [PHOTO SELECT] Files found, proceeding with processing");
    
    // Filter by accepted types if specified
    console.log("🔵 [PHOTO SELECT] Starting file type filtering");
    let filteredFiles = files;
    if (taskConfig.acceptedTypes && taskConfig.acceptedTypes.length > 0) {
      console.log("🔵 [PHOTO SELECT] Filtering files by accepted types:", taskConfig.acceptedTypes);
      filteredFiles = files.filter((file) => {
        const matches = taskConfig.acceptedTypes!.some((acceptedType) => {
          // Support both exact match and wildcard match (e.g., "image/*")
          if (acceptedType.endsWith("/*")) {
            const baseType = acceptedType.split("/")[0];
            return file.type.startsWith(`${baseType}/`);
          }
          return file.type === acceptedType;
        });
        console.log(`🔵 [PHOTO SELECT] File ${file.name} (${file.type}) matches: ${matches}`);
        return matches;
      });
      console.log("🔵 [PHOTO SELECT] Filtered files:", {
        originalCount: files.length,
        filteredCount: filteredFiles.length,
        filteredFileNames: filteredFiles.map(f => f.name),
      });
      
      // Show warning if some files were filtered out
      if (filteredFiles.length < files.length) {
        const rejectedCount = files.length - filteredFiles.length;
        console.log(`🟡 [PHOTO SELECT] ${rejectedCount} files were filtered out`);
        toast.warning(
          `Отфильтровано ${rejectedCount} ${rejectedCount === 1 ? "файл" : "файлов"}`,
          {
            description: `Принятые типы: ${taskConfig.acceptedTypes.join(", ")}`,
          }
        );
      }
    } else {
      console.log("🔵 [PHOTO SELECT] No accepted types filter - using all files");
    }
    
    if (filteredFiles.length === 0) {
      console.log("🔴 [PHOTO SELECT] No suitable files after filtering - showing error");
      toast.error("Нет подходящих файлов", {
        description: "Выбранные файлы не соответствуют требуемым типам.",
      });
      // Reset input
      if (fileInputRef.current) {
        console.log("🔵 [PHOTO SELECT] Resetting file input value");
        fileInputRef.current.value = "";
      }
      isSelectingFilesRef.current = false;
      return;
    }
    
    // Add new files to existing ones, respecting maxFiles limit
    console.log("🔵 [PHOTO SELECT] Calculating files to add");
    const currentCount = photos.length;
    const remainingSlots = maxFiles - currentCount;
    console.log("🔵 [PHOTO SELECT] File limits:", {
      currentCount,
      maxFiles,
      remainingSlots,
      filteredFilesCount: filteredFiles.length,
    });
    const filesToAdd = filteredFiles.slice(0, remainingSlots);
    console.log("🔵 [PHOTO SELECT] Files to add:", {
      count: filesToAdd.length,
      fileNames: filesToAdd.map(f => f.name),
    });
    
    if (filesToAdd.length < filteredFiles.length) {
      const skippedCount = filteredFiles.length - filesToAdd.length;
      console.log(`🟡 [PHOTO SELECT] ${skippedCount} files will be skipped due to maxFiles limit`);
      toast.warning(
        `Можно загрузить максимум ${maxFiles} файлов`,
        {
          description: `Пропущено ${skippedCount} ${skippedCount === 1 ? "файл" : "файлов"}.`,
        }
      );
    }
    
    if (filesToAdd.length > 0) {
      console.log(`🟢 [PHOTO SELECT] Showing success toast for ${filesToAdd.length} files`);
      toast.success(
        `Добавлено ${filesToAdd.length} ${filesToAdd.length === 1 ? "фото" : "фото"}`,
      );
    }
    
    console.log("🔵 [PHOTO SELECT] Creating new photos array");
    const newPhotos = [...photos, ...filesToAdd];
    console.log("🔵 [PHOTO SELECT] New photos array:", { 
      oldCount: photos.length, 
      newCount: newPhotos.length,
      filesToAddCount: filesToAdd.length,
      allFileNames: newPhotos.map(f => f.name),
    });
    
    console.log("🔵 [PHOTO SELECT] Calling setPhotos()");
    setPhotos(newPhotos);
    console.log("🔵 [PHOTO SELECT] setPhotos() called - state update queued");

    // Clean up old preview URLs
    console.log("🔵 [PHOTO SELECT] Cleaning up old preview URLs");
    previewUrlsRef.current.forEach((url) => {
      console.log("🔵 [PHOTO SELECT] Revoking URL:", url);
      URL.revokeObjectURL(url);
    });

    // Create previews
    console.log("🔵 [PHOTO SELECT] Creating new preview URLs");
    const newPreviews = newPhotos.map((file) => {
      const url = URL.createObjectURL(file);
      console.log("🔵 [PHOTO SELECT] Created preview URL for", file.name, ":", url);
      return url;
    });
    previewUrlsRef.current = newPreviews;
    console.log("🔵 [PHOTO SELECT] Calling setPhotoPreviews()");
    setPhotoPreviews(newPreviews);
    console.log("🔵 [PHOTO SELECT] setPhotoPreviews() called - state update queued");
    console.log("🔵 [PHOTO SELECT] Preview URLs:", { 
      previewsCount: newPreviews.length,
      previewUrls: newPreviews,
    });
    
    // Reset input
    if (fileInputRef.current) {
      console.log("🔵 [PHOTO SELECT] Resetting file input value");
      fileInputRef.current.value = "";
    } else {
      console.log("🔴 [PHOTO SELECT] fileInputRef.current is null - cannot reset input");
    }
    
    // Reset the flag after processing is complete
    console.log("🔵 [PHOTO SELECT] Setting timeout to reset isSelectingFilesRef flag");
    setTimeout(() => {
      console.log("🔵 [PHOTO SELECT] Timeout fired - resetting isSelectingFilesRef.current = false");
      isSelectingFilesRef.current = false;
      console.log("🟢 [PHOTO SELECT] COMPLETE - all processing done");
    }, 100);
    } catch (error) {
      console.error("🔴 [PHOTO SELECT] ERROR in handlePhotoSelect:", error);
      console.error("🔴 [PHOTO SELECT] Error stack:", error instanceof Error ? error.stack : "No stack");
      console.error("🔴 [PHOTO SELECT] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        error,
      });
      toast.error("Ошибка при выборе файлов", {
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
      // Reset the flag even on error
      console.log("🔵 [PHOTO SELECT] Resetting isSelectingFilesRef.current = false due to error");
      isSelectingFilesRef.current = false;
    }
  }, [photos, taskConfig.acceptedTypes, maxFiles]);

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

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent submission if we're currently selecting files
    if (isSelectingFilesRef.current) {
      console.log("Prevented form submission - files are being selected");
      return;
    }
    
    // Upload photos to server if we have files and upload function
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      if (!onUploadFiles) {
        console.error("🔴 [SUBMIT] onUploadFiles is not available", { photos: photos.length, onUploadFiles });
        throw new Error("Функция загрузки файлов не доступна. Пожалуйста, обновите страницу.");
      }
      try {
        console.log("🔵 [SUBMIT] Uploading files:", { count: photos.length, fileNames: photos.map(f => f.name) });
        const uploadedFiles = await onUploadFiles(photos);
        console.log("🔵 [SUBMIT] Uploaded files response:", uploadedFiles);
        photoUrls = uploadedFiles.map((file) => {
          console.log("🔵 [SUBMIT] Processing uploaded file:", { 
            filename: file.filename, 
            url: file.url, 
            originalName: file.originalName 
          });
          return file.url;
        });
        console.log("🔵 [SUBMIT] Photo URLs extracted:", { 
          count: photoUrls.length, 
          urls: photoUrls,
          urlsTypes: photoUrls.map(url => typeof url),
        });
        if (photoUrls.length === 0) {
          throw new Error("Не удалось загрузить файлы. Попробуйте еще раз.");
        }
        console.log("🟢 [SUBMIT] Photo URLs ready for submission:", photoUrls);
      } catch (error) {
        console.error("🔴 [SUBMIT] Failed to upload files:", error);
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
    
    console.log("🔵 [SUBMIT] Final payload for submission:", { 
      photos: payload.photos,
      photosCount: payload.photos?.length,
      photosType: typeof payload.photos,
      photosIsArray: Array.isArray(payload.photos),
      survey: payload.survey,
      text: payload.text,
      fullPayload: payload,
    });

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
    <>
      {/* File input outside of form to prevent auto-submit */}
      {requiresPhoto && (
        <input
          ref={(el) => {
            console.log("🔵 [FILE INPUT REF] Ref callback called", { element: el });
            fileInputRef.current = el;
          }}
          type="file"
          accept={acceptedTypes}
          multiple={maxFiles > 1}
          onChange={(e) => {
            console.log("🟢 [FILE INPUT] onChange triggered");
            console.log("🟢 [FILE INPUT] onChange event details:", {
              type: e.type,
              target: e.target,
              currentTarget: e.currentTarget,
              files: e.target.files,
              filesLength: e.target.files?.length,
              timestamp: new Date().toISOString(),
            });
            handlePhotoSelect(e);
            console.log("🟢 [FILE INPUT] onChange handler completed");
          }}
          onClick={(e) => {
            console.log("🟢 [FILE INPUT] onClick triggered");
            console.log("🟢 [FILE INPUT] onClick event details:", {
              type: e.type,
              target: e.target,
              currentTarget: e.currentTarget,
              timestamp: new Date().toISOString(),
            });
            e.stopPropagation();
            console.log("🟢 [FILE INPUT] onClick stopPropagation() called");
          }}
          onFocus={(e) => {
            console.log("🟢 [FILE INPUT] onFocus triggered");
            console.log("🟢 [FILE INPUT] onFocus event details:", {
              type: e.type,
              target: e.target,
              currentTarget: e.currentTarget,
              timestamp: new Date().toISOString(),
            });
            e.stopPropagation();
            console.log("🟢 [FILE INPUT] onFocus stopPropagation() called");
          }}
          onBlur={(e) => {
            console.log("🟢 [FILE INPUT] onBlur triggered");
            console.log("🟢 [FILE INPUT] onBlur event details:", {
              type: e.type,
              target: e.target,
              currentTarget: e.currentTarget,
              timestamp: new Date().toISOString(),
            });
          }}
          className="hidden"
        />
      )}
      <form 
        ref={(el) => {
          console.log("🔵 [FORM REF] Ref callback called", { element: el, formId: `task-form-${task.id}` });
          formRef.current = el;
        }}
        id={`task-form-${task.id}`}
        onSubmit={(e) => {
          console.log("🟡 [FORM SUBMIT] START - Form onSubmit triggered");
          console.log("🟡 [FORM SUBMIT] Event details:", {
            type: e.type,
            target: e.target,
            currentTarget: e.currentTarget,
            isSelectingFiles: isSelectingFilesRef.current,
            timestamp: new Date().toISOString(),
          });
          
          // Double check - prevent if selecting files
          if (isSelectingFilesRef.current) {
            console.log("🔴 [FORM SUBMIT] BLOCKED - files are being selected");
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
              e.nativeEvent.stopImmediatePropagation();
            }
            console.log("🔴 [FORM SUBMIT] Form submit prevented");
            return;
          }
          
          console.log("🟢 [FORM SUBMIT] Proceeding with form submission");
          e.preventDefault();
          e.stopPropagation();
          if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
            e.nativeEvent.stopImmediatePropagation();
          }
          
          console.log("🟢 [FORM SUBMIT] Calling handleSubmit()");
          void handleSubmit(e);
          console.log("🟢 [FORM SUBMIT] handleSubmit() called");
        }}
        onClick={(e) => {
          // Prevent any click events from bubbling up and causing issues
          if (e.target === e.currentTarget) {
            console.log("Form clicked");
          }
        }}
        className="space-y-4"
        noValidate
      >
        {/* Photo upload section */}
        {requiresPhoto && (
          <div className="space-y-2">
            <Label>Загрузить фото</Label>
            <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                console.log("🟢 [BUTTON CLICK] START - Button clicked to select files");
                console.log("🟢 [BUTTON CLICK] Event details:", {
                  type: e.type,
                  target: e.target,
                  currentTarget: e.currentTarget,
                  button: e.button,
                  nativeEvent: e.nativeEvent,
                });
                console.log("🟢 [BUTTON CLICK] Current state:", {
                  photosCount: photos.length,
                  maxFiles,
                  isSubmitting,
                  fileInputRefExists: !!fileInputRef.current,
                });
                
                console.log("🟢 [BUTTON CLICK] Calling preventDefault()");
                e.preventDefault();
                console.log("🟢 [BUTTON CLICK] Calling stopPropagation()");
                e.stopPropagation();
                // Use nativeEvent for stopImmediatePropagation if needed
                if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                  console.log("🟢 [BUTTON CLICK] Calling nativeEvent.stopImmediatePropagation()");
                  e.nativeEvent.stopImmediatePropagation();
                } else {
                  console.log("🟢 [BUTTON CLICK] nativeEvent.stopImmediatePropagation() not available");
                }
                
                if (fileInputRef.current) {
                  console.log("🟢 [BUTTON CLICK] fileInputRef.current exists, triggering click");
                  console.log("🟢 [BUTTON CLICK] File input element:", fileInputRef.current);
                  try {
                    fileInputRef.current.click();
                    console.log("🟢 [BUTTON CLICK] File input click() called successfully");
                  } catch (clickError) {
                    console.error("🔴 [BUTTON CLICK] Error calling fileInputRef.current.click():", clickError);
                  }
                } else {
                  console.error("🔴 [BUTTON CLICK] File input ref is null!");
                }
                console.log("🟢 [BUTTON CLICK] END - Button click handler completed");
              }}
              disabled={photos.length >= maxFiles || isSubmitting}
            >
              <Upload className="mr-2 h-4 w-4" />
              {photos.length === 0 ? "Выбрать фото" : `Выбрать фото (${photos.length}/${maxFiles})`}
            </Button>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={`preview-${index}-${photos[index]?.name || index}`} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-32 w-full rounded-md object-cover"
                      onError={(e) => {
                        console.error("Failed to load preview image", { index, preview });
                        e.currentTarget.style.display = "none";
                      }}
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
            {photos.length > 0 && photoPreviews.length === 0 && (
              <div className="text-xs text-evm-muted">
                Загружено файлов: {photos.length}, но превью не созданы
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
          type="submit"
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
    </form>
    </>
  );
}

