import { supabase } from "@/integrations/supabase/client";

interface GameSave {
  wallet: number;
  income: number;
  buildings: number[];
  playerX: number;
  playerZ: number;
}

export async function saveToCloud(userId: string, data: GameSave) {
  const { error } = await supabase
    .from("game_saves")
    .upsert({
      user_id: userId,
      wallet: data.wallet,
      income: data.income,
      buildings: data.buildings,
      player_x: data.playerX,
      player_z: data.playerZ,
    }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function loadFromCloud(userId: string): Promise<GameSave | null> {
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    wallet: Number(data.wallet),
    income: Number(data.income),
    buildings: data.buildings as number[],
    playerX: data.player_x,
    playerZ: data.player_z,
  };
}
