const router = require("express").Router();
const admin = require("firebase-admin");
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");

const env = "dev";

//BOOK BARBER APPOINTMENT
router.post("/book/:userId", async (req, res) => {
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
        .then(async (snapshot) => {
          let count = snapshot?.docs?.length;
          const set1 = db
            .collection(`bento/${env}/barber`)
            .doc(req.params.userId)
            .set({
              ...barberData,
              queue_no: count + 1,
              token_no: count + 1001,
            });
          const set2 = db
            .collection(`bento/${env}/globalVariable`)
            .doc("barber")
            .set({
              queue_length: count + 1,
            });
          await Promise.all([set1, set2]);
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

//UPDATE BARBER SERVICE STATUS
router.put("/status/:uid", async (req, res) => {
  try {
    const { isOpen, onBreak } = req.body;
    await db
      .collection(`bento/${env}/status`)
      .doc(req.params.uid)
      .set(
        {
          status: `${isOpen ? (onBreak ? "BREAK" : "OPEN") : "CLOSED"}`,
        },
        { merge: true }
      );
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//DELETE BARBER BOOKING
router.delete("/delete/:bookingId", async (req, res) => {
  try {
    await db
      .collection(`bento/${env}/barber`)
      .doc(req.params.bookingId)
      .delete();
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;
