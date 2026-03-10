import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserSite } from './user-site.entity';
import { RolesService, isGlobalSiteAccessRole } from '../roles/roles.service';

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  roleId: number;
  role: string;
  roleLabel: string;
  provider: 'microsoft' | 'google' | null;
  isActive: boolean;
  siteIds: string[];
  invitationStatus: 'invited' | 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInvitationInput {
  email: string;
  name: string;
  roleId: number;
  siteIds: string[];
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserSite)
    private readonly siteRepo: Repository<UserSite>,
    private readonly rolesService: RolesService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  findByExternalId(provider: string, externalId: string) {
    return this.userRepo.findOne({
      where: { provider, externalId },
      relations: ['role'],
    });
  }

  findByEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);

    return this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();
  }

  async bindIdentityFromLogin(data: {
    externalId: string;
    provider: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const normalizedEmail = this.normalizeEmail(data.email);
    let existing = await this.findByExternalId(data.provider, data.externalId);

    existing ??= await this.findByEmail(normalizedEmail);

    if (!existing) {
      return null;
    }

    if (existing.externalId && existing.externalId !== data.externalId) {
      return null;
    }

    if (existing.provider && existing.provider !== data.provider) {
      return null;
    }

    existing.externalId = data.externalId;
    existing.provider = data.provider;
    existing.email = normalizedEmail;
    existing.name = data.name;
    existing.avatarUrl = data.avatarUrl ?? existing.avatarUrl;
    existing.updatedAt = new Date();

    return this.userRepo.save(existing);
  }

  async getSiteIds(userId: string): Promise<string[]> {
    const sites = await this.siteRepo.findBy({ userId });
    return sites.map((s) => s.siteId);
  }

  async listAdminUsers(): Promise<AdminUserSummary[]> {
    const users = await this.userRepo.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });

    return this.mapAdminUsers(users);
  }

  async createInvitation(data: CreateUserInvitationInput): Promise<AdminUserSummary> {
    const normalizedEmail = this.normalizeEmail(data.email);
    const existing = await this.findByEmail(normalizedEmail);

    if (existing) {
      throw new ConflictException('User access record already exists for this email');
    }

    const role = await this.rolesService.findById(data.roleId);
    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    const normalizedSiteIds = [...new Set(data.siteIds.map((siteId) => siteId.trim()).filter(Boolean))];
    if (!isGlobalSiteAccessRole(role.name) && normalizedSiteIds.length === 0) {
      throw new BadRequestException('Selected role requires at least one site');
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        externalId: null,
        provider: null,
        email: normalizedEmail,
        name: data.name.trim(),
        avatarUrl: null,
        roleId: data.roleId,
        isActive: data.isActive ?? true,
      }),
    );

    await this.replaceSites(user.id, normalizedSiteIds);

    const savedUser = await this.userRepo.findOne({
      where: { id: user.id },
      relations: ['role'],
    });

    return (await this.mapAdminUsers(savedUser ? [savedUser] : []))[0];
  }

  private async replaceSites(userId: string, siteIds: string[]) {
    await this.siteRepo.delete({ userId });

    if (siteIds.length === 0) {
      return;
    }

    await this.siteRepo.save(
      siteIds.map((siteId) =>
        this.siteRepo.create({
          userId,
          siteId,
        }),
      ),
    );
  }

  private async mapAdminUsers(users: User[]): Promise<AdminUserSummary[]> {
    if (users.length === 0) {
      return [];
    }

    const userIds = users.map((user) => user.id);
    const userSites = await this.siteRepo.findBy({ userId: In(userIds) });
    const siteMap = new Map<string, string[]>();

    for (const site of userSites) {
      const current = siteMap.get(site.userId) ?? [];
      current.push(site.siteId);
      siteMap.set(site.userId, current);
    }

    return users.map((user) => {
      let invitationStatus: AdminUserSummary['invitationStatus'];

      if (!user.isActive) {
        invitationStatus = 'disabled';
      } else if (user.externalId) {
        invitationStatus = 'active';
      } else {
        invitationStatus = 'invited';
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        role: user.role.name,
        roleLabel: user.role.labelEs,
        provider: (user.provider as 'microsoft' | 'google' | null) ?? null,
        isActive: user.isActive,
        siteIds: siteMap.get(user.id) ?? [],
        invitationStatus,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    });
  }
}
