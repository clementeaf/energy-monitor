import { PartialType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';

/**
 * DTO para actualizar una sesión (todos los campos opcionales).
 */
export class UpdateSessionDto extends PartialType(CreateSessionDto) {}
