import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  accentColor: string;
  appTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface OnboardingResult {
  tenant: Tenant;
  adminUserId: string;
  rolesCreated: number;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
    private readonly dataSource: DataSource,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Read                                                               */
  /* ------------------------------------------------------------------ */

  async findAll(): Promise<Tenant[]> {
    return this.repo.find({ order: { name: 'ASC' } });
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

  async getTheme(tenantId: string): Promise<TenantTheme> {
    const tenant = await this.findById(tenantId);
    return {
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      sidebarColor: tenant.sidebarColor,
      accentColor: tenant.accentColor,
      appTitle: tenant.appTitle,
      logoUrl: tenant.logoUrl,
      faviconUrl: tenant.faviconUrl,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Create (onboarding)                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Onboard a new tenant: create tenant + clone standard roles + create first admin user.
   * Runs in a transaction — all or nothing.
   */
  async onboard(dto: CreateTenantDto): Promise<OnboardingResult> {
    const slug = dto.slug ?? this.slugify(dto.name);

    const existing = await this.repo.findOneBy({ slug });
    if (existing) throw new ConflictException(`Tenant slug '${slug}' already exists`);

    const existingName = await this.repo.findOneBy({ name: dto.name });
    if (existingName) throw new ConflictException(`Tenant name '${dto.name}' already exists`);

    return this.dataSource.transaction(async (manager) => {
      // 1. Create tenant
      const tenant = manager.create(Tenant, {
        name: dto.name,
        slug,
        primaryColor: dto.primaryColor ?? '#3D3BF3',
        secondaryColor: dto.secondaryColor ?? '#1E1E2F',
        sidebarColor: dto.sidebarColor ?? '#1E1E2F',
        accentColor: dto.accentColor ?? '#10B981',
        appTitle: dto.appTitle ?? 'Energy Monitor',
        logoUrl: dto.logoUrl ?? null,
        faviconUrl: dto.faviconUrl ?? null,
        timezone: dto.timezone ?? 'America/Santiago',
        address: dto.address ?? null,
        addressDetail: dto.addressDetail ?? null,
        phone: dto.phone ?? null,
        taxId: dto.taxId ?? null,
        settings: dto.settings ?? {},
        isActive: true,
      });
      const savedTenant = await manager.save(Tenant, tenant);

      // 2. Clone standard roles from the first active tenant (template)
      const rolesCreated = await this.cloneRoles(manager, savedTenant.id);

      // 3. Get the super_admin role for this new tenant
      const [adminRole] = await manager.query(
        `SELECT id FROM roles WHERE tenant_id = $1 AND slug = 'super_admin' LIMIT 1`,
        [savedTenant.id],
      );

      // 4. Create first admin user
      const [adminUser] = await manager.query(
        `INSERT INTO users (tenant_id, email, display_name, auth_provider, auth_provider_id, role_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [
          savedTenant.id,
          dto.adminEmail,
          dto.adminDisplayName ?? dto.adminEmail,
          dto.adminAuthProvider,
          `${dto.adminAuthProvider}-onboard`,
          adminRole.id,
        ],
      );

      return {
        tenant: savedTenant,
        adminUserId: adminUser.id,
        rolesCreated,
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Update                                                             */
  /* ------------------------------------------------------------------ */

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant | null> {
    const row = await this.repo.findOneBy({ id });
    if (!row) return null;

    if (dto.name !== undefined) row.name = dto.name;
    if (dto.primaryColor !== undefined) row.primaryColor = dto.primaryColor;
    if (dto.secondaryColor !== undefined) row.secondaryColor = dto.secondaryColor;
    if (dto.sidebarColor !== undefined) row.sidebarColor = dto.sidebarColor;
    if (dto.accentColor !== undefined) row.accentColor = dto.accentColor;
    if (dto.appTitle !== undefined) row.appTitle = dto.appTitle;
    if (dto.logoUrl !== undefined) row.logoUrl = dto.logoUrl;
    if (dto.faviconUrl !== undefined) row.faviconUrl = dto.faviconUrl;
    if (dto.timezone !== undefined) row.timezone = dto.timezone;
    if (dto.address !== undefined) row.address = dto.address;
    if (dto.addressDetail !== undefined) row.addressDetail = dto.addressDetail;
    if (dto.phone !== undefined) row.phone = dto.phone;
    if (dto.taxId !== undefined) row.taxId = dto.taxId;
    if (dto.settings !== undefined) row.settings = dto.settings;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;

    return this.repo.save(row);
  }

  /* ------------------------------------------------------------------ */
  /*  Delete (soft)                                                      */
  /* ------------------------------------------------------------------ */

  async deactivate(id: string): Promise<boolean> {
    const result = await this.repo.update(id, { isActive: false });
    return (result.affected ?? 0) > 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-)|(-$)/g, '');
  }

  /**
   * Clone the 7 standard roles + permissions from the first existing tenant.
   * Returns number of roles created.
   */
  private async cloneRoles(
    manager: import('typeorm').EntityManager,
    newTenantId: string,
  ): Promise<number> {
    // Get template tenant (first by created_at)
    const [template] = await manager.query(
      `SELECT id FROM tenants WHERE id != $1 ORDER BY created_at ASC LIMIT 1`,
      [newTenantId],
    );

    if (!template) {
      // First tenant ever — no template, just create super_admin
      await manager.query(
        `INSERT INTO roles (tenant_id, name, slug, description, max_session_minutes, is_default, hierarchy_level)
         VALUES ($1, 'Super Admin', 'super_admin', 'Platform administrator', 30, false, 0)`,
        [newTenantId],
      );
      return 1;
    }

    // Clone roles
    const result = await manager.query(
      `INSERT INTO roles (tenant_id, name, slug, description, max_session_minutes, is_default, hierarchy_level)
       SELECT $1, name, slug, description, max_session_minutes, is_default, hierarchy_level
       FROM roles WHERE tenant_id = $2 AND is_active = true
       RETURNING id, slug`,
      [newTenantId, template.id],
    );

    // Build slug→newId map
    const slugToNewId = new Map<string, string>();
    for (const r of result) {
      slugToNewId.set(r.slug, r.id);
    }

    // Clone role_permissions using old role slug → new role id
    const templateRoles: Array<{ id: string; slug: string }> = await manager.query(
      `SELECT id, slug FROM roles WHERE tenant_id = $1 AND is_active = true`,
      [template.id],
    );

    for (const tr of templateRoles) {
      const newRoleId = slugToNewId.get(tr.slug);
      if (!newRoleId) continue;

      await manager.query(
        `INSERT INTO role_permissions (role_id, permission_id, access_level)
         SELECT $1, permission_id, access_level
         FROM role_permissions WHERE role_id = $2`,
        [newRoleId, tr.id],
      );
    }

    // Enforce: operator role must never have billing permissions
    const operatorRoleId = slugToNewId.get('operator');
    if (operatorRoleId) {
      await manager.query(
        `DELETE FROM role_permissions
         WHERE role_id = $1
           AND permission_id IN (SELECT id FROM permissions WHERE module = 'billing')`,
        [operatorRoleId],
      );
    }

    return result.length;
  }
}
