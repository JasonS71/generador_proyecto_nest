import { Module } from '@nestjs/common';
import { UniversidadesService } from './universidades.service';
import { UniversidadesController } from './universidades.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UniversidadesController],
  providers: [UniversidadesService],
  exports: [UniversidadesService],
})
export class UniversidadesModule {}