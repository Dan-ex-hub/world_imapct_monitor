#!/usr/bin/env node

/**
 * Generate VAPID keys for web push notifications
 * Run: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('\n🔑 VAPID Keys Generated\n')
console.log('Add these to your .env.local file:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`)
console.log('\n✅ Done!\n')
