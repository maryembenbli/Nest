export interface JwtPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  permissions: { module: string; action: string }[];
}
