import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';

const router = Router();

// List tags
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json({ tags: tags || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Create tag
router.post('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { name, color, description } = req.body;
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, color: color || '#6c5ce7', description: description || '', tenant_id: 'default' })
      .select()
      .single();
    if (error) throw error;
    res.json({ tag: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update tag
router.put('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { name, color, description } = req.body;
    const { data, error } = await supabase
      .from('tags')
      .update({ name, color, description })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ tag: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete tag
router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
