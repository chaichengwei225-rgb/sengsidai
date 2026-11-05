import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ deadline, status, onExpire, compact = false }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    if (status !== 'pending') {
      setTimeLeft(prev => ({ ...prev, isExpired: true }));
      return;
    }

    const calculate = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) {
          onExpire();
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [deadline, status, onExpire]);

  if (status === 'approved') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium text-emerald-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>已通过冷静期审定</span>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium text-rose-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
        <span>已成功劝退驳回</span>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium text-amber-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        <Clock className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span>冷静期已结束·正在计算</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono font-medium text-amber-700 bg-amber-100/70 border border-amber-200/80 rounded-full px-2.5 py-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
      <Clock className={`animate-spin-slow ${compact ? "w-3.5 h-3.5" : "w-4 h-4"} text-amber-600`} />
      <span>冷静期还剩 {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
    </div>
  );
}
