import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

const API_URL = 'https://chemical-backend-nghd.onrender.com/api' // When using locally 'http://127.0.0.1:8000/api';

const App = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'

  const isDark = theme === 'dark';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await axios.post(`${API_URL}/api-token-auth/`, loginForm);
      setToken(res.data.token);
      alert('Logged in!');
    } catch (err) {
      alert('Login failed (Check username/password)');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setDatasets([]);
    setSelectedDataset(null);
    setRawData([]);
    setFile(null);
    setLoginForm({ username: '', password: '' });
  };

  const fetchHistory = async (authToken) => {
    try {
      const headers = authToken ? { Authorization: `Token ${authToken}` } : {};
      const res = await axios.get(`${API_URL}/datasets/`, { headers });

      const sorted = [...res.data].sort(
        (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)
      );

      const latestFive = sorted.slice(0, 5);
      setDatasets(latestFive);

      if (latestFive.length > 0) {
        handleSelectDataset(latestFive[0], authToken);
      } else {
        setSelectedDataset(null);
        setRawData([]);
      }
    } catch (err) {
      console.error('Error fetching history', err);
    }
  };

  const handleSelectDataset = async (dataset, authToken) => {
    setSelectedDataset(dataset);
    const headers = authToken ? { Authorization: `Token ${authToken}` } : {};
    try {
      const res = await axios.get(
        `${API_URL}/datasets/${dataset.id}/raw_data/`,
        { headers }
      );
      setRawData(res.data);
    } catch (err) {
      console.error('Error fetching raw data', err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers = {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      };
      await axios.post(`${API_URL}/datasets/`, formData, { headers });
      alert('Upload Successful!');
      fetchHistory(token);
    } catch (err) {
      alert(
        'Upload failed. Ensure CSV columns match: Equipment Name, Type, Flowrate, Pressure, Temperature'
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = (id) => {
    window.open(`${API_URL}/datasets/${id}/generate_pdf/`, '_blank');
  };

  const handleClearTable = () => {
    setRawData([]);
    setSelectedDataset(null);
  };

  useEffect(() => {
    if (token) {
      fetchHistory(token);
    }
  }, [token]);

  const getDistributionChart = () => {
    if (!selectedDataset) return null;
    const dist = selectedDataset.type_distribution;
    return {
      labels: Object.keys(dist),
      datasets: [
        {
          label: 'Count',
          data: Object.values(dist),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
        },
      ],
    };
  };

  const getMetricsChart = () => {
    if (!rawData.length) return null;
    return {
      labels: rawData.map((d) => d['Equipment Name']),
      datasets: [
        {
          label: 'Flowrate',
          data: rawData.map((d) => d.Flowrate),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Temperature',
          data: rawData.map((d) => d.Temperature),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          yAxisID: 'y1',
        },
      ],
    };
  };

  // theme-aware chart options
  const getBarOptions = (isDarkTheme) => {
    const textColor = isDarkTheme ? '#E5E7EB' : '#374151';
    const gridColor = isDarkTheme
      ? 'rgba(156,163,175,0.25)'
      : 'rgba(209,213,219,0.7)';

    return {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
      },
    };
  };

  const getLineOptions = (isDarkTheme) => {
    const textColor = isDarkTheme ? '#E5E7EB' : '#374151';
    const gridColor = isDarkTheme
      ? 'rgba(156,163,175,0.25)'
      : 'rgba(209,213,219,0.7)';

    return {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { color: textColor },
          grid: { drawOnChartArea: false, color: gridColor },
        },
      },
    };
  };

  // Helper to show Avg Temp safely
  const getAvgTempText = () => {
    if (!selectedDataset) return '-';
    const v = selectedDataset.avg_temperature;
    return typeof v === 'number' ? v.toFixed(1) : '-';
  };

  return (
    <div
      className={`min-h-screen p-6 font-sans ${
        isDark ? 'text-gray-100' : 'bg-gray-50 text-gray-800'
      }`}
      style={isDark ? { backgroundColor: '#212121' } : {}}
    >
      <header
        className={`mb-8 flex flex-col md:flex-row justify-between items-center p-6 rounded-xl shadow-sm border ${
          isDark ? 'bg-[#2C2C2C] border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <h1 className="text-2xl font-bold">Chemical Equipment Dashboard</h1>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          {token && (
            <>
              <span className="text-green-400 font-medium bg-green-50/10 px-3 py-1 rounded-full text-sm border border-green-500/40">
                ● Authenticated
              </span>
              <button
                onClick={handleLogout}
                className={`text-xs md:text-sm px-3 py-1 rounded-lg border transition ${
                  isDark
                    ? 'border-gray-500 hover:bg-gray-700/60'
                    : 'border-gray-400 hover:bg-gray-100'
                }`}
              >
                Logout
              </button>
            </>
          )}
          <button
            onClick={() =>
              setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
            }
            className={`text-xs md:text-sm px-3 py-1 rounded-lg border transition ${
              isDark
                ? 'border-gray-500 hover:bg-gray-700/60'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>

      {/* LOGIN VIEW */}
      {!token ? (
        <div className="flex items-center justify-center">
          <div
            className={`p-10 rounded-xl shadow-sm border max-w-md w-full text-center transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              isDark
                ? 'bg-[#2C2C2C] border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <form onSubmit={handleLogin} className="space-y-4 mb-6">
              <div className="text-lg font-semibold">Login to continue</div>
              <input
                type="text"
                placeholder="Username"
                className={`w-full border p-2 rounded text-sm ${
                  isDark
                    ? 'bg-transparent border-gray-600 text-gray-100 placeholder-gray-400'
                    : 'border-gray-300 text-gray-800 placeholder-gray-400'
                }`}
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
              />
              <div className="space-y-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className={`w-full border p-2 rounded text-sm ${
                    isDark
                      ? 'bg-transparent border-gray-600 text-gray-100 placeholder-gray-400'
                      : 'border-gray-300 text-gray-800 placeholder-gray-400'
                  }`}
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                />
                <div className="flex items-center gap-2 text-xs">
                  <input
                    id="showPassword"
                    type="checkbox"
                    className="h-3 w-3"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  <label htmlFor="showPassword" className="cursor-pointer">
                    Show password
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={loggingIn}
                className={`w-full text-white px-4 py-2 rounded text-sm font-medium transition disabled:opacity-60 ${
                  loggingIn
                    ? 'bg-blue-600 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loggingIn ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="text-sm mb-1">
              Please log in to view the dashboard.
            </div>
            <p className="text-xs opacity-80">
              Once you authenticate, you can upload CSV files and explore all
              equipment analytics here.
            </p>
          </div>
        </div>
      ) : (
        /* DASHBOARD VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <div
              className={`p-6 rounded-xl shadow-sm border ${
                isDark
                  ? 'bg-[#2C2C2C] border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2 className="font-semibold mb-4">Upload Dataset</h2>
              <form onSubmit={handleUpload}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <button
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload CSV'}
                </button>
              </form>
            </div>

            <div
              className={`p-6 rounded-xl shadow-sm border ${
                isDark
                  ? 'bg-[#2C2C2C] border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2 className="font-semibold mb-4">History (Last 5)</h2>
              <div className="space-y-2">
                {datasets.map((ds) => {
                  const selected = selectedDataset?.id === ds.id;

                  const cardClasses = selected
                    ? isDark
                      ? 'bg-blue-500/30 border-blue-400'
                      : 'bg-blue-50 border-blue-500'
                    : isDark
                    ? 'border-gray-700 hover:bg-gray-800'
                    : 'border-transparent hover:bg-gray-50';

                  return (
                    <div
                      key={ds.id}
                      onClick={() => handleSelectDataset(ds, token)}
                      className={`cursor-pointer p-3 rounded-lg border transition ${cardClasses}`}
                    >
                      <div className="font-medium">Dataset #{ds.id}</div>
                      <div className="text-xs opacity-70">
                        {new Date(ds.uploaded_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
                {datasets.length === 0 && (
                  <div className="text-xs opacity-70">
                    No datasets yet. Please upload a CSV.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-6">
            {selectedDataset ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    className={`p-5 rounded-xl shadow-sm border ${
                      isDark
                        ? 'bg-[#2C2C2C] border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="text-sm opacity-80">Total Units</div>
                    <div className="text-2xl font-bold">
                      {selectedDataset.total_count}
                    </div>
                  </div>
                  <div
                    className={`p-5 rounded-xl shadow-sm border ${
                      isDark
                        ? 'bg-[#2C2C2C] border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="text-sm opacity-80">Avg Flowrate</div>
                    <div className="text-2xl font-bold text-green-400">
                      {selectedDataset.avg_flowrate.toFixed(1)}
                    </div>
                  </div>
                  <div
                    className={`p-5 rounded-xl shadow-sm border ${
                      isDark
                        ? 'bg-[#2C2C2C] border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="text-sm opacity-80">Avg Pressure</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {selectedDataset.avg_pressure.toFixed(1)}
                    </div>
                  </div>
                  <div
                    className={`p-5 rounded-xl shadow-sm border ${
                      isDark
                        ? 'bg-[#2C2C2C] border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="text-sm opacity-80">Avg Temp</div>
                    <div className="text-2xl font-bold text-orange-400">
                      {getAvgTempText()}
                    </div>
                  </div>
                </div>

                {/* Download PDF button row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-start-4">
                    <button
                      onClick={() => downloadPDF(selectedDataset.id)}
                      className="w-full py-2 text-indigo-600 font-bold border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition bg-white"
                    >
                      Download PDF Report
                    </button>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div
                    className={`p-6 rounded-xl shadow-sm border ${
                      isDark
                        ? 'bg-[#2C2C2C] border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <h3 className="font-semibold mb-4">Equipment Types</h3>
                    {getDistributionChart() && (
                      <Bar
                        data={getDistributionChart()}
                        options={getBarOptions(isDark)}
                      />
                    )}
                  </div>
                  <div
                    className={`p-6 rounded-xl shadow-sm border ${
                      isDark
                        ? 'bg-[#2C2C2C] border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <h3 className="font-semibold mb-4">Flowrate & Temp</h3>
                    {getMetricsChart() && (
                      <Line
                        options={getLineOptions(isDark)}
                        data={getMetricsChart()}
                      />
                    )}
                  </div>
                </div>

                {/* Data Table */}
                <div
                  className={`rounded-xl shadow-sm border overflow-hidden ${
                    isDark
                      ? 'bg-[#2C2C2C] border-gray-700'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between p-4 border-b ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-gray-100'
                        : 'bg-gray-100 border-gray-200 text-gray-800'
                    }`}
                  >
                    <span className="font-semibold">Detailed Data View</span>
                    <button
                      onClick={handleClearTable}
                      className={`text-xs px-3 py-1 rounded-lg border transition ${
                        isDark
                          ? 'border-gray-500 text-gray-100 hover:bg-gray-700/60'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Clear Table
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead
                        className={
                          isDark
                            ? 'bg-gray-800 text-gray-100'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        <tr>
                          <th className="px-6 py-3">Equipment Name</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Flowrate</th>
                          <th className="px-6 py-3">Pressure</th>
                          <th className="px-6 py-3">Temperature</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rawData.map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              isDark
                                ? 'hover:bg-gray-800'
                                : 'hover:bg-gray-50'
                            }
                          >
                            <td className="px-6 py-4 font-medium">
                              {row['Equipment Name']}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  isDark
                                    ? 'bg-gray-800 text-gray-100 border border-gray-600'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {row['Type']}
                              </span>
                            </td>
                            <td className="px-6 py-4">{row['Flowrate']}</td>
                            <td className="px-6 py-4">{row['Pressure']}</td>
                            <td className="px-6 py-4">
                              {row['Temperature']}
                            </td>
                          </tr>
                        ))}
                        {rawData.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-4 text-center text-gray-400 text-sm"
                            >
                              No rows to display. Either clear was pressed or no
                              raw data loaded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div
                className={`p-12 rounded-xl shadow-sm border border-dashed text-center ${
                  isDark
                    ? 'bg-[#2C2C2C] border-gray-700'
                    : 'bg-white border-gray-300'
                }`}
              >
                <div className="text-lg opacity-80">No Dataset Selected</div>
                <p className="mt-2 opacity-80">
                  Choose a dataset from the history sidebar or upload a new CSV
                  file to view analytics.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
