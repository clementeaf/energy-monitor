import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { OAuthClientsService } from './oauth-clients.service';
import { OAuthTokenDto } from './dto/oauth-token.dto';

@ApiTags('OAuth2 Token')
@Controller('oauth')
export class OAuthTokenController {
  constructor(private readonly oauthClientsService: OAuthClientsService) {}

  @Public()
  @Post('token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'OAuth2 client_credentials token endpoint' })
  @ApiResponse({ status: 200, description: 'Bearer access token with scoped permissions' })
  @ApiResponse({ status: 401, description: 'Invalid client credentials' })
  issueToken(@Body() dto: OAuthTokenDto) {
    return this.oauthClientsService.issueToken(dto.client_id, dto.client_secret);
  }
}
