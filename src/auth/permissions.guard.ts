import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithUser } from '../auth/request-with-user.interface';

const MODULE_ALIASES: Record<string, string[]> = {
  orders: ['orders', 'order', 'commande', 'commandes'],
  products: ['products', 'product', 'produit', 'produits'],
  categories: ['categories', 'category', 'categorie', 'categories'],
  admins: ['admins', 'admin', 'users', 'utilisateur', 'utilisateurs', 'staff'],
  permissions: ['permissions', 'permission'],
  dashboard: ['dashboard', 'dashboards', 'stats', 'statistique', 'statistiques'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private normalize(value: string) {
    return value.trim().toLowerCase();
  }

  private moduleMatches(actualModule: string, requiredModule: string) {
    const normalizedActual = this.normalize(actualModule);
    const normalizedRequired = this.normalize(requiredModule);
    const aliases = MODULE_ALIASES[normalizedRequired] || [normalizedRequired];
    return aliases.includes(normalizedActual);
  }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<{ module: string; action: string }>(
      'permissions',
      context.getHandler(),
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Super admin accès total
    if (user.isSuperAdmin) return true;

    if (!user.permissions) return false;

    const hasPermission = user.permissions.some(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (p: any) =>
        typeof p?.module === 'string' &&
        typeof p?.action === 'string' &&
        this.moduleMatches(p.module, required.module) &&
        this.normalize(p.action) === this.normalize(required.action),
    );

    return hasPermission;
  }
}
