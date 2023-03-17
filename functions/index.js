const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const env = 'dev'

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

//Create User
app.post("/api/user/signup/:userId", async(req,res) => {
  try {
    await db.collection(`bento/${env}/users`).doc(req.params.userId).set({
      ...req.body,
      timestamp: Timestamp.now()
    })
    res.status(200).json("User created successfully")
  }catch(err) {
    res.status(500).json(err)
  }
})

//Update User
app.put('/api/user/update/:userId', async(req,res) => {
  try {
    await db.collection(`bento/${env}/users`).doc(req.params.userId).set({
      ...req.body
    },{merge:true})
    res.status(200).json("User Updated")
  }catch(err) {
    res.status(500).json(err)
  }
})

//Book Barber Appointment
app.post("/api/book/:userId", async (req, res) => {
  const appointment = await db
    .collection(`bento/${env}/barber`)
    .doc(req.params.userId)
    .get();
  if (!appointment.data()) {
    try {
      const userData = await db
        .collection(`bento/${env}/users`)
        .doc(req.params.userId)
        .get();
      const user = userData.data();
      const { name, hostel } = user;

      const barberData = {
        name,
        hostel,
        fcmToken: req.body.fcmToken,
        timestamp: Timestamp.now(),
      };

      db.collection(`bento/${env}/barber`)
        .orderBy("timestamp")
        .get()
        .then(async(snapshot) => {
          let count = snapshot?.docs?.length;
          const set1 =  db.collection(`bento/${env}/barber`)
            .doc(req.params.userId)
            .set({
              ...barberData,
              queue_no: count + 1,
              token_no: count + 1001,
            });
          const set2 = db.collection(`bento/${env}/globalVariable`)
            .doc("barber")
            .set({
              queue_length: count + 1,
            });
            await Promise.all([set1,set2])
            res.status(200).json("booking created");
        });
    } catch (err) {
      console.log(err);
      res.status(500).json(err);
    }
  } else {
    res.status(203).json("booking exists");
  }
});

//Create Order
app.post("/api/order/:userId", async (req, res) => {
  try {
    const { name, ...rest } = req.body;
    const userOrder = {
      ...rest,
      is_delivered: false,
      timestamp: Timestamp.now(),
    };

    const todayOrder = {
      ...req.body,
      is_delivered: false,
      timestamp: Timestamp.now(),
    };
    const docRef = await db
      .collection(`bento/${env}/users/${req.params.userId}/orders`)
      .add(userOrder);
    await db.collection(`bento/${env}/todayOrders`).doc(docRef.id).set({
      userId: req.params.userId,
      ...todayOrder
    });
    res.status(200).json("Order created");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//Update queue_no
exports.appointmentDeleted = functions.firestore
  .document(`bento/${env}/barber/{documentId}`)
  .onDelete((current, context) => {
    // console.log(current.data());
    db.collection(`bento/${env}/barber`)
      .orderBy("timestamp")
      .get()
      .then(async(snapshot) => {
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

//Send Push Notification
exports.pushNotification = functions.firestore
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
          priority: 'high',
          contentAvailable: true
        }
        //push fcm tokens
        firstFour.map((appointment) => {
          const { fcmToken } = appointment.data();
          fcmTokens.push(fcmToken);
        });
        //send multicast message
        messaging
          .sendToDevice(fcmTokens, payload,options)
          .then((response) => console.log("Successfully sent message"))
          .catch((err) => console.log(err));
      }
    } catch (err) {
      console.log(err);
    }
    return Promise.resolve();
  });
exports.app = functions.https.onRequest(app);
