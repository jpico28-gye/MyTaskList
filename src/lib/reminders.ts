export const REMINDER_OPTIONS = [
  { value: null,  label: 'No reminder' },
  { value: 0,     label: 'At due time' },
  { value: 15,    label: '15 min before' },
  { value: 60,    label: '1 hour before' },
  { value: 1440,  label: '1 day before' },
] as const

export type ReminderMinutes = 0 | 15 | 60 | 1440 | null
