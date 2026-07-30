import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import complaintReducer from './slices/complaintSlice'
import chatReducer from './slices/chatSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    complaint: complaintReducer,
    chat: chatReducer,
    ui: uiReducer,
  },
})
