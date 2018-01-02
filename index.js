// Be sure to add these ENV variables!
const {
  KEYGEN_ACCOUNT_ID,
  KEYGEN_TOKEN,
  PORT = 8080
} = process.env

const fetch = require('node-fetch')
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const app = express()

app.use(bodyParser.json({ type: 'application/vnd.api+json' }))
app.use(bodyParser.json({ type: 'application/json' }))
app.use(morgan('combined'))

// Listen for webhook events from Keygen which can be created by client-side
// events such as: license creation, license deletion, password resets, etc.
app.post('/keygen', async (req, res) => {
  const { data: { id } } = req.body

  // Fetch the webhook to validate it and get its most up-to-date state
  const event = await fetch(`https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}/webhook-events/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KEYGEN_TOKEN}`,
      'Accept': 'application/vnd.api+json'
    }
  })

  const { data, errors } = await event.json()
  if (errors) {
    return res.sendStatus(200) // Webhook event does not exist
  }

  switch (data.attributes.event) {
    case 'user.created': {
      const user = JSON.parse(data.attributes.payload)

      // Handle new user creation - you could e.g. create a new "customer" account
      // to handle future billing events, or you could simply keep your internal
      // records up to date with Keygen's state.

      break
    }
    case 'user.deleted': {
      const user = JSON.parse(data.attributes.payload)

      // Handle deletion events for your users - you could e.g. cancel up any
      // subscriptions/invoices for the current user, or simply keep your
      // internal records up to date with Keygen's state.

      break
    }
    case 'user.password-reset': {
      const reset = JSON.parse(data.attributes.payload)
      const { passwordResetToken } = reset.meta
      const user = reset.data

      // Email the password reset token to the current user for password reset
      // fulfillment. This event is only sent if you specify `deliver = false`
      // during a password reset request.

      break
    }
    case 'license.created': {
      const license = JSON.parse(data.attributes.payload)
      const user = license.relationships.user.data

      // Handle billing the current user for their new license, or keep
      // your internal records up to date, etc.

      break
    }
    case 'license.deleted': {
      const license = JSON.parse(data.attributes.payload)
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