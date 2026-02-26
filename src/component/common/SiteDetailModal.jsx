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

export default function SiteDetailModal({ open, onClose, item, site }) {
    const s = item || site
    if (!s) return null

    const isActive = s.status === 'Active'

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 },
                className: 'dark:bg-[#1e2436]'
            }}
        >
            {/* ── Header ─────────────────────────────────────────── */}
            <DialogTitle
                sx={{
                    p: 0,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ px: 3, py: 2.5 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Icon + label row */}
                            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'primary.main' }}>
                                    Site Details
                                </Typography>
                            </Stack>

                            {/* Site name */}
                            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2, mb: 1 }} noWrap>
                                {s.name || '—'}
                            </Typography>

                            {/* OCN + Status chips */}
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                <Chip
                                    label={s.ocn || s.oCN || '—'}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontWeight: 800,
                                        fontSize: '0.65rem',
                                        height: 20,
                                        borderColor: 'primary.200',
                                        bgcolor: 'primary.50',
                                        color: 'primary.700',
                                        '& .MuiChip-label': { px: 1 }
                                    }}
                                />
                                {/* <Chip
                                    icon={isActive
                                        ? <CheckCircle2 size={10} style={{ color: 'inherit' }} />
                                        : <XCircle size={10} style={{ color: 'inherit' }} />}
                                    label={s.status || 'Unknown'}
                                    size="small"
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: '0.65rem',
                                        textTransform: 'uppercase',
                                        height: 20,
                                        bgcolor: isActive ? 'success.50' : 'slate.50',
                                        color: isActive ? 'success.700' : 'slate.600',
                                        border: '1px solid',
                                        borderColor: isActive ? 'success.200' : 'slate.200',
                                        '& .MuiChip-label': { px: 1 },
                                        '& .MuiChip-icon': { ml: 0.5, mr: -0.5 }
                                    }}
                                /> */}
                            </Stack>
                        </Box>

                        <IconButton onClick={onClose} size="small" sx={{ mt: 0.5 }}>
                            <X size={18} />
                        </IconButton>
                    </Stack>
                </Box>
            </DialogTitle>

            {/* ── Body ───────────────────────────────────────────── */}
            <DialogContent sx={{ px: 3, py: 2.5 }}>
                <Stack spacing={1.5}>
                    <InfoCard label="OCN" value={s.ocn || s.oCN} mono />
                    <InfoCard label="Country" value={s.countryName} />
                    <InfoCard label="Address" value={s.address} />

                    <Divider sx={{ my: 0.5 }} />

                    <Stack direction="row" gap={1.5}>
                        <Box sx={{ flex: 1 }}>
                            <InfoCard label="Created At" value={formatDate(s.creationTime || s.createdAt)} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <InfoCard label="Last Updated" value={formatDate(s.lastModificationTime || s.updatedAt)} />
                        </Box>
                    </Stack>
                </Stack>
            </DialogContent>

            {/* ── Footer ─────────────────────────────────────────── */}
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                    Close
                </button>
            </DialogActions>
        </Dialog>
    )
}
