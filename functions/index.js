const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const userRoute = require("./routes/user.js");
const barberRoute = require("./routes/barber.js");
const snackmenRoute = require("./routes/snackmen.js");

const env = "dev";

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

//USER ROUTE
app.use("/api/user", userRoute);

//BARBER ROUTE
app.use("/api/barber", barberRoute);

//SNACKMEN ROUTE
app.use("/api/snackmen", snackmenRoute);

//UPDATE QUEUE_NO
exports.appointmentDeleted = functions.firestore
  .document(`bento/${env}/barber/{documentId}`)
  .onDelete((current, context) => {
    // console.log(current.data());
    db.collection(`bento/${env}/barber`)
      .orderBy("timestamp")
      .get()
      .then(async (snapshot) => {
        let arrayR = snapshot.docs.map((doc) => {
          return { barberId: doc.id, ...doc.data() };
        });
        await db.collection(`bento/${env}/globalVariable`).doc("barber").set({
          queue_length: arrayR.length,
        });
        // console.log(arrayR.length);
        for (let appointment of arrayR) {
          if (appointment.queue_no > current.data().queue_no) {
            // console.log(appointment.name)
            db.doc(`bento/${env}/barber/${appointment.barberId}`).set(
              {
                queue_no: appointment.queue_no - 1,
              },
              { merge: true }
            );
          }
        }
      });
    return Promise.resolve();
  });

//UPDATE SERVICE STATUS
app.put(`/api/service/status/:uid`, async (req, res) => {
  try {
    await db
      .collection(`bento/${env}/status`)
      .doc(req.params.uid)
      .set({ ...req.body });
    res.status(200).json("status updated successfully");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SEND BARBER PUSH NOTIFICATION
exports.barberNotification = functions.firestore
  .document(`/bento/${env}/barber/{documentId}`)
  .onWrite(async (change, context) => {
    try {
      //get all appointments
      const appointments = await db
        .collection(`bento/${env}/barber`)
        .orderBy("timestamp")
        .get();
      const count = appointments.docs.length;

      if (count > 0) {
        //generate payload and fcmTokens
        const firstFour = appointments.docs.slice(0, 4);
        const fcmTokens = [];
        const payload = {
          notification: {
            title: "Your Barber Booking Is Here!🙌",
            body: "You are up for your hair cutting✂️. Please go to the barber shop ASAP🏃‍♂️",
          },
        };
        const options = {
          priority: "high",
          contentAvailable: true,
        };
        //push fcm tokens
        firstFour.map((appointment) => {
          const { fcmToken } = appointment.data();
          fcmTokens.push(fcmToken);
        });
        //send multicast message
        messaging
          .sendToDevice(fcmTokens, payload, options)
          .then((response) => console.log("Successfully sent message"))
          .catch((err) => console.log(err));
      }
    } catch (err) {
      console.log(err);
    }
    return Promise.resolve();
  });

//SEND SNACKMEN NOTIFICATION
exports.snackmenNotification = functions.firestore
  .document(`/bento/${env}/users/{userId}/orders/{orderId}`)
  .onUpdate((change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    if (
      newValue.is_delivered === true &&
      previousValue.is_delivered === false
    ) {
      const payload = {
        notification: {
          title: "Your order has been delivered 🚚",
          body: "Thank you for ordering from Snackmen 😋",
        },
      };
      const options = {
        priority: "high",
        contentAvailable: true,
      };
      return messaging.sendToDevice(newValue.fcmToken, payload, options);
    } else {
      return null;
    }
  });

exports.app = functions.https.onRequest(app);
