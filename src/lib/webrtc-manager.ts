// (root)/src/lib/webrtc-manager.ts
// import SimplePeer from 'simple-peer';
// @ts-ignore
var SimplePeer = window.SimplePeer;
// only fix i found for global not defined and secure number generator thing (use a cdn)

import { WebRTCSignalingClient, type Peer, type SignalingCallbacks } from './webrtc-signaling';

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface WebRTCManagerCallbacks {
  onRoomCreated?: (roomCode: string) => void;
  onRoomJoined?: (roomCode: string, peers: Peer[]) => void;
  onRoomState?: (peers: Peer[]) => void;
  onRoomClosed?: (reason: string) => void;
  onError?: (error: string) => void;
  onConnected?: (peerId: string, nickname: string) => void;
  onDisconnected?: (peerId: string) => void;
  onData?: (peerId: string, data: any) => void;
}

// @ts-ignore
async function logConnectionType(peer: SimplePeer.Instance) {
  const pc = peer._pc; // Access the underlying RTCPeerConnection

  if (!pc) return;

  const stats = await pc.getStats();
  let selectedCandidatePair = null;

  stats.forEach(report => {
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      selectedCandidatePair = report;
    }
  });

  if (selectedCandidatePair) {
    const localCandidate = stats.get(selectedCandidatePair.localCandidateId);
    const remoteCandidate = stats.get(selectedCandidatePair.remoteCandidateId);

    if (localCandidate && remoteCandidate) {
      console.log('Local candidate type:', localCandidate.candidateType);
      console.log('Remote candidate type:', remoteCandidate.candidateType);

      if (localCandidate.candidateType === 'relay' || remoteCandidate.candidateType === 'relay') {
        console.log('Connection is using a TURN relay.');
      } else {
        console.log('Connection is direct P2P (e.g., host, srflx, prflx).');
      }
    }
  }
}

export class WebRTCManager {
  private stunServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  // ... inside loadTurnServers()
  private ICE_SERVERS = [...this.stunServers];

  private signalingClient: WebRTCSignalingClient;
  // @ts-ignore
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private peerInfo: Map<string, { nickname: string; isHost: boolean }> = new Map();
  private callbacks: WebRTCManagerCallbacks;
  private isHost = false;
  private hostId: string | null = null;
  private myNickname = '';

  constructor(callbacks: WebRTCManagerCallbacks) {
    this.callbacks = callbacks;

    const signalingCallbacks: SignalingCallbacks = {
      // different functions for created and joined for clarity that create tells that you are the host and joined tells 
      // that you are not the host, better for clarity that you can provide different UI for host and non hosts
      onRoomCreated: (roomCode) => {
        console.log('Room created:', roomCode);
        this.isHost = true;
        this.hostId = this.signalingClient.getPeerId();
        this.callbacks.onRoomCreated?.(roomCode);
      },

      onRoomJoined: (roomCode, hostId, peers) => {
        console.log('Room joined:', roomCode);
        this.isHost = false;
        this.hostId = hostId;
        this.callbacks.onRoomJoined?.(roomCode, peers);
      },

      onRoomState: (peers, hostId) => {
        console.log('Room state updated:', peers.length, 'peers');
        this.hostId = hostId;
        this.callbacks.onRoomState?.(peers);

        // Star Topology: Non-hosts initiate connection to the host
        if (!this.isHost && hostId && !this.peers.has(hostId)) {
          const hostPeer = peers.find(p => p.id === hostId);
          if (hostPeer) {
            console.log(`Initiating connection to host: ${hostPeer.nickname}`);
            this.createPeerConnection(hostPeer.id, hostPeer.nickname, true);
          }
        }
      },

      onRoomClosed: (reason) => {
        this.cleanup();
        this.callbacks.onRoomClosed?.(reason);
      },

      onOffer: (fromPeerId, fromNickname, offer) => {
        this.handleOffer(fromPeerId, fromNickname, offer);
      },

      onAnswer: (fromPeerId, _fromNickname, answer) => {
        this.handleAnswer(fromPeerId, answer);
      },

      onError: (error) => {
        this.callbacks.onError?.(error);
      }
    };

    this.signalingClient = new WebRTCSignalingClient(signalingCallbacks);
  }

