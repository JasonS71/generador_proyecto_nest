import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Configuraciones } from './configuraciones.entity';

@Injectable()
export class ConfiguracionesService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll(): Promise<Configuraciones[]> {
    return this.prismaService.configuraciones.findMany();
  }

  findOne(id: number): Promise<Configuraciones> {
    return this.prismaService.configuraciones.findUnique({
      where: { id: id },
    });
  }

  findByPrograma(id_programa: number): Promise<Configuraciones[]> {
    return this.prismaService.configuraciones.findMany({
      where: { id_programa: id_programa },
    });
  }

  findByProgramaWithContenido(id_programa: number): Promise<Configuraciones[]> {
    return this.prismaService.configuraciones.findMany({
      where: { id_programa: id_programa },
      include: {
        contenidos: true,
      },
    });
  }
}