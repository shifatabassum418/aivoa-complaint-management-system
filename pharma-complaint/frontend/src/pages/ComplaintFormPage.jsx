import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Box, Grid } from '@mui/material'
import Topbar from '../components/layout/Topbar'
import ComplaintForm from '../components/complaint/ComplaintForm'
import CopilotChat from '../components/complaint/CopilotChat'
import { fetchComplaint, resetForm } from '../store/slices/complaintSlice'
import { resetChat } from '../store/slices/chatSlice'

export default function ComplaintFormPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const chatComplaintId = useSelector((state) => state.chat.complaintId)
  const currentId = useSelector((state) => state.complaint.current?.id)

  useEffect(() => {
    if (id) {
      dispatch(fetchComplaint(id))
    } else {
      dispatch(resetForm())
      dispatch(resetChat())
    }
  }, [id, dispatch])

  // Once the AI Copilot creates a complaint on the "New Complaint" page,
  // pull the saved record into `current` so Save/Commit become available.
  useEffect(() => {
    if (!id && chatComplaintId && chatComplaintId !== currentId) {
      dispatch(fetchComplaint(chatComplaintId))
    }
  }, [id, chatComplaintId, currentId, dispatch])

  return (
    <Box>
      <Topbar title={id ? 'Edit Complaint' : 'Log Customer Complaint'} />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ComplaintForm />
          </Grid>
          <Grid item xs={12} md={6}>
            <CopilotChat />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}