import {
  Dialog,
  Chip,
  Divider,
  Box,
  Typography,
  Stack,
  Paper,
} from "@mui/material";


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

function InfoCard({ label, value, mono = false }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        borderRadius: "12px",
        transition: "all 0.2s ease-in-out",
      }}
      className="bg-slate-50/50 hover:bg-white border border-slate-200 hover:border-pink-200 hover:shadow-sm dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600"
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            textTransform: "",
            letterSpacing: "0.05em",
            display: "block",
            mb: 0.3,
            fontSize: "0.65rem",
          }}
          className="text-slate-500 dark:text-slate-400"
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            wordBreak: "break-word",
            fontFamily: mono ? "monospace" : "inherit",
            fontSize: "0.875rem",
          }}
          className={mono ? "text-pink-600 dark:text-pink-400" : "text-slate-900 dark:text-slate-100"}
        >
          {value || "—"}
        </Typography>
      </Box>
    </Paper>
  );
}

export function SiteDetailContent({ item, site, onClose }) {
  const s = item || site;
  if (!s) return null;

  return (
    <Box sx={{ p: 3 }} className="dark:bg-slate-900">
      <Stack spacing={2.5}>
        {/* Header info for side panel */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: "",
              letterSpacing: 1.5,
              display: "block",
              mb: 1,
            }}
            className="text-pink-600 dark:text-pink-500"
          >
            Site Identity
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1.5 }} className="text-slate-900 dark:text-white">
            {s.name || "—"}
          </Typography>
          <Chip
            label={s.ocn || s.oCN || "—"}
            size="small"
            className="bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 font-bold font-mono"
          />
        </Box>

        <Divider className="dark:border-slate-700" />

        <Stack spacing={2}>
          <InfoCard label="Full Address" value={s.address} />
          <InfoCard label="Country Context" value={s.countryName} />

          <Stack direction="row" spacing={2}>
            <Box flex={1}>
              <InfoCard
                label="Created"
                value={formatDate(s.creationTime || s.createdAt)}
              />
            </Box>
            <Box flex={1}>
              <InfoCard
                label="Modified"
                value={formatDate(s.lastModificationTime || s.updatedAt)}
              />
            </Box>
          </Stack>
        </Stack>

        <Box sx={{ pt: 4 }}>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs hover:bg-white dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-all shadow-sm font-bold"
          >
            Dismiss Panel
          </button>
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
        sx: { borderRadius: 4, overflow: "hidden" },
        className: "dark:bg-slate-900",
      }}
    >
      <SiteDetailContent item={s} onClose={onClose} />
    </Dialog>
  );
}


