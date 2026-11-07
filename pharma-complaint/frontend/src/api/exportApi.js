import apiClient from './apiClient'

async function downloadFile(url, filename) {
  const response = await apiClient.get(url, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

export const exportCsv = () => downloadFile('/export/csv', 'complaints_export.csv')
export const exportExcel = () => downloadFile('/export/excel', 'complaints_export.xlsx')
export const exportPdf = (complaintId, referenceCode) =>
  downloadFile(`/export/pdf/${complaintId}`, `${referenceCode || 'complaint'}.pdf`)
