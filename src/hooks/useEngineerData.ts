import { useState, useEffect, useCallback } from "react";
import { apiService } from "../lib/api";
import {
  Engineer, Site, Worker, Duty, Advance, Transaction, Expense,
  BalanceSheet, WorkerProfile, WorkerCategory
} from "../types";

export type {
  Engineer, Site, Worker, Duty, Advance, Transaction, Expense,
  BalanceSheet, WorkerProfile, WorkerCategory
};

// Simplified Hook for backend data management
// Only keeps endpoints that are verified and necessary
export function useEngineerData() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [workerCategories, setWorkerCategories] = useState<WorkerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch only verified core endpoints to avoid 404s
      const [engs, cats, sts, wrks, advs] = await Promise.all([
        apiService.getEngineers().catch(() => []),
        apiService.getWorkerCategories().catch(() => []),
        apiService.getSites().catch(() => []),
        apiService.getWorkers().catch(() => []),
        apiService.getAdvances().catch(() => [])
      ]);
      
      setEngineers(engs);
      setWorkerCategories(cats);
      setSites(sts);
      setWorkers(wrks);
      setAdvances(advs);

    } catch (err) {
      console.error("Critical loading failure:", err);
      setError("Partial data load failed. Please check your backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- API Sync Handlers ---

  const addEngineer = async (data: Partial<Engineer>) => {
    try {
      const newEng = await apiService.createEngineer(data);
      setEngineers(prev => [...prev, newEng]);
      return newEng;
    } catch (err) {
      console.error("Error adding engineer:", err);
      throw err;
    }
  };

  const deleteEngineer = async (id: string) => {
    try {
      await apiService.deleteEngineer(id);
      setEngineers(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error("Error deleting engineer:", err);
    }
  };

  const addSite = async (data: Partial<Site>) => {
    try {
      const newSite = await apiService.createSite(data);
      setSites(prev => [...prev, newSite]);
      return newSite;
    } catch (err) {
      console.error("Error adding site:", err);
      throw err;
    }
  };

  const deleteSite = async (id: string) => {
    try {
      await apiService.deleteSite(id);
      setSites(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Error deleting site:", err);
    }
  };

  const addWorker = async (data: Partial<Worker>) => {
    try {
      const newWorker = await apiService.createWorker(data);
      setWorkers(prev => [...prev, newWorker]);
      return newWorker;
    } catch (err) {
      console.error("Error adding worker:", err);
      throw err;
    }
  };

  const updateWorker = async (id: string, data: Partial<Worker>) => {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
    try {
      const updatedWorker = await apiService.updateWorker(id, data);
      setWorkers(prev => prev.map(w => w.id === id ? updatedWorker : w));
      return updatedWorker;
    } catch (err) {
      console.error("Error updating worker:", err);
      throw err;
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      await apiService.deleteWorker(id);
      setWorkers(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error("Error deleting worker:", err);
    }
  };

  const addAdvance = async (data: Partial<Advance>) => {
    try {
      const newAdv = await apiService.createAdvance(data);
      setAdvances(prev => [...prev, newAdv]);
      return newAdv;
    } catch (err) {
      console.error("Error adding advance:", err);
      throw err;
    }
  };

  const deleteAdvance = async (id: string) => {
    try {
      await apiService.deleteAdvance(id);
      setAdvances(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Error deleting advance:", err);
    }
  };

  return {
    engineers, addEngineer, deleteEngineer,
    sites, addSite, deleteSite,
    workers, addWorker, updateWorker, deleteWorker,
    advances, addAdvance, deleteAdvance,
    workerCategories,
    loading,
    error,
    refreshData: fetchData
  };
}
