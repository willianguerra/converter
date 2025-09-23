"use client";

import React, { useEffect, useCallback } from "react";
import { X, File as FileIcon, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MultiImageUploadProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  className?: string;
  name?: string;
  accept?: string;
}

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onDelete?: () => void;
  onEdit?: (file: File) => void;
  fileType: string;
  accept?: string;
}

/**
 * Converte qualquer imagem para JPEG
 */
async function convertToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context not available"));

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Conversion to JPEG failed"));

            const jpegFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, ".jpg"), // força extensão .jpg
              { type: "image/jpeg" }
            );
            resolve(jpegFile);
          },
          "image/jpeg",
          0.9 // qualidade (0 a 1)
        );
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt = "File preview",
  onDelete,
  onEdit,
  fileType,
  accept = "image/*",
}) => {
  const isImage = fileType.startsWith("image/");

  return (
    <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-md group">
      {isImage ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-md"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
          <FileIcon className="h-8 w-8 text-gray-500 sm:h-10 sm:w-10" />
        </div>
      )}

      {/* Excluir */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute right-1 top-1 rounded-full bg-gray-200 p-1 text-gray-600 hover:bg-gray-300 focus:outline-none"
          type="button"
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      )}

      {/* Editar (substituir imagem) */}
      {onEdit && (
        <label className="absolute left-1 bottom-1 rounded-full bg-gray-200 p-1 text-gray-600 hover:bg-gray-300 cursor-pointer">
          <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
          <input
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
    </div>
  );
};

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value = [],
  onChange,
  className,
  name,
  accept = "image/*",
}) => {
  const [previews, setPreviews] = React.useState<string[]>([]);

  useEffect(() => {
    if (!value) return;

    const objectUrls = value.map((file) => URL.createObjectURL(file));
    setPreviews(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [value]);

  // Adicionar imagens
  const handleAddFiles = useCallback(
    async (filesList: FileList) => {
      const fileArray = Array.from(filesList);

      const convertedFiles = await Promise.all(
        fileArray.map((file) => convertToJpeg(file))
      );

      onChange?.([...(value || []), ...convertedFiles]);
    },
    [value, onChange]
  );

  // Remover imagem
  const handleDelete = useCallback(
    (index: number) => {
      const newFiles = [...value];
      newFiles.splice(index, 1);
      onChange?.(newFiles);
    },
    [value, onChange]
  );

  // Editar imagem
  const handleEdit = useCallback(
    async (index: number, newFile: File) => {
      const jpegFile = await convertToJpeg(newFile);
      const newFiles = [...value];
      newFiles[index] = jpegFile;
      onChange?.(newFiles);
    },
    [value, onChange]
  );

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div className="flex flex-wrap gap-4">
        {/* Botão de adicionar */}
        <Button
          variant="outline"
          className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0"
          asChild
        >
          <label className="flex h-full w-full cursor-pointer items-center justify-center text-sm sm:text-base">
            Browse
            <input
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

        {/* Previews */}
        {value.map((file, i) => (
          <ImagePreview
            key={i}
            src={previews[i]}
            fileType={file.type}
            onDelete={() => handleDelete(i)}
            onEdit={(newFile) => handleEdit(i, newFile)}
            accept={accept}
          />
        ))}
      </div>
    </div>
  );
};
