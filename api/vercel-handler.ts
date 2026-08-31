import { app } from '../server/app'

const handle = (request: Request) => app.fetch(request)

export const GET = handle
export const HEAD = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
