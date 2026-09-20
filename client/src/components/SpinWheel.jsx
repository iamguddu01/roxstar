import React, { useRef, useEffect, useState } from 'react';
import './SpinWheel.css';

export const WHEEL_REWARDS = [
  { id: 1, label: '100 Coins', color: '#f59e0b', textColor: '#ffffff' },
  { id: 2, label: 'Mystery Gift', color: '#8b5cf6', textColor: '#ffffff' },
  { id: 3, label: 'Free Spin', color: '#06b6d4', textColor: '#ffffff' },
  { id: 4, label: '250 Coins', color: '#10b981', textColor: '#ffffff' },
  { id: 5, label: 'Crown', color: '#ec4899', textColor: '#ffffff' },
  { id: 6, label: 'Jackpot', color: '#ef4444', textColor: '#ffffff' },
  { id: 7, label: '50 Coins', color: '#3b82f6', textColor: '#ffffff' },
  { id: 8, label: 'Double 2X', color: '#f97316', textColor: '#ffffff' },
];

export default function SpinWheel({
  isSpinning,
  currentSpinner,
  onSpinRequest,
  spinEvent,
  canSpin,
}) {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const animationFrameRef = useRef(null);
  const [winnerCelebration, setWinnerCelebration] = useState(null);

  const easeOutQuart = (t) => 1 - --t * t * t * t;

  const drawWheel = (rotationAngle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 16;

    ctx.clearRect(0, 0, width, height);

    const totalSlices = WHEEL_REWARDS.length;
    const arc = (2 * Math.PI) / totalSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotationAngle * Math.PI) / 180);

    // Draw Slices
    for (let i = 0; i < totalSlices; i++) {
      const slice = WHEEL_REWARDS[i];
      const startAngle = i * arc;
      const endAngle = startAngle + arc;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = slice.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      // Label
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = slice.textColor;
      ctx.font = 'bold 14px -apple-system, sans-serif';
      ctx.fillText(slice.label, radius - 20, 0);
      ctx.restore();
    }

    // Outer wheel border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // Center Hub
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('SPIN', 0, 0);

    ctx.restore();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, []);

  useEffect(() => {
    if (!spinEvent) return;

    const { targetAngle, duration = 5000, sliceIndex } = spinEvent;
    const startAngle = rotationRef.current % 360;
    const finalAngle = rotationRef.current + targetAngle;
    const startTime = performance.now();

    setWinnerCelebration(null);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const currentAngle = startAngle + (finalAngle - startAngle) * easedProgress;
      rotationRef.current = currentAngle;
      drawWheel(currentAngle);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = finalAngle;
        drawWheel(finalAngle);

        const winningReward = WHEEL_REWARDS[sliceIndex] || WHEEL_REWARDS[0];
        setWinnerCelebration({
          reward: winningReward,
          spinner: spinEvent.spinnerUsername,
        });
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [spinEvent]);

  return (
    <div className="wheel-container">
      <div className="wheel-stage">
        {/* Top pointer */}
        <div className="wheel-pointer"></div>

        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="wheel-canvas"
        />
      </div>

      {winnerCelebration && (
        <div className="winner-alert">
          <span className="winner-name">{winnerCelebration.spinner}</span> won{' '}
          <strong className="winner-prize">{winnerCelebration.reward.label}</strong>!
        </div>
      )}

      <div className="wheel-controls">
        <button
          className="btn btn-primary spin-action-btn"
          onClick={onSpinRequest}
          disabled={!canSpin || isSpinning}
        >
          {isSpinning ? (
            currentSpinner
              ? `${currentSpinner.username || currentSpinner.spinnerUsername} is spinning...`
              : 'Spinning...'
          ) : (
            'Spin Wheel'
          )}
        </button>
      </div>
    </div>
  );
}
