import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CalendarCheck, Clock, MapPin } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/shared/Button';
import { Badge } from '../components/shared/Badge';

const BookingPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const doctor = location.state?.doctor;
  const recommendation = location.state?.recommendation;

  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [symptoms, setSymptoms] = useState(recommendation?.summary || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Generate next 14 days
  const upcomingDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1); // Start from tomorrow
    return d;
  });

  const getDayName = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!date || !timeSlot) {
      setError('Please select a date and time slot');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/api/appointments/', {
        doctorId: id,
        date,
        timeSlot,
        symptoms,
        aiSummary: recommendation?.summary || '',
        aiReasoning: recommendation?.reasoning || '',
        aiSeverity: recommendation?.severity || 'routine',
        severity: recommendation?.severity || 'routine',
        specialization: doctor?.specialization || recommendation?.recommendedSpecialty || 'General'
      });
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || 'Validation error occurred.');
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Failed to book appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!doctor) {
    return (
      <div className="p-8 text-center bg-background min-h-screen">
        <h2 className="text-2xl font-bold">Doctor not found</h2>
        <Button onClick={() => navigate('/patient/dashboard')} className="mt-4">Back to Dashboard</Button>
      </div>
    );
  }

  // Get available slots from the doctor object (directly registered) with no incorrect hardcoded default array.
  const slots = doctor.availableSlots || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-slate-500 hover:text-primary font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>


        {/* Doctor Info Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-6 mb-8 border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-inner">
            {doctor.name?.charAt(0) || 'D'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{doctor.name}</h1>
            <div className="flex gap-2 items-center mt-2">
              <Badge variant="specialty">{doctor.specialization}</Badge>
              <span className="text-slate-500 text-sm flex items-center"><MapPin className="w-4 h-4 mr-1"/>{doctor.city}</span>
            </div>

            <p className="text-slate-600 mt-2 text-sm">Experience: {doctor.experience || 'Not specified'}</p>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleBooking} className="space-y-8">
          {/* Date Selection */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <CalendarCheck className="w-5 h-5 mr-2 text-primary"/> Select a Date
            </h2>
            <div className="flex overflow-x-auto pb-4 gap-3 snap-x">
              {upcomingDays.map((d, i) => {
                const dateString = d.toISOString().split('T')[0];
                const dayName = getDayName(dateString);
                const isAvailable = !doctor.availableDays || doctor.availableDays.includes(dayName);
                
                return (
                  <div 
                    key={i}
                    onClick={() => isAvailable && setDate(dateString)}
                    className={`snap-center shrink-0 w-24 p-3 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                      !isAvailable 
                        ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' 
                        : date === dateString 
                          ? 'bg-primary border-primary text-white shadow-md scale-105' 
                          : 'bg-white border-slate-200 hover:border-primary hover:bg-primary-light'
                    }`}
                  >
                    <span className={`text-xs font-semibold uppercase ${date === dateString ? 'text-primary-light' : 'text-slate-500'}`}>{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-2xl font-bold my-1">{d.getDate()}</span>
                    <span className={`text-xs ${date === dateString ? 'text-white' : 'text-slate-600'}`}>{dayName.slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary"/> Select a Time
            </h2>
            {slots.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500">
                No time slots available for booking. Please contact the clinic.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {slots.map((slot, i) => (
                  <div 
                    key={i}
                    onClick={() => setTimeSlot(slot)}
                    className={`p-3 rounded-xl border text-center text-sm cursor-pointer transition-all font-medium ${
                      timeSlot === slot 
                        ? 'bg-primary border-primary text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-primary-light'
                    }`}
                  >
                    {slot}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Symptoms Context */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Context for the Doctor</h2>
            <p className="text-sm text-slate-500 mb-4">We've pre-filled this based on your chat. Feel free to add more details.</p>
            <textarea 
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm resize-none bg-slate-50"
              placeholder="Describe your symptoms..."
            />
          </div>

          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

          <Button type="submit" className="w-full py-4 text-base" disabled={loading || !date || !timeSlot}>
            {loading ? 'Confirming...' : 'Confirm Appointment'}
          </Button>
        </form>
      </div>

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center scale-in-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Appointment Confirmed!</h2>
            <p className="text-slate-600 text-sm mb-8">
              You are scheduled to see <strong className="text-slate-800">{doctor.name}</strong> on <br/>
              <strong className="text-slate-800">{new Date(date).toLocaleDateString()} at {timeSlot}</strong>.
            </p>
            <Button className="w-full" onClick={() => navigate('/patient/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
