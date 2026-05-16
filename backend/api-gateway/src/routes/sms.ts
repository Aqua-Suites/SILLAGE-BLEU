import { Router } from 'express';
import { SmsService } from '../services/smsService';

export const smsRouter = Router();

// Africa's Talking SMS webhook
smsRouter.post('/incoming', async (req, res, next) => {
  try {
    const { from, text } = req.body as { from: string; text: string };
    if (!from || !text) return res.status(400).send('Missing from/text');

    const reply = await SmsService.handleIncoming(from, text);
    await SmsService.sendSms(from, reply);

    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
});

// USSD callback (Africa's Talking USSD)
smsRouter.post('/ussd', async (req, res, next) => {
  try {
    const { phoneNumber, text } = req.body as { phoneNumber: string; text: string };
    const lastInput = text.split('*').pop() ?? '';

    const reply = await SmsService.handleIncoming(phoneNumber, lastInput || 'START');

    // USSD response format
    const isFinal = reply.includes('submitted') || reply.includes('Cancelled');
    res.set('Content-Type', 'text/plain');
    res.send(`${isFinal ? 'END' : 'CON'} ${reply}`);
  } catch (err) {
    next(err);
  }
});
