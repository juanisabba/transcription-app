import { User } from '../../domain/entities/User';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';

/**
 * In-memory implementation of IUserRepository for local development.
 *
 * Uses module-level Maps so the same instance is shared across handlers
 * (e.g. RegisterHandler and LoginHandler in serverless-offline).
 */
export class InMemoryUserRepository implements IUserRepository {
  private readonly usersById = new Map<string, User>();
  private readonly usersByEmail = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    await Promise.resolve();
    return this.usersByEmail.get(email.toLowerCase()) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    await Promise.resolve();
    return this.usersById.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    await Promise.resolve();
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email.toLowerCase(), user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await Promise.resolve();
    const user = this.usersById.get(id);
    if (user) {
      this.usersById.set(id, user);
      this.usersByEmail.set(user.email.toLowerCase(), user);
    }
  }
}

/** Shared instance for local development. */
export const inMemoryUserRepository = new InMemoryUserRepository();
