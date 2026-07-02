
const admin = require('firebase-admin')

const serviceAccount = require('../config/firebase_admin_secret_key.json')

admin.initializeApp({
    credential:admin.credential.cert(serviceAccount),
})

module.exports = admin;