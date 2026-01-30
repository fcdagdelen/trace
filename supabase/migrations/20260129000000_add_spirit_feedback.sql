-- Spirit Feedback System
-- Allows users to signal whether trace output "feels like" a specific spirit

-- Core feedback records
CREATE TABLE spirit_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  trace_id UUID REFERENCES traces(id) ON DELETE CASCADE,
  spirit_id TEXT NOT NULL,
  adherence_signal SMALLINT NOT NULL CHECK (adherence_signal IN (-1, 1)),
  spirit_version TEXT,  -- hash of spirit definition at feedback time
  trace_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-updated aggregates per spirit
CREATE TABLE spirit_feedback_aggregates (
  spirit_id TEXT PRIMARY KEY,
  total_feedback INTEGER DEFAULT 0,
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  adherence_score NUMERIC(4,3) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_spirit_feedback_user_id ON spirit_feedback(user_id);
CREATE INDEX idx_spirit_feedback_trace_id ON spirit_feedback(trace_id);
CREATE INDEX idx_spirit_feedback_spirit_id ON spirit_feedback(spirit_id);
CREATE INDEX idx_spirit_feedback_created_at ON spirit_feedback(created_at DESC);

-- Composite index for checking existing feedback
CREATE UNIQUE INDEX idx_spirit_feedback_unique_vote
  ON spirit_feedback(user_id, trace_id, spirit_id);

-- RLS Policies
ALTER TABLE spirit_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE spirit_feedback_aggregates ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON spirit_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback (change vote)
CREATE POLICY "Users can update own feedback"
  ON spirit_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON spirit_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Aggregates are publicly readable (no sensitive data)
CREATE POLICY "Aggregates are publicly readable"
  ON spirit_feedback_aggregates FOR SELECT
  TO authenticated
  USING (true);

-- Function to update aggregates on feedback insert/update/delete
CREATE OR REPLACE FUNCTION update_spirit_feedback_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  target_spirit_id TEXT;
  pos_count INTEGER;
  neg_count INTEGER;
  total INTEGER;
  score NUMERIC(4,3);
BEGIN
  -- Determine which spirit_id to update
  IF TG_OP = 'DELETE' THEN
    target_spirit_id := OLD.spirit_id;
  ELSE
    target_spirit_id := NEW.spirit_id;
  END IF;

  -- Also handle old spirit_id if it changed on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.spirit_id != NEW.spirit_id THEN
    -- Recalculate for old spirit
    SELECT
      COUNT(*) FILTER (WHERE adherence_signal = 1),
      COUNT(*) FILTER (WHERE adherence_signal = -1),
      COUNT(*)
    INTO pos_count, neg_count, total
    FROM spirit_feedback
    WHERE spirit_id = OLD.spirit_id;

    IF total > 0 THEN
      score := pos_count::NUMERIC / total;
    ELSE
      score := 0;
    END IF;

    INSERT INTO spirit_feedback_aggregates (spirit_id, positive_count, negative_count, total_feedback, adherence_score, last_updated)
    VALUES (OLD.spirit_id, pos_count, neg_count, total, score, now())
    ON CONFLICT (spirit_id) DO UPDATE SET
      positive_count = EXCLUDED.positive_count,
      negative_count = EXCLUDED.negative_count,
      total_feedback = EXCLUDED.total_feedback,
      adherence_score = EXCLUDED.adherence_score,
      last_updated = EXCLUDED.last_updated;
  END IF;

  -- Calculate new aggregates for target spirit
  SELECT
    COUNT(*) FILTER (WHERE adherence_signal = 1),
    COUNT(*) FILTER (WHERE adherence_signal = -1),
    COUNT(*)
  INTO pos_count, neg_count, total
  FROM spirit_feedback
  WHERE spirit_id = target_spirit_id;

  IF total > 0 THEN
    score := pos_count::NUMERIC / total;
  ELSE
    score := 0;
  END IF;

  -- Upsert aggregate record
  INSERT INTO spirit_feedback_aggregates (spirit_id, positive_count, negative_count, total_feedback, adherence_score, last_updated)
  VALUES (target_spirit_id, pos_count, neg_count, total, score, now())
  ON CONFLICT (spirit_id) DO UPDATE SET
    positive_count = EXCLUDED.positive_count,
    negative_count = EXCLUDED.negative_count,
    total_feedback = EXCLUDED.total_feedback,
    adherence_score = EXCLUDED.adherence_score,
    last_updated = EXCLUDED.last_updated;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update aggregates
CREATE TRIGGER spirit_feedback_aggregate_trigger
  AFTER INSERT OR UPDATE OR DELETE ON spirit_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_spirit_feedback_aggregates();
