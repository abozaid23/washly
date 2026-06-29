/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDupWBv36dKJCKkbxIoCrGWLeAONpGupFM",
  authDomain: "washly-app-812e0.firebaseapp.com",
  projectId: "washly-app-812e0",
  storageBucket: "washly-app-812e0.firebasestorage.app",
  messagingSenderId: "905139030051",
  appId: "1:905139030051:web:2bc04e6baf99b7c5438996",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "واشلي";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
  });
});
