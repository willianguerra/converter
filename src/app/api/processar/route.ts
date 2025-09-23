import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { promises as fs } from "fs";

const execFileAsync = promisify(execFile);

const SILENCIO_DIR = process.env.SILENCIO_DIR || "silencio";
const SILENCIO_FINAL = path.join(SILENCIO_DIR, "audio_finalizados");
const GERADOR_DIR = process.env.GERADOR_DIR || "gerador";

async function runExecutable(
  exePath: string,
  args: string[],
  log: (msg: string) => void
) {
  log(`▶️ Executando: ${exePath} ${args.join(" ")}`);
  const { stdout, stderr } = await execFileAsync(exePath, args, {
    windowsHide: true,
  });
  if (stdout) log(stdout);
  if (stderr) log(stderr);
  log(`✅ Finalizado: ${exePath}`);
}

async function moveFiles(
  fromDir: string,
  toDir: string,
  extensions: string[],
  log: (msg: string) => void
) {
  try {
    const files = await fs.readdir(fromDir);
    await fs.mkdir(toDir, { recursive: true });

    const normalizedExt = extensions.map((e) => e.toLowerCase());
    const selected = files.filter((file) =>
      normalizedExt.includes(path.extname(file).toLowerCase())
    );

    if (selected.length === 0) {
      log(
        `⚠️ Nenhum arquivo encontrado em ${fromDir} com extensões ${extensions.join(
          ", "
        )}`
      );
      return;
    }

    log(`🔍 Encontrados ${selected.length} arquivos em ${fromDir}`);

    for (const file of selected) {
      const from = path.join(fromDir, file);
      const to = path.join(toDir, file);

      try {
        await fs.rename(from, to);
        log(`📂 Movido: ${file} -> ${toDir}`);
      } catch (err) {
        log(`⚠️ fs.rename falhou para ${file}, tentando copiar...`);
        const data = await fs.readFile(from);
        await fs.writeFile(to, data);
        await fs.unlink(from);
        log(`✅ Copiado e removido: ${file} -> ${toDir}`);
      }
    }
  } catch (err) {
    log(`❌ Erro ao mover arquivos: ${(err as Error).message}`);
  }
}

async function getNextVideoDir(baseDir: string): Promise<string> {
  await fs.mkdir(baseDir, { recursive: true });
  const dirs = await fs.readdir(baseDir, { withFileTypes: true });
  const numbers = dirs
    .filter((d) => d.isDirectory() && d.name.startsWith("video_"))
    .map((d) => parseInt(d.name.replace("video_", ""), 10))
    .filter((n) => !isNaN(n));
  const nextIndex = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  const newDir = path.join(baseDir, `video_${nextIndex}`);
  await fs.mkdir(newDir, { recursive: true });
  return newDir;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const body = await req.json();
  const folderName = body.folderName || "videos_ingles"; // padrão

  const stream = new ReadableStream({

    async start(controller) {
      const log = (msg: string) =>
        controller.enqueue(encoder.encode(msg + "\n"));

      try {
        log(`🎬 Iniciando processamento...`);
        log(`📂 Pastas configuradas:`);
        log(`   - SILENCIO_DIR: ${SILENCIO_DIR}`);
        log(`   - SILENCIO_FINAL: ${SILENCIO_FINAL}`);
        log(`   - GERADOR_DIR: ${GERADOR_DIR}`);
        log(`   - DESTINO: ${folderName}`);

        // 1) Executa silencio.exe
        await runExecutable(SILENCIO_DIR + "silencio.cmd", [], log);

        // 2) Move cortes (mp3) para gerador/
        log(`➡️ Movendo áudios de ${SILENCIO_FINAL} para ${GERADOR_DIR}`);
        await moveFiles(SILENCIO_FINAL, GERADOR_DIR, [".mp3"], log);

        // 3) Executa gerador.exe
        await runExecutable(GERADOR_DIR + "gerador.cmd", [], log);

        // 4) Cria pasta única para vídeos dentro da pasta escolhida
        const baseDir = path.join(folderName);
        const videoDir = await getNextVideoDir(baseDir);
        log(`📂 Pasta de vídeos criada: ${videoDir}`);

        // 5) Move vídeos (mp4) para essa pasta
        log(`➡️ Movendo vídeos de ${GERADOR_DIR} para ${videoDir}`);
        await moveFiles(GERADOR_DIR, videoDir, [".mp4"], log);

        log("🚀 Processamento concluído com sucesso!");
        controller.close();
      } catch (err) {
        log("❌ Erro no processamento: " + (err as Error).message);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
