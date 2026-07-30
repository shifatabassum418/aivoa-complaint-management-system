import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '../../api/apiClient'

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post('/auth/login', { email, password })
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Login failed')
  }
})

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post('/auth/register', payload)
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Registration failed')
  }
})

const storedToken = localStorage.getItem('aivoa_token')
const storedUser = localStorage.getItem('aivoa_user')

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: storedToken || null,
    user: storedUser ? JSON.parse(storedUser) : null,
    status: 'idle',
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null
      state.user = null
      localStorage.removeItem('aivoa_token')
      localStorage.removeItem('aivoa_user')
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.token = action.payload.access_token
        state.user = action.payload.user
        localStorage.setItem('aivoa_token', action.payload.access_token)
        localStorage.setItem('aivoa_user', JSON.stringify(action.payload.user))
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(register.fulfilled, (state, action) => {
        state.token = action.payload.access_token
        state.user = action.payload.user
        localStorage.setItem('aivoa_token', action.payload.access_token)
        localStorage.setItem('aivoa_user', JSON.stringify(action.payload.user))
      })
      .addCase(register.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

export const { logout } = authSlice.actions
export default authSlice.reducer
