import type { Building, ResourceType } from "../core/Types";

// --- TOASTS ---
export function showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.textContent = message;

    container.appendChild(div);

    // Remove from DOM after animation finishes (4s total)
    setTimeout(() => {
        div.remove();
    }, 4000);
}

// --- PALETTE TOGGLE ---
export function togglePalette(enabled: boolean) {
    const palette = document.getElementById('resource-palette');
    if (!palette) return;

    if (enabled) {
        palette.style.opacity = "1";
        palette.style.pointerEvents = "auto";
    } else {
        palette.style.opacity = "0.5";
        palette.style.pointerEvents = "none";
    }
}

// --- RESOURCE PICKER (Standard) ---
export function showResourcePicker(
    title: string,
    message: string,
    callback: (res: ResourceType) => void,
    excludedResources: string[] = []
) {
    const modal = document.getElementById('resource-picker-modal')!;
    const titleEl = document.getElementById('picker-title')!;
    const msgEl = document.getElementById('picker-message')!;
    const container = document.getElementById('picker-options')!;

    // Set dynamic text
    titleEl.textContent = title;
    msgEl.textContent = message;

    container.innerHTML = '';
    const resources: ResourceType[] = ['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];

    resources.forEach(res => {
        if (excludedResources.includes(res)) return;
        const btn = document.createElement('div');
        btn.className = `res-btn ${res}`;
        btn.onclick = () => {
            modal.classList.add('hidden');
            callback(res);
        };
        container.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

// --- LOBBY LIST ---
export function renderLobbyList(players: any, listElement: HTMLElement) {
    listElement.innerHTML = '<strong>Players:</strong><br>';
    Object.values(players).forEach((p: any) => {
        const div = document.createElement('div');
        div.textContent = `• ${p.name}`;
        listElement.appendChild(div);
    });
}

// --- LEADERBOARD ---
export function renderLeaderboard(players: any, listElement: HTMLElement) {
    listElement.innerHTML = '';

    // Convert to array and Sort by Score (Descending)
    const sorted = Object.values(players).sort((a: any, b: any) => b.score - a.score);

    sorted.forEach((p: any, index) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-row';

        // Highlight 1st place
        if (index === 0) li.classList.add('winner');

        const rank = index + 1;

        li.innerHTML = `
            <div style="display:flex; align-items:center;">
                <div class="rank-badge">${rank}</div>
                <div class="player-info">
                    <span class="player-name">${p.name}</span>
                    <span class="player-details">
                        ${p.isGameOver ? "Finished" : "Playing"} 
                    </span>
                </div>
            </div>
            <div class="final-total">${p.score}</div>
        `;

        listElement.appendChild(li);
    });
}

// --- OPPONENT SIDEBAR ---
export function renderOpponents(
    players: any, 
    currentRound: number, 
    myPlayerId: string, 
    sidebarEl: HTMLElement, 
    listEl: HTMLElement
) {
    // 1. Reveal Sidebar
    sidebarEl.classList.remove('hidden');
    listEl.innerHTML = '';

    // 2. Loop through all players
    Object.keys(players).forEach(key => {
        // Skip myself
        if (key === myPlayerId) return;

        const p = players[key];

        // Determine Status
        const isDone = (p.placedRound === currentRound) || p.isGameOver;
        const statusClass = isDone ? "done" : "thinking";

        // Create Card HTML
        const card = document.createElement('div');
        card.className = 'opponent-card';

        // Header
        const header = document.createElement('div');
        header.className = 'opponent-name';
        header.innerHTML = `
            ${p.name}
            <span class="status-dot ${statusClass}" title="${isDone ? 'Waiting' : 'Thinking'}"></span>
        `;
        card.appendChild(header);

        // Grid Container
        const gridDiv = document.createElement('div');
        gridDiv.className = 'mini-board';

        // 3. Render 4x4 Grid
        if (p.board && Array.isArray(p.board)) {
            p.board.forEach((row: string[]) => {
                row.forEach((cell: string) => {
                    const div = document.createElement('div');
                    div.className = 'mini-cell';

                    if (cell !== 'NONE') {
                        if (['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'].includes(cell)) {
                            div.classList.add(cell);
                        } else {
                            div.classList.add(cell);
                            div.title = cell;

                            // Standard buildings list to detect monuments
                            const standard = [
                                'COTTAGE', 'FARM', 'GRANARY', 'GREENHOUSE', 'ORCHARD',
                                'WELL', 'FOUNTAIN', 'MILLSTONE', 'SHED',
                                'CHAPEL', 'ABBEY', 'CLOISTER', 'TEMPLE',
                                'TAVERN', 'ALMSHOUSE', 'INN', 'FEAST-HALL',
                                'THEATER', 'BAKERY', 'TAILOR', 'MARKET',
                                'FACTORY', 'BANK', 'WAREHOUSE', 'TRADING-POST'
                            ];

                            if (!standard.includes(cell)) {
                                div.classList.add('MONUMENT');
                            }
                        }
                    }
                    gridDiv.appendChild(div);
                });
            });
        }

        card.appendChild(gridDiv);
        listEl.appendChild(card);
    });
}

// --- HOST DROPDOWNS ---
export function initHostDropdowns(containerEl: HTMLElement, categories: any[]) {
    containerEl.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'setup-grid';

    categories.forEach(cat => {
        const group = document.createElement('div');
        group.className = 'setup-group';
        const label = document.createElement('label');
        label.className = 'setup-label';
        label.textContent = cat.label;
        group.appendChild(label);

        const select = document.createElement('select');
        select.className = `setup-select ${cat.id}`;
        select.dataset.category = cat.id;
        const randOpt = document.createElement('option');
        randOpt.value = 'RANDOM';
        randOpt.textContent = `Random`;
        select.appendChild(randOpt);

        cat.options.forEach((b: any) => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = b.name;
            select.appendChild(opt);
        });

        group.appendChild(select);
        grid.appendChild(group);
    });
    containerEl.appendChild(grid);
}

export function showMonumentSelection(
    options: Building[], 
    onSelect: (selected: Building) => void
) {
    const modal = document.getElementById('resource-picker-modal')!; // Reuse or create new
    const title = document.getElementById('picker-title')!;
    const msg = document.getElementById('picker-message')!;
    const container = document.getElementById('picker-options')!;

    title.textContent = "Choose Your Monument";
    msg.textContent = "You have been granted two options. Choose one to construct in your town.";
    container.innerHTML = '';
    
    // Flex container for the two cards
    container.style.display = 'flex';
    container.style.gap = '20px';
    container.style.justifyContent = 'center';
    container.style.flexWrap = 'wrap';

    options.forEach(b => {
        const card = document.createElement('div');
        card.className = 'monument-card-choice';
        card.style.border = "2px solid #9c27b0";
        card.style.borderRadius = "8px";
        card.style.padding = "15px";
        card.style.cursor = "pointer";
        card.style.background = "white";
        card.style.width = "180px";
        card.style.textAlign = "center";
        card.style.transition = "transform 0.2s";

        // Hover effect
        card.onmouseenter = () => card.style.transform = "scale(1.05)";
        card.onmouseleave = () => card.style.transform = "scale(1)";

        card.innerHTML = `
            <h4 style="color:#6a1b9a; margin:0 0 10px 0;">${b.name}</h4>
            <div class="mini-grid" style="margin: 0 auto 10px auto;">
                ${renderMiniPattern(b.pattern)}
            </div>
            <p style="font-size:0.8em; color:#555;">${b.description || "Unique Scoring"}</p>
        `;

        card.onclick = () => {
            // Reset container styles (since we reused generic picker)
            container.style.display = ''; 
            container.style.gap = '';
            container.style.justifyContent = '';
            
            modal.classList.add('hidden');
            onSelect(b);
        };

        container.appendChild(card);
    });

    modal.classList.remove('hidden');
}

// Helper to draw the pattern pattern inside the card
function renderMiniPattern(pattern: any[][]) {
    // 1. Container is a Column (stacks rows vertically)
    let html = '<div style="display:flex; flex-direction:column; gap:2px; align-items:center;">';
    
    pattern.forEach(row => {
        // 2. Each Row is a Flex Row (stacks cells horizontally)
        html += '<div style="display:flex; gap:2px;">';
        
        row.forEach(cell => {
             let color = 'transparent'; // Default for NONE
             let border = '1px solid transparent'; // Invisible border for empty space

             if(cell !== 'NONE') {
                 border = '1px solid rgba(0,0,0,0.1)'; // Subtle border for resources
                 if(cell==='WOOD') color='#5d4037';
                 if(cell==='WHEAT') color='#fdd835';
                 if(cell==='BRICK') color='#ef5350';
                 if(cell==='GLASS') color='#29b6f6';
                 if(cell==='STONE') color='#757575';
             }
             
             html += `<div style="width:15px; height:15px; background:${color}; border:${border}; border-radius:2px;"></div>`;
        });

        html += '</div>';
    });
    html += '</div>';
    return html;
}