import { handle } from 'hono/vercel'
import { app } from '../server'

export const config = {
  runtime: 'nodejs',
}

export default handle(app)
