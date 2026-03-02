'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { createBrowserSupabaseClient } from '../../lib/supabase';

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  description: string;
  color: string;
  is_active: boolean;
};

type CategoryPreset = {
  key: string;
  name: string;
  description: string;
  version: number;
};

export default function CategorizationPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [presets, setPresets] = useState<CategoryPreset[]>([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('');
  const [overwritePreset, setOverwritePreset] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2196F3');
  const [message, setMessage] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id,name,parent_id,description,color,is_active')
      .order('name', { ascending: true });
    if (error) {
      setMessage(`Failed to load categories: ${error.message}`);
      setCategories([]);
      return;
    }
    setCategories((data ?? []) as Category[]);
  };

  const loadPresets = async () => {
    const { data, error } = await supabase
      .from('category_presets')
      .select('key,name,description,version,is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) {
      if (!message) {
        setMessage(`Failed to load presets: ${error.message}`);
      }
      setPresets([]);
      return;
    }
    const rows = (data ?? []) as (CategoryPreset & { is_active: boolean })[];
    setPresets(rows);
    if (!selectedPresetKey && rows.length > 0) {
      setSelectedPresetKey(rows[0].key);
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      await loadPresets();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCategory = async () => {
    if (!name.trim()) {
      setMessage('Please enter a category name.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { error } = await supabase.from('categories').insert({
      name: name.trim(),
      color,
      description: '',
      parent_id: null,
      is_active: true,
    });
    setBusy(false);
    if (error) setMessage(`Failed to create category: ${error.message}`);
    else {
      setName('');
      await refresh();
      setMessage('Category created.');
    }
  };

  const applyPreset = async () => {
    if (!selectedPresetKey) {
      setMessage('Please select a preset to apply.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { error } = await supabase.rpc('apply_category_preset', {
      p_preset_key: selectedPresetKey,
      p_overwrite: overwritePreset,
    });
    setBusy(false);
    if (error) {
      setMessage(`Failed to apply preset: ${error.message}`);
      return;
    }
    await refresh();
    setMessage('Preset categories applied.');
  };

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Categories
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create and manage categories used for transaction classification.
        </Typography>
      </Box>

      {presets.length > 0 ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Category presets
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Quickly load a recommended category set instead of creating everything manually.
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="preset-select-label">Preset</InputLabel>
                  <Select
                    labelId="preset-select-label"
                    label="Preset"
                    value={selectedPresetKey}
                    onChange={(e) => setSelectedPresetKey(e.target.value)}
                  >
                    {presets.map((p) => (
                      <MenuItem key={p.key} value={p.key}>
                        <Box display="flex" flexDirection="column">
                          <Typography variant="body1">{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            v{p.version} • {p.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={overwritePreset}
                      onChange={(e) => setOverwritePreset(e.target.checked)}
                    />
                  }
                  label="Overwrite existing preset categories"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  onClick={applyPreset}
                  disabled={busy || !selectedPresetKey}
                  fullWidth
                >
                  Apply preset
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : null}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Create category
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                helperText="Hex color"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button variant="contained" onClick={createCategory} disabled={busy} fullWidth>
                Create
              </Button>
            </Grid>
          </Grid>
          {message ? (
            <Alert sx={{ mt: 2 }} severity={message.toLowerCase().includes('failed') ? 'error' : 'info'}>
              {message}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {categories.map((c) => (
          <Grid key={c.id} item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                  <Typography variant="h6">{c.name}</Typography>
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: c.color,
                      border: '1px solid rgba(0,0,0,0.2)',
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {c.is_active ? 'Active' : 'Inactive'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

