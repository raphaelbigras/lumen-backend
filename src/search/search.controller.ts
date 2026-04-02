import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';
import { searchQuerySchema } from './schemas/search-query.schema';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  search(@Query() query: unknown) {
    const { q } = searchQuerySchema.parse(query);
    return this.searchService.search(q);
  }
}
