// Be sure to add these ENV variables!
const {
  KEYGEN_ACCOUNT_ID,
  KEYGEN_VERIFY_KEY,
  PORT = 8080,
} = process.env

const crypto = require('crypto')
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const app = express()

// There is likely a third-party module for this, but we want to show
// how to parse the signature header without one.
function parseParameterizedHeader(header) {
  if (header == null) {
    return null
  }

  const params = header.split(/\s*,\s*/g)
  const keyvalues = params.map(param => {
    const [, key, value] = param.match(/([^=]+)="([^"]+)"/i)

    return [key, value]
  })

  return keyvalues.reduce(
    (o, [k, v]) => (o[k] = v, o),
    {}
  )
}

// Encode hexadecimal key into DER format, since Node's crypto module doesn't
// accept keys in hex format. This is all a bit magical, but it creates a
// buffer of bytes according to the DER spec. There are likely third-party
// modules for this.
function encodeHexKeyToDerFormat(hex) {
  const oid = Buffer.from([0x06, 0x03, 0x2B, 0x65, 0x70]) // Ed25519 oid
  const key = Buffer.from(hex, 'hex')
  const elements = Buffer.concat([
    Buffer.concat([
      Buffer.from([0x30]), // Sequence tag
      Buffer.from([oid.length]),
      oid,
    ]),
    Buffer.concat([
      Buffer.from([0x03]), // Bit tag
      Buffer.from([key.length + 1]),
      Buffer.from([0x00]), // Zero bit
      key,
    ]),
  ])

  const der = Buffer.concat([
    Buffer.from([0x30]), // Sequence tag
    Buffer.from([elements.length]),
    elements,
  ])

  return der
}

// Verify a webhook event's request signature
function verifyRequestSignature(req) {
  try {
    // Parse the signature header
    const header = parseParameterizedHeader(req.headers['keygen-signature'])
    if (header == null) {
      console.warn(`Signature is missing`)

      return false
    }

    // Extract the algorithm and signature from the header
    const { algorithm, signature } = header

    // Ensure signing algorithm is what we expect
    if (algorithm !== 'ed25519') {
      console.warn(`Algorithm did not match: ${algorithm}`)

      return false
    }

    // Verify integrity
    const hash = crypto.createHash('sha256').update(req.plaintext)
    const digest = `sha-256=${hash.digest('base64')}`
    if (digest !== req.headers['digest']) {
      console.warn(`Digest did not match: ${digest}`)

      return false
    }

    // Reconstruct the signing data
    const host = req.headers['host']
    const date = req.headers['date']
    const data = [
      `(request-target): ${req.method.toLowerCase()} ${req.path}`,
      `host: ${host}`,
      `date: ${date}`,
      `digest: ${digest}`,
    ].join('\n')

    // Initialize our public key
    const verifyKey = crypto.createPublicKey({
      key: encodeHexKeyToDerFormat(KEYGEN_VERIFY_KEY),
      format: 'der',
      type: 'spki',
    })

    // Decode and verify the signature
    const signatureBytes = Buffer.from(signature, 'base64')
    const dataBytes = Buffer.from(data)
    const ok = crypto.verify(null, dataBytes, verifyKey, signatureBytes)

    return ok
  } catch (e) {
    console.error(e)

    return false
  }
}

// FIXME(ezekg) Hack to store a reference to the plaintext request body
const setPlaintextBody = (req, res, buf) =>
  req.plaintext = buf != null ? buf.toString() : null

app.use(bodyParser.json({ type: 'application/vnd.api+json', verify: setPlaintextBody }))
app.use(bodyParser.json({ type: 'application/json', verify: setPlaintextBody }))
app.use(morgan('combined'))

// Listen for webhook event notifications sent from Keygen
app.post('/keygen', async (req, res) => {
  const { data } = req.body

  // Verify the authenticity of the webhook event
  if (!verifyRequestSignature(req)) {
    console.error(`Signature did not match: webhook_event_id=${data?.id}`)

    return res.sendStatus(400)
  }

  switch (data.attributes.event) {
    case 'user.created': {
      const payload = JSON.parse(data.attributes.payload)
      const user = payload.data

      // Handle new user creation - you could e.g. create a new "customer" account
      // to handle future billing events, or you could simply keep your internal
      // records up to date with Keygen's state.
      console.log('Received user created webhook event!')

      break
    }
    case 'user.deleted': {
      const payload = JSON.parse(data.attributes.payload)
      const user = payload.data

      // Handle deletion events for your users - you could e.g. cancel up any
      // subscriptions/invoices for the current user, or simply keep your
      // internal records up to date with Keygen's state.
      console.log('Received user deleted webhook event!')

      break
    }
    case 'user.password-reset': {
      const payload = JSON.parse(data.attributes.payload)
      const { passwordResetToken } = payload.meta
      const user = payload.data

      // Email the password reset token to the current user for password reset
      // fulfillment. This event is only sent if you specify `deliver = false`
      // during a password reset request.
      console.log('Received user password reset webhook event!')

      break
    }
    case 'license.created': {
      const payload = JSON.parse(data.attributes.payload)
      const license = payload.data
      const user = license.relationships.user.data

      // Handle billing the current user for their new license, or keep
      // your internal records up to date, etc.
      console.log('Received license created webhook event!')

      break
    }
    case 'license.deleted': {
      const payload = JSON.parse(data.attributes.payload)
      const license = payload.data
      const user = license.relationships.user.data

      // Handle crediting the user for their deleted license, or simply
      // update your internal records to show the license is no longer
      // active for the particular user, etc.
      console.log('Received license deleted webhook event!')

      break
    }
    default: {
      // All event types: https://keygen.sh/docs/api/#webhooks-event-types
      console.log(`Received unknown webhook event: ${data.attributes.event}`)
    }
  }

  // Let Keygen know the event was received successfully
  res.sendStatus(200)
})

const server = app.listen(PORT, 'localhost', () => {
  const { address, port } = server.address()

  console.log(`Listening at http://${address}:${port}`)
})
