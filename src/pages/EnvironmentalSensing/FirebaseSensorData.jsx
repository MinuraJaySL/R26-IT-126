import { useEffect, useState } from 'react';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { database } from '../../firebase';

// =====================================================
// STATUS HELPER
// =====================================================

function getStatus(mq4, mq135) {
  if (mq4 > 50 && mq135 > 1000) {
    return {
      status: 'CRITICAL',
      statusColor: '#ef4444',
      statusBackground: 'rgba(239, 68, 68, 0.2)',
      statusBorder: '1.5px solid rgba(239, 68, 68, 0.55)',
      statusGlow: '0 0 18px rgba(239, 68, 68, 0.4)',
      statusIcon: '🚨',
    };
  }
  if (mq4 > 50 && mq135 > 600) {
    return {
      status: 'WARNING',
      statusColor: '#f59e0b',
      statusBackground: 'rgba(245, 158, 11, 0.2)',
      statusBorder: '1.5px solid rgba(245, 158, 11, 0.55)',
      statusGlow: '0 0 18px rgba(245, 158, 11, 0.35)',
      statusIcon: '⚠️',
    };
  }
  if (mq4 < 50 && mq135 < 600) {
    return {
      status: 'NORMAL',
      statusColor: '#10b981',
      statusBackground: 'rgba(16, 185, 129, 0.2)',
      statusBorder: '1.5px solid rgba(16, 185, 129, 0.55)',
      statusGlow: '0 0 18px rgba(16, 185, 129, 0.3)',
      statusIcon: '✅',
    };
  }
  return {
    status: 'CHECK',
    statusColor: '#38bdf8',
    statusBackground: 'rgba(56, 189, 248, 0.2)',
    statusBorder: '1.5px solid rgba(56, 189, 248, 0.55)',
    statusGlow: '0 0 18px rgba(56, 189, 248, 0.35)',
    statusIcon: '🔍',
  };
}

// =====================================================
// STATUS BADGE COMPONENT
// =====================================================

function StatusBadge({ status, statusColor, statusBackground, statusBorder, statusGlow, statusIcon }) {
  return (
    <div
      style={{
        ...styles.statusBadge,
        backgroundColor: statusBackground,
        color: statusColor,
        border: statusBorder,
        boxShadow: statusGlow,
      }}
    >
      <span
        style={{
          ...styles.light,
          backgroundColor: statusColor,
          boxShadow: `0 0 8px ${statusColor}`,
        }}
      />
      <span style={styles.statusIcon}>{statusIcon}</span>
      <span style={styles.statusText}>{status}</span>
    </div>
  );
}

// =====================================================
// BIN CARD — LIVE DATA (Bin 01)
// =====================================================

function LiveBinCard({ mq4, mq135, temperature }) {
  const s = getStatus(mq4, mq135);

  return (
    <div style={styles.card}>
      <div style={styles.liveTag}>● LIVE</div>

      <div style={styles.topSection}>
        <div>
          <h3 style={styles.title}>🗑️ Smart Bin 01</h3>
          <p style={styles.subtitle}>Environmental Status</p>
        </div>
        <StatusBadge {...s} />
      </div>

      <div style={styles.sensorContainer}>
        <div style={{ ...styles.sensor, borderTop: '2px solid #f59e0b33' }}>
          <div style={styles.icon}>🔥</div>
          <div>
            <div style={styles.sensorName}>MQ4</div>
            <div style={styles.sensorLabel}>Gas</div>
            <div style={styles.value}>{mq4}<span style={styles.unit}>ppm</span></div>
          </div>
        </div>
        <div style={{ ...styles.sensor, borderTop: '2px solid #06b6d433' }}>
          <div style={styles.icon}>🏭</div>
          <div>
            <div style={styles.sensorName}>MQ135</div>
            <div style={styles.sensorLabel}>Air Quality</div>
            <div style={styles.value}>{mq135}<span style={styles.unit}>ppm</span></div>
          </div>
        </div>
      </div>

      <div style={styles.temperature}>
        <span style={styles.tempLabel}>🌡️ Temperature</span>
        <strong style={styles.tempValue}>{temperature} °C</strong>
      </div>
    </div>
  );
}

