import { Router } from 'express';
import { z } from 'zod';
import { CONTACTS } from '../data/contacts.js';
const searchSchema = z.object({
    query: z.string().trim().optional()
});
const router = Router();
router.get('/', (req, res) => {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const searchTerm = parsed.data.query?.toLowerCase() ?? '';
    const results = CONTACTS.filter(contact => contact.name.toLowerCase().indexOf(searchTerm) !== -1).slice(0, 20);
    res.json({ results });
});
export default router;
