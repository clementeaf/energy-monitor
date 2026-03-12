import { createHash, randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session } from './entities/session.entity';

const SESSION_TOKEN_BYTES = 32;
const DEFAULT_EXPIRES_DAYS = 365;

function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

/**
 * Servicio CRUD de sesiones (auth). Gestiona tokens/sesiones para consumo API.
 */
@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  /** Hash de un token en claro (mismo algoritmo que al guardar). */
  hashToken(plain: string): string {
    return hashToken(plain);
  }

  /**
   * Busca sesión válida por hash del token (expires_at > now).
   * @returns Sesión con relación user o null
   */
  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const now = new Date();
    return this.sessionRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    }).then((s) => (s && s.expiresAt > now ? s : null));
  }

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepo.create({
      userId: createSessionDto.userId,
      tokenHash: createSessionDto.tokenHash,
      expiresAt: new Date(createSessionDto.expiresAt),
    });
    return this.sessionRepo.save(session);
  }

  async findAll(): Promise<Session[]> {
    return this.sessionRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<Session | null> {
    return this.sessionRepo.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async update(id: string, updateSessionDto: UpdateSessionDto): Promise<Session> {
    const session = await this.findOne(id);
    if (!session) throw new NotFoundException('Sesión no encontrada');

    if (updateSessionDto.tokenHash != null) session.tokenHash = updateSessionDto.tokenHash;
    if (updateSessionDto.expiresAt != null) session.expiresAt = new Date(updateSessionDto.expiresAt);
    if (updateSessionDto.userId != null) session.userId = updateSessionDto.userId;

    return this.sessionRepo.save(session);
  }

  async remove(id: string): Promise<void> {
    const result = await this.sessionRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Sesión no encontrada');
  }

  /**
   * Genera un token de sesión para un usuario (consumo API sin OAuth).
   * @returns Token en claro y fecha de expiración
   */
  async issueToken(
    userId: string,
    expiresInDays: number = DEFAULT_EXPIRES_DAYS,
  ): Promise<{ token: string; expiresAt: Date }> {
    const plainToken = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.sessionRepo.save(
      this.sessionRepo.create({ userId, tokenHash, expiresAt }),
    );
    return { token: plainToken, expiresAt };
  }
}