// =====================================================
// BIN CARD — OFFLINE DUMMY (Bin 02)
// =====================================================

function OfflineBinCard() {
  return (
    <div style={{ ...styles.card, opacity: 0.72 }}>
      <div style={{ ...styles.liveTag, backgroundColor: 'rgba(100,116,139,0.15)', color: '#64748b' }}>● OFFLINE</div>

      <div style={styles.topSection}>
        <div>
          <h3 style={styles.title}>🗑️ Smart Bin 02</h3>
          <p style={styles.subtitle}>No Connection</p>
        </div>
        <div
          style={{
            ...styles.statusBadge,
            backgroundColor: 'rgba(100,116,139,0.18)',
            color: '#64748b',
            border: '1.5px solid rgba(100,116,139,0.4)',
          }}
        >
          <span style={{ ...styles.light, backgroundColor: '#64748b' }} />
          <span style={styles.statusIcon}>📡</span>
          <span style={styles.statusText}>OFFLINE</span>
        </div>
      </div>

      <div style={styles.sensorContainer}>
        <div style={{ ...styles.sensor, borderTop: '2px solid #33415533' }}>
          <div style={styles.icon}>🔥</div>
          <div>
            <div style={styles.sensorName}>MQ4</div>
            <div style={styles.sensorLabel}>Gas</div>
            <div style={{ ...styles.value, color: '#334155' }}>—<span style={styles.unit}>ppm</span></div>
          </div>
        </div>
        <div style={{ ...styles.sensor, borderTop: '2px solid #33415533' }}>
          <div style={styles.icon}>🏭</div>
          <div>
            <div style={styles.sensorName}>MQ135</div>
            <div style={styles.sensorLabel}>Air Quality</div>
            <div style={{ ...styles.value, color: '#334155' }}>—<span style={styles.unit}>ppm</span></div>
          </div>
        </div>
      </div>

      <div style={styles.temperature}>
        <span style={styles.tempLabel}>🌡️ Temperature</span>
        <strong style={{ ...styles.tempValue, color: '#334155' }}>— °C</strong>
      </div>
    </div>
  );
}

// =====================================================
// BIN CARD — DEMO DUMMY (Bin 03)
// =====================================================

function Bin03OfflineCard() {
  return (
    <div style={{ ...styles.card, opacity: 0.72 }}>
      <div style={{ ...styles.liveTag, backgroundColor: 'rgba(100,116,139,0.15)', color: '#64748b' }}>● OFFLINE</div>

      <div style={styles.topSection}>
        <div>
          <h3 style={styles.title}>🗑️ Smart Bin 03</h3>
          <p style={styles.subtitle}>No Connection</p>
        </div>
        <div
          style={{
            ...styles.statusBadge,
            backgroundColor: 'rgba(100,116,139,0.18)',
            color: '#64748b',
            border: '1.5px solid rgba(100,116,139,0.4)',
          }}
        >
          <span style={{ ...styles.light, backgroundColor: '#64748b' }} />
          <span style={styles.statusIcon}>📡</span>
          <span style={styles.statusText}>OFFLINE</span>
        </div>
      </div>

      <div style={styles.sensorContainer}>
        <div style={{ ...styles.sensor, borderTop: '2px solid #33415533' }}>
          <div style={styles.icon}>🔥</div>
          <div>
            <div style={styles.sensorName}>MQ4</div>
            <div style={styles.sensorLabel}> Gas</div>
            <div style={{ ...styles.value, color: '#334155' }}>—<span style={styles.unit}>ppm</span></div>
          </div>
        </div>
        <div style={{ ...styles.sensor, borderTop: '2px solid #33415533' }}>
          <div style={styles.icon}>🏭</div>
          <div>
            <div style={styles.sensorName}>MQ135</div>
            <div style={styles.sensorLabel}>Air Quality</div>
            <div style={{ ...styles.value, color: '#334155' }}>—<span style={styles.unit}>ppm</span></div>
          </div>
        </div>
      </div>

      <div style={styles.temperature}>
        <span style={styles.tempLabel}>🌡️ Temperature</span>
        <strong style={{ ...styles.tempValue, color: '#334155' }}>— °C</strong>
      </div>
    </div>
  );
}

