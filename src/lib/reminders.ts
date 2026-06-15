export const REMINDER_OPTIONS = [
  { value: null,  label: 'No reminder' },
  { value: 0,     label: 'At due time' },
  { value: 5,     label: '5 min before' },
  { value: 10,    label: '10 min before' },
  { value: 15,    label: '15 min before' },
  { value: 30,    label: '30 min before' },
  { value: 60,    label: '1 hour before' },
  { value: 120,   label: '2 hours before' },
  { value: 1440,  label: '1 day before' },
  { value: 2880,  label: '2 days before' },
  { value: 10080, label: '1 week before' },
] as const

export type ReminderMinutes = 0 | 5 | 10 | 15 | 30 | 60 | 120 | 1440 | 2880 | 10080 | null
