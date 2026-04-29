import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test for test environment
if (process.env.NODE_ENV === 'test') {
  dotenv.config({
    path: path.resolve(__dirname, '../.env.test'),
  });
}
