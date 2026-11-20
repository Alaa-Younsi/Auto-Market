// Editor-only shims: Supabase runs these functions on Deno, but the editor
// type-checks them with the project's TypeScript. Not deployed, not imported.
declare namespace Deno {
  export const env: { get(key: string): string | undefined };
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "jsr:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
