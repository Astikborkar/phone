/*
  # User Data and Recordings Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Maps to Supabase auth.users
      - `created_at` (timestamp)
      - `email` (text)
      - `display_name` (text)
    - `recordings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamp)
      - `title` (text)
      - `recording_url` (text)
      - `duration` (integer)

  2. Security
    - Enable RLS on both tables
    - Users can read/write their own data
    - Users can only access their own recordings
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  email text NOT NULL,
  display_name text
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  recording_url text NOT NULL,
  duration integer
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Recording policies
CREATE POLICY "Users can read own recordings"
  ON recordings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings"
  ON recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings"
  ON recordings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings"
  ON recordings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);