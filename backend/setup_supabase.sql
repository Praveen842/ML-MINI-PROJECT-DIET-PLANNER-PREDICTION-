-- SQL to create the diet_plans table in Supabase

CREATE TABLE diet_plans (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_data JSONB NOT NULL,
    predicted_diet TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    timetable JSONB NOT NULL
);

-- Optional: Enable row level security if you want to restrict access
-- ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
