import { applyDecorators, UseFilters, UseGuards } from '@nestjs/common';

import { AppErrorFilter } from '@/core/filters/app-error.filter';
import { PersonGuard } from '@/core/guards/person.guard';
import { SameOriginGuard } from '@/core/guards/same-origin.guard';
import { Public } from '@/core/guards/service-key.guard';

/// A controller the browser and agents call: they have no service key, and are checked as the person they are
export const ForPeople = () => applyDecorators(Public(), UseGuards(PersonGuard), UseFilters(AppErrorFilter));

/// A controller the app's pages call before anyone is signed in, such as signing in itself
export const ForTheApp = () => applyDecorators(Public(), UseGuards(SameOriginGuard), UseFilters(AppErrorFilter));
