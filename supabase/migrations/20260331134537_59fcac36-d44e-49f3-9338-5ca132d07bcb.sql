-- Create game_saves table
CREATE TABLE public.game_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet BIGINT NOT NULL DEFAULT 500,
  income BIGINT NOT NULL DEFAULT 0,
  buildings INTEGER[] NOT NULL DEFAULT '{}',
  player_x REAL NOT NULL DEFAULT 0,
  player_z REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

-- Users can only access their own saves
CREATE POLICY "Users can view their own save" ON public.game_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own save" ON public.game_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own save" ON public.game_saves FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own save" ON public.game_saves FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_game_saves_updated_at
  BEFORE UPDATE ON public.game_saves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();