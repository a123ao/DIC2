document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const gridEl = document.getElementById('grid');
    const gridSizeInput = document.getElementById('grid-size');
    const nValueDisplays = [document.getElementById('n-value'), document.getElementById('n-value-2')];
    const obstaclesExpectedEl = document.getElementById('obstacles-expected');
    const obstaclesPlacedEl = document.getElementById('obstacles-placed');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const modeRadios = document.querySelectorAll('input[name="drawMode"]');
    
    const btnReset = document.getElementById('btn-reset');
    const btnEvaluate = document.getElementById('btn-evaluate');
    const btnOptimize = document.getElementById('btn-optimize');
    const statusMessage = document.getElementById('status-message');

    // State
    let n = 5;
    let startCell = null; // [r, c]
    let endCell = null;   // [r, c]
    let obstacles = [];   // Array of [r, c]
    let drawMode = 'start'; // 'start', 'end', 'obstacle'
    
    // Icons for arrows
    const ARROW_ICONS = {
        'up': '<i class="fa-solid fa-arrow-up"></i>',
        'down': '<i class="fa-solid fa-arrow-down"></i>',
        'left': '<i class="fa-solid fa-arrow-left"></i>',
        'right': '<i class="fa-solid fa-arrow-right"></i>'
    };

    // Initialization
    function init() {
        updateGridSize();
        
        // Event Listeners
        gridSizeInput.addEventListener('input', (e) => {
            n = parseInt(e.target.value);
            updateGridSize();
        });

        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                drawMode = e.target.value;
                document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
                e.target.closest('.mode-btn').classList.add('active');
            });
        });

        btnReset.addEventListener('click', resetGrid);
        btnEvaluate.addEventListener('click', () => runAlgorithm('/api/evaluate', 'Random Policy Evaluation Complete'));
        btnOptimize.addEventListener('click', () => runAlgorithm('/api/optimize', 'Value Iteration Complete (Optimal Policy Found)'));
    }

    function updateGridSize() {
        nValueDisplays.forEach(el => el.textContent = n);
        
        const maxObstacles = Math.max(0, n - 2);
        obstaclesExpectedEl.textContent = maxObstacles;
        
        resetGrid();
    }

    function resetGrid() {
        startCell = null;
        endCell = null;
        obstacles = [];
        updateObstaclesCount();
        
        gridEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        gridEl.style.gridTemplateRows = `repeat(${n}, 1fr)`;
        gridEl.innerHTML = '';
        
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                // Add click event
                cell.addEventListener('mousedown', handleCellClick);
                cell.addEventListener('mouseenter', handleCellHoverClick);
                
                gridEl.appendChild(cell);
            }
        }
        
        updateButtonsState();
        setStatus("Grid reset. Please set start and end points.", "");
    }

    let isMouseDown = false;
    document.addEventListener('mousedown', () => isMouseDown = true);
    document.addEventListener('mouseup', () => isMouseDown = false);

    function handleCellHoverClick(e) {
        if (isMouseDown && drawMode === 'obstacle') {
            handleCellClick(e);
        }
    }

    function handleCellClick(e) {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        
        // Clear value/arrow texts
        clearResults();

        if (drawMode === 'start') {
            if (isSameCell(endCell, [r, c]) || isObstacle([r, c])) animateError(cell);
            else {
                if (startCell) getCellEl(startCell[0], startCell[1]).classList.remove('is-start');
                startCell = [r, c];
                cell.classList.add('is-start');
                
                // Auto switch to end mode if end is not set
                if (!endCell) {
                    document.querySelector('.mode-end input').checked = true;
                    document.querySelector('.mode-end input').dispatchEvent(new Event('change'));
                }
            }
        } 
        else if (drawMode === 'end') {
            if (isSameCell(startCell, [r, c]) || isObstacle([r, c])) animateError(cell);
            else {
                if (endCell) getCellEl(endCell[0], endCell[1]).classList.remove('is-end');
                endCell = [r, c];
                cell.classList.add('is-end');
                
                // Auto switch to obstacle mode if obstacles aren't full
                if (obstacles.length < n - 2) {
                    document.querySelector('.mode-obstacle input').checked = true;
                    document.querySelector('.mode-obstacle input').dispatchEvent(new Event('change'));
                }
            }
        } 
        else if (drawMode === 'obstacle') {
            if (isSameCell(startCell, [r, c]) || isSameCell(endCell, [r, c])) animateError(cell);
            else {
                const maxObstacles = Math.max(0, n - 2);
                if (isObstacle([r, c])) {
                    // Remove obstacle
                    obstacles = obstacles.filter(obs => obs[0] !== r || obs[1] !== c);
                    cell.classList.remove('is-obstacle');
                } else if (obstacles.length < maxObstacles) {
                    // Add obstacle
                    obstacles.push([r, c]);
                    cell.classList.add('is-obstacle');
                } else {
                    animateError(cell);
                    setStatus(`Cannot place more than ${maxObstacles} obstacles.`, "error");
                    return;
                }
                updateObstaclesCount();
            }
        }
        
        updateButtonsState();
    }

    function clearResults() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.innerHTML = '';
        });
    }

    function updateObstaclesCount() {
        obstaclesPlacedEl.textContent = obstacles.length;
    }

    function getCellEl(r, c) {
        return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    }

    function isSameCell(c1, c2) {
        return c1 && c2 && c1[0] === c2[0] && c1[1] === c2[1];
    }

    function isObstacle(c) {
        return obstacles.some(obs => obs[0] === c[0] && obs[1] === c[1]);
    }

    function animateError(el) {
        el.style.animation = 'none';
        el.offsetHeight; /* trigger reflow */
        el.style.animation = 'shake 0.4s ease-in-out';
    }

    // Add simple shake animation
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);

    function updateButtonsState() {
        const isValid = startCell && endCell;
        btnEvaluate.disabled = !isValid;
        btnOptimize.disabled = !isValid;
        
        if (isValid) {
            setStatus("Ready to evaluate or optimize.", "success");
        } else {
            setStatus("Please set start and end points.", "");
        }
    }

    function setStatus(msg, type) {
        statusMessage.textContent = msg;
        statusMessage.className = `status-message ${type}`;
    }

    async function runAlgorithm(endpoint, successMsg) {
        if (!startCell || !endCell) return;
        
        btnEvaluate.disabled = true;
        btnOptimize.disabled = true;
        btnReset.disabled = true;
        setStatus("Calculating...", "");
        clearResults();
        
        // Add start and end text
        getCellEl(startCell[0], startCell[1]).innerHTML = 'Start';
        getCellEl(endCell[0], endCell[1]).innerHTML = 'Goal';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    n: n,
                    start: startCell,
                    end: endCell,
                    obstacles: obstacles
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                renderResults(data.V, data.policy, endpoint.includes('optimize'));
                setStatus(successMsg, "success");
            } else {
                setStatus("An error occurred.", "error");
            }
        } catch (error) {
            console.error('Error:', error);
            setStatus("Network error during fetch.", "error");
        } finally {
            updateButtonsState();
            btnReset.disabled = false;
        }
    }

    function renderResults(V, policy, isOptimal) {
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (isSameCell([r, c], endCell)) continue;
                if (isObstacle([r, c])) continue;
                
                const cell = getCellEl(r, c);
                const val = V[r][c];
                const action = policy[r][c];
                
                // Format value
                const formattedVal = val.toFixed(2);
                
                let content = `<div class="value">${formattedVal}</div>`;
                if (action) {
                    content += `<div class="arrow ${isOptimal ? 'optimal' : ''}">${ARROW_ICONS[action] || action}</div>`;
                }
                
                // Keep the text text inside start cell if it's there
                if (isSameCell([r, c], startCell)) {
                    content = `<div class="value">${formattedVal}</div>` + content + '<div style="font-size:0.75rem; margin-top:-5px">Start</div>';
                }
                
                cell.innerHTML = content;
            }
        }
    }

    // Start
    init();
});
