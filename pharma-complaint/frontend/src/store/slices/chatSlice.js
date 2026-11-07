import { createSlice, createAsyncThunk, nanoid } from '@reduxjs/toolkit'
import apiClient from '../../api/apiClient'
import { mergeFormUpdates, mergeAiFields } from './complaintSlice'

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, complaintId }, { getState, dispatch }) => {
    const { sessionId } = getState().chat
    const { data } = await apiClient.post('/ai/chat', {
      session_id: sessionId,
      message,
      complaint_id: complaintId || null,
    })
    dispatch(mergeFormUpdates(data.form_updates))
    dispatch(
      mergeAiFields({
        risk_severity_suggested: data.risk_assessment?.severity_suggested,
        suggested_next_action: data.risk_assessment?.suggested_next_action,
        initial_risk_assessment: data.risk_assessment?.initial_risk_assessment,
        root_cause_recommendation: data.root_cause,
        capa_recommendation: data.capa,
        structured_defect_summary: data.summary,
        completeness_score: data.completeness?.completeness_score,
        missing_fields: data.completeness?.missing_fields,
        is_duplicate: data.duplicate_check?.is_duplicate ? 1 : 0,
      })
    )
    return data
  }
)

export const uploadComplaintFile = createAsyncThunk(
  'chat/uploadFile',
  async ({ file, complaintId }, { getState, dispatch }) => {
    const { sessionId } = getState().chat
    const formData = new FormData()
    formData.append('session_id', sessionId)
    if (complaintId) formData.append('complaint_id', complaintId)
    formData.append('file', file)
    const { data } = await apiClient.post('/ai/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    dispatch(mergeFormUpdates(data.form_updates))
    dispatch(
      mergeAiFields({
        risk_severity_suggested: data.risk_assessment?.severity_suggested,
        suggested_next_action: data.risk_assessment?.suggested_next_action,
        initial_risk_assessment: data.risk_assessment?.initial_risk_assessment,
        root_cause_recommendation: data.root_cause,
        capa_recommendation: data.capa,
        structured_defect_summary: data.summary,
        completeness_score: data.completeness?.completeness_score,
        missing_fields: data.completeness?.missing_fields,
        is_duplicate: data.duplicate_check?.is_duplicate ? 1 : 0,
      })
    )
    return data
  }
)

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    sessionId: nanoid(),
    messages: [
      {
        role: 'assistant',
        content:
          'Ready to process new complaints. You can paste the raw email from the customer, or upload a PDF of the complaint report. I will extract the data and run the initial risk assessment.',
      },
    ],
    complaintId: null,
    status: 'idle',
  },
  reducers: {
    addUserMessage(state, action) {
      state.messages.push({ role: 'user', content: action.payload })
    },
    resetChat(state) {
      state.sessionId = nanoid()
      state.messages = [
        {
          role: 'assistant',
          content:
            'Ready to process new complaints. You can paste the raw email from the customer, or upload a PDF of the complaint report. I will extract the data and run the initial risk assessment.',
        },
      ]
      state.complaintId = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.status = 'idle'
        state.messages.push({ role: 'assistant', content: action.payload.reply })
        state.complaintId = action.payload.complaint_id
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.status = 'idle'
        state.messages.push({
          role: 'assistant',
          content: 'Sorry, I ran into an error processing that. Please try again.',
        })
      })
      .addCase(uploadComplaintFile.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(uploadComplaintFile.fulfilled, (state, action) => {
        state.status = 'idle'
        state.messages.push({ role: 'assistant', content: action.payload.reply })
        state.complaintId = action.payload.complaint_id
      })
      .addCase(uploadComplaintFile.rejected, (state) => {
        state.status = 'idle'
        state.messages.push({ role: 'assistant', content: 'Sorry, I could not process that file.' })
      })
  },
})

export const { addUserMessage, resetChat } = chatSlice.actions
export default chatSlice.reducer
