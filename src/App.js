import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const BASE_GRID_WIDTH = 6;
const BASE_GRID_HEIGHT = 8;
const EQUIPMENT_COUNT = 8;

// ===========================================
// SUPABASE CONFIGURATION - UPDATE THESE!
// ===========================================
const SUPABASE_URL = 'https://stdvpwirbaoqfbuscjuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0ZHZwd2lyYmFvcWZidXNjanVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTEwNzcsImV4cCI6MjA4NDM2NzA3N30.mCXabFzv1ODj2mS3ayKElRWk8otZ-G_LYYxUmfDjLFs';

// Initialize Supabase client
let supabase = null;
let supabaseError = null;

try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
} catch (e) {
  supabaseError = e.message;
  console.error('❌ Supabase initialization failed:', e);
}

const ELECTRICAL_EQUIPMENT = [
  { id: 'led', name: 'LED Light', icon: '💡', type: 'electrical' },
  { id: 'powerpoint', name: 'Power Point', icon: '🔌', type: 'electrical' },
  { id: 'computer', name: 'Computer', icon: '💻', type: 'electrical' },
];

const PLUMBING_EQUIPMENT = [
  { id: 'tap', name: 'Tap', icon: '🚰', type: 'plumbing' },
  { id: 'toilet', name: 'Toilet', icon: '🚽', type: 'plumbing' },
  { id: 'shower', name: 'Shower', icon: '🚿', type: 'plumbing' },
];

const getConnections = (grid, x, y, infraType, gridWidth, gridHeight) => {
  const connections = { up: false, down: false, left: false, right: false };
  const cell = grid[y]?.[x];
  if (!cell) return connections;

  const POWER_SOURCE = { x: 0, y: 0 };
  const WATER_SOURCE = { x: gridWidth - 1, y: gridHeight - 1 };

  const neighbors = [
    { dir: 'up', nx: x, ny: y - 1 },
    { dir: 'down', nx: x, ny: y + 1 },
    { dir: 'left', nx: x - 1, ny: y },
    { dir: 'right', nx: x + 1, ny: y },
  ];

  neighbors.forEach(({ dir, nx, ny }) => {
    const neighbor = grid[ny]?.[nx];
    if (!neighbor) return;

    if (neighbor.infrastructure === infraType) {
      connections[dir] = true;
    }
    if (infraType === 'cable' && nx === POWER_SOURCE.x && ny === POWER_SOURCE.y) {
      connections[dir] = true;
    }
    if (infraType === 'pipe' && nx === WATER_SOURCE.x && ny === WATER_SOURCE.y) {
      connections[dir] = true;
    }
  });

  return connections;
};

const InfrastructurePath = ({ connections, type, isRouting }) => {
  const color = type === 'cable' ? '#f59e0b' : '#3b82f6';
  const glowColor = type === 'cable' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(59, 130, 246, 0.5)';
  const strokeWidth = 6;
  const center = 24;
  const edge = 48;

  const paths = [];
  
  if (connections.up) paths.push(`M${center},${center} L${center},0`);
  if (connections.down) paths.push(`M${center},${center} L${center},${edge}`);
  if (connections.left) paths.push(`M${center},${center} L0,${center}`);
  if (connections.right) paths.push(`M${center},${center} L${edge},${center}`);

  return (
    <svg width="48" height="48" style={{ position: 'absolute', top: 0, left: 0 }}>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          style={isRouting ? { filter: `drop-shadow(0 0 6px ${glowColor})` } : {}}
        />
      ))}
      <circle 
        cx={center} 
        cy={center} 
        r={paths.length === 0 ? 8 : 4} 
        fill={color}
        style={isRouting ? { filter: `drop-shadow(0 0 6px ${glowColor})` } : {}}
      />
    </svg>
  );
};

const generateGrid = (gridWidth, gridHeight) => {
  const POWER_SOURCE = { x: 0, y: 0 };
  const WATER_SOURCE = { x: gridWidth - 1, y: gridHeight - 1 };
  
  const grid = [];
  for (let y = 0; y < gridHeight; y++) {
    const row = [];
    for (let x = 0; x < gridWidth; x++) {
      row.push({
        x,
        y,
        revealed: false,
        equipment: null,
        infrastructure: null,
        isSource: (x === POWER_SOURCE.x && y === POWER_SOURCE.y) || 
                  (x === WATER_SOURCE.x && y === WATER_SOURCE.y),
        sourceType: (x === POWER_SOURCE.x && y === POWER_SOURCE.y) ? 'electrical' :
                    (x === WATER_SOURCE.x && y === WATER_SOURCE.y) ? 'plumbing' : null,
      });
    }
    grid.push(row);
  }

  const availablePositions = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const distFromPower = Math.abs(x - POWER_SOURCE.x) + Math.abs(y - POWER_SOURCE.y);
      const distFromWater = Math.abs(x - WATER_SOURCE.x) + Math.abs(y - WATER_SOURCE.y);
      if (distFromPower >= 2 && distFromWater >= 2) {
        const isCorner = (x === 0 || x === gridWidth - 1) && (y === 0 || y === gridHeight - 1);
        if (!isCorner) {
          availablePositions.push({ x, y });
        }
      }
    }
  }

  const shuffled = availablePositions.sort(() => Math.random() - 0.5);
  const electricalCount = Math.floor(EQUIPMENT_COUNT / 2);
  const plumbingCount = EQUIPMENT_COUNT - electricalCount;

  for (let i = 0; i < electricalCount && i < shuffled.length; i++) {
    const pos = shuffled[i];
    const eq = ELECTRICAL_EQUIPMENT[Math.floor(Math.random() * ELECTRICAL_EQUIPMENT.length)];
    grid[pos.y][pos.x].equipment = { ...eq };
  }

  for (let i = 0; i < plumbingCount && (electricalCount + i) < shuffled.length; i++) {
    const pos = shuffled[electricalCount + i];
    const eq = PLUMBING_EQUIPMENT[Math.floor(Math.random() * PLUMBING_EQUIPMENT.length)];
    grid[pos.y][pos.x].equipment = { ...eq };
  }

  grid[POWER_SOURCE.y][POWER_SOURCE.x].revealed = true;
  grid[WATER_SOURCE.y][WATER_SOURCE.x].revealed = true;

  return grid;
};

