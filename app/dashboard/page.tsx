'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  PhoneCall, 
  Calendar, 
  Clock, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  department: string;
  status: 'available' | 'in_consultation' | 'on_leave' | 'off_duty';
}

interface Appointment {
  id: string;
  patient_name: string;
  phone: string;
  source: string;
  status: string;
  created_at: string;
  doctors?: { name: string; department: string };
  doctor_slots?: { slot_start: string };
}

interface CallLog {
  id: string;
  call_id: string;
  phone: string;
  duration_sec: number;
  outcome: string;
  summary: string;
  created_at: string;
}

export default function Dashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'appointments' | 'calls'>('appointments');

  // Load Initial Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [docsRes, apptsRes, logsRes] = await Promise.all([
        supabase.from('doctors').select('*').order('name'),
        supabase
          .from('appointments')
          .select('*, doctors(name, department), doctor_slots(slot_start)')
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('call_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      if (docsRes.data) setDoctors(docsRes.data);
      if (apptsRes.data) setAppointments(apptsRes.data as any);
      if (logsRes.data) setCallLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime Channels
    const channel = supabase
      .channel('hospital_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          // Refresh appointments on any insert or update
          supabase
            .from('appointments')
            .select('*, doctors(name, department), doctor_slots(slot_start)')
            .order('created_at', { ascending: false })
            .limit(25)
            .then(({ data }) => {
              if (data) setAppointments(data as any);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'doctors' },
        (payload) => {
          setDoctors((prev) =>
            prev.map((doc) => (doc.id === payload.new.id ? { ...doc, ...payload.new } : doc))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_logs' },
        (payload) => {
          setCallLogs((prev) => [payload.new as CallLog, ...prev.slice(0, 14)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update Doctor Status
  const updateDoctorStatus = async (id: string, status: Doctor['status']) => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    await supabase.from('doctors').update({ status }).eq('id', id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md">
            +
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              City Hospital · Reception Desk
            </h1>
            <p className="text-xs text-slate-500">Live AI Phone Bookings & Doctor Status</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Realtime WebSocket Sync
          </div>
          <button 
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* Doctor Status Bar */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Live Doctor Presence (AI answers callers based on this)
            </h2>
            <span className="text-xs text-slate-400">Click button to toggle status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.map((doc) => {
              const badgeColors = {
                available: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                in_consultation: 'bg-amber-100 text-amber-800 border-amber-300',
                on_leave: 'bg-rose-100 text-rose-800 border-rose-300',
                off_duty: 'bg-slate-100 text-slate-700 border-slate-300',
              };

              return (
                <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{doc.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{doc.department}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeColors[doc.status]}`}>
                        {doc.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => updateDoctorStatus(doc.id, 'available')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                        doc.status === 'available'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Available
                    </button>
                    <button
                      onClick={() => updateDoctorStatus(doc.id, 'in_consultation')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                        doc.status === 'in_consultation'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Consulting
                    </button>
                    <button
                      onClick={() => updateDoctorStatus(doc.id, 'on_leave')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                        doc.status === 'on_leave'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tab Switcher: Appointments vs Call Logs */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 pt-4 flex gap-6">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'appointments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Incoming Appointments ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'calls'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              AI Call History & Summaries ({callLogs.length})
            </button>
          </div>

          {/* TAB 1: Appointments Table */}
          {activeTab === 'appointments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Patient</th>
                    <th className="py-3.5 px-6">Phone</th>
                    <th className="py-3.5 px-6">Doctor Assigned</th>
                    <th className="py-3.5 px-6">Booked Slot</th>
                    <th className="py-3.5 px-6">Source</th>
                    <th className="py-3.5 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No appointments booked today yet.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          {appt.patient_name}
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-600">
                          +91 {appt.phone}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-slate-800">
                            {appt.doctors?.name || 'Dr. Sharma'}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {appt.doctors?.department || 'Department'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-blue-600">
                          {appt.doctor_slots?.slot_start
                            ? new Date(appt.doctor_slots.slot_start).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : 'Confirmed'}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                            <PhoneCall className="w-3 h-3" />
                            {appt.source}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmed
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Call Logs Feed */}
          {activeTab === 'calls' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Caller Phone</th>
                    <th className="py-3.5 px-6">Duration</th>
                    <th className="py-3.5 px-6">Outcome</th>
                    <th className="py-3.5 px-6">AI Summary</th>
                    <th className="py-3.5 px-6">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {callLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No calls logged yet. Incoming calls handled by Bolna will appear here.
                      </td>
                    </tr>
                  ) : (
                    callLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6 font-mono text-xs font-bold text-slate-800">
                          {log.phone ? `+91 ${log.phone}` : 'Anonymous'}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-600">
                          {log.duration_sec}s
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              log.outcome === 'booked'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.outcome === 'transferred'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.outcome.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-600 max-w-md truncate">
                          {log.summary}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
