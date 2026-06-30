 import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Permet à ton front de communiquer avec ton serveur de clés
  app.enableCors();
  await app.listen(3000);
  console.log('🛡️ Serveur Cyber NestJS lancé sur le port 3000');
}
bootstrap();