'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/AddRounded';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import CategoryIcon from '@mui/icons-material/CategoryRounded';
import CheckIcon from '@mui/icons-material/CheckRounded';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { chartPalette } from '../../lib/theme';
import { plural } from '../../lib/format';
import { PageHeader, SectionCard, EmptyState, StatusChip } from '../components/ui';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  description: string;
  color: string;
  is_active: boolean;
};

type CategoryPreset = {
  id: string;
  key: string;
  name: string;
  description: string;
  version: number;
};

const DEFAULT_COLOR = '#2196F3';

function isHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export default function CategorizationPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  const [categories, setCategories] = useState<Category[]>([]);
  const [presets, setPresets] = useState<CategoryPreset[]>([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('');
  const [overwritePreset, setOverwritePreset] = useState(false);
  const [presetCategories, setPresetCategories] = useState<
    Record<string, { canonical_key: string; name: string; description: string }[]>
  >({});
  const [presetDialogKey, setPresetDialogKey] = useState<string | null>(null);
  const [presetCategoriesLoadingKey, setPresetCategoriesLoadingKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [loadError, setLoadError] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id,name,parent_id,description,color,is_active')
      .order('name', { ascending: true });
    if (error) {
      setLoadError(`Failed to load categories: ${error.message}`);
      setCategories([]);
      return;
    }
    setCategories((data ?? []) as Category[]);
  };

  const loadPresets = async () => {
    const { data, error } = await supabase
      .from('category_presets')
      .select('id,key,name,description,version,is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) {
      setLoadError((prev) => prev || `Failed to load presets: ${error.message}`);
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
      toast.warning('Please enter a category name.');
      return;
    }
    if (!isHex(color)) {
      toast.warning('Colour must be a hex value like #2196F3.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('categories').insert({
      name: name.trim(),
      color,
      description: '',
      parent_id: null,
      is_active: true,
    });
    setBusy(false);
    if (error) {
      toast.error(`Failed to create category: ${error.message}`);
      return;
    }
    setName('');
    setColor(DEFAULT_COLOR);
    setCreateOpen(false);
    await refresh();
    toast.success('Category created.');
  };

  const applyPreset = async () => {
    if (!selectedPresetKey) {
      toast.warning('Please select a preset to apply.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('apply_category_preset', {
      p_preset_key: selectedPresetKey,
      p_overwrite: overwritePreset,
    });
    setBusy(false);
    if (error) {
      toast.error(`Failed to apply preset: ${error.message}`);
      return;
    }
    await refresh();
    toast.success('Preset categories applied.');
  };

  const deleteCategory = async (id: string, catName: string) => {
    const ok = await confirm({
      title: `Delete “${catName}”?`,
      description: 'Any transactions using it will become Uncategorized.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    setBusy(false);
    if (error) {
      toast.error(`Failed to delete category: ${error.message}`);
      return;
    }
    await refresh();
    toast.success('Category deleted.');
  };

  const ensurePresetCategoriesLoaded = async (presetKey: string) => {
    if (presetCategories[presetKey]) return;
    const preset = presets.find((p) => p.key === presetKey);
    if (!preset) return;
    setPresetCategoriesLoadingKey(presetKey);
    const { data, error } = await supabase
      .from('category_preset_categories')
      .select('canonical_key,name,description')
      .eq('preset_id', preset.id)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    setPresetCategoriesLoadingKey(null);
    if (error) {
      toast.error(`Failed to load preset categories: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as { canonical_key: string; name: string; description: string }[];
    setPresetCategories((prev) => ({ ...prev, [presetKey]: rows }));
  };

  const handleViewPresetCategories = async () => {
    if (!selectedPresetKey) {
      toast.warning('Please select a preset to preview.');
      return;
    }
    await ensurePresetCategoriesLoaded(selectedPresetKey);
    setPresetDialogKey(selectedPresetKey);
  };

  const selectedPreset = presets.find((p) => p.key === selectedPresetKey);

  return (
    <Box>
      <PageHeader
        title="Categories"
        description="The labels used to classify transactions. Start from a preset or build your own."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New category
          </Button>
        }
      />

      {loadError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      ) : null}

      {presets.length > 0 ? (
        <SectionCard
          title="Presets"
          description="Load a recommended category set instead of creating everything by hand."
          sx={{ mb: 3 }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' }, gap: 2, alignItems: 'center' }}>
            <FormControl fullWidth size="small">
              <InputLabel id="preset-select-label">Preset</InputLabel>
              <Select
                labelId="preset-select-label"
                label="Preset"
                value={selectedPresetKey}
                onChange={(e) => setSelectedPresetKey(e.target.value)}
                renderValue={(value) => presets.find((p) => p.key === value)?.name ?? ''}
              >
                {presets.map((p) => (
                  <MenuItem key={p.key} value={p.key}>
                    <ListItemText primary={p.name} secondary={`v${p.version} · ${p.description}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <FormControlLabel
                control={<Switch size="small" checked={overwritePreset} onChange={(e) => setOverwritePreset(e.target.checked)} />}
                label={<Typography variant="body2">Overwrite existing</Typography>}
                sx={{ mr: 1 }}
              />
              <Button variant="outlined" color="inherit" onClick={handleViewPresetCategories} disabled={!selectedPresetKey}>
                Preview
              </Button>
              <Button variant="contained" onClick={applyPreset} disabled={busy || !selectedPresetKey}>
                Apply preset
              </Button>
            </Stack>
          </Box>
          {selectedPreset?.description ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              {selectedPreset.description}
            </Typography>
          ) : null}
        </SectionCard>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState
          icon={<CategoryIcon />}
          title="No categories yet"
          description="Apply a preset above or create your first category to start classifying transactions."
          actions={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              New category
            </Button>
          }
        />
      ) : (
        <SectionCard title="Your categories" description={plural(categories.length, 'category', 'categories')}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 1.5 }}>
            {categories.map((c) => (
              <Card
                key={c.id}
                sx={{
                  px: 1.75,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  boxShadow: 'none',
                  transition: 'border-color 120ms ease',
                  '&:hover': { borderColor: alpha(theme.palette.text.primary, 0.2) },
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    flexShrink: 0,
                    bgcolor: isHex(c.color) ? c.color : DEFAULT_COLOR,
                    boxShadow: `0 0 0 3px ${alpha(isHex(c.color) ? c.color : DEFAULT_COLOR, 0.2)}`,
                  }}
                />
                <Typography variant="body2" noWrap sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                  {c.name}
                </Typography>
                <StatusChip status={c.is_active ? 'active' : 'inactive'} />
                <Tooltip title="Delete category">
                  <span>
                    <IconButton size="small" color="inherit" disabled={busy} onClick={() => void deleteCategory(c.id, c.name)} aria-label={`Delete ${c.name}`} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Card>
            ))}
          </Box>
        </SectionCard>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New category</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void createCategory();
              }}
            />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Colour
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {chartPalette.map((swatch) => {
                  const selected = swatch.toLowerCase() === color.toLowerCase();
                  return (
                    <Box
                      key={swatch}
                      role="button"
                      aria-label={`Use colour ${swatch}`}
                      aria-pressed={selected}
                      tabIndex={0}
                      onClick={() => setColor(swatch)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setColor(swatch);
                      }}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: swatch,
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        boxShadow: selected ? `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${swatch}` : 'none',
                        transition: 'transform 100ms ease',
                        '&:hover': { transform: 'scale(1.08)' },
                      }}
                    >
                      {selected ? <CheckIcon sx={{ fontSize: 16 }} /> : null}
                    </Box>
                  );
                })}
              </Stack>
              <TextField
                fullWidth
                size="small"
                label="Hex colour"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                error={color.length > 0 && !isHex(color)}
                helperText={color.length > 0 && !isHex(color) ? 'Use a hex value like #2196F3' : ' '}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', mr: 1, bgcolor: isHex(color) ? color : 'transparent', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
                  ),
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void createCategory()} disabled={busy || !name.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!presetDialogKey} onClose={() => setPresetDialogKey(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {(() => {
            const p = presets.find((preset) => preset.key === presetDialogKey);
            return p ? `${p.name} categories` : 'Preset categories';
          })()}
        </DialogTitle>
        <DialogContent dividers>
          {presetDialogKey && presetCategoriesLoadingKey === presetDialogKey ? (
            <Typography variant="body2" color="text.secondary">
              Loading categories…
            </Typography>
          ) : null}
          {presetDialogKey && presetCategories[presetDialogKey]?.length ? (
            <List dense disablePadding>
              {presetCategories[presetDialogKey]!.map((cat) => (
                <ListItem key={cat.canonical_key} disableGutters>
                  <ListItemText primary={cat.name} secondary={cat.description || undefined} />
                </ListItem>
              ))}
            </List>
          ) : presetDialogKey && presetCategoriesLoadingKey !== presetDialogKey ? (
            <Typography variant="body2" color="text.secondary">
              No categories found for this preset.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogKey(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
