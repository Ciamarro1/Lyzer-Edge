import dotenv from 'dotenv';
import path from 'path';

// Force dotenv to load the .env file from the project root instead of the subproject directory.
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
