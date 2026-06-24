import { create } from 'zustand'
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  defaultContent,
  nextId,
  PORTFOLIO_CACHE_KEY,
  PORTFOLIO_DOC_PATH,
  type ContactItem,
  type PortfolioContent,
  type ProjectItem,
} from '@/lib/portfolio-defaults'

interface PortfolioStore extends PortfolioContent {
  loaded: boolean
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

/** Read the localStorage cache (instant hydration before Firestore resolves). */
function readCache(): PortfolioContent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PortfolioContent
    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.skills) || !Array.isArray(parsed.contacts)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Write the localStorage cache. */
function writeCache(c: PortfolioContent) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(c))
  } catch {
    // ignore quota errors
  }
}

/** Persist the full content document to Firestore (admin only by rules). */
function persist(getState: () => PortfolioStore) {
  const { aboutBody, projects, skills, contacts } = getState()
  const payload: PortfolioContent = { aboutBody, projects, skills, contacts }
  void setDoc(
    doc(db, PORTFOLIO_DOC_PATH.collection, PORTFOLIO_DOC_PATH.doc),
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true },
  ).catch(() => {
    // Permission denied (non-admin) or offline — ignore; the UI only exposes
    // the editor to admins, and the snapshot listener reconciles state.
  })
}

const cached = readCache()

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  ...defaultContent(),
  ...(cached ? cached : {}),
  loaded: false,

  setAboutBody: (v) => {
    set({ aboutBody: v })
    persist(get)
  },
  setProject: (id, patch) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
    persist(get)
  },
  addProject: () => {
    set((s) => ({
      projects: [...s.projects, { id: nextId('p'), title: '', description: '', link: '' }],
    }))
    persist(get)
  },
  removeProject: (id) => {
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
    persist(get)
  },
  setSkills: (v) => {
    set({ skills: v })
    persist(get)
  },
  setContact: (id, patch) => {
    set((s) => ({
      contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
    persist(get)
  },
  addContact: () => {
    set((s) => ({
      contacts: [...s.contacts, { id: nextId('c'), label: '', value: '' }],
    }))
    persist(get)
  },
  removeContact: (id) => {
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }))
    persist(get)
  },
  resetAll: () => {
    const defaults = defaultContent()
    set(defaults)
    persist(get)
  },
}))

/**
 * Subscribe to the Firestore portfolio content document. Call this once on the
 * client (from a top-level client component). Updates from the admin are
 * pushed to every viewer in real time. Falls back to defaults when the doc
 * does not exist yet.
 */
export function initPortfolioSync(): () => void {
  if (typeof window === 'undefined') return () => {}
  const store = usePortfolioStore
  const unsub = onSnapshot(
    doc(db, PORTFOLIO_DOC_PATH.collection, PORTFOLIO_DOC_PATH.doc),
    (snap) => {
      if (!snap.exists()) {
        // No content yet — keep defaults/cache, mark loaded.
        store.setState({ loaded: true })
        return
      }
      const data = snap.data() as Partial<PortfolioContent>
      const next: PortfolioContent = {
        aboutBody: typeof data.aboutBody === 'string' ? data.aboutBody : defaultContent().aboutBody,
        projects: Array.isArray(data.projects) ? (data.projects as ProjectItem[]) : defaultContent().projects,
        skills: Array.isArray(data.skills) ? (data.skills as string[]) : defaultContent().skills,
        contacts: Array.isArray(data.contacts) ? (data.contacts as ContactItem[]) : defaultContent().contacts,
      }
      // Update the store + refresh the cache.
      store.setState({ ...next, loaded: true })
      writeCache(next)
    },
    () => {
      // Permission error or offline — mark loaded, keep cache.
      store.setState({ loaded: true })
    },
  )
  return unsub
}
