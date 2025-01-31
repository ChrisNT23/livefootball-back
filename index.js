const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ruta para obtener partidos en vivo
let lastFetchedMatches = []; // Cache para almacenar los últimos partidos

app.get("/api/football", async (req, res) => {
  try {
    const response = await axios.get("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": process.env.API_KEY,
      },
    });

    if (!response.data || !response.data.response) {
      console.warn("⚠️ API sin respuesta o sin partidos en vivo.");
      return res.json({ response: lastFetchedMatches, message: "No hay partidos en vivo" });
    }

    lastFetchedMatches = response.data.response; // Actualiza la caché
    res.json(response.data);
  } catch (error) {
    console.error("🚨 Error obteniendo partidos en vivo:", error.message);
    res.status(500).json({ error: "Error al obtener los datos de la API" });
  }
});

// Refrescar automáticamente cada 30 segundos
setInterval(async () => {
  try {
    const response = await axios.get("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": process.env.API_KEY,
      },
    });

    if (response.data && response.data.response) {
      lastFetchedMatches = response.data.response; // Cache de partidos
      console.log(`🔄 Datos actualizados (${lastFetchedMatches.length} partidos en vivo)`);
    }
  } catch (error) {
    console.warn("⚠️ Fallo en actualización de datos en vivo:", error.message);
  }
}, 30000);


// Ruta para obtener detalles de un partido específico
app.get("/api/football/:id", async (req, res) => {
  const fixtureId = req.params.id;

  try {
    // Obtener detalles del partido
    const detailsResponse = await axios.get(
      `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
      {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": process.env.API_KEY,
        },
      }
    );

    if (!detailsResponse.data || !detailsResponse.data.response || detailsResponse.data.response.length === 0) {
      console.error(`No se encontraron datos del partido con ID: ${fixtureId}`);
      return res.status(404).json({ error: "No se encontraron datos del partido" });
    }

    const matchData = detailsResponse.data.response[0];

    // Evitar fallos si no hay equipos
    const homeTeam = matchData?.teams?.home || {};
    const awayTeam = matchData?.teams?.away || {};

    if (!homeTeam.id || !awayTeam.id) {
      console.error(`Los datos del equipo están incompletos para el partido con ID: ${fixtureId}`);
      return res.status(404).json({ error: "Los datos del equipo no están disponibles" });
    }

    console.log(`Obteniendo detalles para el partido: ${homeTeam.name} vs ${awayTeam.name}`);

    // Obtener alineaciones del partido
    const lineupsResponse = await axios.get(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
      {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": process.env.API_KEY,
        },
      }
    ).catch(error => {
      console.warn(`Error obteniendo alineaciones para partido ${fixtureId}:`, error.message);
      return { data: { response: [] } };
    });

    // Obtener estadísticas del partido
    const statsResponse = await axios.get(
      `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
      {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": process.env.API_KEY,
        },
      }
    ).catch(error => {
      console.warn(`Error obteniendo estadísticas para partido ${fixtureId}:`, error.message);
      return { data: { response: [] } };
    });

    // Obtener historial de enfrentamientos (head-to-head)
    let h2hData = [];
    if (homeTeam.id && awayTeam.id) {
      const h2hResponse = await axios.get(
        `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeTeam.id}-${awayTeam.id}`,
        {
          headers: {
            "x-rapidapi-host": "v3.football.api-sports.io",
            "x-rapidapi-key": process.env.API_KEY,
          },
        }
      ).catch(error => {
        console.warn(`Error obteniendo historial de enfrentamientos para ${homeTeam.name} vs ${awayTeam.name}:`, error.message);
        return { data: { response: [] } };
      });

      h2hData = h2hResponse.data.response;
    }

    console.log(`Datos obtenidos para partido ${fixtureId}:`, matchData);

    // Respuesta combinada
    res.json({
      details: matchData,
      lineups: lineupsResponse.data.response || [],
      statistics: statsResponse.data.response || [],
      h2h: h2hData,
    });

  } catch (error) {
    console.error("Error obteniendo detalles del partido:", error.message);
    res.status(500).json({ error: "Error obteniendo detalles del partido" });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
