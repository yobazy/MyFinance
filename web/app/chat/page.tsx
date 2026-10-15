'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NextLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/ArrowUpwardRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import { createBrowserSupabaseClient } from '../../lib/supabase';
import { PageHeader } from '../components/ui';

type Message = { role: 'user' | 'assistant'; content: string };

const STARTERS = [
  'How much did I spend last month?',
  'What are my top spending categories?',
  'Show me my recent transactions',
  'What accounts do I have?',
];

function AssistantAvatar() {
  const theme = useTheme();
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: 2,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        color: 'primary.main',
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
        '& svg': { fontSize: 16 },
      }}
    >
      <AutoAwesomeIcon />
    </Box>
  );
}

function TypingDots() {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        height: 20,
        '@keyframes mf-typing': {
          '0%, 80%, 100%': { opacity: 0.25, transform: 'translateY(0)' },
          '40%': { opacity: 1, transform: 'translateY(-3px)' },
        },
        '& span': {
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: 'text.secondary',
          animation: 'mf-typing 1.2s ease-in-out infinite',
        },
        '& span:nth-of-type(2)': { animationDelay: '0.15s' },
        '& span:nth-of-type(3)': { animationDelay: '0.3s' },
      }}
    >
      <span />
      <span />
      <span />
    </Stack>
  );
}

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
  const canSend = input.trim().length > 0 && !loading;

  return (
    <Box
      sx={{
        maxWidth: 820,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'calc(100vh - 56px - 40px)', md: 'calc(100vh - 140px)' },
        minHeight: 420,
      }}
    >
      <PageHeader
        eyebrow="Insights"
        title="Assistant"
        description="Ask follow-up questions about the data behind your summaries."
        actions={
          <Button component={NextLink} href="/insights" startIcon={<ArrowBackIcon />} color="inherit">
            Summaries
          </Button>
        }
        sx={{ mb: 2 }}
      />

      {/* Message area */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          p: { xs: 1.5, sm: 2.5 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3.5,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.length === 0 && (
          <Stack
            sx={{ flex: 1, py: 4 }}
            alignItems="center"
            justifyContent="center"
            spacing={2}
            textAlign="center"
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.1),
                '& svg': { fontSize: 28 },
              }}
            >
              <AutoAwesomeIcon />
            </Box>
            <Box>
              <Typography variant="h5" component="h2" sx={{ mb: 0.5 }}>
                Ask anything about your finances
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try one of these to get started.
              </Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} useFlexGap sx={{ maxWidth: 520 }}>
              {STARTERS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  variant="outlined"
                  onClick={() => sendMessage(s)}
                  sx={{
                    height: 32,
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                    },
                  }}
                />
              ))}
            </Stack>
          </Stack>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <Stack
              key={idx}
              direction={isUser ? 'row-reverse' : 'row'}
              alignItems="flex-start"
              spacing={1.25}
            >
              {!isUser ? <AssistantAvatar /> : null}
              <Box
                sx={{
                  maxWidth: { xs: '88%', sm: '76%' },
                  px: 1.75,
                  py: 1.25,
                  borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  bgcolor: isUser
                    ? alpha(theme.palette.primary.main, isDark ? 0.22 : 0.1)
                    : alpha(theme.palette.text.primary, isDark ? 0.06 : 0.035),
                  border: `1px solid ${isUser ? alpha(theme.palette.primary.main, 0.22) : theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                  {msg.content}
                </Typography>
              </Box>
            </Stack>
          );
        })}

        {loading && (
          <Stack direction="row" alignItems="flex-start" spacing={1.25}>
            <AssistantAvatar />
            <Box
              sx={{
                px: 1.75,
                py: 1.25,
                borderRadius: '4px 16px 16px 16px',
                bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.035),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <TypingDots />
            </Box>
          </Stack>
        )}
        <div ref={bottomRef} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Composer */}
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1.5 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
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
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3.5,
              pr: 1,
              alignItems: 'flex-end',
            },
          }}
          InputProps={{
            endAdornment: (
              <IconButton
                type="submit"
                disabled={!canSend}
                size="small"
                aria-label="Send message"
                sx={{
                  ml: 1,
                  mb: 0.25,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  color: 'primary.contrastText',
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': {
                    bgcolor: alpha(theme.palette.text.primary, 0.08),
                    color: 'text.disabled',
                  },
                }}
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            ),
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          Answers are based on your imported data. Press Enter to send, Shift+Enter for a new line.
        </Typography>
      </Box>
    </Box>
  );
}
