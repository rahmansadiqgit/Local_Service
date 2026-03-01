import axios from 'axios'; // Think of Axios as a tool that helps your app “talk” to a server.

const api = axios.create({ // makes a custom Axios instance called api.
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
})


/*
config = config comes from Axios itself and represents all the details of your API request.
{
  url: '/posts/',           // API endpoint
  method: 'post',           // HTTP method
  headers: {},              // HTTP headers
  data: payload,            // Request body (for POST/PUT)
  params: {},               // Query parameters (for GET)
  timeout: 0,               // Optional timeout
  // ...other Axios options
}
*/

api.interceptors.request.use((config) => { //lets you intercept every request before it is sent to the server.
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use( // This adds a response interceptor.
  (response) => response, // The first function (response) => response handles successful responses (just passes them through).
  async (error) => { //The second function (error) => { ... } handles errors, like 401 Unauthorized.
    const original = error.config
    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh/', { refresh: refreshToken })
          localStorage.setItem('accessToken', data.access)
          if (!original.headers) original.headers = {}
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (refreshError) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
      // No refresh token available, redirect to login
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject(error) // Used to pass errors along so they can be handled later.
    }
    return Promise.reject(error)
  },
)

export default api
