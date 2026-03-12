import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { UsersService } from '../users/users.service';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { IssueTokenDto } from './dto/issue-token.dto';
import { Session } from './entities/session.entity';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('session')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
  ) {}

  @Post('issue-token')
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({
    summary: 'Emitir token de sesión',
    description: 'Genera un token de sesión para el usuario indicado. Permite consumir la API con Bearer <token> sin OAuth. Requiere ADMIN_USERS.view.',
  })
  @ApiBody({ type: IssueTokenDto })
  @ApiCreatedResponse({ description: 'Token generado' })
  async issueToken(@Body() dto: IssueTokenDto): Promise<{ token: string; expiresAt: string }> {
    const user = await this.usersService.findById(dto.userId);
    if (!user) throw new BadRequestException('Usuario no encontrado');
    const { token, expiresAt } = await this.sessionService.issueToken(
      dto.userId,
      dto.expiresInDays,
    );
    return { token, expiresAt: expiresAt.toISOString() };
  }

  @Post()
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({ summary: 'Crear sesión', description: 'Crea una sesión (token) para consumo API. Requiere ADMIN_USERS.view.' })
  @ApiBody({ type: CreateSessionDto })
  @ApiCreatedResponse({ description: 'Sesión creada', type: Session })
  create(@Body() createSessionDto: CreateSessionDto): Promise<Session> {
    return this.sessionService.create(createSessionDto);
  }

  @Get()
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({ summary: 'Listar sesiones', description: 'Lista todas las sesiones. Requiere ADMIN_USERS.view.' })
  @ApiOkResponse({ description: 'Lista de sesiones', type: [Session] })
  findAll(): Promise<Session[]> {
    return this.sessionService.findAll();
  }

  @Get(':id')
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({ summary: 'Obtener sesión por ID' })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiOkResponse({ description: 'Sesión encontrada', type: Session })
  async findOne(@Param('id') id: string): Promise<Session> {
    const session = await this.sessionService.findOne(id);
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return session;
  }

  @Patch(':id')
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({ summary: 'Actualizar sesión' })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiBody({ type: UpdateSessionDto })
  @ApiOkResponse({ description: 'Sesión actualizada', type: Session })
  update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto): Promise<Session> {
    return this.sessionService.update(id, updateSessionDto);
  }

  @Delete(':id')
  @RequirePermissions('ADMIN_USERS', 'view')
  @ApiOperation({ summary: 'Eliminar sesión' })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiOkResponse({ description: 'Sesión eliminada' })
  remove(@Param('id') id: string): Promise<void> {
    return this.sessionService.remove(id);
  }
}
