export interface JwtPayload {
  sub: number;
  isSuperAdmin: boolean;
  permissions: string[];
}
