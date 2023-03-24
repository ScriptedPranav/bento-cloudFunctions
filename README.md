# bento_firebase_cloudFunction
This repository contains a collection of Firebase Cloud Functions for the mobile application ‘Bento’. The functions are written in Node.js and perform CRUD operations on the Firestore database.

Introduction
Bento is a mobile application that provides various services to its users. This repository contains the Firebase Cloud Functions that power the backend of the application. These functions perform CRUD operations on the Firestore database and send push notifications to clients.

Usage
To use these functions, you will need to have Firebase CLI installed and be logged in to your Firebase account. Then, you can deploy the functions to your Firebase project.

Function Summaries
User Route: The user route is set up for the Express app using app.use("/api/user", userRoute);.
Barber Route: The barber route is set up for the Express app using app.use("/api/barber", barberRoute);.
Snackmen Route: The snackmen route is set up for the Express app using app.use("/api/snackmen", snackmenRoute);.
Appointment Deleted: The appointmentDeleted function is triggered when a barber appointment is deleted from the Firestore database. It updates the queue length and queue numbers of other appointments in the database.
Update Service Status: The app.put(/api/service/status/:uid, async (req, res) => {...} function is an Express route that updates the service status in the Firestore database when called.
Barber Notification: The barberNotification function is triggered when a change is made to a barber document in the Firestore database. It sends push notifications to clients who are up in the waiting queue list.
Snackmen Notification: The snackmenNotification function is triggered when an update is made to an order document in the Firestore database. It sends a push notification to the client when their order is delivered.
Contribution Guidelines
We welcome contributions to this repository! If you would like to contribute, please follow these steps:

Fork this repository
Create a new branch for your changes
Make your changes and commit them
Push your changes to your fork
Open a pull request in this repository
Please make sure to follow our code style and add tests for any new features or bug fixes.

