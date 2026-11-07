import { useEffect, useState } from 'react'
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material'
import Topbar from '../components/layout/Topbar'
import apiClient from '../api/apiClient'

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    apiClient.get('/audit').then(({ data }) => setLogs(data))
  }, [])

  return (
    <Box>
      <Topbar title="Audit Log" />
      <Box sx={{ p: 3 }}>
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>{log.user_email || 'system'}</TableCell>
                  <TableCell><Chip label={log.action} size="small" /></TableCell>
                  <TableCell>{log.resource_type}{log.resource_id ? ` · ${log.resource_id.slice(0, 8)}…` : ''}</TableCell>
                  <TableCell>{log.details ? JSON.stringify(log.details) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  )
}
