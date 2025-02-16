import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { google } from 'googleapis'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()
const app = express()
app.use(helmet())
app.use(express.json())

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-Requested-With']
}
app.use(cors(corsOptions))

const PORT = process.env.RELAY_PORT || 3001
const INTERNAL_SERVER = process.env.INTERNAL_SERVER
const SCOPES = process.env.SCOPES.split(",")

// Initialize Google auth with service account
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    scopes: SCOPES
})

const drive = google.drive({ version: 'v3', auth })

// Register webhook with Google Drive
app.post('/register', async (req, res) => {
    try {
        const response = await drive.changes.watch({
            pageToken: req.body.pageToken,
            requestBody: {
                id: req.body.channelId,
                type: 'web_hook',
                address: `${process.env.PUBLIC_URL}/webhook`,
            },
        })
        res.json(response.data)
    } catch (error) {
        console.error('Failed to register webhook:', error)
        res.status(500).json({ error: 'Failed to register webhook' })
    }
})

// Receive webhook from Google Drive and relay to internal server
app.post('/webhook', async (req, res) => {
    try {
        // Relay the notification to internal server
        await axios.post(`${INTERNAL_SERVER}/webhook`, req.body, {
            headers: {
                'X-Goog-Channel-ID': req.headers['x-goog-channel-id'],
                'X-Goog-Channel-Token': req.headers['x-goog-channel-token'],
                'X-Goog-Resource-ID': req.headers['x-goog-resource-id'],
                'X-Goog-Resource-State': req.headers['x-goog-resource-state'],
                'X-Goog-Resource-URI': req.headers['x-goog-resource-uri'],
                'X-Goog-Message-Number': req.headers['x-goog-message-number']
            }
        })
        res.status(200).send('OK')
    } catch (error) {
        console.error('Failed to relay webhook:', error)
        res.status(500).json({ error: 'Failed to relay webhook' })
    }
})

app.listen(PORT, () => {
    console.log(`Relay server running on port ${PORT}`)
})
