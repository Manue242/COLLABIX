 import { Controller, Post, Get, Body, HttpCode, HttpStatus, Request, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AppController {
  constructor(private readonly jwtService: JwtService) {}

  // 🚪 Route 1 : Authentification et génération du token éphémère (60 secondes)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    // Simulation d'identifiants pour le projet
    if (body.username === 'user' && body.password === 'password') {
      const payload = { username: body.username, role: 'premium' };
      return {
        access_token: await this.jwtService.signAsync(payload),
        expires_in: '60s'
      };
    }
    throw new UnauthorizedException('Identifiants invalides');
  }

  // 🔑 Route 2 : Distribution de la clé de déchiffrement (Sécurisée et limitée par le Rate-Limiting)
  @Get('video-key')
  async getVideoKey(@Request() req: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant ou invalide');
    }

    const token = authHeader.split(' ')[1];
    try {
      // Vérification de la validité et de l'expiration du jeton
      const payload = await this.jwtService.verifyAsync(token, {
        secret: 'SECRET_KEY_HACKATHON_2026'
      });
      
      return { 
        key: 'AES_KEY_EXTREMEMENT_SECURISEE_XYZ', 
        user: payload.username 
      };
    } catch {
      throw new UnauthorizedException('Token expiré ou corrompu');
    }
  }
}