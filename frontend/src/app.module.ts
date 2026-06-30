 

import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';

@Module({
  imports: [
    // 🛡️ Bouclier 1 : Anti-scraping
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    
    // 🔑 Bouclier 2 : Distribution de jetons éphémères
    JwtModule.register({
      secret: 'SECRET_KEY_HACKATHON_2026',
      signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [AppController], 
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}