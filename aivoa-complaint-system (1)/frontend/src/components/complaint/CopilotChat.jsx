import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box, Paper, Typography, TextField, IconButton, Avatar, CircularProgress, Chip,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFileOutlined'
import ScienceIcon from '@mui/icons-material/ScienceOutlined'
import PersonIcon from '@mui/icons-material/Person'
import { addUserMessage, sendChatMessage, uploadComplaintFile } from '../../store/slices/chatSlice'

export default function CopilotChat() {
  const dispatch = useDispatch()
  const { messages, status, complaintId } = useSelector((state) => state.chat)
  const [input, setInput] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleSend = () => {
    if (!input.trim() || status === 'loading') return
    dispatch(addUserMessage(input))
    dispatch(sendChatMessage({ message: input, complaintId }))
    setInput('')
  }

  const handleFile = (file) => {
    if (!file) return
    dispatch(addUserMessage(`📎 ${file.name}`))
    dispatch(uploadComplaintFile({ file, complaintId }))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 640,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <ScienceIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>AIVOA Copilot</Typography>
        <Chip label="BETA" size="small" color="warning" sx={{ ml: 'auto' }} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Drop complaint files or paste text below.
      </Typography>

      <Box
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 2,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: dragActive ? 'action.hover' : 'transparent',
          mb: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Drag & drop complaint document here, or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Supported formats: PDF, DOCX, TXT, IMG · Max file size 10MB
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, pr: 0.5 }}>
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              gap: 1,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            <Avatar sx={{ width: 28, height: 28, bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.400' }}>
              {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <ScienceIcon fontSize="small" />}
            </Avatar>
            <Box
              sx={{
                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.default',
                color: msg.role === 'user' ? 'white' : 'text.primary',
                border: msg.role === 'user' ? 'none' : '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                px: 2,
                py: 1,
              }}
            >
              <Typography variant="body2">{msg.content}</Typography>
            </Box>
          </Box>
        ))}
        {status === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 4.5 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">AIVOA Copilot is thinking…</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <IconButton onClick={() => fileInputRef.current?.click()}>
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message or paste a complaint..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        />
        <IconButton color="primary" onClick={handleSend} disabled={status === 'loading'}>
          <SendIcon />
        </IconButton>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
        Powered by LangGraph · AI responses may contain errors, please verify information.
      </Typography>
    </Paper>
  )
}
