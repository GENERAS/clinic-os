-- Convert existing consultation vital_signs from old keys to standardized keys
-- Old: {bp_systolic, bp_diastolic, pulse, spo2}
-- New: {systolic_bp, diastolic_bp, heart_rate, oxygen_saturation}

UPDATE consultations
SET vital_signs = jsonb_strip_nulls(jsonb_build_object(
    'systolic_bp', vital_signs->'bp_systolic',
    'diastolic_bp', vital_signs->'bp_diastolic',
    'heart_rate', vital_signs->'pulse',
    'oxygen_saturation', vital_signs->'spo2',
    'temperature', vital_signs->'temperature',
    'weight', vital_signs->'weight',
    'height', vital_signs->'height',
    'respiratory_rate', vital_signs->'respiratory_rate'
))
WHERE vital_signs ? 'bp_systolic'
   OR vital_signs ? 'bp_diastolic'
   OR vital_signs ? 'pulse'
   OR vital_signs ? 'spo2';
