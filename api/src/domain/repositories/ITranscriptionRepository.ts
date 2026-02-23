import { Transcription } from "../entities/Transcription";

/**
 * Puerto de persistencia para la entidad de dominio `Transcription`.
 *
 * Define el contrato que deben implementar los adaptadores de infraestructura
 * (por ejemplo, repositorios basados en DynamoDB, PostgreSQL, etc.) sin
 * exponer detalles técnicos al dominio.
 */
export interface ITranscriptionRepository {
  /**
   * Persiste una nueva transcripción en el sistema de almacenamiento.
   *
   * Debe guardar todas las propiedades relevantes: id, userId, fileName,
   * status, s3Path, content, createdAt, updatedAt.
   *
   * @param transcription - Entidad de transcripción de dominio a persistir.
   * @returns Una promesa que se resuelve cuando la operación finaliza.
   */
  save(transcription: Transcription): Promise<void>;

  /**
   * Busca una transcripción por su identificador único y el ID del usuario.
   *
   * Requiere ambas claves de la tabla (userId HASH, id RANGE).
   * El filtro por userId garantiza aislamiento multi-tenant.
   *
   * @param id - Identificador único de la transcripción.
   * @param userId - Identificador del usuario propietario.
   * @returns Una promesa que resuelve con la `Transcription` encontrada o `null` si no existe.
   */
  findById(id: string, userId: string): Promise<Transcription | null>;

  /**
   * Lista transcripciones de un usuario con paginación por cursor.
   *
   * Se utiliza para el historial de transcripciones. La paginación con cursor
   * permite eficiencia en conjuntos de datos grandes.
   *
   * @param userId - Identificador del usuario cuyas transcripciones se buscan.
   * @param limit - Número máximo de elementos a devolver (opcional).
   * @param cursor - Cursor para la siguiente página (opcional).
   * @returns Una promesa con los items, si hay más resultados (hasMore) y el cursor siguiente.
   */
  findByUserId(
    userId: string,
    limit?: number,
    cursor?: string
  ): Promise<{
    items: Transcription[];
    hasMore: boolean;
    nextCursor?: string;
  }>;

  /**
   * Actualiza una transcripción existente en el almacenamiento.
   *
   * Se utiliza cuando cambia el status o el content (por ejemplo, tras completar
   * la transcripción o tras un fallo).
   *
   * @param transcription - Entidad de transcripción con los datos actualizados.
   * @param options - Condiciones: onlyIfStatus (único) o onlyIfStatusIn (varios) para actualizar solo si el estado coincide.
   * @returns Una promesa que se resuelve cuando la actualización se ha aplicado.
   */
  update(
    transcription: Transcription,
    options?: {
      onlyIfStatus?: "pending" | "processing" | "completed" | "failed";
      /** Permite Batch webhook: actualizar a completed si está en pending O processing (evita bloqueo por race S3/Confirm) */
      onlyIfStatusIn?: Array<"pending" | "processing" | "completed" | "failed">;
    }
  ): Promise<void>;

  /**
   * Elimina una transcripción del almacenamiento.
   *
   * Solo elimina si el userId coincide (aislamiento multi-tenant).
   *
   * @param id - Identificador único de la transcripción.
   * @param userId - Identificador del usuario propietario.
   * @returns Una promesa que se resuelve cuando la eliminación se ha aplicado.
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Obtiene estadísticas de uso del usuario: suma de duration agrupada por type.
   * Los registros sin duration o con duration null se tratan como 0.
   *
   * @param userId - Identificador del usuario.
   * @returns Total de segundos por tipo (batch, realtime).
   */
  getStatsByUserId(
    userId: string
  ): Promise<{ totalBatchSeconds: number; totalRealtimeSeconds: number }>;
}
