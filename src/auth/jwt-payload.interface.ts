export interface JwtPayload {
  sub: string;
  isSuperAdmin: boolean;
  permissions: string[];
}
