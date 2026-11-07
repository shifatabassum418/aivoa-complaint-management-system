import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '../../api/apiClient'

const emptyForm = {
  complaint_source: '',
  customer_name: '',
  product_name: '',
  product_strength: '',
  batch_number: '',
  manufacturing_date: '',
  expiry_date: '',
  affected_quantity: '',
  originating_site_block: '',
  impacted_npm: '',
  complaint_type: '',
  complaint_date: '',
  complaint_description: '',
  structured_defect_summary: '',
  initial_severity: '',
  priority: '',
}

export const fetchComplaints = createAsyncThunk('complaint/fetchAll', async (params) => {
  const { data } = await apiClient.get('/complaints', { params })
  return data
})

export const fetchComplaint = createAsyncThunk('complaint/fetchOne', async (id) => {
  const { data } = await apiClient.get(`/complaints/${id}`)
  return data
})

export const updateComplaint = createAsyncThunk('complaint/update', async ({ id, payload }) => {
  const { data } = await apiClient.patch(`/complaints/${id}`, payload)
  return data
})

export const commitComplaint = createAsyncThunk('complaint/commit', async (id) => {
  const { data } = await apiClient.post(`/complaints/${id}/commit`)
  return data
})

export const fetchTimeline = createAsyncThunk('complaint/timeline', async (id) => {
  const { data } = await apiClient.get(`/complaints/${id}/timeline`)
  return data
})

const complaintSlice = createSlice({
  name: 'complaint',
  initialState: {
    list: [],
    current: null,
    formState: emptyForm,
    aiFields: {
      risk_severity_suggested: '',
      suggested_next_action: '',
      initial_risk_assessment: '',
      root_cause_recommendation: '',
      capa_recommendation: '',
      completeness_score: 0,
      missing_fields: [],
      is_duplicate: 0,
    },
    timeline: [],
    status: 'idle',
  },
  reducers: {
    resetForm(state) {
      state.formState = emptyForm
      state.current = null
      state.aiFields = complaintSlice.getInitialState().aiFields
    },
    mergeFormUpdates(state, action) {
      state.formState = { ...state.formState, ...action.payload }
    },
    mergeAiFields(state, action) {
      state.aiFields = { ...state.aiFields, ...action.payload }
    },
    setFormField(state, action) {
      const { field, value } = action.payload
      state.formState[field] = value
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.list = action.payload
      })
      .addCase(fetchComplaint.fulfilled, (state, action) => {
        state.current = action.payload
        state.formState = { ...state.formState, ...action.payload }
        state.aiFields = { ...state.aiFields, ...action.payload }
      })
      .addCase(updateComplaint.fulfilled, (state, action) => {
        state.current = action.payload
      })
      .addCase(commitComplaint.fulfilled, (state, action) => {
        state.current = action.payload
      })
      .addCase(fetchTimeline.fulfilled, (state, action) => {
        state.timeline = action.payload
      })
  },
})

export const { resetForm, mergeFormUpdates, mergeAiFields, setFormField } = complaintSlice.actions
export default complaintSlice.reducer
