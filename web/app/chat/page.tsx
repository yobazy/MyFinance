'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import AppShell from '../components/AppShell';

type Message = { role: 'user' | 'assistant'; content: string };

const STARTERS = [
  'How much did I spend last month?',
  'What are my top spending categories?',
  'Show me my recent transactions',
  'What accounts do I have?',
];

export default function ChatPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const userMessage: Message = { role: 'user', content: text.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Request failed');
        setMessages([...newMessages, { role: 'assistant', content: body.reply }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        // Remove optimistic user message on failure
        setMessages(messages);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, supabase],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isDark = theme.palette.mode === 'dark';

  return (
    <AppShell>
      <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <SmartToyIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Finance Assistant
          </Typography>
        </Box>

        {/* Message area */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            minHeight: 0,
          }}
        >
          {messages.length === 0 && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, py: 4 }}>
              <SmartToyIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
              <Typography color="text.secondary" variant="body1">
                Ask anything about your finances
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 480 }}>
                {STARTERS.map((s) => (
                  <Box
                    key={s}
                    onClick={() => sendMessage(s)}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'text.secondary',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06), borderColor: 'primary.main', color: 'primary.main' },
                    }}
                  >
                    {s}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.25,
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isUser ? 'primary.main' : isDark ? 'grey.800' : 'grey.100',
                    color: isUser ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <SmartToyIcon sx={{ fontSize: 18 }} />}
                </Box>
                <Box
                  sx={{
                    maxWidth: '78%',
                    px: 2,
                    py: 1.25,
                    borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    bgcolor: isUser
                      ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.1)
                      : isDark
                      ? 'grey.900'
                      : 'grey.50',
                    border: `1px solid ${isUser ? alpha(theme.palette.primary.main, 0.2) : theme.palette.divider}`,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}
                  >
                    {msg.content}
                  </Typography>
                </Box>
              </Box>
            );
          })}

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: isDark ? 'grey.800' : 'grey.100',
                }}
              >
                <SmartToyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </Box>
              <Box sx={{ px: 2, py: 1.25, borderRadius: '4px 16px 16px 16px', bgcolor: isDark ? 'grey.900' : 'grey.50', border: `1px solid ${theme.palette.divider}` }}>
                <CircularProgress size={14} thickness={5} />
              </Box>
            </Box>
          )}
          <div ref={bottomRef} />
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Input */}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask about your spending, accounts, or transactions…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    disabled={!input.trim() || loading}
                    size="small"
                    color="primary"
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>
    </AppShell>
  );
}
