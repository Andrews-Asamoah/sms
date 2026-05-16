"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchoolClass {
  id: string;
  name: string;
  order?: number;
}

export interface SchoolDepartment {
  id: string;
  name: string;
  code?: string;
}

export interface SchoolHouse {
  id: string;
  name: string;
  code?: string;
}

export interface FeeItem {
  id: string;
  name: string;
  amount: number;
}

interface SchoolDataContextState {
  classes: SchoolClass[];
  departments: SchoolDepartment[];
  houses: SchoolHouse[];
  feeItems: FeeItem[];
  loading: Record<string, boolean>;
  fetchClasses: () => Promise<SchoolClass[]>;
  fetchDepartments: () => Promise<SchoolDepartment[]>;
  fetchHouses: () => Promise<SchoolHouse[]>;
  fetchFeeItems: () => Promise<FeeItem[]>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SchoolDataContext = createContext<SchoolDataContextState>({
  classes: [],
  departments: [],
  houses: [],
  feeItems: [],
  loading: {},
  fetchClasses: async () => [],
  fetchDepartments: async () => [],
  fetchHouses: async () => [],
  fetchFeeItems: async () => [],
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SchoolDataProvider({ children }: { children: ReactNode }) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [departments, setDepartments] = useState<SchoolDepartment[]>([]);
  const [houses, setHouses] = useState<SchoolHouse[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);

  // Track fetching state to prevent duplicate parallel requests
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // ── Lazy fetchers (Only fetch if array is empty and not currently loading) ──

  const fetchClasses = useCallback(async () => {
    if (classes.length > 0) return classes;
    if (loading.classes) return classes; // Wait for active request if any

    setLoading((prev) => ({ ...prev, classes: true }));
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/classes`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        return data;
      }
    } catch {
      console.error("Failed to fetch classes");
    } finally {
      setLoading((prev) => ({ ...prev, classes: false }));
    }
    return [];
  }, [schoolSlug, classes, loading.classes]);

  const fetchDepartments = useCallback(async () => {
    if (departments.length > 0) return departments;
    if (loading.departments) return departments;

    setLoading((prev) => ({ ...prev, departments: true }));
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
        return data;
      }
    } catch {
      console.error("Failed to fetch departments");
    } finally {
      setLoading((prev) => ({ ...prev, departments: false }));
    }
    return [];
  }, [schoolSlug, departments, loading.departments]);

  const fetchHouses = useCallback(async () => {
    if (houses.length > 0) return houses;
    if (loading.houses) return houses;

    setLoading((prev) => ({ ...prev, houses: true }));
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/houses`);
      if (res.ok) {
        const data = await res.json();
        setHouses(data);
        return data;
      }
    } catch {
      console.error("Failed to fetch houses");
    } finally {
      setLoading((prev) => ({ ...prev, houses: false }));
    }
    return [];
  }, [schoolSlug, houses, loading.houses]);

  const fetchFeeItems = useCallback(async () => {
    if (feeItems.length > 0) return feeItems;
    if (loading.feeItems) return feeItems;

    setLoading((prev) => ({ ...prev, feeItems: true }));
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/finance/fee-item-registry`);
      if (res.ok) {
        const data = await res.json();
        setFeeItems(data);
        return data;
      }
    } catch {
      console.error("Failed to fetch fee items");
    } finally {
      setLoading((prev) => ({ ...prev, feeItems: false }));
    }
    return [];
  }, [schoolSlug, feeItems, loading.feeItems]);

  return (
    <SchoolDataContext.Provider
      value={{
        classes,
        departments,
        houses,
        feeItems,
        loading,
        fetchClasses,
        fetchDepartments,
        fetchHouses,
        fetchFeeItems,
      }}
    >
      {children}
    </SchoolDataContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSchoolData() {
  return useContext(SchoolDataContext);
}
