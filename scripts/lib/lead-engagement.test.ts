import assert from 'node:assert/strict'
import test from 'node:test'
import { addLeadEngagementEvent, emptyLeadEngagement } from '../../src/leadEngagement'

test('recording a WhatsApp contact creates an awaiting-reply engagement with dated history', () => {
  const engagement = emptyLeadEngagement('lead-example')
  const updated = addLeadEngagementEvent(engagement, {
    id: 'engagement-event-example',
    occurred_on: '2026-09-05',
    kind: 'contacted',
    channel: 'whatsapp',
    summary: 'Sent the introduction over WhatsApp; awaiting a response.',
  })

  assert.equal(updated.status, 'contacted-awaiting-reply')
  assert.equal(updated.primary_channel, 'whatsapp')
  assert.equal(updated.last_contact_at, '2026-09-05')
  assert.deepEqual(updated.events, [{
    id: 'engagement-event-example',
    occurred_on: '2026-09-05',
    kind: 'contacted',
    channel: 'whatsapp',
    summary: 'Sent the introduction over WhatsApp; awaiting a response.',
  }])
})
