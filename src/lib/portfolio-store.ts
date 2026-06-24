import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations } from '@/lib/i18n'

export interface ProjectItem {
  id: string
  title: string
  description: string
  link: string
}

export interface ContactItem {
  id: string
  label: string
  value: string
}

export interface PortfolioContent {
  aboutBody: string
  projects: ProjectItem[]
  skills: string[]
  contacts: ContactItem[]
}

/** Build the default content set from the EN translation table. */
export function defaultContent(): PortfolioContent {
  const t = translations.en
  return {
    aboutBody: t['content.aboutBody'],
    projects: [
      {
        id: 'p1',
        title: t['content.project1Title'],
        description: t['content.project1Desc'],
        link: '',
      },
      {
        id: 'p2',
        title: t['content.project2Title'],
        description: t['content.project2Desc'],
        link: '',
      },
      {
        id: 'p3',
        title: t['content.project3Title'],
        description: t['content.project3Desc'],
        link: '',
      },
    ],
    skills: ['React', 'TypeScript', 'Node.js', 'Design', 'Next.js', 'Tailwind'],
    contacts: [
      { id: 'c1', label: t['content.emailLabel'], value: t['content.emailValue'] },
      { id: 'c2', label: t['content.githubLabel'], value: t['content.githubValue'] },
    ],
  }
}

interface PortfolioStore extends PortfolioContent {
  setAboutBody: (v: string) => void
  setProject: (id: string, patch: Partial<Omit<ProjectItem, 'id'>>) => void
  addProject: () => void
  removeProject: (id: string) => void
  setSkills: (v: string[]) => void
  setContact: (id: string, patch: Partial<Omit<ContactItem, 'id'>>) => void
  addContact: () => void
  removeContact: (id: string) => void
  resetAll: () => void
}

function nextId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      ...defaultContent(),
      setAboutBody: (v) => set({ aboutBody: v }),
      setProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      addProject: () =>
        set((s) => ({
          projects: [
            ...s.projects,
            { id: nextId('p'), title: '', description: '', link: '' },
          ],
        })),
      removeProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      setSkills: (v) => set({ skills: v }),
      setContact: (id, patch) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      addContact: () =>
        set((s) => ({
          contacts: [...s.contacts, { id: nextId('c'), label: '', value: '' }],
        })),
      removeContact: (id) =>
        set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
      resetAll: () => set(defaultContent()),
    }),
    {
      name: 'kres_portfolio_content',
      version: 1,
    }
  )
)
