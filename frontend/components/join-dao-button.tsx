'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useClimateDAO } from '@/hooks/use-climate-dao';
import { useWalletContext } from '@/hooks/use-wallet';
import { Users2Icon } from 'lucide-react';

export function JoinDAOButton() {
  const { isConnected } = useWalletContext();
  const { joinDAO, loading } = useClimateDAO();
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoinDAO = async () => {
    try {
      await joinDAO(1); // 1 ALGO membership fee
      setHasJoined(true);
      alert('🎉 Successfully joined the DAO! Member count updated.');
    } catch (error: any) {
      alert('Failed to join DAO: ' + error.message);
    }
  };

  if (!isConnected) return null;
  if (hasJoined) return null;

  return (
    <Button
      onClick={handleJoinDAO}
      disabled={loading}
      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
    >
      <Users2Icon className="w-4 h-4 mr-2" />
      {loading ? 'Joining...' : 'Join DAO (1 ALGO)'}
    </Button>
  );
}
