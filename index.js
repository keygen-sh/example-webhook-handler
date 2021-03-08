// Be sure to add these ENV variables!
const {
  KEYGEN_ACCOUNT_ID,
  KEYGEN_PUBLIC_KEY,
  PORT = 8080
} = process.env

const crypto = require('crypto')
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const app = express()

// FIXME(ezekg) Store a reference to the plaintext request body
const setPlaintextBody = (req, res, buf) =>
  req.plaintext = buf != null ? buf.toString() : null

app.use(bodyParser.json({ type: 'application/vnd.api+json', verify: setPlaintextBody }))
app.use(bodyParser.json({ type: 'application/json', verify: setPlaintextBody }))
app.use(morgan('combined'))

// Listen for webhook event notifications sent from Keygen
app.post('/keygen', async (req, res) => {
  const { data } = req.body

  // Verify the authenticity of the webhook event
  const sig = req.headers['x-signature']
  try {
    const verifier = crypto.createVerify('sha256')
    verifier.write(req.plaintext)
    verifier.end()

    const ok = verifier.verify(KEYGEN_PUBLIC_KEY, sig, 'base64')
    if (!ok) {
      throw new Error('Invalid signature')
    }
  } catch (e) {
    console.error(`Signature did not match: webhook_event_id=${data.id} signature=${sig}`, e)

    return res.sendStatus(422)
  }

  switch (data.attributes.event) {
    case 'user.created': {
      const payload = JSON.parse(data.attributes.payload)
      const user = payload.data

      // Handle new user creation - you could e.g. create a new "customer" account
      // to handle future billing events, or you could simply keep your internal
      // records up to date with Keygen's state.

      break
    }
    case 'user.deleted': {
      const payload = JSON.parse(data.attributes.payload)
      const user = payload.data

      // Handle deletion events for your users - you could e.g. cancel up any
      // subscriptions/invoices for the current user, or simply keep your
      // internal records up to date with Keygen's state.

      break
    }
    case 'user.password-reset': {
      const payload = JSON.parse(data.attributes.payload)
      const { passwordResetToken } = payload.meta
      const user = payload.data

      // Email the password reset token to the current user for password reset
      // fulfillment. This event is only sent if you specify `deliver = false`
      // during a password reset request.

      break
    }
    case 'license.created': {
      const payload = JSON.parse(data.attributes.payload)
      const license = payload.data
      const user = license.relationships.user.data

      // Handle billing the current user for their new license, or keep
      // your internal records up to date, etc.

      break
    }
    case 'license.deleted': {
      const payload = JSON.parse(data.attributes.payload)
      const license = payload.data
      const user = license.relationships.user.data

      // Handle crediting the user for their deleted license, or simply
      // update your internal records to show the license is no longer
      // active for the particular user, etc.

      break
    }
    // All event types: https://keygen.sh/docs/api/#webhooks-event-types
  }

  // Let Keygen know the event was received successfully
  res.sendStatus(200)
})

const server = app.listen(PORT, 'localhost', () => {
  const { address, port } = server.address()

  console.log(`Listening at http://${address}:${port}`)
})