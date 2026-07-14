const API_BASE = '/military/live';

export interface LiveEvent {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  video_file?: string;
  scheduled_time: string;
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
  started_at?: string;
  ended_at?: string;
}

export const liveApi = {
  // User endpoints
  getUpcoming: async (): Promise<LiveEvent[]> => {
    const res = await fetch(`${API_BASE}/upcoming/`);
    if (!res.ok) throw new Error('Failed to fetch upcoming lives');
    return res.json();
  },
  
  getLiveNow: async (): Promise<LiveEvent[]> => {
    const res = await fetch(`${API_BASE}/live-now/`);
    if (!res.ok) throw new Error('Failed to fetch current lives');
    return res.json();
  },

  getEnded: async (): Promise<LiveEvent[]> => {
    const res = await fetch(`${API_BASE}/ended/`);
    if (!res.ok) throw new Error('Failed to fetch ended lives');
    return res.json();
  },
  
  getCountdown: async (id: string) => {
    const res = await fetch(`${API_BASE}/countdown/${id}/`);
    if (!res.ok) throw new Error('Failed to fetch countdown');
    return res.json();
  },

  getStatus: async (id: string): Promise<{status: string}> => {
    const res = await fetch(`${API_BASE}/status/${id}/`);
    if (!res.ok) throw new Error('Failed to check status');
    return res.json();
  },

  getStreamUrl: async (id: string): Promise<{video_url: string}> => {
    const res = await fetch(`${API_BASE}/stream/${id}/`);
    if (!res.ok) throw new Error('Failed to get stream URL');
    return res.json();
  },

  joinStream: async (live_id: string, viewer_name: string = "Anonymous") => {
    const res = await fetch('/military/viewer/join/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ live_id, viewer_name })
    });
    if (!res.ok) throw new Error('Failed to join stream');
    return res.json();
  },

  // Admin endpoints
  createLive: async (formData: FormData) => {
    // Note: Assuming backend handles file upload via multipart/form-data
    const res = await fetch(`${API_BASE}/`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to create live event');
    return res.json();
  },

  startLive: async (id: string) => {
    const res = await fetch(`${API_BASE}/${id}/start/`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start live');
    return res.json();
  },

  endLive: async (id: string) => {
    const res = await fetch(`${API_BASE}/${id}/end/`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to end live');
    return res.json();
  },

  getViewers: async (id: string) => {
    // Assuming backend takes a query param for live_id to filter viewers
    const res = await fetch(`/military/viewers/?live_id=${id}`);
    if (!res.ok) throw new Error('Failed to fetch viewers');
    return res.json();
  }
};
