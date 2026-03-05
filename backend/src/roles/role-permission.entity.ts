import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'smallint' })
  roleId!: number;

  @PrimaryColumn({ name: 'module_id', type: 'smallint' })
  moduleId!: number;

  @PrimaryColumn({ name: 'action_id', type: 'smallint' })
  actionId!: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
