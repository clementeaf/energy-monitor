import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OAuthClient } from './entities/oauth-client.entity';
import { OAuthClientsService } from './oauth-clients.service';
import { OAuthClientsController } from './oauth-clients.controller';
import { OAuthTokenController } from './oauth-token.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OAuthClient]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [OAuthClientsController, OAuthTokenController],
  providers: [OAuthClientsService],
  exports: [OAuthClientsService],
})
export class OAuthClientsModule {}
