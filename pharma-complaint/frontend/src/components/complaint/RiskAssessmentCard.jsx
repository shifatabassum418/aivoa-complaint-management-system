import { Box, Paper, Typography, Grid, TextField, Chip, LinearProgress } from '@mui/material'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'

const severityColor = (severity) => {
  switch (severity) {
    case 'Critical':
      return 'error'
    case 'Major':
      return 'warning'
    case 'Minor':
      return 'success'
    default:
      return 'default'
  }
}

export default function RiskAssessmentCard({ aiFields }) {
  const hasAssessment = !!aiFields?.initial_risk_assessment
  const completeness = Math.round((aiFields?.completeness_score || 0) * 100)

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, mt: 1, mb: 1, borderRadius: 2, bgcolor: 'action.hover' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <ShieldOutlinedIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>
          AI Copilot Risk Assessment
        </Typography>
        {aiFields?.is_duplicate === 1 && (
          <Chip size="small" color="error" label="Possible Duplicate" sx={{ ml: 'auto' }} />
        )}
      </Box>

      {!hasAssessment ? (
        <Typography variant="body2" color="text.secondary">
          Paste or upload a complaint in the AIVOA Copilot panel to generate a risk assessment.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Severity (Suggested)</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip label={aiFields.risk_severity_suggested || '—'} color={severityColor(aiFields.risk_severity_suggested)} size="small" />
            </Box>
          </Grid>
          <Grid item xs={6}>
            <TextField label="Suggested Next Action" value={aiFields.suggested_next_action || ''} fullWidth InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Initial Risk Assessment"
              value={aiFields.initial_risk_assessment || ''}
              fullWidth
              multiline
              minRows={2}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          {aiFields.root_cause_recommendation && (
            <Grid item xs={12}>
              <TextField
                label="Root Cause Recommendation"
                value={aiFields.root_cause_recommendation}
                fullWidth
                multiline
                minRows={2}
                InputProps={{ readOnly: true }}
              />
            </Grid>
          )}
          {aiFields.capa_recommendation && (
            <Grid item xs={12}>
              <TextField
                label="CAPA Recommendation"
                value={aiFields.capa_recommendation}
                fullWidth
                multiline
                minRows={2}
                InputProps={{ readOnly: true }}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Form Completeness</Typography>
              <Typography variant="caption" color="text.secondary">{completeness}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={completeness} sx={{ height: 6, borderRadius: 3 }} />
            {aiFields.missing_fields?.length > 0 && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                Missing: {aiFields.missing_fields.join(', ')}
              </Typography>
            )}
          </Grid>
        </Grid>
      )}
    </Paper>
  )
}
