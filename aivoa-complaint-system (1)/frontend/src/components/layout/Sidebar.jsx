import { NavLink } from 'react-router-dom'
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined'
import AddCircleIcon from '@mui/icons-material/AddCircleOutline'
import HistoryIcon from '@mui/icons-material/HistoryOutlined'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import ScienceIcon from '@mui/icons-material/ScienceOutlined'

const navItems = [
  { label: 'Dashboard', to: '/', icon: <DashboardIcon /> },
  { label: 'New Complaint', to: '/complaints/new', icon: <AddCircleIcon /> },
  { label: 'All Complaints', to: '/complaints', icon: <DescriptionIcon /> },
  { label: 'Audit Log', to: '/audit-log', icon: <HistoryIcon /> },
  { label: 'Settings', to: '/settings', icon: <SettingsIcon /> },
]

export default function Sidebar() {
  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 3 }}>
        <ScienceIcon color="primary" fontSize="large" />
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1 }}>
            AIVOA
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Complaint QMS
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.to === '/'}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&.active': {
                bgcolor: 'primary.main',
                color: 'white',
                '& .MuiListItemIcon-root': { color: 'white' },
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ px: 3, pb: 3 }}>
        <Typography variant="caption" color="text.secondary">
          API & FDF Quality Assurance Module
        </Typography>
      </Box>
    </Box>
  )
}
