export type Priority = 1 | 2 | 3 | 4

export type List = {
  id: string
  user_id: string
  name: string
  color: string
  icon: string | null
  position: number
  created_at: string
  /** Gezet = opgeborgen. Optioneel getypt, zodat de app ook werkt zolang
   *  migratie 0002 nog niet gedraaid is: dan is het veld er simpelweg niet. */
  archived_at?: string | null
}

export type Label = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  list_id: string | null
  parent_id: string | null
  title: string
  description: string | null
  due_date: string | null
  priority: Priority
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
  /** JSON met de herhalingsregel, zie lib/herhaling.ts. Optioneel getypt,
   *  zodat de app ook werkt zolang migratie 0003 nog niet gedraaid is. */
  recurrence?: string | null
  /** Hoe lang je denkt dat hij duurt, in minuten. Optioneel getypt om
   *  dezelfde reden als recurrence: migratie 0004. */
  duration_minutes?: number | null
  /** Wanneer de herinnering afgaat, en wanneer je hem wegklikte. Optioneel
   *  getypt tot migratie 0005 gedraaid is, net als location. */
  remind_at?: string | null
  reminded_at?: string | null
  /** Een adres of plek, zoals je hem intypt. */
  location?: string | null
}

export type TaskComment = {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
}

/** Taak zoals de UI hem gebruikt: met zijn labels en subtaken erbij. */
export type TaskWithMeta = Task & {
  labelIds: string[]
  subtasks: Task[]
}

export type NewTask = {
  title: string
  recurrence?: string | null
  duration_minutes?: number | null
  remind_at?: string | null
  location?: string | null
  description?: string | null
  due_date?: string | null
  priority?: Priority
  list_id?: string | null
  parent_id?: string | null
  labelIds?: string[]
}

/* Minimale Database-typing voor de supabase-client. Uitgebreider dan dit
   heeft geen zin zolang we de types met de hand bijhouden; de generator van
   Supabase kan dit bestand later vervangen. */
export interface Database {
  public: {
    Tables: {
      lists: {
        Row: List
        Insert: Partial<List> & { name: string }
        Update: Partial<List>
        Relationships: []
      }
      labels: {
        Row: Label
        Insert: Partial<Label> & { name: string }
        Update: Partial<Label>
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: Partial<Task> & { title: string }
        Update: Partial<Task>
        Relationships: []
      }
      task_labels: {
        Row: { task_id: string; label_id: string; user_id: string }
        Insert: { task_id: string; label_id: string; user_id?: string }
        Update: Partial<{ task_id: string; label_id: string; user_id: string }>
        Relationships: []
      }
      task_comments: {
        Row: TaskComment
        Insert: Partial<TaskComment> & { task_id: string; body: string }
        Update: Partial<TaskComment>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