const revealBlanks = (grid, startX, startY, rings = 2, gridWidth, gridHeight) => {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  const toReveal = new Set();
  
  const queue = [{ x: startX, y: startY, dist: 0 }];
  const visited = new Set();
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    const { x, y, dist } = queue.shift();
    const cell = newGrid[y][x];
    
    if (dist <= rings && !cell.equipment) {
      toReveal.add(`${x},${y}`);
      
      if (dist < rings) {
        const neighbors = [
          { nx: x, ny: y - 1 },
          { nx: x, ny: y + 1 },
          { nx: x - 1, ny: y },
          { nx: x + 1, ny: y },
        ];
        
        neighbors.forEach(({ nx, ny }) => {
          if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
            const key = `${nx},${ny}`;
            if (!visited.has(key)) {
              visited.add(key);
              const neighborCell = newGrid[ny][nx];
              if (!neighborCell.equipment) {
                queue.push({ x: nx, y: ny, dist: dist + 1 });
              }
            }
          }
        });
      }
    }
  }

  toReveal.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    newGrid[y][x].revealed = true;
  });

  return newGrid;
};

const isConnectedToSource = (grid, startX, startY, infraType, gridWidth, gridHeight) => {
  const POWER_SOURCE = { x: 0, y: 0 };
  const WATER_SOURCE = { x: gridWidth - 1, y: gridHeight - 1 };
  const sourcePos = infraType === 'cable' ? POWER_SOURCE : WATER_SOURCE;
  const visited = new Set();
  const queue = [{ x: startX, y: startY }];
  
  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const key = `${x},${y}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    if (x === sourcePos.x && y === sourcePos.y) {
      return true;
    }
    
    const cell = grid[y]?.[x];
    if (!cell) continue;
    
    const isValidTraversal = cell.infrastructure === infraType;
    
    if (!isValidTraversal && !(x === startX && y === startY)) continue;
    
    const neighbors = [
      { nx: x, ny: y - 1 },
      { nx: x, ny: y + 1 },
      { nx: x - 1, ny: y },
      { nx: x + 1, ny: y },
    ];
    
    neighbors.forEach(({ nx, ny }) => {
      if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
        const neighborCell = grid[ny]?.[nx];
        if (neighborCell && (neighborCell.infrastructure === infraType || neighborCell.isSource)) {
          queue.push({ x: nx, y: ny });
        }
      }
    });
  }
  
  return false;
};

const isAdjacentTo = (x1, y1, x2, y2) => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
};

const hasValidMoves = (grid, lastX, lastY, activeEquipment, gridWidth, gridHeight) => {
  if (!activeEquipment) return true;
  
  const infraType = activeEquipment.equipment.type === 'electrical' ? 'cable' : 'pipe';
  const oppositeType = infraType === 'cable' ? 'pipe' : 'cable';
  const matchingEqType = infraType === 'cable' ? 'electrical' : 'plumbing';
  
  const neighbors = [
    { nx: lastX, ny: lastY - 1 },
    { nx: lastX, ny: lastY + 1 },
    { nx: lastX - 1, ny: lastY },
    { nx: lastX + 1, ny: lastY },
  ];
  
  for (const { nx, ny } of neighbors) {
    if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
    
    const cell = grid[ny]?.[nx];
    if (!cell) continue;
    
    if (nx === activeEquipment.x && ny === activeEquipment.y) continue;
    if (cell.infrastructure === oppositeType) continue;
    
    if (cell.infrastructure === infraType) {
      if (isConnectedToSource(grid, nx, ny, infraType, gridWidth, gridHeight)) {
        return true;
      }
      continue;
    }
    
    if (cell.isSource) return true;
    if (!cell.revealed) return true;
    if (!cell.infrastructure && !cell.equipment) return true;
    if (cell.equipment && cell.equipment.type === matchingEqType) return true;
  }
  
  return false;
};

// Debug Panel Component
const DebugPanel = ({ logs, onClose, onTest }) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#1e293b',
        border: '4px solid #10b981',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{
          color: '#10b981',
          fontSize: '14px',
          marginBottom: '16px',
          fontFamily: 'monospace',
        }}>
          🔧 DEBUG PANEL
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
            CONNECTION STATUS
          </h3>
          <div style={{
            background: '#0f172a',
            padding: '12px',
            fontSize: '9px',
            fontFamily: 'monospace',
            color: '#e2e8f0',
            lineHeight: '1.6',
          }}>
            <div>Supabase URL: {SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
            <div>Anon Key: {SUPABASE_ANON_KEY ? `✅ Set (${SUPABASE_ANON_KEY.substring(0, 20)}...)` : '❌ Missing'}</div>
            <div>Client Init: {supabase ? '✅ Success' : `❌ Failed: ${supabaseError}`}</div>
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
            ACTION LOG
          </h3>
          <div style={{
            background: '#0f172a',
            padding: '12px',
            fontSize: '8px',
            fontFamily: 'monospace',
            color: '#e2e8f0',
            maxHeight: '200px',
            overflowY: 'auto',
            lineHeight: '1.8',
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#64748b' }}>No actions yet...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ 
                  color: log.type === 'error' ? '#f87171' : 
                         log.type === 'success' ? '#10b981' : '#e2e8f0',
                  borderBottom: '1px solid #334155',
                  paddingBottom: '4px',
                  marginBottom: '4px',
                }}>
                  [{log.time}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={onTest}
            style={{
              padding: '10px 16px',
              fontSize: '9px',
              fontFamily: 'monospace',
              background: '#3b82f6',
              border: '2px solid #2563eb',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            🧪 TEST CONNECTION
          </button>
          
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              fontSize: '9px',
              fontFamily: 'monospace',
              background: '#475569',
              border: '2px solid #64748b',
              color: '#e2e8f0',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

const Leaderboard = ({ scores, onClose, currentPlayerName, loading, error, debugInfo }) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#1e293b',
        border: '4px solid #f59e0b',
        padding: '24px',
        maxWidth: '320px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{
          color: '#f59e0b',
          fontSize: '14px',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          🏆 LEADERBOARD 🏆
        </h2>
        
        {loading ? (
          <p style={{ color: '#64748b', fontSize: '10px', textAlign: 'center' }}>
            Loading scores...
          </p>
        ) : error ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#f87171', fontSize: '10px', marginBottom: '8px' }}>
              {error}
            </p>
            {debugInfo && (
              <p style={{ color: '#64748b', fontSize: '8px', wordBreak: 'break-all' }}>
                Debug: {debugInfo}
              </p>
            )}
          </div>
        ) : scores.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '10px', textAlign: 'center' }}>
            No scores yet. Be the first!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scores.slice(0, 25).map((entry, index) => (
              <div key={entry.id || index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: entry.name?.toLowerCase() === currentPlayerName?.toLowerCase() ? '#374151' : '#0f172a',
                border: entry.name?.toLowerCase() === currentPlayerName?.toLowerCase() ? '2px solid #f59e0b' : '2px solid transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    color: index < 3 ? '#f59e0b' : '#64748b',
                    fontSize: '12px',
                    width: '24px',
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <span style={{ color: '#e2e8f0', fontSize: '10px' }}>
                    {entry.name || 'Anonymous'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#10b981', fontSize: '10px' }}>
                    {(entry.score || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            fontSize: '10px',
            fontFamily: 'inherit',
            background: '#f59e0b',
            border: '3px solid #d97706',
            color: '#0f172a',
            cursor: 'pointer',
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [gamePhase, setGamePhase] = useState('name');
  const [playerName, setPlayerName] = useState('');
  const [gridWidth, setGridWidth] = useState(BASE_GRID_WIDTH);
  const [gridHeight, setGridHeight] = useState(BASE_GRID_HEIGHT);
  const [grid, setGrid] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [mode, setMode] = useState('discovery');
  const [activeEquipment, setActiveEquipment] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [leaderboardDebug, setLeaderboardDebug] = useState(null);
  const [pathLength, setPathLength] = useState(0);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [lastPlacedTile, setLastPlacedTile] = useState(null);
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);
  const [submitStatus, setSubmitStatus] = useState(null);
  const gridRef = useRef(null);

  const addLog = useCallback((message, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-50), { time, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  }, []);

  // Test Supabase connection
  const testConnection = async () => {
    console.log('Testing Supabase connection...');
    
    if (!supabase) {
      console.error('Supabase client not initialized!');
      return;
    }
    
    try {
      console.log('Attempting to fetch from leaderboard table...');
      const { data, error, status } = await supabase
        .from('leaderboard')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error(`Supabase error (${status}): ${error.message} [${error.code}]`);
        console.error(`Hint: ${error.hint || 'none'}`);
      } else {
        console.log(`Connection successful! Status: ${status}`);
        console.log(`Response: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      console.error(`Exception: ${e.message}`);
    }
  };

  // Fetch leaderboard from Supabase
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    setLeaderboardDebug(null);
    console.log('Fetching leaderboard...');
    
    if (!supabase) {
      const msg = 'Supabase client not initialized';
      setLeaderboardError(msg);
      console.error(msg);
      setLeaderboardLoading(false);
      return;
    }
    
    try {
      const { data, error, status } = await supabase
        .from('leaderboard')
        .select('id, name, score, created_at')
        .order('score', { ascending: false })
        .limit(25);
      
      if (error) {
        const msg = `Supabase error: ${error.message} (${error.code})`;
        setLeaderboardError(msg);
        setLeaderboardDebug(`Status: ${status}, Hint: ${error.hint || 'none'}`);
        console.error(msg);
        setLeaderboard([]);
      } else {
        console.log(`Fetched ${data?.length || 0} scores`);
        setLeaderboard(Array.isArray(data) ? data : []);
      }
      
    } catch (e) {
      const msg = `Exception: ${e.message}`;
      setLeaderboardError(msg);
      setLeaderboardDebug(e.toString());
      console.error(msg);
      setLeaderboard([]);
    }
    
    setLeaderboardLoading(false);
  }, []);

  // Submit score to Supabase
  const submitScore = async (name, finalScore) => {
    setSubmitStatus('submitting');
    console.log(`Submitting score: ${name} = ${finalScore}`);
    
    if (!supabase) {
      const msg = 'Supabase client not initialized';
      setSubmitStatus(`error: ${msg}`);
      console.error(msg);
      return;
    }
    
    try {
      const cleanName = (name || 'Anonymous').substring(0, 12);
      
      const { error, status } = await supabase
        .from('leaderboard')
        .insert([
          { name: cleanName, score: finalScore }
        ]);
      
      if (error) {
        const msg = `Supabase error: ${error.message} (${error.code})`;
        setSubmitStatus(`error: ${msg}`);
        console.error(msg);
        console.error(`Hint: ${error.hint || 'none'}`);
      } else {
        setSubmitStatus('success');
        console.log(`Score submitted successfully (status: ${status})`);
      }
      
    } catch (e) {
      const msg = `Exception: ${e.message}`;
      setSubmitStatus(`error: ${msg}`);
      console.error(msg);
    }
  };

  useEffect(() => {
    console.log('App initialized');
    console.log(`Supabase URL: ${SUPABASE_URL}`);
    console.log(`Supabase client: ${supabase ? 'Ready' : 'Failed'}`);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const startGame = () => {
    if (playerName.trim()) {
      setGridWidth(BASE_GRID_WIDTH);
      setGridHeight(BASE_GRID_HEIGHT);
      setGrid(generateGrid(BASE_GRID_WIDTH, BASE_GRID_HEIGHT));
      setGamePhase('playing');
      setMode('discovery');
      setScore(0);
      setRound(1);
      setSubmitStatus(null);
      console.log(`Game started for player: ${playerName}`);
    }
  };

  const restartGame = () => {
    setGridWidth(BASE_GRID_WIDTH);
    setGridHeight(BASE_GRID_HEIGHT);
    setGrid(generateGrid(BASE_GRID_WIDTH, BASE_GRID_HEIGHT));
    setMode('discovery');
    setActiveEquipment(null);
    setPathLength(0);
    setLastPlacedTile(null);
    setGameOverMessage('');
    setGamePhase('playing');
    setScore(0);
    setRound(1);
    setShowRoundComplete(false);
    setSubmitStatus(null);
    console.log('Game restarted');
  };

  const nextRound = useCallback(() => {
    const newHeight = gridHeight + 1;
    setScore(prev => prev * 2);
    setRound(prev => prev + 1);
    setGridHeight(newHeight);
    setGrid(generateGrid(gridWidth, newHeight));
    setMode('discovery');
    setActiveEquipment(null);
    setPathLength(0);
    setLastPlacedTile(null);
    setShowRoundComplete(false);
    console.log(`Advanced to round ${round + 1}`);
  }, [gridWidth, gridHeight, round]);

  const checkWinCondition = useCallback((currentGrid) => {
    if (!currentGrid || gamePhase !== 'playing') return false;
    
    const allEquipment = [];
    currentGrid.forEach(row => {
      row.forEach(cell => {
        if (cell.equipment) {
          allEquipment.push(cell);
        }
      });
    });
    
    if (allEquipment.length === 0) return false;
    
    const allConnected = allEquipment.every(cell => {
      const infraType = cell.equipment.type === 'electrical' ? 'cable' : 'pipe';
      const hasInfra = cell.infrastructure === infraType;
      const connected = isConnectedToSource(currentGrid, cell.x, cell.y, infraType, gridWidth, gridHeight);
      return hasInfra && connected;
    });
    
    return allConnected;
  }, [gamePhase, gridWidth, gridHeight]);

  useEffect(() => {
    if (grid && mode === 'discovery' && !showRoundComplete) {
      const won = checkWinCondition(grid);
      if (won) {
        setShowRoundComplete(true);
        console.log(`Round ${round} complete!`);
        setTimeout(() => nextRound(), 1500);
      }
    }
  }, [grid, mode, checkWinCondition, nextRound, showRoundComplete, round]);

  const triggerGameOver = async (message) => {
    setGameOverMessage(message);
    setGamePhase('gameover');
    console.log(`Game over: ${message}`);
    
    if (score > personalBest) {
      setPersonalBest(score);
      console.log(`New personal best: ${score}`);
    }
    
    await submitScore(playerName, score);
    fetchLeaderboard();
  };

  const getCellFromPoint = (clientX, clientY) => {
    if (!gridRef.current) return null;
    
    const gridRect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((clientX - gridRect.left) / 50);
    const y = Math.floor((clientY - gridRect.top) / 50);
    
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      return grid[y][x];
    }
    return null;
  };

  const processCell = (cell, currentGrid, currentScore, currentPathLength, currentLastPlaced, currentActiveEquipment) => {
    if (!cell || gamePhase !== 'playing' || showRoundComplete) return null;

    const infraType = currentActiveEquipment?.equipment?.type === 'electrical' ? 'cable' : 'pipe';
    const oppositeType = infraType === 'cable' ? 'pipe' : 'cable';
    const matchingEqType = infraType === 'cable' ? 'electrical' : 'plumbing';

    if (mode === 'discovery') {
      if (!cell.revealed && !cell.isSource) {
        if (cell.equipment) {
          const eqInfraType = cell.equipment.type === 'electrical' ? 'cable' : 'pipe';
          const newGrid = currentGrid.map(row => row.map(c => ({ ...c })));
          newGrid[cell.y][cell.x].revealed = true;
          newGrid[cell.y][cell.x].infrastructure = eqInfraType;
          
          const alreadyConnected = isConnectedToSource(newGrid, cell.x, cell.y, eqInfraType, gridWidth, gridHeight);
          
          if (alreadyConnected) {
            return { 
              grid: newGrid, 
              score: currentScore + 100,
              mode: 'discovery',
              activeEquipment: null,
              pathLength: 0,
              lastPlacedTile: null
            };
          } else {
            return { 
              grid: newGrid, 
              mode: 'routing',
              activeEquipment: { x: cell.x, y: cell.y, equipment: cell.equipment },
              pathLength: 0,
              lastPlacedTile: { x: cell.x, y: cell.y }
            };
          }
        } else {
          const newGrid = revealBlanks(currentGrid, cell.x, cell.y, 2, gridWidth, gridHeight);
          return { grid: newGrid };
        }
      } else if (cell.revealed && cell.equipment) {
        const eqInfraType = cell.equipment.type === 'electrical' ? 'cable' : 'pipe';
        const alreadyConnected = cell.infrastructure === eqInfraType && 
          isConnectedToSource(currentGrid, cell.x, cell.y, eqInfraType, gridWidth, gridHeight);
        
        if (!alreadyConnected) {
          const newGrid = currentGrid.map(row => row.map(c => ({ ...c })));
          newGrid[cell.y][cell.x].infrastructure = eqInfraType;
          
          return { 
            grid: newGrid,
            mode: 'routing',
            activeEquipment: { x: cell.x, y: cell.y, equipment: cell.equipment },
            pathLength: 0,
            lastPlacedTile: { x: cell.x, y: cell.y }
          };
        }
      }
    } else if (mode === 'routing' && currentActiveEquipment) {
      if (cell.x === currentActiveEquipment.x && cell.y === currentActiveEquipment.y) {
        return null;
      }
      
      const isAdjacent = currentLastPlaced && isAdjacentTo(cell.x, cell.y, currentLastPlaced.x, currentLastPlaced.y);
      if (!isAdjacent) {
        return null;
      }

      if (cell.infrastructure === infraType && 
          !(cell.x === currentActiveEquipment.x && cell.y === currentActiveEquipment.y)) {
        if (isConnectedToSource(currentGrid, cell.x, cell.y, infraType, gridWidth, gridHeight)) {
          return { 
            score: currentScore + 100,
            mode: 'discovery',
            activeEquipment: null,
            pathLength: 0,
            lastPlacedTile: null
          };
        }
        return null;
      }

      if (cell.isSource) {
        const correctSource = (infraType === 'cable' && cell.sourceType === 'electrical') ||
                              (infraType === 'pipe' && cell.sourceType === 'plumbing');
        if (correctSource) {
          return { 
            score: currentScore + 100,
            mode: 'discovery',
            activeEquipment: null,
            pathLength: 0,
            lastPlacedTile: null
          };
        } else {
          return { gameOver: "Connected to the wrong source!" };
        }
      }

      if (!cell.revealed) {
        const newGrid = currentGrid.map(row => row.map(c => ({ ...c })));
        newGrid[cell.y][cell.x].revealed = true;
        
        if (cell.equipment) {
          if (cell.equipment.type === matchingEqType) {
            newGrid[cell.y][cell.x].infrastructure = infraType;
            const newPathLength = currentPathLength + 1;
            const newScore = currentScore + Math.max(1, 10 - currentPathLength);
            const newLastPlaced = { x: cell.x, y: cell.y };
            
            if (!hasValidMoves(newGrid, cell.x, cell.y, currentActiveEquipment, gridWidth, gridHeight)) {
              return { grid: newGrid, gameOver: "No valid moves remaining!" };
            }
            
            return { 
              grid: newGrid,
              score: newScore,
              pathLength: newPathLength,
              lastPlacedTile: newLastPlaced
            };
          } else {
            return { grid: newGrid, gameOver: "You failed to coordinate your trades!" };
          }
        } else {
          newGrid[cell.y][cell.x].infrastructure = infraType;
          const newPathLength = currentPathLength + 1;
          const newScore = currentScore + Math.max(1, 10 - currentPathLength);
          const newLastPlaced = { x: cell.x, y: cell.y };
          
          if (!hasValidMoves(newGrid, cell.x, cell.y, currentActiveEquipment, gridWidth, gridHeight)) {
            return { grid: newGrid, gameOver: "No valid moves remaining!" };
          }
          
          return { 
            grid: newGrid,
            score: newScore,
            pathLength: newPathLength,
            lastPlacedTile: newLastPlaced
          };
        }
      }

      if (cell.infrastructure === oppositeType) {
        return { gameOver: "Cables and pipes cannot cross!" };
      }
      
      if (cell.equipment) {
        if (cell.equipment.type === matchingEqType) {
          const newGrid = currentGrid.map(row => row.map(c => ({ ...c })));
          newGrid[cell.y][cell.x].infrastructure = infraType;
          const newPathLength = currentPathLength + 1;
          const newScore = currentScore + Math.max(1, 10 - currentPathLength);
          const newLastPlaced = { x: cell.x, y: cell.y };
          
          if (isConnectedToSource(newGrid, currentActiveEquipment.x, currentActiveEquipment.y, infraType, gridWidth, gridHeight)) {
            return { 
              grid: newGrid,
              score: newScore + 100,
              mode: 'discovery',
              activeEquipment: null,
              pathLength: 0,
              lastPlacedTile: null
            };
          }
          
          if (!hasValidMoves(newGrid, cell.x, cell.y, currentActiveEquipment, gridWidth, gridHeight)) {
            return { grid: newGrid, gameOver: "No valid moves remaining!" };
          }
          
          return { 
            grid: newGrid,
            score: newScore,
            pathLength: newPathLength,
            lastPlacedTile: newLastPlaced
          };
        } else {
          return { gameOver: "You failed to coordinate your trades!" };
        }
      }
      
      const newGrid = currentGrid.map(row => row.map(c => ({ ...c })));
      newGrid[cell.y][cell.x].infrastructure = infraType;
      const newPathLength = currentPathLength + 1;
      const newScore = currentScore + Math.max(1, 10 - currentPathLength);
      const newLastPlaced = { x: cell.x, y: cell.y };
      
      if (!hasValidMoves(newGrid, cell.x, cell.y, currentActiveEquipment, gridWidth, gridHeight)) {
        return { grid: newGrid, gameOver: "No valid moves remaining!" };
      }
      
      return { 
        grid: newGrid,
        score: newScore,
        pathLength: newPathLength,
        lastPlacedTile: newLastPlaced
      };
    }
    
    return null;
  };

  const applyResult = (result) => {
    if (!result) return;
    
    if (result.gameOver) {
      if (result.grid) setGrid(result.grid);
      triggerGameOver(result.gameOver);
      return;
    }
    
    if (result.grid) setGrid(result.grid);
    if (result.score !== undefined) setScore(result.score);
    if (result.mode) setMode(result.mode);
    if (result.activeEquipment !== undefined) setActiveEquipment(result.activeEquipment);
    if (result.pathLength !== undefined) setPathLength(result.pathLength);
    if (result.lastPlacedTile !== undefined) setLastPlacedTile(result.lastPlacedTile);
  };

  const handlePointerDown = (e, cell) => {
    e.preventDefault();
    setIsDragging(true);
    const result = processCell(cell, grid, score, pathLength, lastPlacedTile, activeEquipment);
    applyResult(result);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || mode !== 'routing') return;
    
    const point = e.touches ? e.touches[0] : e;
    const cell = getCellFromPoint(point.clientX, point.clientY);
    if (cell) {
      const result = processCell(cell, grid, score, pathLength, lastPlacedTile, activeEquipment);
      applyResult(result);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, []);

  const getValidMoves = () => {
    if (mode !== 'routing' || !lastPlacedTile) return new Set();
    
    const valid = new Set();
    const { x, y } = lastPlacedTile;
    const neighbors = [
      { nx: x, ny: y - 1 },
      { nx: x, ny: y + 1 },
      { nx: x - 1, ny: y },
      { nx: x + 1, ny: y },
    ];
    
    const infraType = activeEquipment?.equipment?.type === 'electrical' ? 'cable' : 'pipe';
    const oppositeType = infraType === 'cable' ? 'pipe' : 'cable';
    
    neighbors.forEach(({ nx, ny }) => {
      if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
        const neighborCell = grid[ny]?.[nx];
        if (neighborCell) {
          if (neighborCell.infrastructure === oppositeType) return;
          if (nx === activeEquipment.x && ny === activeEquipment.y) return;
          if (neighborCell.infrastructure === infraType) {
            if (isConnectedToSource(grid, nx, ny, infraType, gridWidth, gridHeight)) {
              valid.add(`${nx},${ny}`);
            }
            return;
          }
          valid.add(`${nx},${ny}`);
        }
      }
    });
    
    return valid;
  };
  
  const validMoves = getValidMoves();

  const isEquipmentConnected = (cell) => {
    if (!cell.equipment) return false;
    const infraType = cell.equipment.type === 'electrical' ? 'cable' : 'pipe';
    return cell.infrastructure === infraType && 
      isConnectedToSource(grid, cell.x, cell.y, infraType, gridWidth, gridHeight);
  };

  const renderGrid = (isGameOver = false) => (
    <div 
      ref={gridRef}
      style={{
        background: '#0f172a',
        padding: '4px',
        border: '4px solid #334155',
        overflowX: 'auto',
        opacity: isGameOver ? 0.6 : 1,
        pointerEvents: isGameOver ? 'none' : 'auto',
      }}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridWidth}, 48px)`,
        gap: '2px',
      }}>
        {grid && grid.map((row, y) =>
          row.map((cell, x) => {
            const isActiveEquipment = activeEquipment?.x === x && activeEquipment?.y === y;
            const infraType = activeEquipment?.equipment?.type === 'electrical' ? 'cable' : 'pipe';
            const isConnected = isEquipmentConnected(cell);
            const isValidMove = validMoves.has(`${x},${y}`);
            
            return (
              <div
                key={`${x}-${y}`}
                className={`cell ${
                  cell.isSource ? (cell.sourceType === 'electrical' ? 'source-power' : 'source-water') :
                  !cell.revealed ? 'hidden' : 'revealed'
                } ${isActiveEquipment ? (activeEquipment.equipment.type === 'electrical' ? 'active-equipment' : 'active-equipment-pipe') : ''} 
                  ${isConnected ? 'connected' : ''} 
                  ${isValidMove && mode === 'routing' ? 'valid-move' : ''}`}
                onMouseDown={(e) => handlePointerDown(e, cell)}
                onTouchStart={(e) => handlePointerDown(e, cell)}
              >
                {cell.infrastructure && (
                  <InfrastructurePath
                    connections={getConnections(grid, x, y, cell.infrastructure, gridWidth, gridHeight)}
                    type={cell.infrastructure}
                    isRouting={mode === 'routing' && cell.infrastructure === infraType}
                  />
                )}
                
                {cell.isSource && (
                  <span style={{ fontSize: '24px', position: 'relative', zIndex: 2 }}>
                    {cell.sourceType === 'electrical' ? '⚡' : '💧'}
                  </span>
                )}
                
                {cell.revealed && cell.equipment && (
                  <span style={{ 
                    fontSize: '24px', 
                    position: 'relative', 
                    zIndex: 2,
                    opacity: isConnected ? 0.5 : 1,
                  }}>
                    {cell.equipment.icon}
                    {isConnected && (
                      <span style={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        fontSize: '12px',
                      }}>✓</span>
                    )}
                  </span>
                )}
                
                {!cell.revealed && !cell.isSource && (
                  <span style={{ color: '#4b5563', fontSize: '16px', position: 'relative', zIndex: 2 }}>?</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (gamePhase === 'name') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '"Press Start 2P", monospace',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        `}</style>
        
        <h1 style={{
          color: '#f59e0b',
          fontSize: '20px',
          textAlign: 'center',
          marginBottom: '8px',
          textShadow: '2px 2px 0 #0f172a',
        }}>
          ⚡ MEP SWEEPER 💧
        </h1>
        
        <p style={{
          color: '#64748b',
          fontSize: '8px',
          marginBottom: '40px',
          textAlign: 'center',
          maxWidth: '280px',
          lineHeight: '1.6',
        }}>
          Route cables & pipes to commission the building!
        </p>
        
        <div style={{
          background: '#1e293b',
          border: '4px solid #334155',
          padding: '24px',
          width: '100%',
          maxWidth: '300px',
        }}>
          <label style={{
            color: '#94a3b8',
            fontSize: '10px',
            display: 'block',
            marginBottom: '12px',
          }}>
            ENTER YOUR NAME
          </label>
          
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
            maxLength={12}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'inherit',
              background: '#0f172a',
              border: '3px solid #475569',
              color: '#e2e8f0',
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
            placeholder="..."
            autoFocus
          />
          
          <button
            onClick={startGame}
            disabled={!playerName.trim()}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '12px',
              fontFamily: 'inherit',
              background: playerName.trim() ? '#10b981' : '#374151',
              border: '3px solid',
              borderColor: playerName.trim() ? '#059669' : '#4b5563',
              color: playerName.trim() ? '#fff' : '#6b7280',
              cursor: playerName.trim() ? 'pointer' : 'not-allowed',
              marginBottom: '12px',
            }}
          >
            START GAME
          </button>
          
          <button
            onClick={() => { fetchLeaderboard(); setShowLeaderboard(true); }}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '10px',
              fontFamily: 'inherit',
              background: '#1e40af',
              border: '3px solid #1d4ed8',
              color: '#e2e8f0',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            🏆 LEADERBOARD
          </button>
          
          <button
            onClick={() => setShowDebug(true)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '10px',
              fontFamily: 'inherit',
              background: '#374151',
              border: '3px solid #4b5563',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            🔧 DEBUG
          </button>
        </div>
        
        {showLeaderboard && (
          <Leaderboard 
            scores={leaderboard} 
            onClose={() => setShowLeaderboard(false)}
            currentPlayerName={playerName}
            loading={leaderboardLoading}
            error={leaderboardError}
            debugInfo={leaderboardDebug}
          />
        )}
        
        {showDebug && (
          <DebugPanel 
            logs={debugLogs}
            onClose={() => setShowDebug(false)}
            onTest={testConnection}
          />
        )}
      </div>
    );
  }

  if (gamePhase === 'gameover') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px',
        fontFamily: '"Press Start 2P", monospace',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          
          .cell {
            width: 48px;
            height: 48px;
            border: 2px solid #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .cell.hidden { background: linear-gradient(135deg, #374151 0%, #1f2937 100%); }
          .cell.revealed { background: #1e293b; }
          .cell.source-power { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-color: #d97706; }
          .cell.source-water { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); border-color: #2563eb; }
          .cell.connected { opacity: 0.5; }
        `}</style>
        
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '24px',
          marginBottom: '12px',
          textAlign: 'center',
          border: '4px solid #ef4444',
          width: '100%',
          maxWidth: `${gridWidth * 50 + 8}px`,
          boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💥</div>
          
          <h2 style={{
            color: '#ef4444',
            fontSize: '14px',
            marginBottom: '12px',
          }}>
            GAME OVER
          </h2>
          
          {gameOverMessage && (
            <p style={{
              color: '#f87171',
              fontSize: '8px',
              marginBottom: '12px',
              lineHeight: '1.6',
            }}>
              {gameOverMessage}
            </p>
          )}
          
          <div style={{ color: '#94a3b8', fontSize: '10px' }}>{playerName}</div>
          <div style={{ color: '#f59e0b', fontSize: '16px', margin: '8px 0' }}>{score.toLocaleString()}</div>
          <div style={{ color: '#64748b', fontSize: '8px', marginBottom: '8px' }}>ROUND {round}</div>
          
          {personalBest > 0 && (
            <div style={{ color: '#a78bfa', fontSize: '8px', marginBottom: '8px' }}>
              YOUR BEST: {personalBest.toLocaleString()}
            </div>
          )}
          
          {submitStatus && (
            <div style={{ 
              color: submitStatus === 'success' ? '#10b981' : submitStatus === 'submitting' ? '#64748b' : '#f87171', 
              fontSize: '8px', 
              marginBottom: '12px' 
            }}>
              {submitStatus === 'success' ? '✓ Score saved!' : 
               submitStatus === 'submitting' ? 'Saving score...' : 
               submitStatus}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={restartGame}
              style={{
                padding: '10px 16px',
                fontSize: '8px',
                fontFamily: 'inherit',
                background: '#ef4444',
                border: '3px solid #dc2626',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              PLAY AGAIN
            </button>
            
            <button
              onClick={() => { fetchLeaderboard(); setShowLeaderboard(true); }}
              style={{
                padding: '10px 16px',
                fontSize: '8px',
                fontFamily: 'inherit',
                background: '#1e40af',
                border: '3px solid #1d4ed8',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              🏆 SCORES
            </button>
            
            <button
              onClick={() => setShowDebug(true)}
              style={{
                padding: '10px 16px',
                fontSize: '8px',
                fontFamily: 'inherit',
                background: '#374151',
                border: '3px solid #4b5563',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              🔧
            </button>
          </div>
        </div>
        
        {renderGrid(true)}
        
        {showLeaderboard && (
          <Leaderboard 
            scores={leaderboard} 
            onClose={() => setShowLeaderboard(false)}
            currentPlayerName={playerName}
            loading={leaderboardLoading}
            error={leaderboardError}
            debugInfo={leaderboardDebug}
          />
        )}
        
        {showDebug && (
          <DebugPanel 
            logs={debugLogs}
            onClose={() => setShowDebug(false)}
            onTest={testConnection}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px',
      fontFamily: '"Press Start 2P", monospace',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
        }
        
        @keyframes pulsePipe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
        }
        
        @keyframes validPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes roundComplete {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .cell {
          width: 48px;
          height: 48px;
          border: 2px solid #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.1s;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          cursor: pointer;
        }
        
        .cell:active {
          transform: scale(0.95);
        }
        
        .cell.hidden {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
        }
        
        .cell.revealed {
          background: #1e293b;
        }
        
        .cell.source-power {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border-color: #d97706;
        }
        
        .cell.source-water {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          border-color: #2563eb;
        }
        
        .cell.active-equipment {
          animation: pulse 1s infinite;
        }
        
        .cell.active-equipment-pipe {
          animation: pulsePipe 1s infinite;
        }
        
        .cell.connected {
          opacity: 0.5;
        }
        
        .cell.valid-move {
          border-color: #10b981;
        }
        
        .cell.valid-move::before {
          content: '';
          position: absolute;
          inset: 0;
          background: #10b981;
          animation: validPulse 1s infinite;
          z-index: 0;
        }
        
        .round-complete-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        
        .round-complete-box {
          background: #1e293b;
          border: 4px solid #10b981;
          padding: 32px;
          text-align: center;
          animation: roundComplete 0.5s ease-in-out infinite;
        }
        
        .help-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        
        .help-rule {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 8px;
          color: #cbd5e1;
          line-height: 1.6;
        }
        
        .help-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
      `}</style>

      {showRoundComplete && (
        <div className="round-complete-overlay">
          <div className="round-complete-box">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
            <h2 style={{ color: '#10b981', fontSize: '14px', marginBottom: '8px' }}>
              ROUND {round} COMPLETE!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '10px' }}>
              Score doubled!
            </p>
          </div>
        </div>
      )}

      <div style={{
        width: '100%',
        maxWidth: `${gridWidth * 50 + 8}px`,
        marginBottom: '12px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}>
          <span style={{ color: '#94a3b8', fontSize: '8px' }}>{playerName}</span>
          <span style={{ color: '#64748b', fontSize: '8px' }}>ROUND {round}</span>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{
            color: '#f59e0b',
            fontSize: '12px',
            margin: 0,
          }}>
            MEP SWEEPER
          </h1>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#10b981', fontSize: '14px' }}>
              {score.toLocaleString()}
            </div>
            {personalBest > 0 && (
              <div style={{ color: '#a78bfa', fontSize: '8px' }}>
                BEST: {personalBest.toLocaleString()}
              </div>
            )}
          </div>
        </div>
        
        {mode === 'routing' && activeEquipment && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            background: activeEquipment.equipment.type === 'electrical' ? '#451a03' : '#0c2d57',
            border: '2px solid',
            borderColor: activeEquipment.equipment.type === 'electrical' ? '#f59e0b' : '#3b82f6',
            fontSize: '8px',
            color: '#e2e8f0',
            textAlign: 'center',
          }}>
            Connect {activeEquipment.equipment.icon} to {activeEquipment.equipment.type === 'electrical' ? '⚡' : '💧'} (drag to draw)
          </div>
        )}
        
        {mode === 'discovery' && !showRoundComplete && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            background: '#1e293b',
            border: '2px solid #475569',
            fontSize: '8px',
            color: '#94a3b8',
            textAlign: 'center',
          }}>
            Tap to reveal tiles
          </div>
        )}
      </div>

      {renderGrid(false)}

      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '16px',
      }}>
        <button
          onClick={restartGame}
          style={{
            padding: '12px 16px',
            fontSize: '8px',
            fontFamily: 'inherit',
            background: '#374151',
            border: '3px solid #4b5563',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          RESTART
        </button>
        
        <button
          onClick={() => { fetchLeaderboard(); setShowLeaderboard(true); }}
          style={{
            padding: '12px 16px',
            fontSize: '8px',
            fontFamily: 'inherit',
            background: '#1e40af',
            border: '3px solid #1d4ed8',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          🏆
        </button>
        
        <button
          onClick={() => setShowHelp(true)}
          style={{
            padding: '12px 16px',
            fontSize: '8px',
            fontFamily: 'inherit',
            background: '#475569',
            border: '3px solid #64748b',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          HELP
        </button>
        
        <button
          onClick={() => setShowDebug(true)}
          style={{
            padding: '12px 16px',
            fontSize: '8px',
            fontFamily: 'inherit',
            background: '#374151',
            border: '3px solid #4b5563',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          🔧
        </button>
      </div>

      {showLeaderboard && (
        <Leaderboard 
          scores={leaderboard} 
          onClose={() => setShowLeaderboard(false)}
          currentPlayerName={playerName}
          loading={leaderboardLoading}
          error={leaderboardError}
          debugInfo={leaderboardDebug}
        />
      )}
      
      {showDebug && (
        <DebugPanel 
          logs={debugLogs}
          onClose={() => setShowDebug(false)}
          onTest={testConnection}
        />
      )}

      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div style={{
            background: '#1e293b',
            border: '4px solid #475569',
            padding: '24px',
            maxWidth: '320px',
            maxHeight: '80vh',
            overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{
              color: '#f59e0b',
              fontSize: '14px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              HOW TO PLAY
            </h2>
            
            <div className="help-rule">
              <span className="help-icon">👆</span>
              <span>Tap hidden tiles to reveal blank areas. Equipment only reveals when tapped directly!</span>
            </div>
            
            <div className="help-rule">
              <span className="help-icon">⚡</span>
              <span>Connect 💡🔌💻 to the power source (top-left) with CABLES</span>
            </div>
            
            <div className="help-rule">
              <span className="help-icon">💧</span>
              <span>Connect 🚰🚽🚿 to the water pump (bottom-right) with PIPES</span>
            </div>
            
            <div className="help-rule">
              <span className="help-icon">👉</span>
              <span>DRAG or SWIPE to draw your route! Or tap one tile at a time.</span>
            </div>
            
            <div className="help-rule">
              <span className="help-icon">🟩</span>
              <span>Green tiles show valid moves.</span>
            </div>
            
            <div className="help-rule">
              <span className="help-icon">🔗</span>
              <span>Connect to existing same-type cable/pipe to branch!</span>
            </div>
            
            <div className="help-rule">
              <span className="help-icon">🔀</span>
              <span>You can route through same-type equipment.</span>
            </div>
            
            <div className="help-rule">
              <span className="help-icon">⚠️</span>
              <span>CABLES and PIPES cannot cross!</span>
            </div>
            
            <div className="help-rule">
              <span className="help-icon">🏆</span>
              <span>Complete rounds to double score. Grid grows each round!</span>
            </div>
            
            <button
              onClick={() => setShowHelp(false)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                fontSize: '10px',
                fontFamily: 'inherit',
                background: '#10b981',
                border: '3px solid #059669',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
