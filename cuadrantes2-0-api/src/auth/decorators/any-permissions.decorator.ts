import { SetMetadata } from '@nestjs/common';

export const ANY_PERMISSIONS_KEY = 'any_permissions';
export const HasAnyPermission = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
