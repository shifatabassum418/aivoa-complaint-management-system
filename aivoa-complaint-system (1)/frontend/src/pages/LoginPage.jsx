import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Box, Paper, TextField, Button, Typography, Alert, Link } from '@mui/material'
import ScienceIcon from '@mui/icons-material/ScienceOutlined'
import { login, register } from '../store/slices/authSlice'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { error, status, token } = useSelector((state) => state.auth)
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  if (token) navigate('/')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isRegister) {
      const result = await dispatch(register({ ...form, role: 'qa_analyst' }))
      if (!result.error) navigate('/')
    } else {
      const result = await dispatch(login({ email: form.email, password: form.password }))
      if (!result.error) navigate('/')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper elevation={0} sx={{ p: 4, width: 400, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, justifyContent: 'center' }}>
          <ScienceIcon color="primary" fontSize="large" />
          <Typography variant="h5" fontWeight={800}>AIVOA</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          Customer Complaint Management System
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <TextField
              label="Full Name"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          )}
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            sx={{ mb: 2 }}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            sx={{ mb: 3 }}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={status === 'loading'}>
            {isRegister ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <Typography variant="body2" sx={{ textAlign: 'center', mt: 2 }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <Link component="button" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Sign in' : 'Register'}
          </Link>
        </Typography>
      </Paper>
    </Box>
  )
}
