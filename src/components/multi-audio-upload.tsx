"use client";

import React, { useEffect, useCallback, useState } from "react";
import { X, Pencil, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";

interface MultiAudioUploadProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  className?: string;
  name?: string;
  accept?: string;
}

interface AudioPreviewProps {
  file: File;
  src: string;
  onDelete?: () => void;
  onEdit?: (file: File) => void;
  accept?: string;
}

const AudioPreview: React.FC<AudioPreviewProps> = ({
  file,
  src,
  onDelete,
  onEdit,
  accept = "audio/mpeg",
}) => {
  return (
    <div className="flex flex-wrap items-center  gap-2 border rounded-md p-2 bg-gray-50 dark:bg-gray-950">
      {/* Ícone + nome */}
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5 text-gray-600" />
        <span className="text-sm truncate max-w-[150px]">{file.name}</span>
      </div>

      {/* Player */}
      <audio controls src={src} className="flex-1" />

      {/* Ações */}
      <div className="flex gap-2">
        {onEdit && (
          <label className="cursor-pointer p-1 rounded-full bg-gray-200 hover:bg-gray-300">
            <Pencil className="h-4 w-4 text-gray-600" />
            <Input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  onEdit(e.target.files[0]);
                }
              }}
            />
          </label>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
            type="button"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
};

export const MultiAudioUpload: React.FC<MultiAudioUploadProps> = ({
  value = [],
  onChange,
  className,
  name,
  accept = "audio/mpeg",
}) => {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!value) return;

    const objectUrls = value.map((file) => URL.createObjectURL(file));
    setPreviews(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [value]);

  const handleAddFiles = useCallback(
    (filesList: FileList) => {
      const fileArray = Array.from(filesList);
      onChange?.([...(value || []), ...fileArray]);
    },
    [value, onChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newFiles = [...value];
      newFiles.splice(index, 1);
      onChange?.(newFiles);
    },
    [value, onChange]
  );

  const handleEdit = useCallback(
    (index: number, newFile: File) => {
      const newFiles = [...value];
      newFiles[index] = newFile;
      onChange?.(newFiles);
    },
    [value, onChange]
  );

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {/* Botão de adicionar */}
      <Button variant="outline" asChild>
        <label className="cursor-pointer px-4 py-2">
          Adicionar áudio
          <Input
            type="file"
            accept={accept}
            multiple
            className="hidden"
            name={name}
            onChange={(e) =>
              e.target.files?.length && handleAddFiles(e.target.files)
            }
          />
        </label>
      </Button>

      {/* Lista de áudios */}
      <div className="flex flex-col gap-2 mt-2">
        {value.map((file, i) => (
          <AudioPreview
            key={i}
            file={file}
            src={previews[i]}
            onDelete={() => handleDelete(i)}
            onEdit={(newFile) => handleEdit(i, newFile)}
            accept={accept}
          />
        ))}
      </div>
    </div>
  );
};
