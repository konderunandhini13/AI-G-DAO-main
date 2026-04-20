'use client';

export interface MemberData {
  address: string;
  joinedAt: number;
}

const LS_KEY = 'dao_member_count';
const LS_MEMBERS_KEY = 'dao_registered_members';

class MemberTrackerService {
  // Read persisted count from localStorage immediately (no async)
  getCachedCount(): number {
    try {
      return parseInt(localStorage.getItem(LS_KEY) || '0', 10);
    } catch {
      return 0;
    }
  }

  private setCachedCount(count: number) {
    try {
      localStorage.setItem(LS_KEY, String(count));
    } catch {}
  }

  // Track registered addresses locally so re-registering the same wallet doesn't inflate count
  private getRegisteredMembers(): string[] {
    try {
      return JSON.parse(localStorage.getItem(LS_MEMBERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private addRegisteredMember(address: string): boolean {
    try {
      const members = this.getRegisteredMembers();
      if (members.includes(address)) return false; // already registered
      members.push(address);
      localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(members));
      return true;
    } catch {
      return false;
    }
  }

  async removeMember(address: string): Promise<void> {
    try {
      // Remove from local cache
      const members = this.getRegisteredMembers().filter(a => a !== address);
      localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(members));
      const newCount = Math.max(0, this.getCachedCount() - 1);
      this.setCachedCount(newCount);

      // Remove from DB
      const response = await fetch('/api/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await response.json();
      const count = data.count ?? newCount;
      this.setCachedCount(count);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('member-count-updated', { detail: { count } }));
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  }

  async registerMember(address: string): Promise<boolean> {
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      const data = await response.json()
      // Always use server count — never do local math
      if (typeof data.count === 'number') {
        this.setCachedCount(data.count)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('member-count-updated', { detail: { count: data.count } }))
        }
      }
      return data.isNew || false
    } catch (error) {
      console.error('Error registering member:', error)
      return false
    }
  }

  async getMemberCount(): Promise<number> {
    try {
      const response = await fetch('/api/members')
      const data = await response.json()
      const serverCount = data.count || 0
      this.setCachedCount(serverCount)
      return serverCount
    } catch (error) {
      console.error('Error getting member count:', error)
      return this.getCachedCount()
    }
  }
}

export const memberTracker = new MemberTrackerService();
