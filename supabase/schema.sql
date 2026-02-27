-- =====================================================
-- TaskFlow Database Schema
-- Run this in Supabase → SQL Editor → New query → Run
-- =====================================================

-- 1. TASKS (active/open tasks)
CREATE TABLE tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item       text NOT NULL,
  due        date,
  importance text NOT NULL DEFAULT 'When Time Allows',
  est        integer NOT NULL DEFAULT 30,
  category   text NOT NULL DEFAULT '',
  client     text NOT NULL DEFAULT '',
  end_client text NOT NULL DEFAULT '',
  type       text NOT NULL DEFAULT 'Business',
  duration   integer NOT NULL DEFAULT 0,
  notes      text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'Planned',
  flag       boolean NOT NULL DEFAULT false,
  campaign    text NOT NULL DEFAULT '',
  meeting_key text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  sort_order  integer
);

-- 2. DONE (completed tasks)
CREATE TABLE done (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item       text NOT NULL,
  completed  timestamptz NOT NULL DEFAULT now(),
  due        date,
  importance text NOT NULL DEFAULT '',
  category   text NOT NULL DEFAULT '',
  client     text NOT NULL DEFAULT '',
  end_client text NOT NULL DEFAULT '',
  type       text NOT NULL DEFAULT 'Business',
  duration   integer NOT NULL DEFAULT 0,
  est        integer NOT NULL DEFAULT 0,
  notes      text NOT NULL DEFAULT '',
  campaign   text NOT NULL DEFAULT ''
);

-- 3. CLIENTS (client/partner names)
CREATE TABLE clients (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name    text NOT NULL,
  UNIQUE (user_id, name)
);

-- 4. REVIEW (review queue)
CREATE TABLE review (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item       text NOT NULL,
  notes      text NOT NULL DEFAULT '',
  importance text NOT NULL DEFAULT 'Important',
  category   text NOT NULL DEFAULT '',
  client     text NOT NULL DEFAULT 'Internal / N/A',
  end_client text NOT NULL DEFAULT '',
  type       text NOT NULL DEFAULT 'Business',
  est        integer NOT NULL DEFAULT 0,
  due        date,
  source     text NOT NULL DEFAULT '',
  created    timestamptz NOT NULL DEFAULT now(),
  campaign   text NOT NULL DEFAULT ''
);

-- 5. CAMPAIGNS
CREATE TABLE campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  partner          text NOT NULL DEFAULT '',
  end_client       text NOT NULL DEFAULT '',
  status           text NOT NULL DEFAULT 'Setup',
  platform         text NOT NULL DEFAULT '',
  strategy_fee     numeric NOT NULL DEFAULT 0,
  setup_fee        numeric NOT NULL DEFAULT 0,
  monthly_fee      numeric NOT NULL DEFAULT 0,
  monthly_ad_spend numeric NOT NULL DEFAULT 0,
  campaign_term    text NOT NULL DEFAULT '',
  planned_launch   date,
  actual_launch    date,
  renewal_date     date,
  goal             text NOT NULL DEFAULT '',
  proposal_link    text NOT NULL DEFAULT '',
  reports_link     text NOT NULL DEFAULT '',
  video_assets_link text NOT NULL DEFAULT '',
  transcripts_link text NOT NULL DEFAULT '',
  awareness_lp     text NOT NULL DEFAULT '',
  consideration_lp text NOT NULL DEFAULT '',
  decision_lp      text NOT NULL DEFAULT '',
  contract_link    text NOT NULL DEFAULT '',
  notes            text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 6. PAYMENTS (campaign payments)
CREATE TABLE payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  date        date,
  amount      numeric NOT NULL DEFAULT 0,
  type        text NOT NULL DEFAULT '',
  notes       text NOT NULL DEFAULT ''
);

-- 7. CAMPAIGN MEETINGS
CREATE TABLE campaign_meetings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id    uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  date           timestamptz,
  title          text NOT NULL DEFAULT '',
  recording_link text NOT NULL DEFAULT '',
  notes          text NOT NULL DEFAULT ''
);

-- 8. ACTIVITY LOGS (per-task notes/updates)
CREATE TABLE activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id    text NOT NULL,
  text       text NOT NULL DEFAULT '',
  ts         timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- ROW LEVEL SECURITY — Only you can see/modify your data
-- =====================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE done ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own done" ON done
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own clients" ON clients
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE review ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own review" ON review
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own campaigns" ON campaigns
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own payments" ON payments
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE campaign_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own campaign_meetings" ON campaign_meetings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own activity_logs" ON activity_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_done_user ON done(user_id);
CREATE INDEX idx_done_completed ON done(user_id, completed DESC);
CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_review_user ON review(user_id);
CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_campaign ON payments(campaign_id);
CREATE INDEX idx_campaign_meetings_user ON campaign_meetings(user_id);
CREATE INDEX idx_campaign_meetings_campaign ON campaign_meetings(campaign_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_task ON activity_logs(task_id);

-- =====================================================
-- 9. PROJECTS
-- =====================================================
CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'Planning',
  color       text NOT NULL DEFAULT '#ff0099',
  start_date  date,
  target_date date,
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 10. PROJECT PHASES
CREATE TABLE project_phases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  start_date  date,
  end_date    date,
  status      text NOT NULL DEFAULT 'Not Started',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Add project/phase columns to tasks and done
ALTER TABLE tasks ADD COLUMN project text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN phase text NOT NULL DEFAULT '';
ALTER TABLE done ADD COLUMN project text NOT NULL DEFAULT '';
ALTER TABLE done ADD COLUMN phase text NOT NULL DEFAULT '';

-- RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own projects" ON projects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for project_phases
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own project_phases" ON project_phases
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for projects
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_project_phases_user ON project_phases(user_id);
CREATE INDEX idx_project_phases_project ON project_phases(project_id);

-- =====================================================
-- 11. OPPORTUNITIES
-- =====================================================
CREATE TABLE opportunities (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text NOT NULL DEFAULT '',
  stage                 text NOT NULL DEFAULT 'Lead',
  client                text NOT NULL DEFAULT '',
  end_client            text NOT NULL DEFAULT '',
  contact_name          text NOT NULL DEFAULT '',
  contact_email         text NOT NULL DEFAULT '',
  strategy_fee          numeric NOT NULL DEFAULT 0,
  setup_fee             numeric NOT NULL DEFAULT 0,
  monthly_fee           numeric NOT NULL DEFAULT 0,
  probability           integer NOT NULL DEFAULT 50,
  expected_close        date,
  source                text NOT NULL DEFAULT '',
  notes                 text NOT NULL DEFAULT '',
  closed_at             timestamptz,
  converted_campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Add opportunity column to tasks and done
ALTER TABLE tasks ADD COLUMN opportunity text NOT NULL DEFAULT '';
ALTER TABLE done ADD COLUMN opportunity text NOT NULL DEFAULT '';

-- RLS for opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own opportunities" ON opportunities
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for opportunities
CREATE INDEX idx_opportunities_user ON opportunities(user_id);
CREATE INDEX idx_opportunities_stage ON opportunities(user_id, stage);
