import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Trophy, Play, Clock, Star, AlertCircle, Layers } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBanCheck } from '@/hooks/useBanCheck';
import { CopyableId } from '@/components/CopyableId';

interface GameScore {
  id: string;
  user_id: string;
  score: number;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
    display_number: number;
    system_id: string | null;
  };
}

interface TileState {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// 32 unique emojis for 8x8 grid (32 pairs = 64 tiles)
const ALL_EMOJIS = [
  '🎓', '📚', '💡', '🎯', '🏆', '🎨', '🎵', '⚡',
  '🔥', '⭐', '🌟', '💎', '🎮', '🎲', '🃏', '🎪',
  '🎭', '🎬', '🚀', '🌈', '🦁', '🐉', '🧩', '🎸',
  '🏀', '⚽', '🎳', '🧲', '🔮', '🪐', '🌺', '🍕',
];

const TOTAL_PAIRS = 32;
const GRID_COLS = 8;

export default function Game() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isBanned, loading: banLoading } = useBanCheck('games');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'played_today'>('idle');
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [flippedTiles, setFlippedTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  useEffect(() => {
    if (!banLoading && isBanned) {
      toast.error('You are banned from playing games');
      navigate('/');
      return;
    }
    fetchLeaderboard();
    if (user) {
      fetchPersonalBest();
      checkPlayedToday();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  const fetchLeaderboard = async () => {
    const { data: scoresData, error: scoresError } = await supabase
      .from('game_scores').select('*').eq('game_type', 'memory')
      .order('score', { ascending: false }).limit(10);

    if (scoresError) return;

    const userIds = [...new Set(scoresData.map(s => s.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles').select('user_id, full_name, avatar_url, display_number, system_id')
      .in('user_id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
    setLeaderboard(scoresData.map(score => ({ ...score, profiles: profilesMap.get(score.user_id) || undefined })));
  };

  const fetchPersonalBest = async () => {
    const { data } = await supabase
      .from('game_scores').select('score').eq('user_id', user?.id).eq('game_type', 'memory')
      .order('score', { ascending: false }).limit(1).single();
    if (data) setPersonalBest(data.score);
  };

  const checkPlayedToday = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('game_scores').select('id').eq('user_id', user.id).eq('game_type', 'memory')
      .gte('created_at', today).limit(1);
    if (data && data.length > 0) { setHasPlayedToday(true); setGameState('played_today'); }
  };

  const initializeGame = () => {
    if (hasPlayedToday) { toast.error('You can only play once per day!'); return; }
    const emojis = ALL_EMOJIS.slice(0, TOTAL_PAIRS);
    const shuffledEmojis = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji, isFlipped: false, isMatched: false }));
    setTiles(shuffledEmojis);
    setFlippedTiles([]);
    setMoves(0);
    setMatchedCount(0);
    setElapsedTime(0);
    setCombo(0);
    setMaxCombo(0);
    setStartTime(Date.now());
    setGameState('playing');
  };

  const handleTileClick = (id: number) => {
    if (gameState !== 'playing' || flippedTiles.length === 2) return;
    if (tiles[id].isFlipped || tiles[id].isMatched) return;

    const newTiles = [...tiles];
    newTiles[id].isFlipped = true;
    setTiles(newTiles);
    const newFlipped = [...flippedTiles, id];
    setFlippedTiles(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (tiles[first].emoji === tiles[second].emoji) {
        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        setTimeout(() => {
          const matchedTiles = [...tiles];
          matchedTiles[first].isMatched = true;
          matchedTiles[second].isMatched = true;
          setTiles(matchedTiles);
          setFlippedTiles([]);
          const newMatchedCount = matchedCount + 1;
          setMatchedCount(newMatchedCount);
          if (newMatchedCount === TOTAL_PAIRS) handleWin();
        }, 300);
      } else {
        setCombo(0);
        setTimeout(() => {
          const resetTiles = [...tiles];
          resetTiles[first].isFlipped = false;
          resetTiles[second].isFlipped = false;
          setTiles(resetTiles);
          setFlippedTiles([]);
        }, 700);
      }
    }
  };

  const handleWin = async () => {
    setGameState('won');
    setHasPlayedToday(true);
    const optimalMoves = TOTAL_PAIRS;
    // Harsh scoring — 500+ is near impossible with 32 pairs
    const timeBonus = Math.max(0, Math.floor(120 * Math.exp(-elapsedTime / 45)));
    const moveEfficiency = Math.max(0, 1 - ((moves - optimalMoves) / (optimalMoves * 0.5)));
    const moveBonus = Math.floor(150 * Math.pow(Math.max(0, moveEfficiency), 3));
    const comboBonus = Math.floor((maxCombo / TOTAL_PAIRS) * 100);
    const perfectBonus = (moves === optimalMoves && elapsedTime <= 60) ? 200 : 0;
    const score = Math.min(1000, 50 + timeBonus + moveBonus + comboBonus + perfectBonus);

    if (user) {
      const { error } = await supabase.from('game_scores').insert({
        user_id: user.id, game_type: 'memory', score,
        played_at: new Date().toISOString().split('T')[0],
      });
      if (!error) { toast.success(`Score saved: ${score} points!`); fetchLeaderboard(); fetchPersonalBest(); }
    } else {
      toast.success(`You scored ${score} points! Sign in to save your score.`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = TOTAL_PAIRS > 0 ? (matchedCount / TOTAL_PAIRS) * 100 : 0;

  return (
    <AppLayout>
      <PageHeader title="Mini-Game" subtitle="Memory Tiles Challenge" />

      <div className="px-4 py-4 space-y-4">
        {/* Game Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2 text-center shadow-soft">
            <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold">{formatTime(elapsedTime)}</p>
            <p className="text-[10px] text-muted-foreground">Time</p>
          </Card>
          <Card className="p-2 text-center shadow-soft">
            <Star className="w-4 h-4 mx-auto text-secondary mb-1" />
            <p className="text-sm font-bold">{moves}</p>
            <p className="text-[10px] text-muted-foreground">Moves</p>
          </Card>
          <Card className="p-2 text-center shadow-soft">
            <div className="text-lg mb-0">🔥</div>
            <p className="text-sm font-bold">{combo}</p>
            <p className="text-[10px] text-muted-foreground">Combo</p>
          </Card>
          <Card className="p-2 text-center shadow-soft">
            <Trophy className="w-4 h-4 mx-auto text-warning mb-1" />
            <p className="text-sm font-bold">{personalBest || '-'}</p>
            <p className="text-[10px] text-muted-foreground">Best</p>
          </Card>
        </div>

        {/* Progress bar during play */}
        {gameState === 'playing' && (
          <Card className="p-3 shadow-soft">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">{matchedCount}/{TOTAL_PAIRS} pairs matched</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </Card>
        )}

        {/* Game Board */}
        <Card className="p-2 shadow-soft">
          {gameState === 'idle' ? (
            <div className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-4 animate-bounce-light">
                <Gamepad2 className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">Memory Tiles</h3>
              <p className="text-muted-foreground mb-1">Match all <strong>{TOTAL_PAIRS} pairs</strong> on an 8×8 grid!</p>
              <p className="text-sm text-warning mb-2">⚠️ You can only play once per day</p>
              <p className="text-xs text-muted-foreground mb-6">Test your memory skills!</p>
              <Button size="lg" className="rounded-full bg-gradient-primary shadow-primary" onClick={initializeGame}>
                <Play className="w-5 h-5 mr-2" /> Play Now
              </Button>
            </div>
          ) : gameState === 'played_today' ? (
            <div className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">Come Back Tomorrow!</h3>
              <p className="text-muted-foreground mb-4">You've already played today.</p>
              {personalBest != null && <Badge variant="outline" className="text-lg">Your Best: {personalBest} pts</Badge>}
            </div>
          ) : gameState === 'won' ? (
            <div className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-success" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">Congratulations! 🎉</h3>
              <p className="text-muted-foreground mb-2">Completed in {formatTime(elapsedTime)} with {moves} moves</p>
              <p className="text-sm text-muted-foreground mb-2">Max Combo: {maxCombo} | Pairs: {TOTAL_PAIRS}</p>
              <p className="text-sm text-warning">Come back tomorrow!</p>
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {tiles.map((tile) => (
                <button key={tile.id} onClick={() => handleTileClick(tile.id)}
                  className={`aspect-square rounded-md text-base sm:text-lg flex items-center justify-center transition-all duration-300 ${
                    tile.isFlipped || tile.isMatched ? 'bg-primary text-primary-foreground scale-95' : 'bg-muted hover:bg-muted/80'
                  } ${tile.isMatched ? 'opacity-40 scale-90' : ''}`}>
                  {tile.isFlipped || tile.isMatched ? tile.emoji : '?'}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Public Leaderboard */}
        <Card className="p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="font-display font-bold">Leaderboard</h3>
          </div>
          
          {leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No scores yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((score, index) => (
                <div key={score.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${index === 0 ? 'bg-warning/10' : index === 1 ? 'bg-muted/80' : index === 2 ? 'bg-muted/60' : 'bg-muted'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-warning text-warning-foreground' : index === 1 ? 'bg-border' : index === 2 ? 'bg-border' : 'bg-border'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </span>
                    <div>
                      <span className="font-medium text-sm">
                        {score.profiles?.system_id || 'Player'}
                      </span>
                      {score.profiles?.system_id && (
                        <CopyableId id={score.profiles.system_id} prefix="" className="ml-1" />
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">{score.score} pts</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
