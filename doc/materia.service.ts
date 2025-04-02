import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Materia } from './entities/materia.entity';

@Injectable()
export class MateriasService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll(): Promise<Materia[]> {
    return this.prismaService.materia.findMany();
  }

  findOne(id: number): Promise<Materia> {
    return this.prismaService.materia.findUnique({
      where: { id: id },
    });
  }

  findByPrograma(id_programa: number): Promise<Materia[]> {
    return this.prismaService.materia.findMany({
      where: { id_programa: id_programa },
    });
  }

  findByProgramaWithContenido(id_programa: number): Promise<Materia[]> {
    return this.prismaService.materia.findMany({
      where: { id_programa: id_programa },
      include: {
        contenidos: true,
      },
    });
  }
}
