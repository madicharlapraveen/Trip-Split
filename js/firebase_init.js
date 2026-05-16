// firebase_init.js - Firebase initialization
const firebaseConfig = {
  apiKey: "AIzaSyAhQbR3Py7k9LMKFTFQQFOgN7QK5KIuhDo",
  authDomain: "trip-split-e56d3.firebaseapp.com",
  projectId: "trip-split-e56d3",
  storageBucket: "trip-split-e56d3.firebasestorage.app",
  messagingSenderId: "383562992071",
  appId: "1:383562992071:web:143d4d703d0f50b67371e2"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized for Hosting/Services");
}
