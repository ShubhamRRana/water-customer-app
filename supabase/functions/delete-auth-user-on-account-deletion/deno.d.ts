/** Deno namespace declarations for Supabase Edge Functions */
declare namespace Deno {
  function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
  const env: {
    get(key: string): string | undefined;
  };
}
