import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const SILENCIO_DIR = process.env.SILENCIO_DIR || "silencio";
const GERADOR_DIR = process.env.GERADOR_DIR || "gerador";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) continue;

      if (value.type.startsWith("audio/")) {
        // áudio sempre salvo como audio.mp3 em silencio/
        const arrayBuffer = await value.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filePath = path.join(SILENCIO_DIR, "audio.mp3");
        await ensureDir(SILENCIO_DIR);
        await fs.writeFile(filePath, buffer);
        console.log(`Áudio salvo em ${filePath}`);
      }

      if (value.type.startsWith("image/")) {
        // imagem convertida para jpg e salva em gerador/
        const arrayBuffer = await value.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = value.name.replace(/\.[^.]+$/, "") + ".jpg";
        const filePath = path.join(GERADOR_DIR, fileName);
        await ensureDir(GERADOR_DIR);
        await sharp(buffer).jpeg({ quality: 90 }).toFile(filePath);
        console.log(`Imagem salva em ${filePath}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro upload:", error);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}
