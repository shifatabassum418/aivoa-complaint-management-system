import { useDispatch, useSelector } from 'react-redux'
import { AppBar, Toolbar, Typography, IconButton, Box, Chip, Avatar, Tooltip } from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import LogoutIcon from '@mui/icons-material/LogoutOutlined'
import { toggleDarkMode } from '../../store/slices/uiSlice'
import { logout } from '../../store/slices/authSlice'

export default function Topbar({ title = 'Dashboard' }) {
  const dispatch = useDispatch()
  const darkMode = useSelector((state) => state.ui.darkMode)
  const user = useSelector((state) => state.auth.user)

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', top: 0 }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6">{title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title="Toggle dark mode">
            <IconButton onClick={() => dispatch(toggleDarkMode())}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          {user && (
            <Chip
              avatar={<Avatar sx={{ bgcolor: 'primary.main' }}>{user.full_name?.[0]?.toUpperCase()}</Avatar>}
              label={user.full_name}
              variant="outlined"
            />
          )}
          <Tooltip title="Log out">
            <IconButton onClick={() => dispatch(logout())}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
