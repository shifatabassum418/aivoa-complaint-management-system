import { createSlice } from '@reduxjs/toolkit'

const storedMode = localStorage.getItem('aivoa_dark_mode') === 'true'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: storedMode,
    sidebarOpen: true,
  },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode
      localStorage.setItem('aivoa_dark_mode', String(state.darkMode))
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
  },
})

export const { toggleDarkMode, toggleSidebar } = uiSlice.actions
export default uiSlice.reducer
