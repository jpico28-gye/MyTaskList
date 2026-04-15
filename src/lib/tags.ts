// Deterministic color assignment per tag name
const TAG_PALETTE = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
]

export function tagColorClass(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) & 0x7fffffff
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length]
}

/** Extract #tags from raw text; returns cleaned text + unique lowercase tags. */
export function parseTagsFromText(raw: string): { text: string; tags: string[] } {
  const found = new Set<string>()
  const text = raw
    .replace(/#(\w+)/g, (_, t) => {
      found.add(t.toLowerCase())
      return ''
    })
    .replace(/\s+/g, ' ')
    .trim()
  return { text, tags: [...found] }
}
