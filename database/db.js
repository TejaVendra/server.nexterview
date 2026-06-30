// database/db.js
import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// 1. Direct Prisma 7 folder import 
import { PrismaClient } from '../generated/prisma/default.js';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
  wsEngine: ws,
});

// 2. Initialize client with the custom neon adapter
export const prisma = new PrismaClient({ adapter });