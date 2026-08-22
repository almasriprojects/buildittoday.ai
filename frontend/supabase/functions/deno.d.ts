// Ambient type declarations for Deno edge functions.
// This file exists so the TypeScript language server in the editor
// understands Deno globals and npm: imports without a real Deno runtime.

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
  };
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "npm:@supabase/supabase-js@2" {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>
  ): any;
}