// =====================================================
// MAIN EXPORT
// =====================================================

export default function FirebaseSensorData() {
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sensorRef = query(
      ref(database, 'sensorReadings'),
      limitToLast(1)
    );

    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          // Get latest sensor reading
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

  // -----------------------------
  // LOADING
  // -----------------------------

  if (loading) {
    return (
      <div style={styles.binGrid}>
        <div style={styles.message}>⏳ Loading environmental data...</div>
        <OfflineBinCard />
        <Bin03OfflineCard />
      </div>
    );
  }

  // -----------------------------
  // ERROR
  // -----------------------------

  if (error) {
    return (
      <div style={styles.binGrid}>
        <div style={styles.error}>⚠️ Error: {error}</div>
        <OfflineBinCard />
        <Bin03OfflineCard />
      </div>
    );
  }

  // -----------------------------
  // NO DATA
  // -----------------------------

  if (!sensorData) {
    return (
      <div style={styles.binGrid}>
        <div style={styles.message}>📭 No sensor data available.</div>
        <OfflineBinCard />
        <Bin03OfflineCard />
      </div>
    );
  }

  // -----------------------------
  // LIVE DATA
  // -----------------------------

  const mq4 = Number(sensorData.mq4);
  const mq135 = Number(sensorData.mq135);
  const temperature = Number(sensorData.temperature);

  return (
    <div style={styles.binGrid}>
      <LiveBinCard mq4={mq4} mq135={mq135} temperature={temperature} />
      <OfflineBinCard />
      <Bin03OfflineCard />
    </div>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles = {

  // 3-column responsive grid
  binGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
    gap: '16px',
    alignItems: 'start',
    width: '100%',
    boxSizing: 'border-box',
  },

  // Bin card
  card: {
    position: 'relative',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '18px 18px 16px',
    boxSizing: 'border-box',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.32)',
    border: '1px solid #334155',
    overflow: 'hidden',
  },

  // "● LIVE" tag
  liveTag: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: '50px',
    padding: '3px 9px',
    marginBottom: '12px',
  },

  // Header row
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
    gap: '10px',
    flexWrap: 'wrap',
  },

  // Bin name
  title: {
    margin: 0,
    fontSize: '17px',
    color: '#f8fafc',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },

  // "Environmental Status"
  subtitle: {
    margin: '3px 0 0',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '500',
  },

  // ── Status Badge ─────────────────────────────────────

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '8px 14px',
    borderRadius: '50px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Pulsing glow dot
  light: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },

  // Emoji inside badge
  statusIcon: {
    fontSize: '14px',
    lineHeight: 1,
  },

  // "CRITICAL" / "CHECK" / "NORMAL" text — large & bold
  statusText: {
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '0.07em',
  },

  // ── Sensor Grid ───────────────────────────────────────

  sensorContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },

  // Individual sensor box
  sensor: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#0f172a',
    borderRadius: '11px',
    padding: '12px',
    border: '1px solid #1e293b',
    boxSizing: 'border-box',
  },

  // Emoji icon
  icon: {
    fontSize: '24px',
    flexShrink: 0,
  },

  // "MQ4" / "MQ135"
  sensorName: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: '0.04em',
  },

  // "Methane Gas" / "Air Quality"
  sensorLabel: {
    fontSize: '10px',
    color: '#475569',
    marginTop: '2px',
  },

  // Numeric reading
  value: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#ffffff',
    marginTop: '5px',
    letterSpacing: '-0.02em',
  },

  // "ppm"
  unit: {
    fontSize: '10px',
    fontWeight: '500',
    color: '#64748b',
    marginLeft: '3px',
  },

  // ── Temperature Row ───────────────────────────────────

  temperature: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #1e293b',
    boxSizing: 'border-box',
  },

  tempLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },

  tempValue: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: '-0.01em',
  },

  // ── States ────────────────────────────────────────────

  message: {
    padding: '28px 20px',
    color: '#64748b',
    fontSize: '14px',
    textAlign: 'center',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px solid #334155',
  },

  error: {
    padding: '28px 20px',
    color: '#ef4444',
    fontSize: '14px',
    textAlign: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: '16px',
    border: '1px solid rgba(239,68,68,0.3)',
  },
};