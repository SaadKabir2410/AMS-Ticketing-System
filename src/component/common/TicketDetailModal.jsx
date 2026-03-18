import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Divider,
  Box,
  Typography,
  Stack,
  Paper,
} from "@mui/material";
import {
  X,
  Clock,
  User,
  Calendar,
  Hash,
  Building2,
  CheckCircle2,
  Layers,
} from "lucide-react";

function formatDate(val) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return val;
  }
}

function InfoCard({ icon: IconElement, label, value, mono = false }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px",
        transition: "all 0.2s ease-in-out",
        bgcolor: "rgba(248, 250, 252, 0.5)",
        "&:hover": {
          bgcolor: "white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
          borderColor: "primary.200",
        },
        className: "dark:bg-white/2 dark:hover:bg-white/5 dark:border-white/5",
      }}
    >
      <Box
        sx={{
          mt: 0.3,
          p: 0.8,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background:
            "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)",
          color: "primary.main",
          border: "1px solid",
          borderColor: "primary.100",
        }}
      >
        <IconElement size={14} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            textTransform: "",
            letterSpacing: "0.05em",
            color: "text.disabled",
            display: "block",
            mb: 0.3,
            fontSize: "0.65rem",
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            wordBreak: "break-word",
            fontFamily: mono ? "monospace" : "inherit",
            color: mono ? "primary.main" : "text.primary",
            fontSize: "0.875rem",
          }}
        >
          {value || "—"}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function TicketDetailModal({ open, onClose, item, ticket }) {
  const t = item || ticket;
  if (!t) return null;

  const statusColors = {
    Open: { bg: "error.50", text: "error.700", border: "error.200" },
    "In Progress": {
      bg: "warning.50",
      text: "warning.700",
      border: "warning.200",
    },
    Closed: { bg: "success.50", text: "success.700", border: "success.200" },
  };
  const style = statusColors[t.status] || statusColors.Open;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
        className: "dark:bg-[#1e2436]",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <DialogTitle
        sx={{ p: 0, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={2}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <Box
                  sx={{
                    p: 0.8,
                    borderRadius: 1.5,
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "#fff",
                    display: "flex",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                  }}
                >
                  <Layers size={16} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "",
                    letterSpacing: 1.5,
                    color: "text.disabled",
                  }}
                >
                  Ticket Details
                </Typography>
              </Stack>

              <Typography
                variant="h6"
                sx={{ fontWeight: 900, lineHeight: 1.2, mb: 1.5 }}
                noWrap
                title={t.siteName}
              >
                {t.siteName || "—"}
              </Typography>

              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip
                  label={t.ticketNo || "—"}
                  size="small"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: 800,
                    fontSize: "0.65rem",
                    height: 20,
                    borderColor: "primary.200",
                    bgcolor: "primary.50",
                    color: "primary.700",
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
                <Chip
                  label={t.status || "Unknown"}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.65rem",
                    textTransform: "",
                    height: 20,
                    bgcolor: style.bg,
                    color: style.text,
                    border: "1px solid",
                    borderColor: style.border,
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
                {t.pre && (
                  <Chip
                    label="PRE"
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      height: 20,
                      bgcolor: "purple.50",
                      color: "purple.700",
                      border: "1px solid",
                      borderColor: "purple.200",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                )}
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
          <Stack direction="row" gap={1.5}>
            <Box sx={{ flex: 1 }}>
              <InfoCard icon={Building2} label="Site Name" value={t.siteName} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <InfoCard icon={Hash} label="Site OCN" value={t.siteOcn} mono />
            </Box>
          </Stack>

          <InfoCard icon={Hash} label="Ticket Number" value={t.ticketNo} mono />

          <Stack direction="row" gap={1.5}>
            <Box sx={{ flex: 1 }}>
              <InfoCard icon={User} label="Created By" value={t.createdBy} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <InfoCard
                icon={User}
                label="Closed By"
                value={t.ticketClosedBy}
              />
            </Box>
          </Stack>

          <Divider sx={{ my: 0.5 }} />

          <Stack direction="row" gap={1.5}>
            <Box sx={{ flex: 1 }}>
              <InfoCard
                icon={Calendar}
                label="Received At"
                value={formatDate(t.receivedAt)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <InfoCard
                icon={Clock}
                label="Total Duration"
                value={t.totalDuration ? `${t.totalDuration} hrs` : "—"}
              />
            </Box>
          </Stack>

          <Stack direction="row" gap={1.5}>
            <Box sx={{ flex: 1 }}>
              <InfoCard
                icon={CheckCircle2}
                label="CMS Closed On"
                value={formatDate(t.cmsTicketClosedOn)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <InfoCard
                icon={Clock}
                label="Service Closed"
                value={formatDate(t.serviceClosedDate)}
              />
            </Box>
          </Stack>
        </Stack>
      </DialogContent>

      {/* ── Footer ─────────────────────────────────────────── */}
      <DialogActions
        sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}
      >
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          Close
        </button>
      </DialogActions>
    </Dialog>
  );
}
