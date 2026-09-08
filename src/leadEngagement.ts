import type { LeadEngagement, LeadEngagementEvent, LeadEngagementStatus } from './leadResearchTypes'

export const LEAD_ENGAGEMENT_STATUSES = [
  'not-contacted',
  'contacted-awaiting-reply',
  'replied',
  'follow-up-due',
  'meeting-scheduled',
  'not-interested',
  'closed',
] as const

export const LEAD_ENGAGEMENT_CHANNELS = ['whatsapp', 'linkedin', 'email', 'phone', 'other'] as const
export const LEAD_ENGAGEMENT_EVENT_KINDS = ['contacted', 'reply-received', 'follow-up-sent', 'meeting-scheduled', 'note'] as const

export const emptyLeadEngagement = (leadId: string): LeadEngagement => ({
  lead_id: leadId,
  status: 'not-contacted',
  primary_channel: null,
  last_contact_at: null,
  next_follow_up_at: null,
  notes: null,
  events: [],
})

const statusForEvent: Partial<Record<LeadEngagementEvent['kind'], LeadEngagementStatus>> = {
  contacted: 'contacted-awaiting-reply',
  'follow-up-sent': 'contacted-awaiting-reply',
  'reply-received': 'replied',
  'meeting-scheduled': 'meeting-scheduled',
}

export const addLeadEngagementEvent = (engagement: LeadEngagement, event: LeadEngagementEvent): LeadEngagement => ({
  ...engagement,
  status: statusForEvent[event.kind] ?? engagement.status,
  primary_channel: event.kind === 'note' ? engagement.primary_channel : event.channel,
  last_contact_at: event.kind === 'note' ? engagement.last_contact_at : event.occurred_on,
  events: [...engagement.events, event],
})
