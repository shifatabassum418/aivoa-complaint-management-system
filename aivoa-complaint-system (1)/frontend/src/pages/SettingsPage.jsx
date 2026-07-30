import { useDispatch, useSelector } from 'react-redux'
import { Box, Paper, Typography, Switch, FormControlLabel, Divider, Button, Stack } from '@mui/material'
import Topbar from '../components/layout/Topbar'
import { toggleDarkMode } from '../store/slices/uiSlice'
import { exportCsv, exportExcel } from '../api/exportApi'

export default function SettingsPage() {
  const dispatch = useDispatch()
  const darkMode = useSelector((state) => state.ui.darkMode)
  const user = useSelector((state) => state.auth.user)

  return (
    <Box>
      <Topbar title="Settings" />
      <Box sx={{ p: 3, maxWidth: 640 }}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Profile</Typography>
          <Typography variant="body2" color="text.secondary">Name</Typography>
          <Typography variant="body1" sx={{ mb: 1.5 }}>{user?.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">Email</Typography>
          <Typography variant="body1" sx={{ mb: 1.5 }}>{user?.email}</Typography>
          <Typography variant="body2" color="text.secondary">Role</Typography>
          <Typography variant="body1">{user?.role}</Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Appearance</Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={() => dispatch(toggleDarkMode())} />}
            label="Dark mode"
          />
        </Paper>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Data Export</Typography>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={exportCsv}>Export All (CSV)</Button>
            <Button variant="outlined" onClick={exportExcel}>Export All (Excel)</Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}
