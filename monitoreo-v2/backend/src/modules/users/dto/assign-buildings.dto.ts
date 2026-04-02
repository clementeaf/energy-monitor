import { IsUUID } from 'class-validator';

export class AssignBuildingsDto {
  @IsUUID(undefined, { each: true })
  buildingIds!: string[];
}
