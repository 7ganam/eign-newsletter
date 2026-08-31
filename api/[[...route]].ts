export const config = {
  runtime: 'nodejs',
}

export default async function handler(request: Request) {
  try {
    const { app } = await import('../server/app')
    return await app.fetch(request)
  } catch (error) {
    console.error('API handler failed to load', error)
    return Response.json({
      error: 'API handler failed to load',
      detail: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      cwd: process.cwd(),
    }, { status: 500 })
  }
}
