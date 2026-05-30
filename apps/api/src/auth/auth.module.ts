import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32) {
          if (config.get('NODE_ENV') === 'production') {
            throw new Error('JWT_SECRET must be set to a strong value (>=32 chars) in production');
          }
          // eslint-disable-next-line no-console
          console.warn('[auth] JWT_SECRET is unset or weak — using a random dev secret. Do NOT run this in production.');
        }
        return {
          secret: secret || require('crypto').randomBytes(48).toString('hex'),
          signOptions: {
            expiresIn: config.get('JWT_EXPIRES_IN') || '7d',
          },
        };
      },
      inject: [ConfigService],
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}