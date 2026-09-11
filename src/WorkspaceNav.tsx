export type WorkspaceNavSection =
  | 'dashboard'
  | 'software-companies'
  | 'people'
  | 'lead-research'
  | 'startups'
  | 'data'
  | 'newsletters'
  | 'posts'
  | 'in-progress'

type WorkspaceNavProps = {
  active: WorkspaceNavSection
}

const navigationItems: ReadonlyArray<{
  id: WorkspaceNavSection
  href: string
  label: string
}> = [
  { id: 'dashboard', href: '/', label: 'Dashboard' },
  { id: 'people', href: '/people', label: 'People' },
  { id: 'lead-research', href: '/lead-research', label: 'Lead research' },
  { id: 'data', href: '/data', label: 'Data' },
  { id: 'newsletters', href: '/newsletters', label: 'Newsletters' },
  { id: 'posts', href: '/posts', label: 'Posts' },
  { id: 'in-progress', href: '/in-progress', label: 'In progress' },
]

export function WorkspaceNav({ active }: WorkspaceNavProps) {
  return (
    <nav aria-label="Primary navigation">
      {navigationItems.map((item) => (
        <a
          href={item.href}
          aria-current={item.id === active ? 'page' : undefined}
          key={item.id}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
