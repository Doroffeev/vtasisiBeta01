export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'VET' | 'ZOOTECHNICIAN' | 'CARETAKER' | 'INSEMINATOR';

export interface Employee {
  id: string;
  full_name: string;
  position: EmployeeRole;
  is_active: boolean;
  created_at?: string;
}

export type EmployeeRole = 'VET' | 'INSEMINATOR' | 'CARETAKER' | 'ZOOTECHNICIAN';

export interface Group {
  id: string;
  number: string;
  description: string;
  created_at?: string;
}

export interface Animal {
  id: string;
  name: string; // Added name property to match database schema
  number: string;
  group_id: string;
  status: string;
  birth_date?: string;
  gender: 'male' | 'female';
  mother_id?: string;
  last_calving_date?: string;
  last_insemination_date?: string;
  insemination_count?: number;
  is_under_treatment: boolean;
  has_mastitis: boolean;
  mastitis_start_date?: string;
  treatment_end_date?: string;
  treatment_end_executor_id?: string;
  next_calving_date?: string;
  lactation?: string;
  milk_yield?: string;
  responder?: string;
  days_in_milk?: string;
  created_at?: string;
}

export interface Movement {
  id: string;
  date: string;
  from_group: string;
  to_group: string;
  reason: string;
  created_at?: string;
}

export interface MovementAnimal {
  id: string;
  movement_id: string;
  animal_id: string;
}

export interface NomenclatureItem {
  id: string;
  code: string;
  name: string;
  unit: 'шт' | 'мл' | 'гр';
  category: 'АНТИБИОТИК' | 'ВАКЦИНА' | 'ВИТАМИН' | 'ДРУГОЕ';
  created_at?: string;
}

export interface Medication {
  id: string;
  nomenclature_id: string;
  quantity: number;
  unit_price: number;
  invoice_number: string;
  remaining_quantity: number;
  receipt_date: string;
  expiry_date: string;
  batch_number: string;
  created_at?: string;
}

export interface WriteOff {
  id: string;
  date: string;
  medication_id: string;
  quantity: number;
  reason: string;
  executor_id: string;
  created_at?: string;
}

export interface OperationType {
  id: string;
  code: string;
  name: string;
  category: 'ТРАВМА_ОРТОПЕД' | 'ВАКЦИНАЦИЯ' | 'ЛЕЧЕНИЕ' | 'ОСМОТР';
}

export interface VetOperation {
  id: string;
  date: string;
  time: string;
  code: string;
  price: string | number;
  executor_id: string;
  result: string;
  animal_id: string;
  is_deleted?: boolean;
  deletion_reason?: string;
  deletion_date?: string;
  created_at?: string;
  medications?: MedicationUsage[];
  comments?: OperationComment[];
  plannedOperations?: PlannedOperation[];
}

export interface MedicationUsage {
  id?: string;
  operation_id?: string;
  medication_id: string;
  quantity: number;
  total_price: number;
}

export interface OperationComment {
  id: string;
  operation_id: string;
  comment: string;
  created_at?: string;
}

export interface PlannedOperation {
  id: string;
  operation_id: string;
  date: string;
  code: string;
  description: string;
  created_at?: string;
}

export interface TreatmentScheme {
  id: string;
  name: string;
  description: string;
  supervisor_id: string;
  is_active: boolean;
  created_at?: string;
  steps?: TreatmentStep[];
}

export interface TreatmentStep {
  id: string;
  scheme_id?: string;
  day: number;
  procedure: string;
  created_at?: string;
  medications?: MedicationUsage[];
  isCompleted?: boolean;
  completionDate?: string;
  completionExecutorId?: string;
}

export interface TreatmentStepMedication {
  id: string;
  step_id: string;
  medication_id: string;
  quantity: number;
  total_price: number;
  created_at?: string;
}

export interface ActiveTreatment {
  id: string;
  scheme_id: string;
  animal_id: string;
  start_date: string;
  current_step: number;
  is_completed: boolean;
  completion_type?: 'discharge' | 'disposal';
  completion_date?: string;
  created_at?: string;
  completedSteps?: CompletedStep[];
  missedSteps?: MissedStep[];
}

export interface CompletedStep {
  id: string;
  treatment_id: string;
  step_id: string;
  date: string;
  result: string;
  executor_id: string;
  created_at?: string;
}

export interface MissedStep {
  id: string;
  treatment_id: string;
  step_id: string;
  date: string;
  created_at?: string;
}

export interface Bull {
  id: string;
  code: string;
  name: string;
  price: number;
  remaining_doses: number;
  created_at?: string;
}

export interface Insemination {
  id: string;
  date: string;
  time: string;
  animal_id: string;
  bull_id: string;
  executor_id: string;
  status: 'ОСЕМ' | 'СТЕЛ' | 'ЯЛОВАЯ';
  created_at?: string;
}

export interface Calving {
  id: string;
  mother_id: string;
  date: string;
  status: 'success' | 'abortion' | 'stillbirth';
  child_id?: string;
  child_gender?: 'male' | 'female';
  notes: string;
  has_mastitis: boolean;
  executor_id: string;
  new_mother_group_id: string;
  created_at?: string;
}