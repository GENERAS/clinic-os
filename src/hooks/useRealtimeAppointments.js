import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClinicStore } from "@/stores/clinicStore";
import { fetchUsers, enrichUser } from "@/lib/supabase/users";

function mapAppointment(row) {
  const d = enrichUser(row.doctor_id);
  const c = enrichUser(row.created_by);
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    patient_name: row.patient_name,
    patient_phone: row.patient_phone,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    created_by: row.created_by,
    appointment_date: row.appointment_date,
    start_time: row.start_time,
    end_time: row.end_time,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    source: row.source || "receptionist",
    created_at: row.created_at,
    updated_at: row.updated_at,
    doctor: d || null,
    doctor_name: d?.full_name || "",
    creator: c || null,
  };
}

export function useRealtimeAppointments(clinicId) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("connecting");
  const appointmentsRef = useRef(new Map());
  const channelRef = useRef(null);
  const setAppointmentsInStore = useClinicStore((s) => s.setAppointments);
  const setLoadingInStore = useClinicStore((s) => s.setLoading);
  const setRealtimeStatusInStore = useClinicStore((s) => s.setRealtimeStatus);

  const syncStore = useCallback((apts, load, st) => {
    setAppointmentsInStore(apts);
    setLoadingInStore(load);
    setRealtimeStatusInStore(st);
  }, [setAppointmentsInStore, setLoadingInStore, setRealtimeStatusInStore]);

  const mergeAppointment = useCallback((row) => {
    const apt = mapAppointment(row);
    appointmentsRef.current.set(apt.id, apt);
    const arr = Array.from(appointmentsRef.current.values());
    setAppointments(arr);
    syncStore(arr, false, "connected");
  }, [syncStore]);

  const removeAppointment = useCallback((id) => {
    appointmentsRef.current.delete(id);
    const arr = Array.from(appointmentsRef.current.values());
    setAppointments(arr);
    syncStore(arr, false, "connected");
  }, [syncStore]);

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      setStatus("disconnected");
      syncStore([], false, "disconnected");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setStatus("error");
      setLoading(false);
      syncStore([], false, "error");
      return;
    }

    let mounted = true;

    const fetchInitial = async () => {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;
        if (!mounted) return;

        const ids = new Set();
        (data || []).forEach((r) => {
          if (r.doctor_id) ids.add(r.doctor_id);
          if (r.created_by) ids.add(r.created_by);
        });
        await fetchUsers(clinicId, [...ids]);

        const map = new Map();
        (data || []).forEach((row) => {
          map.set(row.id, mapAppointment(row));
        });
        appointmentsRef.current = map;
        const arr = Array.from(map.values());
        setAppointments(arr);
        setLoading(false);
        setStatus("connected");
        syncStore(arr, false, "connected");
      } catch {
        if (mounted) {
          setLoading(false);
          setStatus("error");
          syncStore([], false, "error");
        }
      }
    };

    fetchInitial();

    const channel = supabase
      .channel(`appointments:${clinicId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          if (mounted) {
            const row = payload.new;
            const ids = [];
            if (row.doctor_id) ids.push(row.doctor_id);
            if (row.created_by) ids.push(row.created_by);
            fetchUsers(clinicId, ids);
            mergeAppointment(row);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          if (mounted) {
            const row = payload.new;
            const ids = [];
            if (row.doctor_id) ids.push(row.doctor_id);
            if (row.created_by) ids.push(row.created_by);
            fetchUsers(clinicId, ids);
            mergeAppointment(row);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "appointments",
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          if (mounted) {
            removeAppointment(payload.old.id);
          }
        }
      )
      .subscribe((subStatus) => {
        if (!mounted) return;
        let newStatus;
        if (subStatus === "SUBSCRIBED") newStatus = "connected";
        else if (subStatus === "CHANNEL_ERROR") newStatus = "error";
        else if (subStatus === "TIMED_OUT") newStatus = "reconnecting";
        if (newStatus) {
          setStatus(newStatus);
          syncStore(appointmentsRef.current.size > 0 ? Array.from(appointmentsRef.current.values()) : [], false, newStatus);
        }
      });

    channelRef.current = channel;

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [clinicId, mergeAppointment, removeAppointment, syncStore]);

  return { appointments, loading, status };
}
