const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Cargar la base de datos de paradas
const stopsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'stops.json'), 'utf8'));

// Endpoint 1: Obtener todas las paradas (Para el buscador)
app.get('/api/stops', (req, res) => {
    res.json(stopsData);
});

// Endpoint 2: Proxy para Tiempos Reales
// Este endpoint hace la petición al servidor oficial de la EMT y devuelve los datos a tu frontend.
app.get('/api/realtime/:stopId', async (req, res) => {
    const stopId = req.params.stopId;
    
    try {
        /* 
         * AQUI VA LA CONEXIÓN REAL A LA API DE LA EMT.
         * Como los endpoints cambian y a veces requieren token, dejamos la estructura Axios lista.
         * Si tienes acceso a la API directa, descomenta esto:
         * 
         * const response = await axios.get(`https://api.emtpalma.es/v1/arrivals/${stopId}`);
         * return res.json(response.data);
         */

        // SIMULACIÓN PROFESIONAL DE DATOS EN VIVO (MOCK) MIENTRAS CONECTAMOS LA API PRIVADA
        // Genera tiempos reales dinámicos basados en la hora actual para probar la interfaz
        const stopInfo = stopsData.find(s => s.id === stopId);
        if (!stopInfo) return res.status(404).json({ error: 'Parada no encontrada' });

        const arrivals = stopInfo.lines.map(line => {
            // Algoritmo para generar llegadas realistas basadas en el timestamp
            const randomOffset = Math.floor(Math.random() * 15); // 0 a 15 mins
            const eta = randomOffset === 0 ? "Llegando" : `${randomOffset} min`;
            return {
                line: line,
                destination: line === "25" || line === "15" || line === "23" ? "S'Arenal" : "Plaça d'Espanya",
                eta_minutes: randomOffset,
                eta_text: eta
            };
        }).sort((a, b) => a.eta_minutes - b.eta_minutes);

        res.json({
            stop_id: stopId,
            stop_name: stopInfo.name,
            timestamp: new Date().toISOString(),
            arrivals: arrivals
        });

    } catch (error) {
        console.error("Error conectando con la API:", error);
        res.status(500).json({ error: 'Fallo al contactar con el servidor de tiempos.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor EMT Proxy arrancado en http://localhost:${PORT}`);
    console.log(`➡️  Abre el navegador en esa dirección para ver la web.`);
});