  /**
   * In Supabase Realtime version, this handles both creating and joining.
   */
  async connect(roomCode: string, nickname: string, isHost: boolean = false): Promise<void> {
    this.myNickname = nickname;
    this.isHost = isHost;

    // Load TURN before any peer is created
    await this.loadTurnServers();

    await this.signalingClient.connect(roomCode, nickname);
  }

  // FIXED: These no longer call signalingClient directly. 
  // They are now just wrappers for connect().
  createRoom(roomCode: string, nickname: string) {
    this.connect(roomCode, nickname, true);
  }

  joinRoom(roomCode: string, nickname: string) {
    this.connect(roomCode, nickname, false);
  }

  handleReceiveData(peerId: string, message: any) { // to make data receiving function variable
    this.callbacks.onData?.(peerId, message);
  }

  private createPeerConnection(peerId: string, nickname: string, initiator: boolean) {
    if (this.peers.has(peerId)) return;

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      config: { iceServers: this.ICE_SERVERS },
      // iceTransportPolicy: "relay" // 🔥 force TURN for debugging
    });

    this.peers.set(peerId, peer);
    this.peerInfo.set(peerId, { nickname, isHost: peerId === this.hostId });

    peer.on('signal', (data) => {
      this.signalingClient.sendSignal(peerId, data, this.myNickname);
    });

    peer.on('connect', () => {
      console.log(`✅ Connected to ${nickname}`);
      logConnectionType(peer);
      this.callbacks.onConnected?.(peerId, nickname);
    });

    peer.on('data', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        console.log(`Low level received data from ${peerId}:\t`, parsed);
        this.handleReceiveData(peerId, parsed);
      } catch (error) {
        console.error('Data error:', error);
      }
    });

    peer.on('error', () => this.removePeer(peerId));
    peer.on('close', () => {
      this.removePeer(peerId);
      this.callbacks.onDisconnected?.(peerId);
    });
  }

  private async loadTurnServers() {
    try {
      const res = await fetch(
        "https://ycnamldhgyhkdbqlwedx.supabase.co/functions/v1/turn-credentials", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });

      if (!res.ok) throw new Error("TURN fetch failed");

      const turnServers: RTCIceServer[] = await res.json();

      // Metered already returns WebRTC-shaped iceServers
      this.ICE_SERVERS = [
        ...this.stunServers,
        ...turnServers
      ];

      console.log("✅ TURN servers loaded");
    } catch (err) {
      console.warn("⚠️ TURN unavailable, using STUN only", err);
    }
  }

  private handleOffer(fromPeerId: string, fromNickname: string, offer: any) {
    if (!this.peers.has(fromPeerId)) {
      this.createPeerConnection(fromPeerId, fromNickname, false);
    }
    this.peers.get(fromPeerId)?.signal(offer);
  }

  private handleAnswer(fromPeerId: string, answer: any) {
    this.peers.get(fromPeerId)?.signal(answer);
  }

  setReady() {
    this.signalingClient.setReady(this.myNickname);
  }

  sendData(data: any, excludePeerId: string | null = null, include: boolean = false) {
    // include true means only send to the excludepeerid while false means send to all with exception for chat-message
    const message = JSON.stringify(data);
    console.log("SENDING TO: ");
    console.log(this.peers);
    console.log("EXCLUDING: ");
    console.log(excludePeerId);
    if (this.isHost && include) {
      let target = this.peers.get(excludePeerId);
      if (!target) {
        this.callbacks.onError("Target not found");
        return;
      }
      if (target.connected) target.send(message); 
      return;
    }
    this.peers.forEach((peer, peerId) => {
      // skip excluded peer (which is expected to be the original sender)
      if (this.isHost && data.type === 'chat-message' && peerId === excludePeerId) return;
      if (peer.connected) peer.send(message);
    });
  }

  private removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
      this.peerInfo.delete(peerId);
    }
  }

  private cleanup() {
    this.peers.forEach(peer => peer.destroy());
    this.peers.clear();
    this.peerInfo.clear();
    this.isHost = false;
    this.hostId = null;
  }

  disconnect() {
    this.cleanup();
    this.signalingClient.disconnect();
  }

  getPeerId(): string {
    return this.signalingClient.getPeerId();
  }
}