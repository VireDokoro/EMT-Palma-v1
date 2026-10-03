let allStops = [];
let currentStopId = null;
let refreshInterval = null;
let countdownInterval = null;
let countdown = 15;

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const clearSearch = document.getElementById('clearSearch');
const realTimeBoard = document.getElementById('realTimeBoard');
const stopNameDisplay = document.getElementById('stopNameDisplay');
const stopIdDisplay = document.getElementById('stopIdDisplay');
const arrivalsList = document.getElementById('arrivalsList');
const countdownTimer = document.getElementById('countdownTimer');
const favBtn = document.getElementById('favBtn');

// 1. Cargar las paradas desde nuestro proxy al iniciar
async function loadStops() {
    try {
        const res = await fetch('/api/stops');
        allStops = await res.json();
    } catch (err) {
        console.error("Error cargando paradas. Comprueba que el servidor Node está corriendo.", err);
    }
}

// 2. Lógica del buscador ultrarrápido
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 1) {
        searchResults.classList.add('hidden');
        return;
    }

    // Filtrar por ID, Nombre o Línea
    const filtered = allStops.filter(stop => 
        stop.id.includes(query) || 
        stop.name.toLowerCase().includes(query) ||
        stop.lines.some(line => line.toLowerCase() === query)
    ).slice(0, 10); // Mostrar máximo 10 para rendimiento

    renderSearchResults(filtered);
});

function renderSearchResults(results) {
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="result-item"><div class="result-info"><p>No se encontraron paradas.</p></div></div>';
    } else {
        searchResults.innerHTML = results.map(stop => `
            <div class="result-item" onclick="selectStop('${stop.id}', '${stop.name.replace(/'/g, "\'")}')">
                <div class="result-info">
                    <h4>${stop.name}</h4>
                    <p>Parada ${stop.id}</p>
                </div>
                <div class="lines-container">
                    ${stop.lines.slice(0,4).map(l => `<span class="line-tag">${l}</span>`).join('')}
                    ${stop.lines.length > 4 ? '<span class="line-tag">...</span>' : ''}
                </div>
            </div>
        `).join('');
    }
    searchResults.classList.remove('hidden');
}

clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchResults.classList.add('hidden');
    searchInput.focus();
});

// 3. Seleccionar Parada y Arrancar Tiempo Real
window.selectStop = function(id, name) {
    currentStopId = id;
    searchInput.value = '';
    searchResults.classList.add('hidden');
    
    stopNameDisplay.textContent = name;
    stopIdDisplay.textContent = id;
    realTimeBoard.classList.remove('hidden');
    
    checkFavoriteStatus();
    fetchRealTimeData();

    // Limpiar intervalos anteriores si los hay
    if (refreshInterval) clearInterval(refreshInterval);
    if (countdownInterval) clearInterval(countdownInterval);

    // Ciclo de actualización cada 15 segundos
    countdown = 15;
    countdownInterval = setInterval(() => {
        countdown--;
        if (countdown < 0) countdown = 15;
        countdownTimer.textContent = countdown;
    }, 1000);

    refreshInterval = setInterval(fetchRealTimeData, 15000);
};

// 4. Conectar con el Proxy para datos en vivo
async function fetchRealTimeData() {
    if (!currentStopId) return;
    
    try {
        const res = await fetch(`/api/realtime/${currentStopId}`);
        const data = await res.json();
        
        if (data.error) {
            arrivalsList.innerHTML = `<p style="color: #ff453a; padding: 15px;">${data.error}</p>`;
            return;
        }

        if (data.arrivals.length === 0) {
            arrivalsList.innerHTML = '<p style="color: var(--text-secondary); padding: 15px;">No hay estimaciones disponibles en este momento.</p>';
            return;
        }

        arrivalsList.innerHTML = data.arrivals.map(arr => {
            const isArriving = arr.eta_minutes === 0;
            const etaClass = isArriving ? 'eta arriving' : 'eta';
            const etaDisplay = isArriving ? '><' : arr.eta_minutes;
            const unitDisplay = isArriving ? 'Llegando' : 'min';

            return `
            <li class="arrival-card">
                <div class="line-number">${arr.line}</div>
                <div class="destination-info">
                    <h3>${arr.destination}</h3>
                    <p><i class="ph ph-wifi-high"></i> En tiempo real</p>
                </div>
                <div class="time-info">
                    <span class="${etaClass}">${etaDisplay}</span>
                    <span class="unit">${unitDisplay}</span>
                </div>
            </li>
            `;
        }).join('');

    } catch (err) {
        console.error("Error consultando el proxy", err);
    }
}

// 5. Favoritos (Guardado Local)
favBtn.addEventListener('click', () => {
    let favs = JSON.parse(localStorage.getItem('emtFavs')) || [];
    const index = favs.indexOf(currentStopId);
    
    if (index === -1) {
        favs.push(currentStopId); // Añadir
        favBtn.classList.add('active');
        favBtn.innerHTML = '<i class="ph-fill ph-heart"></i>';
    } else {
        favs.splice(index, 1); // Quitar
        favBtn.classList.remove('active');
        favBtn.innerHTML = '<i class="ph ph-heart"></i>';
    }
    
    localStorage.setItem('emtFavs', JSON.stringify(favs));
});

function checkFavoriteStatus() {
    const favs = JSON.parse(localStorage.getItem('emtFavs')) || [];
    if (favs.includes(currentStopId)) {
        favBtn.classList.add('active');
        favBtn.innerHTML = '<i class="ph-fill ph-heart"></i>';
    } else {
        favBtn.classList.remove('active');
        favBtn.innerHTML = '<i class="ph ph-heart"></i>';
    }
}

// Iniciar app
loadStops();
