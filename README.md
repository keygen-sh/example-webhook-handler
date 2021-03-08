# Example Keygen Webhook Handler
The following web app is written in Node.js and shows how to set up a simple
webhook handler for [Keygen](https://keygen.sh), allowing you to listen for
and act upon particular events on your Keygen account.

> **This example application is not 100% production-ready**, but it should
> get you 90% of the way there. You may need to add additional logging,
> error handling, validation, features, etc.

## Running the app

First up, configure a few environment variables:
```bash
# Your Keygen account ID.
export KEYGEN_ACCOUNT_ID="YOUR_KEYGEN_ACCOUNT_ID"

# Your Keygen account's public key (make sure it is *exact* - newlines and all)
export KEYGEN_PUBLIC_KEY=$(printf %b \
  '-----BEGIN PUBLIC KEY-----\n' \
  'zdL8BgMFM7p7+FGEGuH1I0KBaMcB/RZZSUu4yTBMu0pJw2EWzr3CrOOiXQI3+6bA\n' \
  # …
  'efK41Ml6OwZB3tchqGmpuAsCEwEAaQ==\n' \
  '-----END PUBLIC KEY-----')
```

You can either run each line above within your terminal session before
starting the app, or you can add the above contents to your `~/.bashrc`
file and then run `source ~/.bashrc` after saving the file.

Next, install dependencies with [`yarn`](https://yarnpkg.comg):
```
yarn
```

Then start the app:
```
yarn start
```

## Testing webhooks locally

For local development, create an [`ngrok`](https://ngrok.com) tunnel:
```
ngrok http 8080
```

Next up, add the secure `ngrok` URL to your Keygen account to listen
for webhook events.

1. **Keygen:** add `https://{YOUR_NGROK_URL}/keygen` to https://app.keygen.sh/webhook-endpoints

You can now create events within your Keygen account, e.g. create a new
license, and the webhook event will be sent to your local server.

## Questions?

Reach out at [support@keygen.sh](mailto:support@keygen.sh) if you have any
questions or concerns!
