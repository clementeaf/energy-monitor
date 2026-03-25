import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id, isActive: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { slug, isActive: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async getTheme(tenantId: string): Promise<{
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
    faviconUrl: string | null;
  }> {
    const tenant = await this.findById(tenantId);
    return {
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      logoUrl: tenant.logoUrl,
      faviconUrl: tenant.faviconUrl,
    };
  }
}
