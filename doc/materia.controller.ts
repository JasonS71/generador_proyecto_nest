import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MateriasService } from './materia.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('materias')
export class MateriasController {
  constructor(private readonly materiasService: MateriasService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.materiasService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materiasService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Get('programa/:id_programa')
  findByPrograma(@Param('id_programa') id_programa: string) {
    return this.materiasService.findByPrograma(+id_programa);
  }

  @UseGuards(AuthGuard)
  @Get('programa/:id_programa/contenido')
  findByProgramaWithContenido(@Param('id_programa') id_programa: string) {
    return this.materiasService.findByProgramaWithContenido(+id_programa);
  }
}
