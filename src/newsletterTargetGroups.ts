import type { NewsletterTargetGroupOption, UnifiedPeopleFile } from './unifiedPeopleTypes'

export const DEFAULT_NEWSLETTER_TARGET_GROUP_OPTIONS: NewsletterTargetGroupOption[] = [
  { value: 'repost-target', label: 'Repost target', description: 'We hope they like or repost our posts.' },
  { value: 'client-target', label: 'Client target', description: 'An actual client we want to sell to.' },
  { value: 'audience-gateway', label: 'Audience gateway', description: 'Not a final target, but followed by our final persona.' },
]

export const newsletterTargetGroupOptions = (file: Pick<UnifiedPeopleFile, 'group_options'>) => {
  const options = [...DEFAULT_NEWSLETTER_TARGET_GROUP_OPTIONS, ...(file.group_options ?? [])]
  return [...new Map(options.map((option) => [option.value, option])).values()]
}
