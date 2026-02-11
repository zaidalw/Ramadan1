export type GroupRole = "supervisor" | "player";

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  start_date: string; // YYYY-MM-DD
  timezone: string;
  cutoff_time: string; // HH:MM:SS
  max_players: number;
  created_by: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  display_name: string;
};

export type DayContent = {
  group_id: string;
  day_number: number;
  hadith_text: string;
  fiqh_statement_text: string;
  impact_task_text: string;
};

export type Submission = {
  id: string;
  group_id: string;
  user_id: string;
  day_number: number;
  quran_points: number;
  hadith_points: number;
  fiqh_answer: boolean;
  impact_done: boolean;
  fiqh_points: number;
  impact_points: number;
  auto_total: number;
  override_total: number | null;
  total_points: number;
  created_at: string;
  updated_at: string;
};

export type DayPost = {
  group_id: string;
  day_number: number;
  posted_at: string;
  posted_by: string;
};

export type OverrideLog = {
  id: string;
  submission_id: string;
  group_id: string;
  supervisor_id: string;
  previous_override_total: number | null;
  new_override_total: number | null;
  previous_total_points: number;
  new_total_points: number;
  reason: string;
  created_at: string;
};

