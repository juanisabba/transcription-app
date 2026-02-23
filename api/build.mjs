import * as esbuild from "esbuild";
import { readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname);

function globDir(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(dir, f));
}

const alias = {
  "@shared/errors": join(root, "src/shared/errors/index.ts"),
  "@shared/utils/errorUtils": join(root, "src/shared/utils/errorUtils.ts"),
  "@shared/utils/validation": join(root, "src/shared/utils/validation.ts"),
  "@domain/entities/User": join(root, "src/domain/entities/User.ts"),
  "@domain/entities/Transcription": join(root, "src/domain/entities/Transcription.ts"),
  "@domain/repositories/IUserRepository": join(root, "src/domain/repositories/IUserRepository.ts"),
  "@domain/repositories/ITranscriptionRepository": join(root, "src/domain/repositories/ITranscriptionRepository.ts"),
  "@domain/repositories/IJobMappingRepository": join(root, "src/domain/repositories/IJobMappingRepository.ts"),
  "@domain/services/PasswordService": join(root, "src/domain/services/PasswordService.ts"),
  "@domain/exceptions": join(root, "src/domain/exceptions/index.ts"),
  "@domain/exceptions/InvalidFileTypeException": join(root, "src/domain/exceptions/InvalidFileTypeException.ts"),
  "@application/ports/IAuthService": join(root, "src/application/ports/IAuthService.ts"),
  "@application/ports/IStorageService": join(root, "src/application/ports/IStorageService.ts"),
  "@application/ports/IExternalApiService": join(root, "src/application/ports/IExternalApiService.ts"),
  "@application/ports/IRealtimeTokenProvider": join(root, "src/application/ports/IRealtimeTokenProvider.ts"),
  "@application/dto/auth": join(root, "src/application/dto/auth/index.ts"),
  "@application/dto/transcription": join(root, "src/application/dto/transcription/index.ts"),
  "@infrastructure/repositories/UserRepository": join(root, "src/infrastructure/repositories/UserRepository.ts"),
};

async function build() {
  const authFiles = globDir("src/presentation/http/auth");
  const transFiles = globDir("src/presentation/http/transcription");
  const eventsFiles = globDir("src/presentation/events");
  const entryPoints = [...authFiles, ...transFiles, ...eventsFiles];

  await esbuild.build({
    entryPoints,
    bundle: true,
    platform: "node",
    target: "node18",
    outdir: "dist",
    outbase: "src",
    external: ["@aws-sdk/*"],
    alias,
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
