// What this site offers, from config.js. AI on this site means accounts and the AI service are both switched on;
// without it, AI-only entry points (the tutor, AI roleplay, the AI feedback tab, the Conversations link) are not
// offered at all, and the copy says what is true here (launch FR-03, FR-04). A module of its own, so a view of a new
// release never asks an older, already loaded core module for an export it does not have.
import { configured } from './api.js';
import { CONFIG } from '../../config.js';

export const siteAI = () => configured() && Boolean(CONFIG.aiEnabled);
