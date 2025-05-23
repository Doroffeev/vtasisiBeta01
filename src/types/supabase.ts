export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          full_name: string
          role: 'ADMIN' | 'MANAGER' | 'VET' | 'ZOOTECHNICIAN' | 'CARETAKER' | 'INSEMINATOR'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          full_name: string
          role: 'ADMIN' | 'MANAGER' | 'VET' | 'ZOOTECHNICIAN' | 'CARETAKER' | 'INSEMINATOR'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          role?: 'ADMIN' | 'MANAGER' | 'VET' | 'ZOOTECHNICIAN' | 'CARETAKER' | 'INSEMINATOR'
          is_active?: boolean
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          full_name: string
          position: 'VET' | 'INSEMINATOR' | 'CARETAKER' | 'ZOOTECHNICIAN'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          position: 'VET' | 'INSEMINATOR' | 'CARETAKER' | 'ZOOTECHNICIAN'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          position?: 'VET' | 'INSEMINATOR' | 'CARETAKER' | 'ZOOTECHNICIAN'
          is_active?: boolean
          created_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          number: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          number: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          number?: string
          description?: string | null
          created_at?: string
        }
      }
      animals: {
        Row: {
          id: string
          number: string
          group_id: string | null
          status: string
          birth_date: string | null
          gender: 'male' | 'female'
          mother_id: string | null
          last_calving_date: string | null
          last_insemination_date: string | null
          insemination_count: number | null
          is_under_treatment: boolean
          has_mastitis: boolean
          mastitis_start_date: string | null
          treatment_end_date: string | null
          treatment_end_executor_id: string | null
          next_calving_date: string | null
          lactation: string | null
          milk_yield: string | null
          responder: string | null
          days_in_milk: string | null
          created_at: string
        }
        Insert: {
          id?: string
          number: string
          group_id?: string | null
          status: string
          birth_date?: string | null
          gender: 'male' | 'female'
          mother_id?: string | null
          last_calving_date?: string | null
          last_insemination_date?: string | null
          insemination_count?: number | null
          is_under_treatment?: boolean
          has_mastitis?: boolean
          mastitis_start_date?: string | null
          treatment_end_date?: string | null
          treatment_end_executor_id?: string | null
          next_calving_date?: string | null
          lactation?: string | null
          milk_yield?: string | null
          responder?: string | null
          days_in_milk?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          number?: string
          group_id?: string | null
          status?: string
          birth_date?: string | null
          gender?: 'male' | 'female'
          mother_id?: string | null
          last_calving_date?: string | null
          last_insemination_date?: string | null
          insemination_count?: number | null
          is_under_treatment?: boolean
          has_mastitis?: boolean
          mastitis_start_date?: string | null
          treatment_end_date?: string | null
          treatment_end_executor_id?: string | null
          next_calving_date?: string | null
          lactation?: string | null
          milk_yield?: string | null
          responder?: string | null
          days_in_milk?: string | null
          created_at?: string
        }
      }
      movements: {
        Row: {
          id: string
          date: string
          from_group: string
          to_group: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          from_group: string
          to_group: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          from_group?: string
          to_group?: string
          reason?: string | null
          created_at?: string
        }
      }
      movement_animals: {
        Row: {
          id: string
          movement_id: string
          animal_id: string
        }
        Insert: {
          id?: string
          movement_id: string
          animal_id: string
        }
        Update: {
          id?: string
          movement_id?: string
          animal_id?: string
        }
      }
      nomenclature: {
        Row: {
          id: string
          code: string
          name: string
          unit: 'шт' | 'мл' | 'гр'
          category: 'АНТИБИОТИК' | 'ВАКЦИНА' | 'ВИТАМИН' | 'ДРУГОЕ'
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          unit: 'шт' | 'мл' | 'гр'
          category: 'АНТИБИОТИК' | 'ВАКЦИНА' | 'ВИТАМИН' | 'ДРУГОЕ'
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          unit?: 'шт' | 'мл' | 'гр'
          category?: 'АНТИБИОТИК' | 'ВАКЦИНА' | 'ВИТАМИН' | 'ДРУГОЕ'
          created_at?: string
        }
      }
      medications: {
        Row: {
          id: string
          nomenclature_id: string
          quantity: number
          unit_price: number
          invoice_number: string
          remaining_quantity: number
          receipt_date: string
          expiry_date: string
          batch_number: string
          created_at: string
        }
        Insert: {
          id?: string
          nomenclature_id: string
          quantity: number
          unit_price: number
          invoice_number: string
          remaining_quantity: number
          receipt_date: string
          expiry_date: string
          batch_number: string
          created_at?: string
        }
        Update: {
          id?: string
          nomenclature_id?: string
          quantity?: number
          unit_price?: number
          invoice_number?: string
          remaining_quantity?: number
          receipt_date?: string
          expiry_date?: string
          batch_number?: string
          created_at?: string
        }
      }
      write_offs: {
        Row: {
          id: string
          date: string
          medication_id: string
          quantity: number
          reason: string
          executor_id: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          medication_id: string
          quantity: number
          reason: string
          executor_id: string
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          medication_id?: string
          quantity?: number
          reason?: string
          executor_id?: string
          created_at?: string
        }
      }
      operation_types: {
        Row: {
          id: string
          code: string
          name: string
          category: 'ТРАВМА_ОРТОПЕД' | 'ВАКЦИНАЦИЯ' | 'ЛЕЧЕНИЕ' | 'ОСМОТР'
        }
        Insert: {
          id?: string
          code: string
          name: string
          category: 'ТРАВМА_ОРТОПЕД' | 'ВАКЦИНАЦИЯ' | 'ЛЕЧЕНИЕ' | 'ОСМОТР'
        }
        Update: {
          id?: string
          code?: string
          name?: string
          category?: 'ТРАВМА_ОРТОПЕД' | 'ВАКЦИНАЦИЯ' | 'ЛЕЧЕНИЕ' | 'ОСМОТР'
        }
      }
      vet_operations: {
        Row: {
          id: string
          date: string
          time: string
          code: string
          price: number | null
          executor_id: string | null
          result: string | null
          animal_id: string | null
          is_deleted: boolean
          deletion_reason: string | null
          deletion_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          time: string
          code: string
          price?: number | null
          executor_id?: string | null
          result?: string | null
          animal_id?: string | null
          is_deleted?: boolean
          deletion_reason?: string | null
          deletion_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          time?: string
          code?: string
          price?: number | null
          executor_id?: string | null
          result?: string | null
          animal_id?: string | null
          is_deleted?: boolean
          deletion_reason?: string | null
          deletion_date?: string | null
          created_at?: string
        }
      }
      medication_usages: {
        Row: {
          id: string
          operation_id: string
          medication_id: string
          quantity: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          operation_id: string
          medication_id: string
          quantity: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          operation_id?: string
          medication_id?: string
          quantity?: number
          total_price?: number
          created_at?: string
        }
      }
      operation_comments: {
        Row: {
          id: string
          operation_id: string
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          operation_id: string
          comment: string
          created_at?: string
        }
        Update: {
          id?: string
          operation_id?: string
          comment?: string
          created_at?: string
        }
      }
      planned_operations: {
        Row: {
          id: string
          operation_id: string
          date: string
          code: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          operation_id: string
          date: string
          code: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          operation_id?: string
          date?: string
          code?: string
          description?: string | null
          created_at?: string
        }
      }
      treatment_schemes: {
        Row: {
          id: string
          name: string
          description: string | null
          supervisor_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          supervisor_id: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          supervisor_id?: string
          is_active?: boolean
          created_at?: string
        }
      }
      treatment_steps: {
        Row: {
          id: string
          scheme_id: string
          day: number
          procedure: string
          created_at: string
        }
        Insert: {
          id?: string
          scheme_id: string
          day: number
          procedure: string
          created_at?: string
        }
        Update: {
          id?: string
          scheme_id?: string
          day?: number
          procedure?: string
          created_at?: string
        }
      }
      treatment_step_medications: {
        Row: {
          id: string
          step_id: string
          medication_id: string
          quantity: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          step_id: string
          medication_id: string
          quantity: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          step_id?: string
          medication_id?: string
          quantity?: number
          total_price?: number
          created_at?: string
        }
      }
      active_treatments: {
        Row: {
          id: string
          scheme_id: string
          animal_id: string
          start_date: string
          current_step: number
          is_completed: boolean
          completion_type: 'discharge' | 'disposal' | null
          completion_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          scheme_id: string
          animal_id: string
          start_date: string
          current_step?: number
          is_completed?: boolean
          completion_type?: 'discharge' | 'disposal' | null
          completion_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          scheme_id?: string
          animal_id?: string
          start_date?: string
          current_step?: number
          is_completed?: boolean
          completion_type?: 'discharge' | 'disposal' | null
          completion_date?: string | null
          created_at?: string
        }
      }
      completed_steps: {
        Row: {
          id: string
          treatment_id: string
          step_id: string
          date: string
          result: string
          executor_id: string
          created_at: string
        }
        Insert: {
          id?: string
          treatment_id: string
          step_id: string
          date: string
          result: string
          executor_id: string
          created_at?: string
        }
        Update: {
          id?: string
          treatment_id?: string
          step_id?: string
          date?: string
          result?: string
          executor_id?: string
          created_at?: string
        }
      }
      missed_steps: {
        Row: {
          id: string
          treatment_id: string
          step_id: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          treatment_id: string
          step_id: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          treatment_id?: string
          step_id?: string
          date?: string
          created_at?: string
        }
      }
      bulls: {
        Row: {
          id: string
          code: string
          name: string
          price: number
          remaining_doses: number
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          price: number
          remaining_doses?: number
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          price?: number
          remaining_doses?: number
          created_at?: string
        }
      }
      inseminations: {
        Row: {
          id: string
          date: string
          time: string
          animal_id: string | null
          bull_id: string | null
          executor_id: string | null
          status: 'ОСЕМ' | 'СТЕЛ' | 'ЯЛОВАЯ'
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          time: string
          animal_id?: string | null
          bull_id?: string | null
          executor_id?: string | null
          status: 'ОСЕМ' | 'СТЕЛ' | 'ЯЛОВАЯ'
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          time?: string
          animal_id?: string | null
          bull_id?: string | null
          executor_id?: string | null
          status?: 'ОСЕМ' | 'СТЕЛ' | 'ЯЛОВАЯ'
          created_at?: string
        }
      }
      calvings: {
        Row: {
          id: string
          mother_id: string | null
          date: string
          status: 'success' | 'abortion' | 'stillbirth'
          child_id: string | null
          child_gender: 'male' | 'female' | null
          notes: string | null
          has_mastitis: boolean
          executor_id: string | null
          new_mother_group_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mother_id?: string | null
          date: string
          status: 'success' | 'abortion' | 'stillbirth'
          child_id?: string | null
          child_gender?: 'male' | 'female' | null
          notes?: string | null
          has_mastitis?: boolean
          executor_id?: string | null
          new_mother_group_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          mother_id?: string | null
          date?: string
          status?: 'success' | 'abortion' | 'stillbirth'
          child_id?: string | null
          child_gender?: 'male' | 'female' | null
          notes?: string | null
          has_mastitis?: boolean
          executor_id?: string | null
          new_mother_group_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}