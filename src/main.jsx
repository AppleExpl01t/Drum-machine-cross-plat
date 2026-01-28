import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Debug Error Handler
window.onerror = function (message, source, lineno, colno, error) {
  alert(`Error: ${message}\nCore: ${error ? error.stack : 'No stack'}`);
  return false;
};

// Global Promise Rejection Handler
window.onunhandledrejection = function (event) {
  alert(`Unhandled Promise Rejection: ${event.reason}`);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
