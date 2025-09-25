"use client";

import React from "react";
import { useForm, useFieldArray, ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { MultiImageUpload } from "@/components/multi-image-upload";
import { MultiAudioUpload } from "@/components/multi-audio-upload";
import Background from "@/components/background";
import axios from "axios";
import { toast } from "react-toastify";
import { InputFormValidations } from "@/components/input-validation";

// --- Schema de um roteiro ---
const roteiroSchema = z.object({
  audio: z.array(z.instanceof(File)).min(1, "Um áudio é obrigatório"),
  images: z
    .array(z.instanceof(File))
    .min(1, "Pelo menos uma imagem é obrigatória"),
  dir: z.string().min(1, "Informe o nome da pasta que o video ficara salvo")
});

// --- Schema geral (lista de roteiros) ---
const schema = z.object({
  roteiros: z.array(roteiroSchema).min(1, "Adicione pelo menos 1 roteiro"),
});

type FormData = z.infer<typeof schema>;

const MediaUploadForm = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roteiros: [{ audio: [], images: [], dir: '' }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "roteiros",
  });

  async function createRoteiro(roteiro: z.infer<typeof roteiroSchema>) {
    const response = await axios.post("/api/processar", roteiro)

    if (response.status == 201) {
      return true
    }

    if (response.status === 409) {
      throw response.data.error || 'Erro ao criar roteiro.';
    }

    // pega mensagem de erro do backend se existir
    throw new Error(response.data?.message || 'Erro ao criar roteiro');
  }


  const onSubmit = async (data: FormData) => {
    for (let idx = 0; idx < data.roteiros.length; idx++) {
      const roteiro = data.roteiros[idx];
      const formData = new FormData();

      roteiro.audio.forEach((file) => formData.append("audio", file));
      roteiro.images.forEach((file) => formData.append("images", file));

      // Upload do roteiro
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Erro no upload");

      toast.promise(
        createRoteiro(roteiro),
        {
          pending: `Criando roteiros`,
          success: 'Roteiros Criados com sucesso!',
          error: {
            render({ data }: any) {
              return data.message || 'Erro ao criar roteiro';
            }
          }
        },
        {
          autoClose: 2000,
          onClose: async () => {
            console.log(`✅ Roteiro ${idx + 1} concluído`);
          }
        }
      )


    }
  };


  return (
    <Background>
      <div className="min-h-screen flex flex-col items-center  p-4 overflow-auto pt-22">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full grid sm:grid-cols-2 grid-cols-1 gap-2"
          >
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 border rounded-md shadow-sm bg-background"
              >
                <h2 className="font-semibold text-lg">
                  Roteiro {index + 1}
                </h2>

                {/* Upload de Áudio */}

                <InputFormValidations label="Nome da Pasta" name={`roteiros.${index}.dir`} placeholder="Nome da Pasta" />

                <FormField
                  control={form.control}
                  name={`roteiros.${index}.audio`}
                  render={({
                    field,
                  }: {
                    field: ControllerRenderProps<FormData, `roteiros.${number}.audio`>;
                  }) => (
                    <FormItem>
                      <FormLabel>Áudio (.mp3)</FormLabel>
                      <FormControl>
                        <MultiAudioUpload
                          value={field.value}
                          onChange={field.onChange}
                          className="my-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Upload de Imagens */}
                <FormField
                  control={form.control}
                  name={`roteiros.${index}.images`}
                  render={({
                    field,
                  }: {
                    field: ControllerRenderProps<FormData, `roteiros.${number}.images`>;
                  }) => (
                    <FormItem>
                      <FormLabel>Imagens em sequência</FormLabel>
                      <FormControl>
                        <MultiImageUpload
                          value={field.value}
                          onChange={field.onChange}
                          className="my-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => remove(index)}
                  >
                    Remover Roteiro
                  </Button>
                )}
              </div>
            ))}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ audio: [], images: [], dir: '' })}
              >
                + Adicionar Roteiro
              </Button>

              <Button type="submit" className="bg-gray-900 text-white">
                Enviar para Processamento
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Background>
  );
};

export default MediaUploadForm;
