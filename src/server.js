import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import { connectDatabase } from './config/db.js'

const app = express()
const port = process.env.PORT || 4000

app.use(express.json())

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Lurph backend server is running.' })
})

async function startServer() {
  await connectDatabase()

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}

async function shutDown() {
  await mongoose.disconnect()
  process.exit(0)
}

process.on('SIGINT', shutDown)
process.on('SIGTERM', shutDown)

startServer().catch((error) => {
  console.error('Failed to start server:', error.message)
  process.exit(1)
})
