import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Box, Paper, Typography } from '@mui/material'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent'
import Topbar from '../components/layout/Topbar'
import { fetchTimeline } from '../store/slices/complaintSlice'

export default function TimelinePage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const timeline = useSelector((state) => state.complaint.timeline)

  useEffect(() => {
    if (id) dispatch(fetchTimeline(id))
  }, [id, dispatch])

  return (
    <Box>
      <Topbar title="Complaint Timeline" />
      <Box sx={{ p: 3 }}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          {timeline.length === 0 ? (
            <Typography color="text.secondary">No events recorded yet for this complaint.</Typography>
          ) : (
            <Timeline position="right">
              {timeline.map((event, idx) => (
                <TimelineItem key={event.id}>
                  <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.25 }}>
                    {new Date(event.created_at).toLocaleString()}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color="primary" />
                    {idx < timeline.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="subtitle2" fontWeight={700}>{event.event_type.replace(/_/g, ' ')}</Typography>
                    <Typography variant="body2" color="text.secondary">{event.description}</Typography>
                    <Typography variant="caption" color="text.secondary">by {event.actor}</Typography>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </Paper>
      </Box>
    </Box>
  )
}
