import { IsArray, IsUUID } from 'class-validator';

export class AssignPermissionsDto {
  /** Full list of permission IDs to assign (replaces existing). */
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}
