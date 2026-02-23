import type { User } from "../entities/User";

/**
 * Puerto del dominio para la persistencia de usuarios.
 */
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
}
