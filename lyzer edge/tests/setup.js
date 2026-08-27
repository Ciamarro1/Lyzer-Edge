import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

process.env.COURT_SECRET_KEY = process.env.COURT_SECRET_KEY || 'lyzer_hf_spaces_default_key';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';
process.env.OFF_PEAK_TRG_FLOOR = '0.48';
