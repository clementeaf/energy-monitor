import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserSite } from './user-site.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserSite)
    private readonly siteRepo: Repository<UserSite>,
  ) {}

  findByExternalId(provider: string, externalId: string) {
    return this.userRepo.findOne({
      where: { provider, externalId },
      relations: ['role'],
    });
  }

  async upsert(data: {
    externalId: string;
    provider: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const existing = await this.userRepo.findOneBy({
      provider: data.provider,
      externalId: data.externalId,
    });

    if (existing) {
      existing.email = data.email;
      existing.name = data.name;
      existing.avatarUrl = data.avatarUrl ?? existing.avatarUrl;
      existing.updatedAt = new Date();
      return this.userRepo.save(existing);
    }

    return this.userRepo.save(
      this.userRepo.create({
        externalId: data.externalId,
        provider: data.provider,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl ?? null,
      }),
    );
  }

  async getSiteIds(userId: string): Promise<string[]> {
    const sites = await this.siteRepo.findBy({ userId });
    return sites.map((s) => s.siteId);
  }
}
