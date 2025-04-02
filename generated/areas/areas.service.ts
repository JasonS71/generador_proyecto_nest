import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Areas } from './areas.entity';

@Injectable()
export class AreasService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll(): Promise<Areas[]> {
    return this.prismaService.areas.findMany();
  }

  findOne(id: number): Promise<Areas> {
    return this.prismaService.areas.findUnique({
      where: { id: id },
    });
  }

  findByPrograma(id_programa: number): Promise<Areas[]> {
    return this.prismaService.areas.findMany({
      where: { id_programa: id_programa },
    });
  }

  findByProgramaWithContenido(id_programa: number): Promise<Areas[]> {
    return this.prismaService.areas.findMany({
      where: { id_programa: id_programa },
      include: {
        contenidos: true,
      },
    });
  }
}