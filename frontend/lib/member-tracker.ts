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

  async registerMember(address: string): Promise<boolean> {
    try {
      // Check locally first — if already registered, just return current count
      const isNewLocally = this.addRegisteredMember(address);
      if (isNewLocally) {
        // Increment cached count immediately before API call
        const newCount = this.getCachedCount() + 1;
        this.setCachedCount(newCount);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('member-count-updated', { detail: { count: newCount } }));
        }
      } else {
        // Already registered — just fire event with current cached count
        const count = this.getCachedCount();
        if (typeof window !== 'undefined' && count > 0) {
          window.dispatchEvent(new CustomEvent('member-count-updated', { detail: { count } }));
        }
      }

      // Still call API in background to keep server in sync
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const data = await response.json();

      // If server count is higher (e.g. other users joined), update cache
      if (data.count && data.count > this.getCachedCount()) {
        this.setCachedCount(data.count);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('member-count-updated', { detail: { count: data.count } }));
        }
      }

      return data.isNew || false;
    } catch (error) {
      console.error('Error registering member:', error);
      return false;
    }
  }

  async getMemberCount(): Promise<number> {
    try {
      const response = await fetch('/api/members');
      const data = await response.json();
      const serverCount = data.count || 0;
      // Use whichever is higher — server may reset but local cache persists
      const count = Math.max(serverCount, this.getCachedCount());
      this.setCachedCount(count);
      return count;
    } catch (error) {
      console.error('Error getting member count:', error);
      return this.getCachedCount();
    }
  }
}

export const memberTracker = new MemberTrackerService();
