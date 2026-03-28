'use client';

export interface MemberData {
  address: string;
  joined_at: number;
  last_seen: number;
}

class MemberTracker {
  // Use Neon-backed route in the server
  async registerMember(address: string): Promise<boolean> {
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      if (!res.ok) {
        throw new Error('Member API error');
      }

      const data = await res.json();
      return !!data?.isNew;
    } catch (error) {
      console.warn('Neon members unavailable, fallback to localStorage', error);
      return this.fallbackRegister(address);
    }
  }

  async getMemberCount(): Promise<number> {
    try {
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error('Member API error');
      const { count } = await res.json();
      return Number(count || 0);
    } catch (error) {
      console.warn('Neon members unavailable, fallback to localStorage', error);
      return this.fallbackGetCount();
    }
  }

  async getActiveMemberCount(): Promise<number> {
    // Value not supported in DB route yet; using full member count
    return this.getMemberCount();
  }

  private fallbackRegister(address: string): boolean {
    const members = this.getLocalMembers();
    const existing = members.find(m => m.address === address);

    if (!existing) {
      members.push({ address, joined_at: Date.now(), last_seen: Date.now() });
      localStorage.setItem('climate_dao_members', JSON.stringify(members));
      return true;
    }
    return false;
  }

  private fallbackGetCount(): number {
    return this.getLocalMembers().length;
  }

  private getLocalMembers(): MemberData[] {
    try {
      const stored = localStorage.getItem('climate_dao_members');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

export const memberTracker = new MemberTracker();
