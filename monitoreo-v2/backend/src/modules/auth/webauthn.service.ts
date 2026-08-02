import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  generateRegistrationOptions as genRegOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions as genAuthOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server/script/deps';

interface DbCredential {
  credential_id: string;
  public_key: Buffer;
  counter: number;
  transports: string[];
}

@Injectable()
export class WebAuthnService {
  private readonly logger = new Logger(WebAuthnService.name);
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly origin: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.rpName = this.configService.get('WEBAUTHN_RP_NAME') ?? 'Energy Monitor';
    this.rpID = this.configService.get('WEBAUTHN_RP_ID') ?? 'localhost';
    this.origin = this.configService.get('WEBAUTHN_ORIGIN') ?? 'http://localhost:5173';
  }

  async generateRegistrationOptions(
    userId: string,
    userEmail: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const existing = await this.dataSource.query<{ credential_id: string; transports: string[] }[]>(
      `SELECT credential_id, transports FROM user_credentials WHERE user_id = $1`,
      [userId],
    );

    return genRegOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: userEmail,
      userDisplayName: userEmail,
      excludeCredentials: existing.map((c) => ({
        id: c.credential_id,
        transports: c.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  async verifyAndSaveRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    deviceName?: string,
  ): Promise<{ credentialId: string }> {
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
      });
    } catch (err) {
      this.logger.warn(`WebAuthn registration verification failed for user ${userId}: ${err}`);
      throw new BadRequestException('Verificación de passkey falló');
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Verificación de passkey falló');
    }

    const { credential } = verification.registrationInfo;

    await this.dataSource.query(
      `INSERT INTO user_credentials (user_id, credential_id, public_key, counter, transports, device_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        credential.id,
        Buffer.from(credential.publicKey),
        credential.counter,
        response.response.transports ?? [],
        deviceName ?? null,
      ],
    );

    this.logger.log(`WebAuthn credential registered for user ${userId}`);
    return { credentialId: credential.id };
  }

  async generateAuthenticationOptions(
    userId: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const creds = await this.dataSource.query<{ credential_id: string; transports: string[] }[]>(
      `SELECT credential_id, transports FROM user_credentials WHERE user_id = $1`,
      [userId],
    );

    return genAuthOptions({
      rpID: this.rpID,
      allowCredentials: creds.map((c) => ({
        id: c.credential_id,
        transports: c.transports as AuthenticatorTransportFuture[],
      })),
      userVerification: 'preferred',
    });
  }

  async verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
  ): Promise<boolean> {
    const rows = await this.dataSource.query<DbCredential[]>(
      `SELECT credential_id, public_key, counter, transports FROM user_credentials
       WHERE user_id = $1 AND credential_id = $2`,
      [userId, response.id],
    );

    if (rows.length === 0) {
      throw new BadRequestException('Credencial no encontrada');
    }

    const cred = rows[0];

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: cred.credential_id,
          publicKey: new Uint8Array(cred.public_key),
          counter: cred.counter,
          transports: cred.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (err) {
      this.logger.warn(`WebAuthn auth verification failed for user ${userId}: ${err}`);
      return false;
    }

    if (verification.verified) {
      await this.dataSource.query(
        `UPDATE user_credentials SET counter = $1 WHERE credential_id = $2 AND user_id = $3`,
        [verification.authenticationInfo.newCounter, response.id, userId],
      );
    }

    return verification.verified;
  }

  async getUserCredentials(userId: string) {
    return this.dataSource.query<{ id: string; credential_id: string; device_name: string | null; created_at: string }[]>(
      `SELECT id, credential_id, device_name, created_at FROM user_credentials WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
  }

  async deleteCredential(credentialId: string, userId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM user_credentials WHERE id = $1 AND user_id = $2`,
      [credentialId, userId],
    );
  }

  async hasCredentials(userId: string): Promise<boolean> {
    const rows = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text as count FROM user_credentials WHERE user_id = $1`,
      [userId],
    );
    return parseInt(rows[0]?.count ?? '0', 10) > 0;
  }
}
