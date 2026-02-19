import { IAuthService } from '../../ports/IAuthService';

/**
 * Use case responsible for handling user logout.
 *
 * With JWT-based authentication, logout does not require invalidating server-side
 * sessions because tokens are stateless and self-contained.
 */
export class LogoutUserUC {
  constructor(private authService: IAuthService) {}

  /**
   * Execute the logout process for the given user.
   *
   * JWT tokens are stateless. Logout is handled client-side by removing token
   * from localStorage.
   *
   * @param userId - Identifier of the user performing logout.
   * @returns A promise that resolves when the operation completes.
   */
  async execute(userId: string): Promise<void> {
    // JWT tokens are stateless. Logout is handled client-side by removing token from localStorage
    // Placeholder: we may log or persist logout events in the future.
    return;
  }
}
