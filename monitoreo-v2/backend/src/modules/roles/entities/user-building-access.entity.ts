import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_building_access')
export class UserBuildingAccess {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ name: 'building_id' })
  buildingId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
