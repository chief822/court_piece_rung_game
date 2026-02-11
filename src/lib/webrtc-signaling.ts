import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface Peer {
  id: string;
  nickname: string;
  isHost: boolean;
  joinedAt: number; // Added to determine who was first
}

export interface SignalingCallbacks {
  /** Called when the local peer establishes the room as the host */
  onRoomCreated?: (roomCode: string) => void;

  /** Called when the local peer joins an existing room; hostId is the peerId of the host */
  onRoomJoined?: (roomCode: string, hostId: string) => void;

  /** Called whenever the room state changes; peers is the list of participants, hostId is the peerId of the host */
  onRoomState?: (peers: Peer[], hostId?: string) => void;

  /** Called when the room is closed */
  onRoomClosed?: (reason?: string) => void;

  /** Called when an offer is received from another peer */
  onOffer?: (fromPeerId: string, fromNickname: string, offer: any) => void;

  /** Called when an answer is received from another peer */
  onAnswer?: (fromPeerId: string, fromNickname: string, answer: any) => void;

  /** Called if there’s an error in signaling */
  onError?: (error: any) => void;
}

export class WebRTCSignalingClient {
  private channel: RealtimeChannel | null = null;
  private peerId = crypto.randomUUID();
  private joinedAt = Date.now();
  private callbacks: SignalingCallbacks;
  
  // Local state to track role and room status
  private isHost: boolean = false;
  private currentHostId: string | null = null;

  constructor(callbacks: SignalingCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Connects to a room. Logic merges create/join:
   * 1. If room is empty, this user becomes Host.
   * 2. If room has a Host, this user joins as Guest.
   * 3. If Host leaves, room terminates for all.
   */
  async connect(roomCode: string, nickname: string) {
    this.channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: this.peerId } }
    });

    this.channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload.targetPeerId === this.peerId) {
          if (payload.data.type === 'offer') {
            this.callbacks.onOffer?.(payload.fromPeerId, payload.fromNickname, payload.data);
          } else if (payload.data.type === 'answer') {
            this.callbacks.onAnswer?.(payload.fromPeerId, payload.fromNickname, payload.data);
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel!.presenceState<Peer>();
        const peers = Object.values(state).flat().map((p) => ({
          id: p.id, 
          nickname: p.nickname, 
          isHost: p.isHost,
          joinedAt: p.joinedAt
        }));

        this.handlePresenceSync(peers, roomCode, nickname);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track initial presence. Start as guest; Sync logic will upgrade to Host if needed.
          await this.updatePresence(nickname, false);
        }
      });
  }

  private async handlePresenceSync(peers: Peer[], roomCode: string, nickname: string) {
    // 1. Identify if an explicit Host already exists in the room
    const explicitHosts = peers.filter(p => p.isHost);

    // --- Scenario A: Room Termination Check ---
    // If we had a host previously, but they are gone now, the room is dead.
    if (this.currentHostId) {
      const hostStillHere = peers.find(p => p.id === this.currentHostId);
      if (!hostStillHere) {
        this.disconnect();
        this.callbacks.onRoomClosed?.("Host left the room");
        return;
      }
    }

    // --- Scenario B: Host Election (First Joiner) ---
    // If no one claims to be host yet, we check if WE should be the host.
    if (explicitHosts.length === 0) {
      // Sort by join time to find the 'first' user
      const sortedPeers = peers.sort((a, b) => a.joinedAt - b.joinedAt);
      const firstPeer = sortedPeers[0];

      if (firstPeer && firstPeer.id === this.peerId) {
        // I am the first one! Upgrade myself to Host.
        this.isHost = true;
        this.currentHostId = this.peerId;
        
        // Update presence to reflect I am now the host
        await this.updatePresence(nickname, true);
        
        this.callbacks.onRoomCreated?.(roomCode);
        this.callbacks.onRoomState?.(peers, this.peerId);
      }
      // If I am not the first, I wait for the actual first peer to update their status.
      return;
    }

    // --- Scenario C: Room Ongoing ---
    // A host exists. Update local state and notify UI.
    const host = explicitHosts[0];
    
    // Detect if this is the first time we realized who the host is
    if (this.currentHostId !== host.id) {
        this.currentHostId = host.id;
        
        // If I'm not the host, I've successfully joined someone else's room
        if (host.id !== this.peerId) {
            this.callbacks.onRoomJoined?.(roomCode, host.id);
        }
    }

    this.callbacks.onRoomState?.(peers, host.id);
  }

  private async updatePresence(nickname: string, isHost: boolean) {
    if (!this.channel) return;
    await this.channel.track({ 
      id: this.peerId, 
      nickname, 
      isHost,
      joinedAt: this.joinedAt
    });
  }

  async sendSignal(targetPeerId: string, data: any, nickname: string) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { targetPeerId, fromPeerId: this.peerId, fromNickname: nickname, data }
    });
  }

  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    // Reset state on disconnect
    this.isHost = false;
    this.currentHostId = null;
  }

  getIsHost() { return this.isHost; }
  getPeerId() { return this.peerId; }
}