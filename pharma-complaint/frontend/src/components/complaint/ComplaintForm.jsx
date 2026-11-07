import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box, Paper, Typography, Grid, TextField, MenuItem, Chip, Button, Divider,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/SaveOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { setFormField, updateComplaint, commitComplaint } from '../../store/slices/complaintSlice'
import RiskAssessmentCard from './RiskAssessmentCard'

const SOURCE_OPTIONS = ['Email', 'Pharmacy', 'Phone', 'Portal']
const SEVERITY_OPTIONS = ['Minor', 'Major', 'Critical']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent']

const statusColor = (status) => {
  switch (status) {
    case 'Ready to Commit':
      return 'success'
    case 'Committed':
      return 'primary'
    default:
      return 'warning'
  }
}

export default function ComplaintForm() {
  const dispatch = useDispatch()
  const formState = useSelector((state) => state.complaint.formState)
  const aiFields = useSelector((state) => state.complaint.aiFields)
  const current = useSelector((state) => state.complaint.current)

  const { control, handleSubmit, reset, watch } = useForm({ defaultValues: formState })

  useEffect(() => {
    reset(formState)
  }, [formState, reset])

  const onFieldBlur = (field, value) => {
    dispatch(setFormField({ field, value }))
  }

  const onSave = async (data) => {
    if (current?.id) {
      dispatch(updateComplaint({ id: current.id, payload: data }))
    }
  }

  const onCommit = () => {
    if (current?.id) dispatch(commitComplaint(current.id))
  }

  const status = current?.status || 'Pending Triage'

  const renderField = (name, label, options = null, multiline = false) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          select={!!options}
          label={label}
          fullWidth
          multiline={multiline}
          minRows={multiline ? 3 : undefined}
          placeholder="Awaiting AI extraction..."
          onBlur={(e) => {
            field.onBlur()
            onFieldBlur(name, e.target.value)
          }}
        >
          {options?.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  )

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Log Customer Complaint
          </Typography>
          <Typography variant="body2" color="text.secondary">
            API & FDP Quality Assurance Module
          </Typography>
        </Box>
        <Chip label={status} color={statusColor(status)} sx={{ fontWeight: 600 }} />
      </Box>
      <Divider sx={{ mb: 3 }} />

      <form onSubmit={handleSubmit(onSave)}>
        <Typography variant="overline" color="text.secondary">
          1. Origin & Customer Details
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3, mt: 0.5 }}>
          <Grid item xs={6}>{renderField('complaint_source', 'Complaint Source', SOURCE_OPTIONS)}</Grid>
          <Grid item xs={6}>{renderField('customer_name', 'Customer Name')}</Grid>
        </Grid>

        <Typography variant="overline" color="text.secondary">
          2. Product & Batch Identification
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3, mt: 0.5 }}>
          <Grid item xs={6}>{renderField('product_name', 'Product Name')}</Grid>
          <Grid item xs={6}>{renderField('product_strength', 'Product Strength/Grade')}</Grid>
          <Grid item xs={6}>{renderField('batch_number', 'Batch/Lot Number')}</Grid>
          <Grid item xs={6}>{renderField('affected_quantity', 'Affected Quantity')}</Grid>
          <Grid item xs={6}>{renderField('manufacturing_date', 'Manufacturing Date')}</Grid>
          <Grid item xs={6}>{renderField('expiry_date', 'Expiry Date')}</Grid>
        </Grid>

        <Typography variant="overline" color="text.secondary">
          3. Complaint Details
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3, mt: 0.5 }}>
          <Grid item xs={6}>{renderField('complaint_type', 'Complaint Type')}</Grid>
          <Grid item xs={6}>{renderField('complaint_date', 'Complaint Date')}</Grid>
          <Grid item xs={12}>{renderField('complaint_description', 'Detailed Complaint Description', null, true)}</Grid>
          <Grid item xs={12}>{renderField('structured_defect_summary', 'Structured Defect Summary (AI)', null, true)}</Grid>
        </Grid>

        <Typography variant="overline" color="text.secondary">
          4. Initial Assessment & Priority
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
          <Grid item xs={6}>{renderField('initial_severity', 'Initial Severity', SEVERITY_OPTIONS)}</Grid>
          <Grid item xs={6}>{renderField('priority', 'Priority', PRIORITY_OPTIONS)}</Grid>
        </Grid>

        <RiskAssessmentCard aiFields={aiFields} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button startIcon={<RestartAltIcon />} onClick={() => reset(formState)} color="inherit">
            Reset Form
          </Button>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button type="submit" variant="outlined" startIcon={<SaveIcon />}>
              Save Complaint
            </Button>
            <Button
              variant="contained"
              disabled={!current?.id || status === 'Committed'}
              onClick={onCommit}
            >
              Commit to QMS Ledger
            </Button>
          </Box>
        </Box>
      </form>
    </Paper>
  )
}
