import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Universidades } from './universidades.entity';

@Injectable()
export class UniversidadesService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll(): Promise<Universidades[]> {
    return this.prismaService.universidades.findMany();
  }

  findOne(id: number): Promise<Universidades> {
    return this.prismaService.universidades.findUnique({
      where: { id: id },
    });
  }

  findByPrograma(id_programa: number): Promise<Universidades[]> {
    return this.prismaService.universidades.findMany({
      where: { id_programa: id_programa },
    });
  }

  findByProgramaWithContenido(id_programa: number): Promise<Universidades[]> {
    return this.prismaService.universidades.findMany({
      where: { id_programa: id_programa },
      include: {
        contenidos: true,
      },
    });
  }
}