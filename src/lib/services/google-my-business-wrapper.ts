import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { GoogleMyBusinessService, type GoogleToken } from './google-my-business';

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_MY_BUSINESS_SCOPE = "https://www.googleapis.com/auth/business.manage";

interface WrapperConfig {
  clientId?: string;
  clientSecret?: string;
  encryptionKey?: string;
}

export class GoogleMyBusinessWrapper {
  constructor(
    private supabase: SupabaseClient | null,
    private config?: WrapperConfig
  ) {}

  private getEncryptionKey(): string {
    const key = this.config?.encryptionKey || process.env.TOKEN_ENCRYPTION_KEY || 'your-32-character-encryption-key';
    if (!key || key === 'your-32-character-encryption-key') {
      console.warn('WARNING: Using default encryption key. Set TOKEN_ENCRYPTION_KEY environment variable for production!');
    }
    // Ensure key is 32 bytes for AES-256
    return key.padEnd(32, '0').slice(0, 32);
  }

  private encrypt(text: string): string {
    const encryptionKey = this.getEncryptionKey();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'utf8'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const encryptionKey = this.getEncryptionKey();

    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'utf8'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const clientId = this.config?.clientId;
    if (!clientId) {
      throw new Error('Google client ID not configured');
    }
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: `openid email profile ${GOOGLE_MY_BUSINESS_SCOPE}`,
      access_type: 'offline',
      prompt: 'consent', // Force to get refresh token
      state,
    });

    return `${GOOGLE_OAUTH_URL}?${params}`;
  }

  async handleOAuthCallback(code: string, organizationId: string, userId: string, redirectUri: string): Promise<void> {
    if (!this.config?.clientId || !this.config?.clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    if (!this.supabase) {
      throw new Error('Supabase client required for token storage');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('No tokens received from Google');
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = this.encrypt(tokens.access_token);
    const encryptedRefreshToken = this.encrypt(tokens.refresh_token);

    // Store encrypted tokens in database
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error } = await this.supabase
      .from('google_tokens')
      .upsert({
        organization_id: organizationId,
        user_id: userId,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      throw error;
    }
  }

  async hasValidToken(organizationId: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    const { data, error } = await this.supabase
      .from('google_tokens')
      .select('expires_at')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return false;
    }

    // Check if token is expired
    const expiresAt = new Date(data.expires_at);
    return expiresAt > new Date();
  }

  async getTokens(organizationId: string): Promise<GoogleToken | null> {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('google_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    try {
      // Decrypt tokens
      const accessToken = this.decrypt(data.access_token);
      const refreshToken = this.decrypt(data.refresh_token);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: data.expires_at,
      };
    } catch (err) {
      console.error('Error decrypting tokens:', err);
      return null;
    }
  }

  async updateAccessToken(organizationId: string, accessToken: string, expiresAt: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client required');
    }

    const encryptedAccessToken = this.encrypt(accessToken);

    const { error } = await this.supabase
      .from('google_tokens')
      .update({
        access_token: encryptedAccessToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);

    if (error) {
      throw error;
    }
  }

  async createService(organizationId: string): Promise<GoogleMyBusinessService | null> {
    const tokens = await this.getTokens(organizationId);
    if (!tokens) {
      return null;
    }

    // Create service with token refresh callback
    return new GoogleMyBusinessService(
      tokens.access_token,
      tokens.refresh_token,
      async (newTokens) => {
        await this.updateAccessToken(organizationId, newTokens.access_token, newTokens.expires_at);
      },
      {
        clientId: this.config?.clientId || '',
        clientSecret: this.config?.clientSecret || ''
      }
    );
  }

  async listAccounts(organizationId: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.getAccounts();
  }

  async listLocations(organizationId: string, accountId: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.getLocations(accountId);
  }

  async getReviews(organizationId: string, accountId: string, locationId: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.getReviews(accountId, locationId);
  }

  async getAllAccessibleLocations(organizationId: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.getAllAccessibleLocations();
  }

  async getInvitations(organizationId: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.getInvitations();
  }

  async acceptInvitation(organizationId: string, invitationName: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.acceptInvitation(invitationName);
  }

  async getAllReviews(organizationId: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.getAllReviews();
  }

  async getReviewsByLocationName(organizationId: string, locationName: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.getReviewsByLocationName(locationName);
  }

  async replyToReviewByName(organizationId: string, reviewName: string, comment: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.replyToReviewByName(reviewName, comment);
  }

  async deleteReviewReplyByName(organizationId: string, reviewName: string) {
    const service = await this.createService(organizationId);
    if (!service) {
      throw new Error('No Google connection found');
    }

    return service.deleteReviewReplyByName(reviewName);
  }

  async revokeToken(organizationId: string): Promise<void> {
    const tokens = await this.getTokens(organizationId);
    if (!tokens) {
      return;
    }

    // Revoke the token with Google
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Error revoking token with Google:', err);
    }

    if (!this.supabase) {
      throw new Error('Supabase client required');
    }

    // Delete from database
    const { error } = await this.supabase
      .from('google_tokens')
      .delete()
      .eq('organization_id', organizationId);

    if (error) {
      throw error;
    }
  }
}