import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import serviceAccount from "../config/firebase_admin_secret_key.json" with { type: "json" };

const app = initializeApp({
    credential: cert(serviceAccount),
});

const adminAuth = getAuth(app);

export { app, adminAuth };