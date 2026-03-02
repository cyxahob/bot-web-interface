import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { FaPlay, FaStop, FaRedo, FaSave } from 'react-icons/fa';

const API_URL = '/api';

function App() {
  const [status, setStatus] = useState({ running: false, cpu_usage: 0, memory_usage: 0 });
  const [logs, setLogs] = useState('');
  const [env, setEnv] = useState({});
  const [activeTab, setActiveTab] = useState('logs');
  const [code, setCode] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${API_URL}/status`);
        setStatus(res.data);
      } catch (err) {
        console.error('Status error:', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const res = await axios.get(`${API_URL}/env`);
        setEnv(res.data.env || {});
      } catch (err) {
        toast.error('Failed to load environment variables');
      }
    };
    fetchEnv();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/logs`);
      setLogs(res.data.logs);
    } catch (err) {
      toast.error('Failed to load logs');
    }
  };

  const handleStart = async () => {
    try {
      await axios.post(`${API_URL}/start`);
      toast.success('Bot started');
    } catch (err) {
      toast.error('Start failed');
    }
  };

  const handleStop = async () => {
    try {
      await axios.post(`${API_URL}/stop`);
      toast.success('Bot stopped');
    } catch (err) {
      toast.error('Stop failed');
    }
  };

  const handleRestart = async () => {
    try {
      await axios.post(`${API_URL}/restart`);
      toast.success('Bot restarted');
    } catch (err) {
      toast.error('Restart failed');
    }
  };

  const handleSaveEnv = async () => {
    try {
      await axios.post(`${API_URL}/env`, env);
      toast.success('Environment saved');
    } catch (err) {
      toast.error('Save failed');
    }
  };

  return (
    <div style={{ padding: '20px', background: '#1e1e1e', color: '#fff', minHeight: '100vh' }}>
      <Toaster position="top-right" />
      <h1 style={{ color: '#61dafb' }}>🤖 Bot Manager</h1>
      <div style={{ marginBottom: '20px' }}>
        <span>Status: <strong style={{ color: status.running ? '#0f0' : '#f00' }}>{status.running ? 'RUNNING' : 'STOPPED'}</strong></span>
        <span style={{ marginLeft: '20px' }}>CPU: {status.cpu_usage.toFixed(1)}%</span>
        <span style={{ marginLeft: '20px' }}>RAM: {status.memory_usage.toFixed(1)} MB</span>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleStart} disabled={status.running} style={{ background: '#28a745', marginRight: '10px' }}><FaPlay /> Start</button>
        <button onClick={handleStop} disabled={!status.running} style={{ background: '#dc3545', marginRight: '10px' }}><FaStop /> Stop</button>
        <button onClick={handleRestart} style={{ background: '#ffc107' }}><FaRedo /> Restart</button>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('logs')} style={{ marginRight: '10px' }}>📋 Logs</button>
        <button onClick={() => setActiveTab('env')}>🔧 Environment</button>
      </div>
      {activeTab === 'logs' && (
        <div>
          <button onClick={fetchLogs} style={{ marginBottom: '10px' }}>🔄 Refresh Logs</button>
          <pre style={{ background: '#2d2d2d', padding: '10px', overflow: 'auto', maxHeight: '500px', fontFamily: 'monospace' }}>
            {logs || 'No logs yet'}
          </pre>
        </div>
      )}
      {activeTab === 'env' && (
        <div>
          {Object.entries(env).map(([key, val]) => (
            <div key={key} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '200px', fontWeight: 'bold' }}>{key}:</span>
              <input
                type="text"
                value={val}
                onChange={(e) => setEnv({ ...env, [key]: e.target.value })}
                style={{ flex: 1, padding: '5px', background: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
              />
            </div>
          ))}
          <button onClick={handleSaveEnv} style={{ marginTop: '10px', background: '#28a745' }}><FaSave /> Save & Restart</button>
        </div>
      )}
    </div>
  );
}

export default App;
