import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ConfiguracionesService } from './configuraciones.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('configuraciones')
export class ConfiguracionesController {
  constructor(private readonly configuracionesService: ConfiguracionesService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.configuracionesService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.configuracionesService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Get('programa/:id_programa')
  findByPrograma(@Param('id_programa') id_programa: string) {
    return this.configuracionesService.findByPrograma(+id_programa);
  }

  @UseGuards(AuthGuard)
  @Get('programa/:id_programa/contenido')
  findByProgramaWithContenido(@Param('id_programa') id_programa: string) {
    return this.configuracionesService.findByProgramaWithContenido(+id_programa);
  }
}