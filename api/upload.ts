// This API route is not used in the client-side preview.
// Logic has been moved to services/storage.ts
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  return new Response('Not implemented', { status: 501 });
}