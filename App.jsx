
import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import './App.css'

const API_URL = 'http://127.0.0.1:5000'

function App() {
  const [robotOn, setRobotOn] = useState(false)
  const [movement, setMovement] = useState('STOP')
  const [backendConnected, setBackendConnected] = useState(false)

  const [sensors, setSensors] = useState({
    temperature: null,
    humidity: null,
    soil_moisture: null,
    light_intensity: null,
    water_pump: null
  })

  const [history, setHistory] = useState([])

  // Fetch sensor data from Flask every 3 seconds
  useEffect(() => {
    let active = true

    const fetchSensors = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sensors`)
        if (!response.ok) throw new Error('Sensor API failed')

        const data = await response.json()

        if (active) {
          setSensors(data)
          setBackendConnected(true)
        }
      } catch (error) {
        if (active) setBackendConnected(false)
      }
    }

    fetchSensors()
    const interval = setInterval(fetchSensors, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  // Add a chart point every 3 seconds.
  // Small variations are for DEMO visualization only.
  // Sensor cards continue to show the backend readings.
  useEffect(() => {
    if (
      !backendConnected ||
      sensors.temperature == null ||
      sensors.humidity == null ||
      sensors.soil_moisture == null
    ) {
      return
    }

    const addChartPoint = () => {
      setHistory(previous => {
        const last = previous[previous.length - 1]

        const vary = (base, amount, min, max, previousValue) => {
          const reference = previousValue ?? Number(base)
          const change = (Math.random() - 0.5) * amount
          return Math.max(min, Math.min(max, reference + change))
        }

        const point = {
          time: new Date().toLocaleTimeString(),
          temperature: Number(
            vary(sensors.temperature, 0.8, 15, 45, last?.temperature).toFixed(1)
          ),
          humidity: Number(
            vary(sensors.humidity, 2, 20, 95, last?.humidity).toFixed(1)
          ),
          soil_moisture: Number(
            vary(sensors.soil_moisture, 2, 0, 100, last?.soil_moisture).toFixed(1)
          )
        }

        return [...previous, point].slice(-20)
      })
    }

    addChartPoint()
    const interval = setInterval(addChartPoint, 3000)

    return () => clearInterval(interval)
  }, [
    backendConnected,
    sensors.temperature,
    sensors.humidity,
    sensors.soil_moisture
  ])

  // Robot ON/OFF
  const toggleRobot = async () => {
    const nextState = !robotOn

    try {
      const response = await fetch(`${API_URL}/api/robot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: nextState ? 'ON' : 'OFF'
        })
      })

      if (!response.ok) throw new Error('Robot command failed')

      const data = await response.json()
      setRobotOn(data.robot === 'ON')
    } catch {
      alert('Backend connection nahi ho paya. Backend check karo.')
    }
  }

  // Robot movement commands
  const sendMovementCommand = async (command) => {
    try {
      const response = await fetch(`${API_URL}/api/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      })

      if (!response.ok) throw new Error('Movement command failed')

      const data = await response.json()
      setMovement(data.movement)
    } catch {
      alert('Movement command nahi bhej paye. Backend check karo.')
    }
  }

  const cardStyle = {
    background: '#ffffff',
    padding: '22px',
    borderRadius: '14px',
    boxShadow: '0 3px 12px rgba(0,0,0,0.07)',
    border: '1px solid #dcfce7',
    minWidth: 0
  }

  const buttonStyle = {
    padding: '12px 10px',
    border: 'none',
    borderRadius: '9px',
    background: '#166534',
    color: 'white',
    fontSize: '15px',
    cursor: 'pointer'
  }

  const sensorCards = [
    {
      title: '🌡️ Temperature',
      value: sensors.temperature,
      unit: '°C'
    },
    {
      title: '💧 Humidity',
      value: sensors.humidity,
      unit: '%'
    },
    {
      title: '🌿 Soil Moisture',
      value: sensors.soil_moisture,
      unit: '%'
    },
    {
      title: '☀️ Light Intensity',
      value: sensors.light_intensity,
      unit: 'lux'
    }
  ]

  const charts = [
    {
      title: '🌡️ Temperature',
      key: 'temperature',
      unit: '°C',
      color: '#ea580c'
    },
    {
      title: '💧 Humidity',
      key: 'humidity',
      unit: '%',
      color: '#2563eb'
    },
    {
      title: '🌿 Soil Moisture',
      key: 'soil_moisture',
      unit: '%',
      color: '#16a34a'
    }
  ]

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        background: '#f0fdf4',
        minHeight: '100vh',
        color: '#14532d'
      }}
    >
      <header
        style={{
          background: 'linear-gradient(135deg, #14532d, #15803d)',
          color: 'white',
          padding: '25px 30px'
        }}
      >
        <h1 style={{ margin: 0 }}>🌱 GreenHouse AgriRobot</h1>
        <p style={{ marginBottom: 0 }}>
          Smart Greenhouse Monitoring &amp; Robot Control
        </p>
        <p style={{ marginBottom: 0, fontSize: '13px' }}>
          Live monitoring dashboard · Software simulation
        </p>
      </header>

      <main
        style={{
          padding: '25px',
          maxWidth: '1150px',
          margin: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h2>Dashboard Overview</h2>
            <p>Monitor your greenhouse conditions below.</p>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: '30px',
              padding: '10px 16px',
              border: '1px solid #dcfce7'
            }}
          >
            <span
              style={{
                color: backendConnected ? '#16a34a' : '#dc2626'
              }}
            >
              ● {backendConnected ? 'Backend Connected' : 'Backend Disconnected'}
            </span>
          </div>
        </div>

        {/* Sensor cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '18px'
          }}
        >
          {sensorCards.map(sensor => (
            <div style={cardStyle} key={sensor.title}>
              <h3>{sensor.title}</h3>
              <h2 style={{ fontSize: '30px' }}>
                {sensor.value == null
                  ? '--'
                  : `${sensor.value} ${sensor.unit}`}
              </h2>
              <p style={{ color: '#64748b', marginBottom: 0 }}>
                {backendConnected ? 'Latest API reading' : 'Waiting for backend...'}
              </p>
            </div>
          ))}
        </div>

        {/* Live charts */}
        <section style={{ ...cardStyle, marginTop: '25px' }}>
          <h2>📈 Live Sensor Trends</h2>
          <p style={{ color: '#64748b' }}>
            Last 20 readings · Updates every 3 seconds
          </p>
          <p style={{ color: '#b45309', fontSize: '13px' }}>
            Demo mode: chart variations are simulated, not real sensor changes.
          </p>

          {charts.map(chart => (
            <div key={chart.key} style={{ marginTop: '25px' }}>
              <h3>{chart.title} ({chart.unit})</h3>

              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey={chart.key}
                      stroke={chart.color}
                      strokeWidth={3}
                      dot={true}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}

          {history.length < 2 && (
            <p style={{ color: '#64748b' }}>
              Graph ban raha hai. Kuch readings aane ke liye wait karo...
            </p>
          )}
        </section>

        {/* Automatic water pump */}
        <section style={{ ...cardStyle, marginTop: '25px' }}>
          <h2>💧 Automatic Water Pump</h2>

          <h1
            style={{
              color:
                sensors.water_pump === 'ON'
                  ? '#16a34a'
                  : sensors.water_pump === 'OFF'
                    ? '#dc2626'
                    : '#64748b'
            }}
          >
            {sensors.water_pump ?? 'Waiting...'}
          </h1>

          <p>
            {sensors.water_pump === 'ON'
              ? 'Soil moisture low — pump ON (simulation)'
              : sensors.water_pump === 'OFF'
                ? 'Soil moisture sufficient — pump OFF (simulation)'
                : 'Waiting for pump status...'}
          </p>

          <p style={{ color: '#64748b' }}>
            ON below 30% moisture; OFF at 40% or above.
          </p>
        </section>

        {/* Robot controls */}
        <section style={{ ...cardStyle, marginTop: '25px' }}>
          <h2>🤖 AgriRobot Control</h2>
          <p>
            Robot status: <strong>{robotOn ? 'ON (Demo)' : 'OFF'}</strong>
          </p>
          <p style={{ color: '#64748b' }}>
            Software demo only. Physical hardware is not connected.
          </p>

          <button
            onClick={toggleRobot}
            style={{
              ...buttonStyle,
              background: robotOn ? '#dc2626' : '#16a34a',
              padding: '12px 24px'
            }}
          >
            {robotOn ? 'Turn Robot OFF' : 'Turn Robot ON'}
          </button>
        </section>

        {/* Movement controls */}
        <section style={{ ...cardStyle, marginTop: '25px' }}>
          <h2>🕹️ Robot Movement</h2>
          <p>
            Current Command: <strong>{movement}</strong>
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '10px',
              maxWidth: '360px'
            }}
          >
            <span />

            <button
              style={buttonStyle}
              onClick={() => sendMovementCommand('FORWARD')}
            >
              ↑ Forward
            </button>

            <span />

            <button
              style={buttonStyle}
              onClick={() => sendMovementCommand('LEFT')}
            >
              ← Left
            </button>

            <button
              style={{ ...buttonStyle, background: '#dc2626' }}
              onClick={() => sendMovementCommand('STOP')}
            >
              ■ Stop
            </button>

            <button
              style={buttonStyle}
              onClick={() => sendMovementCommand('RIGHT')}
            >
              Right →
            </button>

            <span />

            <button
              style={buttonStyle}
              onClick={() => sendMovementCommand('BACKWARD')}
            >
              ↓ Backward
            </button>

            <span />
          </div>

          <p style={{ color: '#64748b' }}>
            Simulation only — physical motors are not connected.
          </p>
        </section>

        {/* System status */}
        <section style={{ ...cardStyle, marginTop: '25px' }}>
          <h2>📊 Greenhouse System Status</h2>
          <p>Dashboard: Running</p>
          <p>
            Backend:{' '}
            <strong
              style={{
                color: backendConnected ? '#16a34a' : '#dc2626'
              }}
            >
              {backendConnected ? 'Connected' : 'Disconnected'}
            </strong>
          </p>
          <p>Hardware sensors: Not connected</p>
          <p>Data refresh: Every 3 seconds</p>
          <p>Mode: Software simulation</p>
        </section>

        <footer
          style={{
            textAlign: 'center',
            padding: '25px 10px',
            color: '#64748b',
            fontSize: '13px'
          }}
        >
          GreenHouse AgriRobot · Smart Farming Project
        </footer>
      </main>
    </div>
  )
}

export default App
