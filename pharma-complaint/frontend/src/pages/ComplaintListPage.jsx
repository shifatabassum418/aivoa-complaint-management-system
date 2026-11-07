import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField,
  Chip, Button, Stack, IconButton, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import TableChartIcon from '@mui/icons-material/TableChartOutlined'
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined'
import Topbar from '../components/layout/Topbar'
import { fetchComplaints } from '../store/slices/complaintSlice'
import { exportCsv, exportExcel, exportPdf } from '../api/exportApi'

const statusColor = (status) => {
  switch (status) {
    case 'Ready to Commit': return 'success'
    case 'Committed': return 'primary'
    default: return 'warning'
  }
}

export default function ComplaintListPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const list = useSelector((state) => state.complaint.list)
  const [search, setSearch] = useState('')

  useEffect(() => {
    dispatch(fetchComplaints({ search: search || undefined }))
  }, [dispatch, search])

  return (
    <Box>
      <Topbar title="All Complaints" />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
          <TextField
            placeholder="Search by customer, product, batch, or reference..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, maxWidth: 420 }}
          />
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigate('/complaints/new')}>
            New Complaint
          </Button>
          <Tooltip title="Export all as CSV">
            <IconButton onClick={exportCsv}><DescriptionIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Export all as Excel">
            <IconButton onClick={exportExcel}><TableChartIcon /></IconButton>
          </Tooltip>
        </Stack>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/complaints/${c.id}`)}>
                  <TableCell>{c.reference_code}</TableCell>
                  <TableCell>{c.customer_name || '—'}</TableCell>
                  <TableCell>{c.product_name || '—'}</TableCell>
                  <TableCell>{c.complaint_type || '—'}</TableCell>
                  <TableCell>{c.priority || '—'}</TableCell>
                  <TableCell><Chip label={c.status} size="small" color={statusColor(c.status)} /></TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Export PDF">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); exportPdf(c.id, c.reference_code) }}
                      >
                        <PictureAsPdfIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  )
}
