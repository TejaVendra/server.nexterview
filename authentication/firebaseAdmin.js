import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const serviceAccountPath =
    process.env.NODE_ENV === "production"
        ? "/etc/secrets/firebase_admin_secret_key.json"
        : "./config/firebase_admin_secret_key.json";

const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf-8")
);

const app = initializeApp({
    credential: cert(serviceAccount),
});

const adminAuth = getAuth(app);

export { app, adminAuth };