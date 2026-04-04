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

    // Human-readable time remaining/overdue
    let timeText = '';
    const absSisaJam = Math.abs(sisaJam);
    const hari = Math.floor(absSisaJam / 24);
    const jam = Math.floor(absSisaJam % 24);

    if (hari > 0 && jam > 0) {
        timeText = `${hari} Hari, ${jam} Jam`;
    } else if (hari > 0) {
        timeText = `${hari} Hari`;
    } else if (jam > 0) {
        timeText = `${jam} Jam`;
    } else {
        // Less than 1 hour
        const menit = Math.floor(Math.abs(sisaMs) / 60000);
        timeText = menit > 0 ? `${menit} Menit` : 'Sekarang';
    }

    // 3. STATUS TENGGAT
    let status, label, color, level;

    if (sisaJam > 12) {
        status = 'SANGAT AMAN';
        label = `${timeText} Tersisa`;
        color = 'emerald';
        level = 1;
    } else if (sisaJam > 6) {
        status = 'AMAN';
        label = `${timeText} Tersisa`;
        color = 'sky';
        level = 2;
    } else if (sisaJam > 2) {
        status = 'WARNING';
        label = `${timeText} Tersisa`;
        color = 'amber';
        level = 3;
    } else if (sisaJam >= -4) {
        if (sisaJam >= 0) {
            status = 'TERLAMBAT';
            label = `${timeText} Tersisa`;
        } else {
            status = 'TERLAMBAT';
            label = `Lebih ${timeText}`;
        }
        color = 'orange';
        level = 4;
    } else {
        status = 'SANGAT TERLAMBAT';
        label = `Lebih ${timeText}`;
        color = 'rose';
        level = 5;
    }

    // Compose final text: "STATUS, detail"
    const text = `${status}, ${label}`;

    return {
        status,       // e.g. "SANGAT AMAN", "WARNING", "TERLAMBAT"
        label,        // e.g. "6 Hari, 3 Jam Tersisa" or "Lebih 1 Hari, 8 Jam"
        text,         // Combined: "SANGAT AMAN, 6 Hari, 3 Jam Tersisa"
        color,        // Tailwind color key: emerald, sky, amber, orange, rose
        level,        // 1-5 severity
        persenWaktu:  Math.round(persenWaktu),
        sisaJam:      Math.round(sisaJam * 10) / 10
    };
};
