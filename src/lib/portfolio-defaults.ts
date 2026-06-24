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
      { id: 'p1', title: t['content.project1Title'], description: t['content.project1Desc'], link: '' },
      { id: 'p2', title: t['content.project2Title'], description: t['content.project2Desc'], link: '' },
      { id: 'p3', title: t['content.project3Title'], description: t['content.project3Desc'], link: '' },
    ],
    skills: ['React', 'TypeScript', 'Node.js', 'Design', 'Next.js', 'Tailwind'],
    contacts: [
      { id: 'c1', label: t['content.emailLabel'], value: t['content.emailValue'] },
      { id: 'c2', label: t['content.githubLabel'], value: t['content.githubValue'] },
    ],
  }
}

/** Storage key for the client-side cache (NOT the source of truth — Firestore is). */
export const PORTFOLIO_CACHE_KEY = 'kres_portfolio_content_cache'

/** Firestore path of the single portfolio content document. */
export const PORTFOLIO_DOC_PATH = { collection: 'portfolio', doc: 'content' }

export function nextId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}
