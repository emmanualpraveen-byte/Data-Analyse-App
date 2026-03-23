/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { AppState, Dataset, JoinConfig, Dashboard, Report } from "./types";
import { nanoid } from "nanoid";
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc,
  User
} from "./firebase";

interface AppContextType extends AppState {
  user: User | null;
  loading: boolean;
  reports: Report[];
  setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>;
  setJoins: React.Dispatch<React.SetStateAction<JoinConfig[]>>;
  setDashboards: React.Dispatch<React.SetStateAction<Dashboard[]>>;
  setActiveDashboardId: React.Dispatch<React.SetStateAction<string | null>>;
  setStep: React.Dispatch<React.SetStateAction<AppState["step"]>>;
  addDataset: (dataset: Dataset) => Promise<void>;
  removeDataset: (id: string) => Promise<void>;
  updateDataset: (id: string, updates: Partial<Dataset>) => Promise<void>;
  addJoin: (join: JoinConfig) => void;
  addDashboard: (dashboard: Dashboard) => Promise<void>;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => Promise<void>;
  togglePublish: (id: string) => Promise<void>;
  addReport: (report: Report) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [joins, setJoins] = useState<JoinConfig[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);
  const [step, setStep] = useState<AppState["step"]>("upload");

  // Handle Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        // Ensure user document exists in Firestore
        try {
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: "user", // Default role
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("Failed to sync user profile", error);
        }
      } else {
        setDatasets([]);
        setDashboards([]);
        setReports([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Datasets from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "datasets"), where("authorUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Dataset);
      setDatasets(data);
    }, (error) => {
      console.error("Datasets snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Dashboards from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "dashboards"), where("authorUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Dashboard);
      setDashboards(data);
    }, (error) => {
      console.error("Dashboards snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Reports from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "reports"), where("authorUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Report);
      setReports(data);
    }, (error) => {
      console.error("Reports snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const addDataset = async (dataset: Dataset) => {
    if (!user) return;
    const datasetWithAuthor = { ...dataset, authorUid: user.uid };
    await setDoc(doc(db, "datasets", dataset.id), datasetWithAuthor);
  };

  const removeDataset = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "datasets", id));
  };

  const updateDataset = async (id: string, updates: Partial<Dataset>) => {
    if (!user) return;
    const existing = datasets.find(d => d.id === id);
    if (existing) {
      await setDoc(doc(db, "datasets", id), { ...existing, ...updates });
    }
  };

  const addJoin = (join: JoinConfig) => {
    setJoins((prev) => [...prev, join]);
  };

  const addDashboard = async (dashboard: Dashboard) => {
    if (!user) return;
    const dashboardWithAuthor = { ...dashboard, authorUid: user.uid };
    await setDoc(doc(db, "dashboards", dashboard.id), dashboardWithAuthor);
    setActiveDashboardId(dashboard.id);
  };

  const updateDashboard = async (id: string, updates: Partial<Dashboard>) => {
    if (!user) return;
    const d = dashboards.find(dash => dash.id === id);
    if (d) {
      await setDoc(doc(db, "dashboards", id), { ...d, ...updates });
    }
  };

  const togglePublish = async (id: string) => {
    if (!user) return;
    const d = dashboards.find(dash => dash.id === id);
    if (d) {
      await setDoc(doc(db, "dashboards", id), {
        ...d,
        isPublic: !d.isPublic,
        slug: d.slug || nanoid(10),
      });
    }
  };

  const addReport = async (report: Report) => {
    if (!user) return;
    const reportWithAuthor = { ...report, authorUid: user.uid };
    await setDoc(doc(db, "reports", report.id), reportWithAuthor);
  };

  const removeReport = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "reports", id));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        datasets,
        joins,
        dashboards,
        reports,
        activeDashboardId,
        step,
        setDatasets,
        setJoins,
        setDashboards,
        setActiveDashboardId,
        setStep,
        addDataset,
        removeDataset,
        updateDataset,
        addJoin,
        addDashboard,
        updateDashboard,
        togglePublish,
        addReport,
        removeReport,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
