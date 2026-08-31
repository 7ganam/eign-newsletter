import { app } from '../server'

export const config = {
  runtime: 'nodejs',
}

export default async function handler(request: Request) {
  return app.fetch(request)
}
