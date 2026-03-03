import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Chip, Divider, Box, Typography, Stack, Paper
} from '@mui/material'
import { X } from 'lucide-react'

function formatDate(val) {
    if (!val) return '—'
    try {
        return new Date(val).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    } catch { return val }
}

function InfoCard({ label, value, mono = false }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px',
                transition: 'all 0.2s ease-in-out',
                bgcolor: 'rgba(248, 250, 252, 0.5)',
                '&:hover': {
                    bgcolor: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    borderColor: 'primary.200',
                },
                className: 'dark:bg-white/2 dark:hover:bg-white/5 dark:border-white/5'
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'text.disabled',
                        display: 'block',
                        mb: 0.3,
                        fontSize: '0.65rem'
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        wordBreak: 'break-word',
                        fontFamily: mono ? 'monospace' : 'inherit',
                        color: mono ? 'primary.main' : 'text.primary',
                        fontSize: '0.875rem'
                    }}
                >
                    {value || '—'}
                </Typography>
            </Box>
        </Paper>
    )
}

export function SiteDetailContent({ item, site, onClose }) {
    const s = item || site;
    if (!s) return null;

    return (
        <Box sx={{ p: 3 }}>
            <Stack spacing={2.5}>
                {/* Header info for side panel */}
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'primary.main', display: 'block', mb: 1 }}>
                        Site Identity
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, mb: 1.5 }}>{s.name || '—'}</Typography>
                    <Chip label={s.ocn || s.oCN || '—'} size="small" color="primary" sx={{ fontWeight: 800, fontFamily: 'monospace' }} />
                </Box>

                <Divider />

                <Stack spacing={2}>
                    <InfoCard label="Full Address" value={s.address} />
                    <InfoCard label="Country Context" value={s.countryName} />

                    <Stack direction="row" spacing={2}>
                        <Box flex={1}><InfoCard label="Created" value={formatDate(s.creationTime || s.createdAt)} /></Box>
                        <Box flex={1}><InfoCard label="Modified" value={formatDate(s.lastModificationTime || s.updatedAt)} /></Box>
                    </Stack>
                </Stack>

                <Box sx={{ pt: 4 }}>
                    <button onClick={onClose} className="w-full py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-sm">Dismiss Panel</button>
                </Box>
            </Stack>
        </Box>
    );
}

export default function SiteDetailModal({ open, onClose, item, site }) {
    const s = item || site;
    if (!s) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 4, overflow: 'hidden' },
                className: 'dark:bg-[#1e2436]'
            }}
        >
            <SiteDetailContent item={s} onClose={onClose} />
        </Dialog>
    );
}
