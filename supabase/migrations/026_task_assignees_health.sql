-- Multiple assignees per task
CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  assignee_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_assignees_select" ON task_assignees FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_org_member(t.org_id)));

CREATE POLICY "task_assignees_member_write" ON task_assignees FOR ALL
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_org_member(t.org_id))
  );

-- Assignees can update parent task status
CREATE POLICY "tasks_assignee_update" ON tasks FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid())
  );
