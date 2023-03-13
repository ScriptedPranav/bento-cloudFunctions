const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
admin.initializeApp();
const db = admin.firestore();

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

//Book Barber Appointment
app.post("/api/book/:userId", async (req, res) => {
  const appointment = await db
    .collection("barber")
    .doc(req.params.userId)
    .get();
  if (!appointment.data()) {
    try {
      const userData = await db
        .collection("users")
        .doc(req.params.userId)
        .get();
      const user = userData.data();
      const { name, hostel } = user;

      const { hair, beard, massage } = req.body;
      const serviceTime = hair * 20 + beard * 10 + massage * 10;

      const barberData = {
        name,
        hostel,
        ...req.body,
        serviceTime,
        timestamp: Timestamp.now(),
      };

      db.collection("barber")
        .orderBy("timestamp")
        .get()
        .then((snapshot) => {
          let arrayR = snapshot?.docs?.map((doc) => {
            return { barberId: doc.id, ...doc.data() };
          });

          if (arrayR.length === 0) {
            db.collection("barber")
              .doc(req.params.userId)
              .set({
                ...barberData,
                tokenNo: arrayR.length + 1,
                ewt: 0,
              });
          } else {
            const previousPerson = arrayR[arrayR.length - 1];
            const { serviceTime, ewt } = previousPerson;
            const newEstimatedTime = serviceTime + ewt;

            db.collection("barber")
              .doc(req.params.userId)
              .set({
                ...barberData,
                tokenNo: arrayR.length + 1,
                ewt: newEstimatedTime,
              });
          }
        });
      res.status(200).json("booking created");
    } catch (err) {
      console.log(err);
      res.status(500).json(err);
    }
  } else {
    res.status(203).json("booking exists")
  }
});

// exports.appointmentAdded = functions.firestore
//   .document("/barber/{documentId}")
//   .onCreate((current, context) => {
//     db.collection("barber")
//       .orderBy("timestamp")
//       .get()
//       .then((snapshot) => {
//         let arrayR = snapshot.docs.map((doc) => {
//           return { barberId: doc.id, ...doc.data() };
//         });
//         // console.log(arrayR[arrayR.length-2]);
//         if (arrayR.length === 1) {
//           db.doc(`/barber/${current.id}`).set(
//             {
//               ...current.data(),
//               tokenNo: arrayR.length,
//               ewt: 0,
//             },
//             { merge: true }
//           );
//         } else {
//           const previousPerson = arrayR[arrayR.length - 2];
//           const { serviceTime, ewt } = previousPerson;
//           const newEstimatedTime = serviceTime + ewt;
//           // console.log(newEstimatedTime)
//           db.doc(`/barber/${current.id}`).set(
//             {
//               ...current.data(),
//               tokenNo: arrayR.length,
//               ewt: newEstimatedTime,
//             },
//             { merge: true }
//           );
//         }
//       })
//       .catch((err) => console.log(err));

//     return Promise.resolve();
//   });

//Update ewt
exports.appointmentDeleted = functions.firestore
  .document("/barber/{documentId}")
  .onDelete((current, context) => {
    // console.log(current.data());
    db.collection("barber")
      .orderBy("timestamp")
      .get()
      .then((snapshot) => {
        let arrayR = snapshot.docs.map((doc) => {
          return { barberId: doc.id, ...doc.data() };
        });
        // console.log(arrayR.length);
        for (let appointment of arrayR) {
          if (appointment.ewt > current.data().ewt) {
            // console.log(appointment.name)
            db.doc(`/barber/${appointment.barberId}`).set(
              {
                tokenNo: appointment.tokenNo - 1,
                ewt: appointment.ewt - current.data().serviceTime,
              },
              { merge: true }
            );
          }
        }
      });
    return Promise.resolve();
  });

exports.app = functions.https.onRequest(app);
