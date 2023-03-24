const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const userRoute = require("./routes/user.js");
const barberRoute = require("./routes/barber.js");
const snackmenRoute = require("./routes/snackmen.js");

const env = "prod"

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
exports.appointmentDeletedProd = functions.firestore
  .document(`bento/${env}/barber/{appointmetId}`)
  .onDelete(async (current, context) => {
    try {
      await db
        .collection(`bento/${env}/globalVariable`)
        .doc("barber")
        .update({ queue_length: admin.firestore.FieldValue.increment(-1) });
      const appointments = await db
        .collection(`bento/${env}/barber`)
        .where("queue_no", ">", current.data().queue_no)
        .get();
      const promises = appointments?.docs?.map((appointment) => {
        return db
          .collection(`bento/${env}/barber`)
          .doc(appointment.id)
          .update({ queue_no: admin.firestore.FieldValue.increment(-1) });
      });
      await Promise.all(promises);
    } catch (err) {
      console.log(err);
    }
  });

//UPDATE SERVICE STATUS
app.put(`/api/service/status/:uid`, async (req, res) => {
  try {
    await db
      .collection(`bento/${env}/status`)
      .doc(req.params.uid)
      .set({ ...req.body }, { merge: true });
    res.status(200).json("status updated successfully");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SEND BARBER PUSH NOTIFICATION
exports.barberNotificationProd = functions.firestore
  .document(`/bento/${env}/barber/{documentId}`)
  .onWrite(async (change, context) => {
    try {
      //get all appointments
      const appointments = await db
        .collection(`bento/${env}/barber`)
        .orderBy("timestamp")
        .limit(3)
        .get();
      const count = appointments.docs.length;

      if (count > 0) {
        //generate payload and fcmTokens
        const firstThree = appointments.docs;
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
        firstThree.map((appointment) => {
          const { fcm_token } = appointment.data();
          if (fcm_token) {
            fcmTokens.push(fcm_token);
          }
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
exports.snackmenNotificationProd = functions.firestore
  .document(`/bento/${env}/users/{userId}/orders/{orderId}`)
  .onUpdate((change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    if (
      newValue.is_delivered === true &&
      previousValue.is_delivered === false &&
      previousValue.fcm_token !== null
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
      return messaging.sendToDevice(newValue.fcm_token, payload, options);
    } else {
      return null;
    }
  });

exports.appProd = functions.https.onRequest(app);
