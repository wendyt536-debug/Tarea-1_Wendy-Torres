import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type DropdownCategory =
  | "request_type"
  | "line_of_business"
  | "contract_type"
  | "status"
  | "owner"
  | "kp_entity";

let cachedValues: Record<DropdownCategory, string[]> | null = null;
let fetchPromise: Promise<Record<DropdownCategory, string[]>> | null = null;

async function loadDropdownValues(): Promise<Record<DropdownCategory, string[]>> {
  if (cachedValues) return cachedValues;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const { data, error } = await supabase
      .from("dropdown_values")
      .select("category, value")
      .order("sort_order", { ascending: true });

    if (error || !data) {
      console.error("Failed to load dropdown values:", error);
      return {
        request_type: [],
        line_of_business: [],
        contract_type: [],
        status: [],
        owner: [],
        kp_entity: [],
      };
    }

    const grouped: Record<DropdownCategory, string[]> = {
      request_type: [],
      line_of_business: [],
      contract_type: [],
      status: [],
      owner: [],
      kp_entity: [],
    };

    (data as { category: string; value: string }[]).forEach((row) => {
      const cat = row.category as DropdownCategory;
      if (grouped[cat]) {
        grouped[cat].push(row.value);
      }
    });

    cachedValues = grouped;
    return grouped;
  })();

  return fetchPromise;
}

export function useDropdownValues(): {
  values: Record<DropdownCategory, string[]>;
  loading: boolean;
} {
  const [values, setValues] = useState<Record<DropdownCategory, string[]>>(
    cachedValues ?? {
      request_type: [],
      line_of_business: [],
      contract_type: [],
      status: [],
      owner: [],
      kp_entity: [],
    },
  );
  const [loading, setLoading] = useState(!cachedValues);

  useEffect(() => {
    if (cachedValues) {
      setValues(cachedValues);
      setLoading(false);
      return;
    }

    let cancelled = false;
    loadDropdownValues().then((result) => {
      if (!cancelled) {
        setValues(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { values, loading };
}