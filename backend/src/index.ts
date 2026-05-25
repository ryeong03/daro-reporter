import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthRouter } from './api/health';
import { alertRouter } from './api/alert';
import { userRouter } from './api/user';
import { twilioRouter } from './api/twilio-webhook';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://daro-reporter.vercel.app'
  ]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRouter);
app.use('/alert', alertRouter);
app.use('/users', userRouter);
app.use('/twilio', twilioRouter);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'Hero Backend' });
});

app.listen(PORT, () => {
  console.log(`[Hero] Server running on port ${PORT}`);
});

export default app;
