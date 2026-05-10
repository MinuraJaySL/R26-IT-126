import { useEffect, useState } from 'react';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { database } from '../../firebase';

export default function FirebaseSensorData() {
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sensorRef = query(ref(database, 'sensorReadings'), limitToLast(1));

    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Get the latest entry (last key)
          const keys = Object.keys(data);
          const latestKey = keys[keys.length - 1];
          setSensorData(data[latestKey]);
        } else {
          setSensorData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ padding: '16px' }}>Loading sensor data...</div>;
  }

  if (error) {
    return <div style={{ padding: '16px', color: 'red' }}>Error: {error}</div>;
  }

  if (!sensorData) {
    return <div style={{ padding: '16px' }}>No sensor data available.</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3>🔴 Live Firebase Sensor Readings</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '12px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Sensor</th>
            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>🌡️ Temperature (DHT22)</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{sensorData.temperature} °C</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>💧 Humidity (DHT22)</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{sensorData.humidity} %</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>🏭 Air Quality (MQ135)</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{sensorData.mq135} ppm</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>🔥 Methane Gas (MQ4)</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{sensorData.mq4} ppm</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>⏱️ Timestamp</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{sensorData.timestamp}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
