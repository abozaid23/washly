import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { api } from "./api";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return null;

    await api.patch("/auth/fcm-token", { fcm_token: token });

    return token;
  } catch (err) {
    console.warn("requestNotificationPermission failed:", err);
    return null;
  }
}
