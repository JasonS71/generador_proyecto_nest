import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AreasService } from './areas.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.areasService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.areasService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Get('programa/:id_programa')
  findByPrograma(@Param('id_programa') id_programa: string) {
    return this.areasService.findByPrograma(+id_programa);
  }

  @UseGuards(AuthGuard)
  @Get('programa/:id_programa/contenido')
  findByProgramaWithContenido(@Param('id_programa') id_programa: string) {
    return this.areasService.findByProgramaWithContenido(+id_programa);
  }
}