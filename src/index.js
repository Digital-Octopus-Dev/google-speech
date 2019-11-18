#!/usr/bin/env node

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const speech = require('@google-cloud/speech')
const fs = require('fs')
const { fetchRemoteAudioFile } = require('./helpers')

app.use(bodyParser.json())

const { GOOGLE_APPLICATION_CREDENTIALS, PORT = 8080 } = process.env

// @TODO: Clean this up? What's the best way to deal w/ `GOOGLE_APPLICATION_CREDENTIALS` & OMS/Containers?
const encodedCredentials = Buffer.from(GOOGLE_APPLICATION_CREDENTIALS, 'base64')
const decodedCredentials = encodedCredentials.toString('ascii')
fs.writeFileSync('/tmp/credentials.json', decodedCredentials)
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/credentials.json'

// Instantiates a client
const client = new speech.SpeechClient()

app.post('/transcribe', async (req, res) => {
  const { encoding = 'LINEAR16', languageCode = 'en-US', sampleRateHertz = 16000, url = '' } = req.body

  const file = await fetchRemoteAudioFile(url).catch(er => {
    res.status(500).json({ message: er })
  })
  const audioBytes = file.toString('base64')

  const request = {
    audio: { content: audioBytes },
    config: { encoding, sampleRateHertz, languageCode }
  }

  client
    .recognize(request)
    .then(data => {
      const results = data[0].results[0].alternatives[0]
      res.json(results)
    })
    .catch(er => {
      res.status(500).json({ message: er.message })
    })
})

app.get('/health', (req, res) => res.send('OK'))

app.listen(PORT, () => console.log(`Listening on localhost: http://localhost:${PORT}`))
