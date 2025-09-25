import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { promises as fs } from "fs";

const execFileAsync = promisify(execFile);

const CAMINHO_ARQUIVOS = process.env.CAMINHO_ARQUIVOS || '';
const SILENCIO_DIR = CAMINHO_ARQUIVOS + 'silencio' || "tessilenciote";
const SILENCIO_FINAL = path.join(SILENCIO_DIR, "audio_finalizados");
const GERADOR_DIR = CAMINHO_ARQUIVOS + 'gerador' || "gerador";
async function runBat(batPath: string, log: (msg: string) => void) {
  log(`▶️ Executando: ${batPath}`);
  try {
    const { stdout, stderr } = await execFileAsync("cmd", ["/c", batPath], {
      windowsHide: true,
    });
    if (stdout) log(stdout);
    if (stderr) log(stderr);
    log(`✅ Finalizado: ${batPath}`);
  } catch (err: any) {
    log(`❌ Erro na execução ${batPath}: ${err.message}`);
    throw err;
  }
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
      } catch {
        const data = await fs.readFile(from);
        await fs.writeFile(to, data);
        await fs.unlink(from);
        log(`✅ Copiado e removido: ${file} -> ${toDir}`);
      }
    }
  } catch (err: any) {
    log(`❌ Erro ao mover arquivos: ${err.message}`);
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

  const DESTINO_DIR = CAMINHO_ARQUIVOS + body.dir
  const folderName = DESTINO_DIR || "videos_ingles"; // padrão

  const stream = new ReadableStream({
    async start(controller) {
      const log = (msg: string) =>
        controller.enqueue(encoder.encode(msg + "\n"));

      try {
        log(`🎬 Iniciando processamento...`);

        // 1) Executa o 1º BAT
        await runBat(path.join(SILENCIO_DIR, "teste.bat"), log);

        // 2) Move áudios
        await moveFiles(SILENCIO_FINAL, GERADOR_DIR, [".mp3"], log);

        // 3) Executa o 2º BAT
        await runBat(path.join(GERADOR_DIR, "teste2.bat"), log);

        // 4) Cria pasta única para vídeos
        const baseDir = path.join(folderName);
        const videoDir = await getNextVideoDir(baseDir);
        log(`📂 Pasta criada: ${videoDir}`);

        // 5) Move vídeos
        await moveFiles(GERADOR_DIR, videoDir, [".mp4"], log);

        log("🚀 Processamento concluído com sucesso!");
        controller.close();
      } catch (err: any) {
        log("❌ Erro no processamento: " + err.message);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
    status: 201,
  });
}
