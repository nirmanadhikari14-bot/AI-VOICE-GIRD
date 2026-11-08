import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { LoginResponseSchema, UserProfileSchema } from '../api/contracts/schemas';
import { sessionService } from './sessionService';
import { UserProfile, AuthTokens } from '../types';

export class AuthService {
  async login(username: string, password: string):Promise<{ tokens: AuthTokens; user: UserProfile }> {
    // FastAPI OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
    const rawTokens = await apiClient.post<AuthTokens>(
      ENDPOINTS.LOGIN,
      { username, password },
      { requiresAuth: false, isFormUrlEncoded: true }
    );

    const validatedTokens = LoginResponseSchema.parse(rawTokens);
    await sessionService.saveTokens(validatedTokens);

    // Fetch user profile
    const rawProfile = await apiClient.get<UserProfile>(ENDPOINTS.ME);
    const user = UserProfileSchema.parse(rawProfile);

    return { tokens: validatedTokens, user };
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const token = await sessionService.getAccessToken();
    if (!token) return null;

    try {
      const rawProfile = await apiClient.get<UserProfile>(ENDPOINTS.ME);
      return UserProfileSchema.parse(rawProfile);
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    await sessionService.clearSession();
  }
}

export const authService = new AuthService();
