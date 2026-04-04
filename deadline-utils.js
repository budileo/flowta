/**
 * deadline-utils.js — Dynamic Deadline Calculator for Flowta
 * 
 * Calculates real-time deadline status based on:
 *   waktu_mulai  = createdAt (ISO datetime)
 *   waktu_target = dueDate   (ISO datetime or date string)
 *   waktu_sekarang = NOW
 *
 * Returns object with: { status, label, text, color, level }
 */

window.calcDeadline = function(createdAt, dueDate) {
    // Default (no due date set)
    if (!dueDate) {
        return {
            status: 'TIDAK ADA',
            label: 'Tidak Ditentukan',
            text: 'Tidak Ditentukan',
            color: 'slate',
            level: 0
        };
    }

    const now = new Date();
    const target = new Date(dueDate);
    const start = createdAt ? new Date(createdAt) : now;

    // Validate dates
    if (isNaN(target.getTime())) {
        return { status: 'TIDAK ADA', label: 'Tanggal Invalid', text: 'Tanggal Invalid', color: 'slate', level: 0 };
    }

    // 1. HITUNG WAKTU
    const sisaMs = target - now;          // remaining milliseconds
    const totalMs = target - start;       // total duration from start to target
    const terpakaiMs = now - start;       // time already used

    // 2. KONVERSI KE JAM
    const sisaJam = sisaMs / (1000 * 60 * 60);
    const totalJam = totalMs / (1000 * 60 * 60);

    // Progress percentage (0-100)
    const persenWaktu = totalJam > 0 ? Math.min(100, Math.max(0, (terpakaiMs / (totalJam * 3600000)) * 100)) : 100;

    let timeText = '';
    const absSisaJam = Math.abs(sisaJam);
    const hari = Math.floor(absSisaJam / 24);
    const jam = Math.floor(absSisaJam % 24);

    if (hari > 0 && jam > 0) {
        timeText = `${hari}H ${jam}J`;
    } else if (hari > 0) {
        timeText = `${hari}H`;
    } else if (jam > 0) {
        timeText = `${jam}J`;
    } else {
        const menit = Math.floor(Math.abs(sisaMs) / 60000);
        timeText = menit > 0 ? `${menit}M` : '0M';
    }

    let status, color, level, bg, kanbanText, pulse = false;

    if (sisaJam > 12) {
        status = 'SANGAT AMAN';
        color = 'emerald';
        level = 1;
        bg = 'linear-gradient(135deg, #d4f8e8, #b7efd5)';
        kanbanText = '#065f46';
    } else if (sisaJam > 6) {
        status = 'AMAN';
        color = 'sky';
        level = 2;
        bg = 'linear-gradient(135deg, #bbf7d0, #86efac)';
        kanbanText = '#064e3b';
    } else if (sisaJam > 2) {
        status = 'WARNING';
        color = 'amber';
        level = 3;
        bg = 'linear-gradient(135deg, #fef9c3, #fde68a)';
        kanbanText = '#78350f';
    } else if (sisaJam >= -4) {
        status = 'TERLAMBAT';
        color = 'orange';
        level = 4;
        bg = 'linear-gradient(135deg, #fecaca, #fca5a5)';
        kanbanText = '#7f1d1d';
    } else {
        status = 'SANGAT TERLAMBAT';
        color = 'rose';
        level = 5;
        bg = 'linear-gradient(135deg, #ef4444, #b91c1c)';
        kanbanText = '#ffffff';
        pulse = true;
    }

    const text = `${status}, ${timeText}`;

    return {
        status,
        label: timeText,
        text,
        color,
        level,
        kanbanBg: bg,
        kanbanText,
        pulse,
        persenWaktu:  Math.round(persenWaktu),
        sisaJam:      Math.round(sisaJam * 10) / 10
    };
};
