import { LiveClass } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:9000/military').replace(/\/+$/, "");

const mapLiveClass = (item: any): LiveClass => {
  let scheduled_time = item.scheduled_time;
  if (!scheduled_time && item.live_date && item.start_time) {
    scheduled_time = `${item.live_date}T${item.start_time}`;
  }
  return {
    ...item,
    scheduled_time: scheduled_time,
    duration_minutes: item.duration_minutes || item.duration || 30,
  };
};

export const localLiveClassService = {
  getAll: async (): Promise<LiveClass[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/list/`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      const list: any[] = Array.isArray(data) ? data : (data.results || data.data || Object.values(data) || []);

      const mappedList: LiveClass[] = list.map(mapLiveClass);

      return mappedList.sort(
        (a, b) =>
          new Date(a.scheduled_time || 0).getTime() -
          new Date(b.scheduled_time || 0).getTime()
      );
    } catch (err) {
      console.error('API Error (getAll):', err);
      return [];
    }
  },

  getUpcoming: async (): Promise<LiveClass[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/upcoming/`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) return [];
      const data = await response.json();
      const list: any[] = Array.isArray(data) ? data : (data.results || data.data || []);
      return list.map(mapLiveClass);
    } catch (err) {
      return [];
    }
  },

  getLiveNow: async (): Promise<LiveClass[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/live-now/`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) return [];
      const data = await response.json();
      const list: any[] = Array.isArray(data) ? data : (data.results || data.data || []);
      return list.map(mapLiveClass);
    } catch (err) {
      return [];
    }
  },

  getEnded: async (): Promise<LiveClass[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/ended/`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) return [];
      const data = await response.json();
      const list: any[] = Array.isArray(data) ? data : (data.results || data.data || []);
      return list.map(mapLiveClass);
    } catch (err) {
      return [];
    }
  },

  search: async (query: string): Promise<LiveClass[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/search/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ query, q: query }) // Sending both just in case Django expects one or the other
      });
      if (!response.ok) return [];
      const data = await response.json();
      const list: any[] = Array.isArray(data) ? data : (data.results || data.data || []);
      return list.map(mapLiveClass);
    } catch (err) {
      return [];
    }
  },



  create: async (
    liveClass: Omit<LiveClass, 'id' | 'created_at' | 'video_url'>,
    file?: File | null,
    videoUrl?: string
  ): Promise<LiveClass | null> => {
    try {
      const formData = new FormData();
      formData.append('title', liveClass.title);
      formData.append('description', liveClass.description || '');

      // Extract date and time from the ISO scheduled_time string
      const dateObj = new Date(liveClass.scheduled_time);
      const live_date = dateObj.toISOString().split('T')[0];
      const start_time = dateObj.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

      formData.append('live_date', live_date);
      formData.append('start_time', start_time);
      // Django backend strictly enforces an IntegerField for duration.
      // We must round it to avoid a 400 Bad Request error.
      formData.append('duration', String(Math.round(liveClass.duration_minutes || 30)));
      // Let Django assign its own default status by omitting it from the request

      if (file) {
        formData.append('original_video', file);
      }

      if (videoUrl) {
        formData.append('video_url', videoUrl);
      }
      // Using /live/upload/ as the endpoint to create a new live class with video
      const response = await fetch(`${API_BASE_URL}/live/upload/`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Django validation error details:", errorData);
        throw new Error(`Failed to create video: ${JSON.stringify(errorData)}`);
      }
      return await response.json();
    } catch (err) {
      console.error('API Error (create):', err);
      return null;
    }
  },

  update: async (
    id: string,
    updates: Partial<LiveClass>
  ): Promise<LiveClass | null> => {
    try {
      const payload: any = { ...updates };

      // Convert scheduled_time back to live_date and start_time for Django
      if (updates.scheduled_time) {
        const dateObj = new Date(updates.scheduled_time);
        payload.live_date = dateObj.toISOString().split('T')[0];
        payload.start_time = dateObj.toTimeString().split(' ')[0].slice(0, 5);
        delete payload.scheduled_time;
      }

      if (updates.duration_minutes !== undefined) {
        payload.duration = Math.round(updates.duration_minutes);
        delete payload.duration_minutes;
      }

      const response = await fetch(`${API_BASE_URL}/live/edit/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        console.error("Django Update Error:", errData);
        throw new Error(errData ? JSON.stringify(errData) : 'Failed to update video');
      }
      return await response.json();
    } catch (err: any) {
      console.error('API Error (update):', err);
      throw err;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/delete/${id}/`, {
        method: 'DELETE',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      return response.ok;
    } catch (err) {
      console.error('API Error (delete):', err);
      return false;
    }
  },

  getVideoUrl: async (id: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/stream/${id}/`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!response.ok) {
        console.error("Failed to fetch stream details");
        return null;
      }
      const data = await response.json();
      // The backend returns { title, stream_url, thumbnail, status }
      return data.stream_url || null;
    } catch (err) {
      console.error('API Error (getVideoUrl):', err);
      return null;
    }
  },

  revokeVideoUrl: (url: string): void => {
    // No longer needed since we use real URLs instead of blob URLs
  },

  viewerJoin: async (classId: string, userEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewer/join/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ class_id: classId, user_email: userEmail }),
      });
      return response.ok;
    } catch (err) {
      console.error('API Error (viewerJoin):', err);
      return false;
    }
  },

  forceStart: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/start/${id}/`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      return response.ok;
    } catch (err) {
      console.error('API Error (forceStart):', err);
      return false;
    }
  },

  forceEnd: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/end/${id}/`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      return response.ok;
    } catch (err) {
      console.error('API Error (forceEnd):', err);
      return false;
    }
  },

  changeStatus: async (id: string, status: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/live/change-status/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ status }),
      });
      return response.ok;
    } catch (err) {
      console.error('API Error (changeStatus):', err);
      return false;
    }
  },

  getDashboardStats: async (): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error('API Error (getDashboardStats):', err);
      return null;
    }
  },

  getViewerList: async (classId?: string): Promise<any[]> => {
    try {
      // Assuming it expects class_id as a query param, or we can just fetch and filter.
      // We will try query param first.
      const url = classId ? `${API_BASE_URL}/viewer/list/?class_id=${classId}` : `${API_BASE_URL}/viewer/list/`;
      const response = await fetch(url, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : (data.results || data.data || []);
    } catch (err) {
      console.error('API Error (getViewerList):', err);
      return [];
    }
  },

  kickViewer: async (viewerId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/viewer/delete/${viewerId}/`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      return response.ok;
    } catch (err) {
      console.error('API Error (kickViewer):', err);
      return false;
    }
  }
};
