import prisma from '../db.server'
import { authenticate } from '../shopify.server'

export const loader = async ({ request }) => {
  // Admin authenticated endpoint to inspect recent events
  await authenticate.admin(request)
  const url = new URL(request.url)
  const testId = url.searchParams.get('testId') || undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)

  const where = testId ? { testId } : {}
  const events = await prisma.event.findMany({
    where,
    orderBy: { ts: 'desc' },
    take: limit,
  })

  return new Response(JSON.stringify({ events }), { status: 200 })
}


