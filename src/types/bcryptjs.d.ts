declare module "bcryptjs" {
  export function hashSync(s: string, round?: number): string;
  export function compareSync(s: string, hash: string): boolean;
}
