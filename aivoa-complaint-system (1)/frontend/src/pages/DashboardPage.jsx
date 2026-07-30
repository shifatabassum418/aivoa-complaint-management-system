import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Paper, Typography, Chip, List, ListItem, ListItemText, Divider } from '@mui/material'
import Topbar from '../components/layout/Topbar'
import apiClient from '../api/apiClient'

function StatCard({ label, value, color = 'primary.main' }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h4" fontWeight={800} sx={{ color, mt: 0.5 }}>{value}</Typography>
    </Paper>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    apiClient.get('/dashboard/stats').then(({ data }) => setStats(data))
  }, [])

  return (
    <Box>
      <Topbar title="Dashboard" />
      <Box sx={{ p: 3 }}>
        {stats && (
          <>
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard label="Total Complaints" value={stats.total_complaints} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard label="Committed to QMS" value={stats.committed_count} color="success.main" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard label="Possible Duplicates" value={stats.duplicate_count} color="error.main" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard label="Avg. Completeness" value={`${Math.round((stats.average_completeness || 0) * 100)}%`} color="warning.main" />
              </Grid>
            </Grid>

            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>By Status</Typography>
                  {Object.entries(stats.by_status || {}).map(([key, val]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                      <Typography variant="body2">{key}</Typography>
                      <Chip label={val} size="small" />
                    </Box>
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>By Suggested Severity</Typography>
                  {Object.entries(stats.by_severity || {}).filter(([k]) => k).map(([key, val]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                      <Typography variant="body2">{key}</Typography>
                      <Chip label={val} size="small" />
                    </Box>
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Recent Complaints</Typography>
                  <List>
                    {stats.recent.map((r, idx) => (
                      <Box key={r.id}>
                        <ListItem
                          button
                          onClick={() => navigate(`/complaints/${r.id}`)}
                          sx={{ borderRadius: 2, cursor: 'pointer' }}
                        >
                          <ListItemText
                            primary={`${r.reference_code} — ${r.product_name || 'Untitled'}`}
                            secondary={new Date(r.created_at).toLocaleString()}
                          />
                          <Chip label={r.status} size="small" />
                        </ListItem>
                        {idx < stats.recent.length - 1 && <Divider component="li" />}
                      </Box>
                    ))}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Box>
  )
}
