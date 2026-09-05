import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, Clock, Users, X, Info, Sliders } from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const DAYS_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // New Schedule State
  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState('STANDARD_40H');
  const [days, setDays] = useState([
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', breakHours: 1.0 },
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', breakHours: 1.0 },
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', breakHours: 1.0 },
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', breakHours: 1.0 },
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', breakHours: 1.0 },
  ]);

  useEffect(() => {
    fetchSchedules();
  }, []);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const res = await api.get('/schedules');
      setSchedules(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate preview weekly hours
  function calculatePreviewWeekly() {
    return days.reduce((sum, d) => {
      const [sH, sM] = d.startTime.split(':').map(Number);
      const [eH, eM] = d.endTime.split(':').map(Number);
      const raw = (eH + eM / 60) - (sH + sM / 60);
      return sum + Math.max(0, raw - (parseFloat(d.breakHours) || 0));
    }, 0);
  }

  async function handleCreateSchedule(e) {
    e.preventDefault();
    try {
      await api.post('/schedules', {
        name,
        scheduleType,
        days,
      });
      setShowModal(false);
      setName('');
      fetchSchedules();
    } catch (err) {
      alert(err.message || 'Failed to create schedule');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="Working Schedules"
        subtitle="Standardized Working Hours & Shift Patterns"
        breadcrumbs={[{ label: 'Schedules' }]}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/attendance" className="btn-secondary text-xs flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#714B67]" />
              <span>Attendance Policy &amp; Thresholds</span>
            </Link>
            <button onClick={() => setShowModal(true)} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>New Schedule</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Info Banner */}
        <div className="bg-teal-50/70 border border-teal-200 p-3.5 rounded-lg flex items-start gap-3 text-xs text-teal-900">
          <Info className="w-4 h-4 text-[#00A09D] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#00A09D]">Automatic Hour Computation:</span> The system automatically derives weekly hours by subtracting break time from shift intervals. Manual hour overrides are prevented to ensure attendance and overtime calculations are accurate.
          </div>
        </div>

        {/* Schedules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schedules.map((sched) => (
            <div key={sched.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{sched.name}</h3>
                  <span className="text-[11px] text-slate-500">{sched.scheduleType}</span>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-[#714B67] font-mono">
                    {sched.weeklyHours}h / week
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {sched._count?.employees || 0} Staff Assigned
                  </span>
                </div>
              </div>

              <div className="p-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="pb-1.5">Day</th>
                      <th className="pb-1.5">Shift Time</th>
                      <th className="pb-1.5">Break</th>
                      <th className="pb-1.5 text-right">Daily Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sched.scheduleDays?.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-2 font-medium text-slate-800">{DAYS_NAME[d.dayOfWeek]}</td>
                        <td className="py-2 font-mono text-slate-600">{d.startTime} - {d.endTime}</td>
                        <td className="py-2 text-slate-500">{d.breakHours}h</td>
                        <td className="py-2 text-right font-mono font-semibold text-teal-700">{d.dailyHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* CREATE SCHEDULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-xl w-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-[#2C3E50]">Configure Working Schedule</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Schedule Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flexible 40h Shift"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Schedule Type</label>
                  <input
                    type="text"
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">Days & Shifts (Mon - Fri)</label>
                  <span className="font-mono font-bold text-teal-700 text-xs">
                    Auto Weekly Total: {calculatePreviewWeekly()}h
                  </span>
                </div>

                <div className="space-y-2 border border-slate-200 rounded p-2.5 bg-slate-50">
                  {days.map((d, index) => (
                    <div key={d.dayOfWeek} className="flex items-center gap-3 bg-white p-2 rounded border border-slate-200 text-xs">
                      <span className="w-24 font-medium text-slate-800">{DAYS_NAME[d.dayOfWeek]}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">In:</span>
                        <input
                          type="time"
                          value={d.startTime}
                          onChange={(e) => {
                            const copy = [...days];
                            copy[index].startTime = e.target.value;
                            setDays(copy);
                          }}
                          className="border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Out:</span>
                        <input
                          type="time"
                          value={d.endTime}
                          onChange={(e) => {
                            const copy = [...days];
                            copy[index].endTime = e.target.value;
                            setDays(copy);
                          }}
                          className="border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Break:</span>
                        <input
                          type="number"
                          step="0.5"
                          value={d.breakHours}
                          onChange={(e) => {
                            const copy = [...days];
                            copy[index].breakHours = e.target.value;
                            setDays(copy);
                          }}
                          className="w-14 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-center"
                        />
                        <span className="text-slate-400">h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline text-xs">
                  Discard
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Working Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
