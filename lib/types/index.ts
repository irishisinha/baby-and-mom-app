export type UserRole = 'parent' | 'grandparent' | 'nanny' | 'admin'
export type DeliveryType = 'vaginal' | 'c_section' | 'other'
export type BabyEventType = 'feed' | 'diaper' | 'sleep' | 'weight' | 'height' | 'poop' | 'vomit' | 'rash' | 'fever' | 'milestone' | 'note'
export type MotherEventType = 'mood' | 'sleep' | 'water' | 'meal' | 'medication' | 'symptom' | 'exercise' | 'weight' | 'breastfeeding' | 'note'

export interface User {
  id: string
  name: string
  phone?: string
  role: UserRole
  created_at: string
  avatar_url?: string
  preferences: Record<string, any>
}

export interface Family {
  id: string
  name: string
  created_at: string
  created_by: string
  metadata: Record<string, any>
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: UserRole
  whatsapp_number?: string
  joined_at: string
}

export interface Baby {
  id: string
  family_id: string
  name: string
  dob: string
  gender?: string
  weight_at_birth_g?: number
  length_at_birth_cm?: number
  created_at: string
  created_by: string
}

export interface Mother {
  id: string
  family_id: string
  name: string
  dob: string
  delivery_date: string
  delivery_type: DeliveryType
  created_at: string
  created_by: string
}

export interface BabyEvent {
  id: string
  baby_id: string
  family_id: string
  type: BabyEventType
  value?: number
  unit?: string
  notes?: string
  logged_by: string
  created_at: string
  occurred_at: string
  source: 'app' | 'whatsapp' | 'voice'
  parser_confidence: number
  raw_input?: string
}

export interface MotherEvent {
  id: string
  mother_id: string
  family_id: string
  type: MotherEventType
  value?: number
  unit?: string
  notes?: string
  logged_by: string
  created_at: string
  occurred_at: string
  source: 'app' | 'whatsapp' | 'voice'
  parser_confidence: number
  raw_input?: string
}

export interface ParsedMessage {
  subject: 'baby' | 'mother'
  baby_id?: string
  mother_id?: string
  type: BabyEventType | MotherEventType
  value?: number
  unit?: string
  occurred_at: string
  notes?: string
  confidence: number
  clarification?: string
  raw_input: string
}
