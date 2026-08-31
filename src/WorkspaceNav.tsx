export type WorkspaceNavSection =
  | 'dashboard'
  | 'software-companies'
  | 'influencers'
  | 'startups'
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
  { id: 'software-companies', href: '/software-companies', label: 'Software companies' },
  { id: 'influencers', href: '/influencers', label: 'Influencers' },
  { id: 'startups', href: '/research', label: 'Startups' },
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
