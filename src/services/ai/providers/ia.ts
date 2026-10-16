import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { userMessage } = req.body;

  if (!userMessage) {
    res.status(400).json({ error: "El mensaje es requerido" });
    return;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.IA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "llama-3.3-70b-versatile", // Modelo gratuito de alto rendimiento
        "messages": [
          { "role": "system", "content": "Eres un asistente de asesoría útil y conciso." },
          { "role": "user", "content": userMessage }
        ]
      })
    });

    const data: any = await response.json();

    if (!response.ok || data.error) {
      console.error("Error en Groq API:", data.error || data);
      res.status(response.status).json({ error: data.error?.message || "Error al procesar la solicitud" });
      return;
    }

    const botReply = data.choices[0]?.message?.content;
    res.json({ reply: botReply });

  } catch (error) {
    console.error("Error en el servidor:", error);
    res.status(500).json({ error: "Error interno al conectar con la IA" });
  }
});

app.listen(3000, () => console.log('Servidor corriendo en el puerto 3000'));