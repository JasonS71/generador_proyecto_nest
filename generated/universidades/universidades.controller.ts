import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UniversidadesService } from './universidades.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('universidades')
export class UniversidadesController {
  constructor(private readonly universidadesService: UniversidadesService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.universidadesService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.universidadesService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Get('programa/:id_programa')
  findByPrograma(@Param('id_programa') id_programa: string) {
    return this.universidadesService.findByPrograma(+id_programa);
  }

  @UseGuards(AuthGuard)
  @Get('programa/:id_programa/contenido')
  findByProgramaWithContenido(@Param('id_programa') id_programa: string) {
    return this.universidadesService.findByProgramaWithContenido(+id_programa);
  }
}