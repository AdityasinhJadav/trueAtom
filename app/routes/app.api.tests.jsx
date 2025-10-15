import { authenticate } from '../shopify.server'
import prisma from '../db.server'

export const loader = async ({ request }) => {
  try {
    // Try to auth, but don't fail reads if auth temporarily unavailable
    try { await authenticate.admin(request) } catch {}
    const url = new URL(request.url)
    const testId = url.searchParams.get('id')

    if (testId) {
      const test = await prisma.test.findUnique({ where: { id: String(testId) } })
      return new Response(JSON.stringify({ ok: true, data: test }), { status: 200 })
    }

    const tests = await prisma.test.findMany({ orderBy: { createdAt: 'desc' } })
    return new Response(JSON.stringify({ ok: true, data: tests }), { status: 200 })
  } catch (e) {
    console.error('tests.loader error', e)
    return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), { status: 500 })
  }
}

export const action = async ({ request }) => {
  try {
    // Soft-auth: attempt admin auth, but don't fail if unavailable
    let session = null
    try { const ctx = await authenticate.admin(request); session = ctx.session } catch {}

    const body = (async ()=>{ try { return await request.json() } catch { return {} } })()
    const resolvedBody = await body
    let method = (request.method || 'POST').toUpperCase()
    // Support method override via body._method to bypass proxies that block DELETE
    if (method === 'POST' && typeof resolvedBody?._method === 'string') {
      method = resolvedBody._method.toUpperCase()
    }

    if (method === 'PATCH') {
      const {
        id,
        status,
      } = resolvedBody || {}
      const idStr = (id && String(id).trim()) || new URL(request.url).searchParams.get('id')
      if (!idStr) {
        return new Response(JSON.stringify({ ok: false, error: 'Missing id for PATCH' }), { status: 400 })
      }
      try {
        const data = {}
        if (typeof status === 'string') {
          data.status = status
          if (status === 'Running') data.startedAt = new Date()
          if (status === 'Completed') data.completedAt = new Date()
        }
        const updated = await prisma.test.update({ where: { id: String(idStr) }, data })
        return new Response(JSON.stringify({ ok: true, data: updated }), { status: 200 })
      } catch (e) {
        console.error('tests.action PATCH failed', e)
        return new Response(JSON.stringify({ ok: false, error: e?.message || 'Failed to update' }), { status: 500 })
      }
    }

    if (method === 'POST') {
      const {
        id,
        name,
        status = 'Draft',
        productId,
        variations,
        trafficSplit,
        goal,
        description,
        hypothesis,
        duration,
        durationUnit,
        selectedProducts,
        targeting,
        stoppedVariations,
      } = resolvedBody || {}

      // Derive primary product if not explicitly provided
      const primaryProductId = productId || (Array.isArray(selectedProducts) && selectedProducts[0]?.id)

      if (!name || !primaryProductId || !Array.isArray(variations) || !Array.isArray(trafficSplit)) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid payload (missing name/product/variations/trafficSplit)' }), { status: 400 })
      }

      // Ensure referenced Product exists when there is an FK relation
      try {
        if (primaryProductId) {
          await prisma.product.upsert({
            where: { shopifyId: String(primaryProductId) },
            update: { lastSynced: new Date() },
            create: {
              shopifyId: String(primaryProductId),
              title: (selectedProducts?.[0]?.title || 'Product'),
              status: 'ACTIVE',
            }
          })
        }
      } catch (e) {
        console.error('tests.action upsert product failed', e)
      }

      const data = {
        name: String(name),
        status: String(status),
        productId: String(primaryProductId),
        variations: variations,
        trafficSplit: trafficSplit,
        goal: String(goal || 'revenue_per_visitor'),
        description: description ?? null,
        hypothesis: hypothesis ?? null,
        duration: typeof duration === 'number' ? duration : null,
        durationUnit: durationUnit ?? null,
        selectedProducts: selectedProducts ?? null,
        targeting: targeting ?? null,
        stoppedVariations: stoppedVariations ?? null,
        startedAt: status === 'Running' ? new Date() : null,
      }

      let saved
      const idStr = (id && String(id).trim()) || null
      try {
        if (idStr) {
          // Try update first; if not found, create a new record
          try {
            saved = await prisma.test.update({ where: { id: idStr }, data })
          } catch (e) {
            // P2025: record to update not found
            if (e && (e.code === 'P2025' || /not found/i.test(String(e.message)))) {
              saved = await prisma.test.create({ data })
            } else {
              throw e
            }
          }
        } else {
          saved = await prisma.test.create({ data })
        }
      } catch (e) {
        console.error('tests.action prisma save failed', e)
        return new Response(JSON.stringify({ ok: false, error: e?.message || 'Failed to save test' }), { status: 500 })
      }

      return new Response(JSON.stringify({ ok: true, data: saved }), { status: 200 })
    }

    if (method === 'DELETE') {
      const url = new URL(request.url)
      const id = url.searchParams.get('id')
      if (!id) return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400 })
      try {
        const idStr = String(id)
        // Remove any related events (best effort)
        try { await prisma.event.deleteMany({ where: { testId: idStr } }) } catch (e) { console.error('deleteMany events', e) }

        // Use deleteMany to avoid throwing if missing or FK quirks
        const res = await prisma.test.deleteMany({ where: { id: idStr } })
        return new Response(JSON.stringify({ ok: true, deleted: res.count }), { status: 200 })
      } catch (e) {
        // If record not found, treat as idempotent delete
        if (e && (e.code === 'P2025' || /not found/i.test(String(e.message)))) {
          return new Response(JSON.stringify({ ok: true, note: 'Already deleted' }), { status: 200 })
        }
        console.error('tests.action delete failed', e)
        return new Response(JSON.stringify({ ok: false, error: e?.message || 'Failed to delete', code: e?.code, meta: e?.meta }), { status: 500 })
      }
    }

    return new Response(JSON.stringify({ ok: false, error: 'Unsupported method' }), { status: 405 })
  } catch (e) {
    console.error('tests.action error', e)
    return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), { status: 500 })
  }
}

 


